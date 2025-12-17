#!/bin/bash
#
# Security test script for JWT authentication
# Tests that the API properly rejects unauthorized requests
#
# Usage: ./test-auth-security.sh [BASE_URL]
# Example: ./test-auth-security.sh https://my-app.vercel.app
#

BASE_URL="${1:-http://localhost:3000}"
TIMEOUT=10  # seconds

echo "========================================"
echo "Security Test: JWT Authentication"
echo "========================================"
echo "Testing against: $BASE_URL"
echo ""

# Colors for output (disabled in CI for cleaner logs)
if [ -t 1 ] && [ -z "$CI" ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    NC=''
fi

passed=0
failed=0

# Wait for the server to be ready (useful for preview deployments)
wait_for_server() {
    echo "Checking if server is ready..."
    for i in {1..30}; do
        if curl -s --max-time 5 -o /dev/null -w "%{http_code}" "$BASE_URL" | grep -q "200\|301\|302"; then
            echo "Server is ready!"
            return 0
        fi
        echo "Waiting for server... (attempt $i/30)"
        sleep 2
    done
    echo "Server not ready after 60 seconds"
    return 1
}

test_endpoint() {
    local endpoint="$1"
    local method="${2:-GET}"
    local auth_header="$3"
    local expected_status="$4"
    local test_name="$5"
    
    if [ -n "$auth_header" ]; then
        status=$(curl -s --max-time $TIMEOUT -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Authorization: $auth_header" \
            -H "Content-Type: application/json" 2>/dev/null || echo "000")
    else
        status=$(curl -s --max-time $TIMEOUT -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" 2>/dev/null || echo "000")
    fi
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name (got $status)"
        ((passed++))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name (expected $expected_status, got $status)"
        ((failed++))
    fi
}

# Wait for server if testing a remote URL
if [[ "$BASE_URL" != "http://localhost"* ]]; then
    wait_for_server || exit 1
fi

echo "----------------------------------------"
echo "Test 1: No Authorization Header"
echo "----------------------------------------"
test_endpoint "/api/tasks" "GET" "" "401" "GET /api/tasks without auth"
test_endpoint "/api/profile" "GET" "" "401" "GET /api/profile without auth"

echo ""
echo "----------------------------------------"
echo "Test 2: Fake User ID (Old Vulnerability)"
echo "----------------------------------------"
test_endpoint "/api/tasks" "GET" "Bearer fake-user-id-12345" "401" "GET /api/tasks with fake user ID"
test_endpoint "/api/profile" "GET" "Bearer 550e8400-e29b-41d4-a716-446655440000" "401" "GET /api/profile with fake UUID"

echo ""
echo "----------------------------------------"
echo "Test 3: Malformed Authorization Headers"
echo "----------------------------------------"
test_endpoint "/api/tasks" "GET" "Bearer " "401" "GET /api/tasks with empty Bearer token"
test_endpoint "/api/tasks" "GET" "Basic dXNlcjpwYXNz" "401" "GET /api/tasks with Basic auth"
test_endpoint "/api/tasks" "GET" "InvalidFormat" "401" "GET /api/tasks with invalid format"

echo ""
echo "----------------------------------------"
echo "Test 4: Random Strings (Should All Fail)"
echo "----------------------------------------"
test_endpoint "/api/tasks" "GET" "Bearer $(openssl rand -hex 16)" "401" "GET /api/tasks with random hex"
test_endpoint "/api/tasks" "GET" "Bearer abc123xyz" "401" "GET /api/tasks with short string"

echo ""
echo "----------------------------------------"
echo "Test 5: SQL Injection Attempts"
echo "----------------------------------------"
test_endpoint "/api/tasks" "GET" "Bearer ' OR '1'='1" "401" "GET /api/tasks with SQL injection"
test_endpoint "/api/tasks" "GET" "Bearer '; DROP TABLE users;--" "401" "GET /api/tasks with SQL injection 2"

echo ""
echo "----------------------------------------"
echo "Test 6: Other Protected Endpoints"
echo "----------------------------------------"
test_endpoint "/api/tasks/batch" "POST" "Bearer fake-token" "401" "POST /api/tasks/batch"
test_endpoint "/api/profile/sports" "POST" "Bearer fake-token" "401" "POST /api/profile/sports"
test_endpoint "/api/profile/equipment" "POST" "Bearer fake-token" "401" "POST /api/profile/equipment"
test_endpoint "/api/profile/coach" "PUT" "Bearer fake-token" "401" "PUT /api/profile/coach"
test_endpoint "/api/profile/business" "PUT" "Bearer fake-token" "401" "PUT /api/profile/business"

echo ""
echo "========================================"
echo "RESULTS"
echo "========================================"
echo -e "Passed: ${GREEN}$passed${NC}"
echo -e "Failed: ${RED}$failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}All security tests passed!${NC}"
    echo "The API correctly rejects unauthorized requests."
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    echo "Review the failures above - these may indicate security issues."
    exit 1
fi

