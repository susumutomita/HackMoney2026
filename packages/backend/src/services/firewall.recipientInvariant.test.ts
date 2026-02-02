import { describe, expect, it } from "vitest";
import { checkFirewall } from "../services/firewall.js";

describe("Firewall recipient invariants", () => {
  it("rejects when provider recipient mismatches verified registry recipient", async () => {
    const res = await checkFirewall({
      tx: {
        chainId: 84532,
        from: "0x0000000000000000000000000000000000000001",
        to: "0x0000000000000000000000000000000000000002",
        value: "1000000", // 1 USDC (base units)
      },
      provider: {
        id: "sketchy-service-001",
        name: "CheapTranslate",
        trustScore: 50,
        expectedRecipient: "0x000000000000000000000000000000000000dEaD",
        recipient: "0x0000000000000000000000000000000000000001",
      },
    });

    expect(res.decision).toBe("REJECTED");
    expect(res.reasons.join("\n")).toMatch(/Recipient mismatch/i);
    expect(res.reasons.join("\n")).toMatch(/fraud risk/i);
  });
});
