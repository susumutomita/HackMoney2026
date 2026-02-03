"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

interface Provider {
  id: string;
  name: string;
  services: string[];
  price: string;
  unit: string;
  trustScore: number;
  totalTransactions: number;
  walletAddress?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function MarketplacePage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  async function fetchProviders(service?: string) {
    setLoading(true);
    setError(null);
    try {
      const searchService = service || "*";
      const url = `${API_URL}/api/a2a/discover?service=${encodeURIComponent(searchService)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setProviders(data.results);
      } else {
        setError(data.error || "Failed to fetch providers");
      }
    } catch {
      setError("Failed to connect to API");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    if (searchQuery.trim()) {
      fetchProviders(searchQuery.trim());
    } else {
      fetchProviders();
    }
  }

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
              <span className="font-semibold text-lg hidden sm:block">ZeroKey</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <NavLink href="/marketplace" active>
                Marketplace
              </NavLink>
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/docs">API Docs</NavLink>
            </div>

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
                      {connected ? account.displayName : "Connect"}
                    </button>
                  );
                }}
              </ConnectButton.Custom>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="pt-24 pb-8 px-4 sm:px-6 border-b border-white/5">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Marketplace</h1>
          <p className="text-gray-400">
            Discover AI service providers protected by ZeroKey Firewall
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="py-6 px-4 sm:px-6 border-b border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2.5 text-sm font-medium bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Providers */}
      <div className="py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-20 text-gray-500">Loading providers...</div>
          ) : error ? (
            <div className="text-center py-20 text-red-400">{error}</div>
          ) : providers.length === 0 ? (
            <div className="text-center py-20 text-gray-500">No providers found</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="py-12 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[#12121a] rounded-xl p-6 border border-white/5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-cyan-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold mb-1">ENS Integration</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Providers can register their services using ENS text records. Custom records like{" "}
                  <code className="px-1.5 py-0.5 bg-white/5 rounded text-cyan-400">
                    ai.api.endpoint
                  </code>{" "}
                  and
                  <code className="px-1.5 py-0.5 bg-white/5 rounded text-cyan-400">
                    ai.trustscore
                  </code>{" "}
                  enable decentralized service discovery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
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
      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
        active ? "text-white bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/5"
      }`}
    >
      {children}
    </Link>
  );
}

function ProviderCard({ provider }: { provider: Provider }) {
  const isLowTrust = provider.trustScore < 40;
  const isTrusted = provider.trustScore >= 70;

  return (
    <div className="group bg-[#12121a] rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold mb-1">{provider.name}</h3>
          {provider.walletAddress && (
            <p className="text-xs text-gray-500 font-mono">
              {provider.walletAddress.slice(0, 6)}...{provider.walletAddress.slice(-4)}
            </p>
          )}
        </div>
        <div
          className={`px-2 py-1 text-xs font-medium rounded-md ${
            isTrusted
              ? "bg-emerald-400/10 text-emerald-400"
              : isLowTrust
                ? "bg-red-400/10 text-red-400"
                : "bg-yellow-400/10 text-yellow-400"
          }`}
        >
          {isTrusted ? "Trusted" : isLowTrust ? "Low Trust" : "Moderate"}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {provider.services.map((service) => (
          <span key={service} className="px-2 py-1 text-xs bg-white/5 rounded-md text-gray-400">
            {service}
          </span>
        ))}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Trust Score</span>
          <span
            className={
              isTrusted ? "text-emerald-400" : isLowTrust ? "text-red-400" : "text-yellow-400"
            }
          >
            {provider.trustScore}/100
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Transactions</span>
          <span className="text-gray-300">{provider.totalTransactions.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-2xl font-bold">${provider.price}</span>
        <span className="text-sm text-gray-500">/{provider.unit}</span>
      </div>

      {isLowTrust && (
        <div className="mb-4 p-3 bg-red-400/5 border border-red-400/10 rounded-lg">
          <p className="text-xs text-red-400">Low trust score. Firewall may block transactions.</p>
        </div>
      )}

      <Link
        href={`/negotiate/${provider.id}`}
        className="block w-full py-2.5 text-sm font-medium text-center bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
      >
        Start Negotiation
      </Link>
    </div>
  );
}
