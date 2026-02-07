.PHONY: demo demo-local demo-hosted backend

# One-command demo entrypoint.
# Usage:
#   make demo               # defaults to hosted API unless NEXT_PUBLIC_API_URL is set
#   make demo-local         # use local backend (http://localhost:3001)
#   make demo-hosted        # use hosted backend (https://zerokey.exe.xyz:8000)
#
# Required env for full run:
#   PRIVATE_KEY=0x...  (Base Sepolia wallet with gas + USDC)
# Optional:
#   RPC_URL=...
#   AUTO_CONFIRM=true

backend:
	pnpm dev:backend

demo:
	pnpm demo

demo-local:
	NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm demo

demo-hosted:
	NEXT_PUBLIC_API_URL=https://zerokey.exe.xyz:8000 pnpm demo
