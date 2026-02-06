import { createPublicClient, http, type Address, isAddress } from "viem";
import { mainnet, baseSepolia } from "viem/chains";

/**
 * Trust Score Service
 * Calculates trust score based on on-chain data
 */

const MAINNET_RPC = process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(MAINNET_RPC),
});

const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export interface TrustScoreResult {
  score: number; // 0-100
  breakdown: {
    hasEns: boolean;
    ensName: string | null;
    isVerifiedContract: boolean;
    walletAgeMonths: number;
    transactionCount: number;
    isKnownAddress: boolean;
  };
  calculatedAt: string;
}

// Known trusted addresses with their ENS names
const KNOWN_ADDRESSES: Record<string, { ens: string; description?: string }> = {
  "0xd8da6bf26964af9d7eed9e03e53415d37aa96045": {
    ens: "vitalik.eth",
    description: "Vitalik Buterin",
  },
  "0xb8c2c29ee19d8307cb7255e1cd9cbde883a267d5": {
    ens: "nick.eth",
    description: "Nick Johnson (ENS)",
  },
  "0xab5801a7d398351b8be11c439e05c5b3259aec9b": {
    ens: "vitalik.eth",
    description: "Vitalik (old)",
  },
};

// In-memory cache for trust scores (TTL: 5 minutes)
const trustScoreCache = new Map<string, { result: TrustScoreResult; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Check if address has ENS name
 */
async function checkEns(address: Address): Promise<{ hasEns: boolean; ensName: string | null }> {
  try {
    const ensName = await mainnetClient.getEnsName({ address });
    return { hasEns: !!ensName, ensName };
  } catch {
    return { hasEns: false, ensName: null };
  }
}

/**
 * Check if contract is verified on Basescan
 */
async function checkContractVerified(address: Address): Promise<boolean> {
  if (!BASESCAN_API_KEY) {
    // If no API key, check if it's a contract at all
    try {
      const code = await baseSepoliaClient.getCode({ address });
      // If there's code, it's a contract (but we can't verify without API key)
      return code !== undefined && code !== "0x";
    } catch {
      return false;
    }
  }

  try {
    const url = `https://api-sepolia.basescan.org/api?module=contract&action=getabi&address=${address}&apikey=${BASESCAN_API_KEY}`;
    const res = await fetch(url);
    const data = (await res.json()) as { status: string; result: string };
    // If ABI is returned, contract is verified
    return data.status === "1" && data.result !== "Contract source code not verified";
  } catch {
    return false;
  }
}

/**
 * Get wallet age and transaction count from on-chain
 */
async function getWalletStats(address: Address): Promise<{ ageMonths: number; txCount: number }> {
  try {
    // Get transaction count on Base Sepolia
    const txCount = await baseSepoliaClient.getTransactionCount({ address });

    // For wallet age, we'd need to scan historical data
    // Simplified: use tx count as proxy (more tx = older wallet)
    const estimatedAgeMonths = Math.min(Math.floor(txCount / 10), 36);

    return { ageMonths: estimatedAgeMonths, txCount };
  } catch {
    return { ageMonths: 0, txCount: 0 };
  }
}

/**
 * Check if address is a known trusted address
 */
function checkKnownAddress(address: Address): { isKnown: boolean; ensName: string | null } {
  const entry = KNOWN_ADDRESSES[address.toLowerCase()];
  if (entry) {
    return { isKnown: true, ensName: entry.ens };
  }
  return { isKnown: false, ensName: null };
}

/**
 * Calculate trust score from on-chain data
 *
 * Scoring:
 * - Has ENS name: +25 points
 * - Verified contract: +25 points
 * - Wallet age > 6 months: +15 points
 * - Transaction count > 50: +15 points
 * - Known address: +20 points
 *
 * Base score: 0
 * Max score: 100
 */
export async function calculateTrustScore(address: string): Promise<TrustScoreResult> {
  if (!isAddress(address)) {
    return {
      score: 0,
      breakdown: {
        hasEns: false,
        ensName: null,
        isVerifiedContract: false,
        walletAgeMonths: 0,
        transactionCount: 0,
        isKnownAddress: false,
      },
      calculatedAt: new Date().toISOString(),
    };
  }

  const addr = address as Address;
  const cacheKey = addr.toLowerCase();

  // Check cache first
  const cached = trustScoreCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.result;
  }

  // Parallel fetch all on-chain data with timeout
  const timeoutPromise = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
    Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

  const [ensResult, isVerified, walletStats] = await Promise.all([
    timeoutPromise(checkEns(addr), 3000, { hasEns: false, ensName: null }),
    timeoutPromise(checkContractVerified(addr), 3000, false),
    timeoutPromise(getWalletStats(addr), 3000, { ageMonths: 0, txCount: 0 }),
  ]);

  const knownCheck = checkKnownAddress(addr);

  // Use known ENS name if available, otherwise use on-chain result
  const finalEnsName = knownCheck.ensName || ensResult.ensName;
  const finalHasEns = !!finalEnsName;

  // Calculate score
  let score = 0;

  if (finalHasEns) score += 25;
  if (isVerified) score += 25;
  if (walletStats.ageMonths >= 6) score += 15;
  if (walletStats.txCount >= 50) score += 15;
  if (knownCheck.isKnown) score += 20;

  // Minimum score of 10 for any valid address with transactions
  if (walletStats.txCount > 0 && score < 10) {
    score = 10;
  }

  const result: TrustScoreResult = {
    score: Math.min(score, 100),
    breakdown: {
      hasEns: finalHasEns,
      ensName: finalEnsName,
      isVerifiedContract: isVerified,
      walletAgeMonths: walletStats.ageMonths,
      transactionCount: walletStats.txCount,
      isKnownAddress: knownCheck.isKnown,
    },
    calculatedAt: new Date().toISOString(),
  };

  // Cache the result
  trustScoreCache.set(cacheKey, { result, expiry: Date.now() + CACHE_TTL_MS });

  return result;
}

/**
 * Batch calculate trust scores for multiple addresses
 */
export async function calculateTrustScoreBatch(
  addresses: string[]
): Promise<Map<string, TrustScoreResult>> {
  const results = new Map<string, TrustScoreResult>();

  // Process in parallel with concurrency limit
  const BATCH_SIZE = 5;
  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    const batch = addresses.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (addr) => ({
        addr,
        result: await calculateTrustScore(addr),
      }))
    );
    batchResults.forEach(({ addr, result }) => {
      results.set(addr.toLowerCase(), result);
    });
  }

  return results;
}
