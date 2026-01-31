import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { randomUUID } from "node:crypto";

import {
  ConversationEnvelopeSchema,
  type ConversationEnvelope,
  type ConversationSessionState,
  validatePayload,
} from "@zerokey/shared";

import { db, schema } from "../db/index.js";
import { eq, and } from "drizzle-orm";
import { canAcceptMessage, nextState } from "../services/conversationState.js";

export const chatRouter = new Hono();

function nowIso() {
  return new Date().toISOString();
}

async function getOrCreateSession(
  sessionId: string
): Promise<{ id: string; state: ConversationSessionState }> {
  const rows = await db
    .select()
    .from(schema.conversationSessions)
    .where(eq(schema.conversationSessions.id, sessionId))
    .limit(1);

  const existing = rows[0];
  if (existing) {
    return { id: existing.id, state: existing.state as ConversationSessionState };
  }

  const createdAt = nowIso();
  await db.insert(schema.conversationSessions).values({
    id: sessionId,
    state: "NEW",
    createdAt,
    updatedAt: createdAt,
  });

  return { id: sessionId, state: "NEW" };
}

chatRouter.post("/", zValidator("json", ConversationEnvelopeSchema), async (c) => {
  const envelope = c.req.valid("json") as ConversationEnvelope;

  // Enforce idempotencyKey for state-changing operations.
  const isStateChanging = envelope.type !== "session.get";
  if (isStateChanging && !envelope.idempotencyKey) {
    return c.json({ error: "Missing idempotencyKey" }, 400);
  }

  // Validate payload by type (strict)
  try {
    validatePayload(envelope.type, envelope.payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid payload";
    return c.json({ error: "Invalid payload", message: msg }, 400);
  }

  // Session id rules
  const sessionId = envelope.sessionId || randomUUID();
  const session = await getOrCreateSession(sessionId);

  // Idempotency replay
  if (envelope.idempotencyKey) {
    const prior = await db
      .select()
      .from(schema.conversationEvents)
      .where(
        and(
          eq(schema.conversationEvents.sessionId, sessionId),
          eq(schema.conversationEvents.idempotencyKey, envelope.idempotencyKey)
        )
      )
      .limit(1);

    if (prior[0]) {
      return c.json({
        ok: true,
        replay: true,
        sessionId,
        state: session.state,
      });
    }
  }

  // State enforcement
  const accept = canAcceptMessage(session.state, envelope.type);

  const eventId = randomUUID();
  const createdAt = nowIso();

  if (!accept) {
    await db.insert(schema.conversationEvents).values({
      id: eventId,
      sessionId,
      idempotencyKey: envelope.idempotencyKey || null,
      type: envelope.type,
      actorKind: envelope.actor.kind,
      actorId: envelope.actor.id,
      ts: envelope.ts,
      payload: envelope.payload,
      accepted: false,
      error: `Invalid transition: state=${session.state}, type=${envelope.type}`,
      createdAt,
    });

    return c.json(
      {
        ok: false,
        sessionId,
        state: session.state,
        error: "Invalid transition",
        message: `state=${session.state} cannot accept type=${envelope.type}`,
      },
      409
    );
  }

  // Apply transition
  const newState = nextState(session.state, envelope.type);

  await db.insert(schema.conversationEvents).values({
    id: eventId,
    sessionId,
    idempotencyKey: envelope.idempotencyKey || null,
    type: envelope.type,
    actorKind: envelope.actor.kind,
    actorId: envelope.actor.id,
    ts: envelope.ts,
    payload: envelope.payload,
    accepted: true,
    error: null,
    createdAt,
  });

  if (newState !== session.state) {
    await db
      .update(schema.conversationSessions)
      .set({ state: newState, updatedAt: createdAt })
      .where(eq(schema.conversationSessions.id, sessionId));
  }

  return c.json({
    ok: true,
    sessionId,
    state: newState,
  });
});
