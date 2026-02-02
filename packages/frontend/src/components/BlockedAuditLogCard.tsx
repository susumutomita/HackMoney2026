"use client";

import { useEffect, useState } from "react";

type FirewallEvent = {
  id: string;
  providerId: string | null;
  providerName: string | null;
  decision: string;
  reason: string;
  attemptedRecipient: string | null;
  amountUsdc: string | null;
  createdAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function providerLabel(e: FirewallEvent) {
  if (e.providerName && e.providerId && e.providerName !== e.providerId) {
    return `${e.providerName} (${e.providerId})`;
  }
  return e.providerName ?? e.providerId ?? "Unknown provider";
}

export function BlockedAuditLogCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<FirewallEvent[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/firewall/events`, { cache: "no-store" });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        events?: FirewallEvent[];
      };

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to load firewall events");
      }

      setRows(json.events ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 backdrop-blur-xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Blocked Audit Log</h3>
          <p className="mt-1 text-xs text-slate-400">
            Proof of intervention (no txHash — money never moved)
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-300">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-slate-400">No blocked events yet.</div>
        ) : (
          <div className="space-y-3">
            {rows.slice(0, 5).map((e) => (
              <div key={e.id} className="rounded-xl border border-red-500/20 bg-red-950/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-white font-medium">{providerLabel(e)}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-1 rounded-md bg-red-500/15 border border-red-500/30 text-red-200">
                      🔴 {e.decision}
                    </span>
                    {e.amountUsdc && (
                      <span className="text-xs text-slate-200">{e.amountUsdc} USDC</span>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-xs text-slate-300 whitespace-pre-line">{e.reason}</div>

                {e.attemptedRecipient && (
                  <div className="mt-2 text-xs text-slate-400">
                    attempted recipient:{" "}
                    <span className="text-slate-200">{e.attemptedRecipient}</span>
                  </div>
                )}

                <div className="mt-2 text-xs text-slate-400">
                  {new Date(e.createdAt).toLocaleString()} —{" "}
                  <span className="text-slate-200">Money never moved</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
