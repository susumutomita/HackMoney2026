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
