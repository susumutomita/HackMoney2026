import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { randomUUID } from "node:crypto";
import {
  isAddress,
  encodePacked,
  keccak256,
  createPublicClient,
  createWalletClient,
  http,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { guardRegistrations } from "../db/schema.js";
import { config } from "../config.js";
import { checkFirewall } from "../services/firewall.js";
import { policyRepository } from "../repositories/index.js";
import { SafeZeroKeyGuardAbi } from "../contracts/SafeZeroKeyGuardAbi.js";

export const guardRouter = new Hono();

// ──────────────────────────────────────────────
// Shared validation helpers
// ──────────────────────────────────────────────

const ethereumAddress = z.string().refine(
  (val) => isAddress(val),
  (val) => ({ message: `Invalid Ethereum address: ${val}` })
);

// ──────────────────────────────────────────────
// POST /register - Register a Safe with ZeroKey Guard
// ──────────────────────────────────────────────

const registerSchema = z.object({
  safeAddress: ethereumAddress,
  chainId: z.number().int().positive(),
  ownerAddress: ethereumAddress,
});

guardRouter.post("/register", zValidator("json", registerSchema), async (c) => {
  const { safeAddress, chainId, ownerAddress } = c.req.valid("json");

  const guardAddress = config.guardContractAddress;
  if (!guardAddress) {
    return c.json({ error: "Guard contract address not configured" }, 500);
  }

  // Check for existing registration
  const existing = db
    .select()
    .from(guardRegistrations)
    .where(eq(guardRegistrations.safeAddress, safeAddress.toLowerCase()))
    .get();

  if (existing) {
    return c.json(
      {
        error: "Safe already registered",
        registration: {
          id: existing.id,
          safeAddress: existing.safeAddress,
          chainId: existing.chainId,
          guardAddress: existing.guardContractAddress,
        },
      },
      409
    );
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  const registration = {
    id,
    safeAddress: safeAddress.toLowerCase(),
    chainId,
    ownerAddress: ownerAddress.toLowerCase(),
    guardContractAddress: guardAddress,
    createdAt: now,
  };

  try {
    db.insert(guardRegistrations).values(registration).run();

    return c.json(
      {
        success: true,
        registration: {
          id,
          safeAddress: registration.safeAddress,
          chainId,
          guardAddress,
        },
      },
      201
    );
  } catch (error) {
    console.error("Failed to register Safe:", error);
    return c.json({ error: "Failed to register Safe" }, 500);
  }
});

// ──────────────────────────────────────────────
// GET /status/:safeAddress - Check Guard status
// ──────────────────────────────────────────────

guardRouter.get("/status/:safeAddress", async (c) => {
  const safeAddress = c.req.param("safeAddress");

  if (!isAddress(safeAddress)) {
    return c.json({ error: "Invalid Ethereum address" }, 400);
  }

  try {
    const registration = db
      .select()
      .from(guardRegistrations)
      .where(eq(guardRegistrations.safeAddress, safeAddress.toLowerCase()))
      .get();

    // Fetch active policies for this response
    let policies: Array<{ id: string; name: string; enabled: boolean }> = [];
    try {
      const allPolicies = await policyRepository.findAll();
      policies = allPolicies
        .filter((p) => p.enabled)
        .map((p) => ({ id: p.id, name: p.name, enabled: p.enabled }));
    } catch {
      // Non-fatal: policies unavailable
    }

    if (!registration) {
      return c.json({
        isProtected: false,
        guardAddress: null,
        policies,
        registeredAt: null,
      });
    }

    return c.json({
      isProtected: true,
      guardAddress: registration.guardContractAddress,
      policies,
      registeredAt: registration.createdAt,
    });
  } catch (error) {
    console.error("Failed to fetch guard status:", error);
    return c.json({ error: "Failed to fetch guard status" }, 500);
  }
});

// ──────────────────────────────────────────────
// POST /pre-approve - Pre-approve a Safe transaction
// ──────────────────────────────────────────────

const preApproveSchema = z.object({
  safeAddress: ethereumAddress,
  to: ethereumAddress,
  value: z.string(),
  data: z.string(),
  operation: z.number().int().min(0).max(1),
  safeTxGas: z.string(),
  baseGas: z.string(),
  gasPrice: z.string(),
  gasToken: ethereumAddress,
  refundReceiver: ethereumAddress,
  msgSender: ethereumAddress,
});

guardRouter.post("/pre-approve", zValidator("json", preApproveSchema), async (c) => {
  const input = c.req.valid("json");

  if (!config.guardContractAddress) {
    return c.json({ error: "Guard contract address not configured" }, 500);
  }
  if (!config.policyOraclePrivateKey) {
    return c.json({ error: "Policy oracle private key not configured" }, 500);
  }

  try {
    // 1. Run firewall check
    const firewallResult = await checkFirewall({
      tx: {
        chainId: 84532, // Base Sepolia
        from: input.msgSender,
        to: input.to,
        value: input.value,
        data: input.data,
      },
    });

    const approved = firewallResult.decision === "APPROVED";
    const riskLevel = firewallResult.riskLevel;
    const reason = firewallResult.reasons.join("; ");

    // 2. Compute txHash off-chain (matches SafeZeroKeyGuard.computeTxHash)
    const dataHash = keccak256(input.data as `0x${string}`);
    const txHash = keccak256(
      encodePacked(
        [
          "address",
          "address",
          "uint256",
          "bytes32",
          "uint8",
          "uint256",
          "uint256",
          "uint256",
          "address",
          "address",
          "address",
        ],
        [
          input.safeAddress as Address,
          input.to as Address,
          BigInt(input.value),
          dataHash,
          input.operation as 0 | 1,
          BigInt(input.safeTxGas),
          BigInt(input.baseGas),
          BigInt(input.gasPrice),
          input.gasToken as Address,
          input.refundReceiver as Address,
          input.msgSender as Address,
        ]
      )
    );

    // 3. Submit decision on-chain
    const privateKey = config.policyOraclePrivateKey.startsWith("0x")
      ? config.policyOraclePrivateKey
      : `0x${config.policyOraclePrivateKey}`;
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const transport = config.rpcUrl ? http(config.rpcUrl) : http();
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport,
    });
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport,
    });

    const contractAddress = config.guardContractAddress as Address;

    const { request } = await publicClient.simulateContract({
      address: contractAddress,
      abi: SafeZeroKeyGuardAbi,
      functionName: "submitDecision",
      args: [txHash, approved, BigInt(riskLevel), reason],
      account,
    });

    const onChainTxHash = await walletClient.writeContract(request);

    await publicClient.waitForTransactionReceipt({
      hash: onChainTxHash,
      confirmations: 1,
    });

    return c.json({
      approved,
      txHash,
      riskLevel,
      reason,
      onChainTxHash,
    });
  } catch (error) {
    console.error("Failed to pre-approve transaction:", error);
    return c.json(
      {
        error: "Failed to pre-approve transaction",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});
