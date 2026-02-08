# Circle Gateway (Arc) setup

This repo can optionally integrate with **Circle Gateway** to demonstrate
**chain-abstracted USDC** with **Arc as a liquidity hub**.

## 1) Create API key

Create a Circle API key in the Circle Developer Console.
Use **Sandbox** for demo/dev.

## 2) Configure backend env

Create `packages/backend/.env` (do not commit) and add:

```bash
# Circle
CIRCLE_ENV=sandbox
CIRCLE_API_KEY=TEST_API_KEY:...:...
# Optional override
# CIRCLE_API_BASE_URL=https://api-sandbox.circle.com
```

## 3) Verify connectivity

Start the backend and call:

```bash
curl -s http://localhost:3001/api/gateway/balances \
  -H 'content-type: application/json' \
  -d '{"token":"USDC","sources":[{"depositor":"0xYOUR_ADDRESS","domain":26}]}'
```

Notes:

- You must **deposit** USDC into the Gateway Wallet contract first for balances
  to become available.
- Domains: see Circle docs (Arc testnet domain=26, Base Sepolia domain=6).

## Security

Never paste API keys in public channels.
If a key leaks, **revoke & rotate immediately**.
