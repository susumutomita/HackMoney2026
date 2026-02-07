---
marp: true
title: ZeroKey Treasury
paginate: true
size: 16:9
---

# ZeroKey

## Pay only after OK.

A firewall for agent payments.

---

## Problem

Agents pay fast.

Agents can pay wrong.

Bad payments are hard to undo.

---

## Swarm

Many agents use **one firewall**.

One rule for all payments.

---

## How it works

**Check → HTTP 402 → txHash proof**

Pay only after **APPROVE**.

---

## Results + Proof

**APPROVE / CONFIRM / REJECT**

Proof for **yes** and **no**.

- REJECT: **Money never moved.**
- APPROVE: **USDC txHash on BaseScan.**

---

## Demo (1 command)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001 \
PRIVATE_KEY=0x... \
pnpm tsx scripts/swarm-demo.ts
```

(Or use hosted API)

---

## Close

**Policy before money moves.**
