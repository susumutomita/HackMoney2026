import SafeApiKit from "@safe-global/api-kit";

// Guard contract addresses per chain
export const GUARD_ADDRESSES: Record<number, string> = {
  11155111: "0x0000000000000000000000000000000000000000", // Sepolia (TODO: deploy)
  84532: "0x0000000000000000000000000000000000000000",    // Base Sepolia
};

export interface PolicyConfig {
  maxTransferValue: bigint;
  dailyLimit: bigint;
  allowArbitraryCalls: boolean;
}

/**
 * Create setGuard transaction for Safe
 */
export async function createSetGuardTx(
  safeAddress: string,
  guardAddress: string,
  _signerAddress: string,
  _chainId: number
): Promise<{ to: string; data: string; value: string }> {
  // Safe's setGuard function selector
  const setGuardSelector = "0xe19a9dd9"; // setGuard(address)
  const paddedGuard = guardAddress.slice(2).padStart(64, "0");
  const data = setGuardSelector + paddedGuard;

  return {
    to: safeAddress,
    data,
    value: "0",
  };
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
