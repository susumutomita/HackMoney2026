import { createPublicClient, http, parseUnits, type Address, type Hex } from "viem";
import { baseSepolia } from "viem/chains";

/**
 * Payment Service
 * Handles USDC payment verification and recording
 */

// USDC on Base Sepolia
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;
const USDC_DECIMALS = 6;

// ERC20 Transfer event signature
const TRANSFER_EVENT_SIGNATURE =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export interface PaymentRecord {
  txHash: Hex;
  chainId: number;
  payer: Address;
  recipient: Address;
  amount: string;
  amountUsdc: string;
  timestamp: number;
  serviceId: string;
  verified: boolean;
}

// In-memory payment records (for demo)
const paymentRecords: Map<string, PaymentRecord> = new Map();

/**
 * Verify a USDC transfer transaction
 */
export async function verifyUsdcTransfer(
  txHash: Hex,
  expectedRecipient: Address,
  expectedAmountUsdc: string
): Promise<{ valid: boolean; reason?: string; record?: PaymentRecord }> {
  try {
    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });

    // Get transaction receipt (RPCs can be slightly behind; wait a bit for reliability)
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
      timeout: 60_000,
    });

    if (!receipt) {
      return { valid: false, reason: "Transaction not found or not confirmed" };
    }

    if (receipt.status !== "success") {
      return { valid: false, reason: "Transaction failed" };
    }

    // Find USDC Transfer event
    const transferLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === USDC_ADDRESS.toLowerCase() &&
        log.topics[0] === TRANSFER_EVENT_SIGNATURE
    );

    if (!transferLog) {
      return { valid: false, reason: "No USDC transfer found in transaction" };
    }

    // Decode transfer event
    // topics[1] = from (padded to 32 bytes)
    // topics[2] = to (padded to 32 bytes)
    // data = amount
    const from = ("0x" + (transferLog.topics[1] || "").slice(26)) as Address;
    const to = ("0x" + (transferLog.topics[2] || "").slice(26)) as Address;
    const amount = BigInt(transferLog.data);

    // Verify recipient
    if (to.toLowerCase() !== expectedRecipient.toLowerCase()) {
      return { valid: false, reason: "Recipient mismatch" };
    }

    // Verify amount
    const expectedAmount = parseUnits(expectedAmountUsdc, USDC_DECIMALS);
    if (amount < expectedAmount) {
      return { valid: false, reason: `Insufficient amount: expected ${expectedAmountUsdc} USDC` };
    }

    // Get block timestamp (optional; some public RPCs can lag on block lookup)
    let timestampMs = Date.now();
    try {
      const block = await client.getBlock({ blockNumber: receipt.blockNumber });
      timestampMs = Number(block.timestamp) * 1000;
    } catch {
      // keep fallback
    }

    const record: PaymentRecord = {
      txHash,
      chainId: baseSepolia.id,
      payer: from,
      recipient: to,
      amount: amount.toString(),
      amountUsdc: (Number(amount) / 10 ** USDC_DECIMALS).toFixed(USDC_DECIMALS),
      timestamp: timestampMs,
      serviceId: "verified",
      verified: true,
    };

    // Store record
    paymentRecords.set(txHash, record);

    return { valid: true, record };
  } catch (error) {
    console.error("Payment verification error:", error);
    return { valid: false, reason: "Verification failed" };
  }
}

/**
 * Record a payment (for demo without on-chain verification)
 */
export function recordPayment(
  txHash: Hex,
  payer: Address,
  recipient: Address,
  amountUsdc: string,
  serviceId: string
): PaymentRecord {
  const record: PaymentRecord = {
    txHash,
    chainId: baseSepolia.id,
    payer,
    recipient,
    amount: parseUnits(amountUsdc, USDC_DECIMALS).toString(),
    amountUsdc,
    timestamp: Date.now(),
    serviceId,
    verified: false, // Demo mode - not verified on-chain
  };

  paymentRecords.set(txHash, record);
  return record;
}

/**
 * Get payment record by txHash
 */
export function getPaymentRecord(txHash: string): PaymentRecord | undefined {
  return paymentRecords.get(txHash);
}

/**
 * Get all payment records for a payer
 */
export function getPaymentsByPayer(payer: Address): PaymentRecord[] {
  return Array.from(paymentRecords.values()).filter(
    (r) => r.payer.toLowerCase() === payer.toLowerCase()
  );
}

/**
 * Calculate total spent by a payer (for budget checks)
 */
export function getTotalSpent(payer: Address, sinceTimestamp?: number): number {
  const payments = getPaymentsByPayer(payer);
  const filtered = sinceTimestamp
    ? payments.filter((p) => p.timestamp >= sinceTimestamp)
    : payments;

  return filtered.reduce((sum, p) => sum + parseFloat(p.amountUsdc), 0);
}

/**
 * Get daily spending for budget enforcement
 */
export function getDailySpent(payer: Address): number {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return getTotalSpent(payer, startOfDay.getTime());
}
