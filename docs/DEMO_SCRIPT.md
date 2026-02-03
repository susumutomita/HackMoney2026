# Demo Script (3 minutes) — Agent buys an API with USDC (A2A + Firewall + x402)

Goal: a crisp, judge-friendly demo showing **Agent Economy** with a real payment, and why ZeroKey’s control layer matters.

Target URL:

- `https://zerokey.exe.xyz:8000/`

---

## Characters

- **User**: a human who delegates work
- **Agent**: chooses a provider and pays
- **ZeroKey Firewall**: approves/rejects and explains why

---

## 0:00–0:20 — Hook (what this is)

Say:

- “AI agents are starting to hire other agents and pay them in USDC. That’s the Agent Economy.”
- “But if agents can pay, they can also overspend or get scammed. ZeroKey is the **execution governance layer** that sits before money leaves the wallet.”

Show:

- Landing page headline + the idea of ‘Execution Governance Layer’

---

## 0:20–1:10 — Discover & negotiate (A2A)

Actions:

1. Go to **Marketplace**
2. Pick **ImagePack** (success flow)
3. Start negotiation
4. Accept price

Say:

- “The agent discovers providers and negotiates price — this is the A2A part.”

Show:

- Provider price + trust score
- (Optional) **ERC-8004 Identity** viewer: on-chain identity + endpoint (read-only)

---

## 1:10–1:50 — Firewall decision (control layer)

Actions:

1. After agreement, run **Firewall check**
2. Show the decision (APPROVED / REJECTED) and the reason

Say:

- “The Firewall explains why it’s safe or risky _before_ we pay.”

Note:

- For the full narrative, we run **Success → Blocked → Success**.
  - Success: ImagePack (APPROVED)
  - Blocked: CheapTranslate (REJECTED, money never moved)

---

## 1:50–2:40 — Payment Required (x402) → USDC transfer

Actions:

1. Click **Pay**
2. Show the **Confirm Payment** modal (amount/recipient/network/firewall summary)
3. Confirm
4. Show the **PaymentStatus** flow (processing → success)
5. Click the txHash / open BaseScan

Say:

- “This endpoint uses an x402-style flow: server responds Payment Required, then the agent pays in USDC.”
- “The backend verifies the USDC transfer by **waiting for the on-chain receipt** and decoding the Transfer event.”

Proof (important):

- Show the **txHash** and open it on BaseScan Sepolia.

---

## 2:40–3:00 — Close (why it wins)

Say:

- “This isn’t a mock — it’s a real USDC payment flow.”
- “ZeroKey makes Agent Economy safe: **A2A discovery + Firewall governance + USDC settlement**.”
- “This is directly aligned with the Arc USDC treasury/agentic commerce tracks.”

---

## Acceptance criteria (must be true during demo)

- APPROVED path can complete: Firewall → Pay confirm → processing → success
- Payment verification uses txHash receipt checks (not just a fake ‘ok’)
- UI clearly explains _why_ the firewall allowed/blocked

---

## Backup plan (if wallet/USDC not available)

- Run the **Blocked** flow (CheapTranslate) and emphasize:
  - “Money never moved” (audit log proof)
- Show the 402 response payload from `/api/pay/request` and explain how the wallet step works.

## Dev-only reliability check (optional)

If you need a quick sanity check before a demo:

```bash
pnpm dev:backend
pnpm --filter backend exec tsx ../../scripts/smoke-demo.ts
```

This prints a fresh BaseScan txHash you can keep as backup proof.
