#!/bin/bash

# Fix Trial Dialog Script
# This script fixes the trial confirmation dialog issue

echo "🔧 Fixing Trial Confirmation Dialog..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Backup the original file
if [ -f "src/components/TrialConfirmationDialog.tsx" ]; then
    echo "📦 Backing up original file..."
    cp src/components/TrialConfirmationDialog.tsx src/components/TrialConfirmationDialog.tsx.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup created"
fi

# Replace with the fixed version
if [ -f "src/components/TrialConfirmationDialogFixed.tsx" ]; then
    echo "🔄 Replacing with fixed version..."
    cp src/components/TrialConfirmationDialogFixed.tsx src/components/TrialConfirmationDialog.tsx
    echo "✅ Dialog component fixed!"
else
    echo "⚠️  Fixed file not found. Creating it now..."
    # The file should already exist, but this is a fallback
    echo "❌ Error: TrialConfirmationDialogFixed.tsx not found"
    exit 1
fi

echo ""
echo "✨ Fix applied successfully!"
echo ""
echo "Next steps:"
echo "1. Test the signup flow"
echo "2. The dialog should now show:"
echo "   - Two visible buttons: 'Learn More' and 'Start Free Trial'"
echo "   - No payment or checkout process"
echo "   - Direct trial creation on button click"
echo ""
echo "If you need to revert:"
echo "  cp src/components/TrialConfirmationDialog.tsx.backup.* src/components/TrialConfirmationDialog.tsx"