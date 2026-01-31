"use client";

import type { ReactNode } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import Link from "next/link";
import { TransactionAnalyzer, AnalysisHistory, PolicyList, StatsCards } from "@/components";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:border-cyan-500/40 transition-colors">
        <svg
          className="w-5 h-5 text-cyan-400"
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

function AnimatedOrb() {
  return (
    <div className="orb-container">
      <div className="orb-glow" />
      <div className="orb-ring-2" />
      <div className="orb-ring" />
      <div className="orb" />
      <div className="orb-inner" />
      {/* Floating particles */}
      <div className="particle" style={{ top: "20%", left: "10%", animationDelay: "0s" }} />
      <div className="particle" style={{ top: "60%", left: "85%", animationDelay: "2s" }} />
      <div className="particle" style={{ top: "80%", left: "30%", animationDelay: "4s" }} />
    </div>
  );
}

function HeroSection() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center relative">
      {/* Animated Orb */}
      <div className="mb-12 animate-fade-in">
        <AnimatedOrb />
      </div>

      {/* Text Content */}
      <div className="space-y-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <h1 className="text-5xl sm:text-6xl font-bold">
          <span className="gradient-text">ZeroKey</span>
          <span className="text-white"> Treasury</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">
          AI-powered transaction firewall for autonomous finance.
          <span className="text-cyan-400"> Protect</span>,
          <span className="text-purple-400"> analyze</span>, and
          <span className="text-amber-400"> govern</span> your on-chain operations.
        </p>
      </div>

      {/* Connect Button */}
      <div className="mt-10 animate-slide-up" style={{ animationDelay: "0.4s" }}>
        <ConnectButton />
      </div>

      {/* Feature Pills */}
      <div
        className="mt-16 flex flex-wrap justify-center gap-4 animate-slide-up"
        style={{ animationDelay: "0.6s" }}
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-cyan-500/20">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-sm text-slate-300">Multi-chain Security</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-purple-500/20">
          <div className="w-2 h-2 rounded-full bg-purple-400" />
          <span className="text-sm text-slate-300">AI Analysis</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-amber-500/20">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-sm text-slate-300">On-chain Governance</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className="mesh-gradient" />
      <div className="noise-overlay" />

      {/* Navigation */}
      <nav className="relative z-20 border-b border-white/5 backdrop-blur-2xl bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-10">
              <Logo />
              <div className="hidden sm:flex items-center gap-2">
                <NavLink href="/dashboard" active>
                  Dashboard
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
        {!isConnected ? (
          <HeroSection />
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
              <div>
                <h1 className="text-3xl font-bold">
                  <span className="gradient-text">Dashboard</span>
                </h1>
                <p className="text-slate-500 mt-2">
                  Analyze transactions and manage security policies
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <StatsCards />
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left Column - Transaction Analyzer */}
              <div className="xl:col-span-1 animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <TransactionAnalyzer />
              </div>

              {/* Middle Column - Analysis History */}
              <div className="xl:col-span-1 animate-slide-up" style={{ animationDelay: "0.3s" }}>
                <AnalysisHistory />
              </div>

              {/* Right Column - Policies */}
              <div className="xl:col-span-1 animate-slide-up" style={{ animationDelay: "0.4s" }}>
                <PolicyList />
              </div>
            </div>
          </div>
        )}
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
