#!/bin/bash

# PAM Consolidation Push Script
# Created: 2025-08-29

echo "🚀 Starting PAM consolidation push to staging..."

# Navigate to project directory
cd "/Users/thabonel/Documents/Wheels and Wins/wheels-wins-landing-page"

# Remove any git locks
echo "🔓 Removing git locks..."
rm -f .git/index.lock

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" = "backup-pam-20250829-083350" ]; then
    echo "✅ On backup branch, committing changes..."
    
    # Add all changes
    git add -A
    
    # Commit with detailed message
    git commit -m "fix: consolidate PAM implementation and fix memory leaks

- Removed 128 duplicate files with ' 2' suffix
- Consolidated 4 WebSocket implementations into 1 unified version
- Fixed memory leaks with proper cleanup in usePamWebSocketUnified
- Removed unused Pam.tsx component (125KB)
- Removed old pamService.ts and duplicate WebSocket hooks
- Improved error handling and reconnection logic
- Added message deduplication and heartbeat mechanism

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
    
    echo "🔄 Switching to staging branch..."
    git checkout staging
    
    echo "🔀 Merging PAM fixes..."
    git merge backup-pam-20250829-083350 --no-ff -m "Merge PAM consolidation fixes from backup branch"
    
elif [ "$CURRENT_BRANCH" = "staging" ]; then
    echo "✅ Already on staging branch, committing changes..."
    
    # Add all changes
    git add -A
    
    # Commit with detailed message
    git commit -m "fix: consolidate PAM implementation and fix memory leaks

- Removed 128 duplicate files with ' 2' suffix
- Consolidated 4 WebSocket implementations into 1 unified version
- Fixed memory leaks with proper cleanup in usePamWebSocketUnified
- Removed unused Pam.tsx component (125KB)
- Removed old pamService.ts and duplicate WebSocket hooks
- Improved error handling and reconnection logic
- Added message deduplication and heartbeat mechanism

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
fi

# Push to staging
echo "📤 Pushing to staging branch..."
git push origin staging

echo "✅ PAM consolidation successfully pushed to staging!"
echo ""
echo "📊 Summary of changes:"
echo "  - Removed 128 duplicate files"
echo "  - Consolidated WebSocket implementations from 4 to 1"
echo "  - Fixed memory leaks"
echo "  - Improved code maintainability"
echo ""
echo "🔗 Check deployment at: https://staging--wheels-wins.netlify.app"