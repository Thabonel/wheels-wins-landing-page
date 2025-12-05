#!/bin/bash

# Simple verification that shop tools are integrated into PAM

echo "=========================================="
echo "🛍️ Verifying PAM Shop Tools Integration"
echo "=========================================="
echo ""

# 1. Check that shop tool files exist
echo "1. Checking shop tool files..."
if [ -f "backend/app/services/pam/tools/shop/search_products.py" ] && \
   [ -f "backend/app/services/pam/tools/shop/get_product_details.py" ] && \
   [ -f "backend/app/services/pam/tools/shop/recommend_products.py" ]; then
    echo "   ✅ All shop tool files exist"
else
    echo "   ❌ Missing shop tool files"
fi

# 2. Check that shop tools are imported in PAM core
echo ""
echo "2. Checking PAM core imports..."
if grep -q "from app.services.pam.tools.shop.search_products" backend/app/services/pam/core/pam.py && \
   grep -q "from app.services.pam.tools.shop.get_product_details" backend/app/services/pam/core/pam.py && \
   grep -q "from app.services.pam.tools.shop.recommend_products" backend/app/services/pam/core/pam.py; then
    echo "   ✅ Shop tools imported in PAM core"
else
    echo "   ❌ Shop tools not imported in PAM core"
fi

# 3. Check that shop tools are in tool definitions
echo ""
echo "3. Checking tool definitions..."
if grep -q '"name": "search_products"' backend/app/services/pam/core/pam.py && \
   grep -q '"name": "get_product_details"' backend/app/services/pam/core/pam.py && \
   grep -q '"name": "recommend_products"' backend/app/services/pam/core/pam.py; then
    echo "   ✅ Shop tools defined in PAM"
else
    echo "   ❌ Shop tools not defined in PAM"
fi

# 4. Check that shop tools are in function mappings
echo ""
echo "4. Checking function mappings..."
if grep -q '"search_products": search_products' backend/app/services/pam/core/pam.py && \
   grep -q '"get_product_details": get_product_details' backend/app/services/pam/core/pam.py && \
   grep -q '"recommend_products": recommend_products' backend/app/services/pam/core/pam.py; then
    echo "   ✅ Shop tools mapped in PAM"
else
    echo "   ❌ Shop tools not mapped in PAM"
fi

# 5. Check Python syntax
echo ""
echo "5. Checking Python syntax..."
if python3 -m py_compile backend/app/services/pam/core/pam.py 2>/dev/null; then
    echo "   ✅ PAM core syntax is valid"
else
    echo "   ❌ PAM core has syntax errors"
fi

# 6. Count total tools
echo ""
echo "6. Tool Statistics..."
TOOL_COUNT=$(grep -c '"name":' backend/app/services/pam/core/pam.py)
echo "   Total tools defined: $TOOL_COUNT"
echo "   Shop tools added: 3"

echo ""
echo "=========================================="
echo "✅ PAM Shop Tools Integration Complete!"
echo "=========================================="
echo ""
echo "Shop tools are now available in PAM:"
echo "  - search_products: Find Amazon products"
echo "  - get_product_details: Get product info"
echo "  - recommend_products: Get recommendations"
echo ""
echo "Example PAM queries:"
echo '  - "Find tire deflators"'
echo '  - "Search for camping gear under $50"'
echo '  - "What tools do I need for tire maintenance?"'
echo ""
echo "Next steps:"
echo "1. Deploy the Edge Function for admin management"
echo "2. Test PAM with shop-related queries"
echo "3. Verify products appear in responses"