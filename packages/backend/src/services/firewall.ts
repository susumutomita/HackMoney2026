import type { Policy, PolicyConfig, TransactionInput } from "../types/index.js";
import { policyRepository } from "../repositories/index.js";

export type FirewallDecision = "APPROVED" | "WARNING" | "REJECTED";

export interface FirewallCheckInput {
  tx: TransactionInput;
  provider?: {
    id: string;
    name: string;
    trustScore: number;
    /** Price hint for the provider (same units as tx.value). Optional. */
    priceWei?: string;
    service?: string;
    /** Verified recipient (from registry) for recipient-invariant checks. */
    expectedRecipient?: string;
    /** Recipient presented by marketplace/provider listing. */
    recipient?: string;
  };
  /** Override current time (useful for tests). */
  now?: Date;
}

export interface FirewallCheckResult {
  decision: FirewallDecision;
  riskLevel: 1 | 2 | 3;
  reasons: string[];
  warnings: string[];
  matchedPolicyIds: string[];
  meta: {
    budgetRemainingWei?: string;
    trustScore?: number;
    rateLimit?: {
      windowSeconds: number;
      max: number;
      current: number;
    };
  };
}

/**
 * Value units: this codebase passes tx.value as a string and the analyzer prompt says
 * "in wei, USDC has 6 decimals". For the demo firewall we treat `value` as USDC base
 * units (10^6), i.e. $1.00 USDC == 1_000_000.
 */
const USDC_BASE = 1_000_000n;

/** Hard-coded demo daily budget: $100 USDC */
const MAX_DAILY_BUDGET = 100n * USDC_BASE;

/** In-memory daily spend tracker: key = YYYY-MM-DD:from */
const dailySpend: Map<string, bigint> = new Map();

/** In-memory rate limit tracker: key = providerId:from, value = timestamps (ms) */
const recentRequests: Map<string, number[]> = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function safeBigInt(val: string | undefined): bigint {
  if (!val) return 0n;
  try {
    return BigInt(val);
  } catch {
    return 0n;
  }
}

function dayKey(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function maxRisk(a: 1 | 2 | 3, b: 1 | 2 | 3): 1 | 2 | 3 {
  return (a > b ? a : b) as 1 | 2 | 3;
}

function decisionFrom(risk: 1 | 2 | 3, hardReject: boolean): FirewallDecision {
  if (hardReject || risk === 3) return "REJECTED";
  if (risk === 2) return "WARNING";
  return "APPROVED";
}

function enforceSpendingLimitPolicy(
  policy: Policy,
  txValue: bigint,
  matchedPolicyIds: string[],
  reasons: string[],
  warnings: string[],
  state: { risk: 1 | 2 | 3; hardReject: boolean }
): void {
  const config = policy.config as PolicyConfig;
  if (config.type !== "spending_limit") return;
  if (config.period !== "per_transaction") return;

  const maxAmount = safeBigInt(config.maxAmountWei);
  if (maxAmount > 0n && txValue > maxAmount) {
    matchedPolicyIds.push(policy.id);
    state.risk = maxRisk(state.risk, 3);
    state.hardReject = true;
    reasons.push(`Policy '${policy.name}' blocks: tx.value exceeds per-transaction limit`);
    warnings.push(
      `Spending limit exceeded (value=${txValue.toString()} max=${maxAmount.toString()})`
    );
  }
}

function enforceProtocolAllowlistPolicy(
  policy: Policy,
  txTo: string,
  matchedPolicyIds: string[],
  reasons: string[],
  warnings: string[],
  state: { risk: 1 | 2 | 3; hardReject: boolean }
): void {
  const config = policy.config as PolicyConfig;
  if (config.type !== "protocol_allowlist") return;

  const toLower = txTo.toLowerCase();
  const allowed = config.allowedAddresses.map((a) => a.toLowerCase());
  const isAllowed = allowed.includes(toLower);

  if (!isAllowed && !config.allowUnknown) {
    matchedPolicyIds.push(policy.id);
    state.risk = maxRisk(state.risk, 3);
    state.hardReject = true;
    reasons.push(`Policy '${policy.name}' blocks: destination not in allowlist`);
    warnings.push(`Destination address ${txTo} is not allowlisted`);
  }
}

export async function checkFirewall(input: FirewallCheckInput): Promise<FirewallCheckResult> {
  const now = input.now ?? new Date();
  const reasons: string[] = [];
  const warnings: string[] = [];
  const matchedPolicyIds: string[] = [];

  const txValue = safeBigInt(input.tx.value);

  let risk: 1 | 2 | 3 = 1;
  let hardReject = false;

  // --- Provider recipient invariants (demo-focused, high-signal) ---
  if (input.provider?.expectedRecipient && input.provider.recipient) {
    const expected = input.provider.expectedRecipient.toLowerCase();
    const got = input.provider.recipient.toLowerCase();
    if (expected !== got) {
      risk = maxRisk(risk, 3);
      hardReject = true;
      reasons.push(`Recipient mismatch (expected ${input.provider.expectedRecipient})`);
      reasons.push(`Got ${input.provider.recipient}`);
      reasons.push("Potential recipient substitution / fraud risk");
      warnings.push("Action: choose a verified provider or request manual approval");
    }
  } else if (input.provider?.recipient && !input.provider.expectedRecipient) {
    // Unverified provider recipient: warn, but do not hard block.
    risk = maxRisk(risk, 2);
    reasons.push("Provider recipient not verified (registry missing)");
    warnings.push("Proceed with caution or use a verified provider");
  }

  // --- Provider trust score heuristics (demo-focused) ---
  if (input.provider) {
    const ts = input.provider.trustScore;
    if (ts <= 15) {
      // Low trust: warn by default, reject if large spend.
      risk = maxRisk(risk, 2);
      warnings.push(`Low provider trust score: ${ts} (${input.provider.name})`);

      const highSpendThreshold = 20n * USDC_BASE;
      if (txValue >= highSpendThreshold) {
        risk = maxRisk(risk, 3);
        hardReject = true;
        reasons.push("Low-trust provider with high spend - blocked");
      } else {
        reasons.push("Low-trust provider - requires caution");
      }
    } else if (ts >= 80) {
      reasons.push("High-trust provider");
    } else {
      risk = maxRisk(risk, 1);
    }
  }

  // --- Rate limit (in-memory) ---
  const rateKey = `${input.provider?.id ?? "unknown"}:${input.tx.from.toLowerCase()}`;
  const nowMs = now.getTime();
  const windowStart = nowMs - RATE_LIMIT_WINDOW_MS;
  const arr = recentRequests.get(rateKey) ?? [];
  const pruned = arr.filter((t) => t >= windowStart);
  pruned.push(nowMs);
  recentRequests.set(rateKey, pruned);

  if (pruned.length > RATE_LIMIT_MAX) {
    risk = maxRisk(risk, 3);
    hardReject = true;
    reasons.push("Rate limit exceeded");
    warnings.push(`Too many requests in ${RATE_LIMIT_WINDOW_MS / 1000}s window`);
  } else if (pruned.length > Math.floor(RATE_LIMIT_MAX * 0.8)) {
    risk = maxRisk(risk, 2);
    warnings.push("Approaching rate limit");
  }

  // --- Budget check (in-memory daily) ---
  const dk = `${dayKey(now)}:${input.tx.from.toLowerCase()}`;
  const spent = dailySpend.get(dk) ?? 0n;
  const nextSpent = spent + txValue;
  dailySpend.set(dk, nextSpent);

  const remaining = MAX_DAILY_BUDGET > nextSpent ? MAX_DAILY_BUDGET - nextSpent : 0n;
  if (nextSpent > MAX_DAILY_BUDGET) {
    risk = maxRisk(risk, 3);
    hardReject = true;
    reasons.push("Daily budget exceeded");
    warnings.push(
      `Daily budget exceeded (spent=${nextSpent.toString()} max=${MAX_DAILY_BUDGET.toString()})`
    );
  } else if (remaining <= 10n * USDC_BASE) {
    risk = maxRisk(risk, 2);
    warnings.push(`Budget running low (remaining=${remaining.toString()})`);
  }

  // --- Repository-backed policies ---
  try {
    const policies = await policyRepository.findAll();
    for (const policy of policies) {
      if (!policy.enabled) continue;
      const state: { risk: 1 | 2 | 3; hardReject: boolean } = { risk, hardReject };
      enforceSpendingLimitPolicy(policy, txValue, matchedPolicyIds, reasons, warnings, state);
      enforceProtocolAllowlistPolicy(
        policy,
        input.tx.to,
        matchedPolicyIds,
        reasons,
        warnings,
        state
      );
      risk = state.risk;
      hardReject = state.hardReject;
      // NOTE: Other policy types are intentionally ignored in this demo firewall.
    }
  } catch (err) {
    // Fail closed? For demo, fail to WARNING but do not hard reject on policy load failure.
    risk = maxRisk(risk, 2);
    warnings.push("Failed to load policies - proceeding with caution");
    reasons.push("Policy repository unavailable");
    console.error("Firewall policy load failed:", err);
  }

  const decision = decisionFrom(risk, hardReject);
  if (decision === "APPROVED" && reasons.length === 0) reasons.push("No issues detected");

  return {
    decision,
    riskLevel: risk,
    reasons,
    warnings,
    matchedPolicyIds,
    meta: {
      budgetRemainingWei: remaining.toString(),
      trustScore: input.provider?.trustScore,
      rateLimit: {
        windowSeconds: RATE_LIMIT_WINDOW_MS / 1000,
        max: RATE_LIMIT_MAX,
        current: pruned.length,
      },
    },
  };
}
