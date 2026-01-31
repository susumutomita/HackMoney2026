"use client";

import { useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
      title: "👋 はじめに",
      description: "ZeroKey Treasuryは、AIエージェントがAPIサービスを安全に購入するためのマーケットプレイスです。",
      details: `
**主要機能:**
- 🔍 **A2A Gateway**: AIエージェント間のサービス検索・価格交渉
- 🛡️ **Firewall**: LLMによるリスク分析とポリシーチェック
- 💳 **x402 Payment**: USDCによるAPI決済

「次へ」をクリックしてチュートリアルを開始しましょう！
      `,
      action: null,
    },
    {
      title: "🔍 Step 1: プロバイダ検索",
      description: "翻訳サービスを提供するプロバイダを検索します。",
      details: `
**APIリクエスト:**
\`\`\`
GET /api/a2a/discover?service=translation
\`\`\`

これは企業AI秘書が「この契約書を翻訳して」と依頼されたときの最初のステップです。
      `,
      action: async () => {
        const res = await fetch(`${API_URL}/api/a2a/discover?service=translation`);
        return await res.json();
      },
    },
    {
      title: "🤝 Step 2: 交渉開始",
      description: "信頼できるプロバイダ(TranslateAI Pro)と交渉を開始します。",
      details: `
**APIリクエスト:**
\`\`\`
POST /api/a2a/negotiate
{
  "clientId": "0xYourWallet",
  "providerId": "translate-ai-001",
  "service": "translation",
  "initialOffer": "0.025"
}
\`\`\`

プロバイダの希望価格$0.03に対して$0.025をオファーします。
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
      title: "💬 Step 3: 価格交渉",
      description: "オファーを送信して合意に達します。",
      details: `
**APIリクエスト:**
\`\`\`
POST /api/a2a/negotiate/{sessionId}/offer
{
  "amount": "0.028",
  "type": "offer"
}
\`\`\`

$0.028はプロバイダ価格の90%以上なので、承認されるはずです。
      `,
      action: async () => {
        if (!sessionId) {
          return { error: "先にStep 2を実行してください" };
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
      title: "🛡️ Step 4: Firewallチェック",
      description: "Firewallが取引のリスクを分析します。",
      details: `
**APIリクエスト:**
\`\`\`
POST /api/firewall/check
{
  "sessionId": "{sessionId}"
}
\`\`\`

Firewallは以下をチェック:
- プロバイダの信頼スコア
- 取引金額と予算
- 異常パターン
      `,
      action: async () => {
        if (!sessionId) {
          return { error: "先にStep 2を実行してください" };
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
      title: "💳 Step 5: x402決済",
      description: "決済なしでAPIを呼ぶと402エラーが返ります。",
      details: `
**APIリクエスト (決済なし):**
\`\`\`
POST /api/provider/translate
{
  "text": "hello",
  "targetLanguage": "ja"
}
\`\`\`

402 Payment Requiredレスポンスには:
- 必要な決済金額
- USDCトークンアドレス
- 支払い先アドレス
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
      title: "⚠️ Step 6: 低信頼プロバイダの警告",
      description: "怪しいプロバイダ(CheapTranslate)を選ぶとFirewallが警告します。",
      details: `
CheapTranslateの特徴:
- 信頼スコア: 15/100 (非常に低い)
- 価格: $0.005 (市場平均の1/6)
- 取引数: 3件のみ

これは詐欺リスクの典型的なパターンです。
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
      title: "🎉 完了！",
      description: "ZeroKey Treasuryの基本フローを理解しました！",
      details: `
**学んだこと:**

1. ✅ プロバイダ検索 - A2A Gatewayでサービスを見つける
2. ✅ 価格交渉 - エージェント間で価格を交渉
3. ✅ Firewallチェック - リスク分析と承認/拒否
4. ✅ x402決済 - USDCでAPI利用料を支払い
5. ✅ 低信頼警告 - 怪しいプロバイダをブロック

**次のステップ:**
- [Marketplace](/marketplace)で実際に試す
- [Swagger UI](/docs)でAPIを探索
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
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <nav className="flex items-center justify-between p-6 border-b border-gray-700">
        <Link href="/">
          <span className="text-2xl font-bold text-primary-400">ZeroKey</span>
          <span className="text-gray-400"> Treasury</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/marketplace" className="text-gray-300 hover:text-white">
            Marketplace
          </Link>
          <Link href="/docs" className="text-gray-300 hover:text-white">
            API Docs
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Tutorial Progress</span>
            <span>{currentStep + 1} / {steps.length}</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full">
            <div
              className="h-2 bg-primary-500 rounded-full transition-all"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Card */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h1 className="text-2xl font-bold mb-2">{step.title}</h1>
            <p className="text-gray-400">{step.description}</p>
          </div>

          <div className="p-6">
            <div className="prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-gray-900 p-4 rounded-lg">
                {step.details}
              </pre>
            </div>

            {step.action && (
              <div className="mt-6">
                <button
                  onClick={runAction}
                  disabled={loading}
                  className="px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
                >
                  {loading ? "実行中..." : "🚀 APIを実行"}
                </button>
              </div>
            )}

            {result && (
              <div className={`mt-6 p-4 rounded-lg ${
                result.success ? "bg-green-900/30 border border-green-700" : "bg-red-900/30 border border-red-700"
              }`}>
                <h3 className="font-semibold mb-2">
                  {result.success ? "✅ 成功" : "❌ エラー"}
                </h3>
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(result.data || result.error, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="p-6 border-t border-gray-700 flex justify-between">
            <button
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
            >
              ← 戻る
            </button>
            <button
              onClick={() => setCurrentStep((s) => Math.min(steps.length - 1, s + 1))}
              disabled={currentStep === steps.length - 1}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
            >
              次へ →
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <Link
            href="/marketplace"
            className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-primary-500 text-center"
          >
            <div className="text-2xl mb-2">🛍️</div>
            <div className="font-medium">Marketplace</div>
          </Link>
          <Link
            href="/docs"
            className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-primary-500 text-center"
          >
            <div className="text-2xl mb-2">📚</div>
            <div className="font-medium">API Docs</div>
          </Link>
          <a
            href="https://github.com/susumutomita/HackMoney2026"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-primary-500 text-center"
          >
            <div className="text-2xl mb-2">🐙</div>
            <div className="font-medium">GitHub</div>
          </a>
        </div>
      </div>
    </main>
  );
}
