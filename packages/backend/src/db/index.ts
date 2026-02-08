import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Database configuration
 * Uses SQLite for development, can be migrated to PostgreSQL for production
 */
const DB_PATH = process.env.DATABASE_PATH || "./data/zerokey.db";

// Ensure data directory exists
const dataDir = dirname(DB_PATH);
if (dataDir && dataDir !== "." && !existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Create SQLite connection
const sqlite = new Database(DB_PATH);

// Avoid transient SQLITE_BUSY in CI/parallel test runners
sqlite.pragma("busy_timeout = 5000");

// Enable WAL mode for better concurrent performance
sqlite.pragma("journal_mode = WAL");

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

/**
 * SQL statements for table creation
 * Using parameterized statements for safety
 */
const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    services TEXT NOT NULL,
    price_per_unit TEXT NOT NULL,
    unit TEXT NOT NULL,
    trust_score INTEGER NOT NULL DEFAULT 50,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    wallet_address TEXT,
    ens_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS negotiations (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    service TEXT NOT NULL,
    status TEXT NOT NULL,
    initial_offer TEXT NOT NULL,
    final_price TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS policies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS analysis_results (
    id TEXT PRIMARY KEY,
    tx_hash TEXT NOT NULL UNIQUE,
    chain_id INTEGER NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    to_label TEXT,
    value TEXT NOT NULL,
    data TEXT,
    risk_level INTEGER NOT NULL,
    classification TEXT NOT NULL,
    approved INTEGER NOT NULL,
    reason TEXT NOT NULL,
    warnings TEXT NOT NULL,
    recommendations TEXT NOT NULL,
    analyzed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    tx_hash TEXT NOT NULL,
    decision TEXT NOT NULL,
    risk_level INTEGER NOT NULL,
    reason TEXT NOT NULL,
    policy_ids TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversation_sessions (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversation_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    idempotency_key TEXT,
    type TEXT NOT NULL,
    actor_kind TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    ts INTEGER NOT NULL,
    payload TEXT NOT NULL,
    accepted INTEGER NOT NULL,
    error TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    tx_hash TEXT NOT NULL UNIQUE,
    chain_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    payer TEXT NOT NULL,
    recipient TEXT NOT NULL,
    amount_usdc TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    provider_name TEXT,
    firewall_decision TEXT NOT NULL,
    firewall_reason TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS firewall_events (
    id TEXT PRIMARY KEY,
    provider_id TEXT,
    provider_name TEXT,
    decision TEXT NOT NULL,
    reason TEXT NOT NULL,
    attempted_recipient TEXT,
    amount_usdc TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_analysis_tx_hash ON analysis_results(tx_hash);
  CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);
  CREATE INDEX IF NOT EXISTS idx_firewall_events_created_at ON firewall_events(created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_tx_hash ON audit_logs(tx_hash);
  CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_providers_services ON providers(services);
  CREATE INDEX IF NOT EXISTS idx_negotiations_status ON negotiations(status);

  CREATE INDEX IF NOT EXISTS idx_conv_session_state ON conversation_sessions(state);
  CREATE INDEX IF NOT EXISTS idx_conv_events_session ON conversation_events(session_id);
  CREATE INDEX IF NOT EXISTS idx_conv_events_idem ON conversation_events(session_id, idempotency_key);

  CREATE TABLE IF NOT EXISTS protected_wallets (
    id TEXT PRIMARY KEY,
    safe_address TEXT NOT NULL UNIQUE,
    owner_address TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    guard_address TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wallet_policies (
    id TEXT PRIMARY KEY,
    safe_address TEXT NOT NULL UNIQUE,
    max_transaction_usdc TEXT NOT NULL DEFAULT '100',
    require_human_approval_above_usdc TEXT NOT NULL DEFAULT '50',
    blocked_recipients TEXT NOT NULL DEFAULT '[]',
    trusted_recipients TEXT NOT NULL DEFAULT '[]',
    min_trust_score INTEGER NOT NULL DEFAULT 20,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pending_approvals (
    id TEXT PRIMARY KEY,
    safe_address TEXT NOT NULL,
    tx_hash TEXT,
    "to" TEXT NOT NULL,
    value TEXT NOT NULL,
    data TEXT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    decided_at TEXT
  );

  CREATE TABLE IF NOT EXISTS guard_registrations (
    id TEXT PRIMARY KEY,
    safe_address TEXT NOT NULL UNIQUE,
    chain_id INTEGER NOT NULL,
    owner_address TEXT NOT NULL,
    guard_contract_address TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_protected_wallets_safe ON protected_wallets(safe_address);
  CREATE INDEX IF NOT EXISTS idx_wallet_policies_safe ON wallet_policies(safe_address);
  CREATE INDEX IF NOT EXISTS idx_pending_approvals_safe ON pending_approvals(safe_address);
  CREATE INDEX IF NOT EXISTS idx_guard_registrations_safe ON guard_registrations(safe_address);
`;

/**
 * Demo providers for the marketplace
 * Including wallet addresses for ENS integration demonstration
 */
/**
 * Demo provider addresses:
 * - Project EOA: 0x7aD8317e9aB4837AEF734e23d1C62F4938a6D950
 * - Provider wallet: 0xae0D06961f7103B43ed93721d5a2644c09EB159C
 * These are project-owned testnet addresses, NOT famous people's wallets.
 */
const DEMO_PROVIDERS = [
  {
    id: "translate-ai-001",
    name: "TranslateAI Pro",
    endpoint: "https://api.translateai.example/v1",
    services: JSON.stringify(["translation", "localization"]),
    price_per_unit: "0.03",
    unit: "1000 tokens",
    trust_score: 85,
    total_transactions: 1250,
    is_active: 1,
    // Project-owned provider wallet (Base Sepolia)
    wallet_address: "0xae0D06961f7103B43ed93721d5a2644c09EB159C",
    ens_name: null,
  },
  {
    id: "summarize-bot-001",
    name: "SummarizeBot",
    endpoint: "https://api.summarizebot.example/v1",
    services: JSON.stringify(["summarization", "extraction"]),
    price_per_unit: "0.02",
    unit: "page",
    trust_score: 78,
    total_transactions: 890,
    is_active: 1,
    // Project EOA address
    wallet_address: "0x7aD8317e9aB4837AEF734e23d1C62F4938a6D950",
    ens_name: null,
  },
  {
    id: "sketchy-service-001",
    name: "CheapTranslate",
    endpoint: "https://cheap-translate.example/api",
    services: JSON.stringify(["translation"]),
    price_per_unit: "0.005",
    unit: "1000 tokens",
    trust_score: 15,
    total_transactions: 3,
    is_active: 1,
    // Sketchy provider - intentionally suspicious address
    wallet_address: "0x0000000000000000000000000000000000000001",
    ens_name: null,
  },
  {
    id: "image-pack-001",
    name: "ImagePack",
    endpoint: "internal://image-pack",
    services: JSON.stringify(["image"]),
    price_per_unit: "0.01",
    unit: "image",
    trust_score: 92,
    total_transactions: 420,
    is_active: 1,
    // Project-owned provider wallet
    wallet_address: "0xae0D06961f7103B43ed93721d5a2644c09EB159C",
    ens_name: null,
  },
  {
    id: "unverified-service-001",
    name: "UnverifiedPay",
    endpoint: "https://unverified-pay.example/api",
    services: JSON.stringify(["payments"]),
    price_per_unit: "0.02",
    unit: "request",
    trust_score: 70,
    total_transactions: 12,
    is_active: 1,
    // Intentionally NOT in provider registry: triggers CONFIRM_REQUIRED
    wallet_address: "0x000000000000000000000000000000000000bEEF",
    ens_name: null,
  },
];

/**
 * Initialize database tables
 * Creates tables if they don't exist
 */
function ensureColumn(table: string, column: string, ddl: string): void {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  const has = cols.some((c) => c.name === column);
  if (!has) {
    sqlite.exec(ddl);
    console.warn(`DB migration: added ${table}.${column}`);
  }
}

export function initializeDatabase(): void {
  // Run DDL statements using better-sqlite3's exec method (not child_process.exec)
  sqlite.exec(CREATE_TABLES_SQL);

  // Lightweight migrations for additive schema changes
  ensureColumn(
    "analysis_results",
    "to_label",
    "ALTER TABLE analysis_results ADD COLUMN to_label TEXT"
  );

  console.log(`Database initialized at ${DB_PATH}`);

  // Add new columns for ENS support
  ensureColumn(
    "providers",
    "wallet_address",
    "ALTER TABLE providers ADD COLUMN wallet_address TEXT"
  );
  ensureColumn("providers", "ens_name", "ALTER TABLE providers ADD COLUMN ens_name TEXT");

  const now = new Date().toISOString();

  // Seed demo providers idempotently.
  // CI/tests may initialize the DB multiple times; INSERT OR IGNORE prevents UNIQUE violations.
  const insert = sqlite.prepare(`
      INSERT OR IGNORE INTO providers (id, name, endpoint, services, price_per_unit, unit, trust_score, total_transactions, is_active, wallet_address, ens_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  for (const provider of DEMO_PROVIDERS) {
    insert.run(
      provider.id,
      provider.name,
      provider.endpoint,
      provider.services,
      provider.price_per_unit,
      provider.unit,
      provider.trust_score,
      provider.total_transactions,
      provider.is_active,
      provider.wallet_address,
      provider.ens_name,
      now,
      now
    );
  }

  // Ensure existing providers get wallet/ENS metadata.
  const update = sqlite.prepare(`
      UPDATE providers SET wallet_address = ?, ens_name = ? WHERE id = ? AND wallet_address IS NULL
    `);
  for (const provider of DEMO_PROVIDERS) {
    update.run(provider.wallet_address, provider.ens_name, provider.id);
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  sqlite.close();
}

export { schema };
