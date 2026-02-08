# Sponsor Tech Map (Where We Use Partner Technologies)

This document lists **exact code locations (file + line ranges)** for sponsor / partner technologies.

> Tip: Use this to quickly answer “where is X used?” during submission or judging.

---

## USDC / Base Sepolia (real on-chain settlement)

### Payment flow (HTTP 402 → USDC transfer → receipt verification)

- **Backend 402 payment instructions + txHash verification**
  - `packages/backend/src/routes/pay.ts` (request + submit + purchase log)
    - USDC token address + 402 payload: **lines 22–67**
    - submit validation + txHash verification: **lines 69–113**
    - persist purchase proof (txHash): **lines 115–138**

- **Receipt verification (on-chain, Base Sepolia)**
  - `packages/backend/src/services/payment.ts`
    - createPublicClient(Base Sepolia) + receipt fetch: **lines 35–55**
    - decode Transfer log + verify recipient/amount: **lines 57–86**
    - record verified txHash + timestamp: **lines 87–106**

### Frontend: triggers payment + submits txHash

- `packages/frontend/src/app/negotiate/[providerId]/page.tsx`
  - pay request + wallet transfer + submit txHash: **lines 588–689**

---

## ENS (Ethereum Name Service) — identity + discovery UX

### Backend: ENS resolution (server-side)

- `packages/backend/src/services/ens.ts`
  - mainnet client + resolve ENS name → address: **lines 1–28**

- `packages/backend/src/routes/analyze.ts`
  - accepts destination as 0x or ENS and resolves server-side: (see file around ENS logic)

### Frontend: ENS profile + text records

- `packages/frontend/src/lib/ens.ts`
  - ENS name detection + forward/reverse resolution: **lines 33–63**
  - ENS avatar/text record helpers: **lines 66–90**
  - Full ENS profile including custom AI agent records (ai.api.endpoint, ai.services, ai.trustscore): **lines 92–149**

- `packages/frontend/src/components/EnsProfile.tsx`
  - UI card that displays ENS profile + custom records

---

## ERC-8004 (Trustless Agents) — on-chain identity signals (read-only)

> We do **not** claim full ERC-8004 compliance in this project.
> We integrate the ERC-8004 **Identity Registry as a read-only trust signal source**.

- `packages/frontend/src/components/Erc8004IdentityCard.tsx`
  - Reads Identity Registry on Base Sepolia:
    - registry: `0x4102F9b209796b53a18B063A438D05C7C9Af31A2`
    - chainId: `84532`
  - Displays: registered?, tokenId, (name/endpoint/active)

- `packages/frontend/src/app/negotiate/[providerId]/page.tsx`
  - Renders the ERC-8004 Identity viewer in the demo side-rail

---

## Circle Gateway / Arc Network — crosschain USDC via Arc Liquidity Hub

### Track 1: Chain Abstracted USDC Apps Using Arc as Liquidity Hub ($5,000)

- `packages/backend/src/services/gateway.ts`
  - Arc domain constants and GATEWAY_DOMAINS: **lines 37–56**
  - `transferViaGateway()` — determines Arc hub routing, calls Gateway API: **lines 261–330**
  - `getGatewayBalances()` — unified USDC balance across all Gateway domains: **lines 159–195**
  - `depositToGateway()` — approve + deposit USDC to Gateway Wallet: **lines 201–255**

- `packages/backend/src/services/circleGateway.ts`
  - Circle CCTP client with Arc chain support: **lines 30–37**
  - `createGatewayTransfer()` — creates transfer with Arc routing metadata: **lines 184–230**
  - `getGatewayTransfer()` — status polling: **lines 235–239**

- `packages/backend/src/routes/gateway.ts`
  - `POST /transfer` — firewall-gated crosschain transfer: **lines 99–153**
  - `GET /status` — Circle configuration status: **lines 54–61**
  - `GET /transfer/:id` — transfer status check: **lines 159–166**

- `packages/frontend/src/components/CrosschainPanel.tsx`
  - "Single Transfer" tab with source/destination chain selection: **lines 1–200**
  - Arc routing path visualization: **lines 250–300**

- `packages/shared/src/constants.ts`
  - `GATEWAY_CONFIG` — wallet/minter contracts, domain definitions: **lines 66–80**
  - `ARC_CONFIG` — Arc chain IDs, USDC address, gateway domain ID: **lines 86–100**
  - Arc Network chain configs (411, 412): **lines 43–59**

### Track 2: Global Payouts and Treasury Systems with USDC on Arc ($2,500)

- `packages/backend/src/services/gateway.ts`
  - `executeMultiPayout()` — batch payouts across chains via Arc hub: **lines 338–367**

- `packages/backend/src/routes/gateway.ts`
  - `POST /payout` — multi-recipient payout (1–16 recipients), firewall-gated: **lines 168–224**
  - `POST /balances` — check unified USDC balances: **lines 67–80**

- `packages/frontend/src/components/CrosschainPanel.tsx`
  - "Multi-Payout" tab with recipient builder (add/remove): **lines 300–450**

- `packages/backend/src/services/payment.ts`
  - USDC receipt verification on Base Sepolia for audit trail

### Track 3: Agentic Commerce powered by RWA on Arc ($2,500)

- `packages/backend/src/routes/gateway.ts`
  - `POST /agent-commerce` — agent-driven commerce with firewall check + Arc routing: **lines 226–293**

- `packages/backend/src/services/analyzer.ts`
  - Claude API integration for transaction classification: **lines 30–120**
  - Risk level determination and semantic analysis

- `packages/backend/src/services/firewall.ts`
  - `checkFirewall()` — policy evaluation engine: **lines 50–180**
  - Recipient invariant checking, spend limits, anomaly detection

- `packages/backend/src/services/trustScore.ts`
  - Trust scoring with on-chain signals (ENS, wallet age, contract verification)

- `packages/backend/src/routes/a2a.ts`
  - Agent-to-Agent discovery and WebSocket negotiation

---

## Safe Guard — multisig transaction protection

- `packages/contracts/src/SafeZeroKeyGuard.sol`
  - Implements Safe Guard interface (`checkTransaction`, `checkAfterExecution`)
  - Per-Safe policy registration: `registerSafe()` with max amounts, daily limits
  - Pre-approval mechanism: `approveTransaction()`, `rejectTransaction()`, `markPendingHumanApproval()`

- `packages/contracts/src/ZeroKeyGuard.sol`
  - Execution governance layer for on-chain decision storage
  - `submitDecision()` — oracle submits approve/reject with risk level

- `packages/backend/src/services/safeGuardOracle.ts`
  - Oracle service monitoring pending Safe transactions
  - Evaluates against policies, computes transaction hashes
  - Submits decisions to guard contract on-chain

- `packages/backend/src/routes/guard.ts`
  - `POST /register` — register Safe with ZeroKey protection
  - `GET /status/:safeAddress` — check guard status
  - `POST /pre-approve` — evaluate and submit decision

- `packages/backend/src/routes/safe-policy.ts`
  - Safe policy CRUD operations

- `packages/frontend/src/components/SafeGuardStatus.tsx`
  - Displays Safe protection status, active policies

- `packages/frontend/src/app/setup/page.tsx`
  - Safe registration and guard setup wizard UI

---

## Notes

- This project uses **real on-chain settlement on Base Sepolia** (not a mock): we verify tx receipts and persist txHash in logs.
- Our "firewall decision" and "money never moved" events are designed to be **auditable** and easy for judges to understand.
- Circle Gateway integration uses Arc (domain 26) as the central liquidity hub — all crosschain USDC transfers route through Arc.
- SafeZeroKeyGuard is deployed and verified on Base Sepolia.
