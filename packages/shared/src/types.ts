/**
 * Risk levels for transaction analysis
 */
export enum RiskLevel {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
}

/**
 * Transaction classification types
 */
export type TransactionClassification =
  | "transfer"
  | "swap"
  | "lending"
  | "staking"
  | "bridge"
  | "approval"
  | "unknown";

/**
 * Supported blockchain networks
 */
export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

/**
 * Transaction input for analysis
 */
export interface TransactionRequest {
  chainId: number;
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  data?: `0x${string}`;
  gasLimit?: string;
  nonce?: number;
}

/**
 * Analysis result from the policy engine
 */
export interface AnalysisResult {
  txHash: string;
  riskLevel: RiskLevel;
  classification: TransactionClassification;
  approved: boolean;
  reason: string;
  warnings: string[];
  recommendations: string[];
  timestamp: string;
  policies: PolicyMatch[];
}

/**
 * Policy match information
 */
export interface PolicyMatch {
  policyId: string;
  policyName: string;
  matched: boolean;
  action: "allow" | "block" | "warn";
}

/**
 * Treasury balance information
 */
export interface TreasuryBalance {
  chainId: number;
  address: `0x${string}`;
  native: string;
  tokens: TokenBalance[];
  lastUpdated: string;
}

/**
 * Token balance
 */
export interface TokenBalance {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  valueUsd?: string;
}
