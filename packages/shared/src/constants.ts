import type { ChainConfig } from "./types.js";

/**
 * Supported chains configuration
 */
export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  1: {
    id: 1,
    name: "Ethereum",
    rpcUrl: "https://eth.llamarpc.com",
    blockExplorer: "https://etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  8453: {
    id: 8453,
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  84532: {
    id: 84532,
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  10: {
    id: 10,
    name: "Optimism",
    rpcUrl: "https://mainnet.optimism.io",
    blockExplorer: "https://optimistic.etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  11155420: {
    id: 11155420,
    name: "Optimism Sepolia",
    rpcUrl: "https://sepolia.optimism.io",
    blockExplorer: "https://sepolia-optimism.etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
} as const;

/**
 * Default policy thresholds
 */
export const DEFAULT_THRESHOLDS = {
  /** Maximum single transaction value in USD */
  maxSingleTransactionUsd: 10000,
  /** Maximum daily spending in USD */
  maxDailySpendingUsd: 50000,
  /** Number of approvals required for high-risk transactions */
  highRiskApprovers: 2,
  /** Cooldown period between large transactions (in seconds) */
  largeTransactionCooldown: 3600,
} as const;

/**
 * Contract addresses (to be filled after deployment)
 */
export const CONTRACT_ADDRESSES: Record<number, { guard?: `0x${string}` }> = {
  84532: {
    guard: undefined, // Base Sepolia
  },
  11155420: {
    guard: undefined, // Optimism Sepolia
  },
} as const;
