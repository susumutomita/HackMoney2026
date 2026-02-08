"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { policyApi, agentsApi } from "@/lib/api";
import type { AgentInfo } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// ── Icons ────────────────────────────────────────────

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
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
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
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
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function CogIcon({ className }: { className?: string }) {
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
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

function ClipboardCopyIcon({ className }: { className?: string }) {
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
        d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
      />
    </svg>
  );
}

function PlugIcon({ className }: { className?: string }) {
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
        d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
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
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}

// ── Nav components (reused from dashboard) ───────────

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:border-cyan-500/40 transition-colors">
        <LockIcon className="w-5 h-5 text-cyan-400" />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold text-cyan-400">ZeroKey</span>
        <span className="text-xs font-light text-slate-500 tracking-widest uppercase">
          Treasury
        </span>
      </div>
    </Link>
  );
}

function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
        active
          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
          : "text-slate-400 hover:text-white hover:bg-white/5"
      }`}
    >
      {children}
    </Link>
  );
}

function StatusIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
      <div className="w-2 h-2 rounded-full bg-emerald-400 status-pulse" />
      <span className="text-xs font-medium text-emerald-400">Online</span>
    </div>
  );
}

// ── Types ────────────────────────────────────────────

interface GuardStatus {
  safeAddress: string;
  isProtected: boolean;
  guardAddress: string | null;
  registeredAt: string | null;
  policyCount: number;
}

// ── Steps ────────────────────────────────────────────

const STEPS = [
  { label: "Enter Safe", icon: LockIcon },
  { label: "Enable Guard", icon: ShieldCheckIcon },
  { label: "Configure", icon: CogIcon },
  { label: "Connect Agent", icon: PlugIcon },
  { label: "Complete", icon: CheckCircleIcon },
];

// ── Stepper ──────────────────────────────────────────

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        const Icon = step.icon;
        return (
          <div key={step.label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isCompleted
                    ? "bg-emerald-500/20 border border-emerald-500/30"
                    : isCurrent
                      ? "bg-cyan-500/20 border border-cyan-500/30"
                      : "bg-slate-800/50 border border-white/5"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isCompleted
                      ? "text-emerald-400"
                      : isCurrent
                        ? "text-cyan-400"
                        : "text-slate-600"
                  }`}
                />
              </div>
              <span
                className={`text-xs font-medium ${
                  isCompleted ? "text-emerald-400" : isCurrent ? "text-cyan-400" : "text-slate-600"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`w-12 h-px mb-5 ${
                  idx < currentStep ? "bg-emerald-500/40" : "bg-white/5"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Enter Safe Address ───────────────────────

function StepEnterSafe({
  onNext,
  onStatusLoaded,
}: {
  onNext: () => void;
  onStatusLoaded: (status: GuardStatus) => void;
}) {
  const [safeAddress, setSafeAddress] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<GuardStatus | null>(null);

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(safeAddress);

  const checkStatus = async () => {
    if (!isValidAddress) return;
    setIsChecking(true);
    setError(null);
    setStatus(null);

    try {
      const res = await fetch(`${API_BASE}/api/guard/status/${safeAddress}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to check status" }));
        throw new Error(body.message || body.error || "Failed to check status");
      }
      const data: GuardStatus = await res.json();
      setStatus(data);
      onStatusLoaded(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check guard status");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="glass-card p-8 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <LockIcon className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Enter Safe Address</h2>
          <p className="text-sm text-slate-500">Provide your Safe multisig wallet address</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Safe Address</label>
          <input
            type="text"
            value={safeAddress}
            onChange={(e) => {
              setSafeAddress(e.target.value);
              setStatus(null);
              setError(null);
            }}
            placeholder="0x..."
            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 font-mono text-sm"
          />
        </div>

        <button
          onClick={checkStatus}
          disabled={!isValidAddress || isChecking}
          className="w-full py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25"
        >
          {isChecking ? "Checking..." : "Check Status"}
        </button>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <p className="text-rose-400 text-sm">{error}</p>
          </div>
        )}

        {status && (
          <div
            className={`p-4 rounded-xl border ${
              status.isProtected
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-amber-500/10 border-amber-500/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {status.isProtected ? (
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
              ) : (
                <ShieldCheckIcon className="w-5 h-5 text-amber-400" />
              )}
              <span
                className={`font-medium text-sm ${
                  status.isProtected ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {status.isProtected ? "Protected by ZeroKey Guard" : "Not Protected"}
              </span>
            </div>
            {status.isProtected && (
              <p className="text-xs text-slate-400">
                Guard: <span className="font-mono">{status.guardAddress}</span>
                {status.policyCount > 0 && ` | ${status.policyCount} active policies`}
              </p>
            )}
            {!status.isProtected && (
              <p className="text-xs text-slate-400">
                This Safe does not have ZeroKey Guard enabled yet.
              </p>
            )}
          </div>
        )}

        {status && (
          <button
            onClick={onNext}
            className="w-full py-3 rounded-xl font-medium text-sm transition-all bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 flex items-center justify-center gap-2"
          >
            {status.isProtected ? "Configure Policies" : "Enable Protection"}
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 2: Enable Protection ────────────────────────

function StepEnableProtection({
  guardStatus,
  onNext,
}: {
  guardStatus: GuardStatus | null;
  onNext: () => void;
}) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registered, setRegistered] = useState(guardStatus?.isProtected ?? false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const safeAddress = guardStatus?.safeAddress ?? "";

  // The Guard contract address -- shown to users for setGuard()
  const guardContractAddress =
    guardStatus?.guardAddress || process.env.NEXT_PUBLIC_GUARD_CONTRACT_ADDRESS || "TBD";

  const registerSafe = async () => {
    setIsRegistering(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/guard/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ safeAddress }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Registration failed" }));
        const msg =
          body.message || body.error || (body.success === false && JSON.stringify(body)) || "Registration failed";
        throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }
      setRegistered(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register Safe");
    } finally {
      setIsRegistering(false);
    }
  };

  const copyToClipboard = (text: string) => {
    void window.navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If already protected, skip ahead
  if (guardStatus?.isProtected) {
    return (
      <div className="glass-card p-8 max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Already Protected</h2>
            <p className="text-sm text-slate-500">ZeroKey Guard is active on this Safe</p>
          </div>
        </div>
        <button
          onClick={onNext}
          className="w-full py-3 rounded-xl font-medium text-sm transition-all bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 flex items-center justify-center gap-2"
        >
          Configure Policies
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <ShieldCheckIcon className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Enable ZeroKey Protection</h2>
          <p className="text-sm text-slate-500">Two-step process to secure your Safe</p>
        </div>
      </div>

      {/* What ZeroKey Guard does */}
      <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5 mb-6">
        <h3 className="text-sm font-medium text-white mb-3">What ZeroKey Guard does:</h3>
        <ul className="space-y-2 text-sm text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-0.5">-</span>
            AI-powered analysis of every transaction before execution
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-0.5">-</span>
            Blocks suspicious, high-risk, or policy-violating transactions
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-0.5">-</span>
            On-chain audit trail of all approval decisions
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-0.5">-</span>
            Configurable spending limits and policy rules
          </li>
        </ul>
      </div>

      {/* Step A: Register with backend */}
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="text-sm font-medium text-white">Register your Safe</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3 ml-8">
            Register your Safe address with ZeroKey backend to enable monitoring.
          </p>
          <button
            onClick={registerSafe}
            disabled={isRegistering || registered}
            className={`ml-8 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              registered
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 disabled:opacity-40"
            }`}
          >
            {registered ? "Registered" : isRegistering ? "Registering..." : "Register Safe"}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <p className="text-rose-400 text-sm">{error}</p>
          </div>
        )}

        {/* Step B: Set Guard via Safe UI */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            registered
              ? "bg-slate-800/30 border-white/5"
              : "bg-slate-800/10 border-white/[0.02] opacity-50"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                registered ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-700/50 text-slate-600"
              }`}
            >
              2
            </span>
            <h3 className="text-sm font-medium text-white">Set Guard on your Safe</h3>
          </div>
          <div className="ml-8 space-y-3">
            <p className="text-xs text-slate-500">
              Add ZeroKey Guard through the Safe Transaction Builder:
            </p>
            <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside">
              <li>Open your Safe at app.safe.global</li>
              <li>Go to Transaction Builder (New Transaction &gt; Transaction Builder)</li>
              <li>Enter your Safe address as the &quot;to&quot; address</li>
              <li>
                Use the{" "}
                <code className="px-1.5 py-0.5 rounded bg-slate-700/50 text-cyan-400">
                  setGuard
                </code>{" "}
                function
              </li>
              <li>Paste the Guard contract address below as the parameter</li>
              <li>Submit and confirm with required signers</li>
            </ol>

            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-white/5 font-mono text-xs text-cyan-400 truncate">
                {guardContractAddress}
              </div>
              <button
                onClick={() => copyToClipboard(guardContractAddress)}
                className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                title="Copy guard address"
              >
                <ClipboardCopyIcon className="w-4 h-4" />
              </button>
            </div>
            {copied && <p className="text-xs text-emerald-400">Copied to clipboard</p>}
          </div>
        </div>

        {registered && (
          <button
            onClick={onNext}
            className="w-full py-3 rounded-xl font-medium text-sm transition-all bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 flex items-center justify-center gap-2"
          >
            Continue to Policy Configuration
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 3: Configure Policies ───────────────────────

const SERVICE_CATEGORIES = [
  { id: "translation", label: "Translation" },
  { id: "summarization", label: "Summarization" },
  { id: "data_analysis", label: "Data Analysis" },
  { id: "code_review", label: "Code Review" },
  { id: "image_generation", label: "Image Generation" },
];

function StepConfigurePolicies({ onNext }: { onNext: () => void }) {
  const [maxTxAmount, setMaxTxAmount] = useState("1000");
  const [dailyLimit, setDailyLimit] = useState("5000");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ensRequired, setEnsRequired] = useState(false);
  const [trustScoreThreshold, setTrustScoreThreshold] = useState("50");
  const [allowedCategories, setAllowedCategories] = useState<string[]>(
    SERVICE_CATEGORIES.map((c) => c.id)
  );

  const toggleCategory = (id: string) => {
    setAllowedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const savePolicies = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // Create spending limit per transaction
      await policyApi.create({
        name: `Max Transaction: ${maxTxAmount} USDC`,
        config: {
          type: "spending_limit",
          maxAmountWei: (BigInt(Math.round(Number(maxTxAmount) * 1e6)) * BigInt(1e12)).toString(),
          period: "per_transaction",
        },
        enabled: true,
      });

      // Create daily spending limit
      await policyApi.create({
        name: `Daily Limit: ${dailyLimit} USDC`,
        config: {
          type: "spending_limit",
          maxAmountWei: (BigInt(Math.round(Number(dailyLimit) * 1e6)) * BigInt(1e12)).toString(),
          period: "daily",
        },
        enabled: true,
      });

      // Advanced policies
      if (ensRequired) {
        await policyApi.create({
          name: "ENS Required",
          config: { type: "ens_required", requireEns: true },
          enabled: true,
        });
      }

      if (Number(trustScoreThreshold) > 0) {
        await policyApi.create({
          name: `Trust Score Threshold: ${trustScoreThreshold}`,
          config: {
            type: "trust_score_threshold",
            minScore: Number(trustScoreThreshold),
            action: "confirm_required",
          },
          enabled: true,
        });
      }

      if (allowedCategories.length < SERVICE_CATEGORIES.length) {
        await policyApi.create({
          name: "Category Restrictions",
          config: {
            type: "category_restriction",
            allowedCategories,
            blockUnknown: true,
          },
          enabled: true,
        });
      }

      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save policies");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-card p-8 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <CogIcon className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Configure Policies</h2>
          <p className="text-sm text-slate-500">Set spending limits for your Safe</p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Max Transaction Amount (USDC)
          </label>
          <div className="relative">
            <input
              type="number"
              value={maxTxAmount}
              onChange={(e) => setMaxTxAmount(e.target.value)}
              min="0"
              step="100"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 text-sm pr-16"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              USDC
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Transactions exceeding this amount will be blocked
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Daily Spending Limit (USDC)
          </label>
          <div className="relative">
            <input
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              min="0"
              step="500"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 text-sm pr-16"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              USDC
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Total daily spending across all transactions
          </p>
        </div>

        {/* Advanced Settings */}
        <div className="border border-white/5 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <span>Advanced Settings</span>
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
            />
          </button>

          {showAdvanced && (
            <div className="px-4 pb-4 space-y-5 border-t border-white/5">
              {/* ENS Required */}
              <div className="pt-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-slate-400">ENS Required</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Block transactions to addresses without an ENS name
                    </p>
                  </div>
                  <button
                    onClick={() => setEnsRequired(!ensRequired)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      ensRequired ? "bg-cyan-500" : "bg-slate-700"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        ensRequired ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </label>
              </div>

              {/* Trust Score Threshold */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Minimum Trust Score
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={trustScoreThreshold}
                    onChange={(e) => setTrustScoreThreshold(e.target.value)}
                    className="flex-1 h-2 rounded-full appearance-none bg-slate-700 accent-cyan-500"
                  />
                  <span className="text-sm font-mono text-cyan-400 w-10 text-right">
                    {trustScoreThreshold}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Providers below this score require manual confirmation
                </p>
              </div>

              {/* Category Restrictions */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Allowed Categories
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICE_CATEGORIES.map((cat) => (
                    <label
                      key={cat.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all ${
                        allowedCategories.includes(cat.id)
                          ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
                          : "bg-slate-800/30 border border-white/5 text-slate-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={allowedCategories.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          allowedCategories.includes(cat.id)
                            ? "bg-cyan-500 border-cyan-500"
                            : "border-slate-600"
                        }`}
                      >
                        {allowedCategories.includes(cat.id) && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {cat.label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Unchecked categories will be blocked by the firewall
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <p className="text-rose-400 text-sm">{error}</p>
          </div>
        )}

        {saved && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <p className="text-emerald-400 text-sm">Policies saved successfully</p>
          </div>
        )}

        <div className="flex gap-3">
          {!saved ? (
            <button
              onClick={savePolicies}
              disabled={isSaving || !maxTxAmount || !dailyLimit}
              className="flex-1 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25"
            >
              {isSaving ? "Saving..." : "Save Policies"}
            </button>
          ) : (
            <button
              onClick={onNext}
              className="flex-1 py-3 rounded-xl font-medium text-sm transition-all bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center gap-2"
            >
              Complete Setup
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Connect Agent ─────────────────────────────

function StepConnectAgent({
  guardStatus,
  onNext,
}: {
  guardStatus: GuardStatus | null;
  onNext: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"mcp" | "apikeys">("mcp");
  const [agentName, setAgentName] = useState("");
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const safeAddress = guardStatus?.safeAddress ?? "";

  const loadAgents = useCallback(async () => {
    if (!safeAddress) return;
    setIsLoading(true);
    try {
      const data = await agentsApi.list(safeAddress);
      setAgents(data.agents);
    } catch {
      // Silently fail on load — agents may not exist yet
    } finally {
      setIsLoading(false);
    }
  }, [safeAddress]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        zerokey: {
          command: "npx",
          args: ["-y", "@zerokey/mcp-server@latest"],
          env: {
            ZEROKEY_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
            ZEROKEY_API_KEY: "<your-agent-api-key>",
          },
        },
      },
    },
    null,
    2
  );

  const copyToClipboard = (text: string, target: "mcp" | "key") => {
    void globalThis.navigator.clipboard.writeText(text);
    if (target === "mcp") {
      setCopiedMcp(true);
      setTimeout(() => setCopiedMcp(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const createAgent = async () => {
    if (!agentName.trim() || !safeAddress) return;
    setIsCreating(true);
    setError(null);
    setGeneratedKey(null);
    try {
      const data = await agentsApi.create({ name: agentName.trim(), safeAddress });
      setGeneratedKey(data.apiKey);
      setAgentName("");
      void loadAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setIsCreating(false);
    }
  };

  const deleteAgent = async (id: string) => {
    try {
      await agentsApi.delete(id);
      setAgents((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete agent");
    }
  };

  return (
    <div className="glass-card p-8 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <PlugIcon className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Connect Agent</h2>
          <p className="text-sm text-slate-500">Connect AI agents to your protected Safe</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-800/50 border border-white/5 mb-6">
        <button
          onClick={() => setActiveTab("mcp")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === "mcp"
              ? "bg-cyan-500/15 text-cyan-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          MCP Config
        </button>
        <button
          onClick={() => setActiveTab("apikeys")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === "apikeys"
              ? "bg-cyan-500/15 text-cyan-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          API Keys
        </button>
      </div>

      {/* MCP Tab */}
      {activeTab === "mcp" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Add this configuration to your Claude Desktop or MCP-compatible client:
          </p>
          <div className="relative">
            <pre className="bg-slate-900/80 border border-white/5 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto">
              {mcpConfig}
            </pre>
            <button
              onClick={() => copyToClipboard(mcpConfig, "mcp")}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
              title="Copy config"
            >
              <ClipboardCopyIcon className="w-4 h-4" />
            </button>
          </div>
          {copiedMcp && <p className="text-xs text-emerald-400">Copied to clipboard</p>}
          <p className="text-xs text-slate-600">
            Replace{" "}
            <code className="px-1 py-0.5 rounded bg-slate-700/50 text-amber-400">
              &lt;your-agent-api-key&gt;
            </code>{" "}
            with a key generated in the API Keys tab.
          </p>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === "apikeys" && (
        <div className="space-y-4">
          {/* Generate new key */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Agent Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g. my-claude-agent"
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 font-mono text-sm"
              />
              <button
                onClick={() => void createAgent()}
                disabled={!agentName.trim() || isCreating}
                className="px-4 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 whitespace-nowrap"
              >
                {isCreating ? "Creating..." : "Generate"}
              </button>
            </div>
          </div>

          {/* Show generated key */}
          {generatedKey && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm font-medium text-amber-400 mb-2">
                Save this key now -- it will not be shown again
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-white/5 font-mono text-xs text-amber-400 break-all">
                  {generatedKey}
                </code>
                <button
                  onClick={() => copyToClipboard(generatedKey, "key")}
                  className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all flex-shrink-0"
                  title="Copy key"
                >
                  <ClipboardCopyIcon className="w-4 h-4" />
                </button>
              </div>
              {copiedKey && <p className="text-xs text-emerald-400 mt-1">Copied to clipboard</p>}
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <p className="text-rose-400 text-sm">{error}</p>
            </div>
          )}

          {/* Existing agents */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">Registered Agents</h3>
            {isLoading ? (
              <p className="text-sm text-slate-600">Loading agents...</p>
            ) : agents.length === 0 ? (
              <p className="text-sm text-slate-600">No agents registered yet.</p>
            ) : (
              <div className="space-y-2">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-white/5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          agent.enabled ? "bg-emerald-400" : "bg-slate-600"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{agent.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{agent.apiKeyPrefix}...</p>
                      </div>
                    </div>
                    <button
                      onClick={() => void deleteAgent(agent.id)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all flex-shrink-0"
                      title="Delete agent"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Continue button */}
      <button
        onClick={onNext}
        className="w-full mt-6 py-3 rounded-xl font-medium text-sm transition-all bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 flex items-center justify-center gap-2"
      >
        Continue
        <ArrowRightIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Step 5: Success ──────────────────────────────────

function StepSuccess({ guardStatus }: { guardStatus: GuardStatus | null }) {
  return (
    <div className="glass-card p-8 max-w-xl mx-auto text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
        <CheckCircleIcon className="w-8 h-8 text-emerald-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Setup Complete</h2>
      <p className="text-slate-400 mb-2">Your Safe is configured with ZeroKey Guard protection.</p>
      {guardStatus && (
        <p className="text-xs text-slate-600 font-mono mb-8">{guardStatus.safeAddress}</p>
      )}

      <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5 mb-8 text-left">
        <h3 className="text-sm font-medium text-white mb-3">What happens next:</h3>
        <ul className="space-y-2 text-sm text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">-</span>
            Every transaction proposed through your Safe will be analyzed by AI
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">-</span>
            Transactions that violate policies will be automatically blocked
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">-</span>
            View all activity on the Dashboard
          </li>
        </ul>
      </div>

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 transition-all"
      >
        Go to Dashboard
        <ArrowRightIcon className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ── Main Setup Page ──────────────────────────────────

export default function SetupPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [guardStatus, setGuardStatus] = useState<GuardStatus | null>(null);

  const handleNext = () => {
    // If already protected, skip enable step
    if (currentStep === 0 && guardStatus?.isProtected) {
      setCurrentStep(2);
    } else {
      setCurrentStep((s) => Math.min(s + 1, 4));
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="mesh-gradient" />
      <div className="noise-overlay" />

      {/* Navigation */}
      <nav className="relative z-20 border-b border-white/5 backdrop-blur-2xl bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-10">
              <Logo />
              <div className="hidden sm:flex items-center gap-2">
                <NavLink href="/dashboard">Dashboard</NavLink>
                <NavLink href="/setup" active>
                  Setup
                </NavLink>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <StatusIndicator />
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in">
          {/* Header */}
          <div className="text-center mb-8 pt-4">
            <h1 className="text-3xl font-bold">
              <span className="gradient-text">Protect Your Safe</span>
            </h1>
            <p className="text-slate-500 mt-2">
              Set up ZeroKey Guard to secure your Safe multisig wallet
            </p>
          </div>

          {/* Stepper */}
          <Stepper currentStep={currentStep} />

          {/* Step Content */}
          <div className="animate-slide-up">
            {currentStep === 0 && (
              <StepEnterSafe onNext={handleNext} onStatusLoaded={setGuardStatus} />
            )}
            {currentStep === 1 && (
              <StepEnableProtection guardStatus={guardStatus} onNext={handleNext} />
            )}
            {currentStep === 2 && <StepConfigurePolicies onNext={handleNext} />}
            {currentStep === 3 && (
              <StepConnectAgent guardStatus={guardStatus} onNext={handleNext} />
            )}
            {currentStep === 4 && <StepSuccess guardStatus={guardStatus} />}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-auto backdrop-blur-xl bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              Execution Governance Layer for Autonomous Finance
            </p>
            <div className="flex items-center gap-6 text-xs text-slate-600">
              <span className="px-2 py-1 rounded-md bg-slate-800/50">v0.1.0</span>
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Base Sepolia
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
