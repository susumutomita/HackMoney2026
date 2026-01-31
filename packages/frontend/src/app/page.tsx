import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <nav className="flex items-center justify-between p-6 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary-400">ZeroKey</span>
          <span className="text-gray-400">Treasury</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/tutorial"
            className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
          >
            📖 Tutorial
          </Link>
          <Link
            href="/marketplace"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Marketplace
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <ConnectButton />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <section className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent">
            Execution Governance Layer
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            AI-powered execution firewall that provides safety and governance for all payments and
            treasury operations in a multi-chain, agent-powered world.
          </p>
        </section>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <FeatureCard
            title="AI Analysis"
            description="Semantic transaction analysis powered by LLMs to understand intent and assess risk"
            icon="🧠"
          />
          <FeatureCard
            title="Policy Engine"
            description="Enforce spending limits, KYC requirements, and protocol restrictions"
            icon="📋"
          />
          <FeatureCard
            title="On-Chain Guards"
            description="Smart contract enforcement with transparent audit trails"
            icon="🛡️"
          />
        </div>

        <section className="bg-gray-800/50 rounded-xl p-8 border border-gray-700 text-center">
          <h2 className="text-2xl font-semibold mb-4">Get Started</h2>
          <p className="text-gray-400 mb-6">
            Learn how AI agents discover, negotiate, and pay for API services with built-in security.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/tutorial"
              className="inline-block bg-primary-500 hover:bg-primary-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              📖 Start Tutorial
            </Link>
            <Link
              href="/marketplace"
              className="inline-block bg-gray-700 hover:bg-gray-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              🛍️ Marketplace
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-primary-500 transition-colors">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
