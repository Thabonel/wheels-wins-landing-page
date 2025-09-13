#!/bin/bash
# Simple check for main branch deployment

echo "🚨 PUSHING TO MAIN - QUICK CHECK:"
echo ""
echo "1. Does src/services/api.ts have:"
echo "   'https://pam-backend.onrender.com'  // Always use production backend for main"
echo ""
echo "2. Does src/services/pamConnectionService.ts prioritize production first?"
echo ""

# Quick search for staging URLs
if grep -r "wheels-wins-backend-staging" src/services/ 2>/dev/null; then
    echo "❌ FOUND STAGING URLs - FIX BEFORE PUSH"
    exit 1
else
    echo "✅ No staging URLs found"
fi

echo ""
echo "📋 READ: PUSH_TO_MAIN.md"
echo "Type 'ok' if you've checked both:"
read -r response

if [ "$response" = "ok" ]; then
    echo "✅ Proceeding with push"
else
    echo "❌ Cancelled"
    exit 1
fi