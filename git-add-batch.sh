#!/bin/bash

# Add files in batches to avoid timeout
echo "Adding files to Git in batches..."

# Add configuration files
echo "Adding configuration files..."
git add *.json *.md *.ts *.js *.mjs *.yml *.yaml .npmrc .env.example .gitignore 2>/dev/null

# Add documentation
echo "Adding docs..."
git add docs/ 2>/dev/null

# Add public assets
echo "Adding public assets..."
git add public/ 2>/dev/null

# Add scripts
echo "Adding scripts..."
git add scripts/ 2>/dev/null

# Add supabase
echo "Adding supabase..."
git add supabase/ 2>/dev/null

# Add backend in parts
echo "Adding backend app..."
git add backend/app/ 2>/dev/null

echo "Adding backend other files..."
git add backend/*.py backend/*.txt backend/*.md backend/*.json 2>/dev/null
git add backend/agents/ backend/alembic/ backend/tests/ 2>/dev/null

# Add other directories
echo "Adding other project directories..."
git add ai_agent_observability/ 2>/dev/null
git add pam-backend/ 2>/dev/null
git add rv-trip-extractor/ 2>/dev/null
git add wheels-wins-data-collector/ 2>/dev/null

# Add src in parts
echo "Adding src components..."
for dir in src/*/; do
  if [ -d "$dir" ]; then
    echo "  Adding $dir"
    git add "$dir" 2>/dev/null
  fi
done

echo "Adding remaining src files..."
git add src/*.* 2>/dev/null

# Add remaining root files
echo "Adding remaining root files..."
git add .cloud/ .husky/ .idx/ .serena/ 2>/dev/null
git add *.* 2>/dev/null

echo "Done! Check git status to see what was added."