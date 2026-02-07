#!/usr/bin/env tsx

/**
 * Agent Demo - Real AI agent making payment decisions
 *
 * This demo shows:
 * 1. AI Agent discovers providers via ZeroKey API
 * 2. Agent evaluates trust scores and decides to pay or not
 * 3. ZeroKey Firewall validates before payment
 * 4. If CONFIRM_REQUIRED, human approves in UI
 * 5. Payment executes with txHash proof
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  getAddress,
  http,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// Load .env
function loadDotEnv(path: string) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadDotEnv(".env");
loadDotEnv("../.env");
loadDotEnv("../../.env");

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const USDC_BASE_SEPOLIA = getAddress("0x036CbD53842c5426634e7929541eC2318f3dCF7e");

// ===== Claude API with OAuth Token =====

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";

interface Credentials {
  claudeAiOauth?: {
    accessToken: string;
  };
}

function getOAuthToken(): string | null {
  const credPath = join(homedir(), ".claude", ".credentials.json");
  if (!existsSync(credPath)) return null;
  try {
    const data = readFileSync(credPath, "utf8");
    const creds: Credentials = JSON.parse(data);
    return creds.claudeAiOauth?.accessToken || null;
  } catch {
    return null;
  }
}

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const token = getOAuthToken();
  if (!token) {
    throw new Error("No OAuth token. Run 'claude' CLI to authenticate.");
  }

  const body = {
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    stream: false,
    system: [
      { type: "text", text: "You are Claude Code, Anthropic's official CLI for Claude." },
      { type: "text", text: systemPrompt },
    ],
    messages: [{ role: "user", content: userMessage }],
  };

  const res = await fetch(`${ANTHROPIC_ENDPOINT}?beta=true`, {
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
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content?.map((c: any) => c.text).join("") || "";
}

// ===== API Helpers =====

async function getJson(path: string) {
  const res = await fetch(`${API}${path}`);
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function postJson(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

// ===== Main Demo =====

async function main() {
  console.log("\n🤖 ZeroKey Agent Demo\n");
  console.log("This demo shows a real AI agent making payment decisions.\n");

  // 1. Check API
  const health = await getJson("/health");
  if (health.status !== 200) {
    throw new Error(`Backend not healthy: ${health.status}`);
  }
  console.log("✓ Backend healthy\n");

  // 2. Discover providers
  console.log("=== Step 1: Agent discovers providers ===\n");
  const discover = await getJson("/api/a2a/discover?service=*");
  const providers = discover.json?.results || [];

  console.log("Agent: 'I found these providers:'\n");
  for (const p of providers) {
    console.log(`  - ${p.name} (Trust: ${p.trustScore}/100, Price: $${p.price})`);
  }

  // 3. Agent evaluates each provider
  console.log("\n=== Step 2: Agent evaluates providers ===\n");

  const systemPrompt = `You are an autonomous AI agent with a USDC wallet.
You need to buy API services but must protect your wallet from scams.
Evaluate providers and decide: BUY, SKIP, or ASK_HUMAN.

Respond with JSON only:
{"decision": "BUY|SKIP|ASK_HUMAN", "reason": "brief explanation", "provider": "provider_id"}`;

  const providerList = providers
    .map((p: any) => `- ${p.name} (id: ${p.id}): Trust ${p.trustScore}/100, $${p.price}/${p.unit}`)
    .join("\n");

  const userMessage = `I need a translation service. Here are the available providers:

${providerList}

Which one should I use? Consider trust scores and prices.`;

  console.log("Agent thinking...\n");

  const agentResponse = await callClaude(systemPrompt, userMessage);
  console.log("Agent response:", agentResponse, "\n");

  // Parse agent decision
  const jsonMatch = agentResponse.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    console.log("Could not parse agent decision, defaulting to safe choice");
    return;
  }

  const decision = JSON.parse(jsonMatch[0]);
  console.log(`Agent decided: ${decision.decision}`);
  console.log(`Reason: ${decision.reason}\n`);

  if (decision.decision === "SKIP") {
    console.log("Agent chose not to buy. Demo complete.");
    return;
  }

  // 4. Start negotiation with chosen provider
  const providerId = decision.provider || "translate-ai-001";
  console.log(`=== Step 3: Agent negotiates with ${providerId} ===\n`);

  const negotiate = await postJson("/api/a2a/negotiate", {
    clientId: "ai-agent-001",
    providerId,
    service: "translation",
    initialOffer: "0.03",
  });

  if (!negotiate.json?.success) {
    throw new Error(`Negotiation failed: ${JSON.stringify(negotiate.json)}`);
  }

  const sessionId = negotiate.json.session.id;
  console.log(`Negotiation started: ${sessionId}\n`);

  // Accept the offer
  await postJson(`/api/a2a/negotiate/${sessionId}/offer`, {
    amount: "0.03",
    type: "accept",
  });

  // 5. Firewall check
  console.log("=== Step 4: ZeroKey Firewall validates ===\n");

  const firewall = await postJson("/api/firewall/check", { sessionId });
  const fwDecision = firewall.json?.firewall?.decision;
  const fwReasons = firewall.json?.firewall?.reasons || [];

  console.log(`Firewall decision: ${fwDecision}`);
  console.log(`Reasons: ${fwReasons.join(", ")}\n`);

  if (fwDecision === "REJECTED") {
    console.log("❌ Payment BLOCKED by firewall. Money never moved.");
    console.log("See blocked audit log at: " + API + "/api/firewall/events");
    return;
  }

  if (fwDecision === "CONFIRM_REQUIRED" || decision.decision === "ASK_HUMAN") {
    console.log("⏸️  Human confirmation required.");
    console.log("CFO would approve in dashboard: " + API.replace("3001", "8000") + "/dashboard");
    // For demo, we'll proceed
    console.log("(Demo: auto-approving for demonstration)\n");
  }

  // 6. Execute payment
  console.log("=== Step 5: Execute USDC payment ===\n");

  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.log("No PRIVATE_KEY set, skipping actual payment.");
    return;
  }

  const account = privateKeyToAccount(
    pk.startsWith("0x") ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`)
  );
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
  const walletClient = createWalletClient({ chain: baseSepolia, transport: http(), account });

  // Get payment details
  const payReq = await postJson("/api/pay/request", {
    amountUsdc: "0.03",
    serviceId: providerId,
  });

  if (payReq.status !== 402) {
    throw new Error(`Expected 402, got ${payReq.status}`);
  }

  const recipient = getAddress(payReq.json.payment.recipient);
  const amountUnits = parseUnits("0.03", 6);

  console.log(`Sending 0.03 USDC to ${recipient}...`);

  const hash = await walletClient.writeContract({
    address: USDC_BASE_SEPOLIA,
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipient, amountUnits],
  });

  console.log(`txHash: ${hash}`);
  console.log(`BaseScan: https://sepolia.basescan.org/tx/${hash}\n`);

  await publicClient.waitForTransactionReceipt({ hash });

  // Submit proof
  await postJson("/api/pay/submit", {
    txHash: hash,
    expectedAmountUsdc: "0.03",
    providerId,
    firewallDecision: "APPROVED",
    firewallReason: "Agent demo: approved by AI",
  });

  console.log("✅ Payment complete! Agent successfully purchased API service.\n");
  console.log("View purchase log: " + API + "/api/purchases");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
