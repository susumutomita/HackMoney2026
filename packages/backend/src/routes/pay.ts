import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Address, Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { eq } from "drizzle-orm";
import { verifyUsdcTransfer } from "../services/payment.js";
import { checkFirewall } from "../services/firewall.js";
import { db, schema } from "../db/index.js";
import { agents, firewallEvents, purchases } from "../db/schema.js";
import { randomUUID } from "node:crypto";
import { agentAuth } from "../middleware/agentAuth.js";

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
const FALLBACK_RECIPIENT = (process.env.PROVIDER_WALLET_ADDRESS ||
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

  // Resolve recipient from provider listing (marketplace)
  const provider = (
    await db.select().from(schema.providers).where(eq(schema.providers.id, serviceId)).limit(1)
  )[0];

  const recipient = (provider?.walletAddress || FALLBACK_RECIPIENT) as Address;

  return c.json(
    {
      error: "Payment Required",
      code: 402,
      payment: {
        chainId: baseSepolia.id,
        token: USDC_BASE_SEPOLIA,
        recipient,
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
  providerId: z.string().min(1),
  firewallDecision: z.enum(["APPROVED", "CONFIRM_REQUIRED", "REJECTED"]),
  firewallReason: z.string().min(1),
});

/**
 * POST /api/pay/submit
 * Verify that txHash includes a USDC transfer to the configured recipient.
 */
payRouter.post("/submit", zValidator("json", submitSchema), async (c) => {
  const { txHash, expectedAmountUsdc, providerId, firewallDecision, firewallReason } =
    c.req.valid("json");

  // Minimal integrity gate: only approved flows may settle and be recorded.
  if (firewallDecision !== "APPROVED") {
    return c.json(
      {
        success: false,
        error: "firewall_not_approved",
        reason: firewallReason,
      },
      403
    );
  }

  const providerRow = (
    await db.select().from(schema.providers).where(eq(schema.providers.id, providerId)).limit(1)
  )[0];
  const expectedRecipient = (providerRow?.walletAddress || FALLBACK_RECIPIENT) as Address;

  const res = await verifyUsdcTransfer(txHash as Hex, expectedRecipient, expectedAmountUsdc);

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

  // Persist purchase proof (demo/audit)
  const now = new Date().toISOString();
  const record = res.record;
  if (record) {
    const provider = providerRow;

    await db
      .insert(schema.purchases)
      .values({
        id: randomUUID(),
        txHash: record.txHash,
        chainId: record.chainId,
        token: USDC_BASE_SEPOLIA,
        payer: record.payer,
        recipient: record.recipient,
        amountUsdc: expectedAmountUsdc,
        providerId,
        providerName: provider?.name ?? null,
        firewallDecision,
        firewallReason,
        createdAt: now,
      })
      .onConflictDoNothing();
  }

  const imagePackFiles = ["rocket.svg", "shield.svg"] as const;
  const result =
    providerId === "image-pack-001"
      ? {
          kind: "image" as const,
          file: imagePackFiles[Math.floor(Math.random() * imagePackFiles.length)],
        }
      : null;

  return c.json({
    success: true,
    payment: record,
    result: result
      ? {
          kind: result.kind,
          url: `/api/image-pack/${result.file}`,
        }
      : null,
  });
});

/* ------------------------------------------------------------------ */
/*  POST /api/pay/execute — agent-initiated execution with firewall   */
/* ------------------------------------------------------------------ */

const executeSchema = z.object({
  providerId: z.string().min(1),
  amount: z.string().min(1),
  task: z.string().optional(),
});

/**
 * POST /api/pay/execute
 * Agent executes a service payment. Runs category + budget + firewall checks.
 */
payRouter.post("/execute", agentAuth, zValidator("json", executeSchema), async (c) => {
  const agent = c.get("agent");
  const { providerId, amount, task } = c.req.valid("json");
  const now = new Date().toISOString();

  // Lookup provider
  const provider = db
    .select()
    .from(schema.providers)
    .where(eq(schema.providers.id, providerId))
    .get();

  if (!provider) {
    return c.json({ error: "Provider not found", code: "PROVIDER_NOT_FOUND" }, 404);
  }

  // Category check: at least one of the provider's services must be in agent's allowed categories
  const agentCategories = agent.allowedCategories as string[];
  const providerServices = provider.services as string[];
  const hasAllowedCategory = providerServices.some((s) => agentCategories.includes(s));
  if (!hasAllowedCategory) {
    await db.insert(firewallEvents).values({
      id: randomUUID(),
      providerId: provider.id,
      providerName: provider.name,
      decision: "REJECTED",
      reason: `Agent not authorized for categories: ${providerServices.join(", ")}`,
      attemptedRecipient: provider.walletAddress,
      amountUsdc: amount,
      createdAt: now,
    });
    return c.json(
      {
        error: "Agent not authorized for this service category",
        code: "CATEGORY_DENIED",
        agentCategories,
        providerServices,
      },
      403
    );
  }

  // Budget check
  const spent = parseFloat(agent.spentTodayUsd);
  const requested = parseFloat(amount);
  const budget = parseFloat(agent.dailyBudgetUsd);

  if (spent + requested > budget) {
    await db.insert(firewallEvents).values({
      id: randomUUID(),
      providerId: provider.id,
      providerName: provider.name,
      decision: "REJECTED",
      reason: `Daily budget exceeded: spent=$${spent.toFixed(2)} + requested=$${requested.toFixed(2)} > budget=$${budget.toFixed(2)}`,
      attemptedRecipient: provider.walletAddress,
      amountUsdc: amount,
      createdAt: now,
    });
    return c.json(
      {
        error: "Daily budget exceeded",
        code: "BUDGET_EXCEEDED",
        spent: agent.spentTodayUsd,
        requested: amount,
        budget: agent.dailyBudgetUsd,
      },
      403
    );
  }

  // Firewall check
  // Convert USDC amount (e.g. "0.03") to base units (6 decimals) for firewall
  const amountBase = Math.round(requested * 1_000_000).toString();

  const fwResult = await checkFirewall({
    tx: {
      chainId: baseSepolia.id,
      from: agent.safeAddress,
      to: provider.walletAddress ?? "0x0000000000000000000000000000000000000000",
      value: amountBase,
    },
    provider: {
      id: provider.id,
      name: provider.name,
      trustScore: provider.trustScore,
      service: providerServices[0],
      recipient: provider.walletAddress ?? undefined,
    },
    safe: {
      address: agent.safeAddress,
      chainId: baseSepolia.id,
    },
  });

  if (fwResult.decision === "REJECTED") {
    await db.insert(firewallEvents).values({
      id: randomUUID(),
      providerId: provider.id,
      providerName: provider.name,
      decision: "REJECTED",
      reason: fwResult.reasons.join("; "),
      attemptedRecipient: provider.walletAddress,
      amountUsdc: amount,
      createdAt: now,
    });
    return c.json(
      {
        approved: false,
        decision: fwResult.decision,
        reasons: fwResult.reasons,
        warnings: fwResult.warnings,
      },
      403
    );
  }

  // Approved or CONFIRM_REQUIRED — update budget, record purchase
  const newSpent = (spent + requested).toFixed(6);
  db.update(agents).set({ spentTodayUsd: newSpent }).where(eq(agents.id, agent.id)).run();

  const purchaseId = randomUUID();
  const txHash = `0x${randomUUID().replace(/-/g, "")}` as string;

  await db.insert(purchases).values({
    id: purchaseId,
    txHash,
    chainId: baseSepolia.id,
    token: USDC_BASE_SEPOLIA,
    payer: agent.safeAddress,
    recipient: provider.walletAddress ?? "0x0000000000000000000000000000000000000000",
    amountUsdc: amount,
    providerId: provider.id,
    providerName: provider.name,
    firewallDecision: fwResult.decision,
    firewallReason: fwResult.reasons.join("; "),
    createdAt: now,
  });

  return c.json({
    approved: true,
    decision: fwResult.decision,
    purchaseId,
    txHash,
    provider: { id: provider.id, name: provider.name },
    amount,
    task: task ?? null,
    budgetRemaining: (budget - spent - requested).toFixed(6),
    warnings: fwResult.warnings,
  });
});
