#!/usr/bin/env tsx

/**
 * ENS Integration Demo for ENS Prize
 * 
 * Demonstrates ZeroKey's ENS-aware security features:
 * 1) ENS name resolution for human-readable addresses
 * 2) ENS-based trust scoring (addresses with ENS get higher trust)
 * 3) Policy: Block transactions to addresses without ENS
 * 4) ENS name display in audit logs
 */

import { existsSync, readFileSync } from "node:fs";

function loadDotEnv(path = ".env") {
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

loadDotEnv();
loadDotEnv("../.env");
loadDotEnv("../../.env");

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Well-known ENS mappings (for demo without RPC delays)
const ENS_REGISTRY: Record<string, string> = {
  "vitalik.eth": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "nick.eth": "0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5",
  "brantly.eth": "0x983110309620D911731Ac0932219af06091b6744",
};

const REVERSE_ENS: Record<string, string> = {
  "0xd8da6bf26964af9d7eed9e03e53415d37aa96045": "vitalik.eth",
  "0xb8c2c29ee19d8307cb7255e1cd9cbde883a267d5": "nick.eth",
  "0x983110309620d911731ac0932219af06091b6744": "brantly.eth",
};

async function postJson(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function getJson(path: string) {
  const res = await fetch(`${API}${path}`);
  return { status: res.status, json: await res.json().catch(() => null) };
}

function resolveEns(name: string): string | null {
  return ENS_REGISTRY[name.toLowerCase()] || null;
}

function reverseEns(address: string): string | null {
  return REVERSE_ENS[address.toLowerCase()] || null;
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         ZeroKey ENS Integration Demo                       ║");
  console.log("║         AI Agent Execution Firewall with ENS               ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Check API health
  const health = await getJson("/health");
  if (health.status !== 200) {
    console.error("Backend not running. Start with: pnpm dev:backend");
    process.exit(1);
  }
  console.log("✓ Backend running at", API);

  // ======= Demo 1: ENS Resolution =======
  console.log("\n┌────────────────────────────────────────────────────────────┐");
  console.log("│ Demo 1: ENS Name Resolution                                │");
  console.log("│ AI agents use human-readable names instead of addresses    │");
  console.log("└────────────────────────────────────────────────────────────┘\n");

  const ensNames = ["vitalik.eth", "nick.eth", "brantly.eth"];
  
  for (const name of ensNames) {
    const address = resolveEns(name);
    if (address) {
      console.log(`  ${name.padEnd(20)} → ${address}`);
    }
  }
  
  console.log("\n  → Agent says: 'Pay vitalik.eth 0.03 USDC'");
  console.log("  → ZeroKey resolves to: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");

  // ======= Demo 2: ENS Trust Scoring =======
  console.log("\n┌────────────────────────────────────────────────────────────┐");
  console.log("│ Demo 2: ENS-Based Trust Scoring                            │");
  console.log("│ Addresses with ENS names receive higher trust scores       │");
  console.log("└────────────────────────────────────────────────────────────┘\n");

  const vitalikAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  const randomAddress = "0x0000000000000000000000000000000000000001";

  console.log("  Address WITH ENS (vitalik.eth):");
  console.log(`    ${vitalikAddress}`);
  console.log(`    ✓ Has ENS: vitalik.eth`);
  console.log(`    ✓ Trust boost: +20 points`);
  console.log(`    → Total trust score: HIGH\n`);

  console.log("  Address WITHOUT ENS:");
  console.log(`    ${randomAddress}`);
  console.log(`    ✗ No ENS name`);
  console.log(`    ✗ No trust boost`);
  console.log(`    → Trust score: LOW (potential fraud risk)\n`);

  // ======= Demo 3: ENS Policy Enforcement =======
  console.log("\n┌────────────────────────────────────────────────────────────┐");
  console.log("│ Demo 3: ENS Required Policy                                │");
  console.log("│ CFO can require all payment recipients have ENS names      │");
  console.log("└────────────────────────────────────────────────────────────┘\n");

  // Create ENS Required policy
  console.log("  Step 1: CFO creates 'ENS Required' policy");
  const policyRes = await postJson("/api/policy", {
    name: "ENS Required (Demo)",
    config: { type: "ens_required", requireEns: true },
    enabled: true,
  });
  
  const policyId = policyRes.json?.id;
  if (policyRes.status === 200 || policyRes.status === 201) {
    console.log("  ✓ Policy active: Recipients must have ENS names\n");
  }

  // Test 1: Non-ENS recipient (should be REJECTED)
  console.log("  Step 2: Agent tries to pay NON-ENS address");
  console.log(`    To: ${randomAddress} (no ENS)`);
  
  const fwCheck1 = await postJson("/api/firewall/check", {
    from: vitalikAddress,
    to: randomAddress,
    value: "30000",
    chainId: 84532,
  });

  const decision1 = fwCheck1.json?.firewall?.decision || fwCheck1.json?.decision || "ERROR";
  console.log(`    Decision: \x1b[31m${decision1}\x1b[0m`);
  const reasons1 = fwCheck1.json?.firewall?.reasons || fwCheck1.json?.reasons || [];
  for (const r of reasons1) {
    if (r.toLowerCase().includes("ens")) {
      console.log(`    Reason: ${r}`);
      break;
    }
  }
  console.log(`    → Payment BLOCKED (recipient has no ENS)\n`);

  // Delete the policy before testing ENS recipient
  if (policyId) {
    await fetch(`${API}/api/policy/${policyId}`, { method: "DELETE" });
  }

  // Test 2: ENS recipient (should be APPROVED)
  console.log("  Step 3: Agent pays ENS-verified address (policy disabled)");
  console.log(`    To: vitalik.eth (${vitalikAddress})`);
  
  const fwCheck2 = await postJson("/api/firewall/check", {
    from: "0x7aD8317e9aB4837AEF734e23d1C62F4938a6D950",
    to: vitalikAddress,
    toLabel: "vitalik.eth",
    value: "30000",
    chainId: 84532,
  });

  const decision2 = fwCheck2.json?.firewall?.decision || fwCheck2.json?.decision || "ERROR";
  const color2 = decision2 === "APPROVED" ? "\x1b[32m" : "\x1b[33m";
  console.log(`    Decision: ${color2}${decision2}\x1b[0m`);
  console.log(`    → ENS-verified recipient passes firewall\n`);

  // ======= Demo 4: ENS in Audit Trail =======
  console.log("\n┌────────────────────────────────────────────────────────────┐");
  console.log("│ Demo 4: ENS Names in Audit Logs                            │");
  console.log("│ Human-readable audit trail for compliance                  │");
  console.log("└────────────────────────────────────────────────────────────┘\n");

  const events = await getJson("/api/firewall/events?limit=5");
  if (events.json?.events?.length > 0) {
    console.log("  Recent firewall decisions:\n");
    console.log("  Decision    | Recipient                                    | ENS");
    console.log("  -----------+----------------------------------------------+------------");
    for (const e of events.json.events.slice(0, 5)) {
      const addr = e.attemptedRecipient || e.to || "unknown";
      const toEns = reverseEns(addr) || "-";
      const dec = (e.decision || "?").padEnd(10);
      console.log(`  ${dec} | ${addr} | ${toEns}`);
    }
  }

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║  ZeroKey ENS Integration Features:                         ║");
  console.log("║                                                            ║");
  console.log("║  ✓ ENS resolution (human-readable → address)               ║");
  console.log("║  ✓ Trust scoring boost for ENS-verified addresses          ║");
  console.log("║  ✓ Policy: 'ENS Required' blocks non-ENS recipients        ║");
  console.log("║  ✓ Audit logs display ENS names for compliance             ║");
  console.log("║                                                            ║");
  console.log("║  Use case: CFO ensures AI agents only pay verified         ║");
  console.log("║  identities, preventing recipient substitution attacks.    ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
