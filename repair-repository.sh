#!/bin/bash

# Repository Repair Script for Wheels & Wins
# This script will create a fresh clone and preserve local changes

echo "=== Wheels & Wins Repository Repair Script ==="
echo ""

# Get the current directory
CURRENT_DIR=$(pwd)
PARENT_DIR=$(dirname "$CURRENT_DIR")
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Step 1: Creating backup of current working directory..."
cd "$PARENT_DIR"
tar -czf "wheels-wins-backup-${TIMESTAMP}.tar.gz" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='backend/__pycache__' \
    --exclude='backend/.pytest_cache' \
    --exclude='*.pyc' \
    "wheels-wins-landing-page/"
echo "✅ Backup created: wheels-wins-backup-${TIMESTAMP}.tar.gz"

echo ""
echo "Step 2: Cloning fresh repository from GitHub..."
git clone https://github.com/thabonel/wheels-wins-landing-page.git "wheels-wins-landing-page-fresh"
cd "wheels-wins-landing-page-fresh"

echo ""
echo "Step 3: Checking out staging branch..."
git checkout staging

echo ""
echo "Step 4: Copying local changes from backup..."
# Copy the restored files
cp "$CURRENT_DIR/.npmrc" .
cp "$CURRENT_DIR/backend/requirements.txt" backend/

# Copy environment files
cp "$CURRENT_DIR/.env" . 2>/dev/null || true
cp "$CURRENT_DIR/.env.production" . 2>/dev/null || true
cp "$CURRENT_DIR/.env.staging" . 2>/dev/null || true

echo "✅ Local changes copied"

echo ""
echo "Step 5: Creating commit with restored files..."
git add .npmrc backend/requirements.txt
git commit -m "fix: restore missing repository files

- Restored backend/requirements.txt from backup
- Created new .npmrc configuration file
- Repository repaired after corruption

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>" || true

echo ""
echo "=== Repository Repair Complete ==="
echo ""
echo "Next steps:"
echo "1. Navigate to the new directory: cd $PARENT_DIR/wheels-wins-landing-page-fresh"
echo "2. Verify everything looks correct: git status"
echo "3. Install dependencies: npm install"
echo "4. If everything is working, you can:"
echo "   - Delete the old corrupted directory: rm -rf $CURRENT_DIR"
echo "   - Rename the fresh directory: mv wheels-wins-landing-page-fresh wheels-wins-landing-page"
echo ""
echo "Your backup is saved at: $PARENT_DIR/wheels-wins-backup-${TIMESTAMP}.tar.gz"