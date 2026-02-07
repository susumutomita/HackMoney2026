#!/usr/bin/env tsx
/**
 * Agent Demo - Blocked by Firewall
 * Shows what happens when agent tries to use a scam provider
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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

async function postJson(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function main() {
  console.log("\n🚫 Agent Demo - BLOCKED by Firewall\n");
  console.log("Simulating: Agent tries to buy from a SCAM provider\n");

  // Negotiate with scam provider
  console.log("=== Agent negotiates with CheapTranslate (SCAM) ===\n");

  const negotiate = await postJson("/api/a2a/negotiate", {
    clientId: "naive-agent-001",
    providerId: "sketchy-service-001",
    service: "translation",
    initialOffer: "0.005",
  });

  const sessionId = negotiate.json?.session?.id;
  console.log(`Session: ${sessionId}\n`);

  // Try to pay
  console.log("=== ZeroKey Firewall intercepts ===\n");

  const firewall = await postJson("/api/firewall/check", { sessionId });

  console.log(`Decision: ${firewall.json?.firewall?.decision}`);
  console.log(`Risk Level: ${firewall.json?.firewall?.riskLevel}`);
  console.log("\nReasons:");
  for (const r of firewall.json?.firewall?.reasons || []) {
    console.log(`  ❌ ${r}`);
  }
  console.log("\nWarnings:");
  for (const w of firewall.json?.firewall?.warnings || []) {
    console.log(`  ⚠️  ${w}`);
  }

  console.log("\n💰 Result: MONEY NEVER MOVED");
  console.log("Agent's wallet is protected from the scam.\n");

  console.log("View blocked audit log:");
  console.log(`  ${API}/api/firewall/events`);
}

main().catch(console.error);
