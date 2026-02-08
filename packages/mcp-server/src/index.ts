#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.ZEROKEY_API_URL ?? "http://localhost:3001";
const API_KEY = process.env.ZEROKEY_API_KEY ?? "";

async function callApi(path: string, options?: RequestInit): Promise<unknown> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Agent-Key": API_KEY,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

const server = new McpServer({
  name: "zerokey-mcp",
  version: "0.1.0",
});

// Tool 1: Discover API services
server.tool(
  "zerokey_discover",
  "Search the ZeroKey marketplace for API services by keyword and optional max price",
  {
    service: z.string().describe("Service keyword to search for (e.g. 'translation', 'image')"),
    maxPrice: z.string().optional().describe("Maximum price filter (e.g. '0.05')"),
  },
  async ({ service, maxPrice }) => {
    const params = new URLSearchParams({ service });
    if (maxPrice) params.set("maxPrice", maxPrice);
    const data = await callApi(`/api/a2a/discover?${params.toString()}`);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  }
);

// Tool 2: Execute payment for a service
server.tool(
  "zerokey_pay",
  "Pay a provider and execute an API service through the ZeroKey firewall",
  {
    providerId: z.string().describe("The provider ID to pay"),
    amount: z.string().describe("Payment amount in USDC (e.g. '0.03')"),
    task: z.string().describe("Description of the task to execute"),
  },
  async ({ providerId, amount, task }) => {
    const data = await callApi("/api/pay/execute", {
      method: "POST",
      body: JSON.stringify({ providerId, amount, task }),
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  }
);

// Tool 3: Check agent balance and info
server.tool(
  "zerokey_balance",
  "Get the current agent's balance, allowance, and account information",
  {},
  async () => {
    const data = await callApi("/api/agents/me");
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  }
);

// Tool 4: View purchase history
server.tool(
  "zerokey_history",
  "List recent purchases and API calls made by this agent",
  {},
  async () => {
    const data = await callApi("/api/purchases");
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
