"use client";

import { useState, useCallback } from "react";
import { useAccount, useSignTypedData, useWalletClient, usePublicClient } from "wagmi";
import { pad, parseUnits, type Address, type Hex } from "viem";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface GatewayDomain {
  name: string;
  domainId: number;
  chainId: number;
  usdc: string;
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

interface Eip712Config {
  domain: { name: string; version: string };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  gatewayWallet: string;
  gatewayMinter: string;
  domains: Record<string, GatewayDomain>;
}

const DOMAINS: GatewayDomain[] = [
  {
    name: "Base Sepolia",
    domainId: 6,
    chainId: 84532,
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
  {
    name: "Arc Testnet",
    domainId: 26,
    chainId: 412,
    usdc: "0x3600000000000000000000000000000000000000",
  },
  {
    name: "Ethereum Sepolia",
    domainId: 0,
    chainId: 11155111,
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  },
];

const ERC20_ABI = [
  {
    type: "function" as const,
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable" as const,
  },
] as const;

/** Convert a 20-byte address to 32-byte hex (left-padded) */
function addressToBytes32(addr: string): Hex {
  return pad(addr.toLowerCase() as Hex, { size: 32 });
}

export function CrosschainPanel() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { signTypedDataAsync } = useSignTypedData();

  const [balances, setBalances] = useState<GatewayBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);
  const [sourceDomain, setSourceDomain] = useState(6);
  const [destDomain, setDestDomain] = useState(26);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("1.00");
  const [tab, setTab] = useState<"transfer" | "payout">("transfer");
  const [signingMode, setSigningMode] = useState<"wallet" | "backend">("wallet");
  const [statusMsg, setStatusMsg] = useState("");

  // Payout state
  const [payoutRecipients, setPayoutRecipients] = useState([
    { address: "", amountUsdc: "0.50", destinationDomain: 26, label: "" },
  ]);

  // EIP-712 config (lazy-loaded from backend)
  const [eip712Config, setEip712Config] = useState<Eip712Config | null>(null);

  const fetchEip712Config = useCallback(async () => {
    if (eip712Config) return eip712Config;
    const res = await fetch(`${API_BASE}/api/gateway/eip712-config`);
    const data = await res.json();
    setEip712Config(data);
    return data as Eip712Config;
  }, [eip712Config]);

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

  /** Wallet-signed transfer: user signs BurnIntent with their wallet */
  const executeWalletSignedTransfer = async () => {
    if (!address || !walletClient) return;
    setLoading(true);
    setTransferResult(null);
    setStatusMsg("Fetching EIP-712 config...");

    try {
      const cfg = await fetchEip712Config();

      const src = DOMAINS.find((d) => d.domainId === sourceDomain);
      const dst = DOMAINS.find((d) => d.domainId === destDomain);
      if (!src || !dst) throw new Error("Invalid domain selection");

      const recipientAddr = (recipient || address) as Address;
      const amountBigInt = parseUnits(amount, 6);

      // Generate random salt
      const saltBytes = new Uint8Array(32);
      globalThis.crypto.getRandomValues(saltBytes);
      const salt =
        `0x${Array.from(saltBytes, (b) => b.toString(16).padStart(2, "0")).join("")}` as Hex;

      const burnIntent = {
        maxBlockHeight: BigInt(
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        ),
        maxFee: BigInt(1_010000), // 1.01 USDC
        spec: {
          version: 1,
          sourceDomain: sourceDomain,
          destinationDomain: destDomain,
          sourceContract: addressToBytes32(cfg.gatewayWallet),
          destinationContract: addressToBytes32(cfg.gatewayMinter),
          sourceToken: addressToBytes32(src.usdc),
          destinationToken: addressToBytes32(dst.usdc),
          sourceDepositor: addressToBytes32(address),
          destinationRecipient: addressToBytes32(recipientAddr),
          sourceSigner: addressToBytes32(address),
          destinationCaller: pad("0x00" as Hex, { size: 32 }),
          value: amountBigInt,
          salt,
          hookData: "0x" as Hex,
        },
      };

      // Sign with user's wallet
      setStatusMsg("Sign BurnIntent in your wallet...");
      const signature = await signTypedDataAsync({
        domain: cfg.domain as { name: string; version: string },
        types: cfg.types as Record<string, Array<{ name: string; type: string }>>,
        primaryType: "BurnIntent",
        message: burnIntent,
      });

      // Submit signed intent to backend
      setStatusMsg("Submitting to Gateway API...");
      const res = await fetch(`${API_BASE}/api/gateway/transfer/signed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          burnIntent: {
            maxBlockHeight: burnIntent.maxBlockHeight.toString(),
            maxFee: burnIntent.maxFee.toString(),
            spec: {
              ...burnIntent.spec,
              value: burnIntent.spec.value.toString(),
            },
          },
          signature,
        }),
      });

      const data = await res.json();
      setTransferResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Wallet signing failed";
      setTransferResult({
        success: false,
        error: msg,
        amount,
        sender: address,
        recipient: recipient || address,
        status: "failed",
      });
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  /** Backend-signed transfer: backend signs with its own key */
  const executeBackendTransfer = async () => {
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

  const executeTransfer =
    signingMode === "wallet" ? executeWalletSignedTransfer : executeBackendTransfer;

  /** Approve USDC spending by GatewayWallet */
  const approveUsdc = async () => {
    if (!address || !walletClient || !publicClient) return;
    setLoading(true);
    setStatusMsg("Approving USDC for Gateway...");
    try {
      const cfg = await fetchEip712Config();
      const src = DOMAINS.find((d) => d.domainId === sourceDomain);
      if (!src) throw new Error("Invalid source domain");

      const amountBigInt = parseUnits(amount, 6);
      const txHash = await walletClient.writeContract({
        address: src.usdc as Address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [cfg.gatewayWallet as Address, amountBigInt],
      });

      setStatusMsg("Waiting for confirmation...");
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setStatusMsg(`Approved! tx: ${txHash.slice(0, 10)}...`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Approval failed");
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
          {/* Signing Mode Toggle */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/30 border border-white/5">
            <span className="text-xs text-slate-500">Signer:</span>
            <button
              onClick={() => setSigningMode("wallet")}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                signingMode === "wallet"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-500 hover:text-white"
              }`}
            >
              Your Wallet
            </button>
            <button
              onClick={() => setSigningMode("backend")}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                signingMode === "backend"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "text-slate-500 hover:text-white"
              }`}
            >
              Backend Key
            </button>
          </div>

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
              <span className="text-violet-400">&rarr;</span>
              {sourceDomain !== 26 && destDomain !== 26 && (
                <>
                  <span className="text-violet-400 font-medium">Arc</span>
                  <span className="text-violet-400">&rarr;</span>
                </>
              )}
              <span>{DOMAINS.find((d) => d.domainId === destDomain)?.name}</span>
            </div>
          </div>

          {/* Approve + Transfer buttons */}
          {signingMode === "wallet" && (
            <button
              onClick={approveUsdc}
              disabled={!address || loading}
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-amber-500/20 text-amber-400 text-xs font-medium hover:border-amber-500/40 transition-colors disabled:opacity-50"
            >
              1. Approve USDC for Gateway
            </button>
          )}

          <button
            onClick={executeTransfer}
            disabled={!address || loading}
            className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading
              ? statusMsg || "Processing..."
              : signingMode === "wallet"
                ? "2. Sign & Transfer via Gateway"
                : "Transfer via Gateway (Backend Signs)"}
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

      {/* Status Message */}
      {statusMsg && !loading && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-slate-900/30 border border-white/5">
          <p className="text-xs text-slate-400">{statusMsg}</p>
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
