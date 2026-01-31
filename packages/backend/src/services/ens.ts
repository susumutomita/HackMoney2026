import { createPublicClient, http, isAddress, type Address } from "viem";
import { mainnet } from "viem/chains";

/**
 * ENS is typically registered on Ethereum mainnet.
 * This is READ-ONLY (no gas) and safe to do server-side.
 */
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com";

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(MAINNET_RPC_URL),
});

export function looksLikeEnsName(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v.endsWith(".eth") && !v.startsWith("0x") && v.length > 4;
}

export async function resolveEnsToAddress(name: string): Promise<Address | null> {
  const n = name.trim().toLowerCase();
  if (!looksLikeEnsName(n)) return null;

  const addr = await mainnetClient.getEnsAddress({ name: n });
  if (!addr) return null;
  if (!isAddress(addr)) return null;
  return addr;
}
