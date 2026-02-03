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

## Notes

- This project uses **real on-chain settlement on Base Sepolia** (not a mock): we verify tx receipts and persist txHash in logs.
- Our “firewall decision” and “money never moved” events are designed to be **auditable** and easy for judges to understand.
