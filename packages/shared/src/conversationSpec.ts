import { z } from "zod";

/**
 * Conversation Interface Spec (v0.1)
 * Source of truth: docs/spec/CONVERSATION_SPEC.md
 */
export const CONVERSATION_SPEC_VERSION = "0.1" as const;

export const ConversationActorSchema = z.object({
  kind: z.enum(["client", "provider", "system"]),
  id: z.string().min(1),
});
export type ConversationActor = z.infer<typeof ConversationActorSchema>;

export const ConversationMessageTypeSchema = z.enum([
  "discover",
  "negotiate.start",
  "negotiate.offer",
  "negotiate.accept",
  "negotiate.reject",
  "firewall.check",
  "pay.request",
  "pay.proof",
  "session.get",
  "session.cancel",
]);
export type ConversationMessageType = z.infer<typeof ConversationMessageTypeSchema>;

export const ConversationEnvelopeSchema = z.object({
  v: z.literal(CONVERSATION_SPEC_VERSION),
  type: ConversationMessageTypeSchema,
  sessionId: z.string().min(1).optional(),
  actor: ConversationActorSchema,
  ts: z.number().int().nonnegative(),
  payload: z.record(z.unknown()),
  idempotencyKey: z.string().min(1).optional(),
});
export type ConversationEnvelope = z.infer<typeof ConversationEnvelopeSchema>;

export const ConversationSessionStateSchema = z.enum([
  "NEW",
  "DISCOVERED",
  "NEGOTIATING",
  "AGREED",
  "FIREWALL_APPROVED",
  "FIREWALL_REJECTED",
  "PAYMENT_REQUIRED",
  "PAID",
  "DONE",
  "CANCELLED",
]);
export type ConversationSessionState = z.infer<typeof ConversationSessionStateSchema>;

/**
 * Minimal payload schemas (v0.1).
 * We keep these intentionally small; unknown fields can be added later.
 */
export const DiscoverPayloadSchema = z.object({
  service: z.string().min(1),
  maxPrice: z.string().optional(),
  chain: z.enum(["base-sepolia", "base", "ethereum"]),
  requirements: z
    .object({
      ensPreferred: z.boolean().optional(),
    })
    .optional(),
});

export const NegotiateStartPayloadSchema = z.object({
  providerId: z.string().min(1),
  service: z.string().min(1),
  params: z.record(z.unknown()).optional().default({}),
  pricing: z.object({
    currency: z.literal("USDC"),
    chain: z.literal("base-sepolia"),
    suggested: z.string().min(1),
  }),
});

export const NegotiateOfferPayloadSchema = z.object({
  offer: z.object({
    amount: z.string().min(1),
    currency: z.literal("USDC"),
    chain: z.literal("base-sepolia"),
  }),
  note: z.string().optional(),
});

export const NegotiateAcceptRejectPayloadSchema = z.object({
  acceptedAmount: z.string().min(1),
  currency: z.literal("USDC"),
  chain: z.literal("base-sepolia"),
  reason: z.string().optional(),
});

export const FirewallCheckPayloadSchema = z.object({
  provider: z.object({
    id: z.string().min(1),
    trustScore: z.number().int().min(0).max(100),
  }),
  intent: z.object({
    service: z.string().min(1),
    purpose: z.string().min(1),
  }),
  payment: z.object({
    amount: z.string().min(1),
    currency: z.literal("USDC"),
    chain: z.literal("base-sepolia"),
    recipient: z.string().min(1), // 0x... or ENS
  }),
  policy: z.object({
    dailyBudget: z.string().min(1),
    maxSingleTx: z.string().min(1),
    allowedCategories: z.array(z.string()),
    requireApprovalAbove: z.string().min(1),
  }),
});

export const PayRequestPayloadSchema = z.object({
  serviceId: z.string().min(1),
  amount: z.string().min(1),
  currency: z.literal("USDC"),
  chain: z.literal("base-sepolia"),
  recipient: z.string().min(1),
  expiresAt: z.number().int().nonnegative(),
});

export const PayProofPayloadSchema = z.object({
  txHash: z.string().min(1),
  chainId: z.number().int().nonnegative(),
  payer: z.string().min(1),
  amount: z.string().min(1),
  recipient: z.string().min(1),
  serviceId: z.string().min(1),
});

export function validatePayload(type: ConversationMessageType, payload: unknown) {
  switch (type) {
    case "discover":
      return DiscoverPayloadSchema.parse(payload);
    case "negotiate.start":
      return NegotiateStartPayloadSchema.parse(payload);
    case "negotiate.offer":
      return NegotiateOfferPayloadSchema.parse(payload);
    case "negotiate.accept":
    case "negotiate.reject":
      return NegotiateAcceptRejectPayloadSchema.parse(payload);
    case "firewall.check":
      return FirewallCheckPayloadSchema.parse(payload);
    case "pay.request":
      return PayRequestPayloadSchema.parse(payload);
    case "pay.proof":
      return PayProofPayloadSchema.parse(payload);
    case "session.get":
    case "session.cancel":
      return z.object({}).passthrough().parse(payload);
  }
}
