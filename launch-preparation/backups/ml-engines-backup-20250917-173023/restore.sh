#!/bin/bash

# ML Engine Backup Restoration Script
# Created: September 17, 2025
# Purpose: Instant restoration of ML engines and related components

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
BACKUP_DIR="$SCRIPT_DIR"

echo "🔄 ML ENGINE RESTORATION SCRIPT"
echo "================================"
echo "Backup location: $BACKUP_DIR"
echo "Project root: $PROJECT_ROOT"
echo ""

# Verify we're in the right directory
if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
    echo "❌ Error: Not in project root directory"
    echo "Expected: /Users/thabonel/Code/wheels-wins-landing-page"
    echo "Current: $PROJECT_ROOT"
    exit 1
fi

echo "📋 Pre-restoration verification..."
echo "Current ML files: $(find "$PROJECT_ROOT/src/services/ml" -name "*.ts" 2>/dev/null | wc -l || echo "0")"
echo "Backup ML files: $(find "$BACKUP_DIR/ml-services-original" -name "*.ts" | wc -l)"
echo ""

# Ask for confirmation
read -p "⚠️  This will replace current ML files. Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restoration cancelled"
    exit 1
fi

echo "🔄 Starting restoration..."
echo ""

# Step 1: Restore ML services
echo "1️⃣ Restoring ML services..."
if [[ -d "$PROJECT_ROOT/src/services/ml" ]]; then
    rm -rf "$PROJECT_ROOT/src/services/ml"
fi
cp -r "$BACKUP_DIR/ml-services-original" "$PROJECT_ROOT/src/services/ml"
echo "✅ ML services restored"

# Step 2: Restore personalization hook
echo "2️⃣ Restoring personalization hook..."
cp "$BACKUP_DIR/usePersonalization.ts" "$PROJECT_ROOT/src/hooks/"
echo "✅ Personalization hook restored"

# Step 3: Restore personalization components
echo "3️⃣ Restoring personalization components..."
if [[ -d "$PROJECT_ROOT/src/components/personalization" ]]; then
    rm -rf "$PROJECT_ROOT/src/components/personalization"
fi
cp -r "$BACKUP_DIR/personalization-components" "$PROJECT_ROOT/src/components/personalization"
echo "✅ Personalization components restored"

# Step 4: Restore affected components
echo "4️⃣ Restoring affected components..."
cp "$BACKUP_DIR/affected-components/EnhancedAnalyticsDashboard.tsx" "$PROJECT_ROOT/src/components/analytics/"
cp "$BACKUP_DIR/affected-components/BudgetSidebar.tsx" "$PROJECT_ROOT/src/components/wheels/trip-planner/"
cp "$BACKUP_DIR/affected-components/PAMTripSuggestions.tsx" "$PROJECT_ROOT/src/components/wheels/trip-planner/"
cp "$BACKUP_DIR/affected-components/BudgetCategoriesGrid.tsx" "$PROJECT_ROOT/src/components/wins/budgets/"
echo "✅ Affected components restored"

echo ""
echo "🔍 Post-restoration verification..."

# Count restored files
RESTORED_ML_FILES=$(find "$PROJECT_ROOT/src/services/ml" -name "*.ts" | wc -l)
echo "Restored ML files: $RESTORED_ML_FILES"

if [[ $RESTORED_ML_FILES -eq 5 ]]; then
    echo "✅ All 5 ML engine files restored successfully"
else
    echo "⚠️ Warning: Expected 5 ML files, found $RESTORED_ML_FILES"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Run: npm run type-check"
echo "2. Run: npm run build"
echo "3. Run: npm run dev"
echo "4. Check for any compilation errors"
echo ""
echo "✅ RESTORATION COMPLETE"
echo ""
echo "📝 If you encounter issues:"
echo "- Check TypeScript errors: npm run type-check"
echo "- Check git status: git status"
echo "- Apply git stash if needed: git stash apply"