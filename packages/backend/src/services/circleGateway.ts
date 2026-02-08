/**
 * Circle Gateway / CCTP Configuration
 *
 * Provides Circle configuration status and chain metadata.
 * Transfer logic is now in gateway.ts (real BurnIntent signing).
 */

import { config } from "../config.js";

export class CircleGatewayError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "CircleGatewayError";
  }
}

// Supported chains for CCTP
export const CCTP_CHAINS = {
  ETH_SEPOLIA: { id: 0, name: "ETH-SEPOLIA", chainId: 11155111 },
  BASE_SEPOLIA: { id: 6, name: "BASE-SEPOLIA", chainId: 84532 },
  ARC_TESTNET: { id: 26, name: "ARC-TESTNET", chainId: 412 },
} as const;

// USDC addresses per chain
export const USDC_ADDRESSES: Record<number, string> = {
  11155111: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // ETH Sepolia
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia
  412: "0x3600000000000000000000000000000000000000", // Arc Testnet
};

/**
 * Check if Circle Gateway is configured
 */
export function isGatewayConfigured(): boolean {
  return !!config.circleApiKey;
}

/**
 * Get Gateway configuration status
 */
export function getGatewayStatus(): {
  configured: boolean;
  environment: string;
  supportedChains: string[];
} {
  return {
    configured: isGatewayConfigured(),
    environment: config.circleEnv || "sandbox",
    supportedChains: Object.values(CCTP_CHAINS).map((c) => c.name),
  };
}
