#!/usr/bin/env python3
"""Test PAM Shop Tools

Quick test to verify shop tools are working with PAM core
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.services.pam.tools.shop.search_products import search_products
from app.services.pam.tools.shop.get_product_details import get_product_details
from app.services.pam.tools.shop.recommend_products import recommend_products


async def test_shop_tools():
    """Test all shop tools"""
    user_id = "21a2151a-cd37-41d5-a1c7-124bb05e7a6a"  # Admin user

    print("Testing PAM Shop Tools")
    print("=" * 50)

    # Test 1: Search products
    print("\n1. Testing search_products...")
    result = await search_products(
        user_id=user_id,
        query="tire deflator",
        category="tools_maintenance",
        limit=5
    )
    print(f"   Found {result.get('products_found', 0)} products")
    if result.get('success'):
        products = result.get('products', [])
        for p in products[:3]:
            print(f"   - {p['title']} (${p['price']})")

    # Test 2: Get product details
    print("\n2. Testing get_product_details...")
    if result.get('success') and result.get('products'):
        first_product = result['products'][0]
        detail_result = await get_product_details(
            user_id=user_id,
            product_title=first_product['title'][:20]  # Use partial title
        )
        if detail_result.get('success'):
            product = detail_result.get('product', {})
            print(f"   Product: {product.get('title')}")
            print(f"   Price: ${product.get('price')}")
            print(f"   Category: {product.get('category')}")

    # Test 3: Recommend products
    print("\n3. Testing recommend_products...")
    rec_result = await recommend_products(
        user_id=user_id,
        use_case="tire_maintenance",
        budget=100,
        limit=5
    )
    if rec_result.get('success'):
        recs = rec_result.get('recommendations', [])
        print(f"   Found {len(recs)} recommendations")
        for r in recs[:3]:
            print(f"   - {r['title']} (${r['price']}) - {r['reason']}")

    print("\n" + "=" * 50)
    print("Shop tools test complete!")

    # Check if tools are importable by PAM
    print("\n4. Checking PAM core integration...")
    try:
        from app.services.pam.core import PAM
        print("   ✓ PAM core imports successfully")

        # Check if tools are in the tool definitions
        tools = PAM._build_tools_schema()
        tool_names = [t['name'] for t in tools]

        shop_tools = ['search_products', 'get_product_details', 'recommend_products']
        for tool in shop_tools:
            if tool in tool_names:
                print(f"   ✓ {tool} registered in PAM")
            else:
                print(f"   ✗ {tool} NOT registered in PAM")

        print(f"\n   Total tools in PAM: {len(tool_names)}")

    except Exception as e:
        print(f"   ✗ Error loading PAM: {e}")


if __name__ == "__main__":
    asyncio.run(test_shop_tools())