import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { analyzeRouter } from "./routes/analyze.js";
import { policyRouter } from "./routes/policy.js";
import { healthRouter } from "./routes/health.js";
import { config } from "./config.js";
import { initializeDatabase } from "./db/index.js";

// Initialize database on startup
initializeDatabase();

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors());

// Routes
app.route("/health", healthRouter);
app.route("/api/analyze", analyzeRouter);
app.route("/api/policy", policyRouter);

// Start server
const port = config.port;
console.log(`ZeroKey Backend running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
