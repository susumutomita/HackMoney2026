import { Hono } from "hono";
import { db, schema } from "../db/index.js";

export const firewallEventsRouter = new Hono();

/**
 * GET /api/firewall/events
 * Returns recent firewall events (including blocked-before-payment attempts).
 */
firewallEventsRouter.get("/events", async (c) => {
  const rows = await db.select().from(schema.firewallEvents);
  const sorted = [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return c.json({ success: true, events: sorted });
});
