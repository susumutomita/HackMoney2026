# ZeroKey Treasury

> **Firewall for Agent Commerce** — policy decides **before money moves**.

[![HackMoney 2026](https://img.shields.io/badge/HackMoney-2026-blue)](https://ethglobal.com)
[![ENS Integration](https://img.shields.io/badge/ENS-Integrated-5284FF)](https://ens.domains)
[![Arc Network](https://img.shields.io/badge/Arc-Ready-00D4FF)](https://arc.network)
[![Base Sepolia](https://img.shields.io/badge/Base-Sepolia-0052FF)](https://base.org)

### The bigger shift (Internet → Agents)

- **Internet era:** moved information online.
- **Agent era:** moves decisions and execution off humans.

So we need a new standard layer that enforces policy **before money moves**.

### The premise we break (Before / After)

**Before:** In DeFi, if you sign, money moves. There is no second chance.

**After:** With ZeroKey, signing is a request. Money moves only if policy says yes.

### Mental model

AI agents are overconfident interns. **ZeroKey is the CFO standing between your agent and your wallet.**

ZeroKey Treasury is an **execution firewall** for agent-to-agent commerce: agents discover providers, negotiate, run a policy check (recipient invariants, spend limits, anomaly checks), then pay in USDC using an HTTP 402 flow.

All outcomes are auditable:

- **APPROVED** → we verify the USDC transfer by on-chain receipt (txHash) and persist a Purchase Log
- **REJECTED** → we write a Blocked Audit Log event (“money never moved”)

Bonus (read-only): we also show **ERC-8004 Identity Registry** signals on Base Sepolia as an on-chain trust signal source (not claiming full compliance).

## 🎬 Demo

**Live Demo**: [https://zerokey.exe.xyz:8000](https://zerokey.exe.xyz:8000)

Quick links:

- Demo script: `docs/DEMO_SCRIPT.md`
- Demo checklist: `docs/DEMO_CHECKLIST.md`
- API Docs (Swagger): `/docs`
- **Safe Guard Setup**: `/setup` - Protect your Safe multisig
- A2A Payment Router spec: `docs/spec/AGENT_PAYMENT_ROUTER.md`
- Sponsor tech map: `docs/SPONSOR_TECH_MAP.md`
- Trust score model: `docs/TRUST_SCORE_MODEL.md`

### Safe Guard Protection (NEW)

Protect your Safe multisig wallet with ZeroKey Guard:

1. Go to `/setup` and enter your Safe address
2. Configure policy (max transaction amount, daily limits)
3. Sign the `setGuard()` transaction in Safe App
4. All future transactions from this Safe go through ZeroKey policy checks

```
Safe Transaction → ZeroKey Guard → Policy Check → Execute or Block
```

### Firewall before execution (30-second mental model)

```mermaid
sequenceDiagram
    participant Agent as 🤖 AI Agent
    participant Firewall as 🛡️ ZeroKey Firewall
    participant Chain as ⛓️ USDC / Blockchain

    Note over Agent,Firewall: Agent attempts a risky payment
    Agent->>Firewall: Request: Pay USDC to recipient X

    Note over Firewall: Policy checks (automatic)
    Firewall->>Firewall: Check recipient invariants / allowlist

    alt Recipient mismatch / allowlist fail
        Firewall-->>Agent: ⛔ REJECTED (explainable reason)
        Firewall->>Firewall: 📝 Write audit event (money never moved)
        Note right of Chain: Funds are safe
    else Passed checks
        Firewall-->>Agent: ✅ APPROVED
        Agent->>Chain: Send USDC
        Agent->>Firewall: Submit txHash
        Firewall->>Firewall: Verify receipt + persist purchase log
    end
```

## Agent integration (API-first)

The UI is just a demo shell. In production, **an agent uses ZeroKey by calling the API**.

Minimal flow:

1. `POST /api/a2a/negotiate` (create session)
2. `POST /api/a2a/negotiate/:sessionId/offer` (reach agreement)
3. `POST /api/firewall/check` (execution gate)
4. If approved: `POST /api/pay/request` → (HTTP 402) → send USDC → `POST /api/pay/submit` with `txHash`

## Cost model (why routing is worth it)

Routing adds a small governance/audit overhead (like fraud detection / 3DS), but prevents catastrophic loss:

- **Cost:** tiny % fee or subscription (future pricing)
- **Benefit:** prevents recipient swap / malicious provider / overcharge **before** money moves, with audit-grade proof

```
[AI Assistant] "Translate this contract to English"
        │
        ▼ A2A Discovery & Negotiation
[Provider A] "$0.05/1000 tokens" - Trust: 85/100
[Provider B] "$0.03/1000 tokens" - Trust: 78/100
[Provider C] "$0.01/1000 tokens" - Trust: 15/100 ← Suspicious
        │
        ▼ Negotiation Result: Provider B selected ($0.03)
        │
        ▼ ZeroKey Firewall
    ┌────────────────────────────────────────┐
    │ LLM Analysis:                          │
    │ • Purpose: Business translation ✅     │
    │ • Amount: $0.03 (within budget) ✅     │
    │ • Provider: Trust score 78/100 ✅      │
    │ • Risk: LOW                            │
    │ → APPROVED                             │
    └────────────────────────────────────────┘
        │
        ▼ x402 Payment
    HTTP 402 → USDC Transfer → API Response
```

---

## 🏆 Prize Tracks & Code Map

> **For judges**: each section below links directly to the code that implements the prize requirements.
> See also [`docs/SPONSOR_TECH_MAP.md`](docs/SPONSOR_TECH_MAP.md) for file + line-level detail.

---

### Circle / Arc Track 1: Chain Abstracted USDC Apps Using Arc as Liquidity Hub ($5,000)

USDC transfers route through **Arc (domain 26)** as the central liquidity hub via Circle Gateway.

| What               | File                                                                                                           | Purpose                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Gateway service    | [`packages/backend/src/services/gateway.ts`](packages/backend/src/services/gateway.ts)                         | `transferViaGateway()` — routes Source → Arc Hub → Destination |
| Circle CCTP client | [`packages/backend/src/services/circleGateway.ts`](packages/backend/src/services/circleGateway.ts)             | CCTP transfer creation, status polling, demo fallback          |
| Gateway API routes | [`packages/backend/src/routes/gateway.ts`](packages/backend/src/routes/gateway.ts)                             | `POST /transfer` — firewall-gated crosschain transfer          |
| Crosschain UI      | [`packages/frontend/src/components/CrosschainPanel.tsx`](packages/frontend/src/components/CrosschainPanel.tsx) | Transfer form with Arc routing path visualization              |
| Gateway config     | [`packages/shared/src/constants.ts`](packages/shared/src/constants.ts)                                         | `GATEWAY_CONFIG`, `ARC_CONFIG`, domain IDs, USDC addresses     |
| Chain definitions  | [`packages/shared/src/constants.ts`](packages/shared/src/constants.ts)                                         | Arc (411) and Arc Testnet (412) chain configs                  |

**How it works**: `POST /api/gateway/transfer` → firewall check → `transferViaGateway()` → Gateway API call with Arc hub routing → attestation → mint on destination.

---

### Circle / Arc Track 2: Global Payouts and Treasury Systems with USDC on Arc ($2,500)

Multi-recipient, multi-chain USDC payouts using Arc as the centralized liquidity hub for treasury operations.

| What                 | File                                                                                                           | Purpose                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Multi-payout service | [`packages/backend/src/services/gateway.ts`](packages/backend/src/services/gateway.ts)                         | `executeMultiPayout()` — batch recipients across chains via Arc     |
| Payout API route     | [`packages/backend/src/routes/gateway.ts`](packages/backend/src/routes/gateway.ts)                             | `POST /payout` — up to 16 recipients, firewall-gated                |
| Unified balances     | [`packages/backend/src/services/gateway.ts`](packages/backend/src/services/gateway.ts)                         | `getGatewayBalances()` — aggregated USDC across all Gateway domains |
| Balance API          | [`packages/backend/src/routes/gateway.ts`](packages/backend/src/routes/gateway.ts)                             | `POST /balances` — check depositor balances across chains           |
| Multi-payout UI      | [`packages/frontend/src/components/CrosschainPanel.tsx`](packages/frontend/src/components/CrosschainPanel.tsx) | "Multi-Payout" tab with recipient builder                           |
| Purchase audit       | [`packages/frontend/src/components/PurchaseLogCard.tsx`](packages/frontend/src/components/PurchaseLogCard.tsx) | Treasury transaction history and audit trail                        |
| Payment verification | [`packages/backend/src/services/payment.ts`](packages/backend/src/services/payment.ts)                         | On-chain receipt verification for USDC transfers                    |

**How it works**: `POST /api/gateway/payout` → firewall check on total amount → `executeMultiPayout()` → each recipient routed through Arc Hub → audit log persisted.

---

### Circle / Arc Track 3: Agentic Commerce powered by RWA on Arc ($2,500)

AI agents autonomously discover, negotiate, and pay for services — protected by an LLM-powered execution firewall.

| What                 | File                                                                                         | Purpose                                                      |
| -------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Agent commerce route | [`packages/backend/src/routes/gateway.ts`](packages/backend/src/routes/gateway.ts)           | `POST /agent-commerce` — agent-driven purchase with firewall |
| LLM analyzer         | [`packages/backend/src/services/analyzer.ts`](packages/backend/src/services/analyzer.ts)     | Claude API transaction classification and risk analysis      |
| Execution firewall   | [`packages/backend/src/services/firewall.ts`](packages/backend/src/services/firewall.ts)     | Semantic policy evaluation (approve/block agent decisions)   |
| Trust scoring        | [`packages/backend/src/services/trustScore.ts`](packages/backend/src/services/trustScore.ts) | On-chain trust score: ENS, wallet age, contract verification |
| A2A discovery        | [`packages/backend/src/routes/a2a.ts`](packages/backend/src/routes/a2a.ts)                   | Service discovery and WebSocket negotiation                  |
| AI agent engine      | [`packages/backend/src/services/agent.ts`](packages/backend/src/services/agent.ts)           | Agent orchestration and autonomous reasoning                 |
| On-chain guard       | [`packages/contracts/src/ZeroKeyGuard.sol`](packages/contracts/src/ZeroKeyGuard.sol)         | Stores approve/reject decisions on-chain                     |

**How it works**: Agent discovers provider via A2A → negotiates price → `POST /api/gateway/agent-commerce` → firewall analyzes intent + checks policy → if approved, USDC routed via Arc → decision logged on-chain.

---

### ENS Integration ($3,500 - $5,000)

Custom ENS text records for AI agent discovery, identity resolution, and trust scoring.

| What               | File                                                                                                 | Purpose                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| ENS library        | [`packages/frontend/src/lib/ens.ts`](packages/frontend/src/lib/ens.ts)                               | Forward/reverse resolution, custom text records, batch lookup |
| ENS profile card   | [`packages/frontend/src/components/EnsProfile.tsx`](packages/frontend/src/components/EnsProfile.tsx) | Displays avatar, social links, AI agent fields                |
| ENS name component | [`packages/frontend/src/components/EnsProfile.tsx`](packages/frontend/src/components/EnsProfile.tsx) | `EnsName` — inline ENS display with address fallback          |
| Server-side ENS    | [`packages/backend/src/services/ens.ts`](packages/backend/src/services/ens.ts)                       | Mainnet ENS resolution for backend services                   |
| Trust scoring      | [`packages/backend/src/services/trustScore.ts`](packages/backend/src/services/trustScore.ts)         | ENS name as trust signal in provider scoring                  |
| Marketplace        | [`packages/frontend/src/app/marketplace/page.tsx`](packages/frontend/src/app/marketplace/page.tsx)   | Provider cards with ENS badges and names                      |

**Custom text records** (`ai.api.endpoint`, `ai.services`, `ai.trustscore`) enable on-chain AI agent registration via ENS.

---

### Safe Guard ($2,500)

Safe multisig protection via a transaction Guard that enforces policies before execution.

| What                 | File                                                                                                           | Purpose                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Guard contract       | [`packages/contracts/src/SafeZeroKeyGuard.sol`](packages/contracts/src/SafeZeroKeyGuard.sol)                   | `checkTransaction()` hook with policy enforcement        |
| Base contract        | [`packages/contracts/src/ZeroKeyGuard.sol`](packages/contracts/src/ZeroKeyGuard.sol)                           | Execution governance layer, on-chain decision storage    |
| Oracle service       | [`packages/backend/src/services/safeGuardOracle.ts`](packages/backend/src/services/safeGuardOracle.ts)         | Monitors Safe txs, evaluates policies, submits decisions |
| Guard API            | [`packages/backend/src/routes/guard.ts`](packages/backend/src/routes/guard.ts)                                 | `POST /register`, `GET /status`, `POST /pre-approve`     |
| Policy API           | [`packages/backend/src/routes/safe-policy.ts`](packages/backend/src/routes/safe-policy.ts)                     | Safe policy CRUD operations                              |
| Firewall integration | [`packages/backend/src/services/firewall.ts`](packages/backend/src/services/firewall.ts)                       | Safe Guard registration verification in firewall checks  |
| Guard status UI      | [`packages/frontend/src/components/SafeGuardStatus.tsx`](packages/frontend/src/components/SafeGuardStatus.tsx) | Displays protection status and active policies           |
| Setup wizard         | [`packages/frontend/src/app/setup/page.tsx`](packages/frontend/src/app/setup/page.tsx)                         | Safe registration and `setGuard()` flow                  |
| Deployed             | Base Sepolia                                                                                                   | `SafeZeroKeyGuard` deployed and verified                 |

---

## 🎯 Key Features

| Feature                | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| **A2A Gateway**        | AI agents discover and negotiate with service providers |
| **Execution Firewall** | LLM-powered semantic analysis + policy enforcement      |
| **x402 Payment**       | HTTP 402 protocol for USDC micropayments                |
| **On-chain Guard**     | Approval decisions recorded on blockchain               |
| **ENS Integration**    | Decentralized identity for AI agents                    |
| **Trust Scoring**      | Explainable trust score (payment predictability)        |
| **Fail-safe**          | Blocks transactions when analysis fails                 |

**Trust score design**: see `docs/TRUST_SCORE_MODEL.md` (verifiable signals, explainable features, not social ratings).

---

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/yourusername/HackMoney2026.git
cd HackMoney2026
pnpm install

# Start backend (port 3001)
cd packages/backend && pnpm dev &

# Start frontend (port 8000)
cd packages/frontend && PORT=8000 pnpm dev
```

**URLs**:

- Frontend: http://localhost:8000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Frontend (Next.js 15)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Dashboard   │  │  Marketplace │  │  Negotiation │  │   History    │    │
│  │  (Overview)  │  │  (Providers) │  │  (A2A Chat)  │  │  (Purchases) │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                         REST API + WebSocket
                                      │
┌─────────────────────────────────────┼──────────────────────────────────────┐
│                           Backend (Hono)                                    │
│  ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐     │
│  │ A2A Gateway       │   │ Firewall Engine   │   │ x402 Handler      │     │
│  │ - Discovery       │   │ - LLM Analyzer    │   │ - Payment Req     │     │
│  │ - Negotiation     │   │ - Policy Check    │   │ - Verify Proof    │     │
│  │ - ENS Resolution  │   │ - Trust Scoring   │   │ - USDC Transfer   │     │
│  └─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘     │
└────────────┼───────────────────────┼─────────────────────────┼─────────────┘
             │                       │                         │
             ▼                       ▼                         ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────────────┐
│ Provider Registry │   │ SQLite DB         │   │ Blockchain (Base Sepolia) │
│ (ENS-enabled)     │   │ (Audit Trail)     │   │ - ZeroKeyGuard.sol        │
└───────────────────┘   └───────────────────┘   │ - USDC Payments           │
                                                └───────────────────────────┘
```

---

## 📡 API Reference

### Discovery

```bash
# Find translation providers
GET /api/a2a/discover?service=translation

# Response includes wallet addresses for ENS lookup
{
  "results": [
    {
      "id": "translate-ai-001",
      "name": "TranslateAI Pro",
      "trustScore": 85,
      "price": "0.03",
      "walletAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    }
  ]
}
```

### Negotiation

```bash
# Start negotiation session
POST /api/a2a/negotiate
{
  "clientId": "0x...",
  "providerId": "translate-ai-001",
  "service": "translation",
  "initialOffer": "0.025"
}

# Accept offer
POST /api/a2a/negotiate/:sessionId/offer
{
  "amount": "0.03",
  "type": "accept"
}
```

### Firewall Check

```bash
# Request approval before payment
POST /api/firewall/check
{
  "sessionId": "neg-xxx",
  "userAddress": "0x..."
}

# Response
{
  "approved": true,
  "firewall": {
    "decision": "APPROVED",
    "riskLevel": 1,
    "reasons": ["High-trust provider"]
  },
  "analysis": {
    "classification": "translation",
    "reason": "Low-risk translation service request..."
  }
}
```

---

## 🛡️ Firewall Decisions

| Scenario                     | Decision | Reason                    |
| ---------------------------- | -------- | ------------------------- |
| Trusted provider (85+ score) | APPROVED | High trust, within budget |
| Moderate provider (40-84)    | WARNING  | Proceed with caution      |
| Low trust provider (<40)     | REJECTED | Potential scam risk       |
| Budget exceeded              | REJECTED | Daily limit reached       |
| Rate limit hit               | REJECTED | Too many requests         |
| Analysis failed              | REJECTED | Fail-safe default         |

---

## 🛠️ Tech Stack

| Layer               | Technology                        |
| ------------------- | --------------------------------- |
| **Smart Contracts** | Solidity 0.8.24, Foundry          |
| **Backend**         | Hono, TypeScript, Zod             |
| **Frontend**        | Next.js 15, React 19, TailwindCSS |
| **Web3**            | Wagmi, Viem, RainbowKit           |
| **AI**              | Claude (Anthropic)                |
| **Payments**        | USDC, x402 Protocol               |
| **Identity**        | ENS (Ethereum Name Service)       |
| **Database**        | SQLite + Drizzle ORM              |
| **Blockchain**      | Base Sepolia (Arc-ready)          |

---

## 📁 Project Structure

```
zerokey-treasury/
├── packages/
│   ├── contracts/          # Solidity smart contracts
│   │   └── src/
│   │       ├── ZeroKeyGuard.sol
│   │       └── interfaces/
│   │
│   ├── backend/            # API server (Hono)
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── a2a.ts         # A2A Gateway
│   │       │   ├── firewall.ts    # Execution firewall
│   │       │   └── pay.ts         # x402 payments
│   │       ├── services/
│   │       │   ├── analyzer.ts    # LLM analysis
│   │       │   └── firewall.ts    # Policy engine
│   │       └── db/
│   │           └── schema.ts      # SQLite schema
│   │
│   ├── frontend/           # Dashboard UI
│   │   └── src/
│   │       ├── app/
│   │       │   ├── page.tsx           # Home
│   │       │   ├── marketplace/       # Provider discovery
│   │       │   ├── negotiate/         # A2A negotiation
│   │       │   └── dashboard/         # User dashboard
│   │       ├── components/
│   │       │   └── EnsProfile.tsx     # ENS integration
│   │       └── lib/
│   │           └── ens.ts             # ENS utilities
│   │
│   └── shared/             # Shared types
│       └── src/
│           ├── types.ts
│           └── constants.ts   # Chain configs (incl. Arc)
│
└── docs/
    ├── AGENTS.md           # AI agent context
    ├── CLAUDE.md           # Development guide
    └── prize/PRIZE.md      # Prize track info
```

---

## 🔐 Security

- **Fail-safe Design**: Default to REJECT when LLM analysis fails
- **Rate Limiting**: Prevents abuse (10 requests/minute)
- **Budget Control**: Daily spending limits per user
- **Trust Scoring**: Reputation-based provider filtering
- **Audit Trail**: All decisions logged to SQLite + blockchain
- **Signed Requests**: HTTP signature verification for critical endpoints

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

Built for **HackMoney 2026** by ETHGlobal

- [ENS](https://ens.domains) - Decentralized naming
- [Arc Network](https://arc.network) - Circle's L1 for USDC
- [Base](https://base.org) - Ethereum L2
- [Anthropic](https://anthropic.com) - Claude AI
- [Circle](https://circle.com) - USDC

---

## 📞 Contact

- GitHub: [@susumutomita](https://github.com/susumutomita)
- Twitter: [@tomitasusumu999](https://twitter.com/tomitasusumu999)

---

**ZeroKey Treasury** - _Execution Governance for Autonomous Finance_
