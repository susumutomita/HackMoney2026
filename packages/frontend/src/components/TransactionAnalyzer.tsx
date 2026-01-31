"use client";

import { useEffect, useState, type FormEvent } from "react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { analyzeApi, type AnalysisResult } from "@/lib/api";
import { CHAIN_NAMES, RISK_LABELS } from "@/lib/constants";
import { looksLikeEnsName, resolveEns } from "@/lib/ens";

interface FormData {
  chainId: string;
  to: string;
  value: string;
  data: string;
}

function MagnifyingGlassIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

const RISK_STYLES: Record<number, { bg: string; border: string; text: string; glow: string }> = {
  1: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    glow: "shadow-emerald-500/20",
  },
  2: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    glow: "shadow-amber-500/20",
  },
  3: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-400",
    glow: "shadow-rose-500/20",
  },
};

export function TransactionAnalyzer() {
  const { address, isConnected } = useAccount();
  const [formData, setFormData] = useState<FormData>({
    chainId: "8453",
    to: "",
    value: "",
    data: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedTo, setResolvedTo] = useState<`0x${string}` | null>(null);
  const [isResolvingEns, setIsResolvingEns] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const to = formData.to.trim();
      setResolvedTo(null);

      if (!to) return;
      if (!looksLikeEnsName(to)) return;

      setIsResolvingEns(true);
      try {
        const addr = await resolveEns(to);
        if (cancelled) return;
        setResolvedTo(addr);
      } catch {
        if (cancelled) return;
        setResolvedTo(null);
      } finally {
        if (!cancelled) setIsResolvingEns(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [formData.to]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const valueWei = formData.value ? parseEther(formData.value).toString() : "0";

      const toInput = formData.to.trim();
      const toResolved = looksLikeEnsName(toInput) ? resolvedTo : (toInput as `0x${string}`);

      if (!toResolved) {
        throw new Error("Could not resolve ENS name");
      }

      const analysis = await analyzeApi.analyzeTransaction({
        chainId: parseInt(formData.chainId),
        from: address,
        to: toResolved,
        toLabel: looksLikeEnsName(toInput) ? toInput.toLowerCase() : undefined,
        value: valueWei,
        data: formData.data || undefined,
      });

      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="glass-card glass-card-hover p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Transaction Analyzer</h2>
        <p className="text-slate-400">Connect your wallet to analyze transactions</p>
      </div>
    );
  }

  return (
    <div className="glass-card glass-card-hover p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
          <MagnifyingGlassIcon className="w-5 h-5 text-cyan-400" />
        </div>
        <h2 className="text-lg font-semibold gradient-text">Analyze Transaction</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Chain</label>
          <select
            value={formData.chainId}
            onChange={(e) => setFormData({ ...formData, chainId: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
          >
            {Object.entries(CHAIN_NAMES).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            To Address (0x… or ENS)
          </label>
          <input
            type="text"
            value={formData.to}
            onChange={(e) => setFormData({ ...formData, to: e.target.value })}
            placeholder="0x… or vitalik.eth"
            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all font-mono text-sm"
            required
          />
          {looksLikeEnsName(formData.to) && (
            <p className="mt-2 text-xs text-slate-400 font-mono">
              {isResolvingEns
                ? "Resolving ENS…"
                : resolvedTo
                  ? `Resolved: ${resolvedTo}`
                  : "Could not resolve"}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Value (ETH)</label>
          <input
            type="text"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            placeholder="0.0"
            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Data (optional)</label>
          <input
            type="text"
            value={formData.data}
            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
            placeholder="0x..."
            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all font-mono text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !formData.to}
          className="w-full btn-premium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <SpinnerIcon className="w-5 h-5" />
              Analyzing...
            </>
          ) : (
            <>
              <MagnifyingGlassIcon className="w-5 h-5" />
              Analyze Transaction
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
          <p className="text-rose-400 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-white">Analysis Result</h3>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${RISK_STYLES[result.riskLevel].bg} ${RISK_STYLES[result.riskLevel].border} ${RISK_STYLES[result.riskLevel].text}`}
            >
              {RISK_LABELS[result.riskLevel]} RISK
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-slate-800/30">
              <span className="text-xs text-slate-500">Classification</span>
              <p className="text-sm font-medium text-white capitalize mt-1">
                {result.classification}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/30">
              <span className="text-xs text-slate-500">Decision</span>
              <p
                className={`text-sm font-medium mt-1 ${result.approved ? "text-emerald-400" : "text-rose-400"}`}
              >
                {result.approved ? "APPROVED" : "REJECTED"}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/30">
            <p className="text-sm text-slate-300">{result.reason}</p>
          </div>

          {result.warnings.length > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <h4 className="text-sm font-medium text-amber-400 mb-2">Warnings</h4>
              <ul className="text-sm text-amber-300/80 space-y-1">
                {result.warnings.map((warning, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">!</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.recommendations.length > 0 && (
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
              <h4 className="text-sm font-medium text-cyan-400 mb-2">Recommendations</h4>
              <ul className="text-sm text-cyan-300/80 space-y-1">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">-</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-xs text-slate-600 font-mono truncate pt-2 border-t border-white/5">
            txHash: {result.txHash}
          </div>
        </div>
      )}
    </div>
  );
}
