#!/bin/bash

# Quick E2E test script for fast validation
# Only runs tests that don't require authentication

echo "🚀 Running Quick E2E Tests (No Auth Required)"
echo "=============================================="
echo ""

# Run only tests that work without authentication
npx playwright test \
  --project=chromium \
  --grep="未認証でダッシュボードアクセス試行" \
  --reporter=list \
  --timeout=30000 \
  --max-failures=1

echo ""
echo "✅ Quick tests completed!"
