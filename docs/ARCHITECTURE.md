# アーキテクチャ詳細設計

## システム構成図

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Frontend (Next.js 15)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Dashboard   │  │  Marketplace │  │  Negotiation │  │   History   │  │
│  │  (概要)      │  │  (プロバイダ) │  │  (A2A交渉)  │  │  (履歴)      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────┬──────────────────────────────────────────┘
                                 │
                    WebSocket + REST API
                                 │
┌─────────────────────────────────┼──────────────────────────────────────────┐
│                           Backend (Hono)                                   │
│                                                                            │
│  ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐   │
│  │ A2A Gateway       │   │ Firewall Engine  │   │ x402 Handler     │   │
│  │ - Discovery       │   │ - LLM Analyzer   │   │ - Payment Req    │   │
│  │ - Negotiation     │   │ - Policy Check   │   │ - Verify Proof   │   │
│  │ - Message Relay   │   │ - Risk Scoring   │   │ - Settlement     │   │
│  └─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘   │
│            │                    │                    │                    │
└────────────┼────────────────────┼────────────────────┼───────────────────┘
             │                    │                    │
             ▼                    ▼                    ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│ Agent Registry    │   │ SQLite DB        │   │ Blockchain        │
│ (Provider List)   │   │ (History)        │   │ (Base Sepolia)    │
└───────────────────┘   └───────────────────┘   └───────────────────┘
                                                   │
                                    ┌─────────────┴──────────────┐
                                    │ Smart Contracts                │
                                    │ - ZeroKeyGuard.sol             │
                                    │ - x402PaymentVerifier.sol      │
                                    │ - AgentRegistry.sol            │
                                    └─────────────────────────────┘
```

---

## コアコンポーネント

### 1. A2A Gateway

**目的**: AIエージェント間のサービス検索・価格交渉

```typescript
// packages/backend/src/services/a2a-gateway.ts

interface ServiceProvider {
  id: string;
  name: string;
  endpoint: string;
  services: ServiceCapability[];
  trustScore: number; // 0-100
  pricing: PricingModel;
}

interface NegotiationSession {
  sessionId: string;
  clientAgent: string;
  providerAgent: string;
  service: string;
  offers: Offer[];
  status: "negotiating" | "agreed" | "rejected";
  agreedPrice?: number;
}
```

### 2. Firewall Engine

**目的**: トランザクションのリスク分析・承認判定

```typescript
// packages/backend/src/services/firewall.ts

interface FirewallDecision {
  approved: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
  checks: {
    budget: CheckResult;
    provider: CheckResult;
    purpose: CheckResult;
    rateLimit: CheckResult;
    anomaly: CheckResult;
  };
}

interface Policy {
  dailyBudget: number; // USDC
  maxSingleTx: number; // USDC
  allowedCategories: string[];
  blockedProviders: string[];
  requireApprovalAbove: number;
}
```

### 3. x402 Handler

**目的**: HTTP 402プロトコルによる決済処理

```typescript
// packages/backend/src/services/x402-handler.ts

interface PaymentRequest {
  amount: string; // USDC (wei)
  recipient: Address;
  serviceId: string;
  expiresAt: number;
  signature: string;
}

interface PaymentProof {
  txHash: string;
  chainId: number;
  payer: Address;
  amount: string;
}
```

---

## データフロー

### A2A交渉 → Firewall → 決済

```
1. Client Agentがサービス検索
   GET /api/a2a/discover?service=translation
   → [{provider: "TranslateAI", price: "0.03", trustScore: 85}, ...]

2. 交渉セッション開始
   POST /api/a2a/negotiate
   {
     providerId: "translate-ai-001",
     service: "translation",
     params: {wordCount: 5000, targetLang: "en"}
   }

3. オファー交換 (WebSocket)
   Client: {offer: "0.02"}
   Provider: {counter: "0.025"}
   Client: {accept: "0.025"}

4. Firewallチェック
   POST /api/firewall/check
   {
     provider: "translate-ai-001",
     amount: "0.025",
     purpose: "business document translation"
   }
   → {approved: true, riskLevel: "LOW"}

5. x402決済
   GET /api/provider/translate (with x-payment header)
   → 402 Payment Required
   → Payment Proof送信
   → 200 OK + 翻訳結果

6. オンチェーン記録
   ZeroKeyGuard.submitDecision(txHash, approved, riskLevel)
```

---

## スマートコントラクト

### ZeroKeyGuard.sol (既存拡張)

```solidity
// 既存機能: submitDecision, isApproved, validateTransaction

// 追加機能:
function setDailyBudget(uint256 amount) external onlyOwner;
function getRemainingBudget() external view returns (uint256);
function addTrustedProvider(address provider) external onlyOwner;
```

### x402PaymentVerifier.sol (新規)

```solidity
contract x402PaymentVerifier {
  function verifyPayment(
    bytes32 paymentHash,
    address payer,
    address recipient,
    uint256 amount,
    bytes calldata signature
  ) external returns (bool);

  function settlePayment(
    address token, // USDC
    address recipient,
    uint256 amount,
    bytes32 serviceId
  ) external returns (bool);
}
```

---

## 次のファイル: IMPLEMENTATION_PLAN.md
