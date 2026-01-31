/**
 * Shared constants for the ZeroKey Treasury frontend
 */

/**
 * Human-readable chain names
 */
export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  8453: "Base",
  84532: "Base Sepolia",
  10: "Optimism",
  11155420: "Optimism Sepolia",
};

/**
 * Risk level styling classes
 */
export const RISK_COLORS: Record<1 | 2 | 3, string> = {
  1: "bg-green-100 text-green-800",
  2: "bg-yellow-100 text-yellow-800",
  3: "bg-red-100 text-red-800",
};

/**
 * Risk level with border styling (for badges)
 */
export const RISK_COLORS_WITH_BORDER: Record<1 | 2 | 3, string> = {
  1: "bg-green-100 text-green-800 border-green-200",
  2: "bg-yellow-100 text-yellow-800 border-yellow-200",
  3: "bg-red-100 text-red-800 border-red-200",
};

/**
 * Risk level display labels
 */
export const RISK_LABELS: Record<1 | 2 | 3, string> = {
  1: "LOW",
  2: "MEDIUM",
  3: "HIGH",
};

/**
 * Format an Ethereum address for display (truncated)
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format a timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}
