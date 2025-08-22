#!/bin/bash

# Deploy Backend to Render (Staging)
# This script can be used to manually trigger a deployment to Render

echo "🚀 Deploying backend to Render staging environment..."

# Check if we're on the staging branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "staging" ]; then
    echo "⚠️  Warning: You're not on the staging branch (current: $CURRENT_BRANCH)"
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes:"
    git status --short
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

# Push to staging branch
echo "📤 Pushing to staging branch..."
git push origin staging

echo "✅ Code pushed to staging branch"
echo ""
echo "🔄 Render should automatically deploy from the staging branch."
echo "   If auto-deploy is not configured, you can:"
echo "   1. Go to https://dashboard.render.com"
echo "   2. Select your pam-backend service"
echo "   3. Click 'Manual Deploy' and select the 'staging' branch"
echo ""
echo "📊 Monitor deployment at: https://dashboard.render.com/web/srv-YOUR-SERVICE-ID"
echo ""
echo "After deployment completes, check:"
echo "  - Health: https://pam-backend.onrender.com/health"
echo "  - API Docs: https://pam-backend.onrender.com/docs"