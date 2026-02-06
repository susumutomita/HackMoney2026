/**
 * Minimal integration example (API-first)
 *
 * Shows how a third-party product can integrate ZeroKey as an execution gate
 * (payment router) without using the Marketplace UI.
 *
 * Flow:
 * 1) pay.request -> obtain recipient/token/chainId/amount
 * 2) firewall.check -> APPROVED / CONFIRM_REQUIRED / REJECTED
 * 3) (optional) send USDC -> txHash
 * 4) pay.submit -> receipt verify + auditable proof
 *
 * Run:
 *   ZK_API_BASE=https://zerokey.exe.xyz:8000 \
 *   SERVICE_ID=image-pack-001 \
 *   AMOUNT_USDC=0.01 \
 *   DRY_RUN=true \
 *   pnpm -C packages/backend tsx ../../examples/minimal-integration.ts
 *
 * Real transfer (Base Sepolia USDC):
 *   ZK_API_BASE=... SERVICE_ID=... AMOUNT_USDC=0.01 \
 *   PRIVATE_KEY=0x... RPC_URL=https://sepolia.base.org \
 *   pnpm -C packages/backend tsx ../../examples/minimal-integration.ts
 */

import "dotenv/config";
import { createPublicClient, createWalletClient, formatUnits, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

type FirewallDecision = "APPROVED" | "CONFIRM_REQUIRED" | "REJECTED";

function reqEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

function boolEnv(key: string, defaultValue = false): boolean {
  const v = process.env[key];
  if (v === undefined) return defaultValue;
  return ["1", "true", "yes", "y"].includes(v.toLowerCase());
}

function usdcToBaseUnits(amountUsdc: string): bigint {
  // 6 decimals
  return parseUnits(amountUsdc, 6);
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  return JSON.parse(text) as T;
}

async function main() {
  const apiBase = reqEnv("ZK_API_BASE").replace(/\/$/, "");
  const serviceId = reqEnv("SERVICE_ID");
  const amountUsdc = process.env.AMOUNT_USDC ?? "0.01";

  const dryRun = boolEnv("DRY_RUN", true);
  const autoConfirm = boolEnv("AUTO_CONFIRM", false);

  // 1) Ask router for payment instructions.
  const payReq = await postJson<{
    payment: {
      recipient: `0x${string}`;
      token: `0x${string}`;
      chainId: number;
      amountUsdc: string;
    };
  }>(`${apiBase}/api/pay/request`, { amountUsdc, serviceId });

  const payment = payReq.payment;
  console.log("Payment request:");
  console.log(payment);

  // Build tx input for firewall.
  const txValue = usdcToBaseUnits(payment.amountUsdc);

  // Determine `from`.
  const privateKey = process.env.PRIVATE_KEY;
  const from = (() => {
    if (privateKey) {
      return privateKeyToAccount(privateKey as `0x${string}`).address;
    }
    const explicit = process.env.FROM_ADDRESS;
    if (explicit) return explicit as `0x${string}`;
    // Fallback: make it obvious (the firewall does not require a real sender for demo).
    return "0x0000000000000000000000000000000000000000" as `0x${string}`;
  })();

  // 2) Firewall check (execution gate).
  const fw = await postJson<{
    firewall: {
      decision: FirewallDecision;
      riskLevel: number;
      reasons: string[];
      warnings: string[];
    };
  }>(`${apiBase}/api/firewall/check`, {
    chainId: payment.chainId,
    from,
    to: payment.recipient,
    value: txValue.toString(),
    providerId: serviceId,
  });

  const decision = fw.firewall.decision;
  const reason = fw.firewall.reasons?.join("\n") ?? "";

  console.log("Firewall decision:", decision);
  console.log("Reasons:\n", reason);

  if (decision === "REJECTED") {
    console.log("Blocked before payment. (money never moved)");
    process.exit(0);
  }

  if (decision === "CONFIRM_REQUIRED" && !autoConfirm) {
    console.log(
      "CONFIRM_REQUIRED: set AUTO_CONFIRM=true to proceed (simulating CFO/manual approval)."
    );
    process.exit(0);
  }

  // 3) Transfer USDC (optional)
  let txHash: `0x${string}`;

  const overrideTxHash = process.env.TX_HASH as `0x${string}` | undefined;
  if (overrideTxHash) {
    txHash = overrideTxHash;
    console.log("Using provided TX_HASH:", txHash);
  } else if (dryRun) {
    throw new Error(
      "DRY_RUN=true but no TX_HASH provided. Either set DRY_RUN=false (real transfer) or provide TX_HASH."
    );
  } else {
    if (!privateKey) {
      throw new Error("Missing PRIVATE_KEY for real transfer");
    }

    // Note: we default to Base Sepolia chain config.
    const rpcUrl = reqEnv("RPC_URL");
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });

    const walletClient = createWalletClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
      account,
    });

    const value = usdcToBaseUnits(payment.amountUsdc);

    console.log(
      `Sending ${formatUnits(value, 6)} USDC from ${account.address} to ${payment.recipient} (token ${payment.token})...`
    );

    txHash = await walletClient.writeContract({
      address: payment.token,
      abi: [
        {
          type: "function",
          name: "transfer",
          stateMutability: "nonpayable",
          inputs: [
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
          ],
          outputs: [{ name: "", type: "bool" }],
        },
      ],
      functionName: "transfer",
      args: [payment.recipient, value],
    });

    console.log("txHash:", txHash);
    await publicClient.waitForTransactionReceipt({ hash: txHash });
  }

  // 4) Submit proof
  const submit = await postJson<{
    success: boolean;
    payment?: { txHash?: string };
    reason?: string;
  }>(`${apiBase}/api/pay/submit`, {
    txHash,
    expectedAmountUsdc: payment.amountUsdc,
    providerId: serviceId,
    firewallDecision: decision,
    firewallReason: reason || "(see firewall reasons)",
  });

  console.log("pay.submit:");
  console.log(submit);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
