#!/bin/bash
#
# Rate Limiting Test Script
# Tests that API rate limiting is working correctly
#
# Usage: ./test-rate-limit.sh [BASE_URL]
# Example: ./test-rate-limit.sh http://localhost:3000
#

BASE_URL="${1:-http://localhost:3000}"
TIMEOUT=5

echo "========================================"
echo "Rate Limiting Test"
echo "========================================"
echo "Testing against: $BASE_URL"
echo ""

# Colors for output
if [ -t 1 ] && [ -z "$CI" ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    CYAN='\033[0;36m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    CYAN=''
    NC=''
fi

echo -e "${CYAN}Test 1: Check rate limit headers are returned${NC}"
echo "----------------------------------------"

response=$(curl -s -i --max-time $TIMEOUT "$BASE_URL/api/tasks" 2>/dev/null)
status=$(echo "$response" | grep -i "^HTTP" | tail -1 | awk '{print $2}')

# Look for rate limit headers
rate_limit=$(echo "$response" | grep -i "X-RateLimit-Limit" | head -1)
rate_remaining=$(echo "$response" | grep -i "X-RateLimit-Remaining" | head -1)
rate_reset=$(echo "$response" | grep -i "X-RateLimit-Reset" | head -1)

if [ -n "$rate_limit" ]; then
    echo -e "${GREEN}✓${NC} X-RateLimit-Limit header present: $rate_limit"
else
    echo -e "${YELLOW}⚠${NC} X-RateLimit-Limit header not found (rate limiting may not be applied to unauthenticated requests)"
fi

if [ -n "$rate_remaining" ]; then
    echo -e "${GREEN}✓${NC} X-RateLimit-Remaining header present: $rate_remaining"
fi

if [ -n "$rate_reset" ]; then
    echo -e "${GREEN}✓${NC} X-RateLimit-Reset header present: $rate_reset"
fi

echo ""
echo -e "${CYAN}Test 2: Rapid request test (LLM endpoint - 15 requests)${NC}"
echo "----------------------------------------"
echo "Sending 15 rapid requests to /api/llm..."
echo "(Limit is 10 per minute for expensive tier)"
echo ""

for i in {1..15}; do
    status=$(curl -s -o /dev/null --max-time $TIMEOUT -w "%{http_code}" \
        -X POST "$BASE_URL/api/llm" \
        -H "Content-Type: multipart/form-data" \
        -F "prompt=test" 2>/dev/null || echo "000")
    
    if [ "$status" = "429" ]; then
        echo -e "${GREEN}✓${NC} Request $i: Rate limited (429) - WORKING!"
        break
    elif [ "$status" = "000" ]; then
        echo -e "${YELLOW}⚠${NC} Request $i: Connection failed"
    else
        echo -e "  Request $i: Status $status"
    fi
done

echo ""
echo -e "${CYAN}Test 3: Check 429 response format${NC}"
echo "----------------------------------------"

# Make many requests to trigger rate limit
for i in {1..12}; do
    curl -s -o /dev/null --max-time 2 -X POST "$BASE_URL/api/llm" \
        -H "Content-Type: multipart/form-data" \
        -F "prompt=test" 2>/dev/null &
done
wait

# Now get the response
response=$(curl -s --max-time $TIMEOUT -X POST "$BASE_URL/api/llm" \
    -H "Content-Type: multipart/form-data" \
    -F "prompt=test" 2>/dev/null)

if echo "$response" | grep -q "Too many requests"; then
    echo -e "${GREEN}✓${NC} 429 response contains 'Too many requests' message"
    echo "  Response: $response"
elif echo "$response" | grep -q "retryAfter"; then
    echo -e "${GREEN}✓${NC} 429 response contains retryAfter field"
    echo "  Response: $response"
else
    echo -e "${YELLOW}⚠${NC} Could not trigger rate limit or response format unexpected"
    echo "  Response: $response"
fi

echo ""
echo "========================================"
echo "Rate Limiting Test Complete"
echo "========================================"
echo ""
echo "Notes:"
echo "- In development, rate limiting uses in-memory storage"
echo "- In production with Upstash, rate limits work across serverless instances"
echo "- Rate limit tiers:"
echo "  • standard: 60 req/min (tasks GET, profile)"
echo "  • heavy: 10 req/min (LLM with video or deep thinking)"
echo "  • light: 30 req/min (LLM text-only, fast thinking - flash requests)"
echo "  • trial: 12 req/min (LLM unauthenticated, shared per IP)"
echo "  • veryExpensive: 5 req/min (task creation)"
echo ""
echo "For events with shared WiFi:"
echo "  - Signed-in users: 30 flash req/min + 10 video req/min each"
echo "  - Guest users share 12 req/min per IP"
echo ""

