"use client";

import { useEffect, useState } from "react";
import { policyApi, type Policy, type PolicyConfig } from "@/lib/api";
import { formatEther } from "viem";
import { PolicyForm } from "./PolicyForm";

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

const POLICY_TYPE_LABELS: Record<PolicyConfig["type"], string> = {
  spending_limit: "Spending Limit",
  protocol_allowlist: "Protocol Allowlist",
  kyc_requirement: "KYC Requirement",
  time_restriction: "Time Restriction",
  trust_score_threshold: "Trust Score",
  ens_required: "ENS Required",
  category_restriction: "Category Restriction",
};

const POLICY_TYPE_STYLES: Record<PolicyConfig["type"], { bg: string; text: string; icon: string }> =
  {
    spending_limit: { bg: "bg-amber-500/10", text: "text-amber-400", icon: "text-amber-400" },
    protocol_allowlist: {
      bg: "bg-cyan-500/10",
      text: "text-cyan-400",
      icon: "text-cyan-400",
    },
    kyc_requirement: { bg: "bg-violet-500/10", text: "text-violet-400", icon: "text-violet-400" },
    time_restriction: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      icon: "text-emerald-400",
    },
    trust_score_threshold: {
      bg: "bg-orange-500/10",
      text: "text-orange-400",
      icon: "text-orange-400",
    },
    ens_required: {
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      icon: "text-blue-400",
    },
    category_restriction: {
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      icon: "text-rose-400",
    },
  };

function formatPolicyDetails(config: PolicyConfig): string {
  switch (config.type) {
    case "spending_limit":
      return `Max ${formatEther(BigInt(config.maxAmountWei))} ETH per ${config.period.replace("_", " ")}`;
    case "protocol_allowlist":
      return `${config.allowedAddresses.length} addresses allowed`;
    case "kyc_requirement":
      return `${config.requiredLevel} KYC required above ${formatEther(BigInt(config.thresholdWei))} ETH`;
    case "time_restriction":
      return `${config.allowedDays.length} days, ${config.allowedHoursUtc.start}:00-${config.allowedHoursUtc.end}:00 UTC`;
    case "trust_score_threshold":
      return `Min score: ${config.minScore} (${config.action.replace("_", " ")})`;
    case "ens_required":
      return config.requireEns ? "ENS name required" : "ENS not required";
    case "category_restriction":
      return `${config.allowedCategories.length} categories allowed`;
    default:
      return "Unknown policy type";
  }
}

export function PolicyList() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchPolicies = async () => {
    try {
      setIsLoading(true);
      const data = await policyApi.getAll();
      setPolicies(data.policies);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch policies");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePolicy = async (policy: Policy) => {
    try {
      await policyApi.update(policy.id, {
        name: policy.name,
        config: policy.config,
        enabled: !policy.enabled,
      });
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update policy");
    }
  };

  const deletePolicy = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this policy?")) return;

    try {
      await policyApi.delete(id);
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete policy");
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  return (
    <div className="glass-card glass-card-hover p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/10 to-emerald-500/10 border border-amber-500/20">
            <ShieldCheckIcon className="w-5 h-5 text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold gradient-text">Policies</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="p-2 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-500/10 transition-all"
            title="Add Policy"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
          <button
            onClick={fetchPolicies}
            disabled={isLoading}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-50 transition-all"
            title="Refresh"
          >
            <ArrowPathIcon className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6">
          <PolicyForm
            onSuccess={() => {
              setShowForm(false);
              fetchPolicies();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-4">
          <p className="text-rose-400 text-sm">{error}</p>
        </div>
      )}

      {policies.length === 0 && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center mb-4">
            <ShieldCheckIcon className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-slate-500">No policies configured</p>
          <p className="text-xs text-slate-600 mt-1">Add policies to protect your transactions</p>
        </div>
      )}

      {isLoading && policies.length === 0 && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-800/30 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-700/50 rounded-xl" />
                <div className="flex-1">
                  <div className="w-32 h-5 bg-slate-700/50 rounded mb-2" />
                  <div className="w-24 h-4 bg-slate-700/50 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {policies.map((policy, index) => {
          const styles = POLICY_TYPE_STYLES[policy.config.type];
          return (
            <div
              key={policy.id}
              className={`p-4 rounded-xl border transition-all animate-slide-up ${
                policy.enabled
                  ? "bg-slate-800/30 border-white/5 hover:border-white/10"
                  : "bg-slate-800/10 border-white/[0.02] opacity-60"
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${styles.bg}`}>
                    <ShieldCheckIcon className={`w-5 h-5 ${styles.icon}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-white truncate">{policy.name}</h3>
                      {!policy.enabled && (
                        <span className="px-2 py-0.5 rounded-md text-xs bg-slate-700/50 text-slate-400">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${styles.text} mb-1`}>
                      {POLICY_TYPE_LABELS[policy.config.type]}
                    </p>
                    <p className="text-sm text-slate-400">{formatPolicyDetails(policy.config)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => togglePolicy(policy)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      policy.enabled
                        ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                        : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    }`}
                  >
                    {policy.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => deletePolicy(policy.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
