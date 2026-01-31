import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import type { Policy, PolicyConfig } from "../types/index.js";
import type { PolicyRow, NewPolicyRow } from "../db/schema.js";

/**
 * Policy Repository
 * Handles all database operations for policies
 */
export class PolicyRepository {
  /**
   * Get all policies
   */
  async findAll(): Promise<Policy[]> {
    const rows = await db.select().from(schema.policies);
    return rows.map(this.rowToPolicy);
  }

  /**
   * Get policy by ID
   */
  async findById(id: string): Promise<Policy | null> {
    const rows = await db.select().from(schema.policies).where(eq(schema.policies.id, id));
    const row = rows[0];
    if (!row) return null;
    return this.rowToPolicy(row);
  }

  /**
   * Get all enabled policies
   */
  async findEnabled(): Promise<Policy[]> {
    const rows = await db.select().from(schema.policies).where(eq(schema.policies.enabled, true));
    return rows.map(this.rowToPolicy);
  }

  /**
   * Create a new policy
   */
  async create(policy: Policy): Promise<Policy> {
    const row: NewPolicyRow = {
      id: policy.id,
      name: policy.name,
      config: policy.config as unknown as Record<string, unknown>,
      enabled: policy.enabled,
      createdAt: policy.createdAt || new Date().toISOString(),
      updatedAt: policy.updatedAt || new Date().toISOString(),
    };

    await db.insert(schema.policies).values(row);
    return policy;
  }

  /**
   * Update an existing policy
   */
  async update(policy: Policy): Promise<Policy> {
    await db
      .update(schema.policies)
      .set({
        name: policy.name,
        config: policy.config as unknown as Record<string, unknown>,
        enabled: policy.enabled,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.policies.id, policy.id));

    return policy;
  }

  /**
   * Delete a policy by ID
   */
  async delete(id: string): Promise<boolean> {
    await db.delete(schema.policies).where(eq(schema.policies.id, id));
    return true;
  }

  /**
   * Check if a policy exists
   */
  async exists(id: string): Promise<boolean> {
    const rows = await db
      .select({ id: schema.policies.id })
      .from(schema.policies)
      .where(eq(schema.policies.id, id));
    return rows.length > 0;
  }

  /**
   * Convert database row to Policy object
   */
  private rowToPolicy(row: PolicyRow): Policy {
    return {
      id: row.id,
      name: row.name,
      config: row.config as unknown as PolicyConfig,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

// Singleton instance
export const policyRepository = new PolicyRepository();
