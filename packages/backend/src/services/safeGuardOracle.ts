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
 * 1. Monitors Safe wallets for pending transactions
 * 2. Evaluates transactions against ZeroKey policies
 * 3. Submits approve/reject decisions to the ZeroKeySafeGuard contract
 */

const GUARD_ABI = parseAbi([
  "function approveTransaction(address to, uint256 value, bytes data, string reason) external",
  "function rejectTransaction(address to, uint256 value, bytes data, string reason) external",
  "function markPendingHumanApproval(address to, uint256 value, bytes data) external",
  "function approvedTxHashes(bytes32) view returns (bool)",
  "function pendingTransactions(bytes32) view returns (address to, uint256 value, bytes data, uint256 createdAt, bool exists)",
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
   * Compute transaction hash (same as contract)
   */
  computeTxHash(tx: TransactionRequest): Hex {
    return keccak256(encodePacked(["address", "uint256", "bytes"], [tx.to, tx.value, tx.data]));
  }

  /**
   * Check if transaction is already approved
   */
  async isApproved(tx: TransactionRequest): Promise<boolean> {
    const txHash = this.computeTxHash(tx);
    const approved = await this.publicClient.readContract({
      address: this.guardAddress,
      abi: GUARD_ABI,
      functionName: "approvedTxHashes",
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
   * Submit approval to the Guard contract
   */
  async approveTransaction(tx: TransactionRequest, reason: string): Promise<Hex> {
    const hash = await this.walletClient.writeContract({
      address: this.guardAddress,
      abi: GUARD_ABI,
      functionName: "approveTransaction",
      args: [tx.to, tx.value, tx.data, reason],
    });
    return hash;
  }

  /**
   * Submit rejection to the Guard contract
   */
  async rejectTransaction(tx: TransactionRequest, reason: string): Promise<Hex> {
    const hash = await this.walletClient.writeContract({
      address: this.guardAddress,
      abi: GUARD_ABI,
      functionName: "rejectTransaction",
      args: [tx.to, tx.value, tx.data, reason],
    });
    return hash;
  }

  /**
   * Mark transaction as pending human approval
   */
  async markPendingHumanApproval(tx: TransactionRequest): Promise<Hex> {
    const hash = await this.walletClient.writeContract({
      address: this.guardAddress,
      abi: GUARD_ABI,
      functionName: "markPendingHumanApproval",
      args: [tx.to, tx.value, tx.data],
    });
    return hash;
  }

  /**
   * Process a transaction request end-to-end
   */
  async processTransaction(
    tx: TransactionRequest,
    context?: {
      trustScore?: number;
      providerName?: string;
      expectedRecipient?: Address;
    }
  ): Promise<{
    decision: PolicyDecision;
    txHash?: Hex;
  }> {
    // Evaluate
    const decision = await this.evaluateTransaction(tx, context);

    // Submit to contract
    let txHash: Hex | undefined;

    switch (decision.decision) {
      case "APPROVED":
        txHash = await this.approveTransaction(tx, decision.reason);
        break;
      case "REJECTED":
        txHash = await this.rejectTransaction(tx, decision.reason);
        break;
      case "CONFIRM_REQUIRED":
        txHash = await this.markPendingHumanApproval(tx);
        break;
    }

    return { decision, txHash };
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
