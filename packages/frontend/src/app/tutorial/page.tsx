"use client";

import { useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface StepResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export default function TutorialPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState<Record<number, StepResult>>({});
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const steps = [
    {
      title: "👋 Welcome",
      description:
        "ZeroKey Treasury is a marketplace where AI agents can safely purchase API services.",
      details: `
**Key Features:**
- 🔍 **A2A Gateway**: Service discovery & price negotiation between AI agents
- 🛡️ **Firewall**: LLM-powered risk analysis and policy checks
- 💳 **x402 Payment**: USDC-based API payments

Click "Next" to start the tutorial!
      `,
      action: null,
    },
    {
      title: "🔍 Step 1: Search Providers",
      description: "Search for providers offering translation services.",
      details: `
**API Request:**
\`\`\`
GET /api/a2a/discover?service=translation
\`\`\`

This is the first step when a corporate AI assistant is asked to "translate this contract."
      `,
      action: async () => {
        const res = await fetch(`${API_URL}/api/a2a/discover?service=translation`);
        return await res.json();
      },
    },
    {
      title: "🤝 Step 2: Start Negotiation",
      description: "Start negotiation with a trusted provider (TranslateAI Pro).",
      details: `
**API Request:**
\`\`\`
POST /api/a2a/negotiate
{
  "clientId": "0xYourWallet",
  "providerId": "translate-ai-001",
  "service": "translation",
  "initialOffer": "0.025"
}
\`\`\`

Offering $0.025 against the provider's asking price of $0.03.
      `,
      action: async () => {
        const res = await fetch(`${API_URL}/api/a2a/negotiate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: "0xTutorialUser123",
            providerId: "translate-ai-001",
            service: "translation",
            initialOffer: "0.025",
          }),
        });
        const data = await res.json();
        if (data.session?.id) {
          setSessionId(data.session.id);
        }
        return data;
      },
    },
    {
      title: "💬 Step 3: Price Negotiation",
      description: "Submit an offer and reach an agreement.",
      details: `
**API Request:**
\`\`\`
POST /api/a2a/negotiate/{sessionId}/offer
{
  "amount": "0.028",
  "type": "offer"
}
\`\`\`

$0.028 is 90%+ of the provider's price, so it should be accepted.
      `,
      action: async () => {
        if (!sessionId) {
          return { error: "Please run Step 2 first" };
        }
        const res = await fetch(`${API_URL}/api/a2a/negotiate/${sessionId}/offer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: "0.028",
            type: "offer",
          }),
        });
        return await res.json();
      },
    },
    {
      title: "🛡️ Step 4: Firewall Check",
      description: "The Firewall analyzes transaction risk.",
      details: `
**API Request:**
\`\`\`
POST /api/firewall/check
{
  "sessionId": "{sessionId}"
}
\`\`\`

Firewall checks:
- Provider trust score
- Transaction amount vs budget
- Anomaly patterns

**On-chain recording:** Decision is recorded on Base Sepolia (ZeroKeyGuard contract).
      `,
      action: async () => {
        if (!sessionId) {
          return { error: "Please run Step 2 first" };
        }
        const res = await fetch(`${API_URL}/api/firewall/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        return await res.json();
      },
    },
    {
      title: "💳 Step 5: x402 Payment",
      description: "Calling the API without payment returns a 402 error.",
      details: `
**API Request (no payment):**
\`\`\`
POST /api/provider/translate
{
  "text": "hello",
  "targetLanguage": "ja"
}
\`\`\`

The 402 Payment Required response includes:
- Required payment amount
- USDC token address
- Recipient address
      `,
      action: async () => {
        const res = await fetch(`${API_URL}/api/provider/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: "hello",
            targetLanguage: "ja",
          }),
        });
        return await res.json();
      },
    },
    {
      title: "⚠️ Step 6: Low-Trust Provider Warning",
      description: "Selecting a suspicious provider (CheapTranslate) triggers a Firewall warning.",
      details: `
CheapTranslate characteristics:
- Trust score: 15/100 (very low)
- Price: $0.005 (1/6 of market average)
- Transactions: only 3

This is a typical scam risk pattern.
      `,
      action: async () => {
        // Start negotiation with sketchy provider
        const negRes = await fetch(`${API_URL}/api/a2a/negotiate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: "0xTutorialUser123",
            providerId: "sketchy-service-001",
            service: "translation",
            initialOffer: "0.005",
          }),
        });
        const negData = await negRes.json();

        if (!negData.session?.id) {
          return negData;
        }

        // Check firewall
        const fwRes = await fetch(`${API_URL}/api/firewall/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: negData.session.id }),
        });
        return await fwRes.json();
      },
    },
    {
      title: "🎉 Complete!",
      description: "You now understand the basic ZeroKey Treasury flow!",
      details: `
**What you learned:**

1. ✅ Provider Search - Find services via A2A Gateway
2. ✅ Price Negotiation - Negotiate prices between agents
3. ✅ Firewall Check - Risk analysis and approve/reject
4. ✅ x402 Payment - Pay API fees with USDC
5. ✅ Low-Trust Warning - Block suspicious providers

**Next Steps:**
- Try it out in the [Marketplace](/marketplace)
- Explore the API in [Swagger UI](/docs)
      `,
      action: null,
    },
  ];

  const runAction = async () => {
    const step = steps[currentStep];
    if (!step.action) return;

    setLoading(true);
    try {
      const data = await step.action();
      setResults((prev) => ({
        ...prev,
        [currentStep]: { success: true, data },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [currentStep]: { success: false, error: String(err) },
      }));
    } finally {
      setLoading(false);
    }
  };

  const step = steps[currentStep];
  const result = results[currentStep];

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="flex items-center justify-between p-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-cyan-400">ZeroKey</span>
          <span className="text-slate-400">Treasury</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/marketplace" className="text-slate-400 hover:text-white text-sm">
            Marketplace
          </Link>
          <Link href="/docs" className="text-slate-400 hover:text-white text-sm">
            API Docs
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-slate-500 mb-2">
            <span>Tutorial Progress</span>
            <span>
              {currentStep + 1} / {steps.length}
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full">
            <div
              className="h-1.5 bg-cyan-500 rounded-full transition-all"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Card */}
        <div className="bg-[#12121a] rounded-xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h1 className="text-xl font-semibold mb-2">{step.title}</h1>
            <p className="text-slate-400 text-sm">{step.description}</p>
          </div>

          <div className="p-6">
            <pre className="whitespace-pre-wrap text-sm text-slate-300 bg-black/30 p-4 rounded-lg font-mono">
              {step.details}
            </pre>

            {step.action && (
              <div className="mt-6">
                <button
                  onClick={runAction}
                  disabled={loading}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  {loading ? "Running..." : "🚀 Run API"}
                </button>
              </div>
            )}

            {result && (
              <div
                className={`mt-6 p-4 rounded-lg ${
                  result.success
                    ? "bg-emerald-500/10 border border-emerald-500/30"
                    : "bg-red-500/10 border border-red-500/30"
                }`}
              >
                <h3 className="font-medium mb-2 text-sm">
                  {result.success ? "✅ Success" : "❌ Error"}
                </h3>
                <pre className="text-xs overflow-x-auto text-slate-300">
                  {JSON.stringify(result.data || result.error, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="p-6 border-t border-white/10 flex justify-between">
            <button
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-sm transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setCurrentStep((s) => Math.min(steps.length - 1, s + 1))}
              disabled={currentStep === steps.length - 1}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-30 rounded-lg text-sm font-medium transition-colors"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <Link
            href="/marketplace"
            className="p-4 bg-[#12121a] rounded-xl border border-white/10 hover:border-cyan-500/50 text-center transition-colors"
          >
            <div className="text-2xl mb-2">🛍️</div>
            <div className="text-sm font-medium">Marketplace</div>
          </Link>
          <Link
            href="/docs"
            className="p-4 bg-[#12121a] rounded-xl border border-white/10 hover:border-cyan-500/50 text-center transition-colors"
          >
            <div className="text-2xl mb-2">📚</div>
            <div className="text-sm font-medium">API Docs</div>
          </Link>
          <a
            href="https://github.com/susumutomita/HackMoney2026"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-[#12121a] rounded-xl border border-white/10 hover:border-cyan-500/50 text-center transition-colors"
          >
            <div className="text-2xl mb-2">🐙</div>
            <div className="text-sm font-medium">GitHub</div>
          </a>
        </div>
      </div>
    </main>
  );
}
