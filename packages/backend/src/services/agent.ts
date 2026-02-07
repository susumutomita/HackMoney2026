import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Agent Service
 * Uses Claude Code OAuth token to call Anthropic API
 */

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  error?: { type: string; message: string };
}

interface Credentials {
  claudeAiOauth?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}

/**
 * Read OAuth token from Claude Code credentials
 */
function getOAuthToken(): string | null {
  const credPath = join(homedir(), ".claude", ".credentials.json");
  if (!existsSync(credPath)) {
    console.error("No credentials file found at", credPath);
    return null;
  }

  try {
    const data = readFileSync(credPath, "utf8");
    const creds: Credentials = JSON.parse(data);
    const token = creds.claudeAiOauth?.accessToken;
    if (token && token.startsWith("sk-ant-oat")) {
      return token;
    }
    return null;
  } catch (e) {
    console.error("Failed to read credentials:", e);
    return null;
  }
}

/**
 * Call Claude API with OAuth token
 */
export async function callAgent(
  systemPrompt: string,
  messages: ChatMessage[],
  options?: { model?: string; maxTokens?: number }
): Promise<string> {
  const token = getOAuthToken();
  if (!token) {
    throw new Error("No OAuth token available. Run 'claude' CLI to authenticate.");
  }

  const model = options?.model || "claude-sonnet-4-5-20250929";
  const maxTokens = options?.maxTokens || 4096;

  // Build request with OAuth format
  const systemBlocks = [
    { type: "text", text: "You are Claude Code, Anthropic's official CLI for Claude." },
    { type: "text", text: systemPrompt },
  ];

  const body = {
    model,
    max_tokens: maxTokens,
    stream: false,
    system: systemBlocks,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  };

  const endpoint = `${ANTHROPIC_ENDPOINT}?beta=true`;

  console.log(`[Agent] Calling ${model} with ${messages.length} messages`);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      Authorization: `Bearer ${token}`,
      "anthropic-beta": "oauth-2025-04-20,interleaved-thinking-2025-05-14",
      "User-Agent": "claude-cli/2.1.2 (external, cli)",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[Agent] API error ${res.status}:`, errorText);
    throw new Error(`API error ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as AnthropicResponse;

  if (data.error) {
    throw new Error(`API error: ${data.error.message}`);
  }

  const result = data.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");

  return result;
}

/**
 * Agent that decides whether to approve a payment
 */
export async function agentDecision(context: {
  providerId: string;
  providerName: string;
  service: string;
  priceUsdc: string;
  trustScore: number;
  trustBreakdown?: Record<string, unknown>;
  recipientAddress: string;
}): Promise<{
  decision: "APPROVE" | "REJECT" | "NEED_HUMAN";
  reason: string;
}> {
  const systemPrompt = `You are an AI agent making autonomous payment decisions for API services.
You have a budget of 1 USDC per transaction max.
You must protect your wallet from scams and fraud.

Evaluate the payment request and respond with JSON only:
{
  "decision": "APPROVE" | "REJECT" | "NEED_HUMAN",
  "reason": "brief explanation"
}

Rules:
- REJECT if trust score < 20
- REJECT if price > 1 USDC
- NEED_HUMAN if trust score < 50 and price > 0.1 USDC
- APPROVE if trust score >= 50 and price is reasonable`;

  const userMessage = `Payment Request:
- Provider: ${context.providerName} (${context.providerId})
- Service: ${context.service}
- Price: ${context.priceUsdc} USDC
- Trust Score: ${context.trustScore}/100
- Trust Breakdown: ${JSON.stringify(context.trustBreakdown || {})}
- Recipient: ${context.recipientAddress}

Should I approve this payment?`;

  const response = await callAgent(systemPrompt, [{ role: "user", content: userMessage }]);

  // Parse JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { decision: "NEED_HUMAN", reason: "Could not parse agent response" };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      decision: parsed.decision || "NEED_HUMAN",
      reason: parsed.reason || "No reason provided",
    };
  } catch {
    return { decision: "NEED_HUMAN", reason: "Failed to parse agent decision" };
  }
}
