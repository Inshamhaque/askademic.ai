#!/bin/bash

echo "🧪 Testing Askademic Research API"
echo "=================================="

# Base URL
BASE_URL="http://localhost:8080"

# Test health check
echo "1. Health Check:"
curl -s "$BASE_URL/health" | jq .
echo ""

# Start research
echo "2. Starting Research:"
RESPONSE=$(curl -s -X POST "$BASE_URL/research/initiate" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Benefits of renewable energy",
    "depth": "deep"
  }')

echo "$RESPONSE" | jq .

# Extract session ID
SESSION_ID=$(echo "$RESPONSE" | jq -r '.sessionId')
echo "Session ID: $SESSION_ID"
echo ""

# Wait a moment for processing
echo "3. Waiting for processing..."
sleep 5

# Check status
echo "4. Research Status:"
curl -s "$BASE_URL/research/status/$SESSION_ID" | jq .
echo ""

# Get report
echo "5. Research Report:"
curl -s "$BASE_URL/research/report/$SESSION_ID" | jq .
echo ""

# Get sources
echo "6. Research Sources:"
curl -s "$BASE_URL/research/sources/$SESSION_ID" | jq .
echo ""

# Get agent logs
echo "7. Agent Logs:"
curl -s "$BASE_URL/research/logs/$SESSION_ID" | jq .
echo ""

echo "✅ API Test Complete!"
