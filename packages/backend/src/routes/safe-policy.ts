import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

export const safePolicyRouter = new Hono();

// In-memory store for demo (should be DB in production)
const safePolicies = new Map<string, SafePolicy>();

interface SafePolicy {
  safeAddress: string;
  chainId: number;
  adminAddress: string;
  maxTransferValue: string; // wei
  dailyLimit: string;       // wei
  allowArbitraryCalls: boolean;
  whitelist: string[];
  blacklist: string[];
  createdAt: string;
  updatedAt: string;
}

const registerSchema = z.object({
  safeAddress: z.string().startsWith("0x"),
  chainId: z.number(),
  adminAddress: z.string().startsWith("0x"),
  maxTransferValue: z.string(),
  dailyLimit: z.string(),
  allowArbitraryCalls: z.boolean().default(false),
});

/**
 * POST /api/safe-policy/register - Register a Safe for protection
 */
safePolicyRouter.post(
  "/register",
  zValidator("json", registerSchema),
  async (c) => {
    const data = c.req.valid("json");
    const key = `${data.chainId}:${data.safeAddress.toLowerCase()}`;

    const policy: SafePolicy = {
      safeAddress: data.safeAddress.toLowerCase(),
      chainId: data.chainId,
      adminAddress: data.adminAddress.toLowerCase(),
      maxTransferValue: data.maxTransferValue,
      dailyLimit: data.dailyLimit,
      allowArbitraryCalls: data.allowArbitraryCalls,
      whitelist: [],
      blacklist: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    safePolicies.set(key, policy);
    return c.json({ success: true, policy });
  }
);

/**
 * GET /api/safe-policy/:chainId/:safeAddress - Get policy for a Safe
 */
safePolicyRouter.get("/:chainId/:safeAddress", async (c) => {
  const chainId = parseInt(c.req.param("chainId"));
  const safeAddress = c.req.param("safeAddress").toLowerCase();
  const key = `${chainId}:${safeAddress}`;

  const policy = safePolicies.get(key);
  if (!policy) {
    return c.json({ error: "Safe not registered" }, 404);
  }

  return c.json({ policy });
});

/**
 * PUT /api/safe-policy/:chainId/:safeAddress - Update policy
 */
const updateSchema = z.object({
  maxTransferValue: z.string().optional(),
  dailyLimit: z.string().optional(),
  allowArbitraryCalls: z.boolean().optional(),
});

safePolicyRouter.put(
  "/:chainId/:safeAddress",
  zValidator("json", updateSchema),
  async (c) => {
    const chainId = parseInt(c.req.param("chainId"));
    const safeAddress = c.req.param("safeAddress").toLowerCase();
    const key = `${chainId}:${safeAddress}`;
    const updates = c.req.valid("json");

    const policy = safePolicies.get(key);
    if (!policy) {
      return c.json({ error: "Safe not registered" }, 404);
    }

    if (updates.maxTransferValue) policy.maxTransferValue = updates.maxTransferValue;
    if (updates.dailyLimit) policy.dailyLimit = updates.dailyLimit;
    if (updates.allowArbitraryCalls !== undefined) policy.allowArbitraryCalls = updates.allowArbitraryCalls;
    policy.updatedAt = new Date().toISOString();

    safePolicies.set(key, policy);
    return c.json({ success: true, policy });
  }
);

/**
 * POST /api/safe-policy/:chainId/:safeAddress/whitelist - Add to whitelist
 */
safePolicyRouter.post(
  "/:chainId/:safeAddress/whitelist",
  zValidator("json", z.object({ address: z.string().startsWith("0x") })),
  async (c) => {
    const chainId = parseInt(c.req.param("chainId"));
    const safeAddress = c.req.param("safeAddress").toLowerCase();
    const key = `${chainId}:${safeAddress}`;
    const { address } = c.req.valid("json");

    const policy = safePolicies.get(key);
    if (!policy) {
      return c.json({ error: "Safe not registered" }, 404);
    }

    if (!policy.whitelist.includes(address.toLowerCase())) {
      policy.whitelist.push(address.toLowerCase());
    }
    policy.updatedAt = new Date().toISOString();

    return c.json({ success: true, whitelist: policy.whitelist });
  }
);

/**
 * POST /api/safe-policy/:chainId/:safeAddress/blacklist - Add to blacklist
 */
safePolicyRouter.post(
  "/:chainId/:safeAddress/blacklist",
  zValidator("json", z.object({ address: z.string().startsWith("0x") })),
  async (c) => {
    const chainId = parseInt(c.req.param("chainId"));
    const safeAddress = c.req.param("safeAddress").toLowerCase();
    const key = `${chainId}:${safeAddress}`;
    const { address } = c.req.valid("json");

    const policy = safePolicies.get(key);
    if (!policy) {
      return c.json({ error: "Safe not registered" }, 404);
    }

    if (!policy.blacklist.includes(address.toLowerCase())) {
      policy.blacklist.push(address.toLowerCase());
    }
    policy.updatedAt = new Date().toISOString();

    return c.json({ success: true, blacklist: policy.blacklist });
  }
);

/**
 * POST /api/safe-policy/check - Check if a transaction would be allowed
 */
const checkSchema = z.object({
  safeAddress: z.string().startsWith("0x"),
  chainId: z.number(),
  to: z.string().startsWith("0x"),
  value: z.string(),
  data: z.string().optional(),
});

safePolicyRouter.post(
  "/check",
  zValidator("json", checkSchema),
  async (c) => {
    const { safeAddress, chainId, to, value, data } = c.req.valid("json");
    const key = `${chainId}:${safeAddress.toLowerCase()}`;

    const policy = safePolicies.get(key);
    if (!policy) {
      // No policy = allow by default
      return c.json({ allowed: true, reason: "No policy registered" });
    }

    const valueBigInt = BigInt(value);
    const maxValue = BigInt(policy.maxTransferValue);

    // Check blacklist
    if (policy.blacklist.includes(to.toLowerCase())) {
      return c.json({ allowed: false, reason: "Recipient is blacklisted" });
    }

    // Check max value
    if (maxValue > 0n && valueBigInt > maxValue) {
      return c.json({ 
        allowed: false, 
        reason: `Exceeds max transfer value (${policy.maxTransferValue} wei)` 
      });
    }

    // Check arbitrary calls
    if (!policy.allowArbitraryCalls && data && data !== "0x" && data.length > 2) {
      return c.json({ allowed: false, reason: "Contract calls not allowed" });
    }

    return c.json({ allowed: true, reason: "Policy check passed" });
  }
);

/**
 * GET /api/safe-policy/all - List all registered Safes (for dashboard)
 */
safePolicyRouter.get("/all", async (c) => {
  const policies = Array.from(safePolicies.values());
  return c.json({ policies });
});
