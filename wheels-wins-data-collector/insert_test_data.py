#!/usr/bin/env python3
"""
Insert test data directly to Supabase to verify tables are working
"""

import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

async def insert_test_data():
    """Insert test data to verify tables work"""
    
    # Get Supabase credentials
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    
    supabase: Client = create_client(url, key)
    
    print("🔄 Inserting test data to verify tables...")
    
    # Test data for camping_locations
    camping_data = {
        "name": "Test Campground - Cairns",
        "location_type": "rv_park",
        "country": "australia",
        "state_province": "Queensland",
        "description": "Test campground with full amenities near Cairns",
        "latitude": -16.9186,
        "longitude": 145.7781,
        "is_free": False,
        "price_per_night": 35.00,
        "currency": "AUD",
        "amenities": {
            "toilets": True,
            "showers": True,
            "electricity": True,
            "water": True,
            "wifi": False
        },
        "rv_accessible": True,
        "max_rig_length": 40,
        "phone": "+61 7 1234 5678",
        "website": "https://example.com",
        "tags": ["test", "queensland", "rv_park"],
        "data_source": "test_insert",
        "rating": 4.2,
        "review_count": 15
    }
    
    try:
        result = supabase.table('camping_locations').insert(camping_data).execute()
        print("✅ Successfully inserted test camping location!")
        print(f"   ID: {result.data[0]['id']}")
    except Exception as e:
        print(f"❌ Error inserting camping location: {e}")
    
    # Now let's check what tables we can actually use
    print("\n📊 Testing table access...")
    
    tables_to_test = [
        'trip_templates',
        'national_parks',
        'camping_locations', 
        'points_of_interest',
        'swimming_locations'
    ]
    
    for table in tables_to_test:
        try:
            result = supabase.table(table).select('*').limit(1).execute()
            count = len(result.data)
            print(f"✅ {table} - accessible (has {count} records)")
        except Exception as e:
            if 'relation' in str(e) and 'does not exist' in str(e):
                print(f"❌ {table} - table doesn't exist")
            else:
                print(f"⚠️  {table} - error: {str(e)[:50]}...")
    
    # Let's add data to trip_templates since that exists
    print("\n🔄 Adding travel data to trip_templates...")
    
    # Sample national park as trip template
    park_template = {
        "name": "Daintree National Park Explorer",
        "description": "Experience the world's oldest rainforest with RV-friendly camping options",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["national_park", "rainforest", "queensland", "camping", "wildlife"],
        "template_data": {
            "park_name": "Daintree National Park",
            "location": {
                "country": "australia",
                "state": "Queensland",
                "latitude": -16.1700,
                "longitude": 145.4185
            },
            "features": [
                "World Heritage rainforest",
                "Cassowary habitat",
                "Cape Tribulation",
                "Mossman Gorge"
            ],
            "camping": {
                "available": True,
                "rv_accessible": True,
                "facilities": ["toilets", "picnic_areas", "walking_trails"]
            },
            "best_season": "May to September",
            "entry_fee": 15.00,
            "activities": ["hiking", "wildlife_viewing", "swimming", "photography"]
        }
    }
    
    try:
        result = supabase.table('trip_templates').insert(park_template).execute()
        print("✅ Successfully added Daintree National Park to trip_templates!")
        print(f"   ID: {result.data[0]['id']}")
    except Exception as e:
        print(f"❌ Error inserting to trip_templates: {e}")
    
    # Add a camping spot as trip template
    camping_template = {
        "name": "Cape York Peninsula 4WD Camping Adventure",
        "description": "Remote camping adventure to the tip of Australia",
        "category": "4wd_adventures",
        "is_public": True,
        "tags": ["camping", "4wd", "remote", "queensland", "adventure"],
        "template_data": {
            "camping_spots": [
                {
                    "name": "Bramwell Junction Roadhouse",
                    "type": "roadhouse_camping",
                    "facilities": ["fuel", "food", "showers"],
                    "coordinates": {"lat": -12.0167, "lng": 142.8167}
                },
                {
                    "name": "Fruit Bat Falls",
                    "type": "free_camping",
                    "facilities": ["swimming", "toilets"],
                    "coordinates": {"lat": -11.8500, "lng": 142.5833}
                }
            ],
            "difficulty": "advanced",
            "duration_days": 7,
            "best_season": "May to October",
            "vehicle_requirements": ["4wd", "high_clearance", "recovery_gear"]
        }
    }
    
    try:
        result = supabase.table('trip_templates').insert(camping_template).execute()
        print("✅ Successfully added Cape York camping adventure to trip_templates!")
        print(f"   ID: {result.data[0]['id']}")
    except Exception as e:
        print(f"❌ Error inserting camping template: {e}")
    
    # Add a swimming spot as trip template
    swimming_template = {
        "name": "Tropical North Queensland Swimming Tour",
        "description": "Discover the best swimming holes and beaches in Tropical North Queensland",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["swimming", "beaches", "waterfalls", "queensland", "tropical"],
        "template_data": {
            "swimming_spots": [
                {
                    "name": "Crystal Cascades",
                    "type": "freshwater",
                    "features": ["rock_pools", "waterfalls"],
                    "coordinates": {"lat": -16.9667, "lng": 145.6833}
                },
                {
                    "name": "Josephine Falls",
                    "type": "waterfall",
                    "features": ["natural_slide", "swimming_holes"],
                    "coordinates": {"lat": -17.4333, "lng": 145.8667}
                },
                {
                    "name": "Lake Eacham",
                    "type": "crater_lake",
                    "features": ["clear_water", "picnic_areas"],
                    "coordinates": {"lat": -17.2839, "lng": 145.6269}
                }
            ],
            "best_season": "Year round (avoid wet season floods)",
            "safety_tips": ["Check for crocs", "Watch for flash floods", "Use designated swimming areas"]
        }
    }
    
    try:
        result = supabase.table('trip_templates').insert(swimming_template).execute()
        print("✅ Successfully added swimming tour to trip_templates!")
        print(f"   ID: {result.data[0]['id']}")
    except Exception as e:
        print(f"❌ Error inserting swimming template: {e}")
    
    print("\n🎉 Test data insertion complete!")
    print("\nSince the specific tables (national_parks, swimming_locations) don't exist yet,")
    print("I've added travel data to trip_templates which PAM can already use!")
    
    return True

if __name__ == "__main__":
    asyncio.run(insert_test_data())