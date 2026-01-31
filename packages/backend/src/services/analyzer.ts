import { spawn } from "node:child_process";
import { z } from "zod";
import type { TransactionAnalysis, TransactionInput } from "../types/index.js";

export interface AnalyzerContext {
  provider?: {
    id?: string;
    name?: string;
    trustScore?: number;
    pricePerUnit?: string;
    unit?: string;
    services?: string[];
  };
  budget?: {
    /** USDC base units (6 decimals) */
    dailyLimitUsdcBaseUnits?: string;
    /** USDC base units (6 decimals) */
    spentTodayUsdcBaseUnits?: string;
  };
}

/** CLI execution timeout in milliseconds (2 minutes) */
const CLI_TIMEOUT_MS = 120_000;

/**
 * Zod schema for validating LLM response
 * Ensures the AI returns properly structured data
 */
const analysisResponseSchema = z.object({
  riskLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  classification: z.string(),
  approved: z.boolean(),
  reason: z.string(),
  warnings: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
});

/**
 * Build the analysis prompt for A2A API Marketplace transactions
 */
function buildAnalysisPrompt(tx: TransactionInput, ctx?: AnalyzerContext): string {
  const providerInfo = ctx?.provider
    ? `\nProvider Context (from marketplace DB, may be partial):\n- Provider ID: ${ctx.provider.id ?? "unknown"}\n- Provider Name: ${ctx.provider.name ?? "unknown"}\n- Provider Trust Score (0-100): ${ctx.provider.trustScore ?? "unknown"}\n- Provider Price: ${ctx.provider.pricePerUnit ?? "unknown"} USDC per ${ctx.provider.unit ?? "unit"}\n- Provider Services: ${(ctx.provider.services ?? []).join(", ") || "unknown"}`
    : "\nProvider Context: (not provided)";

  const budgetInfo = ctx?.budget
    ? `\nBudget Context (USDC base units; 6 decimals):\n- Daily Limit: ${ctx.budget.dailyLimitUsdcBaseUnits ?? "unknown"}\n- Spent Today (approved): ${ctx.budget.spentTodayUsdcBaseUnits ?? "unknown"}`
    : "\nBudget Context: (not provided)";

  return `You are an AI security analyst for an AI Agent API Marketplace with an Execution Firewall.
Analyze the following service purchase request and provide a risk assessment.

Transaction Details:
- Chain ID: ${tx.chainId}
- From (Client Agent): ${tx.from}
- To (Service Provider / Address): ${tx.to}
- Value: ${tx.value} (USDC base units; USDC has 6 decimals)
- Data: ${tx.data || "0x"}
${providerInfo}
${budgetInfo}

Analyze this transaction and respond with ONLY a JSON object (no other text) containing:
1. "riskLevel": 1 (low), 2 (medium), or 3 (high)
2. "classification": type of service (e.g., "translation", "summarization", "data-processing", "unknown")
3. "approved": boolean - whether to approve based on risk
4. "reason": human-readable explanation
5. "warnings": array of specific concerns (can be empty)
6. "recommendations": array of suggested actions (can be empty)

Consider:
- Transaction value and budget impact (including Budget Context if provided)
- Provider reputation and trust score (including Provider Context if provided)
- Service category appropriateness
- Unusual patterns or anomalies
- Potential security or fraud risks

Guidelines:
- Treat very low-trust providers (trustScore ≤ 15) as high risk.
- If budget context indicates this would exceed a daily limit, do NOT approve.
- If the service looks unrelated to business needs (games/personal use), increase risk.

Respond with ONLY the JSON object, no additional text or markdown.`;
}

/**
 * Parse and validate the LLM response JSON
 * Uses zod schema validation for type safety
 */
function parseAnalysisResponse(text: string): Omit<TransactionAnalysis, "timestamp"> {
  // Try to extract JSON from the response
  let jsonText = text.trim();

  // Remove markdown code block if present
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    jsonText = codeBlockMatch[1].trim();
  }

  // Try to find JSON object
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in LLM response");
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Invalid JSON in LLM response: ${jsonMatch[0].substring(0, 100)}...`);
  }

  // Validate with schema
  const result = analysisResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`LLM response validation failed: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Execute Claude CLI with the given prompt via stdin
 * Uses subscription-based Claude (no API costs)
 */
function executeClaudeCLI(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const claude = spawn("claude", ["-p"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    function settle(fn: () => void): void {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      fn();
    }

    claude.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    claude.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    claude.on("close", (code) => {
      if (code === 0) {
        settle(() => resolve(stdout));
      } else {
        settle(() => reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`)));
      }
    });

    claude.on("error", (err: Error) => {
      settle(() => reject(new Error(`Claude CLI spawn error: ${err.message}`)));
    });

    const timeout = setTimeout(() => {
      claude.kill();
      settle(() => reject(new Error("Claude CLI timeout after 120 seconds")));
    }, CLI_TIMEOUT_MS);

    claude.stdin.write(prompt);
    claude.stdin.end();
  });
}

/**
 * Analyze a transaction using Claude CLI (subscription-based, no API costs)
 */
export async function analyzeTransaction(
  tx: TransactionInput,
  ctx?: AnalyzerContext
): Promise<TransactionAnalysis> {
  const prompt = buildAnalysisPrompt(tx, ctx);

  try {
    const response = await executeClaudeCLI(prompt);
    const analysis = parseAnalysisResponse(response);

    return {
      ...analysis,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("LLM analysis failed:", error);

    // Fail-safe: mark as high risk when analysis fails
    return {
      riskLevel: 3,
      classification: "unknown",
      approved: false,
      reason: "Analysis failed - transaction blocked as precaution",
      warnings: ["Unable to perform AI analysis"],
      recommendations: ["Retry analysis", "Manual review required"],
      timestamp: new Date().toISOString(),
    };
  }
}
