import { z } from "zod";
import type { A2AAllowRule, A2AKeyRecord } from "./a2aAuth.js";

const keyRecordSchema = z.object({
  kid: z.string().min(1),
  clientId: z.string().min(1),
  publicKeyPem: z.string().min(1),
  status: z.enum(["active", "disabled"]).optional(),
});

const allowRuleSchema = z.object({
  clientId: z.string().min(1),
  method: z.string().min(1),
  path: z.string().min(1),
});

export function parseA2AKeys(input: unknown): A2AKeyRecord[] {
  const arr = z.array(keyRecordSchema).safeParse(input);
  return arr.success ? (arr.data as A2AKeyRecord[]) : [];
}

export function parseA2AAllowlist(input: unknown): A2AAllowRule[] {
  const arr = z.array(allowRuleSchema).safeParse(input);
  return arr.success ? (arr.data as A2AAllowRule[]) : [];
}
