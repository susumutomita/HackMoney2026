# Demo Checklist (Run Before Every Demo)

Goal: ensure the end-to-end story is reliable and reproducible.

This checklist matches the **Success → Blocked → Success** demo narrative.

---

## Agent-to-Agent demo (no UI) (2–4 min)

This is the most reliable live judging demo: it produces hard proof without clicking UI.

- Requires: backend healthy + a funded Base Sepolia wallet (USDC + gas)

Run (hosted):

```bash
NEXT_PUBLIC_API_URL=https://zerokey.exe.xyz:8000 \
PRIVATE_KEY=0x... \
pnpm tsx scripts/agent2agent-demo.ts
```

Run (local backend):

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001 \
PRIVATE_KEY=0x... \
pnpm tsx scripts/agent2agent-demo.ts
```

Expected outputs:

- DEMO 1: REJECTED + proof via `/api/firewall/events` (money never moved)
- DEMO 2: APPROVED + txHash (BaseScan) + receipt verification via `pay/submit`

---

## Prerequisites (2 min)

- [ ] Backend is running (health check): `GET /health` returns 200
- [ ] Frontend is running and reachable
- [ ] Wallet is connected (Base Sepolia)
- [ ] Wallet is on **Base Sepolia**
- [ ] Wallet has:
  - [ ] Base Sepolia ETH for gas
  - [ ] Base Sepolia USDC for payments

Optional sanity checks:

- [ ] Dashboard loads (Stats + Purchase Log + Blocked Audit Log render)
- [ ] Purchase Log shows existing entries (or “No purchases yet”)
- [ ] (Optional) ERC-8004 Identity viewer shows onchain identity signals for a provider (Base Sepolia)

---

## Flow A — Success (visible output) (3–4 min)

Provider: **ImagePack** (`image-pack-001`)

1. [ ] Go to Marketplace → open **ImagePack**
2. [ ] Start negotiation → Accept price
3. [ ] Run Firewall check
   - [ ] Expect **APPROVED**
4. [ ] Click Pay → Confirm payment
5. [ ] Wait for success
   - [ ] Expect **Payment successful**
   - [ ] Expect a visible **Purchased output** image in the success modal
6. [ ] Go to Dashboard
   - [ ] Purchase Log: new entry exists with txHash + firewall reason

---

## Flow B — Blocked (Money never moved) (2–3 min)

Provider: **CheapTranslate** (`sketchy-service-001`)

1. [ ] Go to Marketplace → open **CheapTranslate**
2. [ ] Start negotiation → Accept price
3. [ ] Run Firewall check
   - [ ] Expect **REJECTED**
   - [ ] UI shows **Transfer Blocked** + human-readable reason
   - [ ] Confirm it explains recipient mismatch / allowlist violation
4. [ ] Go to Dashboard
   - [ ] Blocked Audit Log: top entry is 🔴 REJECTED
   - [ ] Entry contains reason + attempted recipient
   - [ ] Entry includes “Money never moved”

---

## Flow C — Success again (1–2 min)

Repeat Flow A quickly to prove we still can execute normal commerce after blocking.

- [ ] ImagePack → APPROVED → Pay → Purchased output

---

## If something fails (triage)

- If wallet has no USDC:
  - [ ] Switch to only demonstrating the **Blocked** flow
  - [ ] Show Payment Required (402) response payload (optional)

- If RPC is flaky:
  - [ ] Use a pre-funded wallet
  - [ ] Keep the demo on Base Sepolia only

- If logs don’t show:
  - [ ] Refresh Dashboard
  - [ ] Confirm backend API is reachable from frontend (NEXT_PUBLIC_API_URL)

---

## One-line demo narrative

> “Agent tries to pay. Firewall checks recipient invariants and policy. If risky, it blocks and logs proof that money never moved. If safe, the agent pays USDC, we verify the receipt, log the purchase, and return a visible output.”
