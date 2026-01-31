# ZeroKey Treasury — Conversation Interface Spec (v0.1)

> Goal: **A single, strict, auditable interface** for all agent-to-agent (A2A) and UI→backend interactions.
>
> Design principle: **Fail-closed**. If the message is malformed, out-of-order, or violates policy/state, the system must reject it.

---

## 0. Definitions

- **Client Agent**: the agent/user requesting a service (buyer).
- **Provider Agent**: the agent offering a paid API/service (seller).
- **Gateway**: ZeroKey backend component that routes messages and manages sessions.
- **Firewall**: semantic/policy approval engine.
- **Session**: a negotiation/execution unit identified by `sessionId`.

---

## 1. Single Entry Point

All inbound interactions MUST go through one of these (choose one at implementation time):

- `POST /api/chat` (recommended name)
- `POST /api/a2a/message`

**No other route is allowed to trigger payments or change session state directly.**

### 1.1 Content-Type

- `Content-Type: application/json`

### 1.2 Strict JSON requirement

- Free-form text is not accepted.
- If the sender is an LLM/agent, it must produce valid JSON only.

---

## 2. Message Envelope (required)

Every message must conform to this envelope.

```json
{
  "v": "0.1",
  "type": "discover" | "negotiate.start" | "negotiate.offer" | "negotiate.accept" | "negotiate.reject" | "firewall.check" | "pay.request" | "pay.proof" | "session.get" | "session.cancel",
  "sessionId": "uuid-or-random-string",
  "actor": {
    "kind": "client" | "provider" | "system",
    "id": "string"
  },
  "ts": 0,
  "payload": {},
  "idempotencyKey": "string"
}
```

### 2.1 Field rules

- `v`: required, must be exactly `"0.1"`.
- `type`: required.
- `sessionId`: required for all types except `discover` (optional in `discover`).
- `actor.kind`: required.
- `actor.id`: required.
- `ts`: required (unix ms).
- `payload`: required (object, can be empty depending on type).
- `idempotencyKey`: required for any state-changing type.

---

## 3. State Machine (must enforce)

Sessions MUST follow this state machine. Any message that tries to skip steps must be rejected.

### 3.1 States

- `NEW`
- `DISCOVERED`
- `NEGOTIATING`
- `AGREED`
- `FIREWALL_APPROVED`
- `FIREWALL_REJECTED`
- `PAYMENT_REQUIRED`
- `PAID`
- `DONE`
- `CANCELLED`

### 3.2 Allowed transitions (core)

- `NEW` → `DISCOVERED` (after successful `discover` or provider selected)
- `DISCOVERED` → `NEGOTIATING` (`negotiate.start`)
- `NEGOTIATING` → `AGREED` (`negotiate.accept`)
- `NEGOTIATING` → `CANCELLED` (`negotiate.reject` / `session.cancel`)
- `AGREED` → `FIREWALL_APPROVED` (`firewall.check` approved)
- `AGREED` → `FIREWALL_REJECTED` (`firewall.check` rejected)
- `FIREWALL_APPROVED` → `PAYMENT_REQUIRED` (`pay.request` creates x402 challenge)
- `PAYMENT_REQUIRED` → `PAID` (`pay.proof` verified)
- `PAID` → `DONE` (service delivered and recorded)

### 3.3 Hard rule: pay is impossible without approval

- If state is not `FIREWALL_APPROVED` or `PAYMENT_REQUIRED`, any `pay.*` message MUST be rejected.

---

## 4. Payload schemas (minimal v0.1)

### 4.1 discover

```json
{
  "service": "string",
  "maxPrice": "string?",
  "chain": "base-sepolia" | "base" | "ethereum",
  "requirements": {
    "ensPreferred": true
  }
}
```

### 4.2 negotiate.start

```json
{
  "providerId": "string",
  "service": "string",
  "params": {},
  "pricing": {
    "currency": "USDC",
    "chain": "base-sepolia",
    "suggested": "string"
  }
}
```

### 4.3 negotiate.offer

```json
{
  "offer": {
    "amount": "string",
    "currency": "USDC",
    "chain": "base-sepolia"
  },
  "note": "string?"
}
```

### 4.4 negotiate.accept / negotiate.reject

```json
{
  "acceptedAmount": "string",
  "currency": "USDC",
  "chain": "base-sepolia",
  "reason": "string?"
}
```

### 4.5 firewall.check

```json
{
  "provider": {
    "id": "string",
    "trustScore": 0
  },
  "intent": {
    "service": "string",
    "purpose": "string"
  },
  "payment": {
    "amount": "string",
    "currency": "USDC",
    "chain": "base-sepolia",
    "recipient": "0x... or ens"
  },
  "policy": {
    "dailyBudget": "string",
    "maxSingleTx": "string",
    "allowedCategories": ["string"],
    "requireApprovalAbove": "string"
  }
}
```

### 4.6 pay.request (x402 challenge)

```json
{
  "serviceId": "string",
  "amount": "string",
  "currency": "USDC",
  "chain": "base-sepolia",
  "recipient": "0x...",
  "expiresAt": 0
}
```

### 4.7 pay.proof

```json
{
  "txHash": "0x...",
  "chainId": 0,
  "payer": "0x...",
  "amount": "string",
  "recipient": "0x...",
  "serviceId": "string"
}
```

---

## 5. Validation + Enforcement Requirements

Implementation MUST include:

1. **Zod validation** for the envelope + each payload by `type`.
2. **Idempotency** keyed by `(sessionId, idempotencyKey)` for state-changing messages.
3. **State machine checks** before any mutation.
4. **Fail-closed** defaults.

---

## 6. Audit Logging (mandatory)

Every inbound message MUST be recorded:

- raw request (redacting secrets)
- parsed envelope
- validation result
- previous state → new state (or rejection)
- rejection reason (if any)
- timestamps

---

## 7. Notes for ENS integration (for pool prize)

- ENS resolution is **read-only** and should use **Ethereum mainnet** RPC.
- Payments can remain on **Base Sepolia**; ENS is used for _recipient resolution_ and _display names_.

---

## 8. Future extensions (not in v0.1)

- Signed messages between agents
- Provider attestation / reputation proofs
- Rate limiting fields in envelope
- Multi-chain payment routing (LI.FI)
