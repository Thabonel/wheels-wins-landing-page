#!/usr/bin/env python3
"""
Simple standalone test for free API integrations
Tests the APIs directly without backend dependencies
"""

import asyncio
import aiohttp
import json
from typing import Dict, Any

async def test_duckduckgo():
    """Test DuckDuckGo Instant Answer API"""
    print("\n🦆 Testing DuckDuckGo Instant Answer API...")
    
    queries = [
        "weather Sydney Australia",
        "what is an RV",
        "camping tips"
    ]
    
    async with aiohttp.ClientSession() as session:
        for query in queries:
            url = f"https://api.duckduckgo.com/?q={query}&format=json&no_html=1"
            print(f"  Query: '{query}'")
            
            try:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('Abstract'):
                            print(f"    ✅ Abstract: {data['Abstract'][:100]}...")
                        elif data.get('Answer'):
                            print(f"    ✅ Answer: {data['Answer']}")
                        elif data.get('Definition'):
                            print(f"    ✅ Definition: {data['Definition'][:100]}...")
                        else:
                            print(f"    ℹ️ No instant answer available")
                    else:
                        print(f"    ❌ HTTP {response.status}")
            except Exception as e:
                print(f"    ❌ Error: {e}")

async def test_nominatim():
    """Test OpenStreetMap Nominatim API"""
    print("\n🗺️ Testing Nominatim (OpenStreetMap) API...")
    
    queries = [
        {"q": "Sydney Opera House", "format": "json", "limit": 1},
        {"q": "camping ground near Blue Mountains", "format": "json", "limit": 3},
        {"q": "RV park", "lat": -33.8688, "lon": 151.2093, "format": "json", "limit": 3}
    ]
    
    async with aiohttp.ClientSession() as session:
        for query in queries:
            url = "https://nominatim.openstreetmap.org/search"
            # Add User-Agent header as required by Nominatim
            headers = {'User-Agent': 'Wheels-Wins-Test/1.0'}
            
            print(f"  Query: {query.get('q', 'location search')}")
            
            try:
                async with session.get(url, params=query, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data and len(data) > 0:
                            for i, result in enumerate(data[:2], 1):
                                name = result.get('display_name', 'Unknown')
                                lat = result.get('lat', 0)
                                lon = result.get('lon', 0)
                                print(f"    ✅ Result {i}: {name[:60]}...")
                                print(f"       Location: ({lat}, {lon})")
                        else:
                            print(f"    ℹ️ No results found")
                    else:
                        print(f"    ❌ HTTP {response.status}")
            except Exception as e:
                print(f"    ❌ Error: {e}")

async def test_open_meteo():
    """Test Open-Meteo Weather API"""
    print("\n☁️ Testing Open-Meteo Weather API...")
    
    locations = [
        {"name": "Sydney", "lat": -33.8688, "lon": 151.2093},
        {"name": "Melbourne", "lat": -37.8136, "lon": 144.9631},
        {"name": "Brisbane", "lat": -27.4698, "lon": 153.0251}
    ]
    
    async with aiohttp.ClientSession() as session:
        for loc in locations:
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": loc["lat"],
                "longitude": loc["lon"],
                "current_weather": "true",
                "hourly": "temperature_2m",
                "timezone": "auto"
            }
            
            print(f"  Location: {loc['name']}")
            
            try:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('current_weather'):
                            current = data['current_weather']
                            temp = current.get('temperature', 'N/A')
                            wind = current.get('windspeed', 'N/A')
                            print(f"    ✅ Temperature: {temp}°C")
                            print(f"    ✅ Wind Speed: {wind} km/h")
                        else:
                            print(f"    ℹ️ No weather data available")
                    else:
                        print(f"    ❌ HTTP {response.status}")
            except Exception as e:
                print(f"    ❌ Error: {e}")

async def test_wikipedia():
    """Test Wikipedia API"""
    print("\n📚 Testing Wikipedia API...")
    
    queries = ["recreational vehicle", "camping", "caravan park"]
    
    async with aiohttp.ClientSession() as session:
        for query in queries:
            url = "https://en.wikipedia.org/w/api.php"
            params = {
                "action": "opensearch",
                "search": query,
                "limit": 3,
                "format": "json"
            }
            
            print(f"  Query: '{query}'")
            
            try:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        if len(data) >= 4:
                            titles = data[1]
                            descriptions = data[2]
                            for i, title in enumerate(titles[:2]):
                                desc = descriptions[i] if i < len(descriptions) else ""
                                print(f"    ✅ {title}: {desc[:80]}...")
                        else:
                            print(f"    ℹ️ No results found")
                    else:
                        print(f"    ❌ HTTP {response.status}")
            except Exception as e:
                print(f"    ❌ Error: {e}")

async def test_rest_countries():
    """Test REST Countries API"""
    print("\n🌍 Testing REST Countries API...")
    
    countries = ["Australia", "USA", "Canada"]
    
    async with aiohttp.ClientSession() as session:
        for country in countries:
            url = f"https://restcountries.com/v3.1/name/{country}"
            params = {"fields": "name,capital,region,currencies,languages"}
            
            print(f"  Country: {country}")
            
            try:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data and len(data) > 0:
                            info = data[0]
                            capital = info.get('capital', ['N/A'])[0] if info.get('capital') else 'N/A'
                            region = info.get('region', 'N/A')
                            print(f"    ✅ Capital: {capital}")
                            print(f"    ✅ Region: {region}")
                        else:
                            print(f"    ℹ️ No data found")
                    else:
                        print(f"    ❌ HTTP {response.status}")
            except Exception as e:
                print(f"    ❌ Error: {e}")

async def main():
    """Run all API tests"""
    print("=" * 60)
    print("🧪 Testing Free APIs for PAM Web Scraper")
    print("=" * 60)
    
    # Run all tests
    await test_duckduckgo()
    await test_nominatim()
    await test_open_meteo()
    await test_wikipedia()
    await test_rest_countries()
    
    print("\n" + "=" * 60)
    print("✅ Testing Complete!")
    print("\nAll tested APIs are:")
    print("  • FREE to use")
    print("  • No authentication required")
    print("  • No API keys needed")
    print("  • Perfect for PAM's internet search needs!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())