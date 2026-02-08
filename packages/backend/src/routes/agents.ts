import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { agents } from "../db/schema.js";
import { agentAuth } from "../middleware/agentAuth.js";

export const agentsRouter = new Hono();

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function generateApiKey(): string {
  return "zk_" + randomBytes(24).toString("hex");
}

const createSchema = z.object({
  name: z.string().min(1),
  safeAddress: z.string().optional().default(""),
  allowedCategories: z.array(z.string()).default(["translation", "summarization"]),
  dailyBudgetUsd: z.string().default("10"),
});

/**
 * POST /api/agents
 * Create a new agent. Returns the API key once (not stored in plaintext).
 */
agentsRouter.post("/", zValidator("json", createSchema), async (c) => {
  const { name, safeAddress, allowedCategories, dailyBudgetUsd } = c.req.valid("json");
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  const apiKey = generateApiKey();
  const prefix = apiKey.slice(0, 7); // "zk_" + first 4 hex chars
  const hash = sha256(apiKey);
  const id = randomUUID();

  await db.insert(agents).values({
    id,
    name,
    apiKeyPrefix: prefix,
    apiKeyHash: hash,
    safeAddress,
    allowedCategories,
    dailyBudgetUsd,
    spentTodayUsd: "0",
    lastResetDate: today,
    createdAt: now,
    lastUsedAt: null,
    enabled: true,
  });

  return c.json(
    {
      id,
      name,
      apiKey, // returned only once
      apiKeyPrefix: prefix,
      safeAddress,
      allowedCategories,
      dailyBudgetUsd,
      createdAt: now,
    },
    201
  );
});

/**
 * GET /api/agents?safe=0x...
 * List agents for a given Safe address.
 */
agentsRouter.get("/", async (c) => {
  const safe = c.req.query("safe");
  if (!safe) {
    return c.json({ error: "Query parameter 'safe' is required", code: "MISSING_PARAM" }, 400);
  }

  const rows = db
    .select({
      id: agents.id,
      name: agents.name,
      apiKeyPrefix: agents.apiKeyPrefix,
      safeAddress: agents.safeAddress,
      allowedCategories: agents.allowedCategories,
      dailyBudgetUsd: agents.dailyBudgetUsd,
      spentTodayUsd: agents.spentTodayUsd,
      enabled: agents.enabled,
      createdAt: agents.createdAt,
      lastUsedAt: agents.lastUsedAt,
    })
    .from(agents)
    .where(eq(agents.safeAddress, safe))
    .all();

  return c.json({ agents: rows });
});

/**
 * GET /api/agents/me
 * Get current agent info (requires X-Agent-Key).
 */
agentsRouter.get("/me", agentAuth, async (c) => {
  const agent = c.get("agent");
  return c.json({
    id: agent.id,
    name: agent.name,
    apiKeyPrefix: agent.apiKeyPrefix,
    safeAddress: agent.safeAddress,
    allowedCategories: agent.allowedCategories,
    dailyBudgetUsd: agent.dailyBudgetUsd,
    spentTodayUsd: agent.spentTodayUsd,
    enabled: agent.enabled,
    createdAt: agent.createdAt,
    lastUsedAt: agent.lastUsedAt,
  });
});

/**
 * DELETE /api/agents/:id
 * Disable (soft-delete) an agent.
 */
agentsRouter.delete("/:id", async (c) => {
  const { id } = c.req.param();

  const existing = db.select().from(agents).where(eq(agents.id, id)).get();

  if (!existing) {
    return c.json({ error: "Agent not found", code: "NOT_FOUND" }, 404);
  }

  db.update(agents).set({ enabled: false }).where(eq(agents.id, id)).run();

  return c.json({ success: true, id });
});

/**
 * POST /api/agents/:id/rotate-key
 * Generate a new API key for an agent.
 */
agentsRouter.post("/:id/rotate-key", async (c) => {
  const { id } = c.req.param();

  const existing = db.select().from(agents).where(eq(agents.id, id)).get();

  if (!existing) {
    return c.json({ error: "Agent not found", code: "NOT_FOUND" }, 404);
  }

  const apiKey = generateApiKey();
  const prefix = apiKey.slice(0, 7);
  const hash = sha256(apiKey);

  db.update(agents).set({ apiKeyPrefix: prefix, apiKeyHash: hash }).where(eq(agents.id, id)).run();

  return c.json({
    id,
    apiKey, // returned only once
    apiKeyPrefix: prefix,
  });
});
