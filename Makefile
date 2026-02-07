.PHONY: demo demo-local demo-hosted backend

# Load .env if exists
ifneq (,$(wildcard .env))
    include .env
    export
endif

# Simple, memorable entrypoints for live judging / teammates.
# Requires pnpm installed.

backend:
	cd packages/backend && pnpm dev

# Runs the swarm demo against a locally running backend on :3001.
# In another terminal, run: make backend
# Usage: make demo-local

demo-local:
	@if [ -z "$$PRIVATE_KEY" ]; then \
		echo "Missing PRIVATE_KEY. Set in .env or:"; \
		echo "  PRIVATE_KEY=0x... make demo-local"; \
		exit 1; \
	fi
	cd packages/backend && NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm tsx ../../scripts/swarm-demo.ts

# Runs the swarm demo against the hosted demo backend.
# Usage: make demo-hosted

demo-hosted:
	@if [ -z "$$PRIVATE_KEY" ]; then \
		echo "Missing PRIVATE_KEY. Set in .env or:"; \
		echo "  PRIVATE_KEY=0x... make demo-hosted"; \
		exit 1; \
	fi
	cd packages/backend && NEXT_PUBLIC_API_URL=https://zerokey.exe.xyz:8000 pnpm tsx ../../scripts/swarm-demo.ts

# Default: local (backend must be running)

demo: demo-local
