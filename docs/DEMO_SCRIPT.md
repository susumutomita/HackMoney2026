# Demo Script (5 minutes) — All 5 Prize Tracks

Goal: a judge-friendly demo showing ZeroKey across **all prize tracks**: Circle Gateway/Arc (Tracks 1-3), ENS, and Safe Guard.

Target URL:

- `https://zerokey.exe.xyz:8000/`

---

## Characters

- **User**: a human who delegates work
- **Agent**: chooses a provider and pays
- **ZeroKey Firewall**: approves/rejects and explains why

---

## 0:00–0:30 — Hook (what this is)

Say:

- "AI agents are hiring other agents and paying them in USDC. That's the Agent Economy."
- "But agents can overspend or get scammed. ZeroKey is the **execution governance layer** — policy decides before money moves."

Show:

- Landing page headline

---

## 0:30–1:30 — Discover, Negotiate, Firewall (A2A + Firewall)

Actions:

1. Go to **Marketplace**
2. Pick **ImagePack** (success flow)
3. Start negotiation → Accept price
4. Run **Firewall check** → show APPROVED + reason

Then repeat with **CheapTranslate** (blocked flow):

1. Start negotiation → Accept
2. Firewall check → **REJECTED** ("money never moved")

Say:

- "The Firewall explains _why_ before we pay. CheapTranslate was blocked — recipient mismatch, trust score too low."

---

## 1:30–2:30 — USDC Payment (x402 + on-chain receipt)

Actions:

1. Back to ImagePack → Click **Pay**
2. Confirm payment modal
3. Show PaymentStatus flow (processing → success)
4. Show txHash → open on BaseScan Sepolia

Say:

- "x402 flow: server responds Payment Required, agent pays USDC, backend verifies on-chain receipt."

---

## 2:30–3:30 — Circle Gateway / Arc Crosschain (Tracks 1-3)

Actions:

1. Navigate to the **Crosschain USDC via Arc** panel
2. Show the Signer toggle: "Your Wallet" vs "Backend Key"
3. Select **Your Wallet** mode
4. Set source = Base Sepolia, destination = Arc Testnet
5. Click **Check Unified USDC Balance** (real API call)
6. Click **Approve USDC for Gateway** (on-chain tx)
7. Click **Sign & Transfer via Gateway** (EIP-712 BurnIntent signing)
8. Show result — if insufficient balance, explain:

Say:

- "This signs a real EIP-712 BurnIntent against Circle's Gateway specification. The Gateway API validated our signature and checked our on-chain balance."
- "No mocks. The 'insufficient balance' error proves the entire pipeline is real."

Show Multi-Payout tab briefly:

- "Track 2: batch payouts to multiple recipients across chains."

---

## 3:30–4:15 — ENS Integration

Actions:

1. Show an **ENS Profile** card on the negotiate page
2. Point out custom AI text records: `ai.api.endpoint`, `ai.services`, `ai.trustscore`

Say:

- "ENS is used for agent discovery. Custom text records make AI providers discoverable on-chain."
- "Resolution is real — against Ethereum mainnet."

---

## 4:15–4:45 — Safe Guard

Actions:

1. Navigate to `/setup`
2. Show the Safe Guard registration flow
3. Point out the deployed contract on Base Sepolia

Say:

- "Safe Guard adds policy enforcement at the contract level. `checkTransaction()` blocks unapproved transactions before execution."
- "Deployed at `0x5fBdEE...` on Base Sepolia."

---

## 4:45–5:00 — Close

Say:

- "This isn't mocked — real Gateway API, real on-chain USDC, real ENS resolution, real Safe Guard."
- "ZeroKey makes Agent Economy safe: **A2A discovery + Firewall governance + crosschain USDC settlement**."

---

## API proof commands (backup / judge Q&A)

```bash
# Gateway info (real Circle API)
curl -s http://localhost:3001/api/gateway/info | jq .

# EIP-712 config
curl -s http://localhost:3001/api/gateway/eip712-config | jq .

# Check balances (real Circle API)
curl -s -X POST http://localhost:3001/api/gateway/balances \
  -H "Content-Type: application/json" \
  -d '{"depositor":"0x7aD8317e9aB4837AEF734e23d1C62F4938a6D950"}' | jq .

# Transfer (real BurnIntent signing + Gateway API submission)
curl -s -X POST http://localhost:3001/api/gateway/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sourceDomain": 6,
    "destinationDomain": 26,
    "sender": "0x7aD8317e9aB4837AEF734e23d1C62F4938a6D950",
    "recipient": "0xae0D06961f7103B43ed93721d5a2644c09EB159C",
    "amountUsdc": "1.00"
  }' | jq .
# Expected: 400 "Insufficient balance" (real — needs USDC deposited to GatewayWallet)
```

---

## Acceptance criteria

- [ ] Firewall APPROVED and REJECTED paths both work
- [ ] USDC payment verifies on-chain receipt (txHash on BaseScan)
- [ ] Gateway balance check returns real data from Circle API
- [ ] Gateway transfer returns honest error (insufficient balance) or succeeds
- [ ] ENS resolution works against Ethereum mainnet
- [ ] Safe Guard contract address verifiable on Base Sepolia explorer

---

## If wallet/USDC not available

- Run the **Blocked** flow (CheapTranslate) to prove firewall
- Show Gateway API commands from terminal (backup proof above)
- Show ENS profile cards and explain text record schema
