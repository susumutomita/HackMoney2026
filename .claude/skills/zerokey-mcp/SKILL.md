---
name: zerokey-mcp
description: Connect AI agents to ZeroKey Treasury for secure API payments. Provides tools for service discovery, payment execution, balance checking, and purchase history through the ZeroKey execution firewall.
---

This skill enables AI agents to interact with the ZeroKey Treasury execution firewall via MCP (Model Context Protocol). All payments go through policy checks before money moves.

## Available Tools

### zerokey_discover

Search the ZeroKey marketplace for API services.

**Parameters:**

- `service` (required): Service keyword (e.g. "translation", "image", "summarization")
- `maxPrice` (optional): Maximum price filter in USDC (e.g. "0.05")

**Example:**

```
Search for translation services under $0.05
→ zerokey_discover(service: "translation", maxPrice: "0.05")
```

### zerokey_pay

Pay a provider and execute an API service through the ZeroKey firewall.

**Parameters:**

- `providerId` (required): The provider ID to pay (from discovery results)
- `amount` (required): Payment amount in USDC (e.g. "0.03")
- `task` (required): Description of the task to execute

**Example:**

```
Pay translate-ai-001 $0.03 to translate a document
→ zerokey_pay(providerId: "translate-ai-001", amount: "0.03", task: "Translate contract to English")
```

**Firewall behavior:**

- APPROVED: Payment executes, result returned
- REJECTED: Payment blocked, reason provided (budget exceeded, low trust, restricted category)
- CONFIRM_REQUIRED: Needs human approval before proceeding

### zerokey_balance

Get the current agent's balance, daily budget, and spending status.

**No parameters required.**

### zerokey_history

List recent purchases and API calls made by this agent.

**No parameters required.**

## Setup

### 1. Generate API Key

Go to the ZeroKey dashboard `/setup` → Step 4 "Connect Agent" → API Keys tab → Generate a key.

### 2. Configure MCP Client

Add to your MCP client configuration (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "zerokey": {
      "command": "npx",
      "args": ["-y", "@zerokey/mcp-server@latest"],
      "env": {
        "ZEROKEY_API_URL": "https://zerokey.exe.xyz:8000",
        "ZEROKEY_API_KEY": "zk_your_key_here"
      }
    }
  }
}
```

### 3. Environment Variables

| Variable          | Required | Description                                               |
| ----------------- | -------- | --------------------------------------------------------- |
| `ZEROKEY_API_URL` | Yes      | Backend API URL (default: `https://zerokey.exe.xyz:8000`) |
| `ZEROKEY_API_KEY` | Yes      | Agent API key (starts with `zk_`)                         |

## Typical Agent Workflow

1. **Discover** services matching a need
2. **Evaluate** providers by trust score and price
3. **Pay** the selected provider — firewall checks happen automatically
4. **Check balance** to monitor remaining daily budget
5. **Review history** for audit trail

## Policy Enforcement

The firewall checks these policies before any payment:

| Policy                | Effect                                             |
| --------------------- | -------------------------------------------------- |
| Spending limit        | Blocks transactions exceeding per-tx or daily caps |
| Trust score threshold | Requires confirmation for low-trust providers      |
| ENS required          | Blocks payments to addresses without ENS names     |
| Category restrictions | Only allows specified service categories           |
| Rate limiting         | Prevents burst spending (10 req/min default)       |
| Recipient invariant   | Blocks if recipient doesn't match registry         |
