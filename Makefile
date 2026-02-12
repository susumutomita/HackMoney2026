.PHONY: help install build test lint format typecheck dev backend frontend demo demo-local demo-hosted agent-demo agent-demo-blocked guard-demo

# Load .env if exists
ifneq (,$(wildcard .env))
    include .env
    export
endif

# Default target: show help
help:
	@echo ""
	@echo "🔐 ZeroKey Treasury - Demo Commands"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🤖 AGENT DEMOS (Real AI making payment decisions)"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "  agent-demo          Full agent flow:"
	@echo "                      1. Agent discovers providers"
	@echo "                      2. Evaluates trust scores (Claude API)"
	@echo "                      3. Decides to buy or skip"
	@echo "                      4. Firewall validates"
	@echo "                      5. USDC payment + txHash proof"
	@echo ""
	@echo "  agent-demo-blocked  Shows firewall blocking scam:"
	@echo "                      Agent tries CheapTranslate (Trust: 0)"
	@echo "                      → REJECTED, money never moved"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🔄 SWARM DEMO (3 scenarios in one command)"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "  demo                Run all 3 scenarios:"
	@echo "                      1. REJECTED (scam blocked)"
	@echo "                      2. APPROVED (trusted provider)"
	@echo "                      3. APPROVED + txHash proof"
	@echo ""
	@echo "  demo-hosted         Same but against hosted backend"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🛠️  DEVELOPMENT"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "  dev                 Start backend + frontend"
	@echo "  backend             Start backend server (port 3001)"
	@echo "  frontend            Start frontend (port 8000)"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "📦 BUILD & TEST"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "  install             Install dependencies (pnpm)"
	@echo "  build               Build all packages"
	@echo "  test                Run all tests"
	@echo "  lint                Run ESLint"
	@echo "  format              Run Prettier"
	@echo "  typecheck           Run TypeScript checks"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🌐 URLS"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "  Frontend:  https://zerokey.exe.xyz:8000"
	@echo "  API:       https://zerokey.exe.xyz:8000/api"
	@echo "  Dashboard: https://zerokey.exe.xyz:8000/dashboard"
	@echo ""

# Start backend
backend:
	cd packages/backend && pnpm dev

# Start frontend
frontend:
	cd packages/frontend && PORT=8000 pnpm dev

# Start both backend and frontend (for local development)
dev:
	@echo "Starting backend on port 3001..."
	@cd packages/backend && pnpm dev &
	@sleep 2
	@echo "Starting frontend on port 8000..."
	@cd packages/frontend && PORT=8000 pnpm dev

# Swarm demo (3 scenarios)
demo: demo-local

demo-local:
	@if [ -z "$$PRIVATE_KEY" ]; then \
		echo "Missing PRIVATE_KEY. Set in .env or:"; \
		echo "  PRIVATE_KEY=0x... make demo-local"; \
		exit 1; \
	fi
	cd packages/backend && NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm tsx ../../scripts/swarm-demo.ts

demo-hosted:
	@if [ -z "$$PRIVATE_KEY" ]; then \
		echo "Missing PRIVATE_KEY. Set in .env or:"; \
		echo "  PRIVATE_KEY=0x... make demo-hosted"; \
		exit 1; \
	fi
	cd packages/backend && NEXT_PUBLIC_API_URL=https://zerokey.exe.xyz:8000 pnpm tsx ../../scripts/swarm-demo.ts

# ENS Integration Demo (for ENS Prize)
ens-demo:
	cd packages/backend && pnpm tsx ../../scripts/ens-demo.ts

# Agent demos (uses Claude API via OAuth token)
agent-demo:
	cd packages/backend && pnpm tsx ../../scripts/agent-demo.ts

agent-demo-blocked:
	cd packages/backend && pnpm tsx ../../scripts/agent-demo-blocked.ts

# Wallet-enforced guard demo (deploy Safe guard contract)
# Requires Foundry installed.
# Env (examples):
#   PRIVATE_KEY=<uint> USDC_ADDRESS=0x... EXPECTED_RECIPIENT=0x... SAFE_ADDRESS=0xYourSafe
#
# Deploys: packages/contracts/script/DeployRecipientInvariantGuard.s.sol

guard-demo:
	@echo "Deploying RecipientInvariantGuard (Safe Guard)..."
	@echo "Required env: PRIVATE_KEY (uint), USDC_ADDRESS, EXPECTED_RECIPIENT"
	@echo "Optional env: SAFE_ADDRESS (defaults to 0x0 = any Safe)"
	cd packages/contracts && forge script script/DeployRecipientInvariantGuard.s.sol:DeployRecipientInvariantGuardScript \
		--rpc-url $${RPC_URL:-$${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}} \
		--broadcast \
		--legacy
	@echo "\nNext (Safe UI): set Guard to the deployed address, then try USDC transfer to wrong recipient (revert) and to EXPECTED_RECIPIENT (success)."
	@echo "See docs/GUARD_DEMO.md"

export_pdf:        # Export pitch deck to PDF using Marp
	npx marp pitch_deck.md --pdf --allow-local-files --html

# Build & Test
install:
	pnpm install

build:
	pnpm build

test:
	pnpm test

lint:
	pnpm lint

format:
	pnpm format

typecheck:
	pnpm typecheck
