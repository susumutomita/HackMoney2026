import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { isAddress } from "viem";
import { analyzeTransaction } from "../services/analyzer.js";
import { checkFirewall } from "../services/firewall.js";
import { analysisRepository } from "../repositories/index.js";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { a2aAuth } from "../middleware/a2aAuth.js";
import { config } from "../config.js";
import { parseA2AAllowlist, parseA2AKeys } from "../middleware/a2aAuthConfig.js";
import { guardService } from "../services/guard.js";

export const firewallRouter = new Hono();

// Protect critical POST operations first.
firewallRouter.use(
  "/check",
  a2aAuth({
    enabled: config.a2a.enabled,
    timestampWindowSeconds: config.a2a.timestampWindowSeconds,
    keys: parseA2AKeys(config.a2a.keys),
    allowlist: parseA2AAllowlist(config.a2a.allowlist),
  })
);

const SUPPORTED_CHAIN_IDS = [
  1, // Ethereum Mainnet
  8453, // Base
  84532, // Base Sepolia
  10, // Optimism
  11155420, // Optimism Sepolia
] as const;

const ethereumAddress = z.string().refine(
  (val) => isAddress(val),
  (val) => ({ message: `Invalid Ethereum address: ${val}` })
);

const supportedChainId = z.number().refine(
  (id) => SUPPORTED_CHAIN_IDS.includes(id as (typeof SUPPORTED_CHAIN_IDS)[number]),
  (id) => ({
    message: `Unsupported chain ID: ${id}. Supported chains: ${SUPPORTED_CHAIN_IDS.join(", ")}`,
  })
);

const checkSchema = z
  .object({
    // Either provide full transaction details, or provide a negotiation sessionId.
    sessionId: z.string().optional(),

    chainId: supportedChainId.optional(),
    from: ethereumAddress.optional(),
    to: ethereumAddress.optional(),
    value: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (val === undefined) return true;
          try {
            return BigInt(val) >= 0n;
          } catch {
            return false;
          }
        },
        (val) => ({ message: `Invalid value (must be non-negative integer): ${val}` })
      ),
    data: z.string().optional(),

    // Optional: providerId from the marketplace.
    providerId: z.string().optional(),
  })
  .refine(
    (val) => {
      if (val.sessionId) return true;
      return !!val.chainId && !!val.from && !!val.to && typeof val.value === "string";
    },
    {
      message: "Provide either sessionId OR {chainId, from, to, value} to perform a firewall check",
    }
  );

function usdcToBaseUnits(amount: string): bigint {
  // amount like "1.2345" -> 1234500 (6 decimals)
  const parts = amount.split(".");
  const wholeRaw: string = parts[0] ?? "0";
  const frac: string = parts[1] ?? "";

  const fracPadded = (frac + "000000").slice(0, 6);
  const sign = wholeRaw.startsWith("-") ? -1n : 1n;
  const w = BigInt(wholeRaw.replace("-", "") || "0");
  const f = BigInt(fracPadded || "0");
  return sign * (w * 1_000_000n + f);
}

/**
 * POST /api/firewall/check
 * Runs deterministic firewall checks + LLM analysis (Claude CLI) and stores results.
 */
firewallRouter.post("/check", zValidator("json", checkSchema), async (c) => {
  const input = c.req.valid("json");

  // Resolve from negotiation session if provided.
  const tx = {
    chainId: input.chainId ?? 84532,
    from: input.from ?? ("0x0000000000000000000000000000000000000000" as string),
    to: input.to ?? ("0x0000000000000000000000000000000000000000" as string),
    value: input.value ?? "0",
    data: input.data,
  };

  let providerId = input.providerId;

  if (input.sessionId) {
    const session = await db
      .select()
      .from(schema.negotiations)
      .where(eq(schema.negotiations.id, input.sessionId))
      .limit(1);

    const neg = session[0];
    if (!neg) {
      return c.json({ error: "Session not found", sessionId: input.sessionId }, 404);
    }

    providerId = neg.providerId;

    // If agreed, use finalPrice; otherwise fallback to initialOffer.
    const price = neg.finalPrice ?? neg.initialOffer;
    tx.value = usdcToBaseUnits(price).toString();

    // NOTE: negotiations don't currently store onchain from/to addresses.
  }

  // Provider context (optional)
  const providerRow = providerId
    ? (
        await db.select().from(schema.providers).where(eq(schema.providers.id, providerId)).limit(1)
      )[0]
    : undefined;

  const providerForAnalyzer = providerRow
    ? {
        id: providerRow.id,
        name: providerRow.name,
        trustScore: providerRow.trustScore,
        pricePerUnit: providerRow.pricePerUnit,
        unit: providerRow.unit,
        services: providerRow.services ?? [],
      }
    : undefined;

  // If the client didn't specify an onchain destination, assume the provider's recipient.
  if (!input.to && providerRow?.walletAddress) {
    tx.to = providerRow.walletAddress;
  }

  const expectedRecipient = providerId ? config.providerRegistry[providerId]?.recipient : undefined;

  const providerForFirewall = providerRow
    ? {
        id: providerRow.id,
        name: providerRow.name,
        trustScore: providerRow.trustScore,
        priceWei: providerRow.pricePerUnit,
        service: providerRow.services?.[0] ?? undefined,
        ensName: providerRow.ensName ?? null,
        expectedRecipient,
        recipient: providerRow.walletAddress ?? undefined,
      }
    : undefined;

  try {
    const firewall = await checkFirewall({ tx, provider: providerForFirewall });

    // If blocked before payment, write an audit event without txHash (money never moved).
    if (firewall.decision === "REJECTED") {
      const amountUsdc = (() => {
        try {
          const v = BigInt(tx.value);
          const whole = v / 1_000_000n;
          const frac = (v % 1_000_000n).toString().padStart(6, "0");
          return `${whole.toString()}.${frac}`.replace(/\.0+$/, "");
        } catch {
          return undefined;
        }
      })();

      await db.insert(schema.firewallEvents).values({
        id: randomUUID(),
        providerId: providerRow?.id ?? providerId ?? null,
        providerName: providerRow?.name ?? null,
        decision: firewall.decision,
        reason: firewall.reasons.join("\n"),
        attemptedRecipient: tx.to,
        amountUsdc,
        createdAt: new Date().toISOString(),
      });
    }

    const analysis = await analyzeTransaction(tx, {
      provider: providerForAnalyzer,
      budget: {
        // Demo hint; deterministic firewall itself enforces daily budget in-memory.
        dailyLimitUsdcBaseUnits: (100n * 1_000_000n).toString(),
      },
    });

    const stored = await analysisRepository.save(tx, analysis);

    // Combine decisions: deterministic firewall + LLM
    const combinedApproved = firewall.decision === "APPROVED" && analysis.approved;
    const combinedDecision = combinedApproved ? "approved" : "rejected";

    await db.insert(schema.auditLogs).values({
      id: randomUUID(),
      txHash: stored.txHash,
      decision: combinedDecision,
      riskLevel: analysis.riskLevel,
      reason: combinedApproved
        ? analysis.reason
        : `Firewall: ${firewall.reasons.join("; ")}; LLM: ${analysis.reason}`,
      policyIds: firewall.matchedPolicyIds,
      timestamp: new Date().toISOString(),
    });

    // Submit decision to on-chain ZeroKeyGuard contract
    let onChainResult = null;
    if (guardService.isConfigured(tx.chainId)) {
      const reasonText = combinedApproved
        ? `Approved: ${analysis.reason.slice(0, 200)}`
        : `Rejected: ${firewall.reasons[0] || analysis.reason}`.slice(0, 200);

      onChainResult = await guardService.submitDecision(
        tx.chainId,
        stored.txHash as `0x${string}`,
        combinedApproved,
        analysis.riskLevel,
        reasonText
      );

      if (onChainResult.success) {
        console.log(`On-chain decision recorded: ${onChainResult.txHash}`);
      } else {
        console.error(`On-chain submission failed: ${onChainResult.error}`);
      }
    }

    return c.json({
      txHash: stored.txHash,
      approved: combinedApproved,
      firewall,
      analysis,
      onChain: onChainResult,
    });
  } catch (error) {
    console.error("Firewall check error:", error);
    return c.json(
      {
        error: "Firewall check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /api/firewall/status/:txHash
 * Returns stored analysis + audit decision.
 */
firewallRouter.get("/status/:txHash", async (c) => {
  const txHash = c.req.param("txHash");

  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return c.json(
      { error: "Invalid transaction hash format", message: "Expected 0x + 64 hex" },
      400
    );
  }

  try {
    const stored = await analysisRepository.findByTxHash(txHash);
    const audit = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.txHash, txHash))
      .limit(1);

    if (!stored) {
      return c.json({ error: "Not found", txHash }, 404);
    }

    return c.json({
      txHash,
      analysis: stored.analysis,
      transaction: stored.transaction,
      analyzedAt: stored.analyzedAt,
      audit: audit[0] ?? null,
    });
  } catch (error) {
    console.error("Firewall status error:", error);
    return c.json(
      {
        error: "Failed to fetch firewall status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});
