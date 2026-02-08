import { z } from "zod";

const envSchema = z.object({
  CIRCLE_API_KEY: z.string().min(1).optional(),
  CIRCLE_ENV: z.enum(["sandbox", "production"]).optional(),
  CIRCLE_API_BASE_URL: z.string().url().optional(),
});

function getConfig() {
  const env = envSchema.parse(process.env);
  const baseUrl =
    env.CIRCLE_API_BASE_URL ||
    (env.CIRCLE_ENV === "production" ? "https://api.circle.com" : "https://api-sandbox.circle.com");

  const apiKey = env.CIRCLE_API_KEY;
  return { baseUrl, apiKey };
}

export class CircleGatewayError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "CircleGatewayError";
  }
}

async function circleFetch(path: string, init: Parameters<typeof fetch>[1]) {
  const { baseUrl, apiKey } = getConfig();
  if (!apiKey) {
    throw new CircleGatewayError(
      "Missing CIRCLE_API_KEY. Add it to packages/backend/.env (do not commit secrets)."
    );
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // keep as text
  }

  if (!res.ok) {
    throw new CircleGatewayError(`Circle Gateway API error ${res.status}`, res.status, body);
  }

  return body;
}

// Minimal endpoints we can use for the demo

const getBalancesReq = z.object({
  token: z.literal("USDC"),
  sources: z.array(
    z.object({
      depositor: z.string().min(1),
      domain: z.number().int().optional(),
    })
  ),
});

export async function getGatewayBalances(input: z.infer<typeof getBalancesReq>) {
  const body = getBalancesReq.parse(input);
  return circleFetch("/v1/balances", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
