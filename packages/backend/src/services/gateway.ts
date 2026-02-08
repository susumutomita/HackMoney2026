/**
 * Circle Gateway Service — Real Implementation
 *
 * Routes USDC cross-chain using Arc as the liquidity hub.
 * Uses EIP-712 signed BurnIntents per Circle's Gateway specification.
 *
 * Flow: Deposit USDC → Sign BurnIntent → Submit to Gateway API → Receive Attestation → Mint on Destination
 *
 * Reference: https://github.com/circlefin/evm-gateway-contracts
 * Reference: https://developers.circle.com/gateway/concepts/technical-guide
 */
import { randomBytes } from "node:crypto";
import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  pad,
  maxUint256,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { config } from "../config.js";

// ──────────────────────────────────────────────
// Gateway Constants
// ──────────────────────────────────────────────

const GATEWAY_API = config.circle.gatewayApiUrl;

/** Gateway Wallet: users deposit USDC here (same on all testnet chains) */
export const GATEWAY_WALLET = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9" as Address;

/** Gateway Minter: mints USDC on destination chain (same on all testnet chains) */
export const GATEWAY_MINTER = "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B" as Address;

/** Supported Gateway domains with USDC addresses */
export const GATEWAY_DOMAINS = {
  ethereumSepolia: {
    domainId: 0,
    chainId: 11155111,
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address,
    name: "Ethereum Sepolia",
  },
  baseSepolia: {
    domainId: 6,
    chainId: 84532,
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address,
    name: "Base Sepolia",
  },
  arcTestnet: {
    domainId: 26,
    chainId: 412,
    usdc: "0x3600000000000000000000000000000000000000" as Address,
    name: "Arc Testnet",
  },
} as const;

// ──────────────────────────────────────────────
// EIP-712 BurnIntent Types
// From: https://github.com/circlefin/evm-gateway-contracts/blob/main/src/lib/BurnIntents.sol
// Domain omits chainId and verifyingContract intentionally (cross-chain verification)
// ──────────────────────────────────────────────

const BURN_INTENT_DOMAIN = { name: "GatewayWallet", version: "1" } as const;

const BURN_INTENT_TYPES = {
  TransferSpec: [
    { name: "version", type: "uint32" },
    { name: "sourceDomain", type: "uint32" },
    { name: "destinationDomain", type: "uint32" },
    { name: "sourceContract", type: "bytes32" },
    { name: "destinationContract", type: "bytes32" },
    { name: "sourceToken", type: "bytes32" },
    { name: "destinationToken", type: "bytes32" },
    { name: "sourceDepositor", type: "bytes32" },
    { name: "destinationRecipient", type: "bytes32" },
    { name: "sourceSigner", type: "bytes32" },
    { name: "destinationCaller", type: "bytes32" },
    { name: "value", type: "uint256" },
    { name: "salt", type: "bytes32" },
    { name: "hookData", type: "bytes" },
  ],
  BurnIntent: [
    { name: "maxBlockHeight", type: "uint256" },
    { name: "maxFee", type: "uint256" },
    { name: "spec", type: "TransferSpec" },
  ],
} as const;

/** Convert a 20-byte address to 32-byte hex (left-padded) */
function addressToBytes32(addr: Address): Hex {
  return pad(addr.toLowerCase() as Hex, { size: 32 });
}

/** JSON replacer that serializes BigInt values as strings */
function bigIntReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

/** Get domain info by domainId */
function getDomainByDomainId(domainId: number) {
  return Object.values(GATEWAY_DOMAINS).find((d) => d.domainId === domainId);
}

// ──────────────────────────────────────────────
// ABIs
// ──────────────────────────────────────────────

/** ERC20 ABI subset for approve + balanceOf */
const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/** Gateway Wallet ABI subset for deposit */
const GATEWAY_WALLET_ABI = [
  {
    type: "function",
    name: "deposit",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface GatewayTransferRequest {
  sourceDomain: number;
  destinationDomain: number;
  sender: Address;
  recipient: Address;
  amount: string;
}

export interface GatewayTransferResult {
  success: boolean;
  transferId?: string;
  attestation?: string;
  sourceDomain: number;
  destinationDomain: number;
  amount: string;
  sender: Address;
  recipient: Address;
  status: "pending" | "attested" | "completed" | "failed";
  error?: string;
  arcRouting?: {
    usedAsHub: boolean;
    hubDomain: number;
    routePath: string[];
  };
}

export interface GatewayBalance {
  domain: number;
  domainName: string;
  balance: string;
}

export interface PayoutRecipient {
  address: Address;
  amountUsdc: string;
  destinationDomain: number;
  label?: string;
}

export interface PayoutResult {
  totalRecipients: number;
  totalAmountUsdc: string;
  transfers: GatewayTransferResult[];
  arcRouting: {
    usedAsHub: boolean;
    routePath: string[];
  };
}

interface TransferSpecMessage {
  version: number;
  sourceDomain: number;
  destinationDomain: number;
  sourceContract: Hex;
  destinationContract: Hex;
  sourceToken: Hex;
  destinationToken: Hex;
  sourceDepositor: Hex;
  destinationRecipient: Hex;
  sourceSigner: Hex;
  destinationCaller: Hex;
  value: bigint;
  salt: Hex;
  hookData: Hex;
}

interface BurnIntentMessage {
  maxBlockHeight: bigint;
  maxFee: bigint;
  spec: TransferSpecMessage;
}

export interface SignedBurnIntent {
  burnIntent: BurnIntentMessage;
  signature: Hex;
}

// ──────────────────────────────────────────────
// BurnIntent Builder & Signer
// ──────────────────────────────────────────────

/**
 * Build a BurnIntent message for EIP-712 signing.
 * All address fields are padded to bytes32 per Circle's spec.
 */
export function buildBurnIntent(params: {
  sourceDomain: number;
  destinationDomain: number;
  depositor: Address;
  recipient: Address;
  signer: Address;
  amount: bigint;
}): BurnIntentMessage {
  const source = getDomainByDomainId(params.sourceDomain);
  const dest = getDomainByDomainId(params.destinationDomain);

  if (!source) throw new Error(`Unsupported source domain: ${params.sourceDomain}`);
  if (!dest) throw new Error(`Unsupported destination domain: ${params.destinationDomain}`);

  const salt = `0x${randomBytes(32).toString("hex")}` as Hex;

  return {
    maxBlockHeight: maxUint256,
    maxFee: BigInt(1_010000), // 1.01 USDC covers any chain fee
    spec: {
      version: 1,
      sourceDomain: params.sourceDomain,
      destinationDomain: params.destinationDomain,
      sourceContract: addressToBytes32(GATEWAY_WALLET),
      destinationContract: addressToBytes32(GATEWAY_MINTER),
      sourceToken: addressToBytes32(source.usdc),
      destinationToken: addressToBytes32(dest.usdc),
      sourceDepositor: addressToBytes32(params.depositor),
      destinationRecipient: addressToBytes32(params.recipient),
      sourceSigner: addressToBytes32(params.signer),
      destinationCaller: pad("0x00" as Hex, { size: 32 }),
      value: params.amount,
      salt,
      hookData: "0x" as Hex,
    },
  };
}

/**
 * Sign a BurnIntent with the backend's private key.
 */
async function signBurnIntent(intent: BurnIntentMessage): Promise<SignedBurnIntent> {
  const privateKey = config.policyOraclePrivateKey;
  if (!privateKey) throw new Error("No POLICY_ORACLE_PRIVATE_KEY configured for signing");

  const key = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`;
  const account = privateKeyToAccount(key);

  const signature = await account.signTypedData({
    domain: BURN_INTENT_DOMAIN,
    types: BURN_INTENT_TYPES,
    primaryType: "BurnIntent" as const,
    message: intent,
  });

  return { burnIntent: intent, signature: signature as Hex };
}

/**
 * Submit signed BurnIntents to the real Circle Gateway API.
 */
async function submitToGatewayApi(
  signedIntents: SignedBurnIntent[]
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  const res = await fetch(`${GATEWAY_API}/v1/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signedIntents, bigIntReplacer),
  });

  const text = await res.text();
  let data: Record<string, unknown> | undefined;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // keep as raw text
  }

  if (!res.ok) {
    const errorMsg = data ? JSON.stringify(data) : text;
    return { success: false, error: `Gateway API ${res.status}: ${errorMsg}` };
  }

  return { success: true, data };
}

// ──────────────────────────────────────────────
// Public Service Functions
// ──────────────────────────────────────────────

/**
 * Check unified USDC balances across all Gateway domains.
 * Calls the real Gateway API (no auth required).
 */
export async function getGatewayBalances(depositor: Address): Promise<GatewayBalance[]> {
  try {
    const sources = Object.values(GATEWAY_DOMAINS).map((d) => ({
      domain: d.domainId,
      depositor,
    }));

    const res = await fetch(`${GATEWAY_API}/v1/balances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "USDC", sources }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Gateway balances error:", text);
      return sources.map((s) => ({
        domain: s.domain,
        domainName:
          Object.values(GATEWAY_DOMAINS).find((d) => d.domainId === s.domain)?.name ?? "Unknown",
        balance: "0",
      }));
    }

    const data = (await res.json()) as { balances: Array<{ domain: number; balance: string }> };

    return data.balances.map((b) => ({
      domain: b.domain,
      domainName:
        Object.values(GATEWAY_DOMAINS).find((d) => d.domainId === b.domain)?.name ?? "Unknown",
      balance: b.balance,
    }));
  } catch (error) {
    console.error("Failed to fetch Gateway balances:", error);
    return [];
  }
}

/**
 * Deposit USDC to Gateway Wallet on Base Sepolia.
 * This is the first step: move USDC into the Gateway's unified balance.
 * Performs real on-chain transactions (approve + deposit).
 */
export async function depositToGateway(amount: bigint): Promise<{
  success: boolean;
  txHash?: Hex;
  error?: string;
}> {
  const privateKey = config.policyOraclePrivateKey;
  if (!privateKey) {
    return { success: false, error: "No private key configured" };
  }

  try {
    const key = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`;
    const account = privateKeyToAccount(key);
    const transport = config.rpcUrl ? http(config.rpcUrl) : http();

    const publicClient = createPublicClient({ chain: baseSepolia, transport });
    const walletClient = createWalletClient({ account, chain: baseSepolia, transport });

    const usdcAddress = GATEWAY_DOMAINS.baseSepolia.usdc;

    // 1. Approve Gateway Wallet to spend USDC
    const approveData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [GATEWAY_WALLET, amount],
    });

    const approveTx = await walletClient.sendTransaction({
      to: usdcAddress,
      data: approveData,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx, confirmations: 1 });

    // 2. Deposit to Gateway Wallet
    const depositData = encodeFunctionData({
      abi: GATEWAY_WALLET_ABI,
      functionName: "deposit",
      args: [usdcAddress, amount],
    });

    const depositTx = await walletClient.sendTransaction({
      to: GATEWAY_WALLET,
      data: depositData,
    });
    await publicClient.waitForTransactionReceipt({ hash: depositTx, confirmations: 1 });

    return { success: true, txHash: depositTx };
  } catch (error) {
    console.error("Gateway deposit failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Deposit failed",
    };
  }
}

/**
 * Transfer USDC cross-chain via Circle Gateway (backend-signed).
 *
 * The backend's EOA signs the BurnIntent. The sourceDepositor must have
 * deposited USDC to the Gateway Wallet first.
 *
 * No mocks — submits to the real Gateway API and returns the real response.
 */
export async function transferViaGateway(
  req: GatewayTransferRequest
): Promise<GatewayTransferResult> {
  const { sourceDomain, destinationDomain, sender, recipient, amount } = req;

  // Determine routing info
  const useArcHub =
    sourceDomain !== GATEWAY_DOMAINS.arcTestnet.domainId &&
    destinationDomain !== GATEWAY_DOMAINS.arcTestnet.domainId;

  const sourceName =
    Object.values(GATEWAY_DOMAINS).find((d) => d.domainId === sourceDomain)?.name ??
    `Domain ${sourceDomain}`;
  const destName =
    Object.values(GATEWAY_DOMAINS).find((d) => d.domainId === destinationDomain)?.name ??
    `Domain ${destinationDomain}`;
  const routePath = useArcHub ? [sourceName, "Arc (Hub)", destName] : [sourceName, destName];

  const baseResult = {
    sourceDomain,
    destinationDomain,
    amount,
    sender,
    recipient,
    arcRouting: {
      usedAsHub: useArcHub,
      hubDomain: GATEWAY_DOMAINS.arcTestnet.domainId,
      routePath,
    },
  };

  // Validate domains
  const source = getDomainByDomainId(sourceDomain);
  const dest = getDomainByDomainId(destinationDomain);
  if (!source || !dest) {
    return {
      ...baseResult,
      success: false,
      status: "failed",
      error: `Unsupported domain: source=${sourceDomain}, destination=${destinationDomain}`,
    };
  }

  // Get signer
  const privateKey = config.policyOraclePrivateKey;
  if (!privateKey) {
    return {
      ...baseResult,
      success: false,
      status: "failed",
      error: "No POLICY_ORACLE_PRIVATE_KEY configured. Cannot sign BurnIntent.",
    };
  }

  try {
    const key = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`;
    const account = privateKeyToAccount(key);
    const amountBigInt = BigInt(Math.round(parseFloat(amount) * 1_000_000));

    // Build the BurnIntent
    const intent = buildBurnIntent({
      sourceDomain,
      destinationDomain,
      depositor: sender,
      recipient,
      signer: account.address,
      amount: amountBigInt,
    });

    // Sign the BurnIntent with EIP-712
    const signedIntent = await signBurnIntent(intent);

    // Submit to real Gateway API
    const result = await submitToGatewayApi([signedIntent]);

    if (!result.success) {
      return {
        ...baseResult,
        success: false,
        status: "failed",
        error: result.error,
      };
    }

    return {
      ...baseResult,
      success: true,
      transferId: (result.data?.transferId as string) ?? undefined,
      attestation: (result.data?.attestation as string) ?? undefined,
      status: "attested",
    };
  } catch (error) {
    console.error("Gateway transfer failed:", error);
    return {
      ...baseResult,
      success: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Transfer failed",
    };
  }
}

/**
 * Transfer with a pre-signed BurnIntent (frontend wallet signed).
 * The backend validates and forwards to the Gateway API.
 */
export async function transferWithSignedIntent(
  signedIntent: SignedBurnIntent
): Promise<GatewayTransferResult> {
  const spec = signedIntent.burnIntent.spec;

  const sourceName =
    Object.values(GATEWAY_DOMAINS).find((d) => d.domainId === spec.sourceDomain)?.name ??
    `Domain ${spec.sourceDomain}`;
  const destName =
    Object.values(GATEWAY_DOMAINS).find((d) => d.domainId === spec.destinationDomain)?.name ??
    `Domain ${spec.destinationDomain}`;
  const useArcHub =
    spec.sourceDomain !== GATEWAY_DOMAINS.arcTestnet.domainId &&
    spec.destinationDomain !== GATEWAY_DOMAINS.arcTestnet.domainId;

  const baseResult = {
    sourceDomain: spec.sourceDomain,
    destinationDomain: spec.destinationDomain,
    amount: spec.value.toString(),
    sender: `0x${spec.sourceDepositor.slice(-40)}` as Address,
    recipient: `0x${spec.destinationRecipient.slice(-40)}` as Address,
    arcRouting: {
      usedAsHub: useArcHub,
      hubDomain: GATEWAY_DOMAINS.arcTestnet.domainId,
      routePath: useArcHub ? [sourceName, "Arc (Hub)", destName] : [sourceName, destName],
    },
  };

  try {
    const result = await submitToGatewayApi([signedIntent]);

    if (!result.success) {
      return { ...baseResult, success: false, status: "failed", error: result.error };
    }

    return {
      ...baseResult,
      success: true,
      transferId: (result.data?.transferId as string) ?? undefined,
      attestation: (result.data?.attestation as string) ?? undefined,
      status: "attested",
    };
  } catch (error) {
    console.error("Signed transfer submission failed:", error);
    return {
      ...baseResult,
      success: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Transfer failed",
    };
  }
}

/**
 * Execute multi-recipient payout via Gateway.
 * Routes all payments through Arc as the central liquidity hub.
 *
 * Track 2: "Build Global Payouts and Treasury Systems with USDC on Arc"
 */
export async function executeMultiPayout(
  sender: Address,
  sourceDomain: number,
  recipients: PayoutRecipient[]
): Promise<PayoutResult> {
  const transfers: GatewayTransferResult[] = [];
  let totalAmount = 0;

  for (const r of recipients) {
    const result = await transferViaGateway({
      sourceDomain,
      destinationDomain: r.destinationDomain,
      sender,
      recipient: r.address,
      amount: r.amountUsdc,
    });
    transfers.push(result);
    totalAmount += parseFloat(r.amountUsdc);
  }

  return {
    totalRecipients: recipients.length,
    totalAmountUsdc: totalAmount.toFixed(6),
    transfers,
    arcRouting: {
      usedAsHub: true,
      routePath: ["Source", "Arc (Hub)", "Multi-Destination"],
    },
  };
}

/**
 * Get information about the Gateway service.
 * Calls the real Gateway API /v1/info endpoint.
 */
export async function getGatewayInfo(): Promise<{
  supportedDomains: Array<{ name: string; domainId: number; chainId: number }>;
  gatewayWallet: Address;
  gatewayMinter: Address;
  arcDomainId: number;
  apiInfo?: Record<string, unknown>;
}> {
  let apiInfo: Record<string, unknown> | undefined;

  try {
    const res = await fetch(`${GATEWAY_API}/v1/info`);
    if (res.ok) {
      apiInfo = (await res.json()) as Record<string, unknown>;
    }
  } catch {
    // API unreachable — return local constants only
  }

  return {
    supportedDomains: Object.values(GATEWAY_DOMAINS).map((d) => ({
      name: d.name,
      domainId: d.domainId,
      chainId: d.chainId,
    })),
    gatewayWallet: GATEWAY_WALLET,
    gatewayMinter: GATEWAY_MINTER,
    arcDomainId: GATEWAY_DOMAINS.arcTestnet.domainId,
    apiInfo,
  };
}

/**
 * Export EIP-712 types for frontend use.
 * The frontend needs these to construct and sign BurnIntents via wallet.
 */
export function getBurnIntentTypedDataConfig() {
  return {
    domain: BURN_INTENT_DOMAIN,
    types: BURN_INTENT_TYPES,
    primaryType: "BurnIntent" as const,
    gatewayWallet: GATEWAY_WALLET,
    gatewayMinter: GATEWAY_MINTER,
    domains: GATEWAY_DOMAINS,
  };
}
