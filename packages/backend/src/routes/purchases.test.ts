import { describe, expect, it } from "vitest";
import app from "../index.js";
import { db, schema } from "../db/index.js";

describe("/api/purchases", () => {
  it("lists persisted purchases", async () => {
    const id = `test-${Date.now()}`;
    const txHash = `0x${"11".repeat(32)}`;

    await db.insert(schema.purchases).values({
      id,
      txHash,
      chainId: 84532,
      token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      payer: "0x0000000000000000000000000000000000000001",
      recipient: "0x0000000000000000000000000000000000000002",
      amountUsdc: "0.03",
      providerId: "translation",
      providerName: "TranslateAI Pro",
      firewallDecision: "APPROVED",
      firewallReason: "Approved by policy",
      createdAt: new Date().toISOString(),
    });

    const res = await app.request(new Request("http://example.com/api/purchases"));
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(Array.isArray(json.purchases)).toBe(true);

    const found = json.purchases.find((p: any) => p.txHash === txHash);
    expect(found).toBeTruthy();
    expect(found.providerId).toBe("translation");
  });
});
