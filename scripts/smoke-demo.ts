#!/usr/bin/env tsx

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
  http,
  parseUnits,
  getAddress,
  erc20Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const USDC_BASE_SEPOLIA = getAddress("0x036CbD53842c5426634e7929541eC2318f3dCF7e");

type Json = any;

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

async function main() {
  // 0) Health check
  const health = await getJson("/health");
  if (health.status !== 200) {
    throw new Error(`backend not healthy: status=${health.status} body=${health.text}`);
  }
  console.log("OK /health");

  // Setup chain clients
  const rpc = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const pk = (process.env.PRIVATE_KEY ||
    process.env.POLICY_ORACLE_PRIVATE_KEY ||
    "") as `0x${string}`;
  if (!pk || pk.length < 10) throw new Error("Missing PRIVATE_KEY in env");

  const account = privateKeyToAccount(
    pk.startsWith("0x") ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`)
  );

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
  const walletClient = createWalletClient({ chain: baseSepolia, transport: http(rpc), account });

  const ethBal = await publicClient.getBalance({ address: account.address });
  const usdcBal = await publicClient.readContract({
    address: USDC_BASE_SEPOLIA,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  console.log(`Wallet: ${account.address}`);
  console.log(`ETH: ${Number(ethBal) / 1e18}`);
  console.log(`USDC: ${Number(usdcBal) / 1e6}`);

  // 1) Flow B: Blocked (CheapTranslate)
  console.log("\n=== Flow B (Blocked): CheapTranslate ===");
  const blocked = await postJson("/api/firewall/check", {
    chainId: 84532,
    from: account.address,
    providerId: "sketchy-service-001",
    value: "30000", // 0.03 USDC (6 decimals)
  });
  console.log(`firewall/check status=${blocked.status}`);
  if (blocked.status !== 200) console.log(blocked.text);

  const events = await getJson("/api/firewall/events");
  console.log(`firewall/events status=${events.status}`);

  // 2) Flow A: Success (ImagePack) — onchain USDC transfer + receipt verify
  console.log("\n=== Flow A (Success): ImagePack ===");
  const req = await postJson("/api/pay/request", {
    amountUsdc: "0.03",
    serviceId: "image-pack-001",
  });
  if (req.status !== 402) {
    throw new Error(`expected 402 from /api/pay/request, got ${req.status}: ${req.text}`);
  }
  const recipient = getAddress(req.json.payment.recipient);
  const amountUnits = parseUnits(req.json.payment.amountUsdc, 6);

  console.log(`Send USDC ${req.json.payment.amountUsdc} to ${recipient}`);

  if (usdcBal < amountUnits) {
    throw new Error(
      `Insufficient USDC in dev wallet for smoke test. Need ${Number(amountUnits) / 1e6}, have ${Number(usdcBal) / 1e6}`
    );
  }

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
    firewallReason: "Smoke test: approved",
  });

  console.log(`pay/submit status=${submit.status}`);
  console.log(submit.text);

  const purchases = await getJson("/api/purchases");
  console.log(`purchases status=${purchases.status}`);

  console.log("\nSmoke run finished.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
