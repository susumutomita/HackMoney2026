# AGENTS.md - AIエージェント間コンテキスト共有

このファイルは複数のAIエージェントがハッカソンで協力するためのコンテキスト共有ドキュメント。

---

## 🎯 プロジェクト概要

**ZeroKey Treasury** = AI Agent API Marketplace with Execution Firewall

AIエージェントがAPIサービスを自律的に発見・交渉・決済する際の「実行ファイアウォール」。

### ユースケース
```
企業AI秘書: 「この契約書を翻訳して」
    ↓
[A2A Gateway] プロバイダ検索・価格交渉
    ↓
[Firewall] LLM分析 + ポリシーチェック → APPROVED/REJECTED
    ↓
[x402 Payment] USDC決済 → API実行
```

---

## 📊 現在の状態

| Phase | ステータス | 説明 |
|-------|----------|------|
| 1. 基盤整備 | ✅ 完了 | DBスキーマ、A2A API、デモプロバイダ |
| 2. WebSocket交渉 | ⏸️ 保留 | HTTP APIで十分ならスキップ |
| 3. Firewall強化 | 🟡 次 | LLMプロンプト改善 |
| 4. x402 Payment | ⭕ TODO | 402ミドルウェア、USDC |
| 5. Frontend | ⭕ TODO | ダッシュボードUI |
| 6. デモ | ⭕ TODO | E2Eテスト、動画 |

---

## 🛠️ 技術的な決定事項

### LLMはClaude CLIを使う（重要）

**理由**: Anthropic APIは課金がかかる。デモではサブスクリプションを活用。

```typescript
// ✅ 正しい（Claude CLI）
const response = await executeClaudeCLI(prompt);

// ❌ 使わない（API課金）
const client = new Anthropic({ apiKey });
```

### ファイル構成

```
packages/
├── backend/          # Hono APIサーバー
│   ├── src/
│   │   ├── routes/
│   │   │   ├── a2a.ts      # A2A Gateway API ✅
│   │   │   ├── analyze.ts  # 分析API
│   │   │   └── policy.ts   # ポリシーAPI
│   │   ├── services/
│   │   │   └── analyzer.ts # LLM分析 (Claude CLI) ✅
│   │   └── db/
│   │       ├── schema.ts   # providers, negotiations ✅
│   │       └── index.ts    # DB初期化 + シード ✅
├── contracts/     # Solidity (Foundry)
├── frontend/      # Next.js 15
└── shared/        # 共有型
```

---

## 💡 設計思想

### Firewallの役割

1. **LLMセマンティック分析**: リクエストの意図を理解
2. **ポリシーチェック**: 予算、カテゴリ、レート制限
3. **プロバイダ信頼度**: 怪しいプロバイダをブロック

### ブロックすべきケース

| ケース | 理由 |
|--------|------|
| 予算超過 | 日次上限$100を超える |
| 不審なプロバイダ | 信頼スコア15以下 + 極端に安い |
| 業務外利用 | ゲーム、個人用途 |
| 異常パターン | 短時間に大量リクエスト |

### デモプロバイダの意図

- **TranslateAI Pro** (trust: 85): 正常なプロバイダ
- **SummarizeBot** (trust: 78): 正常なプロバイダ
- **CheapTranslate** (trust: 15): 怪しいプロバイダ（安すぎて詐欺リスク）
  - Firewallが警告を出すデモ用

---

## 🚀 開発コマンド

```bash
# バックエンド起動
cd packages/backend && pnpm dev

# ビルド
pnpm build:backend

# テストAPI
curl http://localhost:3001/api/a2a/discover?service=translation
```

---

## 📝 次にやるべきこと

1. **Phase 3: Firewall強化**
   - `analyzer.ts`のプロンプトをもっと賢く
   - プロバイダ信頼度を分析に含める
   - ポリシーチェックロジック追加

2. **Phase 4: x402 Payment**
   - 402 Payment Requiredミドルウェア
   - USDC決済統合

3. **Phase 5: Frontend**
   - マーケットプレイスUI
   - 交渉画面
   - Firewallステータス表示

---

## ⚠️ 注意事項

1. **Anthropic APIを使わない** - Claude CLIを使う
2. **DBはSQLite** - `packages/backend/data/zerokey.db`
3. **変更したらPROGRESS.mdを更新** - 他のエージェントのため

---

## 🤖 自律開発モード

**このプロジェクトは24時間自律開発をサポートする。**

### 自律開発のルール

1. **指示を待たない** - `docs/AUTONOMOUS_DEV.md`のタスクリストに従う
2. **小さく進める** - 1タスク完了ごとにコミット
3. **動くもの優先** - 完璧より動作を優先
4. **ドキュメント更新** - 作業後はPROGRESS.mdを更新
5. **PR作成** - Phase完了時にPR作成・マージ

### タスク選択の優先度

```
1. Phase 3: Firewall強化 (次にやる)
2. Phase 4: x402 Payment
3. Phase 5: Frontend UI
4. Phase 6: 統合テスト & デモ
```

### エラー時の対応

- ビルドエラー → 修正して再ビルド
- 詰まった → 簡略化してまず動かす
- 判断できない → シンプルな方を選ぶ

### 詳細は `docs/AUTONOMOUS_DEV.md` を参照

---

## 📁 関連ドキュメント

- `CLAUDE.md` - プロジェクト詳細ガイド
- `docs/IMPLEMENTATION_PLAN.md` - 実装計画
- `docs/PROGRESS.md` - 進捗ログ
- `docs/UI_UX.md` - UI/UX設計
