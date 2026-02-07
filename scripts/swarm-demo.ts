#!/usr/bin/env tsx

/**
 * Swarm demo script (1 command)
 *
 * Runs 3 agent scenarios through the same ZeroKey firewall/router layer:
 * 1) REJECTED (recipient mismatch) -> money never moved
 * 2) CONFIRM_REQUIRED (unverified recipient) -> CFO confirm -> proceed
 * 3) APPROVED -> USDC txHash proof
 *
 * Designed for live judging: minimal clicks, maximal proof.
 *
 * Usage:
 *   NEXT_PUBLIC_API_URL=http://localhost:3001 PRIVATE_KEY=0x... pnpm tsx scripts/swarm-demo.ts
 *   NEXT_PUBLIC_API_URL=https://zerokey.exe.xyz:8000 PRIVATE_KEY=0x... pnpm tsx scripts/swarm-demo.ts
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

type FirewallDecision = "APPROVED" | "CONFIRM_REQUIRED" | "REJECTED";

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

  const accept = await postJson(`/api/a2a/negotiate/${sessionId}/offer`, {
    amount: params.offerUsdc,
    type: "accept",
  });
  if (accept.status !== 200 || !accept.json?.success) {
    throw new Error(`accept failed: ${accept.status} ${accept.text}`);
  }

  return { sessionId, finalPriceUsdc: params.offerUsdc };
}

async function firewallCheck(
  sessionId: string
): Promise<{ decision: FirewallDecision; reasons: string[] }> {
  const fw = await postJson("/api/firewall/check", { sessionId });
  if (fw.status !== 200) throw new Error(`firewall/check failed: ${fw.status} ${fw.text}`);

  const decision = fw.json?.firewall?.decision as FirewallDecision;
  const reasons = (fw.json?.firewall?.reasons || []) as string[];
  return { decision, reasons };
}

async function main() {
  const health = await getJson("/health");
  if (health.status !== 200) {
    throw new Error(`backend not healthy: status=${health.status} body=${health.text}`);
  }
  console.log(`OK /health (${API})`);

  const pk = (process.env.PRIVATE_KEY || process.env.POLICY_ORACLE_PRIVATE_KEY || "") as
    | `0x${string}`
    | string;
  if (!pk || pk.length < 10) throw new Error("Missing PRIVATE_KEY in env");

  const account = privateKeyToAccount(
    pk.startsWith("0x") ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`)
  );

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
  const walletClient = createWalletClient({ chain: baseSepolia, transport: http(RPC), account });

  console.log(`Swarm wallet (buyer agent): ${account.address}`);

  // --- Scenario 1: Blocked ---
  console.log("\n=== Swarm #1: REJECTED (recipient mismatch) ===");
  console.log("Agent B:", '"Buy cheap translation for $0.01"');

  const s1 = await a2aNegotiateAndAccept({
    buyerAgentId: account.address,
    providerId: "sketchy-service-001",
    service: "translation",
    offerUsdc: "0.01",
  });

  printActionContract({
    type: "firewall.check",
    idempotencyKey: `swarm-blocked-${Date.now()}`,
    inputs: { sessionId: s1.sessionId },
    expected: { decision: ["REJECTED"], proof: ["money_never_moved"] },
  });

  const fw1 = await firewallCheck(s1.sessionId);
  console.log("Decision:", fw1.decision);
  console.log("Reasons:\n", fw1.reasons.join("\n"));

  // --- Scenario 2: Confirm required ---
  console.log("\n=== Swarm #2: CONFIRM_REQUIRED (CFO step-up) ===");
  console.log("Agent C:", '"Buy from an unverified recipient; require CFO approval"');

  // NOTE: We simulate this by using a provider without registry expectedRecipient.
  // If no such provider exists in the demo DB, this scenario might not trigger.
  // It still demonstrates the decision type when it does.
  const confirmProviderId = process.env.CONFIRM_PROVIDER_ID || "translateai-pro-001";
  const s2 = await a2aNegotiateAndAccept({
    buyerAgentId: account.address,
    providerId: confirmProviderId,
    service: "translation",
    offerUsdc: "0.02",
  });

  printActionContract({
    type: "firewall.check",
    idempotencyKey: `swarm-confirm-${Date.now()}`,
    inputs: { sessionId: s2.sessionId },
    expected: { decision: ["CONFIRM_REQUIRED", "APPROVED"], proof: ["manual_approval"] },
  });

  const fw2 = await firewallCheck(s2.sessionId);
  console.log("Decision:", fw2.decision);
  console.log("Reasons:\n", fw2.reasons.join("\n"));

  if (fw2.decision === "CONFIRM_REQUIRED") {
    console.log("CFO:", '"Approved manually."');
  }

  // --- Scenario 3: Approved + pay ---
  console.log("\n=== Swarm #3: APPROVED + txHash proof ===");
  console.log("Agent A:", '"Buy ImagePack for $0.03"');

  const s3 = await a2aNegotiateAndAccept({
    buyerAgentId: account.address,
    providerId: "image-pack-001",
    service: "image-pack",
    offerUsdc: "0.03",
  });

  printActionContract({
    type: "firewall.check",
    idempotencyKey: `swarm-approved-${Date.now()}`,
    inputs: { sessionId: s3.sessionId },
    expected: { decision: ["APPROVED"], proof: ["txHash"] },
  });

  const fw3 = await firewallCheck(s3.sessionId);
  console.log("Decision:", fw3.decision);
  console.log("Reasons:\n", fw3.reasons.join("\n"));
  if (fw3.decision !== "APPROVED") {
    throw new Error(`Expected APPROVED for image-pack-001, got ${fw3.decision}`);
  }

  const req = await postJson("/api/pay/request", {
    amountUsdc: s3.finalPriceUsdc,
    serviceId: "image-pack-001",
  });
  console.log(`pay.request status=${req.status} (expected 402)`);
  if (req.status !== 402) {
    throw new Error(`expected 402 from /api/pay/request, got ${req.status}: ${req.text}`);
  }

  console.log("402 payment instruction:");
  console.log(
    JSON.stringify(
      {
        recipient: req.json.payment.recipient,
        token: req.json.payment.token,
        chainId: req.json.payment.chainId,
        amountUsdc: req.json.payment.amountUsdc,
      },
      null,
      2
    )
  );

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
    firewallReason: "Swarm demo: approved",
  });

  console.log(`pay/submit status=${submit.status}`);
  console.log(submit.text);

  // --- Proof summary ---
  const events = await getJson("/api/firewall/events");
  const purchases = await getJson("/api/purchases");

  console.log("\n=== Proof summary ===");
  console.log(`events: ${API}/api/firewall/events (status=${events.status})`);
  console.log(`purchases: ${API}/api/purchases (status=${purchases.status})`);

  console.log("\nSwarm demo finished.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
