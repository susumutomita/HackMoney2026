# 自律開発プロトコル

このドキュメントはAIエージェントが24時間自律的に開発を進めるためのプロトコル。

---

## 🎯 ミッション

ZeroKey Treasuryを**完全に動作するデモ**まで実装する。

ゴール: ハッカソン審査員が以下のデモを見て「すごい」と言う

```
1. AIエージェントが翻訳サービスを検索
2. 複数プロバイダと価格交渉
3. Firewallがリスク分析・承認/拒否
4. x402でUSDC決済
5. オンチェーンに記録
```

---

## 📝 タスクリスト

### Phase 3: Firewall強化 (優先度: HIGH)

- [ ] **3.1** `services/firewall.ts` 作成
  - ポリシーチェックロジック
  - 予算チェック
  - レート制限
  - プロバイダ信頼度チェック

- [ ] **3.2** `analyzer.ts` プロンプト改善
  - プロバイダ情報をプロンプトに含める
  - 予算コンテキストを含める
  - より賢いリスク判定

- [ ] **3.3** `routes/firewall.ts` API作成
  - `POST /api/firewall/check` - Firewallチェック
  - `GET /api/firewall/status/:txHash` - ステータス取得

- [ ] **3.4** テスト
  - 正常ケース: 信頼できるプロバイダ → APPROVED
  - 異常ケース: CheapTranslate → WARNING/REJECTED

### Phase 4: x402 Payment (優先度: HIGH)

- [ ] **4.1** `middleware/x402.ts` 作成
  - 402 Payment Requiredレスポンス
  - Payment Proof検証

- [ ] **4.2** `services/payment.ts` 作成
  - USDC決済ロジック
  - トランザクション検証

- [ ] **4.3** `routes/provider.ts` 作成
  - モックプロバイダエンドポイント
  - x402ミドルウェア適用
  - 実際のサービス実行（モック）

- [ ] **4.4** オンチェーン統合
  - `ZeroKeyGuard.submitDecision()` 呼び出し
  - Base Sepoliaテストネット

### Phase 5: Frontend UI (優先度: MEDIUM)

- [ ] **5.1** マーケットプレイスページ
  - `app/marketplace/page.tsx`
  - プロバイダ一覧カード
  - 検索・フィルター

- [ ] **5.2** 交渉画面
  - `app/negotiate/[sessionId]/page.tsx`
  - チャット風UI
  - オファー送信

- [ ] **5.3** Firewallステータス表示
  - リスクレベル表示
  - 警告表示
  - 承認/拒否ステータス

- [ ] **5.4** 決済フロー
  - ウォレット接続
  - USDC決済ボタン
  - トランザクション確認

- [ ] **5.5** ダッシュボード
  - 取引履歴
  - 予算状況
  - ポリシー設定

### Phase 6: 統合 & デモ (優先度: HIGH)

- [ ] **6.1** E2Eフロー実装
  - 検索 → 交渉 → Firewall → 決済 → 実行
  - 全フローが動くことを確認

- [ ] **6.2** デモシナリオ
  - 正常ケース: TranslateAIで翻訳 → 成功
  - 警告ケース: CheapTranslate → Firewall警告
  - ブロックケース: 予算超過 → 拒否

- [ ] **6.3** README更新
  - デモ手順
  - スクリーンショット
  - アーキテクチャ図

---

## 🔄 自律開発ルール

### 1. タスク選択

- 上のリストから未完了タスクを選ぶ
- 優先度HIGHから順に
- 依存関係を考慮（Firewall → x402 → Frontend）

### 2. 実装サイクル

```
1. タスク選択
2. コード実装
3. ビルド確認 (pnpm build)
4. テスト (curlでAPI確認)
5. コミット
6. PROGRESS.md更新
7. 次のタスクへ
```

### 3. コミットルール

- 小さく頻繁にコミット
- フォーマット: `feat/fix/docs: 簡潔な説明`
- 動作する状態を維持

### 4. PRルール

- PhaseごとにPR作成
- squash mergeを使用
- マージ後はmainをpull

### 5. エラー時

- ビルドエラー: 修正して再ビルド
- テスト失敗: デバッグして修正
- 詰まったら: 簡略化してまず動かす

### 6. ドキュメント更新

- タスク完了時: PROGRESS.mdに追記
- 設計変更時: AGENTS.md更新
- API追加時: CLAUDE.md更新

---

## ⚠️ 絶対ルール

1. **Anthropic APIを使わない** - Claude CLIのみ
2. **動くものを作る** - 完璧より動作
3. **コミットを忘れない** - 作業が失われる
4. **PROGRESS.mdを更新** - 他エージェントのため

---

## 🚀 開始コマンド

```bash
cd /home/exedev/HackMoney2026
git pull origin main
pnpm install
cd packages/backend && pnpm dev &
# タスクリストから次のタスクを選んで実装開始
```

---

## 📊 進捗チェックポイント

| チェックポイント | 確認方法                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Backend起動      | `curl http://localhost:3001/health`                                                                    |
| A2A API          | `curl http://localhost:3001/api/a2a/discover?service=translation`                                      |
| Firewall API     | `curl -X POST http://localhost:3001/api/firewall/check -H 'Content-Type: application/json' -d '{...}'` |
| Frontend         | `http://localhost:3000`                                                                                |
| E2E              | 全フロー手動テスト                                                                                     |
