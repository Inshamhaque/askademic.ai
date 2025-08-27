#!/bin/bash

echo "🧪 Testing Askademic End-to-End (Auth + Research)"
echo "==============================================="

# Requirements check
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required. Install with: brew install jq" >&2
  exit 1
fi

BASE_URL="http://localhost:8080"

# 1) Health Check
echo "1) Health Check"
curl -s "$BASE_URL/health" | jq .
echo ""

# 2) Signup (random email to avoid collisions); fallback to signin if signup fails
RAND=$RANDOM
EMAIL="tester_${RAND}@askademic.ai"
PASSWORD="testpass123"
NAME="Test User ${RAND}"

echo "2) Signup"
SIGNUP_RESP=$(curl -s -X POST "$BASE_URL/user/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
echo "$SIGNUP_RESP" | jq .

SESSION_TOKEN=$(echo "$SIGNUP_RESP" | jq -r '.sessionToken // empty')

if [ -z "$SESSION_TOKEN" ]; then
  echo "Signup did not return a session token. Trying signin..."
  SIGNIN_RESP=$(curl -s -X POST "$BASE_URL/user/signin" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
  echo "$SIGNIN_RESP" | jq .
  SESSION_TOKEN=$(echo "$SIGNIN_RESP" | jq -r '.sessionToken // empty')
fi

if [ -z "$SESSION_TOKEN" ]; then
  echo "❌ Auth failed (no session token)." >&2
  exit 1
fi

echo "Session token acquired."
AUTH_HEADER="Authorization: Bearer $SESSION_TOKEN"

echo ""

# 3) Initiate Research (authorized)
echo "3) Initiate Research"
INIT_RESP=$(curl -s -X POST "$BASE_URL/research/initiate" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "query": "Benefits of renewable energy",
    "depth": "deep"
  }')

echo "$INIT_RESP" | jq .
SESSION_ID=$(echo "$INIT_RESP" | jq -r '.sessionId // empty')

if [ -z "$SESSION_ID" ]; then
  echo "❌ initiate returned no sessionId" >&2
  exit 1
fi

echo "Session ID: $SESSION_ID"

echo ""

# 4) Poll Status until completed/failed or timeout
echo "4) Polling Status"
MAX_ATTEMPTS=30
SLEEP_SECONDS=2
ATTEMPT=0
STATUS="pending"

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  RESP=$(curl -s "$BASE_URL/research/status/$SESSION_ID" -H "$AUTH_HEADER")
  STATUS=$(echo "$RESP" | jq -r '.status // "unknown"')
  echo "Attempt $((ATTEMPT+1)) -> status: $STATUS"
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
  sleep $SLEEP_SECONDS
  ATTEMPT=$((ATTEMPT+1))
done

echo "Final status: $STATUS"

# 5) Fetch Report
echo ""
echo "5) Report"
curl -s "$BASE_URL/research/report/$SESSION_ID" -H "$AUTH_HEADER" | jq .

# 6) Fetch Sources
echo ""
echo "6) Sources"
curl -s "$BASE_URL/research/sources/$SESSION_ID" -H "$AUTH_HEADER" | jq .

# 7) Fetch Logs
echo ""
echo "7) Logs"
curl -s "$BASE_URL/research/logs/$SESSION_ID" -H "$AUTH_HEADER" | jq .

echo ""
echo "✅ End-to-End API Test Complete"
