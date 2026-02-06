import { describe, expect, it, vi } from "vitest";

vi.mock("../repositories/index.js", () => {
  return {
    policyRepository: {
      findAll: vi.fn(async () => []),
    },
  };
});

describe("checkFirewall", () => {
  it("returns CONFIRM_REQUIRED for low-trust provider on small spend", async () => {
    const { checkFirewall } = await import("./firewall.js");

    const res = await checkFirewall({
      tx: {
        chainId: 84532,
        from: "0xabc",
        to: "0xdef",
        value: "1000000", // 1 USDC (10^6 units)
      },
      provider: { id: "cheap", name: "CheapTranslate", trustScore: 15 },
      now: new Date("2026-01-01T00:00:00Z"),
    });

    expect(res.decision).toBe("CONFIRM_REQUIRED");
    expect(res.riskLevel).toBe(2);
    expect(res.warnings.join(" ")).toMatch(/Low provider trust score/i);
  });

  it("returns REJECTED when rate limit exceeded", async () => {
    const { checkFirewall } = await import("./firewall.js");

    const base = {
      tx: {
        chainId: 84532,
        from: "0xabc",
        to: "0xdef",
        value: "1000000",
      },
      provider: { id: "p1", name: "TranslateAI Pro", trustScore: 85 },
      now: new Date("2026-01-01T00:00:00Z"),
    };

    // 11 requests within same minute
    for (let i = 0; i < 10; i++) {
      await checkFirewall(base);
    }

    const res = await checkFirewall(base);
    expect(res.decision).toBe("REJECTED");
    expect(res.reasons.join(" ")).toMatch(/Rate limit exceeded/i);
  });
});
