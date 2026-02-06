# Examples

## minimal-integration.ts

This is the simplest "how do I integrate ZeroKey into my product?" example.

It shows an API-first integration (no Marketplace UI):

1. `pay.request` (get payment instructions)
2. `firewall.check` (execution gate)
3. (optional) send USDC
4. `pay.submit` (receipt verify + proof)

Run it with `tsx` from the backend package:

```bash
ZK_API_BASE=https://zerokey.exe.xyz:8000 \
SERVICE_ID=image-pack-001 \
AMOUNT_USDC=0.01 \
DRY_RUN=true \
pnpm -C packages/backend tsx ../../examples/minimal-integration.ts
```

To execute a real transfer on Base Sepolia USDC:

```bash
ZK_API_BASE=https://zerokey.exe.xyz:8000 \
SERVICE_ID=image-pack-001 \
AMOUNT_USDC=0.01 \
DRY_RUN=false \
PRIVATE_KEY=0x... \
RPC_URL=https://sepolia.base.org \
pnpm -C packages/backend tsx ../../examples/minimal-integration.ts
```

If you want to keep it "no-keys" but still demonstrate the integration path, provide a previously known txHash:

```bash
ZK_API_BASE=https://zerokey.exe.xyz:8000 \
SERVICE_ID=image-pack-001 \
AMOUNT_USDC=0.01 \
DRY_RUN=true \
TX_HASH=0x... \
pnpm -C packages/backend tsx ../../examples/minimal-integration.ts
```
