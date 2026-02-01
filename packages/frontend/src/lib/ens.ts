import { createPublicClient, http } from "viem";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";

const DEFAULT_MAINNET_RPC_URL = "https://eth.llamarpc.com";

/** Type for ENS profile data */
export interface EnsProfile {
  name: string | null;
  address: `0x${string}`;
  avatar: string | null;
  description: string | null;
  url: string | null;
  twitter: string | null;
  github: string | null;
  email: string | null;
  /** Custom text record for AI agent API endpoint */
  aiApiEndpoint: string | null;
  /** Custom text record for AI agent service categories */
  aiServiceCategories: string | null;
  /** Custom text record for trust score (set by reputation systems) */
  trustScore: string | null;
}

function createMainnetClient() {
  const rpcUrl = process.env.NEXT_PUBLIC_MAINNET_RPC_URL || DEFAULT_MAINNET_RPC_URL;
  return createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl),
  });
}

/**
 * Check if a string looks like an ENS name
 */
export function looksLikeEnsName(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v.endsWith(".eth") && !v.startsWith("0x") && v.length > 4;
}

/**
 * Resolve an ENS name to an address (forward resolution)
 */
export async function resolveEns(name: string): Promise<`0x${string}` | null> {
  const client = createMainnetClient();
  try {
    const normalizedName = normalize(name.trim().toLowerCase());
    return await client.getEnsAddress({ name: normalizedName });
  } catch {
    return null;
  }
}

/**
 * Reverse resolve an address to an ENS name
 */
export async function reverseResolveEns(address: `0x${string}`): Promise<string | null> {
  const client = createMainnetClient();
  try {
    return await client.getEnsName({ address });
  } catch {
    return null;
  }
}

/**
 * Get ENS avatar URL for a name
 */
export async function getEnsAvatar(name: string): Promise<string | null> {
  const client = createMainnetClient();
  try {
    const normalizedName = normalize(name.trim().toLowerCase());
    return await client.getEnsAvatar({ name: normalizedName });
  } catch {
    return null;
  }
}

/**
 * Get a specific ENS text record
 */
export async function getEnsText(name: string, key: string): Promise<string | null> {
  const client = createMainnetClient();
  try {
    const normalizedName = normalize(name.trim().toLowerCase());
    return await client.getEnsText({ name: normalizedName, key });
  } catch {
    return null;
  }
}

/**
 * Fetch full ENS profile including custom AI agent records
 * This demonstrates creative use of ENS for DeFi/AI agents
 */
export async function getEnsProfile(nameOrAddress: string): Promise<EnsProfile | null> {
  const client = createMainnetClient();

  try {
    let name: string | null = null;
    let address: `0x${string}` | null = null;

    // Determine if input is name or address
    if (looksLikeEnsName(nameOrAddress)) {
      name = normalize(nameOrAddress.trim().toLowerCase());
      address = await client.getEnsAddress({ name });
      if (!address) return null;
    } else if (nameOrAddress.startsWith("0x")) {
      address = nameOrAddress as `0x${string}`;
      name = await client.getEnsName({ address });
    } else {
      return null;
    }

    if (!address) return null;

    // Fetch standard and custom text records in parallel
    const textRecords = name
      ? await Promise.all([
          client.getEnsAvatar({ name }).catch(() => null),
          client.getEnsText({ name, key: "description" }).catch(() => null),
          client.getEnsText({ name, key: "url" }).catch(() => null),
          client.getEnsText({ name, key: "com.twitter" }).catch(() => null),
          client.getEnsText({ name, key: "com.github" }).catch(() => null),
          client.getEnsText({ name, key: "email" }).catch(() => null),
          // Custom AI agent records - creative ENS usage for DeFi
          client.getEnsText({ name, key: "ai.api.endpoint" }).catch(() => null),
          client.getEnsText({ name, key: "ai.services" }).catch(() => null),
          client.getEnsText({ name, key: "ai.trustscore" }).catch(() => null),
        ])
      : [null, null, null, null, null, null, null, null, null];

    return {
      name,
      address,
      avatar: textRecords[0],
      description: textRecords[1],
      url: textRecords[2],
      twitter: textRecords[3],
      github: textRecords[4],
      email: textRecords[5],
      aiApiEndpoint: textRecords[6],
      aiServiceCategories: textRecords[7],
      trustScore: textRecords[8],
    };
  } catch {
    return null;
  }
}

/**
 * Format an address with optional ENS name
 * Returns "name.eth (0x1234...abcd)" or just "0x1234...abcd"
 */
export function formatAddressWithEns(address: `0x${string}`, ensName?: string | null): string {
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
  if (ensName) {
    return `${ensName} (${shortAddr})`;
  }
  return shortAddr;
}

/**
 * Batch resolve multiple addresses to ENS names
 * Useful for displaying provider lists with ENS names
 */
export async function batchReverseResolve(
  addresses: `0x${string}`[]
): Promise<Map<`0x${string}`, string | null>> {
  const client = createMainnetClient();
  const results = new Map<`0x${string}`, string | null>();

  // Process in parallel with rate limiting
  const batchSize = 5;
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);
    const names = await Promise.all(
      batch.map((addr) => client.getEnsName({ address: addr }).catch(() => null))
    );
    batch.forEach((addr, idx) => {
      results.set(addr, names[idx]);
    });
  }

  return results;
}
