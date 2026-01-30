# ZeroKey Treasury - CLAUDE.md

このドキュメントは、ZeroKey Treasuryプロジェクトで作業するAIアシスタント向けの包括的なガイドを提供します。

## プロジェクト概要

### ZeroKey Treasuryとは？

ZeroKey Treasuryは **AI Agent API Marketplace with Execution Firewall** - AIエージェントがAPIサービスを自律的に発見・交渉・決済する際の「実行ファイアウォール」です。

### 主要コンセプト

1. **A2A (Agent-to-Agent) Gateway** - AIエージェント間のサービス検索・価格交渉
2. **Execution Firewall** - LLMによるセマンティック分析 + ポリシーチェック
3. **x402 Payment** - HTTP 402プロトコルによるUSDC決済
4. **On-chain Guard** - 承認決定をブロックチェーンに記録

### ユースケース: AI秘書がAPIサービスを利用

```
[企業のAI秘書] 「この契約書を英語に翻訳して」
        │
        ▼ A2A Discovery & Negotiation
[翻訳サービスA] 「$0.05/1000トークン」
[翻訳サービスB] 「$0.03/1000トークン」
[翻訳サービスC] 「$0.01/1000トークン」← 怪しい新規プロバイダ
        │
        ▼ 交渉結果: サービスB選択 ($0.03)
        │
        ▼ ZeroKey Firewall
    ┌────────────────────────────────────────┐
    │ LLM分析結果:                           │
    │ • 目的: 業務文書翻訳 ✅               │
    │ • 金額: $0.03 (予算内) ✅             │
    │ • プロバイダ: 信頼スコア 85/100 ✅    │
    │ • リスク: LOW                          │
    │ → APPROVED                             │
    └────────────────────────────────────────┘
        │
        ▼ x402 Payment
    HTTP 402 → Payment Proof → API Response
```

### Firewallがブロックするケース

| ケース           | 理由                           |
| ---------------- | ------------------------------ |
| 予算超過         | 日次上限$100を超える利用       |
| 不審なプロバイダ | 新規 + 極端に安い = 詐欺リスク |
| 業務外利用       | ゲーム翻訳、個人用途など       |
| 異常パターン     | 短時間に大量リクエスト         |

---

## アーキテクチャ

### パッケージ構成

```
packages/
├── contracts/    # Solidityスマートコントラクト（Foundry）
├── backend/      # APIサーバー（Hono + Claude API + WebSocket）
├── frontend/     # ダッシュボード（Next.js 15 + React 19）
└── shared/       # 共有型と定数
```

### コアコンポーネント

| コンポーネント   | 場所                                        | 技術             | 目的               |
| ---------------- | ------------------------------------------- | ---------------- | ------------------ |
| **ZeroKeyGuard** | `packages/contracts/src/ZeroKeyGuard.sol`   | Solidity 0.8.24  | オンチェーン強制   |
| **A2A Gateway**  | `packages/backend/src/routes/a2a.ts`        | Hono + WebSocket | サービス検索・交渉 |
| **Firewall**     | `packages/backend/src/services/firewall.ts` | TypeScript       | ポリシーチェック   |
| **Analyzer**     | `packages/backend/src/services/analyzer.ts` | Anthropic SDK    | LLMリスク分析      |
| **x402 Handler** | `packages/backend/src/routes/x402.ts`       | Hono             | USDC決済処理       |
| **Types**        | `packages/shared/src/types.ts`              | TypeScript       | 共有型定義         |

### データフロー

```
1. Client Agentがサービス検索
   GET /api/a2a/discover?service=translation
   → [{provider: "TranslateAI", price: "0.03", trustScore: 85}, ...]

2. 交渉セッション開始
   POST /api/a2a/negotiate
   {providerId: "translate-ai-001", service: "translation"}

3. オファー交換 (WebSocket)
   Client: {offer: "0.02"}
   Provider: {counter: "0.025"}
   Client: {accept: "0.025"}

4. Firewallチェック
   POST /api/firewall/check
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

## 主要ファイルリファレンス

### スマートコントラクト

| ファイル                                              | 目的                                            |
| ----------------------------------------------------- | ----------------------------------------------- |
| `packages/contracts/src/ZeroKeyGuard.sol`             | メインガードコントラクト - 承認ストレージ、検証 |
| `packages/contracts/src/interfaces/IZeroKeyGuard.sol` | インターフェース定義                            |
| `packages/contracts/script/Deploy.s.sol`              | デプロイスクリプト                              |
| `packages/contracts/test/ZeroKeyGuard.t.sol`          | Forgeテスト                                     |

### バックエンド

| ファイル                                    | 目的                               |
| ------------------------------------------- | ---------------------------------- |
| `packages/backend/src/index.ts`             | Honoアプリエントリポイント         |
| `packages/backend/src/services/analyzer.ts` | LLM分析ロジック（Claude API）      |
| `packages/backend/src/routes/analyze.ts`    | トランザクション分析エンドポイント |
| `packages/backend/src/routes/policy.ts`     | ポリシー管理エンドポイント         |
| `packages/backend/src/config.ts`            | 環境設定（Zodスキーマ）            |

### 共有

| ファイル                           | 目的                                                       |
| ---------------------------------- | ---------------------------------------------------------- |
| `packages/shared/src/types.ts`     | `RiskLevel`, `TransactionClassification`, `AnalysisResult` |
| `packages/shared/src/constants.ts` | `SUPPORTED_CHAINS`, `DEFAULT_THRESHOLDS`                   |

---

## コード規約

### Solidity

- **コンパイラ**: `^0.8.24`
- **カスタムエラー**: `require(..., "message")`より`error Unauthorized()`を優先
- **イベント**: すべての状態変更で発行
- **NatSpec**: すべてのpublic/external関数をドキュメント化
- **モディファイア**: `onlyOwner`, `onlyPolicyOracle`
- **定数**: UPPER_SNAKE_CASE (`LOW_RISK = 1`)

### TypeScript

- **Strictモード**: すべてのパッケージで有効
- **バリデーション**: ランタイム検証にZodスキーマを使用
- **型**: `@zerokey/shared`からエクスポート
- **インポート**: ESM互換性のため`.js`拡張子を使用
- **命名**: 変数/関数はcamelCase、型/クラスはPascalCase

### インポート順序

```typescript
// 1. 外部パッケージ
import Anthropic from "@anthropic-ai/sdk";
import { Hono } from "hono";

// 2. 内部パッケージ
import { RiskLevel } from "@zerokey/shared";

// 3. 相対インポート
import { config } from "../config.js";
```

---

## 開発コマンド

### ルートレベル（pnpm workspace）

```bash
# 開発
pnpm dev              # フロントエンドのみ
pnpm dev:backend      # バックエンドのみ
pnpm dev:all          # 全パッケージを並列実行

# ビルド
pnpm build            # 全パッケージをビルド
pnpm build:contracts  # コントラクトのみ
pnpm build:backend    # バックエンドのみ
pnpm build:frontend   # フロントエンドのみ

# テスト
pnpm test             # 全テスト
pnpm test:contracts   # Forgeテスト
pnpm test:backend     # Vitest
pnpm test:frontend    # Vitest

# 品質
pnpm lint             # ESLintチェック
pnpm lint:fix         # ESLint自動修正
pnpm format           # Prettierフォーマット
pnpm format:check     # Prettierチェック
pnpm typecheck        # TypeScriptチェック
```

### コントラクトパッケージ

```bash
cd packages/contracts

forge build           # コントラクトをコンパイル
forge test            # テストを実行
forge test -vvvv      # 詳細なテスト出力
forge coverage        # カバレッジレポート
forge gas-report      # ガス使用量レポート
forge fmt             # Solidityをフォーマット

# デプロイ
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
```

---

## テスト戦略

### スマートコントラクト（Forge）

- 場所: `packages/contracts/test/`
- パターン: `ContractName.t.sol`
- 主要テスト:
  - `testSubmitDecision` - オラクルが決定を送信できる
  - `testUnauthorizedSubmit` - 非オラクルは送信できない
  - `testValidateTransaction` - 未承認でリバート

### バックエンド（Vitest）

- 場所: `packages/backend/src/**/*.test.ts`
- 主要テスト:
  - APIエンドポイントのレスポンス
  - LLM分析のエラーハンドリング
  - ポリシーバリデーション

### フロントエンド（Vitest）

- 場所: `packages/frontend/src/**/*.test.tsx`
- 主要テスト:
  - コンポーネントレンダリング
  - ウォレット接続
  - API連携

---

## セキュリティ考慮事項

### シークレット管理

- `.env`ファイルは**絶対に**コミットしない
- APIキーは環境変数に保存
- `.env.example`をテンプレートリファレンスとして使用

### 信頼モデル

```
┌─────────────────────────────────────────────────┐
│                   オーナー                       │
│  • policyOracleを更新可能                        │
│  • 所有権を移転可能                              │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│               ポリシーオラクル                   │
│  • submitDecision()を呼べる唯一のアドレス        │
│  • POLICY_ORACLE_PRIVATE_KEYを持つバックエンドサービス│
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│                  ユーザー                        │
│  • isApproved()をクエリ可能                      │
│  • トランザクションは承認に対して検証される       │
└─────────────────────────────────────────────────┘
```

### フェイルセーフ設計

```typescript
// analyzer.ts - LLM失敗時はデフォルトでHIGH_RISK + ブロック
catch (error) {
  return {
    riskLevel: 3,          // HIGH_RISK
    classification: "unknown",
    approved: false,       // デフォルトでブロック
    reason: "Analysis failed - transaction blocked as precaution",
  };
}
```

### イベント監査証跡

すべての決定がイベントとして記録されます：

- `TransactionApproved(txHash, riskLevel, reason)`
- `TransactionRejected(txHash, riskLevel, reason)`
- `PolicyOracleUpdated(oldOracle, newOracle)`
- `OwnershipTransferred(previousOwner, newOwner)`

---

## 実装ロードマップ

詳細は `docs/IMPLEMENTATION_PLAN.md` を参照。

| Phase | 内容                                               | 期間      |
| ----- | -------------------------------------------------- | --------- |
| 1     | 基盤整備（analyzer.ts → API直接、プロバイダDB）    | Day 1-2   |
| 2     | A2A Gateway（サービスディスカバリ、交渉WebSocket） | Day 3-4   |
| 3     | Firewall強化（LLMプロンプト、ポリシーチェック）    | Day 5-6   |
| 4     | x402 Payment（402ミドルウェア、USDC統合）          | Day 7-8   |
| 5     | Frontend UI（マーケットプレイス、交渉画面）        | Day 9-10  |
| 6     | 統合テスト & デモ                                  | Day 11-12 |

---

## 一般的な開発タスク

### 新しいプロバイダの追加

1. `packages/backend/src/db/schema.ts` にプロバイダレコードを追加
2. `packages/backend/src/routes/a2a.ts` にエンドポイントを追加
3. テストを追加

### Firewallルールの追加

1. `packages/backend/src/services/firewall.ts` にチェックロジックを追加
2. `packages/backend/src/services/analyzer.ts` のLLMプロンプトを拡張
3. テストを追加

### x402決済のテスト

```bash
# 402レスポンスの確認
curl -I http://localhost:3001/api/provider/service
# → HTTP/1.1 402 Payment Required

# Payment Proof付きリクエスト
curl -H "X-Payment: <payment_proof>" http://localhost:3001/api/provider/service
```

### 新しいネットワークへのデプロイ

1. `.env`にRPC URLと秘密鍵を設定
2. デプロイを実行：
   ```bash
   cd packages/contracts
   forge script script/Deploy.s.sol \
     --rpc-url $YOUR_RPC_URL \
     --broadcast \
     --verify
   ```
3. `.env`の`GUARD_CONTRACT_ADDRESS`を更新

---

## 環境変数

### 必須

| 変数                    | 説明                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`     | トランザクション分析用のClaude APIキー                                                |
| `PRIVATE_KEY`           | デプロイヤーウォレットの秘密鍵                                                        |
| `USDC_CONTRACT_ADDRESS` | USDCコントラクトアドレス (Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`) |
| `BASE_SEPOLIA_RPC_URL`  | Base Sepolia用のRPCエンドポイント                                                     |

### オプション

| 変数                        | デフォルト | 説明                                     |
| --------------------------- | ---------- | ---------------------------------------- |
| `PORT`                      | `3001`     | バックエンドサーバーポート               |
| `OPENAI_API_KEY`            | -          | 代替LLMプロバイダー                      |
| `DATABASE_URL`              | -          | データベース接続文字列                   |
| `POLICY_ORACLE_PRIVATE_KEY` | -          | オンチェーン決定送信用のキー             |
| `GUARD_CONTRACT_ADDRESS`    | -          | デプロイされたガードコントラクトアドレス |

---

## トラブルシューティング

### LLM分析がモックデータを返す

**原因**: `ANTHROPIC_API_KEY`が設定されていない
**解決策**: `.env`ファイルにキーを追加

### コントラクトデプロイが失敗する

**原因**: 残高不足または不正なRPC
**解決策**:

1. ターゲットネットワークでウォレット残高を確認
2. RPC URLが正しいことを確認
3. `PRIVATE_KEY`が適切にフォーマットされていることを確認（`0x`プレフィックスありまたはなし）

### フロントエンドのウォレット接続問題

**原因**: WalletConnectプロジェクトIDがない
**解決策**: `.env`に`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`を設定

### TypeScriptインポートエラー

**原因**: ESMインポートで`.js`拡張子がない
**解決策**: 相対インポートには常に`.js`拡張子を使用

```typescript
// 正しい
import { config } from "../config.js";

// 間違い
import { config } from "../config";
```

---

## 禁止事項

- `rm`コマンドは**絶対に**使用しない - より安全なファイル操作を使用
- シークレットや秘密鍵は**絶対に**コミットしない
- セキュリティ監査なしでメインネットに**絶対に**デプロイしない
- ポリシーオラクル認可チェックは**絶対に**バイパスしない
- LLM分析が失敗したときにトランザクションを**絶対に**承認しない

---

## リソース

- [Foundry Book](https://book.getfoundry.sh/)
- [Hono Documentation](https://hono.dev/)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh/)
- [Anthropic API Reference](https://docs.anthropic.com/)
- [Viem Documentation](https://viem.sh/)

---

_ZeroKey Treasury - 自律型金融のための実行ガバナンスレイヤー_
