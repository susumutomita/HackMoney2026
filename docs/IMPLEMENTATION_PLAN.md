# 実装計画

## Phase 1: 基盤整備 (Day 1-2)

### 1.1 既存コードのリファクタリング

- [ ] `analyzer.ts`: Claude CLI → Anthropic API直接呼び出しに変更
- [ ] プロンプトをA2A/APIマーケットプレイス用に更新
- [ ] ポリシースキーマの拡張（予算、プロバイダ信頼度）

### 1.2 プロバイダレジストリ

```typescript
// packages/backend/src/db/schema.ts に追加

const providers = sqliteTable("providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  endpoint: text("endpoint").notNull(),
  services: text("services").notNull(), // JSON
  trustScore: integer("trust_score").default(50),
  totalTransactions: integer("total_transactions").default(0),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
```

### 1.3 デモプロバイダの作成

3つのモックプロバイダを作成:

1. **TranslateAI**: 翻訳サービス ($0.03/1000トークン)
2. **SummarizeBot**: 要約サービス ($0.02/ページ)
3. **SketchyService**: 怪しいサービス ($0.005 - 安すぎて詐欺リスク)

---

## Phase 2: A2A Gateway (Day 3-4)

### 2.1 サービスディスカバリ API

```typescript
// GET /api/a2a/discover
app.get("/discover", async (c) => {
  const { service, maxPrice } = c.req.query();
  const providers = await findProviders(service, maxPrice);
  return c.json(providers);
});
```

### 2.2 交渉エンジン

```typescript
// packages/backend/src/services/negotiation.ts

export class NegotiationEngine {
  async startSession(clientId: string, providerId: string): Promise<Session>;
  async makeOffer(sessionId: string, amount: number): Promise<OfferResult>;
  async acceptOffer(sessionId: string): Promise<Agreement>;
  async rejectOffer(sessionId: string, reason: string): Promise<void>;
}
```

### 2.3 WebSocketリアルタイム交渉

```typescript
// packages/backend/src/websocket/negotiation.ts

const wss = new WebSocketServer({ port: 3002 });

wss.on("connection", (ws) => {
  ws.on("message", async (data) => {
    const msg = JSON.parse(data);
    switch (msg.type) {
      case "offer":
        // A2Aオファー処理
        break;
      case "counter":
        // カウンターオファー
        break;
      case "accept":
        // 合意 → Firewallチェックへ
        break;
    }
  });
});
```

---

## Phase 3: Firewall強化 (Day 5-6)

### 3.1 LLM分析プロンプト

```typescript
const MARKETPLACE_ANALYSIS_PROMPT = `
You are a security analyst for an AI Agent API Marketplace.
Analyze this service purchase request:

**Request Details:**
- Service: {service}
- Provider: {providerName} (Trust Score: {trustScore}/100)
- Amount: ${amount} USDC
- Purpose: {purpose}

**User Policy:**
- Daily Budget: ${dailyBudget} USDC
- Remaining Today: ${remaining} USDC
- Allowed Categories: {categories}

**Risk Indicators:**
- Provider is new (< 10 transactions): {isNew}
- Price significantly below market: {belowMarket}
- Unusual request pattern: {unusual}

Respond with JSON:
{
  "riskLevel": 1|2|3,
  "approved": boolean,
  "reason": "string",
  "warnings": ["string"]
}
`;
```

### 3.2 ポリシーチェック

```typescript
interface PolicyCheck {
  checkBudget(amount: number, userId: string): Promise<boolean>;
  checkProvider(providerId: string): Promise<{ trusted: boolean; score: number }>;
  checkRateLimit(userId: string): Promise<boolean>;
  checkCategory(service: string, allowedCategories: string[]): boolean;
}
```

---

## Phase 4: x402 Payment (Day 7-8)

### 4.1 x402プロトコル実装

```typescript
// packages/backend/src/middleware/x402.ts

export const x402Middleware = async (c, next) => {
  const paymentHeader = c.req.header("X-Payment");

  if (!paymentHeader) {
    // 402 Payment Requiredを返す
    return c.json(
      {
        status: 402,
        paymentRequired: {
          amount: "25000", // 0.025 USDC in wei
          recipient: PROVIDER_ADDRESS,
          token: USDC_ADDRESS,
          chainId: 84532,
          expiresAt: Date.now() + 300000,
        },
      },
      402
    );
  }

  // Payment Proof検証
  const isValid = await verifyPaymentProof(paymentHeader);
  if (!isValid) {
    return c.json({ error: "Invalid payment proof" }, 402);
  }

  await next();
};
```

### 4.2 USDC決済統合

CircleのUSDCを使用:

- Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

```typescript
// packages/backend/src/services/payment.ts

export async function processPayment(
  payer: Address,
  recipient: Address,
  amount: bigint,
  serviceId: string
): Promise<{ txHash: string }> {
  // 1. Firewall承認確認
  const decision = await guardService.isApproved(txHash);
  if (!decision) throw new Error("Not approved by firewall");

  // 2. USDC送金実行
  const txHash = await executeUSDCTransfer(payer, recipient, amount);

  // 3. オンチェーン記録
  await guardService.submitDecision(txHash, true, 1, "Payment completed");

  return { txHash };
}
```

---

## Phase 5: Frontend UI (Day 9-10)

### 5.1 ページ構成

```
packages/frontend/src/app/
├── page.tsx              # Dashboard
├── marketplace/
│   └── page.tsx          # プロバイダ一覧
├── negotiate/
│   └── [sessionId]/
│       └── page.tsx      # 交渉画面
├── history/
│   └── page.tsx          # 取引履歴
└── settings/
    └── page.tsx          # ポリシー設定
```

### 5.2 主要コンポーネント

1. **ProviderCard**: プロバイダ情報表示
2. **NegotiationChat**: A2A交渉UI
3. **FirewallStatus**: 承認ステータス表示
4. **TransactionHistory**: 取引履歴テーブル

---

## Phase 6: 統合テスト & デモ (Day 11-12)

### 6.1 E2Eテストシナリオ

1. プロバイダ検索 → 交渉 → 承認 → 決済 (正常系)
2. 予算超過 → Firewallブロック (異常系)
3. 詐欺プロバイダ → 警告表示 (セキュリティ)

### 6.2 デモ動画作成

1. プロダクト概要 (30秒)
2. ユースケースデモ (2分)
3. 技術アーキテクチャ (1分)

---

## タイムライン

| Day   | タスク      | 成果物                     |
| ----- | ----------- | -------------------------- |
| 1-2   | 基盤整備    | リファクタリング済みコード |
| 3-4   | A2A Gateway | 交渉API動作                |
| 5-6   | Firewall    | LLM分析動作                |
| 7-8   | x402        | 決済フロー動作             |
| 9-10  | Frontend    | UI完成                     |
| 11-12 | 統合        | デモ準備完了               |

---

## 次のファイル: UI_UX.md
