# Sponsor Tech Map (Where We Use Partner Technologies)

This document lists **exact code locations (file + line ranges)** for sponsor / partner technologies.

> Tip: Use this to quickly answer "where is X used?" during submission or judging.

---

## Circle Gateway / Arc — Cross-chain USDC (Track 1, 2, 3)

### Real Gateway API integration (EIP-712 BurnIntent signing)

- **Backend: BurnIntent signing + Gateway API submission**
  - `packages/backend/src/services/gateway.ts`
    - EIP-712 domain + types (from Circle's evm-gateway-contracts): **lines 62–91**
    - `buildBurnIntent()` — constructs TransferSpec with real contract addresses: **lines 236–272**
    - `signBurnIntent()` — signs with `account.signTypedData()`: **lines 277–292**
    - `submitToGatewayApi()` — POST to `gateway-api-testnet.circle.com/v1/transfer`: **lines 297–322**
    - `transferViaGateway()` — full pipeline (build → sign → submit → honest result): **lines 439–539**
    - `depositToGateway()` — real on-chain approve + deposit to GatewayWallet: **lines 375–429**
    - `getGatewayBalances()` — real API call to /v1/balances: **lines 332–368**
    - `getGatewayInfo()` — real API call to /v1/info: **lines 639–668**

- **Backend: Gateway routes (all 3 prize tracks)**
  - `packages/backend/src/routes/gateway.ts`
    - Track 1 `/transfer` — signs BurnIntent, submits to real Gateway API: **lines 104–162**
    - Track 2 `/payout` — multi-recipient payout via Gateway: **lines 214–274**
    - Track 3 `/agent-commerce` — agent-driven crosschain transfer: **lines 276–343**
    - `/transfer/signed` — accepts frontend-signed BurnIntent: **lines 164–212**
    - `/eip712-config` — exports EIP-712 types for frontend signing: **lines 60–66**

- **Frontend: CrosschainPanel (real wallet signing)**
  - `packages/frontend/src/components/CrosschainPanel.tsx`
    - EIP-712 BurnIntent construction + `useSignTypedData` (wagmi): **lines 125–175**
    - USDC approve for GatewayWallet via `walletClient.writeContract`: **lines 248–274**
    - Signing mode toggle (Wallet vs Backend): **lines 397–420**
    - Transfer + Multi-Payout UI with domain selection: **full file**

### Verified behavior

```
POST /api/gateway/transfer → Gateway API 400: "Insufficient balance for depositor 0x...
  available 0, required 1.01005"
```

This proves: BurnIntent signed correctly, Gateway validated signature, checked real balances.

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
  - accepts destination as 0x or ENS and resolves server-side

### Frontend: ENS profile + text records

- `packages/frontend/src/lib/ens.ts`
  - ENS name detection + forward/reverse resolution: **lines 33–63**
  - ENS avatar/text record helpers: **lines 66–90**
  - Full ENS profile including custom AI agent records (ai.api.endpoint, ai.services, ai.trustscore): **lines 92–149**

- `packages/frontend/src/components/EnsProfile.tsx`
  - UI card that displays ENS profile + custom records

---

## Safe Guard — On-chain execution governance

- **Smart contract**
  - `packages/contracts/src/SafeZeroKeyGuard.sol`
    - Deployed at `0x5fBdEEE03e76Bb0616060697D0d41300F3B2d3D2` on Base Sepolia
    - Implements `checkTransaction()` hook for Safe multisig

- **Backend: Guard routes**
  - `packages/backend/src/routes/guard.ts`
    - Register wallet, check transactions, manage policies

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

- **No mocks**: All Gateway API calls go to the real `gateway-api-testnet.circle.com`. Honest errors (e.g., insufficient balance) are returned as-is.
- **Real on-chain**: USDC payments on Base Sepolia with tx receipt verification. SafeZeroKeyGuard deployed and callable.
- **Real ENS**: Resolution against Ethereum mainnet (forward, reverse, text records).
- Provider addresses use project-owned testnet wallets, not famous people's addresses.
