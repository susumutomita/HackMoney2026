# Trust Score Model (A2A) — Definition & Design

## Goal

In an Agent-to-Agent (A2A) marketplace, **trust score** should answer a single question:

> “If an autonomous agent pays this provider, how predictable and low-risk is the payment outcome?”

This is _not_ a social rating system. The score is designed to be **explainable** and based on **verifiable facts**.

---

## Non-goals

- Not an LLM “vibes” score.
- Not a crowdsourced star-rating as the primary signal (easy to game).
- Not the final approval decision.

**Policy decisions** are always:

- hard rules (allow/deny lists, recipient invariants, spend limits), plus
- anomaly detection / warnings.

The trust score is a **summary** used to inform WARNING vs APPROVED and to provide a compact UI signal.

---

## Core definition

**Trust score = payment predictability score (0–100)**

A provider is “trustworthy” when the _payment-related invariants_ are stable:

1. **Identity & attestation**

- Provider is cryptographically identifiable (A2A auth / signatures)
- Endpoint is stable (no sudden domain changes)

2. **Payment invariants** _(highest weight)_

- Recipient address stability (recipient does not unexpectedly change)
- Token + chain stability (e.g., USDC on Base Sepolia)
- Price stability (no sudden spikes)

3. **Behavioral history (local + on-chain)**

- Successful purchase count
- Failure / rejection events count
- Time since first seen

4. **Anomaly flags (negative features)**

- First-seen recipient
- Amount exceeds typical range
- Endpoint mismatch / suspicious redirect

---

## Feature set (v1)

The following features are **machine-verifiable** and do not require human review.

### Positive features

- `success_count`: number of successful verified purchases
- `first_seen_days`: days since provider first appeared
- `recipient_stability`: (1 - recipient_changed_count / total_purchases)

### Negative features

- `recipient_changed_count`: number of times payment recipient changed
- `anomaly_amount_count`: number of times amount exceeded threshold vs historical median
- `reject_count`: firewall rejections (or policy blocks)
- `endpoint_changed_count`: provider endpoint changes

---

## Scoring method (explainable)

Start with an explainable linear model (weights can be tuned later):

```
score = clamp(0, 100,
  base
  + w_success * log1p(success_count)
  + w_age * log1p(first_seen_days)
  + w_recipient_stable * recipient_stability
  - w_recipient_change * recipient_changed_count
  - w_reject * reject_count
  - w_anomaly_amount * anomaly_amount_count
  - w_endpoint_change * endpoint_changed_count
)
```

### Why linear first?

- Easy to implement
- Easy to reason about
- Easy to explain to judges (and to agents)

Later versions can learn weights or move to probabilistic models, but **the UI must stay explainable**.

---

## How it is used by the Firewall

**Important:** we do not “block because score is low” by itself.

- **REJECT** is driven by hard rules:
  - denylist match
  - recipient not in provider registry / mismatch
  - token/chain mismatch
  - spend limit exceeded

- **WARNING** is driven by:
  - low trust score, _plus_
  - explainable reasons (e.g., first-seen recipient, price spike)

- **APPROVED** when:
  - hard rules pass, and
  - anomalies are absent or acceptable

The output must always include **3-line reasons** (human-readable) and **next action guidance**.

---

## What “Trust score” means (for UI)

When a user sees “Trust 78/100”, the UI should provide an explanation such as:

- “12 successful purchases”
- “Recipient address stable”
- “No recent anomalies”

And when low:

- “First-time provider”
- “Recipient has changed recently”
- “Price spike vs history”

---

## Future direction: on-chain trust & invariants

The long-term “native” version of this is to move key invariants and attestations to smart contracts:

- Provider registry contract: maps provider identity → allowed recipient(s)
- Signed price quotes / capability tokens
- On-chain counters (success/fail) and slashing hooks (optional)

This reduces reliance on centralized databases and makes trust signals composable for many agents.
