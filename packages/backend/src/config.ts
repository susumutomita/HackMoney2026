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
});

const env = envSchema.parse(process.env);

export const config = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  openaiApiKey: env.OPENAI_API_KEY,
  databaseUrl: env.DATABASE_URL,
  policyOraclePrivateKey: env.POLICY_ORACLE_PRIVATE_KEY,
  rpcUrl: env.BASE_SEPOLIA_RPC_URL,
  guardContractAddress: env.GUARD_CONTRACT_ADDRESS,
} as const;
