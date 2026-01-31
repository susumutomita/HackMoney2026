import { describe, it, expect } from "vitest";

import { analyzeTransaction } from "./analyzer.js";
import type { TransactionInput } from "../types/index.js";

// Common test addresses
const ADDRESSES = {
  sender: "0x1234567890123456789012345678901234567890",
  receiver: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  uniswapV3: "0x2626664c2603336E57B271c5C0b26F421741e481",
  null: "0x0000000000000000000000000000000000000000",
  unknown: "0x0000000000000000000000000000000000000001",
  malicious: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
} as const;

// ETH amounts in wei
const ETH = {
  tiny: "10000000000000000", // 0.01 ETH
  small: "500000000000000000", // 0.5 ETH
  one: "1000000000000000000", // 1 ETH
  five: "5000000000000000000", // 5 ETH
  large: "100000000000000000000", // 100 ETH
  massive: "1000000000000000000000", // 1000 ETH
} as const;

// Common function selectors
const SELECTORS = {
  transfer: "0xa9059cbb",
  approve: "0x095ea7b3",
  setApprovalForAll: "0xa22cb465",
  exactInputSingle: "0x414bf389",
  multicall: "0xac9650d8",
} as const;

interface TestCase {
  name: string;
  input: TransactionInput;
  expected: {
    riskLevel: 1 | 2 | 3;
    classification: string;
    approved: boolean;
  };
  tags: string[];
}

// Helper to create transaction input with defaults
function createTx(overrides: Partial<TransactionInput>): TransactionInput {
  return {
    chainId: 8453,
    from: ADDRESSES.sender,
    to: ADDRESSES.receiver,
    value: "0",
    data: "0x",
    ...overrides,
  };
}

// Max uint256 for unlimited approvals
const MAX_UINT256 = "f".repeat(64);

const TEST_CASES: TestCase[] = [
  // LOW RISK - Should be approved
  {
    name: "Simple ETH transfer - tiny amount",
    input: createTx({ value: ETH.tiny }),
    expected: { riskLevel: 1, classification: "transfer", approved: true },
    tags: ["transfer", "low-risk"],
  },
  {
    name: "Simple ETH transfer - 1 ETH",
    input: createTx({ value: ETH.one }),
    expected: { riskLevel: 1, classification: "transfer", approved: true },
    tags: ["transfer", "low-risk"],
  },
  {
    name: "ERC20 Transfer - USDC",
    input: createTx({
      to: ADDRESSES.usdc,
      data: `${SELECTORS.transfer}000000000000000000000000${ADDRESSES.receiver.slice(2)}0000000000000000000000000000000000000000000000000000000005f5e100`,
    }),
    expected: { riskLevel: 1, classification: "transfer", approved: true },
    tags: ["erc20", "transfer", "low-risk"],
  },

  // MEDIUM RISK - Approved with caution
  {
    name: "Large ETH transfer - 100 ETH",
    input: createTx({ value: ETH.large }),
    expected: { riskLevel: 2, classification: "transfer", approved: true },
    tags: ["transfer", "medium-risk", "large-amount"],
  },
  {
    name: "DEX Swap - Uniswap V3",
    input: createTx({
      to: ADDRESSES.uniswapV3,
      value: ETH.one,
      data: SELECTORS.exactInputSingle,
    }),
    expected: { riskLevel: 2, classification: "swap", approved: true },
    tags: ["swap", "dex", "medium-risk"],
  },
  {
    name: "Unknown contract interaction",
    input: createTx({
      to: ADDRESSES.unknown,
      value: ETH.small,
      data: "0xdeadbeef",
    }),
    expected: { riskLevel: 2, classification: "unknown", approved: true },
    tags: ["unknown", "medium-risk"],
  },

  // HIGH RISK - Should be blocked
  {
    name: "Massive ETH transfer - 1000 ETH",
    input: createTx({ value: ETH.massive }),
    expected: { riskLevel: 3, classification: "transfer", approved: false },
    tags: ["transfer", "high-risk", "large-amount"],
  },
  {
    name: "Unlimited token approval",
    input: createTx({
      to: ADDRESSES.usdc,
      data: `${SELECTORS.approve}000000000000000000000000${ADDRESSES.malicious.slice(2)}${MAX_UINT256}`,
    }),
    expected: { riskLevel: 3, classification: "approval", approved: false },
    tags: ["erc20", "approval", "high-risk", "unlimited"],
  },
  {
    name: "Transfer to null address",
    input: createTx({ to: ADDRESSES.null, value: ETH.one }),
    expected: { riskLevel: 3, classification: "transfer", approved: false },
    tags: ["transfer", "high-risk", "null-address"],
  },
  {
    name: "NFT setApprovalForAll to unknown operator",
    input: createTx({
      data: `${SELECTORS.setApprovalForAll}000000000000000000000000${ADDRESSES.malicious.slice(2)}0000000000000000000000000000000000000000000000000000000000000001`,
    }),
    expected: { riskLevel: 3, classification: "approval", approved: false },
    tags: ["nft", "approval", "high-risk", "scam-pattern"],
  },
  {
    name: "Multicall with significant ETH value",
    input: createTx({
      value: ETH.five,
      data: `${SELECTORS.multicall}00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003`,
    }),
    expected: { riskLevel: 3, classification: "unknown", approved: false },
    tags: ["multicall", "high-risk"],
  },
];

interface TestResult {
  name: string;
  passed: boolean;
  expected: TestCase["expected"];
  actual: { riskLevel: number; classification: string; approved: boolean };
  matches: { riskLevel: boolean; classification: boolean; approval: boolean };
}

// Helper to calculate accuracy percentage
function accuracy(results: TestResult[], key: keyof TestResult["matches"]): number {
  const correct = results.filter((r) => r.matches[key]).length;
  return results.length > 0 ? (correct / results.length) * 100 : 0;
}

// Helper to log test result
function logResult(
  name: string,
  passed: boolean,
  expected: TestCase["expected"],
  actual: TestResult["actual"],
  reason: string
): void {
  const status = passed ? "PASS" : "FAIL";
  console.log(`\n[${status}] ${name}`);
  console.log(`  Expected: risk=${expected.riskLevel}, approved=${expected.approved}`);
  console.log(`  Actual:   risk=${actual.riskLevel}, approved=${actual.approved}`);
  console.log(`  Reason:   ${reason}`);
}

describe("Transaction Analyzer Accuracy Tests", () => {
  // Live benchmarks depend on the local Claude subscription output and can be flaky.
  // Opt-in explicitly when you want to evaluate prompt quality.
  // (We intentionally ignore any global LIVE_LLM_TESTS env that might be set on the host.)
  const runLive = process.env.RUN_LIVE_BENCHMARKS === "true";

  describe.skipIf(!runLive)("Live Accuracy Benchmarks", () => {
    const results: TestResult[] = [];

    TEST_CASES.forEach((testCase) => {
      it(
        testCase.name,
        async () => {
          const result = await analyzeTransaction(testCase.input);

          const matches = {
            riskLevel: result.riskLevel === testCase.expected.riskLevel,
            classification:
              result.classification.toLowerCase() ===
              testCase.expected.classification.toLowerCase(),
            approval: result.approved === testCase.expected.approved,
          };
          const passed = matches.riskLevel && matches.approval;

          const actual = {
            riskLevel: result.riskLevel,
            classification: result.classification,
            approved: result.approved,
          };

          results.push({
            name: testCase.name,
            passed,
            expected: testCase.expected,
            actual,
            matches,
          });
          logResult(testCase.name, passed, testCase.expected, actual, result.reason);

          expect(result.approved).toBe(testCase.expected.approved);
        },
        { timeout: 180_000 }
      );
    });

    it("should meet minimum accuracy threshold", () => {
      if (results.length === 0) return;

      const riskAcc = accuracy(results, "riskLevel");
      const classAcc = accuracy(results, "classification");
      const approvalAcc = accuracy(results, "approval");
      const passRate = (results.filter((r) => r.passed).length / results.length) * 100;

      console.log("\n" + "=".repeat(50));
      console.log("ACCURACY REPORT");
      console.log("=".repeat(50));
      console.log(`Total Tests:         ${results.length}`);
      console.log(`Risk Level:          ${riskAcc.toFixed(1)}%`);
      console.log(`Classification:      ${classAcc.toFixed(1)}%`);
      console.log(`Approval:            ${approvalAcc.toFixed(1)}%`);
      console.log(`Overall Pass Rate:   ${passRate.toFixed(1)}%`);
      console.log("=".repeat(50));

      const failed = results.filter((r) => !r.passed);
      if (failed.length > 0) {
        console.log("\nFailed Cases:");
        for (const f of failed) {
          console.log(
            `  - ${f.name}: expected=${f.expected.approved}, actual=${f.actual.approved}`
          );
        }
      }

      expect(approvalAcc).toBeGreaterThanOrEqual(70);
    });
  });

  describe("Test Case Validation", () => {
    const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

    it("should have valid test case structure", () => {
      expect(TEST_CASES.length).toBeGreaterThan(0);

      for (const tc of TEST_CASES) {
        expect(tc.name).toBeTruthy();
        expect(tc.input.chainId).toBeGreaterThan(0);
        expect(tc.input.from).toMatch(ADDRESS_PATTERN);
        expect(tc.input.to).toMatch(ADDRESS_PATTERN);
        expect(tc.expected.riskLevel).toBeGreaterThanOrEqual(1);
        expect(tc.expected.riskLevel).toBeLessThanOrEqual(3);
      }
    });

    it("should have balanced risk level distribution", () => {
      const byRisk = { low: 0, medium: 0, high: 0 };
      for (const tc of TEST_CASES) {
        if (tc.expected.riskLevel === 1) byRisk.low++;
        else if (tc.expected.riskLevel === 2) byRisk.medium++;
        else byRisk.high++;
      }

      console.log(`Distribution: Low=${byRisk.low}, Medium=${byRisk.medium}, High=${byRisk.high}`);

      expect(byRisk.low).toBeGreaterThanOrEqual(2);
      expect(byRisk.medium).toBeGreaterThanOrEqual(2);
      expect(byRisk.high).toBeGreaterThanOrEqual(2);
    });

    it("should cover critical security patterns", () => {
      const allTags = TEST_CASES.flatMap((tc) => tc.tags);
      const required = ["transfer", "approval", "high-risk", "scam-pattern"];

      for (const tag of required) {
        expect(allTags).toContain(tag);
      }
    });
  });
});

export { TEST_CASES, type TestCase, type TestResult };
