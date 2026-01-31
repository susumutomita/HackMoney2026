"use client";

import { useEffect, useState } from "react";
import { analyzeApi, policyApi } from "@/lib/api";

interface Stats {
  totalAnalyses: number;
  approvedCount: number;
  rejectedCount: number;
  activePolicies: number;
}

function ShieldIcon({ className }: { className?: string }) {
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

function XCircleIcon({ className }: { className?: string }) {
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
        d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
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
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
      />
    </svg>
  );
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats>({
    totalAnalyses: 0,
    approvedCount: 0,
    rejectedCount: 0,
    activePolicies: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [analysesData, policiesData] = await Promise.all([
          analyzeApi.getRecent(100),
          policyApi.getAll(),
        ]);

        const approved = analysesData.results.filter((r) => r.analysis.approved).length;
        const rejected = analysesData.results.filter((r) => !r.analysis.approved).length;
        const activePolicies = policiesData.policies.filter((p) => p.enabled).length;

        setStats({
          totalAnalyses: analysesData.results.length,
          approvedCount: approved,
          rejectedCount: rejected,
          activePolicies,
        });
      } catch {
        // Keep default stats on error
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  const cards = [
    {
      title: "Total Analyses",
      value: stats.totalAnalyses,
      icon: ShieldIcon,
      bg: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/20",
    },
    {
      title: "Approved",
      value: stats.approvedCount,
      icon: CheckCircleIcon,
      bg: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/20",
    },
    {
      title: "Rejected",
      value: stats.rejectedCount,
      icon: XCircleIcon,
      bg: "bg-rose-500/10",
      borderColor: "border-rose-500/20",
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/20",
    },
    {
      title: "Active Policies",
      value: stats.activePolicies,
      icon: ClipboardIcon,
      bg: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      iconColor: "text-purple-400",
      iconBg: "bg-purple-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`relative overflow-hidden rounded-2xl ${card.bg} border ${card.borderColor} p-5 transition-all duration-200 hover:scale-[1.02] backdrop-blur-sm`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">{card.title}</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {isLoading ? (
                  <span className="inline-block w-12 h-8 bg-slate-700/50 rounded animate-pulse" />
                ) : stats.totalAnalyses === 0 && card.title !== "Active Policies" ? (
                  "-"
                ) : (
                  card.value
                )}
              </p>
            </div>
            <div className={`p-2 rounded-xl ${card.iconBg}`}>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
