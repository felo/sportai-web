#!/bin/bash

# Test CORS configuration for a given URL
# Usage: ./scripts/test-cors.sh [URL] [ORIGIN]

URL="${1:-https://sportai-llm-uploads-public.s3.eu-north-1.amazonaws.com/samples/technique-analysis-serve-sample.mp4}"
ORIGIN="${2:-http://localhost:3000}"

echo "🔍 Testing CORS for:"
echo "   URL: $URL"
echo "   Origin: $ORIGIN"
echo ""

# Make a preflight OPTIONS request (what browsers do for CORS)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Preflight OPTIONS Request:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

OPTIONS_RESPONSE=$(curl -s -I -X OPTIONS \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  "$URL" 2>&1)

echo "$OPTIONS_RESPONSE"
echo ""

# Make a simple GET request with Origin header
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 GET Request with Origin header:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

GET_RESPONSE=$(curl -s -I \
  -H "Origin: $ORIGIN" \
  "$URL" 2>&1)

echo "$GET_RESPONSE"
echo ""

# Check for CORS headers
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CORS Header Analysis:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Access-Control-Allow-Origin
if echo "$GET_RESPONSE" | grep -qi "access-control-allow-origin"; then
  ACAO=$(echo "$GET_RESPONSE" | grep -i "access-control-allow-origin")
  echo "✓ Access-Control-Allow-Origin: FOUND"
  echo "  $ACAO"
else
  echo "✗ Access-Control-Allow-Origin: MISSING"
  echo "  ⚠️  This header is required for CORS to work!"
fi

# Check Access-Control-Allow-Methods
if echo "$OPTIONS_RESPONSE" | grep -qi "access-control-allow-methods"; then
  ACAM=$(echo "$OPTIONS_RESPONSE" | grep -i "access-control-allow-methods")
  echo "✓ Access-Control-Allow-Methods: FOUND"
  echo "  $ACAM"
else
  echo "○ Access-Control-Allow-Methods: Not in response (may be OK for simple requests)"
fi

# Check Access-Control-Allow-Headers
if echo "$OPTIONS_RESPONSE" | grep -qi "access-control-allow-headers"; then
  ACAH=$(echo "$OPTIONS_RESPONSE" | grep -i "access-control-allow-headers")
  echo "✓ Access-Control-Allow-Headers: FOUND"
  echo "  $ACAH"
else
  echo "○ Access-Control-Allow-Headers: Not in response (may be OK)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if echo "$GET_RESPONSE" | grep -qi "access-control-allow-origin"; then
  echo "🎉 CORS appears to be configured!"
  echo ""
  echo "If thumbnails still don't work, try:"
  echo "  1. Hard refresh the browser (Cmd+Shift+R)"
  echo "  2. Clear browser cache"
  echo "  3. Check browser console for specific errors"
else
  echo "❌ CORS is NOT configured or not working properly."
  echo ""
  echo "To fix, add this CORS configuration to your S3 bucket:"
  echo ""
  cat << 'EOF'
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
EOF
fi
