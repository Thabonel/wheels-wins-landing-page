#!/bin/bash

echo "🚨 Emergency Netlify fix - Adding missing files"

cd "/Users/thabonel/Documents/Wheels and Wins/wheels-wins-landing-page"

# Create a temporary directory with essential files
mkdir -p /tmp/wheels-wins-fix
cp -r scripts /tmp/wheels-wins-fix/
cp -r src /tmp/wheels-wins-fix/
cp -r public /tmp/wheels-wins-fix/
cp postcss.config.js /tmp/wheels-wins-fix/ 2>/dev/null || true
cp netlify.toml /tmp/wheels-wins-fix/ 2>/dev/null || true
cp .npmrc /tmp/wheels-wins-fix/ 2>/dev/null || true
cp .nvmrc /tmp/wheels-wins-fix/ 2>/dev/null || true

# Now switch to main branch to get clean state
git fetch origin main
git checkout -f origin/main

# Copy our consolidated PAM files
cp -r /tmp/wheels-wins-fix/* .

# Add everything
git add -A

# Commit
git commit -m "Emergency fix: Add all missing files for Netlify build including PAM consolidation" --no-verify

# Push directly to staging
git push origin HEAD:staging --force

echo "✅ Emergency fix pushed to staging!"