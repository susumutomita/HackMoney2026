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

export type PolicyRow = typeof policies.$inferSelect;
export type NewPolicyRow = typeof policies.$inferInsert;
export type AnalysisResultRow = typeof analysisResults.$inferSelect;
export type NewAnalysisResultRow = typeof analysisResults.$inferInsert;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;
