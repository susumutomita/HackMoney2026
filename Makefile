.PHONY: deps demo demo-local demo-hosted backend

# Load .env if it exists (so `make demo` works without manual export)
ifneq (,$(wildcard .env))
	include .env
	export
endif

# Simple, memorable entrypoints for live judging / teammates.
# Requires pnpm installed.

# Install dependencies (safe to run repeatedly)
deps:
	pnpm -s install

# Start backend locally
backend: deps
	cd packages/backend && pnpm dev

# Runs the swarm demo against a locally running backend on :3001.
# In another terminal, run: make backend

demo-local: deps
	@if [ -z "$$PRIVATE_KEY" ]; then \
		echo "Missing PRIVATE_KEY. Set it in .env or:"; \
		echo "  PRIVATE_KEY=0x... make demo-local"; \
		exit 1; \
	fi
	NEXT_PUBLIC_API_URL=http://localhost:3001 \
	PRIVATE_KEY=$$PRIVATE_KEY \
	pnpm -C packages/backend tsx ../../scripts/swarm-demo.ts

# Runs the swarm demo against the hosted demo backend.

demo-hosted: deps
	@if [ -z "$$PRIVATE_KEY" ]; then \
		echo "Missing PRIVATE_KEY. Set it in .env or:"; \
		echo "  PRIVATE_KEY=0x... make demo-hosted"; \
		exit 1; \
	fi
	NEXT_PUBLIC_API_URL=https://zerokey.exe.xyz:8000 \
	PRIVATE_KEY=$$PRIVATE_KEY \
	pnpm -C packages/backend tsx ../../scripts/swarm-demo.ts

# Default: hosted (no local backend required)
demo: demo-hosted

# Agent demos (uses Claude API via OAuth token)

agent-demo:
	cd packages/backend && pnpm tsx ../../scripts/agent-demo.ts

agent-demo-blocked:
	cd packages/backend && pnpm tsx ../../scripts/agent-demo-blocked.ts
