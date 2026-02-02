# UX Evaluation Scenarios (Must-run)

These scenarios are designed to be executed by someone who did **not** build the feature.

Goal: catch developer bias early by verifying that a real user can land, understand the value, and complete the key flow.

Target URL (prod/staging):

- `https://zerokey.exe.xyz:8000/`

---

## Setup (before you start)

- Prefer **incognito/private mode**.
- Prefer **mobile 4G/5G** (Wi‑Fi off) for a true “real user” network.
- If you have a wallet, test both:
  - wallet connected
  - wallet not connected

Record:

- device + browser
- whether wallet installed

---

## Scenario A — Landing → Value comprehension (<= 60s)

**Purpose**: a first-time user understands what this is and what to do next.

Steps:

1. Open the landing page.
2. Do not click for 10 seconds.
3. In your own words, write 1 sentence: “This product is …”
4. Decide the next click.

Observe:

- Do you hesitate? Where? (headline? CTA? navigation?)

Pass criteria:

- Within 30 seconds, you can confidently choose a next action.

---

## Scenario B — Tutorial path (<= 3 min)

**Purpose**: tutorial actually leads to action.

Steps:

1. From the landing page, click **Tutorial**.
2. Follow the page instructions.
3. Navigate to **Marketplace** from the tutorial.

Observe:

- Too much reading vs action?
- Does it tell you exactly what to do next?

Pass criteria:

- You can reach Marketplace and know what to do next.

---

## Scenario C — Marketplace → choose a provider (<= 2 min)

**Purpose**: provider selection is intuitive.

Steps:

1. Open Marketplace.
2. Choose one provider.
3. Write why you chose it (price? trust score? service type?).
4. Proceed to negotiation.

Observe:

- Do you understand what “trust score” means? (It is an explainable _payment predictability_ score; see `docs/TRUST_SCORE_MODEL.md`.)

Pass criteria:

- You can pick a provider within 60 seconds.

---

## Scenario D — Negotiate → Firewall → Pay (<= 8 min)

**Purpose**: the critical flow works and feels safe.

Steps:

1. Start negotiation.
2. If asked to connect a wallet:
   - with wallet: connect
   - without wallet: observe how you are guided
3. Send an offer or accept.
4. Run firewall check.
5. Observe the decision: APPROVED / WARNING / REJECTED.
6. Try to proceed to Pay.

Observe:

- Do you know what’s happening at each step?
- If Pay is disabled, do you see a human-readable reason?
- Are errors shown as developer codes (e.g. `invalid_signature`), or as user-friendly guidance?
- Is there a final “confirmation” that clearly shows:
  - recipient
  - amount
  - chain
  - the firewall rationale summary

Pass criteria:

- APPROVED → you can reach payment execution flow.
- WARNING/REJECTED → you know exactly what to do next.

---

## Scenario E — Dashboard (optional, <= 2 min)

**Purpose**: users can review what happened.

Steps:

1. Open Dashboard.
2. Find **Agent Purchase Log**.
3. Verify that a completed purchase appears with:
   - txHash (short)
   - amount (USDC)
   - provider
   - firewall decision + reason

Pass criteria:

- You can answer: “what happened, when, and why did the firewall approve/reject?”
- There is visible proof the agent paid (txHash) and why it was allowed.

---

## Required output (paste into the issue/PR)

- Top 3 confusion points (with URL + screenshot if possible)
- Top 3 “fear moments” (what felt risky/unclear)
- **If you could fix only one thing, what would it be?**
- Overall score (1–10) and why
