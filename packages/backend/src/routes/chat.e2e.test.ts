import { describe, expect, it } from "vitest";

import app from "../index.js";

function mkEnvelope(overrides: Record<string, unknown> = {}) {
  const base = {
    v: "0.1",
    type: "discover",
    sessionId: "",
    actor: { kind: "client", id: "e2e" },
    ts: Date.now(),
    payload: {},
    idempotencyKey: "",
  };
  return { ...base, ...overrides };
}

async function postJson(path: string, body: unknown): Promise<{ res: Response; json: any }> {
  const res = await app.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  // Response.json() is typed as unknown in this environment; for E2E assertions we treat it as any.
  const json = (await res.json().catch(() => ({}))) as any;
  return { res, json };
}

describe("/api/chat (E2E)", () => {
  it("enforces state machine + blocks pay before firewall approval", async () => {
    const sessionId = `e2e-${Date.now()}`;

    // 1) discover -> DISCOVERED
    {
      const { res, json } = await postJson(
        "/api/chat",
        mkEnvelope({
          type: "discover",
          sessionId,
          idempotencyKey: `idem-${sessionId}-discover`,
          payload: { service: "translation", chain: "base-sepolia" },
        })
      );
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.state).toBe("DISCOVERED");
    }

    // 2) pay.request before approval -> 409
    {
      const { res, json } = await postJson(
        "/api/chat",
        mkEnvelope({
          type: "pay.request",
          sessionId,
          idempotencyKey: `idem-${sessionId}-pay1`,
          payload: {
            serviceId: "svc-1",
            amount: "0.01",
            currency: "USDC",
            chain: "base-sepolia",
            recipient: "0x0000000000000000000000000000000000000000",
            expiresAt: Date.now() + 60_000,
          },
        })
      );
      expect(res.status).toBe(409);
      expect(json.ok).toBe(false);
      expect(json.error).toBe("Invalid transition");
    }

    // 3) negotiate.start -> NEGOTIATING
    {
      const { res, json } = await postJson(
        "/api/chat",
        mkEnvelope({
          type: "negotiate.start",
          sessionId,
          idempotencyKey: `idem-${sessionId}-start`,
          payload: {
            providerId: "translate-ai-001",
            service: "translation",
            params: { wordCount: 100 },
            pricing: { currency: "USDC", chain: "base-sepolia", suggested: "0.03" },
          },
        })
      );
      expect(res.status).toBe(200);
      expect(json.state).toBe("NEGOTIATING");
    }

    // 4) negotiate.accept -> AGREED
    {
      const { res, json } = await postJson(
        "/api/chat",
        mkEnvelope({
          type: "negotiate.accept",
          sessionId,
          idempotencyKey: `idem-${sessionId}-accept`,
          payload: { acceptedAmount: "0.03", currency: "USDC", chain: "base-sepolia" },
        })
      );
      expect(res.status).toBe(200);
      expect(json.state).toBe("AGREED");
    }

    // 5) pay.request still blocked (no firewall yet) -> 409
    {
      const { res } = await postJson(
        "/api/chat",
        mkEnvelope({
          type: "pay.request",
          sessionId,
          idempotencyKey: `idem-${sessionId}-pay2`,
          payload: {
            serviceId: "svc-1",
            amount: "0.03",
            currency: "USDC",
            chain: "base-sepolia",
            recipient: "0x0000000000000000000000000000000000000000",
            expiresAt: Date.now() + 60_000,
          },
        })
      );
      expect(res.status).toBe(409);
    }

    // 6) firewall.check -> FIREWALL_APPROVED (demo: transition only)
    {
      const { res, json } = await postJson(
        "/api/chat",
        mkEnvelope({
          type: "firewall.check",
          sessionId,
          idempotencyKey: `idem-${sessionId}-fw`,
          payload: {
            provider: { id: "translate-ai-001", trustScore: 85 },
            intent: { service: "translation", purpose: "demo" },
            payment: {
              amount: "0.03",
              currency: "USDC",
              chain: "base-sepolia",
              recipient: "vitalik.eth",
            },
            policy: {
              dailyBudget: "100",
              maxSingleTx: "10",
              allowedCategories: ["translation"],
              requireApprovalAbove: "0",
            },
          },
        })
      );
      expect(res.status).toBe(200);
      expect(json.state).toBe("FIREWALL_APPROVED");
    }

    // 7) pay.request now allowed -> PAYMENT_REQUIRED
    {
      const { res, json } = await postJson(
        "/api/chat",
        mkEnvelope({
          type: "pay.request",
          sessionId,
          idempotencyKey: `idem-${sessionId}-pay3`,
          payload: {
            serviceId: "svc-1",
            amount: "0.03",
            currency: "USDC",
            chain: "base-sepolia",
            recipient: "0x0000000000000000000000000000000000000000",
            expiresAt: Date.now() + 60_000,
          },
        })
      );
      expect(res.status).toBe(200);
      expect(json.state).toBe("PAYMENT_REQUIRED");
    }
  });

  it("enforces idempotency for state-changing messages", async () => {
    const sessionId = `e2e-idem-${Date.now()}`;
    const idempotencyKey = `idem-${sessionId}-discover`;

    const body = mkEnvelope({
      type: "discover",
      sessionId,
      idempotencyKey,
      payload: { service: "translation", chain: "base-sepolia" },
    });

    const first = await postJson("/api/chat", body);
    expect(first.res.status).toBe(200);
    expect(first.json.replay).toBeUndefined();

    const second = await postJson("/api/chat", body);
    expect(second.res.status).toBe(200);
    expect(second.json.replay).toBe(true);
  });
});
