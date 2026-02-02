import { describe, expect, it } from "vitest";
import app from "../index.js";
import { db, schema } from "../db/index.js";

describe("/api/firewall/events", () => {
  it("lists blocked-before-payment events", async () => {
    const id = `evt-${Date.now()}`;

    await db.insert(schema.firewallEvents).values({
      id,
      providerId: "sketchy-service-001",
      providerName: "CheapTranslate",
      decision: "REJECTED",
      reason: "Recipient mismatch",
      attemptedRecipient: "0x0000000000000000000000000000000000000001",
      amountUsdc: "0.005",
      createdAt: new Date().toISOString(),
    });

    const res = await app.request(new Request("http://example.com/api/firewall/events"));
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(Array.isArray(json.events)).toBe(true);

    const found = json.events.find((e: any) => e.id === id);
    expect(found).toBeTruthy();
    expect(found.decision).toBe("REJECTED");
  });
});
