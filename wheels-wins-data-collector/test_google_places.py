#!/usr/bin/env python3
"""
Test Google Places API Integration
Quick test to verify Google Places API is working correctly
"""

import asyncio
import sys
import os
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from scrapers.real_attractions_scraper import RealAttractionsScraperService

async def test_google_places_integration():
    """Test Google Places API integration"""
    print("🧪 Testing Google Places API integration...")

    scraper = RealAttractionsScraperService()

    # Check if API key is available
    google_key = scraper.api_keys.get('google_places')
    if not google_key:
        print("❌ No GOOGLE_PLACES_KEY environment variable found")
        print("💡 Please set GOOGLE_PLACES_KEY in your environment or .env file")
        return False

    print("✅ Google Places API key found")

    try:
        async with scraper:
            # Test a small search in Sydney
            print("🔍 Testing search in Sydney...")
            test_attractions = await scraper.search_google_places(
                location=(-33.8688, 151.2093),  # Sydney coordinates
                radius=5000,  # 5km radius
                place_type='tourist_attraction',
                country='australia',
                region_name='Sydney',
                max_results=5
            )

            print(f"✅ Found {len(test_attractions)} test attractions")

            for i, attraction in enumerate(test_attractions[:3], 1):
                name = attraction.get('name', 'Unknown')
                rating = attraction.get('rating', 0)
                quality = attraction.get('quality_score', 0)
                photo = "📷" if attraction.get('photo_url') else "❌"

                print(f"  {i}. {name}")
                print(f"     Rating: {rating}/5, Quality: {quality:.2f}, Photo: {photo}")

            if test_attractions:
                print("✅ Google Places API integration working correctly!")
                return True
            else:
                print("⚠️ No attractions returned from test search")
                return False

    except Exception as e:
        print(f"❌ Error testing Google Places API: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_full_collection():
    """Test full attraction collection with small limit"""
    print("\n🧪 Testing full collection with small limit...")

    scraper = RealAttractionsScraperService()

    try:
        # Test full collection with small limit
        attractions = await scraper.collect_all_countries(limit=50)

        print(f"✅ Full collection test completed: {len(attractions)} attractions")

        # Count by source
        google_count = sum(1 for attr in attractions if attr.get('data_source') == 'google_places')
        osm_count = sum(1 for attr in attractions if attr.get('data_source') == 'openstreetmap')

        print(f"   📊 Google Places: {google_count}, OSM: {osm_count}")

        # Show sample results
        if attractions:
            print("\n📋 Sample Results:")
            for i, attraction in enumerate(attractions[:5], 1):
                name = attraction.get('name', 'Unknown')
                source = attraction.get('data_source', 'unknown')
                country = attraction.get('country', 'unknown')
                quality = attraction.get('quality_score', 0)

                print(f"  {i}. {name} ({country})")
                print(f"     Source: {source}, Quality: {quality:.2f}")

        return True

    except Exception as e:
        print(f"❌ Error in full collection test: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test function"""
    print("🚀 Google Places API Integration Test")
    print("=" * 50)

    # Test 1: Basic Google Places API integration
    test1_success = await test_google_places_integration()

    # Test 2: Full collection
    test2_success = await test_full_collection()

    print("\n" + "=" * 50)
    if test1_success and test2_success:
        print("✅ All tests passed! Google Places integration is working correctly.")
    else:
        print("❌ Some tests failed. Check the output above for details.")

    print("\n💡 Next steps:")
    print("1. Add GOOGLE_PLACES_KEY to Render environment variables")
    print("2. Deploy to test the integration in production")
    print("3. Monitor the autonomous collection logs for improved data quality")

if __name__ == "__main__":
    asyncio.run(main())