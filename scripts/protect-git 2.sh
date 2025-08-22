#!/bin/bash

# Git Protection Script - Prevents Codespaces conflicts
# Add this to your .bashrc or .zshrc to run automatically

# Check if we're in Codespaces
if [ -n "$CODESPACES" ]; then
    echo "⚠️  Running in GitHub Codespaces environment"
    echo "📝 Setting Codespaces-specific git config..."
    
    # Use different git identity in Codespaces
    git config user.name "Thabonel (Codespaces)"
    git config user.email "codespaces@users.noreply.github.com"
    
    # Disable auto-sync
    git config codespaces.autoSync false
    
    # Add visual indicator to prompt
    export PS1="[CODESPACE] $PS1"
else
    echo "✅ Running in local environment"
    
    # Check for Codespaces artifacts
    if [ -f .git/index.lock ]; then
        echo "⚠️  Found git lock file, removing..."
        rm -f .git/index.lock
    fi
    
    # Check for stuck git processes
    if pgrep -f "git add" > /dev/null; then
        echo "⚠️  Found stuck git processes, cleaning up..."
        pkill -9 -f "git add"
        pkill -9 -f "git commit"
    fi
fi

# Always show current environment
echo "📍 Current git config:"
echo "   User: $(git config user.name)"
echo "   Email: $(git config user.email)"
echo "   Branch: $(git branch --show-current)"
echo ""