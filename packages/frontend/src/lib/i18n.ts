export type Locale = "en" | "ja";

export const translations = {
  en: {
    // Common
    marketplace: "Marketplace",
    tutorial: "Tutorial",
    dashboard: "Dashboard",
    apiDocs: "API Docs",
    connectWallet: "Connect Wallet",
    next: "Next →",
    back: "← Back",
    search: "Search",
    loading: "Loading...",
    success: "Success",
    error: "Error",
    runApi: "🚀 Run API",
    running: "Running...",

    // Home
    homeTitle: "Execution Governance Layer",
    homeDescription:
      "AI-powered execution firewall that provides safety and governance for all payments and treasury operations in a multi-chain, agent-powered world.",
    getStarted: "Get Started",
    startTutorial: "📖 Start Tutorial",
    aiAnalysis: "AI Analysis",
    aiAnalysisDesc:
      "Semantic transaction analysis powered by LLMs to understand intent and assess risk",
    policyEngine: "Policy Engine",
    policyEngineDesc: "Enforce spending limits, KYC requirements, and protocol restrictions",
    onChainGuards: "On-Chain Guards",
    onChainGuardsDesc: "Smart contract enforcement with transparent audit trails",
    learnHow:
      "Learn how AI agents discover, negotiate, and pay for API services with built-in security.",

    // Marketplace
    marketplaceTitle: "📜 AI Agent API Marketplace",
    marketplaceDesc:
      "Discover and negotiate with AI service providers. Protected by ZeroKey Firewall.",
    searchPlaceholder: "Search services (e.g., translation, summarization)",
    noProviders: "No providers found",
    trusted: "Trusted",
    lowTrust: "Low Trust",
    moderate: "Moderate",
    trustScore: "Trust Score",
    transactions: "Transactions",
    startNegotiation: "Start Negotiation",
    lowTrustWarning: "⚠️ Warning: Low trust score. Firewall may block transactions.",

    // Tutorial
    tutorialProgress: "Tutorial Progress",
    step1Title: "👋 Introduction",
    step1Desc: "ZeroKey Treasury is a marketplace for AI agents to safely purchase API services.",
    step1Details: `
**Key Features:**
- 🔍 **A2A Gateway**: Service discovery and price negotiation between AI agents
- 🛡️ **Firewall**: Risk analysis and policy checks powered by LLM
- 💳 **x402 Payment**: API payments via USDC

Click "Next" to start the tutorial!
    `,
    step2Title: "🔍 Step 1: Provider Discovery",
    step2Desc: "Search for providers offering translation services.",
    step2Details: `
**API Request:**
\`\`\`
GET /api/a2a/discover?service=translation
\`\`\`

This is the first step when an enterprise AI assistant is asked to "translate this contract".
    `,
    step3Title: "🤝 Step 2: Start Negotiation",
    step3Desc: "Start negotiating with a trusted provider (TranslateAI Pro).",
    step3Details: `
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
    step4Title: "💬 Step 3: Price Negotiation",
    step4Desc: "Send an offer and reach an agreement.",
    step4Details: `
**API Request:**
\`\`\`
POST /api/a2a/negotiate/{sessionId}/offer
{
  "amount": "0.028",
  "type": "offer"
}
\`\`\`

$0.028 is 90%+ of the provider price, so it should be accepted.
    `,
    step5Title: "🛡️ Step 4: Firewall Check",
    step5Desc: "The Firewall analyzes the transaction risk.",
    step5Details: `
**API Request:**
\`\`\`
POST /api/firewall/check
{
  "sessionId": "{sessionId}"
}
\`\`\`

Firewall checks:
- Provider trust score
- Transaction amount and budget
- Anomaly patterns
    `,
    step6Title: "💳 Step 5: x402 Payment",
    step6Desc: "Calling the API without payment returns a 402 error.",
    step6Details: `
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
    step7Title: "⚠️ Step 6: Low Trust Provider Warning",
    step7Desc: "Choosing a suspicious provider (CheapTranslate) triggers a Firewall warning.",
    step7Details: `
CheapTranslate characteristics:
- Trust Score: 15/100 (very low)
- Price: $0.005 (1/6 of market average)
- Transactions: only 3

This is a typical fraud risk pattern.
    `,
    step8Title: "🎉 Complete!",
    step8Desc: "You now understand the basic ZeroKey Treasury flow!",
    step8Details: `
**What you learned:**

1. ✅ Provider Discovery - Find services via A2A Gateway
2. ✅ Price Negotiation - Negotiate prices between agents
3. ✅ Firewall Check - Risk analysis and approval/rejection
4. ✅ x402 Payment - Pay for API usage with USDC
5. ✅ Low Trust Warning - Block suspicious providers

**Next Steps:**
- Try the [Marketplace](/marketplace)
- Explore the [Swagger UI](/docs)
    `,
    runStep2First: "Please run Step 2 first",

    // Negotiation
    negotiateWith: "Negotiate with",
    services: "Services",
    basePrice: "Base Price",
    negotiationChat: "Negotiation Chat",
    you: "You",
    system: "System",
    yourOffer: "Your Offer (USDC)",
    sendOffer: "Send Offer",
    acceptPrice: "Accept Current Price",
    rejectExit: "Reject & Exit",
    payUsdc: "💳 Pay",
    connectToNegotiate: "Connect your wallet to start negotiating",
    backToMarketplace: "← Back to Marketplace",
  },
  ja: {
    // Common
    marketplace: "マーケットプレイス",
    tutorial: "チュートリアル",
    dashboard: "ダッシュボード",
    apiDocs: "API ドキュメント",
    connectWallet: "ウォレット接続",
    next: "次へ →",
    back: "← 戻る",
    search: "検索",
    loading: "読み込み中...",
    success: "成功",
    error: "エラー",
    runApi: "🚀 APIを実行",
    running: "実行中...",

    // Home
    homeTitle: "Execution Governance Layer",
    homeDescription:
      "マルチチェーン・エージェント時代のすべての支払いとトレジャリー運用に安全性とガバナンスを提供するAI実行ファイアウォール。",
    getStarted: "はじめる",
    startTutorial: "📖 チュートリアル開始",
    aiAnalysis: "AI分析",
    aiAnalysisDesc: "LLMによるセマンティックなトランザクション分析で意図を理解しリスクを評価",
    policyEngine: "ポリシーエンジン",
    policyEngineDesc: "支出制限、KYC要件、プロトコル制限を強制",
    onChainGuards: "オンチェーンガード",
    onChainGuardsDesc: "透明な監査証跡を持つスマートコントラクト強制",
    learnHow:
      "AIエージェントがセキュリティ機能付きでAPIサービスを発見・交渉・決済する方法を学びましょう。",

    // Marketplace
    marketplaceTitle: "📜 AI Agent API マーケットプレイス",
    marketplaceDesc: "AIサービスプロバイダを発見し交渉。ZeroKey Firewallで保護。",
    searchPlaceholder: "サービスを検索（例：translation, summarization）",
    noProviders: "プロバイダが見つかりません",
    trusted: "信頼済み",
    lowTrust: "低信頼",
    moderate: "中程度",
    trustScore: "信頼スコア",
    transactions: "取引数",
    startNegotiation: "交渉を開始",
    lowTrustWarning:
      "⚠️ 警告: 信頼スコアが低いです。Firewallがトランザクションをブロックする可能性があります。",

    // Tutorial
    tutorialProgress: "チュートリアル進捗",
    step1Title: "👋 はじめに",
    step1Desc:
      "ZeroKey Treasuryは、AIエージェントがAPIサービスを安全に購入するためのマーケットプレイスです。",
    step1Details: `
**主要機能:**
- 🔍 **A2A Gateway**: AIエージェント間のサービス検索・価格交渉
- 🛡️ **Firewall**: LLMによるリスク分析とポリシーチェック
- 💳 **x402 Payment**: USDCによるAPI決済

「次へ」をクリックしてチュートリアルを開始しましょう！
    `,
    step2Title: "🔍 Step 1: プロバイダ検索",
    step2Desc: "翻訳サービスを提供するプロバイダを検索します。",
    step2Details: `
**APIリクエスト:**
\`\`\`
GET /api/a2a/discover?service=translation
\`\`\`

これは企業AI秘書が「この契約書を翻訳して」と依頼されたときの最初のステップです。
    `,
    step3Title: "🤝 Step 2: 交渉開始",
    step3Desc: "信頼できるプロバイダ(TranslateAI Pro)と交渉を開始します。",
    step3Details: `
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
    step4Title: "💬 Step 3: 価格交渉",
    step4Desc: "オファーを送信して合意に達します。",
    step4Details: `
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
    step5Title: "🛡️ Step 4: Firewallチェック",
    step5Desc: "Firewallが取引のリスクを分析します。",
    step5Details: `
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
    step6Title: "💳 Step 5: x402決済",
    step6Desc: "決済なしでAPIを呼ぶと402エラーが返ります。",
    step6Details: `
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
    step7Title: "⚠️ Step 6: 低信頼プロバイダの警告",
    step7Desc: "怪しいプロバイダ(CheapTranslate)を選ぶとFirewallが警告します。",
    step7Details: `
CheapTranslateの特徴:
- 信頼スコア: 15/100 (非常に低い)
- 価格: $0.005 (市場平均の1/6)
- 取引数: 3件のみ

これは詐欺リスクの典型的なパターンです。
    `,
    step8Title: "🎉 完了！",
    step8Desc: "ZeroKey Treasuryの基本フローを理解しました！",
    step8Details: `
**学んだこと:**

1. ✅ プロバイダ検索 - A2A Gatewayでサービスを見つける
2. ✅ 価格交渉 - エージェント間で価格を交渉
3. ✅ Firewallチェック - リスク分析と承認/拒否
4. ✅ x402決済 - USDCでAPI利用料を支払い
5. ✅ 低信頼警告 - 怪しいプロバイダをブロック

**次のステップ:**
- [マーケットプレイス](/marketplace)で実際に試す
- [Swagger UI](/docs)でAPIを探索
    `,
    runStep2First: "先にStep 2を実行してください",

    // Negotiation
    negotiateWith: "との交渉",
    services: "サービス",
    basePrice: "基本価格",
    negotiationChat: "交渉チャット",
    you: "あなた",
    system: "システム",
    yourOffer: "オファー金額 (USDC)",
    sendOffer: "オファー送信",
    acceptPrice: "現在の価格で承諾",
    rejectExit: "拒否して終了",
    payUsdc: "💳 支払う",
    connectToNegotiate: "交渉を開始するにはウォレットを接続してください",
    backToMarketplace: "← マーケットプレイスに戻る",
  },
} as const;

export function getTranslation(locale: Locale) {
  return translations[locale];
}

export function detectLocale(): Locale {
  const nav = (globalThis as any)?.navigator as { language?: string } | undefined;
  const lang = (nav?.language ?? "en").toLowerCase();
  if (lang.startsWith("ja")) return "ja";
  return "en";
}
