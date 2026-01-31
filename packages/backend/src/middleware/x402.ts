import type { Context, Next } from "hono";
import { createPublicClient, http, parseUnits, type Address, type Hex } from "viem";
import { baseSepolia } from "viem/chains";

/**
 * x402 Payment Required Middleware
 * Implements HTTP 402 payment protocol for API monetization
 */

// USDC on Base Sepolia
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;
const USDC_DECIMALS = 6;

// Payment recipient (provider wallet)
const PROVIDER_WALLET = (process.env.PROVIDER_WALLET_ADDRESS || "0x0000000000000000000000000000000000000000") as Address;

export interface PaymentRequirement {
  amount: string; // USDC amount in base units
  recipient: Address;
  token: Address;
  chainId: number;
  expiresAt: number;
  serviceId: string;
}

export interface PaymentProof {
  txHash: Hex;
  chainId: number;
  amount: string;
  payer: Address;
}

/**
 * Create a 402 Payment Required response
 */
export function createPaymentRequired(serviceId: string, priceUsdc: string): PaymentRequirement {
  const amountInBaseUnits = parseUnits(priceUsdc, USDC_DECIMALS).toString();
  
  return {
    amount: amountInBaseUnits,
    recipient: PROVIDER_WALLET,
    token: USDC_ADDRESS,
    chainId: baseSepolia.id,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    serviceId,
  };
}

/**
 * Parse X-Payment header
 * Format: txHash:chainId:amount:payer
 */
export function parsePaymentHeader(header: string): PaymentProof | null {
  try {
    const parts = header.split(":");
    if (parts.length !== 4) return null;
    
    const [txHash, chainIdStr, amount, payer] = parts;
    if (!txHash || !chainIdStr || !amount || !payer) return null;
    
    return {
      txHash: txHash as Hex,
      chainId: parseInt(chainIdStr, 10),
      amount,
      payer: payer as Address,
    };
  } catch {
    return null;
  }
}

/**
 * Verify payment on-chain
 */
export async function verifyPayment(
  proof: PaymentProof,
  requirement: PaymentRequirement
): Promise<{ valid: boolean; reason?: string }> {
  // For demo: accept any proof with matching amount
  // In production: verify actual transaction on-chain
  
  if (proof.chainId !== requirement.chainId) {
    return { valid: false, reason: "Chain ID mismatch" };
  }
  
  if (BigInt(proof.amount) < BigInt(requirement.amount)) {
    return { valid: false, reason: "Insufficient payment amount" };
  }
  
  // Verify transaction exists on-chain (basic check)
  try {
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });
    
    const tx = await client.getTransaction({ hash: proof.txHash });
    
    if (!tx) {
      return { valid: false, reason: "Transaction not found" };
    }
    
    // For demo: just check tx exists
    // Production should verify: recipient, amount, token, etc.
    return { valid: true };
  } catch (error) {
    // For demo: if we can't verify, accept it
    // This allows testing without actual transactions
    console.warn("Payment verification skipped (demo mode):", error);
    return { valid: true };
  }
}

/**
 * x402 Middleware factory
 * Usage: app.use('/api/provider/*', x402Middleware('0.03'))
 */
export function x402Middleware(priceUsdc: string, serviceId: string = "default") {
  return async (c: Context, next: Next) => {
    const paymentHeader = c.req.header("X-Payment");
    
    // No payment header -> return 402
    if (!paymentHeader) {
      const requirement = createPaymentRequired(serviceId, priceUsdc);
      
      return c.json(
        {
          error: "Payment Required",
          code: 402,
          payment: requirement,
          message: `This API requires payment of ${priceUsdc} USDC`,
          instructions: {
            step1: "Send USDC to the recipient address",
            step2: "Include X-Payment header: txHash:chainId:amount:payer",
            step3: "Retry the request",
          },
        },
        402
      );
    }
    
    // Parse payment proof
    const proof = parsePaymentHeader(paymentHeader);
    if (!proof) {
      return c.json(
        {
          error: "Invalid Payment Header",
          code: 400,
          message: "X-Payment header format: txHash:chainId:amount:payer",
        },
        400
      );
    }
    
    // Verify payment
    const requirement = createPaymentRequired(serviceId, priceUsdc);
    const verification = await verifyPayment(proof, requirement);
    
    if (!verification.valid) {
      return c.json(
        {
          error: "Payment Verification Failed",
          code: 402,
          reason: verification.reason,
          payment: requirement,
        },
        402
      );
    }
    
    // Payment verified - continue to handler
    c.set("payment", proof);
    await next();
  };
}

export default x402Middleware;
