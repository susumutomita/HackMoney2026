/**
 * Circle Gateway / CCTP Service
 * Enables crosschain USDC transfers using Arc as Liquidity Hub
 *
 * Arc is Circle's L1 blockchain that serves as the economic hub for USDC.
 * This service uses Circle's Crosschain Transfer Protocol (CCTP) to route
 * payments through Arc, enabling chain-abstracted USDC transfers.
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

// Circle API base URLs
const API_BASE_URLS = {
  sandbox: "https://api-sandbox.circle.com",
  production: "https://api.circle.com",
} as const;

// Supported chains for CCTP
export const CCTP_CHAINS = {
  // Testnets
  ETH_SEPOLIA: { id: 0, name: "ETH-SEPOLIA", chainId: 11155111 },
  BASE_SEPOLIA: { id: 6, name: "BASE-SEPOLIA", chainId: 84532 },
  ARB_SEPOLIA: { id: 3, name: "ARB-SEPOLIA", chainId: 421614 },
  // Arc (when available - using testnet placeholder)
  ARC_TESTNET: { id: 99, name: "ARC-TESTNET", chainId: 0 }, // TBD
} as const;

// USDC addresses per chain
export const USDC_ADDRESSES: Record<number, string> = {
  11155111: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // ETH Sepolia
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia
  421614: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // Arb Sepolia
};

function getBaseUrl(): string {
  return API_BASE_URLS[config.circleEnv || "sandbox"];
}

type FetchInit = Parameters<typeof fetch>[1];

async function circleFetch<T>(path: string, init: FetchInit = {}): Promise<T> {
  const apiKey = config.circleApiKey;
  if (!apiKey) {
    throw new CircleGatewayError("Missing CIRCLE_API_KEY. Add it to packages/backend/.env");
  }

  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // keep as text
  }

  if (!res.ok) {
    throw new CircleGatewayError(
      `Circle API error: ${res.status} ${res.statusText}`,
      res.status,
      body
    );
  }

  return body as T;
}

// ============================================
// Crosschain Transfer Types
// ============================================

export interface CrosschainTransferRequest {
  idempotencyKey: string;
  source: {
    type: "wallet";
    id: string;
  };
  destination: {
    type: "blockchain";
    address: string;
    chain: string; // e.g., "BASE-SEPOLIA"
  };
  amount: {
    amount: string;
    currency: "USD";
  };
}

export interface CrosschainTransferResponse {
  data: {
    id: string;
    source: {
      type: string;
      id: string;
      chain?: string;
    };
    destination: {
      type: string;
      address: string;
      chain: string;
    };
    amount: {
      amount: string;
      currency: string;
    };
    status: "pending" | "complete" | "failed";
    transactionHash?: string;
    createDate: string;
    updateDate: string;
  };
}

// ============================================
// Gateway Transfer (for Arc Liquidity Hub)
// ============================================

export interface GatewayTransferRequest {
  /** Unique identifier for idempotency */
  idempotencyKey: string;
  /** Source chain (where USDC originates) */
  sourceChain: string;
  /** Source address (the payer) */
  sourceAddress: string;
  /** Destination chain (where USDC goes) */
  destinationChain: string;
  /** Destination address (the recipient) */
  destinationAddress: string;
  /** Amount in USDC (e.g., "10.50") */
  amount: string;
}

export interface GatewayTransferResult {
  /** Gateway transfer ID */
  transferId: string;
  /** Current status */
  status: "pending" | "processing" | "complete" | "failed";
  /** Source chain */
  sourceChain: string;
  /** Destination chain */
  destinationChain: string;
  /** Amount transferred */
  amount: string;
  /** Transaction hash on source chain (burn) */
  sourceTxHash?: string;
  /** Transaction hash on destination chain (mint) */
  destinationTxHash?: string;
  /** Arc routing info (for demo) */
  arcRouting?: {
    used: boolean;
    hubChain: string;
    note: string;
  };
  /** Timestamps */
  createdAt: string;
  updatedAt: string;
}

// In-memory store for demo transfers
const demoTransfers: Map<string, GatewayTransferResult> = new Map();

/**
 * Create a crosschain transfer using Circle Gateway
 * Routes through Arc as the liquidity hub
 */
export async function createGatewayTransfer(
  request: GatewayTransferRequest
): Promise<GatewayTransferResult> {
  // For hackathon demo, we simulate the Gateway transfer
  // In production, this would call Circle's actual CCTP API

  const transferId = `gw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  const result: GatewayTransferResult = {
    transferId,
    status: "pending",
    sourceChain: request.sourceChain,
    destinationChain: request.destinationChain,
    amount: request.amount,
    arcRouting: {
      used: true,
      hubChain: "Arc",
      note: "USDC routed through Arc Liquidity Hub via CCTP",
    },
    createdAt: now,
    updatedAt: now,
  };

  demoTransfers.set(transferId, result);

  // Simulate async processing
  setTimeout(() => {
    const transfer = demoTransfers.get(transferId);
    if (transfer) {
      transfer.status = "processing";
      transfer.sourceTxHash = `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
      transfer.updatedAt = new Date().toISOString();
    }
  }, 1000);

  setTimeout(() => {
    const transfer = demoTransfers.get(transferId);
    if (transfer) {
      transfer.status = "complete";
      transfer.destinationTxHash = `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
      transfer.updatedAt = new Date().toISOString();
    }
  }, 3000);

  return result;
}

/**
 * Get transfer status
 */
export async function getGatewayTransfer(
  transferId: string
): Promise<GatewayTransferResult | null> {
  return demoTransfers.get(transferId) || null;
}

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

// ============================================
// Actual Circle API calls (for production)
// ============================================

/**
 * Get wallet balances from Circle API
 */
export async function getWalletBalances(walletId: string) {
  return circleFetch(`/v1/wallets/${walletId}/balances`, {
    method: "GET",
  });
}

/**
 * Create a CCTP transfer (production)
 * This would be used when Circle's CCTP API is available
 */
export async function createCCTPTransfer(
  request: CrosschainTransferRequest
): Promise<CrosschainTransferResponse> {
  return circleFetch<CrosschainTransferResponse>("/v1/transfers", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Get transfer status from Circle API
 */
export async function getCCTPTransfer(transferId: string): Promise<CrosschainTransferResponse> {
  return circleFetch<CrosschainTransferResponse>(`/v1/transfers/${transferId}`, { method: "GET" });
}
