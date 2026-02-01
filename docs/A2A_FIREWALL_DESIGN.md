# A2A / Firewall Design (How it works)

This doc explains the design in plain terms: what is on-chain vs off-chain, what we sign, and why.

## TL;DR

- **Solidity / EVM cannot call HTTP**. So the A2A/Firewall HTTP auth is an **off-chain** concern.
- **On-chain** code (Guard/Policy contracts) should only enforce on-chain invariants and execution permissions.
- **Off-chain** services (backend, agents, clients) do:
  - negotiation
  - firewall checks (deterministic rules + AI analysis)
  - payment flows
  - calling the backend using **signed HTTP requests** (this repo uses Ed25519 HTTP signatures)

---

## 1. Components & Responsibilities

### 1.1 Off-chain (Node/TS)

**Backend API (packages/backend)**

- Exposes endpoints like:
  - `POST /api/a2a/negotiate`
  - `POST /api/firewall/check` (critical)
  - `POST /api/chat`
- Verifies signed requests for critical operations using middleware:
  - `packages/backend/src/middleware/a2aAuth.ts`

**Clients / Agents**

- UI (Next.js frontend)
- Agent-to-agent callers
- CLI scripts

They call the backend over HTTPS.

### 1.2 On-chain (Solidity)

**Guard / Policy contracts**

- Enforce execution constraints at the blockchain layer.
- The chain can validate:
  - signer of a transaction (EOA / smart account)
  - token transfer limits
  - allow/deny lists
  - policy rules

But the chain cannot:

- call arbitrary HTTP endpoints
- run heavy AI analysis

So on-chain rules are the final safety net; off-chain systems provide additional checks and UX.

---

## 2. Why we do NOT implement the HTTP signing on-chain

Even with Account Abstraction (EIP-4337), you still need off-chain services:

- Bundlers / paymasters are off-chain.
- External risk evaluation (Firewall) is off-chain.
- EVM does not have a standard cheap Ed25519 verify primitive.

Therefore:

- HTTP request signing is implemented off-chain (Node/TS).
- On-chain uses its own signature scheme (EOA/secp256k1 or account validation).

---

## 3. A2A/Firewall HTTP Auth model (off-chain)

### 3.1 When does auth apply?

We first protect the most critical endpoint:

- `POST /api/firewall/check`

This is the gateway right before payment/execution. In practice it's the equivalent of “`POST /v1/transfers`” type of critical action.

### 3.2 What is signed?

See `docs/a2a-firewall.md` for the normative spec.

High level:

- `X-Client-Id`: stable identity for authz/audit/rate limit
- `kid` (`Signature.keyId`): selects the Ed25519 public key
- `X-Timestamp` + `X-Nonce`: replay protection
- `Content-Digest`: binds body bytes to the signature
- `Signature`: verifies integrity of method/path/headers

### 3.3 Authorization

- Allowlist rules are explicit:
  - `clientId × METHOD × PATH`

---

## 4. Suggested end-to-end flow

1. Client negotiates with provider (A2A)
2. Client asks backend to run firewall check:
   - `POST /api/firewall/check` (signed)
3. Backend produces a decision (APPROVE/WARN/REJECT)
4. If approved, execution/payment proceeds (on-chain + payment rails)

---

## 5. Optional: where AA fits later

If we adopt Account Abstraction later:

- On-chain validation uses the smart account’s validation logic.
- Off-chain firewall remains, but could be integrated into:
  - a bundler policy
  - a paymaster policy
  - or a backend-run “approval proof”

We can incrementally migrate without changing the HTTP auth spec.
