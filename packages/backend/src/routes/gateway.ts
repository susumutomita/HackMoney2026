/**
 * Circle Gateway Routes
 *
 * Exposes crosschain USDC routing via Arc as a liquidity hub.
 * Covers all 3 Circle/Arc prize tracks:
 *  - Track 1: Chain Abstracted USDC via Arc Hub (/transfer)
 *  - Track 2: Global Payouts and Treasury Systems (/payout)
 *  - Track 3: Agentic Commerce powered by RWA   (/agent-commerce)
 */
import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { isAddress, type Address } from "viem";
import {
  getGatewayBalances,
  depositToGateway,
  transferViaGateway,
  executeMultiPayout,
  getGatewayInfo,
  GATEWAY_DOMAINS,
  type PayoutRecipient,
} from "../services/gateway.js";
import {
  getGatewayStatus,
  getGatewayTransfer,
  CCTP_CHAINS,
  USDC_ADDRESSES,
} from "../services/circleGateway.js";
import { checkFirewall } from "../services/firewall.js";

export const gatewayRouter = new Hono();

const ethAddress = z.string().refine(
  (v) => isAddress(v),
  (v) => ({ message: `Invalid address: ${v}` })
);

// ──────────────────────────────────────────────
// GET /info - Gateway service information
// ──────────────────────────────────────────────

gatewayRouter.get("/info", async (c) => {
  const info = await getGatewayInfo();
  return c.json(info);
});

// ──────────────────────────────────────────────
// GET /status - Circle configuration status
// ──────────────────────────────────────────────

gatewayRouter.get("/status", (c) => {
  const status = getGatewayStatus();
  return c.json({
    ...status,
    usdcAddresses: USDC_ADDRESSES,
    chains: CCTP_CHAINS,
  });
});

// ──────────────────────────────────────────────
// POST /balances - Check unified USDC balances
// ──────────────────────────────────────────────

const balancesSchema = z.object({
  depositor: ethAddress,
});

gatewayRouter.post("/balances", zValidator("json", balancesSchema), async (c) => {
  const { depositor } = c.req.valid("json");
  const balances = await getGatewayBalances(depositor as Address);
  return c.json({
    depositor,
    balances,
    totalUnified: balances.reduce((sum, b) => sum + parseFloat(b.balance), 0).toFixed(6),
    arcHubDomain: GATEWAY_DOMAINS.arcTestnet.domainId,
  });
});

// ──────────────────────────────────────────────
// POST /deposit - Deposit USDC to Gateway
// ──────────────────────────────────────────────

const depositSchema = z.object({
  amount: z.string().min(1),
});

gatewayRouter.post("/deposit", zValidator("json", depositSchema), async (c) => {
  const { amount } = c.req.valid("json");
  const amountBigInt = BigInt(Math.round(parseFloat(amount) * 1_000_000));

  const result = await depositToGateway(amountBigInt);

  return c.json(result, result.success ? 200 : 500);
});

// ──────────────────────────────────────────────
// POST /transfer - Cross-chain USDC transfer
// Track 1: Chain Abstracted USDC via Arc Hub
// ──────────────────────────────────────────────

const transferSchema = z.object({
  sourceDomain: z.number().int().min(0),
  destinationDomain: z.number().int().min(0),
  sender: ethAddress,
  recipient: ethAddress,
  amountUsdc: z.string().min(1),
});

gatewayRouter.post("/transfer", zValidator("json", transferSchema), async (c) => {
  const { sourceDomain, destinationDomain, sender, recipient, amountUsdc } = c.req.valid("json");

  // Firewall check before routing
  const firewallResult = await checkFirewall({
    tx: {
      chainId: 84532,
      from: sender,
      to: recipient,
      value: (parseFloat(amountUsdc) * 1_000_000).toString(),
    },
  });

  if (firewallResult.decision === "REJECTED") {
    return c.json(
      {
        success: false,
        error: "firewall_rejected",
        reasons: firewallResult.reasons,
        riskLevel: firewallResult.riskLevel,
      },
      403
    );
  }

  const result = await transferViaGateway({
    sourceDomain,
    destinationDomain,
    sender: sender as Address,
    recipient: recipient as Address,
    amount: amountUsdc,
  });

  return c.json({
    ...result,
    firewall: {
      decision: firewallResult.decision,
      riskLevel: firewallResult.riskLevel,
      reasons: firewallResult.reasons,
    },
  });
});

// ──────────────────────────────────────────────
// GET /transfer/:id - Check transfer status
// ──────────────────────────────────────────────

gatewayRouter.get("/transfer/:id", async (c) => {
  const transferId = c.req.param("id");
  const transfer = await getGatewayTransfer(transferId);
  if (!transfer) {
    return c.json({ error: "Transfer not found" }, 404);
  }
  return c.json({ transfer });
});

// ──────────────────────────────────────────────
// POST /payout - Multi-recipient payout
// Track 2: Global Payouts and Treasury Systems
// ──────────────────────────────────────────────

const payoutRecipientSchema = z.object({
  address: ethAddress,
  amountUsdc: z.string().min(1),
  destinationDomain: z.number().int().min(0),
  label: z.string().optional(),
});

const payoutSchema = z.object({
  sender: ethAddress,
  sourceDomain: z.number().int().min(0),
  recipients: z.array(payoutRecipientSchema).min(1).max(16),
});

gatewayRouter.post("/payout", zValidator("json", payoutSchema), async (c) => {
  const { sender, sourceDomain, recipients } = c.req.valid("json");

  // Firewall check for total payout amount
  const totalAmount = recipients.reduce((sum, r) => sum + parseFloat(r.amountUsdc), 0);

  const firewallResult = await checkFirewall({
    tx: {
      chainId: 84532,
      from: sender,
      to: "0x0000000000000000000000000000000000000000", // multi-recipient
      value: (totalAmount * 1_000_000).toString(),
    },
  });

  if (firewallResult.decision === "REJECTED") {
    return c.json(
      {
        success: false,
        error: "firewall_rejected",
        reasons: firewallResult.reasons,
        totalAmountUsdc: totalAmount.toFixed(6),
        recipientCount: recipients.length,
      },
      403
    );
  }

  const result = await executeMultiPayout(
    sender as Address,
    sourceDomain,
    recipients as PayoutRecipient[]
  );

  return c.json({
    ...result,
    firewall: {
      decision: firewallResult.decision,
      riskLevel: firewallResult.riskLevel,
      reasons: firewallResult.reasons,
    },
  });
});

// ──────────────────────────────────────────────
// POST /agent-commerce - Agent-driven commerce
// Track 3: Agentic Commerce powered by RWA
// ──────────────────────────────────────────────

const agentCommerceSchema = z.object({
  agentId: z.string().min(1),
  action: z.enum(["purchase", "payout", "rebalance"]),
  sender: ethAddress,
  recipient: ethAddress,
  amountUsdc: z.string().min(1),
  sourceDomain: z.number().int().min(0),
  destinationDomain: z.number().int().min(0),
  metadata: z
    .object({
      serviceId: z.string().optional(),
      reason: z.string().optional(),
      rwaCollateral: z.string().optional(),
    })
    .optional(),
});

gatewayRouter.post("/agent-commerce", zValidator("json", agentCommerceSchema), async (c) => {
  const input = c.req.valid("json");

  // 1. Firewall check with agent context
  const firewallResult = await checkFirewall({
    tx: {
      chainId: 84532,
      from: input.sender,
      to: input.recipient,
      value: (parseFloat(input.amountUsdc) * 1_000_000).toString(),
    },
  });

  if (firewallResult.decision === "REJECTED") {
    return c.json(
      {
        success: false,
        agentId: input.agentId,
        action: input.action,
        error: "firewall_rejected",
        reasons: firewallResult.reasons,
      },
      403
    );
  }

  // 2. Execute crosschain transfer via Arc hub
  const transfer = await transferViaGateway({
    sourceDomain: input.sourceDomain,
    destinationDomain: input.destinationDomain,
    sender: input.sender as Address,
    recipient: input.recipient as Address,
    amount: input.amountUsdc,
  });

  return c.json({
    agentId: input.agentId,
    action: input.action,
    transfer,
    firewall: {
      decision: firewallResult.decision,
      riskLevel: firewallResult.riskLevel,
    },
    metadata: input.metadata,
  });
});
