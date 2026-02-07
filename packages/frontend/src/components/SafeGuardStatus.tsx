"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface GuardStatus {
  safeAddress: string;
  isProtected: boolean;
  guardAddress: string | null;
  registeredAt: string | null;
  policyCount: number;
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

export function SafeGuardStatus({ safeAddress }: { safeAddress?: string }) {
  const [status, setStatus] = useState<GuardStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!safeAddress) return;

    async function fetchStatus() {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/guard/status/${safeAddress}`);
        if (res.ok) {
          setStatus(await res.json());
        }
      } catch {
        // Silently fail -- card will show setup CTA
      } finally {
        setIsLoading(false);
      }
    }

    fetchStatus();
  }, [safeAddress]);

  return (
    <div className="glass-card glass-card-hover p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-cyan-500/20">
            <ShieldIcon className="w-5 h-5 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold gradient-text">Safe Guard</h2>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <div className="w-full h-5 bg-slate-700/50 rounded animate-pulse" />
          <div className="w-2/3 h-4 bg-slate-700/50 rounded animate-pulse" />
        </div>
      )}

      {!isLoading && status && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                status.isProtected ? "bg-emerald-400 status-pulse" : "bg-amber-400"
              }`}
            />
            <span
              className={`text-sm font-medium ${
                status.isProtected ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {status.isProtected ? "Protected" : "Not Protected"}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono truncate">{status.safeAddress}</p>
          {status.policyCount > 0 && (
            <p className="text-xs text-slate-400">{status.policyCount} active policies</p>
          )}
        </div>
      )}

      {!isLoading && !status && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Protect your Safe multisig with AI-powered transaction analysis.
          </p>
        </div>
      )}

      <Link
        href="/setup"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        {status?.isProtected ? "Manage Guard" : "Set up Guard"}
        <ArrowRightIcon className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
