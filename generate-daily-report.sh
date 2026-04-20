#!/bin/bash

set -e

echo "=== BuilderPulse Daily Report Generator ==="
echo "Step 1: Fetching data from multiple sources..."

cd /Users/jie/code/BuilderPulse
node scripts/fetch-data.js

echo ""
echo "Step 2: Generating reports..."
node scripts/generate-report.js

echo ""
echo "Step 3: Committing to git..."
TODAY=$(date +%Y-%m-%d)
git add "en/2026/${TODAY}.md" "zh/2026/${TODAY}.md" data/raw-data.json
git commit -m "Daily: ${TODAY} - multi-source data"
git push origin main

echo ""
echo "=== Done! ==="
echo "Reports saved to:"
echo "  en/2026/${TODAY}.md"
echo "  zh/2026/${TODAY}.md"