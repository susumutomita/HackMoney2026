"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      </div>
      <span className="text-lg font-bold text-cyan-400">ZeroKey</span>
    </Link>
  );
}

export default function ProtectPage() {
  const { isConnected } = useAccount();
  const [step, setStep] = useState(1);
  const [safeAddress, setSafeAddress] = useState("");
  const [maxValue, setMaxValue] = useState("0.01");
  const [dailyLimit, setDailyLimit] = useState("0.1");
  const [allowCalls, setAllowCalls] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleProtect = async () => {
    setLoading(true);
    // TODO: Call Safe SDK to setGuard
    await new Promise(r => setTimeout(r, 2000));
    setStep(3);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mesh-gradient" />
      <nav className="border-b border-white/5 backdrop-blur-xl bg-slate-950/60">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Logo />
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Protect Your Safe</h1>
        <p className="text-slate-400 mb-8">Add ZeroKey Guard to control agent spending</p>

        {/* Progress */}
        <div className="flex items-center gap-4 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex items-center gap-2 ${step >= s ? "text-cyan-400" : "text-slate-600"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step >= s ? "border-cyan-400 bg-cyan-400/10" : "border-slate-600"}`}>
                {step > s ? "✓" : s}
              </div>
              <span className="text-sm">{s === 1 ? "Connect" : s === 2 ? "Configure" : "Done"}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Connect */}
        {step === 1 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Step 1: Connect Safe</h2>
            {!isConnected ? (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">Connect your wallet to get started</p>
                <ConnectButton />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Safe Address</label>
                  <input
                    type="text"
                    value={safeAddress}
                    onChange={e => setSafeAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <p className="text-xs text-slate-500">Enter the Safe you want to protect, or use your connected wallet as owner</p>
                <button
                  onClick={() => setStep(2)}
                  disabled={!safeAddress}
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 text-black font-semibold rounded-lg transition"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Configure Policy */}
        {step === 2 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Step 2: Set Policy</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Max Per Transaction (ETH)</label>
                <input
                  type="text"
                  value={maxValue}
                  onChange={e => setMaxValue(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
                <p className="text-xs text-slate-500 mt-1">Block transactions above this amount</p>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Daily Limit (ETH)</label>
                <input
                  type="text"
                  value={dailyLimit}
                  onChange={e => setDailyLimit(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allowCalls"
                  checked={allowCalls}
                  onChange={e => setAllowCalls(e.target.checked)}
                  className="w-5 h-5"
                />
                <label htmlFor="allowCalls" className="text-slate-300">Allow contract calls</label>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-amber-400 text-sm">⚠️ This will require a transaction to set the Guard on your Safe</p>
              </div>
              <button
                onClick={handleProtect}
                disabled={loading}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 text-black font-semibold rounded-lg transition"
              >
                {loading ? "Processing..." : "Protect Safe"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="bg-slate-900/50 border border-emerald-500/20 rounded-xl p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Safe Protected!</h2>
            <p className="text-slate-400 mb-4">ZeroKey Guard is now active on your Safe</p>
            <div className="bg-slate-800 rounded-lg p-4 text-left mb-4">
              <p className="text-sm text-slate-400">Policy Active:</p>
              <p className="text-white">Max: {maxValue} ETH | Daily: {dailyLimit} ETH</p>
            </div>
            <Link href="/dashboard" className="text-cyan-400 hover:underline">Go to Dashboard →</Link>
          </div>
        )}
      </main>
    </div>
  );
}
