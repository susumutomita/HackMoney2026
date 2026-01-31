import { describe, expect, test } from "vitest";
import { FirewallService } from "./firewall.js";
import { initializeDatabase, db, schema } from "../db/index.js";
import { randomUUID } from "node:crypto";

initializeDatabase();

const TX_BASE = {
  chainId: 84532,
  from: "0x1111111111111111111111111111111111111111",
  to: "0x2222222222222222222222222222222222222222",
  value: "0",
  data: "0x",
};

describe("FirewallService.checkTransaction", () => {
  const service = new FirewallService();

  test("rejects low-trust provider (CheapTranslate trustScore=15)", async () => {
    const res = await service.checkTransaction({ ...TX_BASE, value: "1000000" }, { providerId: "sketchy-service-001" });

    expect(res.decision).toBe("REJECTED");
    expect(res.violations.some((v) => v.kind === "provider_trust")).toBe(true);
  });

  test("rejects when daily budget would be exceeded", async () => {
    const res = await service.checkTransaction({ ...TX_BASE, value: "11000000" }, { dailyBudgetLimitUsdcBaseUnits: 10_000_000n });

    expect(res.decision).toBe("REJECTED");
    expect(res.violations.some((v) => v.kind === "budget")).toBe(true);
  });

  test("enforces protocol allowlist policy when allowUnknown=false", async () => {
    const policyId = randomUUID();
    const now = new Date().toISOString();

    await db.insert(schema.policies).values({
      id: policyId,
      name: "allowlist-test",
      config: {
        type: "protocol_allowlist",
        allowedAddresses: ["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
        allowUnknown: false,
      },
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    const res = await service.checkTransaction({ ...TX_BASE });

    expect(res.decision).toBe("REJECTED");
    expect(res.violations.some((v) => v.kind === "policy:protocol_allowlist")).toBe(true);
  });
});
