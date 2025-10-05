#!/bin/bash
# Install Security Git Hooks for Wheels & Wins

echo "🔒 Installing Security Git Hooks..."

# Create .git/hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy pre-push hook
cp scripts/pre-push-security-hook.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push

echo "✅ Pre-push security hook installed"
echo ""
echo "The hook will run automatically before every 'git push'"
echo "It checks for:"
echo "  - Hardcoded secrets and API keys"
echo "  - Build errors"
echo "  - TypeScript type errors"
echo "  - Platform-specific dependencies"
echo "  - SQL migration safety"
echo ""
echo "To bypass (NOT RECOMMENDED):"
echo "  git push --no-verify"
echo ""
echo "🎯 Ready to go! Try 'git push' to test it."
