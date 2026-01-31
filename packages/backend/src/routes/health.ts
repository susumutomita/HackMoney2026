import { Hono } from "hono";

export const healthRouter = new Hono();

healthRouter.get("/", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  });
});

healthRouter.get("/ready", (c) => {
  // Add readiness checks here (database, external services, etc.)
  return c.json({
    status: "ready",
    checks: {
      database: "ok",
      llm: "ok",
    },
  });
});
