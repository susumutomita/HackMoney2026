import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Address, Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { verifyUsdcTransfer } from "../services/payment.js";

/**
 * Payment routes (x402-style)
 *
 * This implements a minimal, real (non-mock) payment verification loop:
 * - client requests payment instructions
 * - server returns 402 with recipient/token/amount
 * - client sends USDC on Base Sepolia
 * - client submits txHash
 * - server verifies the USDC transfer in the receipt
 */

const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;
const RECIPIENT = (process.env.PROVIDER_WALLET_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as Address;

export const payRouter = new Hono();

const requestSchema = z.object({
  amountUsdc: z.string().min(1).default("0.03"),
  serviceId: z.string().min(1).default("default"),
});

/**
 * POST /api/pay/request
 * Always returns 402 with payment instructions.
 */
payRouter.post("/request", zValidator("json", requestSchema), async (c) => {
  const { amountUsdc, serviceId } = c.req.valid("json");

  return c.json(
    {
      error: "Payment Required",
      code: 402,
      payment: {
        chainId: baseSepolia.id,
        token: USDC_BASE_SEPOLIA,
        recipient: RECIPIENT,
        amountUsdc,
        serviceId,
        expiresAt: Date.now() + 5 * 60 * 1000,
      },
      message: `Payment required: ${amountUsdc} USDC`,
      instructions: {
        step1: "Send USDC to the recipient address on Base Sepolia",
        step2: "Submit the txHash to /api/pay/submit",
      },
    },
    402
  );
});

const submitSchema = z.object({
  txHash: z.string().startsWith("0x").min(10),
  expectedAmountUsdc: z.string().min(1),
});

/**
 * POST /api/pay/submit
 * Verify that txHash includes a USDC transfer to the configured recipient.
 */
payRouter.post("/submit", zValidator("json", submitSchema), async (c) => {
  const { txHash, expectedAmountUsdc } = c.req.valid("json");

  const res = await verifyUsdcTransfer(txHash as Hex, RECIPIENT, expectedAmountUsdc);

  if (!res.valid) {
    return c.json(
      {
        success: false,
        error: "payment_verification_failed",
        reason: res.reason,
      },
      402
    );
  }

  return c.json({
    success: true,
    payment: res.record,
  });
});
