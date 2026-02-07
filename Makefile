.PHONY: demo demo-local demo-hosted backend

# Simple, memorable entrypoints for live judging / teammates.
# Requires pnpm installed.

backend:
	cd packages/backend && pnpm dev

# Runs the swarm demo against a locally running backend on :3001.
# In another terminal, run: make backend
# Usage:
#   PRIVATE_KEY=0x... make demo-local

demo-local:
	@if [ -z "$$PRIVATE_KEY" ]; then \
		echo "Missing PRIVATE_KEY. Example:"; \
		echo "  PRIVATE_KEY=0x... make demo-local"; \
		exit 1; \
	fi
	NEXT_PUBLIC_API_URL=http://localhost:3001 \
	PRIVATE_KEY=$$PRIVATE_KEY \
	pnpm -C packages/backend tsx ../../scripts/swarm-demo.ts

# Runs the swarm demo against the hosted demo backend.
# Usage:
#   PRIVATE_KEY=0x... make demo-hosted

demo-hosted:
	@if [ -z "$$PRIVATE_KEY" ]; then \
		echo "Missing PRIVATE_KEY. Example:"; \
		echo "  PRIVATE_KEY=0x... make demo-hosted"; \
		exit 1; \
	fi
	NEXT_PUBLIC_API_URL=https://zerokey.exe.xyz:8000 \
	PRIVATE_KEY=$$PRIVATE_KEY \
	pnpm -C packages/backend tsx ../../scripts/swarm-demo.ts

# Default: hosted (no need to run backend locally)

demo: demo-hosted
