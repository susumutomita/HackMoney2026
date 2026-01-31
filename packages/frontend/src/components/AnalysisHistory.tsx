"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { analyzeApi, type StoredAnalysisResult } from "@/lib/api";
import { CHAIN_NAMES, RISK_LABELS, formatAddress, formatTimestamp } from "@/lib/constants";

function ClockIcon({ className }: { className?: string }) {
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
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function ArrowPathIcon({ className }: { className?: string }) {
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
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

const RISK_STYLES: Record<number, { bg: string; text: string }> = {
  1: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  2: { bg: "bg-amber-500/20", text: "text-amber-400" },
  3: { bg: "bg-rose-500/20", text: "text-rose-400" },
};

export function AnalysisHistory() {
  const [results, setResults] = useState<StoredAnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = async () => {
    try {
      setIsLoading(true);
      const data = await analyzeApi.getRecent(10);
      setResults(data.results);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch results");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  return (
    <div className="glass-card glass-card-hover p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20">
            <ClockIcon className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold gradient-text">Recent Analyses</h2>
        </div>
        <button
          onClick={fetchResults}
          disabled={isLoading}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-50 transition-all"
          title="Refresh"
        >
          <ArrowPathIcon className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-4">
          <p className="text-rose-400 text-sm">{error}</p>
        </div>
      )}

      {results.length === 0 && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center mb-4">
            <ClockIcon className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-slate-500">No analysis results yet</p>
          <p className="text-xs text-slate-600 mt-1">Analyze a transaction to see results here</p>
        </div>
      )}

      {isLoading && results.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-800/30 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-5 bg-slate-700/50 rounded" />
                <div className="w-12 h-5 bg-slate-700/50 rounded" />
              </div>
              <div className="w-full h-4 bg-slate-700/50 rounded mb-2" />
              <div className="w-2/3 h-4 bg-slate-700/50 rounded" />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
        {results.map((result, index) => (
          <div
            key={result.id}
            className="p-4 rounded-xl bg-slate-800/30 border border-white/5 hover:border-white/10 transition-all animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-medium ${RISK_STYLES[result.analysis.riskLevel].bg} ${RISK_STYLES[result.analysis.riskLevel].text}`}
                >
                  {RISK_LABELS[result.analysis.riskLevel]}
                </span>
                <span className="text-xs text-slate-500 capitalize px-2 py-0.5 bg-slate-800/50 rounded-md">
                  {result.analysis.classification}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                    result.analysis.approved
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-rose-500/10 text-rose-400"
                  }`}
                >
                  {result.analysis.approved ? "Approved" : "Rejected"}
                </span>
              </div>
              <span className="text-xs text-slate-600">{formatTimestamp(result.analyzedAt)}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <span className="font-mono text-slate-300">
                {formatAddress(result.transaction.to)}
              </span>
              <span className="text-slate-600">-</span>
              <span className="text-white font-medium">
                {formatEther(BigInt(result.transaction.value))} ETH
              </span>
              <span className="text-slate-600">-</span>
              <span className="text-slate-500">
                {CHAIN_NAMES[result.transaction.chainId] || `Chain ${result.transaction.chainId}`}
              </span>
            </div>

            <p className="text-sm text-slate-400 line-clamp-2">{result.analysis.reason}</p>

            <div className="text-xs text-slate-700 font-mono mt-3 truncate">{result.txHash}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
