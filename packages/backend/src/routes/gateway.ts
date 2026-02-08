import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getGatewayBalances } from "../services/circleGateway.js";

export const gatewayRouter = new Hono();

// Minimal read-only endpoint for demo + debugging.
// NOTE: Gateway requires you to deposit USDC into Gateway Wallet contracts first.

gatewayRouter.post(
  "/balances",
  zValidator(
    "json",
    z.object({
      token: z.literal("USDC").default("USDC"),
      sources: z.array(
        z.object({
          depositor: z.string().min(1),
          domain: z.number().int().optional(),
        })
      ),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const res = await getGatewayBalances(body);
    return c.json(res);
  }
);
