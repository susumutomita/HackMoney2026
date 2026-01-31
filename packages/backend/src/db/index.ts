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

// Enable WAL mode for better concurrent performance
sqlite.pragma("journal_mode = WAL");

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

/**
 * SQL statements for table creation
 * Using parameterized statements for safety
 */
const CREATE_TABLES_SQL = `
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

  CREATE INDEX IF NOT EXISTS idx_analysis_tx_hash ON analysis_results(tx_hash);
  CREATE INDEX IF NOT EXISTS idx_audit_tx_hash ON audit_logs(tx_hash);
  CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
`;

/**
 * Initialize database tables
 * Creates tables if they don't exist
 */
export function initializeDatabase(): void {
  // Run DDL statements using better-sqlite3's exec method (not child_process.exec)
  sqlite.exec(CREATE_TABLES_SQL);
  console.log(`Database initialized at ${DB_PATH}`);
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  sqlite.close();
}

export { schema };
