"use client";

import { useMemo } from "react";
import { useAccount, useBalance } from "wagmi";

const BASE_SEPOLIA_CHAIN_ID = 84532;
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

export function DemoBalanceGuard({ minUsdc = 0.05 }: { minUsdc?: number }) {
  const { address, chainId, isConnected } = useAccount();

  const eth = useBalance({
    address,
    chainId: BASE_SEPOLIA_CHAIN_ID,
    query: { enabled: !!address },
  });

  const usdc = useBalance({
    address,
    chainId: BASE_SEPOLIA_CHAIN_ID,
    token: USDC_BASE_SEPOLIA,
    query: { enabled: !!address },
  });

  const onWrongChain = isConnected && chainId !== undefined && chainId !== BASE_SEPOLIA_CHAIN_ID;

  const ethFloat = Number(eth.data?.formatted ?? "0");
  const usdcFloat = Number(usdc.data?.formatted ?? "0");

  const needsEth = eth.isSuccess && ethFloat <= 0.00005;
  const needsUsdc = usdc.isSuccess && usdcFloat < minUsdc;

  const status = useMemo(() => {
    if (!isConnected) return "disconnected" as const;
    if (onWrongChain) return "wrong_chain" as const;
    if (eth.isLoading || usdc.isLoading) return "loading" as const;
    if (needsEth || needsUsdc) return "insufficient" as const;
    return "ok" as const;
  }, [eth.isLoading, isConnected, needsEth, needsUsdc, onWrongChain, usdc.isLoading]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-400">
            Demo readiness (Base Sepolia)
          </div>
          <div className="mt-1 text-sm text-gray-200">
            {status === "ok"
              ? "✅ Wallet funded"
              : status === "loading"
                ? "Checking wallet balances…"
                : status === "wrong_chain"
                  ? "⚠️ Wrong network"
                  : status === "insufficient"
                    ? "⛔ Insufficient funds"
                    : "Connect wallet"}
          </div>
        </div>

        <div className="text-xs text-gray-400 space-y-1">
          <div>
            ETH: <span className="text-gray-200">{eth.data?.formatted ?? "—"}</span>
          </div>
          <div>
            USDC: <span className="text-gray-200">{usdc.data?.formatted ?? "—"}</span>
          </div>
        </div>
      </div>

      {status === "wrong_chain" && (
        <div className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-950/30 p-3">
          <div className="text-sm text-yellow-100 font-medium">Switch to Base Sepolia</div>
          <div className="mt-1 text-xs text-yellow-200/80">
            The demo is configured for Base Sepolia (USDC) to keep settlement verifiable.
          </div>
        </div>
      )}

      {status === "insufficient" && (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-950/30 p-3">
          <div className="text-sm text-red-100 font-medium">Funds required for live demo</div>
          <ul className="mt-2 text-xs text-red-100/90 list-disc list-inside space-y-1">
            {needsEth && <li>Add a small amount of Base Sepolia ETH (gas).</li>}
            {needsUsdc && <li>Fund at least {minUsdc} USDC on Base Sepolia.</li>}
            <li>
              Backup plan: run only the <span className="font-semibold">Blocked</span> flow (Money
              never moved).
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
