#!/bin/bash
echo "🔄 Restoring configuration from backup..."

# Restore git state
if [ -f "git-commit.txt" ]; then
    COMMIT=$(cat git-commit.txt)
    echo "🔄 Reverting to commit: $COMMIT"
    git checkout $COMMIT
fi

# Restore environment files
if [ -f "frontend.env" ]; then
    cp frontend.env ../.env
    echo "✅ Restored frontend environment"
fi

if [ -f "backend.env" ]; then
    cp backend.env ../backend/.env
    echo "✅ Restored backend environment"
fi

echo "🎉 Configuration restored!"
echo "📋 Check environment-variables.md for manual steps"
