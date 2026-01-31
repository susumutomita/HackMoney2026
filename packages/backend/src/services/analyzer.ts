import { spawn } from "node:child_process";
import { z } from "zod";
import type { TransactionAnalysis, TransactionInput } from "../types/index.js";

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
 * Build the analysis prompt using template literals
 * This is safer than string.replace() chains which can be corrupted by input values
 */
function buildAnalysisPrompt(tx: TransactionInput): string {
  return `You are an AI security analyst for a crypto treasury management system.
Analyze the following transaction and provide a risk assessment.

Transaction Details:
- Chain ID: ${tx.chainId}
- From: ${tx.from}
- To: ${tx.to}
- Value: ${tx.value} (in wei)
- Data: ${tx.data || "0x"}

Analyze this transaction and respond with ONLY a JSON object (no other text) containing:
1. "riskLevel": 1 (low), 2 (medium), or 3 (high)
2. "classification": type of transaction (e.g., "transfer", "swap", "lending", "unknown")
3. "approved": boolean - whether to approve based on risk
4. "reason": human-readable explanation
5. "warnings": array of specific concerns (can be empty)
6. "recommendations": array of suggested actions (can be empty)

Consider:
- Transaction value and potential impact
- Known contract interactions
- Unusual patterns
- Potential security risks

Respond with ONLY the JSON object, no additional text or markdown.`;
}

/**
 * Parse and validate the LLM response JSON
 * Uses zod schema validation for type safety
 */
function parseAnalysisResponse(text: string): Omit<TransactionAnalysis, "timestamp"> {
  // Try to extract JSON from the response
  // Handle cases where LLM might include markdown code blocks
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
 * Execute Claude Code CLI with the given prompt via stdin
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

export async function analyzeTransaction(tx: TransactionInput): Promise<TransactionAnalysis> {
  const prompt = buildAnalysisPrompt(tx);

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
