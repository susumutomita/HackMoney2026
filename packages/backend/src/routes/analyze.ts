import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { isAddress } from "viem";
import { analyzeTransaction } from "../services/analyzer.js";
import { analysisRepository } from "../repositories/index.js";
import { guardService } from "../services/guard.js";

export const analyzeRouter = new Hono();

/**
 * Supported chain IDs
 * Add new chains here as they are supported
 */
const SUPPORTED_CHAIN_IDS = [
  1, // Ethereum Mainnet
  8453, // Base
  84532, // Base Sepolia
  10, // Optimism
  11155420, // Optimism Sepolia
] as const;

/**
 * Ethereum address validation using viem
 */
const ethereumAddress = z.string().refine(
  (val) => isAddress(val),
  (val) => ({ message: `Invalid Ethereum address: ${val}` })
);

/**
 * Chain ID validation against supported networks
 */
const supportedChainId = z.number().refine(
  (id) => SUPPORTED_CHAIN_IDS.includes(id as (typeof SUPPORTED_CHAIN_IDS)[number]),
  (id) => ({
    message: `Unsupported chain ID: ${id}. Supported chains: ${SUPPORTED_CHAIN_IDS.join(", ")}`,
  })
);

/**
 * Transaction schema with proper validation
 */
const transactionSchema = z.object({
  chainId: supportedChainId,
  from: ethereumAddress,
  to: ethereumAddress,
  value: z.string().refine(
    (val) => {
      try {
        const num = BigInt(val);
        return num >= 0n;
      } catch {
        return false;
      }
    },
    (val) => ({ message: `Invalid value (must be non-negative integer): ${val}` })
  ),
  data: z.string().optional(),
  gasLimit: z.string().optional(),
  submitOnChain: z.boolean().optional().default(false),
});

/**
 * POST /api/analyze/transaction - Analyze a transaction
 * Optionally submits the decision on-chain if submitOnChain is true
 */
analyzeRouter.post("/transaction", zValidator("json", transactionSchema), async (c) => {
  const { submitOnChain, ...transaction } = c.req.valid("json");

  try {
    const analysis = await analyzeTransaction(transaction);

    // Save analysis result to database
    const storedResult = await analysisRepository.save(transaction, analysis);

    // Prepare response
    const response: Record<string, unknown> = {
      ...analysis,
      txHash: storedResult.txHash,
    };

    // Submit decision on-chain if requested
    if (submitOnChain) {
      const onChainResult = await guardService.submitDecision(
        transaction.chainId,
        storedResult.txHash as `0x${string}`,
        analysis.approved,
        analysis.riskLevel,
        analysis.reason
      );

      response.onChain = {
        submitted: onChainResult.success,
        txHash: onChainResult.txHash,
        error: onChainResult.error,
      };
    }

    return c.json(response);
  } catch (error) {
    console.error("Analysis error:", error);
    return c.json(
      {
        error: "Failed to analyze transaction",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /api/analyze/status/:txHash - Get analysis status by transaction hash
 */
analyzeRouter.get("/status/:txHash", async (c) => {
  const txHash = c.req.param("txHash");

  // Validate txHash format (should be 0x + 64 hex chars)
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return c.json(
      {
        error: "Invalid transaction hash format",
        message: "Expected format: 0x followed by 64 hexadecimal characters",
      },
      400
    );
  }

  try {
    const result = await analysisRepository.findByTxHash(txHash);

    if (!result) {
      return c.json(
        {
          error: "Analysis not found",
          message: "No analysis result found for this transaction hash",
          txHash,
        },
        404
      );
    }

    return c.json({
      txHash: result.txHash,
      analysis: result.analysis,
      transaction: result.transaction,
      analyzedAt: result.analyzedAt,
    });
  } catch (error) {
    console.error("Failed to fetch analysis status:", error);
    return c.json(
      {
        error: "Failed to fetch analysis status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /api/analyze/recent - Get recent analysis results
 */
analyzeRouter.get("/recent", async (c) => {
  const limitParam = c.req.query("limit");
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100) : 20;

  try {
    const results = await analysisRepository.findRecent(limit);
    return c.json({ results });
  } catch (error) {
    console.error("Failed to fetch recent analyses:", error);
    return c.json(
      {
        error: "Failed to fetch recent analyses",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /api/analyze/onchain/:chainId/:txHash - Check on-chain approval status
 */
analyzeRouter.get("/onchain/:chainId/:txHash", async (c) => {
  const chainIdParam = c.req.param("chainId");
  const txHash = c.req.param("txHash");

  // Validate chainId
  const chainId = parseInt(chainIdParam, 10);
  if (
    isNaN(chainId) ||
    !SUPPORTED_CHAIN_IDS.includes(chainId as (typeof SUPPORTED_CHAIN_IDS)[number])
  ) {
    return c.json(
      {
        error: "Invalid chain ID",
        message: `Supported chains: ${SUPPORTED_CHAIN_IDS.join(", ")}`,
      },
      400
    );
  }

  // Validate txHash format
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return c.json(
      {
        error: "Invalid transaction hash format",
        message: "Expected format: 0x followed by 64 hexadecimal characters",
      },
      400
    );
  }

  try {
    const isApproved = await guardService.isApproved(chainId, txHash as `0x${string}`);

    if (isApproved === null) {
      return c.json(
        {
          error: "Guard not configured",
          message: `No ZeroKeyGuard contract configured for chain ${chainId}`,
          chainId,
        },
        404
      );
    }

    return c.json({
      chainId,
      txHash,
      isApproved,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to check on-chain status:", error);
    return c.json(
      {
        error: "Failed to check on-chain status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /api/analyze/guard/config - Get guard configuration status for all chains
 */
analyzeRouter.get("/guard/config", async (c) => {
  const status = guardService.getConfigurationStatus();
  return c.json({
    chains: status,
    supportedChainIds: SUPPORTED_CHAIN_IDS,
  });
});

/**
 * POST /api/analyze/submit-onchain - Submit a previously analyzed transaction on-chain
 */
const submitOnChainSchema = z.object({
  chainId: supportedChainId,
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash format"),
});

analyzeRouter.post("/submit-onchain", zValidator("json", submitOnChainSchema), async (c) => {
  const { chainId, txHash } = c.req.valid("json");

  try {
    // Get the stored analysis result
    const storedResult = await analysisRepository.findByTxHash(txHash);

    if (!storedResult) {
      return c.json(
        {
          error: "Analysis not found",
          message:
            "No analysis result found for this transaction hash. Analyze the transaction first.",
          txHash,
        },
        404
      );
    }

    // Submit the decision on-chain
    const result = await guardService.submitDecision(
      chainId,
      txHash as `0x${string}`,
      storedResult.analysis.approved,
      storedResult.analysis.riskLevel,
      storedResult.analysis.reason
    );

    return c.json({
      success: result.success,
      txHash: result.txHash,
      error: result.error,
      chainId,
      analysisHash: txHash,
    });
  } catch (error) {
    console.error("Failed to submit on-chain:", error);
    return c.json(
      {
        error: "Failed to submit on-chain",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});
