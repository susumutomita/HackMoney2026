import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Address,
  type Hex,
  keccak256,
  encodePacked,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

/**
 * Safe Guard Oracle Service
 *
 * This service:
 * 1. Evaluates Safe transactions against ZeroKey policies
 * 2. Calls preApproveTransaction() on SafeZeroKeyGuard to whitelist approved txs
 * 3. When Safe executes, checkTransaction() verifies the pre-approval
 */

const GUARD_ABI = parseAbi([
  "function preApproveTransaction(bytes32 txHash, address safe) external",
  "function preApproved(bytes32) view returns (bool)",
  "function getPolicy(address safe) view returns (bool enabled, uint256 maxTransferValue, uint256 dailyLimit, uint256 dailySpent, bool allowArbitraryCalls)",
  "function policyOracle() view returns (address)",
]);

// ERC20 transfer function selector
const ERC20_TRANSFER_SELECTOR = "0xa9059cbb";

// USDC on Base Sepolia
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

interface OracleConfig {
  guardAddress: Address;
  oraclePrivateKey: Hex;
  rpcUrl?: string;
}

interface TransactionRequest {
  to: Address;
  value: bigint;
  data: Hex;
}

interface PolicyDecision {
  decision: "APPROVED" | "REJECTED" | "CONFIRM_REQUIRED";
  reason: string;
  riskLevel: number;
}

export class SafeGuardOracle {
  private publicClient;
  private walletClient;
  private guardAddress: Address;

  constructor(config: OracleConfig) {
    this.guardAddress = config.guardAddress;

    const account = privateKeyToAccount(config.oraclePrivateKey);
    const rpcUrl = config.rpcUrl || "https://sepolia.base.org";

    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });

    this.walletClient = createWalletClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
      account,
    });
  }

  /**
   * Compute transaction hash (matches SafeZeroKeyGuard.checkTransaction)
   *
   * Contract computes: keccak256(abi.encodePacked(
   *   safe, to, value, keccak256(data), operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver
   * ))
   */
  computeTxHash(
    safe: Address,
    to: Address,
    value: bigint,
    data: Hex,
    operation: number,
    safeTxGas: bigint,
    baseGas: bigint,
    gasPrice: bigint,
    gasToken: Address,
    refundReceiver: Address
  ): Hex {
    const dataHash = keccak256(data);
    return keccak256(
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
        ],
        [
          safe,
          to,
          value,
          dataHash,
          operation as 0 | 1,
          safeTxGas,
          baseGas,
          gasPrice,
          gasToken,
          refundReceiver,
        ]
      )
    );
  }

  /**
   * Check if transaction is already pre-approved
   */
  async isPreApproved(txHash: Hex): Promise<boolean> {
    const approved = await this.publicClient.readContract({
      address: this.guardAddress,
      abi: GUARD_ABI,
      functionName: "preApproved",
      args: [txHash],
    });
    return approved as boolean;
  }

  /**
   * Evaluate a transaction and return policy decision
   */
  async evaluateTransaction(
    tx: TransactionRequest,
    context?: {
      trustScore?: number;
      providerName?: string;
      expectedRecipient?: Address;
    }
  ): Promise<PolicyDecision> {
    // Parse ERC20 transfer if applicable
    const isErc20Transfer = tx.data.startsWith(ERC20_TRANSFER_SELECTOR);

    let recipient = tx.to;
    let amount = tx.value;

    if (isErc20Transfer && tx.data.length >= 138) {
      // Decode ERC20 transfer(address, uint256)
      recipient = ("0x" + tx.data.slice(34, 74)) as Address;
      amount = BigInt("0x" + tx.data.slice(74, 138));
    }

    // Policy checks
    const reasons: string[] = [];
    let riskLevel = 1;
    let decision: "APPROVED" | "REJECTED" | "CONFIRM_REQUIRED" = "APPROVED";

    // Check 1: Trust score
    if (context?.trustScore !== undefined) {
      if (context.trustScore < 20) {
        decision = "REJECTED";
        reasons.push(`Low trust score: ${context.trustScore}`);
        riskLevel = 3;
      } else if (context.trustScore < 50) {
        if (decision === "APPROVED") decision = "CONFIRM_REQUIRED";
        reasons.push(`Moderate trust score: ${context.trustScore}`);
        riskLevel = Math.max(riskLevel, 2);
      }
    }

    // Check 2: Recipient mismatch
    if (context?.expectedRecipient) {
      if (recipient.toLowerCase() !== context.expectedRecipient.toLowerCase()) {
        decision = "REJECTED";
        reasons.push(`Recipient mismatch: expected ${context.expectedRecipient}, got ${recipient}`);
        riskLevel = 3;
      }
    }

    // Check 3: Amount limits (example: >$100 USDC needs human approval)
    if (tx.to.toLowerCase() === USDC_ADDRESS.toLowerCase() && isErc20Transfer) {
      const usdcAmount = Number(amount) / 1e6;
      if (usdcAmount > 100) {
        if (decision === "APPROVED") decision = "CONFIRM_REQUIRED";
        reasons.push(`Large amount: $${usdcAmount} USDC`);
        riskLevel = Math.max(riskLevel, 2);
      }
    }

    if (reasons.length === 0) {
      reasons.push("All policy checks passed");
    }

    return {
      decision,
      reason: reasons.join("; "),
      riskLevel,
    };
  }

  /**
   * Pre-approve a transaction on-chain (only for APPROVED decisions)
   *
   * Calls SafeZeroKeyGuard.preApproveTransaction(txHash, safe)
   * This allows the Safe's checkTransaction() to pass for this specific tx.
   */
  async preApprove(txHash: Hex, safe: Address): Promise<Hex> {
    const hash = await this.walletClient.writeContract({
      address: this.guardAddress,
      abi: GUARD_ABI,
      functionName: "preApproveTransaction",
      args: [txHash, safe],
    });
    return hash;
  }

  /**
   * Process a transaction request end-to-end
   *
   * For APPROVED: calls preApproveTransaction on-chain
   * For REJECTED/CONFIRM_REQUIRED: no on-chain call (tx stays unapproved,
   *   so checkTransaction will enforce policies)
   */
  async processTransaction(
    safe: Address,
    tx: TransactionRequest,
    txHash: Hex,
    context?: {
      trustScore?: number;
      providerName?: string;
      expectedRecipient?: Address;
    }
  ): Promise<{
    decision: PolicyDecision;
    onChainTxHash?: Hex;
  }> {
    // Evaluate
    const decision = await this.evaluateTransaction(tx, context);

    // Only submit on-chain for approved transactions
    let onChainTxHash: Hex | undefined;

    if (decision.decision === "APPROVED") {
      onChainTxHash = await this.preApprove(txHash, safe);
    }

    return { decision, onChainTxHash };
  }
}

// Export singleton factory
let oracleInstance: SafeGuardOracle | null = null;

export function getOracle(): SafeGuardOracle | null {
  if (oracleInstance) return oracleInstance;

  const guardAddress = process.env.GUARD_CONTRACT_ADDRESS as Address;
  const oracleKey = process.env.POLICY_ORACLE_PRIVATE_KEY as Hex;

  if (!guardAddress || !oracleKey) {
    console.warn(
      "SafeGuardOracle not configured: missing GUARD_CONTRACT_ADDRESS or POLICY_ORACLE_PRIVATE_KEY"
    );
    return null;
  }

  oracleInstance = new SafeGuardOracle({
    guardAddress,
    oraclePrivateKey: oracleKey,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL,
  });

  return oracleInstance;
}
