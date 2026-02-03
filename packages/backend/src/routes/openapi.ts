import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";

const app = new Hono();

// OpenAPI specification
const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "ZeroKey Treasury API",
    version: "0.1.0",
    description: "AI Agent API Marketplace with Execution Firewall",
  },
  servers: [
    {
      url: "https://zerokey.exe.xyz:8000",
      description: "Live demo (frontend + reverse-proxied API)",
    },
    {
      url: "http://localhost:3001",
      description: "Backend dev server",
    },
  ],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        tags: ["System"],
        responses: {
          "200": {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "healthy" },
                    timestamp: { type: "string", format: "date-time" },
                    version: { type: "string", example: "0.1.0" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/a2a/discover": {
      get: {
        summary: "Discover service providers",
        tags: ["A2A Gateway"],
        parameters: [
          {
            name: "service",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Service type to search (e.g., translation, summarization)",
            example: "translation",
          },
          {
            name: "maxPrice",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Maximum price in USDC",
            example: "0.05",
          },
        ],
        responses: {
          "200": {
            description: "List of matching providers",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          services: { type: "array", items: { type: "string" } },
                          price: { type: "string" },
                          unit: { type: "string" },
                          trustScore: { type: "integer" },
                          totalTransactions: { type: "integer" },
                        },
                      },
                    },
                    count: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/a2a/provider/{id}": {
      get: {
        summary: "Get provider details",
        tags: ["A2A Gateway"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Provider ID",
          },
        ],
        responses: {
          "200": {
            description: "Provider details",
          },
          "404": {
            description: "Provider not found",
          },
        },
      },
    },
    "/api/a2a/negotiate": {
      post: {
        summary: "Start negotiation session",
        tags: ["A2A Gateway"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["clientId", "providerId", "service", "initialOffer"],
                properties: {
                  clientId: { type: "string", description: "Client wallet address" },
                  providerId: { type: "string", description: "Provider ID" },
                  service: { type: "string", description: "Service type" },
                  initialOffer: { type: "string", description: "Initial offer in USDC" },
                },
              },
              example: {
                clientId: "0x1234567890abcdef1234567890abcdef12345678",
                providerId: "translate-ai-001",
                service: "translation",
                initialOffer: "0.025",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Negotiation session created",
          },
        },
      },
    },
    "/api/a2a/negotiate/{sessionId}/offer": {
      post: {
        summary: "Send offer in negotiation",
        tags: ["A2A Gateway"],
        parameters: [
          {
            name: "sessionId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount", "type"],
                properties: {
                  amount: { type: "string", description: "Offer amount in USDC" },
                  type: {
                    type: "string",
                    enum: ["offer", "counter", "accept", "reject"],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Offer response",
          },
        },
      },
    },
    "/api/firewall/check": {
      post: {
        summary: "Check transaction with Firewall",
        tags: ["Firewall"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["sessionId"],
                properties: {
                  sessionId: { type: "string", description: "Negotiation session ID" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Firewall decision",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    firewall: {
                      type: "object",
                      properties: {
                        decision: {
                          type: "string",
                          enum: ["APPROVED", "WARNING", "REJECTED"],
                        },
                        riskLevel: { type: "integer", minimum: 1, maximum: 3 },
                        reason: { type: "string" },
                        warnings: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/api/firewall/events": {
      get: {
        summary: "List blocked-before-payment firewall events",
        tags: ["Firewall"],
        responses: {
          "200": {
            description: "Blocked events (money never moved)",
          },
        },
      },
    },

    "/api/purchases": {
      get: {
        summary: "List verified purchases (txHash proof)",
        tags: ["Payments"],
        responses: {
          "200": {
            description: "Purchase log entries",
          },
        },
      },
    },

    "/api/pay/request": {
      post: {
        summary: "Request payment instructions (always returns HTTP 402)",
        tags: ["Payments"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  amountUsdc: { type: "string", example: "0.03" },
                  serviceId: { type: "string", example: "image-pack-001" },
                },
              },
            },
          },
        },
        responses: {
          "402": {
            description: "Payment Required",
          },
        },
      },
    },

    "/api/pay/submit": {
      post: {
        summary: "Submit txHash for on-chain receipt verification",
        tags: ["Payments"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "txHash",
                  "expectedAmountUsdc",
                  "providerId",
                  "firewallDecision",
                  "firewallReason",
                ],
                properties: {
                  txHash: { type: "string", example: "0x..." },
                  expectedAmountUsdc: { type: "string", example: "0.03" },
                  providerId: { type: "string", example: "image-pack-001" },
                  firewallDecision: { type: "string", enum: ["APPROVED", "WARNING", "REJECTED"] },
                  firewallReason: { type: "string", example: "Recipient allowlist passed" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Payment verified" },
          "402": { description: "Verification failed / Payment required" },
          "403": { description: "Firewall not approved" },
        },
      },
    },

    "/api/provider/prices": {
      get: {
        summary: "Get service prices",
        tags: ["Provider"],
        responses: {
          "200": {
            description: "Service price list",
          },
        },
      },
    },
    "/api/provider/translate": {
      post: {
        summary: "Translation service (requires x402 payment)",
        tags: ["Provider"],
        parameters: [
          {
            name: "X-Payment",
            in: "header",
            required: false,
            schema: { type: "string" },
            description: "Payment proof: txHash:chainId:amount:payer",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["text", "targetLanguage"],
                properties: {
                  text: { type: "string", description: "Text to translate" },
                  targetLanguage: { type: "string", description: "Target language code" },
                  sourceLanguage: { type: "string", description: "Source language code" },
                },
              },
              example: {
                text: "hello",
                targetLanguage: "ja",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Translation result",
          },
          "402": {
            description: "Payment required",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Payment Required" },
                    code: { type: "integer", example: 402 },
                    payment: {
                      type: "object",
                      properties: {
                        amount: { type: "string" },
                        recipient: { type: "string" },
                        token: { type: "string" },
                        chainId: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/provider/summarize": {
      post: {
        summary: "Summarization service (requires x402 payment)",
        tags: ["Provider"],
        parameters: [
          {
            name: "X-Payment",
            in: "header",
            required: false,
            schema: { type: "string" },
            description: "Payment proof: txHash:chainId:amount:payer",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["text"],
                properties: {
                  text: { type: "string", description: "Text to summarize" },
                  maxLength: { type: "integer", description: "Maximum summary length" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Summarization result",
          },
          "402": {
            description: "Payment required",
          },
        },
      },
    },
  },
  tags: [
    { name: "System", description: "System endpoints" },
    { name: "A2A Gateway", description: "Agent-to-Agent service discovery and negotiation" },
    { name: "Firewall", description: "Execution firewall and risk analysis" },
    { name: "Payments", description: "USDC payment request/verification + purchase log" },
    { name: "Provider", description: "Mock service provider endpoints (x402 payment)" },
  ],
};

// Serve OpenAPI spec as JSON
app.get("/openapi.json", (c) => {
  return c.json(openApiSpec);
});

// Serve Swagger UI
app.get(
  "/",
  swaggerUI({
    url: "/docs/openapi.json",
  })
);

export default app;
