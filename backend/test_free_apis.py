#!/usr/bin/env python3
"""
Test script for PAM's enhanced web scraping with free APIs
Tests all the new free API integrations
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the webscraper tool
from app.services.pam.tools.webscraper_tool import WebscraperTool

async def test_free_apis():
    """Test all free API integrations"""
    
    print("🧪 Testing PAM's Enhanced Web Scraping with Free APIs\n")
    print("=" * 60)
    
    # Initialize the tool
    tool = WebscraperTool()
    await tool.initialize()
    
    # Test location for queries (Sydney, Australia)
    test_location = [-33.8688, 151.2093]
    
    tests = [
        {
            "name": "Smart Search - Weather Query",
            "params": {
                "action": "smart_search",
                "query": "weather in Sydney Australia",
                "location": test_location
            }
        },
        {
            "name": "Direct Weather API",
            "params": {
                "action": "weather",
                "location": test_location
            }
        },
        {
            "name": "DuckDuckGo Search",
            "params": {
                "action": "search_scrape",
                "search_query": "best RV parks Australia",
                "max_results": 5
            }
        },
        {
            "name": "Location-based Search (Nominatim)",
            "params": {
                "action": "search_scrape",
                "search_query": "camping grounds",
                "location": test_location,
                "max_results": 5
            }
        },
        {
            "name": "Fuel Prices Query",
            "params": {
                "action": "fuel_prices",
                "location": test_location,
                "fuel_type": "E10",
                "radius_km": 10
            }
        },
        {
            "name": "General Knowledge Query",
            "params": {
                "action": "search_scrape",
                "search_query": "how to maintain RV batteries",
                "max_results": 3
            }
        },
        {
            "name": "Smart Search - Camping Query",
            "params": {
                "action": "smart_search",
                "query": "find camping spots near Blue Mountains",
                "location": test_location
            }
        }
    ]
    
    # Run tests
    for test in tests:
        print(f"\n📍 Test: {test['name']}")
        print("-" * 40)
        
        try:
            result = await tool.execute("test_user", test['params'])
            
            if result.get('status') == 'success':
                print("✅ Success!")
                
                # Show key information based on test type
                data = result.get('data', {})
                
                if 'weather' in test['params'].get('action', ''):
                    weather = data.get('weather', {})
                    if weather.get('current'):
                        current = weather['current']
                        print(f"   Temperature: {current.get('temperature', 'N/A')}°C")
                        print(f"   Wind Speed: {current.get('windspeed', 'N/A')} km/h")
                    if data.get('formatted'):
                        print(f"   Formatted: {data['formatted'][:200]}...")
                
                elif 'fuel' in test['params'].get('action', ''):
                    results = data.get('results', [])
                    for r in results[:2]:
                        print(f"   Region: {r.get('region', 'N/A')}")
                        print(f"   Info: {r.get('message', 'N/A')}")
                
                elif 'search' in test['params'].get('action', ''):
                    results = data.get('results', {})
                    sources = results.get('sources', {})
                    total = results.get('total_results', 0)
                    print(f"   Total Results: {total}")
                    print(f"   Sources Used: {list(sources.keys())}")
                    
                    # Show first result from each source
                    for source_name, source_data in sources.items():
                        if source_data.get('results'):
                            first_result = source_data['results'][0]
                            print(f"   {source_name}: {first_result.get('title', 'N/A')[:60]}...")
                
                # Check if result was cached
                if 'cache' in str(result):
                    print("   📦 (Result from cache)")
                
            else:
                print(f"❌ Failed: {result.get('error', 'Unknown error')}")
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
    
    # Test caching
    print("\n" + "=" * 60)
    print("📦 Testing Cache Performance")
    print("-" * 40)
    
    # Run same query twice to test caching
    cache_test_params = {
        "action": "search_scrape",
        "search_query": "weather forecast Sydney",
        "location": test_location
    }
    
    import time
    
    # First query (should hit APIs)
    start = time.time()
    result1 = await tool.execute("test_user", cache_test_params)
    time1 = time.time() - start
    print(f"First query: {time1:.2f} seconds")
    
    # Second query (should use cache)
    start = time.time()
    result2 = await tool.execute("test_user", cache_test_params)
    time2 = time.time() - start
    print(f"Second query: {time2:.2f} seconds")
    
    if time2 < time1 * 0.5:
        print("✅ Cache working! Second query was much faster")
    else:
        print("⚠️ Cache may not be working optimally")
    
    # Show intelligent routing
    print("\n" + "=" * 60)
    print("🧠 Testing Intelligent Query Routing")
    print("-" * 40)
    
    routing_tests = [
        ("What's the weather like today?", "Should route to weather API"),
        ("Find cheap fuel near me", "Should route to fuel price API"),
        ("Best camping spots in national parks", "Should route to recreation/camping APIs"),
        ("How to fix RV generator", "Should route to general search APIs")
    ]
    
    for query, expected in routing_tests:
        from app.services.pam.tools.free_apis_config import FreeAPIsConfig
        routed_apis = FreeAPIsConfig.route_query(query)
        print(f"Query: '{query[:40]}...'")
        print(f"   Routed to: {routed_apis}")
        print(f"   Expected: {expected}")
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("\nPAM now has access to:")
    print("  • DuckDuckGo Instant Answers (general knowledge)")
    print("  • OpenStreetMap/Nominatim (geocoding & places)")
    print("  • Open-Meteo (weather forecasts)")
    print("  • Recreation.gov (US camping)")
    print("  • Wikipedia (encyclopedic info)")
    print("  • Intelligent query routing")
    print("  • Response caching for efficiency")
    print("\n🎉 All APIs are FREE with no authentication required!")
    
    await tool.close()

if __name__ == "__main__":
    asyncio.run(test_free_apis())