import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const DEFAULT_MAINNET_RPC_URL = "https://eth.llamarpc.com";

export function looksLikeEnsName(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v.endsWith(".eth") && !v.startsWith("0x") && v.length > 4;
}

export async function resolveEns(name: string): Promise<`0x${string}` | null> {
  const rpcUrl = process.env.NEXT_PUBLIC_MAINNET_RPC_URL || DEFAULT_MAINNET_RPC_URL;

  const client = createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl),
  });

  return client.getEnsAddress({ name: name.trim().toLowerCase() });
}
