import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { randomUUID } from "node:crypto";
import type { Policy, PolicyConfig } from "../types/index.js";
import { policyRepository } from "../repositories/index.js";

export const policyRouter = new Hono();

/**
 * Spending limit policy config schema
 */
const spendingLimitConfigSchema = z.object({
  type: z.literal("spending_limit"),
  maxAmountWei: z.string().refine(
    (val) => {
      try {
        return BigInt(val) > 0n;
      } catch {
        return false;
      }
    },
    { message: "maxAmountWei must be a positive integer string" }
  ),
  period: z.enum(["per_transaction", "daily", "weekly", "monthly"]),
  tokenAddress: z.string().optional(),
});

/**
 * Protocol allowlist policy config schema
 */
const protocolAllowlistConfigSchema = z.object({
  type: z.literal("protocol_allowlist"),
  allowedAddresses: z.array(z.string()).min(1, "At least one address required"),
  allowUnknown: z.boolean(),
});

/**
 * KYC requirement policy config schema
 */
const kycRequirementConfigSchema = z.object({
  type: z.literal("kyc_requirement"),
  requiredLevel: z.enum(["basic", "advanced", "full"]),
  thresholdWei: z.string().refine(
    (val) => {
      try {
        return BigInt(val) >= 0n;
      } catch {
        return false;
      }
    },
    { message: "thresholdWei must be a non-negative integer string" }
  ),
});

/**
 * Time restriction policy config schema
 */
const timeRestrictionConfigSchema = z.object({
  type: z.literal("time_restriction"),
  allowedDays: z.array(z.number().min(0).max(6)).min(1, "At least one day required"),
  allowedHoursUtc: z.object({
    start: z.number().min(0).max(23),
    end: z.number().min(0).max(23),
  }),
});

/**
 * Discriminated union schema for all policy configs
 * This ensures type-safe validation based on the 'type' field
 */
const policyConfigSchema = z.discriminatedUnion("type", [
  spendingLimitConfigSchema,
  protocolAllowlistConfigSchema,
  kycRequirementConfigSchema,
  timeRestrictionConfigSchema,
]);

/**
 * Full policy schema with strongly-typed config
 */
const policySchema = z.object({
  name: z.string().min(1, "Policy name is required"),
  config: policyConfigSchema,
  enabled: z.boolean().default(true),
});

/**
 * GET /api/policies - List all policies
 */
policyRouter.get("/", async (c) => {
  try {
    const policies = await policyRepository.findAll();
    return c.json({ policies });
  } catch (error) {
    console.error("Failed to fetch policies:", error);
    return c.json({ error: "Failed to fetch policies" }, 500);
  }
});

/**
 * POST /api/policies - Create a new policy
 */
policyRouter.post("/", zValidator("json", policySchema), async (c) => {
  const input = c.req.valid("json");
  const id = randomUUID();
  const now = new Date().toISOString();

  const policy: Policy = {
    id,
    name: input.name,
    config: input.config as PolicyConfig,
    enabled: input.enabled,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await policyRepository.create(policy);
    return c.json(policy, 201);
  } catch (error) {
    console.error("Failed to create policy:", error);
    return c.json({ error: "Failed to create policy" }, 500);
  }
});

/**
 * GET /api/policies/:id - Get policy by ID
 */
policyRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const policy = await policyRepository.findById(id);
    if (!policy) {
      return c.json({ error: "Policy not found" }, 404);
    }
    return c.json(policy);
  } catch (error) {
    console.error("Failed to fetch policy:", error);
    return c.json({ error: "Failed to fetch policy" }, 500);
  }
});

/**
 * PUT /api/policies/:id - Update a policy
 */
policyRouter.put("/:id", zValidator("json", policySchema), async (c) => {
  const id = c.req.param("id");
  const input = c.req.valid("json");

  try {
    const existing = await policyRepository.findById(id);
    if (!existing) {
      return c.json({ error: "Policy not found" }, 404);
    }

    const updated: Policy = {
      ...existing,
      name: input.name,
      config: input.config as PolicyConfig,
      enabled: input.enabled,
      updatedAt: new Date().toISOString(),
    };

    await policyRepository.update(updated);
    return c.json(updated);
  } catch (error) {
    console.error("Failed to update policy:", error);
    return c.json({ error: "Failed to update policy" }, 500);
  }
});

/**
 * DELETE /api/policies/:id - Delete a policy
 */
policyRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const exists = await policyRepository.exists(id);
    if (!exists) {
      return c.json({ error: "Policy not found" }, 404);
    }

    await policyRepository.delete(id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete policy:", error);
    return c.json({ error: "Failed to delete policy" }, 500);
  }
});
