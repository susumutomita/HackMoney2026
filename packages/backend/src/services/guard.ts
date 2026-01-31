/**
 * ZeroKeyGuard On-Chain Service
 * Handles interaction with the ZeroKeyGuard smart contract
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, base, optimism, optimismSepolia, mainnet } from "viem/chains";
import { config } from "../config.js";
import { ZeroKeyGuardAbi } from "../contracts/ZeroKeyGuardAbi.js";

/**
 * Chain configuration mapping
 */
const CHAIN_CONFIG: Record<number, { chain: Chain; rpcUrl?: string }> = {
  1: { chain: mainnet },
  8453: { chain: base },
  84532: { chain: baseSepolia, rpcUrl: config.rpcUrl },
  10: { chain: optimism },
  11155420: { chain: optimismSepolia },
};

/**
 * Contract addresses per chain
 * In production, these would come from environment or deployment config
 */
const CONTRACT_ADDRESSES: Record<number, Address | undefined> = {
  84532: config.guardContractAddress as Address | undefined,
};

/**
 * Decision submission result
 */
export interface SubmitDecisionResult {
  success: boolean;
  txHash?: Hash;
  error?: string;
  chainId: number;
}

/**
 * Guard service for on-chain interactions
 */
class GuardService {
  private publicClients: Map<number, PublicClient> = new Map();
  private walletClients: Map<number, WalletClient> = new Map();

  /**
   * Check if the guard service is configured for a chain
   */
  isConfigured(chainId: number): boolean {
    const chainConfig = CHAIN_CONFIG[chainId];
    const contractAddress = CONTRACT_ADDRESSES[chainId];
    const hasPrivateKey = !!config.policyOraclePrivateKey;

    return !!chainConfig && !!contractAddress && hasPrivateKey;
  }

  /**
   * Get or create a public client for reading contract state
   */
  private getPublicClient(chainId: number): PublicClient {
    let client = this.publicClients.get(chainId);
    if (client) return client;

    const chainConfig = CHAIN_CONFIG[chainId];
    if (!chainConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const transport = chainConfig.rpcUrl ? http(chainConfig.rpcUrl) : http();

    client = createPublicClient({
      chain: chainConfig.chain,
      transport,
    });

    this.publicClients.set(chainId, client);
    return client;
  }

  /**
   * Get or create a wallet client for writing to contract
   */
  private getWalletClient(chainId: number): WalletClient {
    let client = this.walletClients.get(chainId);
    if (client) return client;

    if (!config.policyOraclePrivateKey) {
      throw new Error("POLICY_ORACLE_PRIVATE_KEY is not configured");
    }

    const chainConfig = CHAIN_CONFIG[chainId];
    if (!chainConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const privateKey = config.policyOraclePrivateKey.startsWith("0x")
      ? config.policyOraclePrivateKey
      : `0x${config.policyOraclePrivateKey}`;
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const transport = chainConfig.rpcUrl ? http(chainConfig.rpcUrl) : http();

    client = createWalletClient({
      account,
      chain: chainConfig.chain,
      transport,
    });

    this.walletClients.set(chainId, client);
    return client;
  }

  /**
   * Get the contract address for a chain
   */
  private getContractAddress(chainId: number): Address {
    const address = CONTRACT_ADDRESSES[chainId];
    if (!address) {
      throw new Error(`No contract address configured for chain ID: ${chainId}`);
    }
    return address;
  }

  /**
   * Submit a decision to the ZeroKeyGuard contract
   */
  async submitDecision(
    chainId: number,
    txHash: `0x${string}`,
    approved: boolean,
    riskLevel: number,
    reason: string
  ): Promise<SubmitDecisionResult> {
    // Check if configured
    if (!this.isConfigured(chainId)) {
      return {
        success: false,
        error: `Guard service not configured for chain ${chainId}. Check POLICY_ORACLE_PRIVATE_KEY and GUARD_CONTRACT_ADDRESS.`,
        chainId,
      };
    }

    try {
      const walletClient = this.getWalletClient(chainId);
      const publicClient = this.getPublicClient(chainId);
      const contractAddress = this.getContractAddress(chainId);

      // Convert txHash string to bytes32
      const txHashBytes32 = txHash as `0x${string}`;

      // Simulate the transaction first
      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi: ZeroKeyGuardAbi,
        functionName: "submitDecision",
        args: [txHashBytes32, approved, BigInt(riskLevel), reason],
        account: walletClient.account,
      });

      // Execute the transaction
      const hash = await walletClient.writeContract(request);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      return {
        success: receipt.status === "success",
        txHash: hash,
        chainId,
        error: receipt.status !== "success" ? "Transaction reverted" : undefined,
      };
    } catch (error) {
      console.error(`Failed to submit decision on chain ${chainId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        chainId,
      };
    }
  }

  /**
   * Check if a transaction is approved on-chain
   */
  async isApproved(chainId: number, txHash: `0x${string}`): Promise<boolean | null> {
    const contractAddress = CONTRACT_ADDRESSES[chainId];
    if (!contractAddress) {
      return null; // No contract configured for this chain
    }

    try {
      const publicClient = this.getPublicClient(chainId);

      const isApproved = await publicClient.readContract({
        address: contractAddress,
        abi: ZeroKeyGuardAbi,
        functionName: "isApproved",
        args: [txHash],
      });

      return isApproved;
    } catch (error) {
      console.error(`Failed to check approval status on chain ${chainId}:`, error);
      return null;
    }
  }

  /**
   * Get the policy oracle address from the contract
   */
  async getPolicyOracle(chainId: number): Promise<Address | null> {
    const contractAddress = CONTRACT_ADDRESSES[chainId];
    if (!contractAddress) {
      return null;
    }

    try {
      const publicClient = this.getPublicClient(chainId);

      const oracleAddress = await publicClient.readContract({
        address: contractAddress,
        abi: ZeroKeyGuardAbi,
        functionName: "policyOracle",
      });

      return oracleAddress;
    } catch (error) {
      console.error(`Failed to get policy oracle on chain ${chainId}:`, error);
      return null;
    }
  }

  /**
   * Get configuration status for all supported chains
   */
  getConfigurationStatus(): Record<number, { configured: boolean; contractAddress?: string }> {
    return Object.fromEntries(
      Object.keys(CHAIN_CONFIG).map((key) => {
        const chainId = Number(key);
        return [
          chainId,
          {
            configured: this.isConfigured(chainId),
            contractAddress: CONTRACT_ADDRESSES[chainId],
          },
        ];
      })
    );
  }
}

// Export singleton instance
export const guardService = new GuardService();
