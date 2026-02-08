"use client";

import { useState, type FormEvent } from "react";
import { parseEther } from "viem";
import { policyApi, type PolicyConfig } from "@/lib/api";

interface PolicyFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type PolicyType = PolicyConfig["type"];

const POLICY_TYPES: { value: PolicyType; label: string; description: string }[] = [
  {
    value: "spending_limit",
    label: "Spending Limit",
    description: "Set maximum transaction amount",
  },
  {
    value: "protocol_allowlist",
    label: "Protocol Allowlist",
    description: "Restrict to specific addresses",
  },
  {
    value: "kyc_requirement",
    label: "KYC Requirement",
    description: "Require KYC for large transactions",
  },
  {
    value: "time_restriction",
    label: "Time Restriction",
    description: "Limit transactions to specific times",
  },
];

const PERIODS = [
  { value: "per_transaction", label: "Per Transaction" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

const KYC_LEVELS = [
  { value: "basic", label: "Basic" },
  { value: "advanced", label: "Advanced" },
  { value: "full", label: "Full" },
] as const;

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
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

export function PolicyForm({ onSuccess, onCancel }: PolicyFormProps) {
  const [name, setName] = useState("");
  const [policyType, setPolicyType] = useState<PolicyType>("spending_limit");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Spending limit fields
  const [maxAmount, setMaxAmount] = useState("");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>("per_transaction");

  // Protocol allowlist fields
  const [allowedAddresses, setAllowedAddresses] = useState("");
  const [allowUnknown, setAllowUnknown] = useState(false);

  // KYC requirement fields
  const [kycLevel, setKycLevel] = useState<(typeof KYC_LEVELS)[number]["value"]>("basic");
  const [kycThreshold, setKycThreshold] = useState("");

  // Time restriction fields
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startHour, setStartHour] = useState("9");
  const [endHour, setEndHour] = useState("17");

  const buildConfig = (): PolicyConfig => {
    switch (policyType) {
      case "spending_limit":
        return {
          type: "spending_limit",
          maxAmountWei: parseEther(maxAmount || "0").toString(),
          period,
        };
      case "protocol_allowlist":
        return {
          type: "protocol_allowlist",
          allowedAddresses: allowedAddresses
            .split("\n")
            .map((a) => a.trim())
            .filter((a) => a.startsWith("0x")),
          allowUnknown,
        };
      case "kyc_requirement":
        return {
          type: "kyc_requirement",
          requiredLevel: kycLevel,
          thresholdWei: parseEther(kycThreshold || "0").toString(),
        };
      case "time_restriction":
        return {
          type: "time_restriction",
          allowedDays: selectedDays,
          allowedHoursUtc: {
            start: parseInt(startHour),
            end: parseInt(endHour),
          },
        };
      case "trust_score_threshold":
        return {
          type: "trust_score_threshold",
          minScore: 50,
          action: "confirm_required" as const,
        };
      case "ens_required":
        return {
          type: "ens_required",
          requireEns: true,
        };
      case "category_restriction":
        return {
          type: "category_restriction",
          allowedCategories: ["translation", "summarization", "data_analysis"],
          blockUnknown: true,
        };
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await policyApi.create({
        name,
        config: buildConfig(),
        enabled: true,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create policy");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const inputClass =
    "w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all";

  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-cyan-500/20 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Create New Policy</h3>
        <button
          onClick={onCancel}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Policy Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Policy Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter policy name"
            className={inputClass}
            required
          />
        </div>

        {/* Policy Type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Policy Type</label>
          <div className="grid grid-cols-2 gap-2">
            {POLICY_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setPolicyType(type.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  policyType === type.value
                    ? "border-cyan-500/50 bg-cyan-500/10"
                    : "border-white/10 bg-slate-800/30 hover:border-white/20"
                }`}
              >
                <div className="text-sm font-medium text-white">{type.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Type-specific fields */}
        {policyType === "spending_limit" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Max Amount (ETH)
              </label>
              <input
                type="text"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="0.0"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as (typeof PERIODS)[number]["value"])}
                className={inputClass}
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {policyType === "protocol_allowlist" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Allowed Addresses (one per line)
              </label>
              <textarea
                value={allowedAddresses}
                onChange={(e) => setAllowedAddresses(e.target.value)}
                placeholder="0x..."
                className={`${inputClass} min-h-[100px] font-mono text-sm`}
                required
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowUnknown}
                onChange={(e) => setAllowUnknown(e.target.checked)}
                className="w-5 h-5 rounded-md bg-slate-800/50 border-white/10 text-cyan-500 focus:ring-cyan-500/50"
              />
              <span className="text-sm text-slate-300">Allow unknown addresses</span>
            </label>
          </>
        )}

        {policyType === "kyc_requirement" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Required KYC Level
              </label>
              <select
                value={kycLevel}
                onChange={(e) =>
                  setKycLevel(e.target.value as (typeof KYC_LEVELS)[number]["value"])
                }
                className={inputClass}
              >
                {KYC_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Threshold (ETH)
              </label>
              <input
                type="text"
                value={kycThreshold}
                onChange={(e) => setKycThreshold(e.target.value)}
                placeholder="0.0"
                className={inputClass}
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                KYC will be required for transactions above this amount
              </p>
            </div>
          </>
        )}

        {policyType === "time_restriction" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Allowed Days</label>
              <div className="flex gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                      selectedDays.includes(day.value)
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                        : "bg-slate-800/30 text-slate-500 border border-white/10 hover:border-white/20"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Start Hour (UTC)
                </label>
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className={inputClass}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  End Hour (UTC)
                </label>
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className={inputClass}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <p className="text-rose-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-800/50 text-slate-300 hover:bg-slate-800 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !name}
            className="flex-1 btn-premium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <SpinnerIcon className="w-5 h-5" />
                Creating...
              </>
            ) : (
              <>
                <PlusIcon className="w-5 h-5" />
                Create Policy
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
