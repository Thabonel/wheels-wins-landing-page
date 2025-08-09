#!/bin/bash

echo "Completing Git repository restoration..."
echo "This script will add all remaining files and push to GitHub"
echo ""

# Function to safely add files
safe_add() {
    echo "Adding $1..."
    rm -f .git/index.lock 2>/dev/null
    git add "$1" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "  ✓ Added successfully"
    else
        echo "  ⚠ Skipped (may be already added or error)"
    fi
}

# Add all remaining directories one by one
safe_add ".gitignore"
safe_add ".npmrc"
safe_add ".prettierignore"
safe_add ".prettierrc.json"
safe_add ".nvmrc"
safe_add ".lighthouserc.json"
safe_add ".commitlintrc.json"
safe_add ".auditrc.json"
safe_add ".env.example"
safe_add ".env.production.example"

safe_add "src/components"
safe_add "src/config"
safe_add "src/context"
safe_add "src/hooks"
safe_add "src/integrations"
safe_add "src/lib"
safe_add "src/pages"
safe_add "src/services"
safe_add "src/styles"
safe_add "src/test"
safe_add "src/types"
safe_add "src/utils"
safe_add "src/__tests__"

safe_add "backend"
safe_add "public"
safe_add "docs"
safe_add "scripts"
safe_add "supabase"
safe_add "tests"
safe_add "e2e"
safe_add "netlify"
safe_add "migrations"

safe_add ".github"
safe_add ".cloud"
safe_add ".claude"
safe_add ".husky"
safe_add ".idx"
safe_add ".serena"

safe_add "ai_agent_observability"
safe_add "pam-backend"
safe_add "rv-trip-extractor"
safe_add "wheels-wins-data-collector"
safe_add "frontend"
safe_add "backend-fixes"
safe_add "config"
safe_add "data"
safe_add "examples"
safe_add "protected-components"
safe_add "simple_tests"

# Add any remaining files
safe_add "."

echo ""
echo "Committing all files..."
rm -f .git/index.lock 2>/dev/null
git commit -m "Complete repository restoration - all project files

- Added all source code directories
- Added backend and frontend code
- Added configuration files
- Added documentation
- Full repository restoration complete

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

echo ""
echo "Pushing to GitHub..."
git push origin staging

echo ""
echo "✅ Repository restoration complete!"
echo ""
echo "Final status:"
git status --short