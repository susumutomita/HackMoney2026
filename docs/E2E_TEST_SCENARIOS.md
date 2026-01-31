# E2Eテストシナリオ

ZeroKey Treasuryのエンドツーエンドテストシナリオ。

---

## シナリオ1: 正常なサービス購入フロー

**ユースケース**: 企業AI秘書が信頼できるプロバイダから翻訳サービスを購入

### ステップ1: プロバイダ検索

**目的**: 翻訳サービスを提供するプロバイダを見つける

**リクエスト**:

```bash
curl -s "http://localhost:3001/api/a2a/discover?service=translation"
```

**期待するレスポンス**:

```json
{
  "success": true,
  "results": [
    {
      "id": "translate-ai-001",
      "name": "TranslateAI Pro",
      "services": ["translation", "localization"],
      "price": "0.03",
      "unit": "1000 tokens",
      "trustScore": 85,
      "totalTransactions": 1250
    }
  ],
  "count": 2
}
```

**検証ポイント**:

- [ ] `success` が `true`
- [ ] `results` に1件以上のプロバイダ
- [ ] TranslateAI Pro (trustScore >= 70) が含まれる

---

### ステップ2: 交渉セッション開始

**目的**: 選んだプロバイダと交渉を開始

**リクエスト**:

```bash
curl -s -X POST "http://localhost:3001/api/a2a/negotiate" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "0x1234567890abcdef1234567890abcdef12345678",
    "providerId": "translate-ai-001",
    "service": "translation",
    "initialOffer": "0.025"
  }'
```

**期待するレスポンス**:

```json
{
  "success": true,
  "session": {
    "id": "neg-1234567890-abc123",
    "provider": "TranslateAI Pro",
    "service": "translation",
    "initialOffer": "0.025",
    "providerPrice": "0.03",
    "expiresAt": "2026-01-31T10:30:00.000Z"
  }
}
```

**検証ポイント**:

- [ ] `success` が `true`
- [ ] `session.id` が存在
- [ ] `session.providerPrice` が "0.03"

---

### ステップ3: 価格交渉（オファー送信）

**目的**: 価格を交渉して合意に達する

**リクエスト**:

```bash
# SESSION_IDはステップ2のレスポンスから取得
curl -s -X POST "http://localhost:3001/api/a2a/negotiate/${SESSION_ID}/offer" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "0.028",
    "type": "offer"
  }'
```

**期待するレスポンス**:

```json
{
  "success": true,
  "status": "negotiating",
  "response": {
    "type": "accept",
    "message": "Provider accepts 0.028 USDC"
  }
}
```

**検証ポイント**:

- [ ] `success` が `true`
- [ ] `response.type` が "accept" または "counter"
- [ ] 90%以上のオファーは accept される

---

### ステップ4: Firewallチェック

**目的**: 合意した取引がFirewallを通過するか確認

**リクエスト**:

```bash
curl -s -X POST "http://localhost:3001/api/firewall/check" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "${SESSION_ID}"
  }'
```

**期待するレスポンス**:

```json
{
  "success": true,
  "firewall": {
    "decision": "APPROVED",
    "riskLevel": 1,
    "reason": "Trusted provider with good history",
    "warnings": []
  }
}
```

**検証ポイント**:

- [ ] `success` が `true`
- [ ] `firewall.decision` が "APPROVED"
- [ ] `firewall.riskLevel` が 1 または 2
- [ ] `firewall.warnings` が空または軽微

---

### ステップ5: 決済（x402）

**目的**: USDCで決済してサービスを利用

**リクエスト (402レスポンス確認)**:

```bash
curl -s -X POST "http://localhost:3001/api/provider/translate" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "hello",
    "targetLanguage": "ja"
  }'
```

**期待するレスポンス (402)**:

```json
{
  "error": "Payment Required",
  "code": 402,
  "payment": {
    "amount": "30000",
    "recipient": "0x...",
    "token": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "chainId": 84532
  }
}
```

**リクエスト (決済後)**:

```bash
curl -s -X POST "http://localhost:3001/api/provider/translate" \
  -H "Content-Type: application/json" \
  -H "X-Payment: 0xabc123...:84532:30000:0x1234..." \
  -d '{
    "text": "hello",
    "targetLanguage": "ja"
  }'
```

**期待するレスポンス (200)**:

```json
{
  "success": true,
  "service": "translation",
  "result": {
    "originalText": "hello",
    "translatedText": "こんにちは",
    "targetLanguage": "ja"
  },
  "payment": {
    "txHash": "0xabc123...",
    "amount": "0.03 USDC",
    "status": "verified"
  }
}
```

**検証ポイント**:

- [ ] 決済なし → 402ステータス
- [ ] 決済あり → 200ステータス
- [ ] 翻訳結果が返ってくる

---

## シナリオ2: 低信頼プロバイダのブロック

**ユースケース**: Firewallが怪しいプロバイダをブロック

### ステップ1: 低信頼プロバイダを検索

```bash
curl -s "http://localhost:3001/api/a2a/discover?service=translation"
```

**検証**: CheapTranslate (trustScore: 15) が含まれる

---

### ステップ2: 低信頼プロバイダと交渉開始

```bash
curl -s -X POST "http://localhost:3001/api/a2a/negotiate" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "0x1234567890abcdef1234567890abcdef12345678",
    "providerId": "sketchy-service-001",
    "service": "translation",
    "initialOffer": "0.005"
  }'
```

---

### ステップ3: Firewallチェック（警告/拒否）

```bash
curl -s -X POST "http://localhost:3001/api/firewall/check" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "${SESSION_ID}"
  }'
```

**期待するレスポンス**:

```json
{
  "success": true,
  "firewall": {
    "decision": "WARNING",
    "riskLevel": 3,
    "reason": "Low trust provider - proceed with caution",
    "warnings": [
      "Provider trust score is very low (15/100)",
      "Price significantly below market average"
    ]
  }
}
```

**検証ポイント**:

- [ ] `firewall.decision` が "WARNING" または "REJECTED"
- [ ] `firewall.riskLevel` が 3 (HIGH)
- [ ] `firewall.warnings` に警告メッセージ

---

## シナリオ3: APIヘルスチェック

### ヘルスエンドポイント

```bash
curl -s "http://localhost:3001/health"
```

**期待するレスポンス**:

```json
{
  "status": "healthy",
  "timestamp": "2026-01-31T09:00:00.000Z",
  "version": "0.1.0"
}
```

---

## 手動テスト実行手順

```bash
# 1. バックエンド起動
cd /home/exedev/HackMoney2026/packages/backend
pnpm dev &
sleep 5

# 2. ヘルスチェック
curl -s http://localhost:3001/health | jq .

# 3. プロバイダ検索
curl -s "http://localhost:3001/api/a2a/discover?service=translation" | jq .

# 4. 交渉開始
SESSION=$(curl -s -X POST "http://localhost:3001/api/a2a/negotiate" \
  -H "Content-Type: application/json" \
  -d '{"clientId": "0x123", "providerId": "translate-ai-001", "service": "translation", "initialOffer": "0.028"}' | jq -r '.session.id')
echo "Session ID: $SESSION"

# 5. オファー送信
curl -s -X POST "http://localhost:3001/api/a2a/negotiate/${SESSION}/offer" \
  -H "Content-Type: application/json" \
  -d '{"amount": "0.028", "type": "accept"}' | jq .

# 6. Firewallチェック
curl -s -X POST "http://localhost:3001/api/firewall/check" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"${SESSION}\"}" | jq .

# 7. 402テスト
curl -s -X POST "http://localhost:3001/api/provider/translate" \
  -H "Content-Type: application/json" \
  -d '{"text": "hello", "targetLanguage": "ja"}' | jq .

# 8. 価格一覧
curl -s "http://localhost:3001/api/provider/prices" | jq .
```

---

## APIエンドポイント一覧

| Method | Endpoint                        | 説明             | 認証 |
| ------ | ------------------------------- | ---------------- | ---- |
| GET    | `/health`                       | ヘルスチェック   | なし |
| GET    | `/api/a2a/discover?service=xxx` | プロバイダ検索   | なし |
| GET    | `/api/a2a/provider/:id`         | プロバイダ詳細   | なし |
| POST   | `/api/a2a/negotiate`            | 交渉開始         | なし |
| POST   | `/api/a2a/negotiate/:id/offer`  | オファー送信     | なし |
| GET    | `/api/a2a/negotiate/:id`        | セッション状態   | なし |
| POST   | `/api/firewall/check`           | Firewallチェック | なし |
| GET    | `/api/firewall/status/:txHash`  | ステータス取得   | なし |
| GET    | `/api/provider/prices`          | 価格一覧         | なし |
| POST   | `/api/provider/translate`       | 翻訳サービス     | x402 |
| POST   | `/api/provider/summarize`       | 要約サービス     | x402 |

---

## 次のステップ

1. [ ] Swagger/OpenAPI定義追加
2. [ ] 自動化テストスクリプト作成
3. [ ] CIで毎回E2Eテスト実行
