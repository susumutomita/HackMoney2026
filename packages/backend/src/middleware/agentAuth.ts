import type { Context, Next } from "hono";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { agents } from "../db/schema.js";
import type { AgentRow } from "../db/schema.js";

declare module "hono" {
  interface ContextVariableMap {
    agent: AgentRow;
  }
}

function todayUTC(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function agentAuth(c: Context, next: Next) {
  const apiKey = c.req.header("X-Agent-Key");
  if (!apiKey) {
    return c.json({ error: "Missing X-Agent-Key header", code: "AUTH_MISSING" }, 401);
  }

  const hash = sha256(apiKey);

  const agent = db.select().from(agents).where(eq(agents.apiKeyHash, hash)).get();

  if (!agent) {
    return c.json({ error: "Invalid API key", code: "AUTH_INVALID" }, 401);
  }

  if (!agent.enabled) {
    return c.json({ error: "Agent is disabled", code: "AGENT_DISABLED" }, 403);
  }

  // Reset daily budget if date has changed
  const today = todayUTC();
  if (agent.lastResetDate !== today) {
    db.update(agents)
      .set({ spentTodayUsd: "0", lastResetDate: today })
      .where(eq(agents.id, agent.id))
      .run();
    agent.spentTodayUsd = "0";
    agent.lastResetDate = today;
  }

  // Update lastUsedAt
  db.update(agents)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(agents.id, agent.id))
    .run();

  c.set("agent", agent);
  return next();
}
