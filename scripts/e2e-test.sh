#!/bin/bash
# ZeroKey Treasury E2E Test Script
# Run: ./scripts/e2e-test.sh

# Don't use set -e because we handle errors manually

API_URL="${API_URL:-http://localhost:3001}"
PASSED=0
FAILED=0

echo "========================================"
echo "ZeroKey Treasury E2E Tests"
echo "API: $API_URL"
echo "========================================"
echo ""

# Helper functions
pass() {
  echo "✅ PASS: $1"
  ((PASSED++))
}

fail() {
  echo "❌ FAIL: $1"
  echo "   Expected: $2"
  echo "   Got: $3"
  ((FAILED++))
}

test_json() {
  local name="$1"
  local response="$2"
  local jq_filter="$3"
  local expected="$4"
  
  local actual=$(echo "$response" | jq -r "$jq_filter" 2>/dev/null)
  
  if [ "$actual" == "$expected" ]; then
    pass "$name"
  else
    fail "$name" "$expected" "$actual"
  fi
}

test_contains() {
  local name="$1"
  local response="$2"
  local pattern="$3"
  
  if [[ "$response" == *"$pattern"* ]]; then
    pass "$name"
  else
    fail "$name" "contains '$pattern'" "not found"
  fi
}

test_status() {
  local name="$1"
  local status="$2"
  local expected="$3"
  
  if [ "$status" == "$expected" ]; then
    pass "$name"
  else
    fail "$name" "HTTP $expected" "HTTP $status"
  fi
}

echo "=== Scenario 1: Health Check ==="
RESPONSE=$(curl -s "$API_URL/health")
test_json "Health status is healthy" "$RESPONSE" ".status" "healthy"
test_contains "Health has version" "$RESPONSE" "version"
echo ""

echo "=== Scenario 2: Provider Discovery ==="
RESPONSE=$(curl -s "$API_URL/api/a2a/discover?service=translation")
test_json "Discovery success" "$RESPONSE" ".success" "true"
test_json "Has results" "$RESPONSE" '.results | length > 0' "true"
test_contains "Has TranslateAI Pro" "$RESPONSE" "TranslateAI Pro"
test_contains "Has CheapTranslate" "$RESPONSE" "CheapTranslate"
echo ""

echo "=== Scenario 3: Provider Details ==="
RESPONSE=$(curl -s "$API_URL/api/a2a/provider/translate-ai-001")
test_json "Provider lookup success" "$RESPONSE" ".success" "true"
test_json "Provider trust score >= 70" "$RESPONSE" '.provider.trustScore >= 70' "true"
echo ""

echo "=== Scenario 4: Start Negotiation ==="
RESPONSE=$(curl -s -X POST "$API_URL/api/a2a/negotiate" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "0x1234567890abcdef1234567890abcdef12345678",
    "providerId": "translate-ai-001",
    "service": "translation",
    "initialOffer": "0.028"
  }')
test_json "Negotiation start success" "$RESPONSE" ".success" "true"
SESSION_ID=$(echo "$RESPONSE" | jq -r '.session.id')
if [ "$SESSION_ID" != "null" ] && [ -n "$SESSION_ID" ]; then
  pass "Session ID returned: $SESSION_ID"
else
  fail "Session ID returned" "valid id" "null"
fi
echo ""

echo "=== Scenario 5: Send Offer ==="
if [ "$SESSION_ID" != "null" ] && [ -n "$SESSION_ID" ]; then
  RESPONSE=$(curl -s -X POST "$API_URL/api/a2a/negotiate/$SESSION_ID/offer" \
    -H "Content-Type: application/json" \
    -d '{"amount": "0.028", "type": "offer"}')
  test_json "Offer success" "$RESPONSE" ".success" "true"
  # 0.028 >= 0.03 * 0.9 = 0.027, so should be accepted
  test_json "Offer accepted" "$RESPONSE" ".response.type" "accept"
else
  fail "Send Offer" "valid session" "no session"
fi
echo ""

echo "=== Scenario 6: x402 Payment Required ==="
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/provider/translate" \
  -H "Content-Type: application/json" \
  -d '{"text": "hello", "targetLanguage": "ja"}')
BODY=$(echo "$RESPONSE" | head -n -1)
STATUS=$(echo "$RESPONSE" | tail -n 1)
test_status "No payment returns 402" "$STATUS" "402"
test_contains "Has payment info" "$BODY" "Payment Required"
test_contains "Has USDC token address" "$BODY" "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
echo ""

echo "=== Scenario 7: Provider Prices ==="
RESPONSE=$(curl -s "$API_URL/api/provider/prices")
test_contains "Has translation service" "$RESPONSE" "translation"
test_contains "Has summarization service" "$RESPONSE" "summarization"
test_contains "Has USDC" "$RESPONSE" "USDC"
echo ""

echo "=== Scenario 8: Low Trust Provider Warning ==="
RESPONSE=$(curl -s -X POST "$API_URL/api/a2a/negotiate" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "0x1234567890abcdef1234567890abcdef12345678",
    "providerId": "sketchy-service-001",
    "service": "translation",
    "initialOffer": "0.005"
  }')
test_json "Low trust negotiation success" "$RESPONSE" ".success" "true"
SKETCHY_SESSION=$(echo "$RESPONSE" | jq -r '.session.id')
if [ "$SKETCHY_SESSION" != "null" ] && [ -n "$SKETCHY_SESSION" ]; then
  pass "Sketchy session created"
else
  fail "Sketchy session" "valid id" "null"
fi
echo ""

echo "========================================"
echo "Results: $PASSED passed, $FAILED failed"
echo "========================================"

if [ $FAILED -gt 0 ]; then
  exit 1
fi
exit 0
