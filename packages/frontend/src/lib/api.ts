/**
 * ZeroKey Backend API Client
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Transaction input for analysis
 */
export interface TransactionInput {
  chainId: number;
  from: string;
  /** Destination address (resolved if user entered ENS). */
  to: string;
  /** Optional human-friendly label (e.g. vitalik.eth). */
  toLabel?: string;
  value: string;
  data?: string;
}

/**
 * Analysis result from backend
 */
export interface AnalysisResult {
  riskLevel: 1 | 2 | 3;
  classification: string;
  approved: boolean;
  reason: string;
  warnings: string[];
  recommendations: string[];
  timestamp: string;
  txHash: string;
}

/**
 * Stored analysis result with transaction details
 */
export interface StoredAnalysisResult {
  id: string;
  txHash: string;
  transaction: TransactionInput;
  analysis: {
    riskLevel: 1 | 2 | 3;
    classification: string;
    approved: boolean;
    reason: string;
    warnings: string[];
    recommendations: string[];
    timestamp: string;
  };
  analyzedAt: string;
}

/**
 * Policy configuration types
 */
export type PolicyConfig =
  | {
      type: "spending_limit";
      maxAmountWei: string;
      period: "per_transaction" | "daily" | "weekly" | "monthly";
      tokenAddress?: string;
    }
  | {
      type: "protocol_allowlist";
      allowedAddresses: string[];
      allowUnknown: boolean;
    }
  | {
      type: "kyc_requirement";
      requiredLevel: "basic" | "advanced" | "full";
      thresholdWei: string;
    }
  | {
      type: "time_restriction";
      allowedDays: number[];
      allowedHoursUtc: { start: number; end: number };
    }
  | {
      type: "trust_score_threshold";
      minScore: number;
      action: "reject" | "confirm_required";
    }
  | {
      type: "ens_required";
      requireEns: boolean;
    }
  | {
      type: "category_restriction";
      allowedCategories: string[];
      blockUnknown: boolean;
    };

/**
 * Policy definition
 */
export interface Policy {
  id: string;
  name: string;
  config: PolicyConfig;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * API Error
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Fetch wrapper with error handling
 */
async function fetchApi<T>(endpoint: string, options?: globalThis.RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new ApiError(response.status, error.message || error.error || "Request failed");
  }

  return response.json();
}

/**
 * Analyze API
 */
export const analyzeApi = {
  /**
   * Analyze a transaction
   */
  analyzeTransaction: (transaction: TransactionInput): Promise<AnalysisResult> =>
    fetchApi("/api/analyze/transaction", {
      method: "POST",
      body: JSON.stringify(transaction),
    }),

  /**
   * Get analysis status by transaction hash
   */
  getStatus: (txHash: string): Promise<StoredAnalysisResult> =>
    fetchApi(`/api/analyze/status/${txHash}`),

  /**
   * Get recent analysis results
   */
  getRecent: (limit = 20): Promise<{ results: StoredAnalysisResult[] }> =>
    fetchApi(`/api/analyze/recent?limit=${limit}`),
};

/**
 * Policy API
 */
export const policyApi = {
  /**
   * Get all policies
   */
  getAll: (): Promise<{ policies: Policy[] }> => fetchApi("/api/policy"),

  /**
   * Get policy by ID
   */
  getById: (id: string): Promise<Policy> => fetchApi(`/api/policy/${id}`),

  /**
   * Create a new policy
   */
  create: (policy: Omit<Policy, "id" | "createdAt" | "updatedAt">): Promise<Policy> =>
    fetchApi("/api/policy", {
      method: "POST",
      body: JSON.stringify(policy),
    }),

  /**
   * Update a policy
   */
  update: (id: string, policy: Omit<Policy, "id" | "createdAt" | "updatedAt">): Promise<Policy> =>
    fetchApi(`/api/policy/${id}`, {
      method: "PUT",
      body: JSON.stringify(policy),
    }),

  /**
   * Delete a policy
   */
  delete: (id: string): Promise<{ success: boolean }> =>
    fetchApi(`/api/policy/${id}`, {
      method: "DELETE",
    }),
};

/**
 * Agent info returned from the backend
 */
export interface AgentInfo {
  id: string;
  name: string;
  apiKeyPrefix: string;
  safeAddress: string;
  allowedCategories: string[];
  dailyBudgetUsd: string;
  spentTodayUsd: string;
  enabled: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

/**
 * Agents API
 */
export const agentsApi = {
  list: (safeAddress: string) =>
    fetchApi<{ agents: AgentInfo[] }>(`/api/agents?safe=${safeAddress}`),

  create: (params: {
    name: string;
    safeAddress: string;
    allowedCategories?: string[];
    dailyBudgetUsd?: string;
  }) =>
    fetchApi<{ success: true; agent: AgentInfo; apiKey: string }>("/api/agents", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  delete: (id: string) => fetchApi<{ success: boolean }>(`/api/agents/${id}`, { method: "DELETE" }),

  rotateKey: (id: string) =>
    fetchApi<{ apiKey: string; apiKeyPrefix: string }>(`/api/agents/${id}/rotate-key`, {
      method: "POST",
    }),
};

/**
 * Health API
 */
export const healthApi = {
  /**
   * Check backend health
   */
  check: (): Promise<{ status: string; timestamp: string; version: string }> => fetchApi("/health"),
};
