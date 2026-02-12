# Wallet-Enforced Guard Demo (60 seconds)

Goal: prove **agents don't choose security** — the **wallet enforces** the recipient.

## What this demo shows

- An agent (or attacker) tries to send **USDC** to the wrong recipient.
- The Safe transaction **reverts on-chain** with `RecipientMismatch(expected, got)`.
- Sending to the correct recipient succeeds and produces a **txHash**.

## One-line script (for subtitles)

> Agents don't choose security. The wallet enforces the recipient.

## Prereqs

- Base Sepolia Safe (or any Safe on a supported chain)
- Base Sepolia USDC token address (demo): `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- A funded deployer EOA (gas)

## Run (deploy guard)

Create `.env` at repo root (or export env vars):

```bash
# Foundry deploy key (as uint) - do NOT commit
PRIVATE_KEY=...

# Base Sepolia USDC
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# optional: restrict guard to a single Safe
SAFE_ADDRESS=0xYourSafe

# the only allowed recipient for USDC transfers
EXPECTED_RECIPIENT=0xExpected
```

Deploy:

```bash
make guard-demo
```

## Manual steps (Safe UI)

1) In Safe UI, set Guard = deployed `RecipientInvariantGuard` address.
2) Try USDC transfer **to a wrong address** → should revert.
3) Try USDC transfer **to EXPECTED_RECIPIENT** → should succeed and show txHash.

## What to capture on video

- Revert on the wrong-recipient tx (show the revert reason)
- Success txHash on the correct-recipient tx
