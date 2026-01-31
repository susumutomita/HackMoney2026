import { eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, schema } from "../db/index.js";
import type { TransactionInput, TransactionAnalysis } from "../types/index.js";
import type { AnalysisResultRow, NewAnalysisResultRow } from "../db/schema.js";
import { keccak256, encodePacked } from "viem";

/**
 * Analysis Result with transaction details
 */
export interface StoredAnalysisResult {
  id: string;
  txHash: string;
  transaction: TransactionInput;
  analysis: TransactionAnalysis;
  analyzedAt: string;
}

/**
 * Analysis Result Repository
 * Handles all database operations for transaction analysis results
 */
export class AnalysisRepository {
  /**
   * Generate a deterministic hash for a transaction
   * Used as a lookup key when txHash is not available
   */
  generateTxHash(transaction: TransactionInput): string {
    const packed = encodePacked(
      ["uint256", "address", "address", "uint256"],
      [
        BigInt(transaction.chainId),
        transaction.from as `0x${string}`,
        transaction.to as `0x${string}`,
        BigInt(transaction.value),
      ]
    );
    return keccak256(packed);
  }

  /**
   * Save analysis result
   */
  async save(
    transaction: TransactionInput,
    analysis: TransactionAnalysis,
    txHash?: string
  ): Promise<StoredAnalysisResult> {
    const id = randomUUID();
    const hash = txHash || this.generateTxHash(transaction);
    const now = new Date().toISOString();

    const row: NewAnalysisResultRow = {
      id,
      txHash: hash,
      chainId: transaction.chainId,
      fromAddress: transaction.from,
      toAddress: transaction.to,
      value: transaction.value,
      data: transaction.data || null,
      riskLevel: analysis.riskLevel,
      classification: analysis.classification,
      approved: analysis.approved,
      reason: analysis.reason,
      warnings: analysis.warnings,
      recommendations: analysis.recommendations,
      analyzedAt: now,
    };

    // Use INSERT OR REPLACE to handle duplicate txHash
    await db
      .insert(schema.analysisResults)
      .values(row)
      .onConflictDoUpdate({
        target: schema.analysisResults.txHash,
        set: {
          riskLevel: row.riskLevel,
          classification: row.classification,
          approved: row.approved,
          reason: row.reason,
          warnings: row.warnings,
          recommendations: row.recommendations,
          analyzedAt: row.analyzedAt,
        },
      });

    return {
      id,
      txHash: hash,
      transaction,
      analysis,
      analyzedAt: now,
    };
  }

  /**
   * Find analysis result by transaction hash
   */
  async findByTxHash(txHash: string): Promise<StoredAnalysisResult | null> {
    const rows = await db
      .select()
      .from(schema.analysisResults)
      .where(eq(schema.analysisResults.txHash, txHash));

    const row = rows[0];
    if (!row) return null;

    return this.rowToResult(row);
  }

  /**
   * Find analysis result by transaction details
   */
  async findByTransaction(transaction: TransactionInput): Promise<StoredAnalysisResult | null> {
    const txHash = this.generateTxHash(transaction);
    return this.findByTxHash(txHash);
  }

  /**
   * Get recent analysis results
   */
  async findRecent(limit: number = 20): Promise<StoredAnalysisResult[]> {
    const rows = await db
      .select()
      .from(schema.analysisResults)
      .orderBy(desc(schema.analysisResults.analyzedAt))
      .limit(limit);

    return rows.map((row) => this.rowToResult(row));
  }

  /**
   * Convert database row to StoredAnalysisResult
   */
  private rowToResult(row: AnalysisResultRow): StoredAnalysisResult {
    return {
      id: row.id,
      txHash: row.txHash,
      transaction: {
        chainId: row.chainId,
        from: row.fromAddress,
        to: row.toAddress,
        value: row.value,
        data: row.data || undefined,
      },
      analysis: {
        riskLevel: row.riskLevel as 1 | 2 | 3,
        classification: row.classification,
        approved: row.approved,
        reason: row.reason,
        warnings: row.warnings,
        recommendations: row.recommendations,
        timestamp: row.analyzedAt,
      },
      analyzedAt: row.analyzedAt,
    };
  }
}

// Singleton instance
export const analysisRepository = new AnalysisRepository();
