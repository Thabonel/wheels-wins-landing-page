#!/bin/bash

# Test the admin-affiliate-products Edge Function
# Usage: ./scripts/test-edge-function.sh

PROJECT_REF="kycoklimpzkyrecbjecn"
FUNCTION_URL="https://$PROJECT_REF.supabase.co/functions/v1/admin-affiliate-products"

echo "🧪 Testing Edge Function: admin-affiliate-products"
echo "📍 URL: $FUNCTION_URL"
echo ""

# Test GET request to list products
echo "Testing GET (list products)..."
curl -X GET "$FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "✅ Test complete!"
echo ""
echo "Note: For full testing, use the admin panel in your app."
echo "The admin panel will test:"
echo "  - Creating new products"
echo "  - Updating existing products"
echo "  - Deleting products"
echo "  - Pagination and search"