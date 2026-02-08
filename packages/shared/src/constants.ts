import type { ChainConfig } from "./types.js";

/**
 * Supported chains configuration
 * Includes Arc Network for HackMoney 2026 Arc Prize integration
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
  // Arc Network - Circle's L1 for global USDC payments
  // See: https://docs.arc.network/arc/concepts/welcome-to-arc
  411: {
    id: 411,
    name: "Arc",
    rpcUrl: "https://rpc.arc.network",
    blockExplorer: "https://explorer.arc.network",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  // Arc Testnet for development
  412: {
    id: 412,
    name: "Arc Testnet",
    rpcUrl: "https://rpc-testnet.arc.network",
    blockExplorer: "https://explorer-testnet.arc.network",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
} as const;

/**
 * Circle Gateway configuration
 * Routes USDC cross-chain using Arc as the liquidity hub
 */
export const GATEWAY_CONFIG = {
  /** Gateway Wallet contract (deposit USDC here) */
  walletContract: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9" as const,
  /** Gateway Minter contract (mint USDC on destination) */
  minterContract: "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B" as const,
  /** Gateway API (testnet) */
  apiUrl: "https://gateway-api-testnet.circle.com" as const,
  /** Supported domains with USDC addresses */
  domains: {
    ethereumSepolia: { domainId: 0, usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const },
    avalancheFuji: { domainId: 1, usdc: "0x5425890298aed601595a70ab815c96711a31bc65" as const },
    baseSepolia: { domainId: 6, usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const },
    arcTestnet: { domainId: 26, usdc: "0x3600000000000000000000000000000000000000" as const },
  },
} as const;

/**
 * Arc Network specific configuration
 * Arc is Circle's purpose-built L1 - the Economic OS for the internet
 */
export const ARC_CONFIG = {
  /** Arc mainnet chain ID */
  chainId: 411,
  /** Arc testnet chain ID */
  testnetChainId: 412,
  /** Native USDC on Arc Testnet (Gateway domain 26) */
  usdcAddress: "0x3600000000000000000000000000000000000000" as const,
  /** Gateway domain ID for Arc */
  gatewayDomainId: 26,
  /** Default gas settings for Arc */
  defaultGas: {
    maxFeePerGas: "1000000000", // 1 gwei
    maxPriorityFeePerGas: "100000000", // 0.1 gwei
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
