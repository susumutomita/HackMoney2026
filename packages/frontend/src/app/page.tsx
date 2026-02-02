"use client";

import type { ReactNode } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <span className="font-semibold text-lg">ZeroKey</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              <NavLink href="/marketplace">Marketplace</NavLink>
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/tutorial">Docs</NavLink>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <ConnectButton.Custom>
                  {({ account, chain, openConnectModal, mounted }) => {
                    const connected = mounted && account && chain;
                    return (
                      <button
                        onClick={openConnectModal}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                          connected
                            ? "bg-white/5 text-white hover:bg-white/10"
                            : "bg-white text-black hover:bg-white/90"
                        }`}
                      >
                        {connected ? `${account.displayName}` : "Connect"}
                      </button>
                    );
                  }}
                </ConnectButton.Custom>
              </div>

              {/* Mobile menu button */}
              <button className="md:hidden p-2 text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-xs font-medium text-cyan-400 bg-cyan-400/10 rounded-full border border-cyan-400/20">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Built for HackMoney 2026
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Execution firewall for
            <br />
            <span className="text-cyan-400">autonomous agents</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Protect AI agents from malicious transactions. Analyze intent, enforce policies, and
            approve payments—all before execution.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/marketplace"
              className="px-6 py-3 text-sm font-medium bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
            >
              Explore Marketplace
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 text-sm font-medium bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors border border-white/10"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">How it works</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Three layers of protection for every autonomous transaction
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              step="01"
              title="Semantic Analysis"
              description="Intent detection understands what the transaction is trying to do, not just the raw data."
            />
            <FeatureCard
              step="02"
              title="Policy Enforcement"
              description="Check against spending limits, rate limits, and protocol allowlists before any funds move."
            />
            <FeatureCard
              step="03"
              title="On-chain Proof"
              description="Every approval is recorded on-chain for transparent audit trails and compliance."
            />
          </div>
        </div>
      </section>

      {/* Use Case */}
      <section className="py-20 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6">AI agents need guardrails</h2>
              <p className="text-gray-400 mb-6 leading-relaxed">
                When AI agents autonomously discover, negotiate, and pay for services, they need
                protection from scams, budget overruns, and malicious providers.
              </p>
              <ul className="space-y-4">
                <CheckItem>Block transactions to low-trust providers</CheckItem>
                <CheckItem>Enforce daily spending limits</CheckItem>
                <CheckItem>Rate limit to prevent abuse</CheckItem>
                <CheckItem>Fail-safe: reject when analysis fails</CheckItem>
              </ul>
            </div>

            <div className="bg-[#12121a] rounded-2xl p-6 border border-white/5">
              <div className="font-mono text-sm">
                <div className="text-gray-500 mb-4">// Firewall decision</div>
                <div className="space-y-2">
                  <div>
                    <span className="text-purple-400">provider</span>:{" "}
                    <span className="text-green-400">"TranslateAI Pro"</span>
                  </div>
                  <div>
                    <span className="text-purple-400">trustScore</span>:{" "}
                    <span className="text-cyan-400">85</span>
                  </div>
                  <div>
                    <span className="text-purple-400">amount</span>:{" "}
                    <span className="text-cyan-400">0.03</span>{" "}
                    <span className="text-gray-500">USDC</span>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <span className="text-purple-400">decision</span>:{" "}
                    <span className="text-green-400">"APPROVED"</span>
                  </div>
                  <div>
                    <span className="text-purple-400">riskLevel</span>:{" "}
                    <span className="text-cyan-400">1</span>{" "}
                    <span className="text-gray-500">// LOW</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-400 mb-8">
            Connect your wallet and explore the AI agent marketplace.
          </p>
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                className="px-8 py-3 text-sm font-medium bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Built for</span>
            <span className="text-white font-medium">HackMoney 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/tutorial" className="hover:text-white transition-colors">
              Documentation
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
    >
      {children}
    </Link>
  );
}

function FeatureCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group p-6 rounded-2xl bg-[#12121a] border border-white/5 hover:border-white/10 transition-colors">
      <div className="text-xs font-mono text-cyan-400 mb-4">{step}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-cyan-400/10 flex items-center justify-center flex-shrink-0">
        <svg
          className="w-3 h-3 text-cyan-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-gray-300">{children}</span>
    </li>
  );
}
