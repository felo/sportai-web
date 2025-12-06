#!/bin/bash

# Script to find the top 20 files by lines of code
# Usage: ./scripts/top-files-by-loc.sh [number]
# Example: ./scripts/top-files-by-loc.sh 30  (shows top 30 files)

cd "$(dirname "$0")/.." || exit 1

COUNT=${1:-20}

echo "📊 Top $COUNT files by lines of code"
echo "======================================"
echo ""

wc -l $(git ls-files '*.ts' '*.tsx' '*.js' '*.jsx' '*.css') 2>/dev/null | sort -rn | head -$((COUNT + 1))

echo ""
echo "✅ Done!"

