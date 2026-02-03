"use client";

import { useMemo } from "react";
import { getAddress, isAddress, type Address } from "viem";
import { useReadContract } from "wagmi";

const BASE_SEPOLIA_CHAIN_ID = 84532;

// ERC-8004 Identity Registry (verified on Base Sepolia)
// https://sepolia.basescan.org/address/0x4102F9b209796b53a18B063A438D05C7C9Af31A2
const ERC8004_IDENTITY_REGISTRY = "0x4102F9b209796b53a18B063A438D05C7C9Af31A2" as const;

const erc8004IdentityAbi = [
  {
    type: "function",
    name: "isRegistered",
    stateMutability: "view",
    inputs: [{ name: "_address", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getTokenId",
    stateMutability: "view",
    inputs: [{ name: "_address", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getAgentProfile",
    stateMutability: "view",
    inputs: [{ name: "_tokenId", type: "uint256" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "capabilitiesHash", type: "bytes32" },
      { name: "registeredAt", type: "uint256" },
      { name: "isActive", type: "bool" },
      { name: "metadata", type: "string" },
    ],
  },
] as const;

function shorten(s: string, left = 10, right = 8) {
  if (s.length <= left + right + 3) return s;
  return `${s.slice(0, left)}…${s.slice(-right)}`;
}

export function Erc8004IdentityCard({ agentAddress }: { agentAddress?: string | null }) {
  const addr = useMemo(() => {
    if (!agentAddress) return null;
    if (!isAddress(agentAddress)) return null;
    return getAddress(agentAddress) as Address;
  }, [agentAddress]);

  const reg = useReadContract({
    address: ERC8004_IDENTITY_REGISTRY,
    abi: erc8004IdentityAbi,
    functionName: "isRegistered",
    args: addr ? [addr] : undefined,
    chainId: BASE_SEPOLIA_CHAIN_ID,
    query: { enabled: !!addr },
  });

  const tokenId = useReadContract({
    address: ERC8004_IDENTITY_REGISTRY,
    abi: erc8004IdentityAbi,
    functionName: "getTokenId",
    args: addr ? [addr] : undefined,
    chainId: BASE_SEPOLIA_CHAIN_ID,
    query: { enabled: !!addr },
  });

  const profile = useReadContract({
    address: ERC8004_IDENTITY_REGISTRY,
    abi: erc8004IdentityAbi,
    functionName: "getAgentProfile",
    // Only call when tokenId is non-zero
    args: typeof tokenId.data === "bigint" && tokenId.data > 0n ? [tokenId.data] : undefined,
    chainId: BASE_SEPOLIA_CHAIN_ID,
    query: { enabled: typeof tokenId.data === "bigint" && tokenId.data > 0n },
  });

  const basescanUrl = `https://sepolia.basescan.org/address/${ERC8004_IDENTITY_REGISTRY}`;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-400">ERC-8004</div>
          <div className="mt-1 text-sm text-gray-200">Onchain Identity Registry (read-only)</div>
        </div>
        <a
          href={basescanUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-cyan-300 hover:text-cyan-200"
        >
          BaseScan ↗
        </a>
      </div>

      {!addr ? (
        <div className="mt-3 text-xs text-gray-400">
          Provider wallet address missing or invalid.
        </div>
      ) : reg.isLoading || tokenId.isLoading ? (
        <div className="mt-3 text-xs text-gray-400">Loading ERC-8004 identity…</div>
      ) : reg.isError || tokenId.isError ? (
        <div className="mt-3 text-xs text-red-200">Failed to read ERC-8004 registry.</div>
      ) : reg.data === false || tokenId.data === 0n ? (
        <div className="mt-3 text-xs text-gray-300">Not registered in the Identity Registry.</div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Token ID</span>
            <span className="text-gray-200">{tokenId.data?.toString()}</span>
          </div>

          {profile.isLoading ? (
            <div className="text-xs text-gray-400">Loading profile…</div>
          ) : profile.isError || !profile.data ? (
            <div className="text-xs text-red-200">Failed to load profile.</div>
          ) : (
            <>
              <div className="flex justify-between text-xs gap-3">
                <span className="text-gray-400">Name</span>
                <span className="text-gray-200 text-right">{profile.data[0]}</span>
              </div>
              <div className="flex justify-between text-xs gap-3">
                <span className="text-gray-400">Endpoint</span>
                <span className="text-gray-200 text-right" title={profile.data[1]}>
                  {shorten(profile.data[1] || "")}
                </span>
              </div>
              <div className="flex justify-between text-xs gap-3">
                <span className="text-gray-400">Active</span>
                <span className="text-gray-200">{profile.data[4] ? "Yes" : "No"}</span>
              </div>
            </>
          )}

          <div className="text-[11px] text-gray-400 pt-1 border-t border-white/10">
            Shows ERC-8004 identity signals on Base Sepolia. (We use this as a trust signal source;
            payments are still governed by ZeroKey policy.)
          </div>
        </div>
      )}
    </div>
  );
}
