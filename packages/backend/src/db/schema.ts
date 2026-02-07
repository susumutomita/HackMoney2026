import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Policies table
 * Stores policy configurations with JSON-encoded config field
 */
export const policies = sqliteTable("policies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  config: text("config", { mode: "json" }).notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Analysis results table
 * Stores transaction analysis results for status lookup
 */
export const analysisResults = sqliteTable("analysis_results", {
  id: text("id").primaryKey(),
  txHash: text("tx_hash").notNull().unique(),
  chainId: integer("chain_id").notNull(),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  toLabel: text("to_label"),
  value: text("value").notNull(),
  data: text("data"),
  riskLevel: integer("risk_level").notNull(),
  classification: text("classification").notNull(),
  approved: integer("approved", { mode: "boolean" }).notNull(),
  reason: text("reason").notNull(),
  warnings: text("warnings", { mode: "json" }).$type<string[]>().notNull(),
  recommendations: text("recommendations", { mode: "json" }).$type<string[]>().notNull(),
  analyzedAt: text("analyzed_at").notNull(),
});

/**
 * Audit log table
 * Stores decision audit trail for compliance
 */
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  txHash: text("tx_hash").notNull(),
  decision: text("decision").notNull(), // 'approved' | 'rejected'
  riskLevel: integer("risk_level").notNull(),
  reason: text("reason").notNull(),
  policyIds: text("policy_ids", { mode: "json" }).$type<string[]>().notNull(),
  timestamp: text("timestamp").notNull(),
});

/**
 * Providers table
 * Stores API service providers in the marketplace
 * Supports ENS integration for decentralized identity
 */
export const providers = sqliteTable("providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  endpoint: text("endpoint").notNull(),
  services: text("services", { mode: "json" }).$type<string[]>().notNull(),
  pricePerUnit: text("price_per_unit").notNull(), // USDC amount as string
  unit: text("unit").notNull(), // e.g., "1000 tokens", "page", "request"
  trustScore: integer("trust_score").notNull().default(50),
  totalTransactions: integer("total_transactions").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  /** Wallet address for ENS lookup and payments */
  walletAddress: text("wallet_address"),
  /** ENS name if registered (e.g., translateai.eth) */
  ensName: text("ens_name"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Negotiations table
 * Stores A2A negotiation sessions
 */
export const negotiations = sqliteTable("negotiations", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  providerId: text("provider_id").notNull(),
  service: text("service").notNull(),
  status: text("status").notNull(), // 'pending' | 'negotiating' | 'agreed' | 'rejected' | 'expired'
  initialOffer: text("initial_offer").notNull(),
  finalPrice: text("final_price"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});

/**
 * Conversation sessions table
 * Stores state machine + idempotency for the strict chat interface.
 */
export const conversationSessions = sqliteTable("conversation_sessions", {
  id: text("id").primaryKey(),
  state: text("state").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Conversation events table
 * Full audit trail of inbound/outbound messages.
 */
export const conversationEvents = sqliteTable("conversation_events", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  idempotencyKey: text("idempotency_key"),
  type: text("type").notNull(),
  actorKind: text("actor_kind").notNull(),
  actorId: text("actor_id").notNull(),
  ts: integer("ts").notNull(),
  payload: text("payload", { mode: "json" }).notNull(),
  accepted: integer("accepted", { mode: "boolean" }).notNull(),
  error: text("error"),
  createdAt: text("created_at").notNull(),
});

/**
 * Purchases table
 * Stores proof that an agent paid for a service (for demo + audit).
 */
export const purchases = sqliteTable("purchases", {
  id: text("id").primaryKey(),
  txHash: text("tx_hash").notNull().unique(),
  chainId: integer("chain_id").notNull(),
  token: text("token").notNull(),
  payer: text("payer").notNull(),
  recipient: text("recipient").notNull(),
  amountUsdc: text("amount_usdc").notNull(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name"),
  firewallDecision: text("firewall_decision").notNull(),
  firewallReason: text("firewall_reason").notNull(),
  createdAt: text("created_at").notNull(),
});

/**
 * Firewall events table
 * Stores blocked-before-payment events (no txHash because money never moved).
 */
export const firewallEvents = sqliteTable("firewall_events", {
  id: text("id").primaryKey(),
  providerId: text("provider_id"),
  providerName: text("provider_name"),
  decision: text("decision").notNull(), // 'APPROVED' | 'CONFIRM_REQUIRED' | 'REJECTED'
  reason: text("reason").notNull(),
  attemptedRecipient: text("attempted_recipient"),
  amountUsdc: text("amount_usdc"),
  createdAt: text("created_at").notNull(),
});

export type PolicyRow = typeof policies.$inferSelect;
export type NewPolicyRow = typeof policies.$inferInsert;
export type AnalysisResultRow = typeof analysisResults.$inferSelect;
export type NewAnalysisResultRow = typeof analysisResults.$inferInsert;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;
export type ProviderRow = typeof providers.$inferSelect;
export type NewProviderRow = typeof providers.$inferInsert;
export type NegotiationRow = typeof negotiations.$inferSelect;
export type NewNegotiationRow = typeof negotiations.$inferInsert;
export type ConversationSessionRow = typeof conversationSessions.$inferSelect;
export type NewConversationSessionRow = typeof conversationSessions.$inferInsert;
export type ConversationEventRow = typeof conversationEvents.$inferSelect;
export type NewConversationEventRow = typeof conversationEvents.$inferInsert;
export type PurchaseRow = typeof purchases.$inferSelect;
export type NewPurchaseRow = typeof purchases.$inferInsert;
export type FirewallEventRow = typeof firewallEvents.$inferSelect;
export type NewFirewallEventRow = typeof firewallEvents.$inferInsert;

/**
 * Protected wallets table
 * Stores Safe wallets protected by ZeroKey Guard
 */
export const protectedWallets = sqliteTable("protected_wallets", {
  id: text("id").primaryKey(),
  safeAddress: text("safe_address").notNull().unique(),
  ownerAddress: text("owner_address").notNull(),
  chainId: integer("chain_id").notNull(),
  guardAddress: text("guard_address").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Wallet policies table
 * Stores policy settings for each protected wallet
 */
export const walletPolicies = sqliteTable("wallet_policies", {
  id: text("id").primaryKey(),
  safeAddress: text("safe_address").notNull().unique(),
  maxTransactionUsdc: text("max_transaction_usdc").notNull().default("100"),
  requireHumanApprovalAboveUsdc: text("require_human_approval_above_usdc").notNull().default("50"),
  blockedRecipients: text("blocked_recipients").notNull().default("[]"),
  trustedRecipients: text("trusted_recipients").notNull().default("[]"),
  minTrustScore: integer("min_trust_score").notNull().default(20),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Pending approvals table
 * Stores transactions requiring human approval
 */
export const pendingApprovals = sqliteTable("pending_approvals", {
  id: text("id").primaryKey(),
  safeAddress: text("safe_address").notNull(),
  txHash: text("tx_hash"),
  to: text("to").notNull(),
  value: text("value").notNull(),
  data: text("data"),
  reason: text("reason").notNull(),
  status: text("status").notNull(), // 'pending' | 'approved' | 'rejected'
  createdAt: text("created_at").notNull(),
  decidedAt: text("decided_at"),
});

export type ProtectedWalletRow = typeof protectedWallets.$inferSelect;
export type NewProtectedWalletRow = typeof protectedWallets.$inferInsert;
export type WalletPolicyRow = typeof walletPolicies.$inferSelect;
export type NewWalletPolicyRow = typeof walletPolicies.$inferInsert;
export type PendingApprovalRow = typeof pendingApprovals.$inferSelect;
export type NewPendingApprovalRow = typeof pendingApprovals.$inferInsert;
