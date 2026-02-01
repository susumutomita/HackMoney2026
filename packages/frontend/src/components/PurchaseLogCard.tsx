"use client";

import { useEffect, useState } from "react";

type Purchase = {
  id: string;
  txHash: string;
  chainId: number;
  token: string;
  payer: string;
  recipient: string;
  amountUsdc: string;
  providerId: string;
  providerName: string | null;
  firewallDecision: string;
  firewallReason: string;
  createdAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function shortHash(h: string) {
  if (!h || h.length < 10) return h;
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}

function explorerUrl(chainId: number, txHash: string) {
  // Base Sepolia
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${txHash}`;
  return `https://sepolia.basescan.org/tx/${txHash}`;
}

function providerLabel(p: Purchase) {
  if (p.providerName && p.providerName !== p.providerId) {
    return `${p.providerName} (${p.providerId})`;
  }
  return p.providerName ?? p.providerId;
}

export function PurchaseLogCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Purchase[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/purchases`, { cache: "no-store" });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        purchases?: Purchase[];
      };

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to load purchases");
      }

      setRows(json.purchases ?? []);
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
          <h3 className="text-sm font-semibold text-white">Agent Purchase Log</h3>
          <p className="mt-1 text-xs text-slate-400">
            Proof that the agent paid (txHash + firewall rationale)
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
          <div className="text-sm text-slate-400">No purchases yet.</div>
        ) : (
          <div className="space-y-3">
            {rows.slice(0, 5).map((p) => (
              <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-white font-medium">{providerLabel(p)}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                      Verified
                    </span>
                    <span className="text-xs text-slate-300">{p.amountUsdc} USDC</span>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-400">
                  <div>
                    tx:{" "}
                    <a
                      href={explorerUrl(p.chainId, p.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
                      title={p.txHash}
                    >
                      {shortHash(p.txHash)}
                    </a>
                    <span className="ml-2 text-slate-500">(Base Sepolia)</span>
                  </div>
                  <div>
                    decision: <span className="text-slate-200">{p.firewallDecision}</span>
                  </div>
                  <div className="text-slate-300">{p.firewallReason}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
