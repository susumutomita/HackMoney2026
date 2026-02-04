# A2A Payment Router (Execution Firewall) — Spec (v0.1)

> **Goal:** define a minimal, reproducible flow where agents can negotiate freely, but **payments are enforced before money moves**.
>
> This is an _execution gateway_ between A2A negotiation and on-chain settlement.

## Why this exists

- **Internet era:** moved information online.
- **Agent era:** moves decisions and execution off humans.

So we need a policy layer that enforces constraints **before money moves**, with auditable proof.

## Core idea

**Agents propose → ZeroKey enforces → chain settles**

- If **APPROVED**: we settle on-chain (USDC) and produce proof via `txHash`.
- If **REJECTED**: we stop before payment and produce proof via an audit event: **“money never moved”**.

---

## Protocol flow (happy + blocked)

### 0) Discover

Agent discovers providers.

- UI: `/marketplace`
- API: `GET /api/a2a/discover?service=<string>`

### 1) Negotiate

Agent negotiates price/terms with a provider.

- UI: `/negotiate/:providerId`
- API: `POST /api/a2a/negotiate` then `POST /api/a2a/negotiate/:sessionId/offer`

### 2) Firewall check (execution gate)

Agent requests a **pre-payment** decision.

- API: `POST /api/firewall/check { sessionId }`
- Output: `{ decision: APPROVED|REJECTED, reason: string }`

If `REJECTED`:

- Persist audit: `GET /api/firewall/events` shows the newest event.

### 3) Payment request (x402-style)

If `APPROVED`, server issues payment instructions.

- API: `POST /api/pay/request`
- Output (HTTP 402): `{ payment: { recipient, token, amountUsdc, chainId, ... } }`

### 4) Settlement + proof

Payer wallet sends USDC, then submits proof.

- On-chain: USDC transfer on Base Sepolia
- API: `POST /api/pay/submit { txHash, expectedAmountUsdc, providerId, firewallDecision, firewallReason }`

Server verifies the on-chain receipt and returns:

- `payment.txHash` (proof)
- optional `result` (purchased output)

Audit evidence:

- Purchases: `GET /api/purchases` (txHash + firewall reason)

---

## Message format (recommended)

AI-to-AI works best as a **two-layer message**:

1. **Intent (natural language, 1–3 lines)**
2. **Action Contract (strict JSON)**

Example:

**Intent:**

> "Buy ImagePack for $0.03 USDC if recipient matches registry. Otherwise block and log proof."

**Action Contract (JSON):**

```json
{
  "type": "firewall.check",
  "idempotencyKey": "demo-2026-02-04-0001",
  "inputs": {
    "sessionId": "neg-...",
    "providerId": "image-pack-001"
  },
  "expected": {
    "decision": ["APPROVED", "REJECTED"],
    "proof": ["txHash", "money_never_moved"]
  }
}
```

---

## Proof requirements (non-mock)

A demo is considered valid when both are shown:

- **APPROVED proof:** `txHash` opens on BaseScan
- **REJECTED proof:** audit log shows “Money never moved”

Recommended proof tx (example):

- BaseScan: https://sepolia.basescan.org

## Non-goals (for this demo)

- Full agent wallet implementation (MPC/AA) — signer is swappable.
- Full ERC-8004 compliance — we only consume Identity Registry signals read-only.
