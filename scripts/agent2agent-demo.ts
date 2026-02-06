#!/usr/bin/env tsx

/**
 * Agent-to-Agent demo script (no UI)
 *
 * Demonstrates the A2A payment router flow with hard proof:
 * - Blocked: recipient mismatch -> REJECTED + "money never moved" audit event
 * - Approved: pay USDC on Base Sepolia -> txHash + receipt verify
 *
 * This is designed to be a 1-command, repeatable live judging demo.
 *
 * Run (local backend):
 *   NEXT_PUBLIC_API_URL=http://localhost:3001 PRIVATE_KEY=0x... pnpm tsx scripts/agent2agent-demo.ts
 *
 * Run (hosted demo):
 *   NEXT_PUBLIC_API_URL=https://zerokey.exe.xyz:8000 PRIVATE_KEY=0x... pnpm tsx scripts/agent2agent-demo.ts
 */

import { existsSync, readFileSync } from "node:fs";

function loadDotEnv(path = ".env") {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadDotEnv();
loadDotEnv("../.env");
loadDotEnv("../../.env");

import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  getAddress,
  http,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const RPC = process.env.BASE_SEPOLIA_RPC_URL || process.env.RPC_URL || "https://sepolia.base.org";

const USDC_BASE_SEPOLIA = getAddress("0x036CbD53842c5426634e7929541eC2318f3dCF7e");

type Json = any;

type ActionContract = {
  type: string;
  idempotencyKey: string;
  inputs: Record<string, unknown>;
  expected: Record<string, unknown>;
};

async function postJson(
  path: string,
  body: unknown
): Promise<{ status: number; json: Json; text: string }> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  return { status: res.status, json, text };
}

async function getJson(path: string): Promise<{ status: number; json: Json; text: string }> {
  const res = await fetch(`${API}${path}`);
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  return { status: res.status, json, text };
}

function printActionContract(ac: ActionContract) {
  console.log("\nAction Contract (JSON):");
  console.log(JSON.stringify(ac, null, 2));
}

async function a2aNegotiateAndAccept(params: {
  buyerAgentId: string;
  providerId: string;
  service: string;
  offerUsdc: string;
}): Promise<{ sessionId: string; finalPriceUsdc: string }> {
  // Start negotiation
  const start = await postJson("/api/a2a/negotiate", {
    clientId: params.buyerAgentId,
    providerId: params.providerId,
    service: params.service,
    initialOffer: params.offerUsdc,
  });
  if (start.status !== 200 || !start.json?.success) {
    throw new Error(`negotiate failed: ${start.status} ${start.text}`);
  }

  const sessionId = start.json.session.id as string;

  // Immediately accept (simulating agreement reached)
  const accept = await postJson(`/api/a2a/negotiate/${sessionId}/offer`, {
    amount: params.offerUsdc,
    type: "accept",
  });
  if (accept.status !== 200 || !accept.json?.success) {
    throw new Error(`accept failed: ${accept.status} ${accept.text}`);
  }

  return { sessionId, finalPriceUsdc: params.offerUsdc };
}

async function main() {
  // 0) Health check
  const health = await getJson("/health");
  if (health.status !== 200) {
    throw new Error(`backend not healthy: status=${health.status} body=${health.text}`);
  }
  console.log(`OK /health (${API})`);

  // Setup chain clients
  const pk = (process.env.PRIVATE_KEY || process.env.POLICY_ORACLE_PRIVATE_KEY || "") as
    | `0x${string}`
    | string;
  if (!pk || pk.length < 10) throw new Error("Missing PRIVATE_KEY in env");

  const account = privateKeyToAccount(
    pk.startsWith("0x") ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`)
  );

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
  const walletClient = createWalletClient({ chain: baseSepolia, transport: http(RPC), account });

  console.log(`Buyer Agent wallet: ${account.address}`);

  // -------------------------------
  // DEMO 1: Blocked (recipient mismatch)
  // -------------------------------
  console.log("\n=== DEMO 1 (Agent→Agent): Blocked before payment ===");
  console.log("Buyer Agent:", '"Need cheap translation. Max $0.01."');
  console.log("Provider Agent (CheapTranslate):", '"I accept $0.01."');

  const blocked = await a2aNegotiateAndAccept({
    buyerAgentId: account.address,
    providerId: "sketchy-service-001",
    service: "translation",
    offerUsdc: "0.01",
  });

  const action1: ActionContract = {
    type: "firewall.check",
    idempotencyKey: `a2a-demo-blocked-${Date.now()}`,
    inputs: { sessionId: blocked.sessionId },
    expected: {
      decision: ["APPROVED", "CONFIRM_REQUIRED", "REJECTED"],
      proof: ["money_never_moved"],
    },
  };
  printActionContract(action1);

  const fw1 = await postJson("/api/firewall/check", { sessionId: blocked.sessionId });
  if (fw1.status !== 200) {
    throw new Error(`firewall/check failed: ${fw1.status} ${fw1.text}`);
  }

  console.log("Firewall decision:", fw1.json?.firewall?.decision);
  console.log("Firewall reasons:\n", (fw1.json?.firewall?.reasons || []).join("\n"));

  const events = await getJson("/api/firewall/events");
  console.log(`Proof (events): /api/firewall/events status=${events.status}`);

  // -------------------------------
  // DEMO 2: Approved (real payment)
  // -------------------------------
  console.log("\n=== DEMO 2 (Agent→Agent): Approved + USDC txHash proof ===");
  console.log("Buyer Agent:", '"Buy ImagePack for $0.03."');
  console.log("Provider Agent (ImagePack):", '"Deal."');

  const approved = await a2aNegotiateAndAccept({
    buyerAgentId: account.address,
    providerId: "image-pack-001",
    service: "image-pack",
    offerUsdc: "0.03",
  });

  const action2: ActionContract = {
    type: "firewall.check",
    idempotencyKey: `a2a-demo-approved-${Date.now()}`,
    inputs: { sessionId: approved.sessionId },
    expected: { decision: ["APPROVED"], proof: ["txHash"] },
  };
  printActionContract(action2);

  const fw2 = await postJson("/api/firewall/check", { sessionId: approved.sessionId });
  if (fw2.status !== 200) {
    throw new Error(`firewall/check failed: ${fw2.status} ${fw2.text}`);
  }

  const decision2 = fw2.json?.firewall?.decision as string | undefined;
  console.log("Firewall decision:", decision2);
  console.log("Firewall reasons:\n", (fw2.json?.firewall?.reasons || []).join("\n"));

  if (decision2 !== "APPROVED") {
    throw new Error(
      `Expected APPROVED for image-pack-001. Got ${decision2}. (Tip: check provider registry config.)`
    );
  }

  // x402-style request
  const req = await postJson("/api/pay/request", {
    amountUsdc: approved.finalPriceUsdc,
    serviceId: "image-pack-001",
  });
  if (req.status !== 402) {
    throw new Error(`expected 402 from /api/pay/request, got ${req.status}: ${req.text}`);
  }

  const recipient = getAddress(req.json.payment.recipient);
  const amountUnits = parseUnits(req.json.payment.amountUsdc, 6);

  console.log(`Send USDC ${req.json.payment.amountUsdc} to ${recipient}`);

  const hash = await walletClient.writeContract({
    address: USDC_BASE_SEPOLIA,
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipient, amountUnits],
  });

  console.log(`txHash=${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`mined in block=${receipt.blockNumber}`);

  const submit = await postJson("/api/pay/submit", {
    txHash: hash,
    expectedAmountUsdc: req.json.payment.amountUsdc,
    providerId: "image-pack-001",
    firewallDecision: "APPROVED",
    firewallReason: "A2A demo: approved",
  });

  console.log(`pay/submit status=${submit.status}`);
  console.log(submit.text);

  console.log("\nA2A demo finished.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
