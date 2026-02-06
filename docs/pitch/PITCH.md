---
marp: true
title: ZeroKey Treasury — Firewall for Agent Commerce
paginate: true
footer: ZeroKey Treasury • HackMoney 2026
theme: default
---

# ZeroKey Treasury

## Firewall for Agent Commerce

**Policy decides before money moves.**

Live demo: https://zerokey.exe.xyz:8000

---

## The problem

In DeFi, **one signature usually means the money is gone**.

Now AI agents are starting to:

- discover services
- negotiate prices
- pay autonomously

**Enterprises can’t hand the treasury keys to an overconfident intern.**

---

## Premise break (Before / After)

**Before**

- Signing = execution
- No second chance

**After (ZeroKey)**

- Signing = request
- **Money moves only if policy says yes**

---

## Mental model

AI agents are overconfident interns.

**ZeroKey is the CFO standing between your agent and your wallet.**

---

## What we built

A working, testnet-live flow:

1. **Negotiate** (A2A-style)
2. **Firewall** decision (APPROVED / WARNING / BLOCKED)
3. **USDC payment** (HTTP 402 → txHash → receipt verify)
4. **Audit trail**
   - blocked: _money never moved_
   - success: _txHash logged_

---

## Demo highlight: recipient substitution

Most common Web3 failure mode:

- Provider listing shows a recipient
- Attacker swaps the recipient address

**ZeroKey blocks before payment** when recipient != verified registry.

---

## Proof of intervention

Immediately after blocking:

- **Blocked Audit Log** records 🔴 REJECTED
- **No txHash** (because money never moved)

This is compliance-grade “we stopped it” evidence.

---

## Successful commerce (and visible output)

When policy approves:

- Agent pays **USDC on Base Sepolia**
- Server **verifies receipt by txHash**
- Purchase is persisted in **Purchase Log**
- Demo provider returns a **visible purchased artifact** (ImagePack)

---

## Why this matters

ZeroKey is the missing safety layer for agent commerce:

- **Policy before payment**
- **Explainable decisions** (fact-based reasons)
- **Auditable proof** (txHash or “money never moved”)

### How an agent uses it (API-first)

The UI is a demo shell. In production, an agent calls:

- `discover → negotiate → firewall.check → pay.request (402) → pay.submit (txHash)`

### Cost story

Routing adds a small governance/audit overhead, but prevents high-impact failures (recipient swap / malicious provider / runaway spend) **before money moves**.

---

## Sponsor tech (where we use it)

- **USDC / Base Sepolia**: receipt verification + txHash logs
- **ENS**: identity / discovery UX

See: `docs/SPONSOR_TECH_MAP.md`

---

## Closing

**Policy decides before money moves.**

ZeroKey Treasury — Firewall for Agent Commerce

---

## Appendix: quick demo links

- Demo script: `docs/DEMO_SCRIPT.md`
- Demo checklist: `docs/DEMO_CHECKLIST.md`
- Demo run log: `docs/DEMO_RUN_LOG.md`
