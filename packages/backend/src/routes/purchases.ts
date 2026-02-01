import { Hono } from "hono";
import { db, schema } from "../db/index.js";

export const purchasesRouter = new Hono();

/**
 * GET /api/purchases
 * Returns recent purchases (proof that an agent paid).
 */
purchasesRouter.get("/", async (c) => {
  const rows = await db.select().from(schema.purchases);

  // newest first (createdAt ISO)
  const sorted = [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return c.json({ success: true, purchases: sorted });
});
