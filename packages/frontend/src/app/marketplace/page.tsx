"use client";

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
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
      // Default to "translation" to show demo providers
      const searchService = service || "translation";
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

  function getTrustColor(score: number): string {
    if (score >= 70) return "text-green-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  }

  function getTrustLabel(score: number): string {
    if (score >= 70) return "Trusted";
    if (score >= 40) return "Moderate";
    return "Low Trust";
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <nav className="flex items-center justify-between p-6 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Link href="/">
            <span className="text-2xl font-bold text-primary-400">ZeroKey</span>
            <span className="text-gray-400"> Treasury</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <Link href="/marketplace" className="text-sm font-medium text-primary-400">
            Marketplace
          </Link>
          <ConnectButton />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <section className="mb-8">
          <h1 className="text-4xl font-bold mb-4">📜 AI Agent API Marketplace</h1>
          <p className="text-gray-400">
            Discover and negotiate with AI service providers. Protected by ZeroKey Firewall.
          </p>
        </section>

        {/* Search */}
        <div className="flex gap-4 mb-8">
          <input
            type="text"
            placeholder="Search services (e.g., translation, summarization)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 rounded-lg font-medium transition-colors"
          >
            Search
          </button>
        </div>

        {/* Provider Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading providers...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">{error}</div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No providers found</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                getTrustColor={getTrustColor}
                getTrustLabel={getTrustLabel}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ProviderCard({
  provider,
  getTrustColor,
  getTrustLabel,
}: {
  provider: Provider;
  getTrustColor: (score: number) => string;
  getTrustLabel: (score: number) => string;
}) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-primary-500 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold">{provider.name}</h3>
        <span
          className={`text-sm px-2 py-1 rounded ${getTrustColor(provider.trustScore)} bg-gray-700`}
        >
          {getTrustLabel(provider.trustScore)}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {provider.services.map((service) => (
            <span
              key={service}
              className="text-xs px-2 py-1 bg-gray-700 rounded-full text-gray-300"
            >
              {service}
            </span>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 text-sm">
        <span className="text-gray-400">Trust Score</span>
        <span className={getTrustColor(provider.trustScore)}>{provider.trustScore}/100</span>
      </div>

      <div className="flex justify-between items-center mb-4 text-sm">
        <span className="text-gray-400">Transactions</span>
        <span className="text-gray-300">{provider.totalTransactions}</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <span className="text-2xl font-bold text-primary-400">${provider.price}</span>
        <span className="text-gray-400 text-sm">/{provider.unit}</span>
      </div>

      {provider.trustScore < 30 && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-300">
          ⚠️ Warning: Low trust score. Firewall may block transactions.
        </div>
      )}

      <Link
        href={`/negotiate/${provider.id}`}
        className="block w-full text-center bg-primary-500 hover:bg-primary-600 py-3 rounded-lg font-medium transition-colors"
      >
        Start Negotiation
      </Link>
    </div>
  );
}
