# Conversation Interface — E2E Scenarios (v0.1)

目的: **ユーザーの痛み (pain) を解決できているか**を、毎回同じ手順で検証できるようにする。

- 仕様: `docs/spec/CONVERSATION_SPEC.md`
- 自動テスト: `packages/backend/src/routes/chat.e2e.test.ts`

---

## 0. 前提

- Backend が起動できること
- DB はローカル SQLite（既定 `./data/zerokey.db`）

### ローカル起動

```bash
cd /home/exedev/HackMoney2026

# (初回 or 壊れたとき) devDependencies が必要
NODE_ENV=development pnpm install

# backend
pnpm --filter @zerokey/backend dev

# 別ターミナルで frontend
pnpm --filter @zerokey/frontend dev
```

---

## 1. 自動 E2E（CIと同じ）

会話インターフェースの要件を毎回チェックする。

```bash
cd /home/exedev/HackMoney2026
pnpm --filter @zerokey/backend test
```

このテストが担保すること（ユーザーの痛み）:

- **承認前に決済(pay)が進んでしまう事故を防ぐ**（fail-closed）
- **状態機械に沿わない操作を拒否する**
- **idempotencyKey により二重実行を防ぐ**

---

## 2. 手動 E2E（curl手順）

> 目的: 「どう動かせばいいのか分からない」を潰す。

### 2.1 セッションIDを決める

```bash
export SID="demo-$(date +%s)"
export TS=$(date +%s%3N)
```

### 2.2 discover → DISCOVERED

```bash
curl -s http://localhost:3001/api/chat \
  -H 'content-type: application/json' \
  -d '{
    "v": "0.1",
    "type": "discover",
    "sessionId": "'$SID'",
    "actor": {"kind": "client", "id": "manual"},
    "ts": '$TS',
    "payload": {"service": "translation", "chain": "base-sepolia"},
    "idempotencyKey": "idem-'$SID'-discover"
  }' | jq
```

期待値:

- `ok: true`
- `state: "DISCOVERED"`

### 2.3 pay.request を先に投げる（必ず拒否される）

```bash
curl -s http://localhost:3001/api/chat \
  -H 'content-type: application/json' \
  -d '{
    "v": "0.1",
    "type": "pay.request",
    "sessionId": "'$SID'",
    "actor": {"kind": "client", "id": "manual"},
    "ts": '$TS',
    "payload": {
      "serviceId": "svc-1",
      "amount": "0.03",
      "currency": "USDC",
      "chain": "base-sepolia",
      "recipient": "0x0000000000000000000000000000000000000000",
      "expiresAt": '$((TS+60000))'
    },
    "idempotencyKey": "idem-'$SID'-pay1"
  }' | jq
```

期待値:

- HTTP 409
- `error: "Invalid transition"`

### 2.4 negotiate.start → NEGOTIATING

```bash
curl -s http://localhost:3001/api/chat \
  -H 'content-type: application/json' \
  -d '{
    "v": "0.1",
    "type": "negotiate.start",
    "sessionId": "'$SID'",
    "actor": {"kind": "client", "id": "manual"},
    "ts": '$TS',
    "payload": {
      "providerId": "translate-ai-001",
      "service": "translation",
      "params": {"wordCount": 100},
      "pricing": {"currency": "USDC", "chain": "base-sepolia", "suggested": "0.03"}
    },
    "idempotencyKey": "idem-'$SID'-start"
  }' | jq
```

期待値:

- `state: "NEGOTIATING"`

### 2.5 negotiate.accept → AGREED

```bash
curl -s http://localhost:3001/api/chat \
  -H 'content-type: application/json' \
  -d '{
    "v": "0.1",
    "type": "negotiate.accept",
    "sessionId": "'$SID'",
    "actor": {"kind": "client", "id": "manual"},
    "ts": '$TS',
    "payload": {"acceptedAmount": "0.03", "currency": "USDC", "chain": "base-sepolia"},
    "idempotencyKey": "idem-'$SID'-accept"
  }' | jq
```

期待値:

- `state: "AGREED"`

### 2.6 firewall.check → FIREWALL_APPROVED

```bash
curl -s http://localhost:3001/api/chat \
  -H 'content-type: application/json' \
  -d '{
    "v": "0.1",
    "type": "firewall.check",
    "sessionId": "'$SID'",
    "actor": {"kind": "system", "id": "manual"},
    "ts": '$TS',
    "payload": {
      "provider": {"id": "translate-ai-001", "trustScore": 85},
      "intent": {"service": "translation", "purpose": "demo"},
      "payment": {"amount": "0.03", "currency": "USDC", "chain": "base-sepolia", "recipient": "vitalik.eth"},
      "policy": {"dailyBudget": "100", "maxSingleTx": "10", "allowedCategories": ["translation"], "requireApprovalAbove": "0"}
    },
    "idempotencyKey": "idem-'$SID'-fw"
  }' | jq
```

期待値:

- `state: "FIREWALL_APPROVED"`

### 2.7 pay.request → PAYMENT_REQUIRED

```bash
curl -s http://localhost:3001/api/chat \
  -H 'content-type: application/json' \
  -d '{
    "v": "0.1",
    "type": "pay.request",
    "sessionId": "'$SID'",
    "actor": {"kind": "client", "id": "manual"},
    "ts": '$TS',
    "payload": {
      "serviceId": "svc-1",
      "amount": "0.03",
      "currency": "USDC",
      "chain": "base-sepolia",
      "recipient": "0x0000000000000000000000000000000000000000",
      "expiresAt": '$((TS+60000))'
    },
    "idempotencyKey": "idem-'$SID'-pay3"
  }' | jq
```

期待値:

- `state: "PAYMENT_REQUIRED"`

---

## 3. 追加で確認したいユーザーペイン（次のシナリオ候補）

- **怪しいプロバイダを選ぶとブロックされる**（trustScoreや価格異常）
- **ENS入力が解決されて表示・ログに残る**（0xが読めない問題の解決）
