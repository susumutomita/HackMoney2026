"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface GatewayDomain {
  name: string;
  domainId: number;
  chainId: number;
}

interface GatewayBalance {
  domain: number;
  domainName: string;
  balance: string;
}

interface TransferResult {
  success: boolean;
  transferId?: string;
  amount: string;
  sender: string;
  recipient: string;
  status: string;
  arcRouting?: {
    usedAsHub: boolean;
    routePath: string[];
  };
  firewall?: {
    decision: string;
    riskLevel: number;
    reasons: string[];
  };
  error?: string;
}

const DOMAINS: GatewayDomain[] = [
  { name: "Base Sepolia", domainId: 6, chainId: 84532 },
  { name: "Arc Testnet", domainId: 26, chainId: 412 },
  { name: "Ethereum Sepolia", domainId: 0, chainId: 11155111 },
];

export function CrosschainPanel() {
  const { address } = useAccount();
  const [balances, setBalances] = useState<GatewayBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);
  const [sourceDomain, setSourceDomain] = useState(6);
  const [destDomain, setDestDomain] = useState(26);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("1.00");
  const [tab, setTab] = useState<"transfer" | "payout">("transfer");

  // Payout state
  const [payoutRecipients, setPayoutRecipients] = useState([
    { address: "", amountUsdc: "0.50", destinationDomain: 26, label: "" },
  ]);

  const fetchBalances = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/gateway/balances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositor: address }),
      });
      const data = await res.json();
      setBalances(data.balances || []);
    } catch {
      console.error("Failed to fetch balances");
    } finally {
      setLoading(false);
    }
  };

  const executeTransfer = async () => {
    if (!address) return;
    setLoading(true);
    setTransferResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/gateway/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceDomain,
          destinationDomain: destDomain,
          sender: address,
          recipient: recipient || address,
          amountUsdc: amount,
        }),
      });
      const data = await res.json();
      setTransferResult(data);
    } catch {
      setTransferResult({
        success: false,
        error: "Transfer request failed",
        amount,
        sender: address,
        recipient: recipient || address,
        status: "failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const executePayout = async () => {
    if (!address) return;
    setLoading(true);
    setTransferResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/gateway/payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: address,
          sourceDomain,
          recipients: payoutRecipients.filter((r) => r.address),
        }),
      });
      const data = await res.json();
      setTransferResult({
        success: true,
        transferId: `payout-${data.totalRecipients}`,
        amount: data.totalAmountUsdc,
        sender: address,
        recipient: `${data.totalRecipients} recipients`,
        status: "completed",
        arcRouting: data.arcRouting,
        firewall: data.firewall,
      });
    } catch {
      setTransferResult({
        success: false,
        error: "Payout request failed",
        amount: "0",
        sender: address,
        recipient: "",
        status: "failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const addPayoutRecipient = () => {
    setPayoutRecipients([
      ...payoutRecipients,
      { address: "", amountUsdc: "0.50", destinationDomain: 26, label: "" },
    ]);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white">
            Crosschain USDC <span className="text-cyan-400">via Arc</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Circle Gateway routes USDC through Arc as liquidity hub
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20">
            <span className="text-xs font-medium text-violet-400">Gateway</span>
          </div>
        </div>
      </div>

      {/* Unified Balance */}
      <div className="mb-6">
        <button
          onClick={fetchBalances}
          disabled={!address || loading}
          className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-sm text-slate-300 hover:border-cyan-500/30 transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Check Unified USDC Balance"}
        </button>
        {balances.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {balances.map((b) => (
              <div
                key={b.domain}
                className="flex justify-between items-center px-3 py-2 rounded-lg bg-slate-900/50 border border-white/5"
              >
                <span className="text-xs text-slate-400">
                  {b.domainName}
                  {b.domain === 26 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 text-[10px]">
                      Hub
                    </span>
                  )}
                </span>
                <span className="text-sm font-mono text-white">{b.balance} USDC</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("transfer")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            tab === "transfer"
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
              : "text-slate-500 hover:text-white"
          }`}
        >
          Transfer
        </button>
        <button
          onClick={() => setTab("payout")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            tab === "payout"
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
              : "text-slate-500 hover:text-white"
          }`}
        >
          Multi-Payout
        </button>
      </div>

      {tab === "transfer" ? (
        <div className="space-y-3">
          {/* Source Chain */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Source Chain</label>
            <select
              value={sourceDomain}
              onChange={(e) => setSourceDomain(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-sm text-white"
            >
              {DOMAINS.map((d) => (
                <option key={d.domainId} value={d.domainId}>
                  {d.name} {d.domainId === 26 ? "(Arc Hub)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Chain */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Destination Chain</label>
            <select
              value={destDomain}
              onChange={(e) => setDestDomain(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-sm text-white"
            >
              {DOMAINS.map((d) => (
                <option key={d.domainId} value={d.domainId}>
                  {d.name} {d.domainId === 26 ? "(Arc Hub)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Recipient (blank = self)</label>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-sm text-white placeholder:text-slate-600"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Amount (USDC)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              step="0.01"
              min="0.01"
              className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-sm text-white"
            />
          </div>

          {/* Route Preview */}
          <div className="px-3 py-2 rounded-lg bg-violet-500/5 border border-violet-500/10">
            <div className="text-[10px] text-violet-400 mb-1">Route via Arc Hub</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>{DOMAINS.find((d) => d.domainId === sourceDomain)?.name}</span>
              <span className="text-violet-400">→</span>
              {sourceDomain !== 26 && destDomain !== 26 && (
                <>
                  <span className="text-violet-400 font-medium">Arc</span>
                  <span className="text-violet-400">→</span>
                </>
              )}
              <span>{DOMAINS.find((d) => d.domainId === destDomain)?.name}</span>
            </div>
          </div>

          <button
            onClick={executeTransfer}
            disabled={!address || loading}
            className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Processing..." : "Transfer via Gateway"}
          </button>
        </div>
      ) : (
        /* Multi-Payout Tab */
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Source Chain</label>
            <select
              value={sourceDomain}
              onChange={(e) => setSourceDomain(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-sm text-white"
            >
              {DOMAINS.map((d) => (
                <option key={d.domainId} value={d.domainId}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {payoutRecipients.map((r, i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-900/30 border border-white/5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Recipient {i + 1}</span>
                {r.label && <span className="text-[10px] text-cyan-400">{r.label}</span>}
              </div>
              <input
                value={r.address}
                onChange={(e) => {
                  const updated = [...payoutRecipients];
                  updated[i] = { ...r, address: e.target.value };
                  setPayoutRecipients(updated);
                }}
                placeholder="0x..."
                className="w-full px-2 py-1.5 rounded bg-slate-900/50 border border-white/10 text-xs text-white placeholder:text-slate-600"
              />
              <div className="flex gap-2">
                <input
                  value={r.amountUsdc}
                  onChange={(e) => {
                    const updated = [...payoutRecipients];
                    updated[i] = { ...r, amountUsdc: e.target.value };
                    setPayoutRecipients(updated);
                  }}
                  type="number"
                  step="0.01"
                  className="flex-1 px-2 py-1.5 rounded bg-slate-900/50 border border-white/10 text-xs text-white"
                />
                <select
                  value={r.destinationDomain}
                  onChange={(e) => {
                    const updated = [...payoutRecipients];
                    updated[i] = { ...r, destinationDomain: Number(e.target.value) };
                    setPayoutRecipients(updated);
                  }}
                  className="px-2 py-1.5 rounded bg-slate-900/50 border border-white/10 text-xs text-white"
                >
                  {DOMAINS.map((d) => (
                    <option key={d.domainId} value={d.domainId}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          <button
            onClick={addPayoutRecipient}
            className="w-full px-3 py-1.5 rounded-lg border border-dashed border-white/10 text-xs text-slate-500 hover:text-white hover:border-white/20 transition-colors"
          >
            + Add Recipient
          </button>

          <button
            onClick={executePayout}
            disabled={!address || loading}
            className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Processing..." : "Execute Multi-Chain Payout"}
          </button>
        </div>
      )}

      {/* Transfer Result */}
      {transferResult && (
        <div
          className={`mt-4 p-4 rounded-xl border ${
            transferResult.success
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-red-500/5 border-red-500/20"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-2 h-2 rounded-full ${
                transferResult.success ? "bg-emerald-400" : "bg-red-400"
              }`}
            />
            <span
              className={`text-sm font-medium ${
                transferResult.success ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {transferResult.success ? "Transfer Complete" : "Transfer Failed"}
            </span>
          </div>

          {transferResult.transferId && (
            <p className="text-xs text-slate-400 font-mono mb-1">ID: {transferResult.transferId}</p>
          )}
          <p className="text-xs text-slate-400">
            {transferResult.amount} USDC - {transferResult.status}
          </p>

          {transferResult.arcRouting && (
            <div className="mt-2 px-2 py-1.5 rounded bg-violet-500/5 border border-violet-500/10">
              <div className="text-[10px] text-violet-400">
                Route: {transferResult.arcRouting.routePath.join(" → ")}
              </div>
              {transferResult.arcRouting.usedAsHub && (
                <div className="text-[10px] text-violet-300 mt-0.5">Arc used as liquidity hub</div>
              )}
            </div>
          )}

          {transferResult.firewall && (
            <div className="mt-2 text-[10px] text-slate-500">
              Firewall: {transferResult.firewall.decision} (Risk {transferResult.firewall.riskLevel}
              )
            </div>
          )}

          {transferResult.error && (
            <p className="text-xs text-red-400 mt-1">{transferResult.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
