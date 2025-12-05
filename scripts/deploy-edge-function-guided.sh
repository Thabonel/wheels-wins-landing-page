#!/bin/bash

# Guided deployment script for Supabase Edge Function
# This script will help you deploy the admin-affiliate-products function

set -e

PROJECT_REF="kycoklimpzkyrecbjecn"
FUNCTION_NAME="admin-affiliate-products"

echo "========================================"
echo "🚀 Supabase Edge Function Deployment"
echo "========================================"
echo ""
echo "Function: $FUNCTION_NAME"
echo "Project: $PROJECT_REF"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi
echo "✅ Docker is running"
echo ""

# Check for Supabase access token
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⚠️  SUPABASE_ACCESS_TOKEN not found!"
    echo ""
    echo "To get your access token:"
    echo "1. Open: https://supabase.com/dashboard/account/tokens"
    echo "2. Click 'Generate new token'"
    echo "3. Name it: 'Edge Function Deployment'"
    echo "4. Copy the token"
    echo ""
    read -p "Paste your token here: " SUPABASE_ACCESS_TOKEN

    if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
        echo "❌ No token provided. Exiting."
        exit 1
    fi

    echo ""
    echo "✅ Token received"
    export SUPABASE_ACCESS_TOKEN
fi

# Confirm deployment
echo ""
echo "Ready to deploy:"
echo "  Function: $FUNCTION_NAME"
echo "  Project: $PROJECT_REF"
echo "  Source: supabase/functions/$FUNCTION_NAME/index.ts"
echo ""
read -p "Deploy now? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Deploy using Docker
echo ""
echo "🚀 Deploying Edge Function..."
echo "This may take a minute..."
echo ""

docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  -e SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" \
  supabase/cli:latest \
  functions deploy "$FUNCTION_NAME" --project-ref "$PROJECT_REF"

echo ""
echo "========================================"
echo "✅ Deployment Complete!"
echo "========================================"
echo ""
echo "Function URL:"
echo "https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME"
echo ""
echo "Test the function:"
echo "1. Go to your admin panel: /admin/amazon-products"
echo "2. Try creating, editing, or deleting a product"
echo "3. Check the browser console for any errors"
echo ""
echo "If you want to save the token for future use:"
echo "export SUPABASE_ACCESS_TOKEN='$SUPABASE_ACCESS_TOKEN'"
echo ""