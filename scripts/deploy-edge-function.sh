#!/bin/bash

# Deploy Supabase Edge Function using Docker
# Usage: ./scripts/deploy-edge-function.sh

set -e

PROJECT_REF="kycoklimpzkyrecbjecn"
FUNCTION_NAME="admin-affiliate-products"

echo "🚀 Deploying Edge Function: $FUNCTION_NAME"
echo "📦 Project: $PROJECT_REF"
echo ""

# Check if SUPABASE_ACCESS_TOKEN is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ SUPABASE_ACCESS_TOKEN not set!"
  echo ""
  echo "To get your access token:"
  echo "1. Go to https://supabase.com/dashboard/account/tokens"
  echo "2. Create a new access token or copy existing one"
  echo "3. Export it: export SUPABASE_ACCESS_TOKEN='your-token-here'"
  echo ""
  echo "Then run this script again."
  exit 1
fi

# Deploy using Supabase CLI Docker image
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  -e SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" \
  supabase/cli:latest \
  functions deploy "$FUNCTION_NAME" --project-ref "$PROJECT_REF"

echo ""
echo "✅ Deployment complete!"
echo "🔗 Function URL: https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME"
