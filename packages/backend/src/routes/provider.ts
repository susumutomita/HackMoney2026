import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { x402Middleware, parsePaymentHeader, type PaymentProof } from "../middleware/x402.js";
import { recordPayment } from "../services/payment.js";
import type { Address } from "viem";

/**
 * Mock Provider Endpoints
 * Simulates actual API services with x402 payment
 */

const app = new Hono();

// Provider wallet (for receiving payments)
const PROVIDER_WALLET = (process.env.PROVIDER_WALLET_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as Address;

/**
 * Helper to get payment from header
 */
function getPaymentFromHeader(c: {
  req: { header: (name: string) => string | undefined };
}): PaymentProof | null {
  const header = c.req.header("X-Payment");
  if (!header) return null;
  return parsePaymentHeader(header);
}

/**
 * Translation Service - requires 0.03 USDC payment
 */
const translateSchema = z.object({
  text: z.string().min(1).max(10000),
  targetLanguage: z.string().min(2).max(10),
  sourceLanguage: z.string().min(2).max(10).optional(),
});

// Apply x402 middleware - requires 0.03 USDC
app.post(
  "/translate",
  x402Middleware("0.03", "translation"),
  zValidator("json", translateSchema),
  async (c) => {
    const { text, targetLanguage, sourceLanguage } = c.req.valid("json");
    const payment = getPaymentFromHeader(c);

    if (!payment) {
      return c.json({ error: "Payment not found" }, 400);
    }

    // Record the payment
    recordPayment(payment.txHash, payment.payer, PROVIDER_WALLET, "0.03", "translation");

    // Mock translation (in production, call actual translation API)
    const translations: Record<string, Record<string, string>> = {
      en: {
        hello: "Hello",
        world: "World",
        "hello world": "Hello World",
        contract: "Contract",
        agreement: "Agreement",
      },
      ja: {
        hello: "こんにちは",
        world: "世界",
        "hello world": "こんにちは世界",
        contract: "契約",
        agreement: "合意",
      },
      es: {
        hello: "Hola",
        world: "Mundo",
        "hello world": "Hola Mundo",
        contract: "Contrato",
        agreement: "Acuerdo",
      },
    };

    const lowerText = text.toLowerCase();
    const langTranslations = translations[targetLanguage] ?? translations.en ?? {};
    const translatedText =
      langTranslations[lowerText] ?? `[Translated to ${targetLanguage}]: ${text}`;

    return c.json({
      success: true,
      service: "translation",
      result: {
        originalText: text,
        translatedText,
        sourceLanguage: sourceLanguage || "auto",
        targetLanguage,
      },
      payment: {
        txHash: payment.txHash,
        amount: "0.03 USDC",
        status: "verified",
      },
    });
  }
);

/**
 * Summarization Service - requires 0.02 USDC payment
 */
const summarizeSchema = z.object({
  text: z.string().min(1).max(50000),
  maxLength: z.number().min(50).max(500).optional().default(200),
});

app.post(
  "/summarize",
  x402Middleware("0.02", "summarization"),
  zValidator("json", summarizeSchema),
  async (c) => {
    const { text, maxLength } = c.req.valid("json");
    const payment = getPaymentFromHeader(c);

    if (!payment) {
      return c.json({ error: "Payment not found" }, 400);
    }

    // Record the payment
    recordPayment(payment.txHash, payment.payer, PROVIDER_WALLET, "0.02", "summarization");

    // Mock summarization
    const words = text.split(/\s+/);
    const summary = words.length > 20 ? words.slice(0, 20).join(" ") + "..." : text;

    return c.json({
      success: true,
      service: "summarization",
      result: {
        originalLength: text.length,
        summary: summary.slice(0, maxLength),
        summaryLength: Math.min(summary.length, maxLength),
      },
      payment: {
        txHash: payment.txHash,
        amount: "0.02 USDC",
        status: "verified",
      },
    });
  }
);

/**
 * Price check endpoint (no payment required)
 */
app.get("/prices", (c) => {
  return c.json({
    services: [
      {
        id: "translation",
        name: "Translation Service",
        price: "0.03",
        unit: "per request",
        currency: "USDC",
      },
      {
        id: "summarization",
        name: "Summarization Service",
        price: "0.02",
        unit: "per request",
        currency: "USDC",
      },
    ],
    paymentInfo: {
      token: "USDC",
      chain: "Base Sepolia",
      chainId: 84532,
      tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      recipient: PROVIDER_WALLET,
    },
  });
});

export default app;
