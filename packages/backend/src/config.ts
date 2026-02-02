import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  PORT: z.string().default("3001"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  POLICY_ORACLE_PRIVATE_KEY: z.string().optional(),
  BASE_SEPOLIA_RPC_URL: z.string().optional(),
  GUARD_CONTRACT_ADDRESS: z.string().optional(),

  // A2A auth (see docs/a2a-firewall.md)
  A2A_AUTH_ENABLED: z.string().optional(),
  A2A_TIMESTAMP_WINDOW_SECONDS: z.string().optional(),
  /** JSON array of { kid, clientId, publicKeyPem, status? } */
  A2A_KEYS_JSON: z.string().optional(),
  /** JSON array of { clientId, method, path } */
  A2A_ALLOWLIST_JSON: z.string().optional(),

  /** JSON object mapping providerId -> { recipient } */
  PROVIDER_REGISTRY_JSON: z.string().optional(),
});

const env = envSchema.parse(process.env);

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const DEFAULT_PROVIDER_REGISTRY: Record<string, { recipient: string }> = {
  // Demo “verified” providers (recipient invariants)
  "translate-ai-001": { recipient: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
  "summarize-bot-001": { recipient: "0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5" },
  // Demo “attack” provider: marketplace shows one recipient but registry expects another.
  "sketchy-service-001": { recipient: "0x000000000000000000000000000000000000dEaD" },
};

export const config = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  openaiApiKey: env.OPENAI_API_KEY,
  databaseUrl: env.DATABASE_URL,
  policyOraclePrivateKey: env.POLICY_ORACLE_PRIVATE_KEY,
  rpcUrl: env.BASE_SEPOLIA_RPC_URL,
  guardContractAddress: env.GUARD_CONTRACT_ADDRESS,

  a2a: {
    enabled: env.A2A_AUTH_ENABLED === "true",
    timestampWindowSeconds: env.A2A_TIMESTAMP_WINDOW_SECONDS
      ? parseInt(env.A2A_TIMESTAMP_WINDOW_SECONDS, 10)
      : 300,
    keys: parseJson<unknown[]>(env.A2A_KEYS_JSON, []),
    allowlist: parseJson<unknown[]>(env.A2A_ALLOWLIST_JSON, []),
  },

  providerRegistry: parseJson<Record<string, { recipient: string }>>(
    env.PROVIDER_REGISTRY_JSON,
    DEFAULT_PROVIDER_REGISTRY
  ),
} as const;
