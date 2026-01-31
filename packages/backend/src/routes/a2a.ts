import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";

const app = new Hono();

/**
 * GET /api/a2a/discover
 * Search for service providers by service type
 */
const discoverQuerySchema = z.object({
  service: z.string().min(1),
  maxPrice: z.string().optional(),
});

app.get("/discover", zValidator("query", discoverQuerySchema), async (c) => {
  const { service, maxPrice } = c.req.valid("query");

  try {
    // Get all active providers
    const allProviders = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.isActive, true));

    // Filter by service (services is stored as JSON array)
    const matchingProviders = allProviders.filter((p) => {
      const services = p.services as string[];
      return services.some((s) => s.toLowerCase().includes(service.toLowerCase()));
    });

    // Filter by max price if specified
    const filtered = maxPrice
      ? matchingProviders.filter((p) => parseFloat(p.pricePerUnit) <= parseFloat(maxPrice))
      : matchingProviders;

    // Sort by trust score (descending)
    const sorted = filtered.sort((a, b) => b.trustScore - a.trustScore);

    // Return formatted response
    const response = sorted.map((p) => ({
      id: p.id,
      name: p.name,
      services: p.services,
      price: p.pricePerUnit,
      unit: p.unit,
      trustScore: p.trustScore,
      totalTransactions: p.totalTransactions,
    }));

    return c.json({
      success: true,
      query: { service, maxPrice },
      results: response,
      count: response.length,
    });
  } catch (error) {
    console.error("Discovery error:", error);
    return c.json({ success: false, error: "Discovery failed" }, 500);
  }
});

/**
 * GET /api/a2a/provider/:id
 * Get details for a specific provider
 */
app.get("/provider/:id", async (c) => {
  const { id } = c.req.param();

  try {
    const provider = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, id))
      .limit(1);

    if (provider.length === 0) {
      return c.json({ success: false, error: "Provider not found" }, 404);
    }

    return c.json({ success: true, provider: provider[0] });
  } catch (error) {
    console.error("Provider lookup error:", error);
    return c.json({ success: false, error: "Lookup failed" }, 500);
  }
});

/**
 * POST /api/a2a/negotiate
 * Start a negotiation session with a provider
 */
const negotiateBodySchema = z.object({
  clientId: z.string().min(1),
  providerId: z.string().min(1),
  service: z.string().min(1),
  initialOffer: z.string().min(1), // USDC amount
});

app.post("/negotiate", zValidator("json", negotiateBodySchema), async (c) => {
  const { clientId, providerId, service, initialOffer } = c.req.valid("json");

  try {
    // Verify provider exists
    const provider = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, providerId))
      .limit(1);

    const providerData = provider[0];
    if (!providerData) {
      return c.json({ success: false, error: "Provider not found" }, 404);
    }

    // Create negotiation session
    const sessionId = `neg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min expiry

    await db.insert(schema.negotiations).values({
      id: sessionId,
      clientId,
      providerId,
      service,
      status: "pending",
      initialOffer,
      finalPrice: null,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });

    return c.json({
      success: true,
      session: {
        id: sessionId,
        provider: providerData.name,
        service,
        initialOffer,
        providerPrice: providerData.pricePerUnit,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("Negotiation start error:", error);
    return c.json({ success: false, error: "Failed to start negotiation" }, 500);
  }
});

/**
 * POST /api/a2a/negotiate/:sessionId/offer
 * Submit an offer in a negotiation
 */
const offerBodySchema = z.object({
  amount: z.string().min(1),
  type: z.enum(["offer", "counter", "accept", "reject"]),
});

app.post("/negotiate/:sessionId/offer", zValidator("json", offerBodySchema), async (c) => {
  const { sessionId } = c.req.param();
  const { amount, type } = c.req.valid("json");

  try {
    // Get negotiation session
    const session = await db
      .select()
      .from(schema.negotiations)
      .where(eq(schema.negotiations.id, sessionId))
      .limit(1);

    const neg = session[0];
    if (!neg) {
      return c.json({ success: false, error: "Session not found" }, 404);
    }

    // Check expiry
    if (new Date(neg.expiresAt) < new Date()) {
      await db
        .update(schema.negotiations)
        .set({ status: "expired", updatedAt: new Date().toISOString() })
        .where(eq(schema.negotiations.id, sessionId));
      return c.json({ success: false, error: "Session expired" }, 400);
    }

    // Handle different offer types
    const now = new Date().toISOString();

    if (type === "accept") {
      await db
        .update(schema.negotiations)
        .set({
          status: "agreed",
          finalPrice: amount,
          updatedAt: now,
        })
        .where(eq(schema.negotiations.id, sessionId));

      return c.json({
        success: true,
        status: "agreed",
        finalPrice: amount,
        message: "Negotiation complete. Proceed to firewall check.",
      });
    }

    if (type === "reject") {
      await db
        .update(schema.negotiations)
        .set({ status: "rejected", updatedAt: now })
        .where(eq(schema.negotiations.id, sessionId));

      return c.json({
        success: true,
        status: "rejected",
        message: "Negotiation rejected.",
      });
    }

    // For offer/counter, update status to negotiating
    await db
      .update(schema.negotiations)
      .set({ status: "negotiating", updatedAt: now })
      .where(eq(schema.negotiations.id, sessionId));

    // Simulate provider response (in real implementation, this would go through WebSocket)
    const providerResult = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, neg.providerId))
      .limit(1);

    const providerData = providerResult[0];
    if (!providerData) {
      return c.json({ success: false, error: "Provider not found" }, 404);
    }

    const providerPrice = parseFloat(providerData.pricePerUnit);
    const offerAmount = parseFloat(amount);

    // Simple negotiation logic: accept if offer >= 90% of asking price
    if (offerAmount >= providerPrice * 0.9) {
      return c.json({
        success: true,
        status: "negotiating",
        response: {
          type: "accept",
          message: `Provider accepts ${amount} USDC`,
        },
      });
    }

    // Counter offer at midpoint
    const counterOffer = ((offerAmount + providerPrice) / 2).toFixed(4);
    return c.json({
      success: true,
      status: "negotiating",
      response: {
        type: "counter",
        amount: counterOffer,
        message: `Provider counters with ${counterOffer} USDC`,
      },
    });
  } catch (error) {
    console.error("Offer error:", error);
    return c.json({ success: false, error: "Failed to process offer" }, 500);
  }
});

/**
 * GET /api/a2a/negotiate/:sessionId
 * Get negotiation session status
 */
app.get("/negotiate/:sessionId", async (c) => {
  const { sessionId } = c.req.param();

  try {
    const session = await db
      .select()
      .from(schema.negotiations)
      .where(eq(schema.negotiations.id, sessionId))
      .limit(1);

    if (session.length === 0) {
      return c.json({ success: false, error: "Session not found" }, 404);
    }

    return c.json({ success: true, session: session[0] });
  } catch (error) {
    console.error("Session lookup error:", error);
    return c.json({ success: false, error: "Lookup failed" }, 500);
  }
});

export default app;
