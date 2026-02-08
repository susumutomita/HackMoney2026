# ZeroKey Treasury - Demo Script (4 min)

## Before Demo

- Open: https://zerokey.exe.xyz:8000
- Browser: Chrome, wallet connected (MetaMask, Base Sepolia)
- Tabs ready: Home, Marketplace, Dashboard

---

## 0:00 - 0:30 | Intro (Home Page)

**Open**: https://zerokey.exe.xyz:8000

**Say**:
> "ZeroKey is a firewall for AI agent payments.
> AI agents can spend money, but no one checks.
> ZeroKey checks every payment before it happens.
> If it's not safe, money does not move."

---

## 0:30 - 1:30 | Marketplace + Negotiate

**Click**: "Launch Demo" or go to `/marketplace`

**Say**:
> "This is our marketplace. Agents find providers here."

**Do**:
1. Show 2 providers: TranslateAI Pro (trusted) and CheapTranslate (scam)
2. Click "TranslateAI Pro" to start negotiation

**Say**:
> "Now the agent negotiates a price with the provider."

**Do**:
3. Send an offer (e.g. $0.02)
4. See counter-offer
5. Accept the deal

---

## 1:30 - 2:30 | Firewall Check

**Do**:
6. Click "Run Firewall Check"

**Say**:
> "Now ZeroKey checks this payment.
> It uses Claude AI to analyze the risk.
> It checks: Is this provider trusted? Is the price OK? Is it within budget?"

**Show the result**:
> "Result: APPROVED. Risk level LOW. The payment can go through."

**Then go back and try CheapTranslate**:
> "Now let's try the scam provider."

7. Start negotiation with CheapTranslate
8. Run Firewall Check

> "Result: REJECTED. Trust score is zero. Money never moved."

---

## 2:30 - 3:30 | Dashboard + Audit Trail

**Click**: `/dashboard`

**Say**:
> "Every decision is logged.
> Approved payments show the USDC transaction hash.
> You can verify it on BaseScan.
> Rejected payments show why it was blocked."

**Show**:
- Purchase log (approved transactions)
- Blocked audit log (rejected transactions)

---

## 3:30 - 3:50 | Setup / Safe Guard

**Click**: `/setup`

**Say**:
> "You can protect your Safe wallet with ZeroKey Guard.
> Register your Safe, set spending limits, and connect AI agents."

**Show briefly**:
- Step 1: Enter Safe address
- Step 4: API Keys tab (generate a key for agents)

---

## 3:50 - 4:00 | Close

**Say**:
> "ZeroKey Treasury.
> Policy first. Then pay.
> Thank you."

---

## If They Ask

| Question | Answer |
|----------|--------|
| What chain? | Base Sepolia, Arc Testnet, Ethereum Sepolia |
| Real USDC? | Yes, testnet USDC via Circle Gateway |
| What AI? | Claude API for risk analysis |
| On-chain? | Safe Guard contract on Base Sepolia |
| MCP? | Yes, Claude Desktop can connect via MCP |
