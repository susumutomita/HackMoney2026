import SafeApiKit from "@safe-global/api-kit";
import Safe from "@safe-global/protocol-kit";
import { type WalletClient } from "viem";

// Guard contract addresses per chain (to be updated after deployment)
export const GUARD_ADDRESSES: Record<number, string> = {
  11155111: "0x0000000000000000000000000000000000000000", // Sepolia
  84532: "0x0000000000000000000000000000000000000000",    // Base Sepolia
};

export interface PolicyConfig {
  maxTransferValue: string; // wei
  dailyLimit: string;       // wei
  allowArbitraryCalls: boolean;
}

/**
 * Get Safe API Kit for transaction service
 */
export function getSafeApiKit(chainId: number): SafeApiKit {
  return new SafeApiKit({ chainId: BigInt(chainId) });
}

/**
 * Check if an address is a Safe
 */
export async function isSafeAddress(
  address: string,
  chainId: number
): Promise<boolean> {
  try {
    const apiKit = getSafeApiKit(chainId);
    await apiKit.getSafeInfo(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create and propose setGuard transaction
 */
export async function proposeSetGuard(
  safeAddress: string,
  guardAddress: string,
  signerAddress: string,
  chainId: number,
  walletClient: WalletClient
): Promise<{ safeTxHash: string }> {
  // Initialize Safe Protocol Kit
  const protocolKit = await Safe.init({
    provider: walletClient.transport,
    signer: signerAddress,
    safeAddress,
  });

  // Create setGuard transaction
  // setGuard(address) selector = 0xe19a9dd9
  const setGuardData = `0xe19a9dd9${guardAddress.slice(2).padStart(64, "0")}`;
  
  const safeTransaction = await protocolKit.createTransaction({
    transactions: [{
      to: safeAddress,
      value: "0",
      data: setGuardData,
    }],
  });

  // Sign the transaction
  const signedTx = await protocolKit.signTransaction(safeTransaction);
  
  // Get transaction hash
  const safeTxHash = await protocolKit.getTransactionHash(signedTx);

  // Propose to Safe Transaction Service
  const apiKit = getSafeApiKit(chainId);
  await apiKit.proposeTransaction({
    safeAddress,
    safeTransactionData: signedTx.data,
    safeTxHash,
    senderAddress: signerAddress,
    senderSignature: signedTx.signatures.get(signerAddress.toLowerCase())?.data || "",
  });

  return { safeTxHash };
}

/**
 * Execute a pending Safe transaction
 */
export async function executeTransaction(
  safeAddress: string,
  safeTxHash: string,
  signerAddress: string,
  chainId: number,
  walletClient: WalletClient
): Promise<{ txHash: string }> {
  const protocolKit = await Safe.init({
    provider: walletClient.transport,
    signer: signerAddress,
    safeAddress,
  });

  const apiKit = getSafeApiKit(chainId);
  const safeTransaction = await apiKit.getTransaction(safeTxHash);
  
  const executeTxResponse = await protocolKit.executeTransaction(safeTransaction);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txResponse = executeTxResponse.transactionResponse as any;
  const receipt = txResponse?.wait ? await txResponse.wait() : null;
  
  return { txHash: receipt?.hash || "" };
}

/**
 * Get pending transactions for a Safe
 */
export async function getPendingTransactions(
  safeAddress: string,
  chainId: number
) {
  const apiKit = getSafeApiKit(chainId);
  const pendingTxs = await apiKit.getPendingTransactions(safeAddress);
  return pendingTxs.results;
}
