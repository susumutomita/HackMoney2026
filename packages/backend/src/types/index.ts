export interface TransactionInput {
  chainId: number;
  from: string;
  /** Destination address (resolved if the user entered ENS). */
  to: string;
  /** Optional human-friendly label for destination (e.g. vitalik.eth). */
  toLabel?: string;
  value: string;
  data?: string;
  gasLimit?: string;
}

export interface TransactionAnalysis {
  riskLevel: 1 | 2 | 3;
  classification: string;
  approved: boolean;
  reason: string;
  warnings: string[];
  recommendations: string[];
  timestamp: string;
}

/**
 * Policy type identifiers
 */
export type PolicyType =
  | "spending_limit"
  | "protocol_allowlist"
  | "kyc_requirement"
  | "time_restriction"
  | "trust_score"
  | "require_ens"
  | "category_restriction";

/**
 * Spending limit policy configuration
 * Restricts maximum transaction value within a time period
 */
export interface SpendingLimitConfig {
  type: "spending_limit";
  maxAmountWei: string;
  period: "per_transaction" | "daily" | "weekly" | "monthly";
  tokenAddress?: string; // Optional: specific token, null = native currency
}

/**
 * Protocol allowlist policy configuration
 * Only allows interactions with approved contract addresses
 */
export interface ProtocolAllowlistConfig {
  type: "protocol_allowlist";
  allowedAddresses: string[];
  allowUnknown: boolean; // Allow transactions to addresses not in the list
}

/**
 * KYC requirement policy configuration
 * Requires KYC verification for certain transactions
 */
export interface KycRequirementConfig {
  type: "kyc_requirement";
  requiredLevel: "basic" | "advanced" | "full";
  thresholdWei: string; // KYC required above this amount
}

/**
 * Time restriction policy configuration
 * Restricts transactions to certain time windows
 */
export interface TimeRestrictionConfig {
  type: "time_restriction";
  allowedDays: number[]; // 0 = Sunday, 6 = Saturday
  allowedHoursUtc: {
    start: number; // 0-23
    end: number; // 0-23
  };
}

/**
 * Discriminated union of all policy configurations
 * Type-safe policy config that enforces correct structure per policy type
 */
export interface TrustScoreConfig {
  type: "trust_score";
  minScore: number; // 0-100
}

export interface RequireEnsConfig {
  type: "require_ens";
  required: boolean;
}

export interface CategoryRestrictionConfig {
  type: "category_restriction";
  allowed: string[];
}

export type PolicyConfig =
  | SpendingLimitConfig
  | ProtocolAllowlistConfig
  | KycRequirementConfig
  | TimeRestrictionConfig
  | TrustScoreConfig
  | RequireEnsConfig
  | CategoryRestrictionConfig;

/**
 * Policy definition with strongly-typed configuration
 */
export interface Policy {
  id: string;
  name: string;
  config: PolicyConfig;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  txHash: string;
  decision: "approved" | "rejected";
  riskLevel: number;
  reason: string;
  policyIds: string[];
}
