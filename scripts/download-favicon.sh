#!/bin/bash

# Download favicon from a website
# Usage: ./download-favicon.sh <url> [output_filename]

if [ -z "$1" ]; then
    echo "Usage: $0 <url> [output_filename]"
    echo "Example: $0 https://example.com favicon.png"
    exit 1
fi

URL="$1"
OUTPUT="${2:-favicon}"

# Extract domain from URL
DOMAIN=$(echo "$URL" | sed -E 's|^https?://||' | sed -E 's|/.*$||')
BASE_URL="https://$DOMAIN"

echo "🔍 Looking for favicon at: $DOMAIN"

# Function to download a file
download_file() {
    local url="$1"
    local output="$2"
    
    if curl -sL -o "$output" -w "%{http_code}" "$url" | grep -q "200"; then
        # Check if file has content
        if [ -s "$output" ]; then
            return 0
        fi
    fi
    rm -f "$output"
    return 1
}

# Function to get file extension from URL or content-type
get_extension() {
    local url="$1"
    
    # Try to get extension from URL
    ext=$(echo "$url" | sed -E 's/.*\.([a-zA-Z0-9]+)(\?.*)?$/\1/' | tr '[:upper:]' '[:lower:]')
    
    case "$ext" in
        ico|png|jpg|jpeg|gif|svg|webp)
            echo "$ext"
            return
            ;;
    esac
    
    # Default to ico
    echo "ico"
}

# Method 1: Try /favicon.ico directly
echo "📥 Trying $BASE_URL/favicon.ico..."
if download_file "$BASE_URL/favicon.ico" "${OUTPUT}.ico"; then
    echo "✅ Downloaded favicon to ${OUTPUT}.ico"
    exit 0
fi

# Method 2: Parse HTML for link tags
echo "📄 Parsing HTML for favicon links..."
HTML=$(curl -sL "$BASE_URL" 2>/dev/null || true)

# Look for various favicon link patterns - handle both single and double quotes
FAVICON_URLS=$(echo "$HTML" | tr '\n' ' ' | grep -oE '<link[^>]*(icon|shortcut icon|apple-touch-icon)[^>]*>' 2>/dev/null | grep -oE 'href=['"'"'"][^'"'"'"]+['"'"'"]' 2>/dev/null | sed 's/href=["'"'"']//;s/["'"'"']$//' | head -5 || true)

if [ -n "$FAVICON_URLS" ]; then
    for FAVICON_URL in $FAVICON_URLS; do
        # Handle relative URLs
        if [[ "$FAVICON_URL" == //* ]]; then
            FAVICON_URL="https:$FAVICON_URL"
        elif [[ "$FAVICON_URL" == /* ]]; then
            FAVICON_URL="$BASE_URL$FAVICON_URL"
        elif [[ ! "$FAVICON_URL" == http* ]]; then
            FAVICON_URL="$BASE_URL/$FAVICON_URL"
        fi
        
        EXT=$(get_extension "$FAVICON_URL")
        echo "📥 Trying $FAVICON_URL..."
        
        if download_file "$FAVICON_URL" "${OUTPUT}.${EXT}"; then
            echo "✅ Downloaded favicon to ${OUTPUT}.${EXT}"
            exit 0
        fi
    done
fi

# Method 3: Try common favicon paths
COMMON_PATHS=(
    "/apple-touch-icon.png"
    "/apple-touch-icon-precomposed.png"
    "/favicon-32x32.png"
    "/favicon-16x16.png"
    "/icon.png"
    "/icon.svg"
)

for path in "${COMMON_PATHS[@]}"; do
    echo "📥 Trying $BASE_URL$path..."
    EXT=$(get_extension "$path")
    if download_file "$BASE_URL$path" "${OUTPUT}.${EXT}"; then
        echo "✅ Downloaded favicon to ${OUTPUT}.${EXT}"
        exit 0
    fi
done

# Method 4: Use Google's favicon service as fallback
echo "📥 Trying Google's favicon service..."
GOOGLE_URL="https://www.google.com/s2/favicons?domain=$DOMAIN&sz=128"
if download_file "$GOOGLE_URL" "${OUTPUT}.png"; then
    echo "✅ Downloaded favicon via Google to ${OUTPUT}.png"
    exit 0
fi

# Method 5: Try DuckDuckGo's favicon service
echo "📥 Trying DuckDuckGo's favicon service..."
DDG_URL="https://icons.duckduckgo.com/ip3/$DOMAIN.ico"
if download_file "$DDG_URL" "${OUTPUT}.ico"; then
    echo "✅ Downloaded favicon via DuckDuckGo to ${OUTPUT}.ico"
    exit 0
fi

echo "❌ Could not find favicon for $DOMAIN"
exit 1

