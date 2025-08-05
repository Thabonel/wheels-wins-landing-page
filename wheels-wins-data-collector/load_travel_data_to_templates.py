#!/usr/bin/env python3
"""
Load comprehensive travel data directly to trip_templates table
This works with the existing database structure
"""

import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime
import json

load_dotenv()

# Comprehensive travel data for Australia
AUSTRALIA_TRAVEL_DATA = [
    # National Parks
    {
        "name": "Kakadu National Park Adventure",
        "description": "Explore Australia's largest national park with ancient Aboriginal rock art, wetlands, and diverse wildlife",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["national_park", "aboriginal_culture", "wildlife", "northern_territory", "camping"],
        "template_data": {
            "type": "national_park",
            "park_name": "Kakadu National Park",
            "location": {
                "country": "australia",
                "state": "Northern Territory",
                "latitude": -12.4255,
                "longitude": 132.8932,
                "region": "Top End"
            },
            "features": [
                "Aboriginal rock art galleries",
                "Jim Jim Falls",
                "Yellow Water billabong",
                "Diverse wildlife including crocodiles"
            ],
            "camping": {
                "available": True,
                "rv_accessible": True,
                "campgrounds": ["Merl", "Muirella Park", "Kakadu Lodge"],
                "facilities": ["toilets", "showers", "bbq", "swimming_pool"]
            },
            "best_season": "May to October (dry season)",
            "entry_fee": 40.00,
            "activities": ["wildlife_viewing", "cultural_tours", "hiking", "swimming", "photography"],
            "coordinates": {"latitude": -12.4255, "longitude": 132.8932}
        }
    },
    {
        "name": "Uluru-Kata Tjuta National Park Journey",
        "description": "Experience the spiritual heart of Australia with the iconic Uluru and Kata Tjuta formations",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["national_park", "uluru", "aboriginal_culture", "northern_territory", "iconic"],
        "template_data": {
            "type": "national_park",
            "park_name": "Uluru-Kata Tjuta National Park",
            "location": {
                "country": "australia",
                "state": "Northern Territory",
                "latitude": -25.3444,
                "longitude": 131.0369,
                "region": "Red Centre"
            },
            "features": [
                "Uluru (Ayers Rock)",
                "Kata Tjuta (The Olgas)",
                "Field of Light installation",
                "Cultural Centre"
            ],
            "camping": {
                "available": True,
                "rv_accessible": True,
                "campgrounds": ["Ayers Rock Resort Campground"],
                "facilities": ["powered_sites", "pool", "kitchen", "wifi"]
            },
            "best_season": "April to September",
            "entry_fee": 38.00,
            "activities": ["cultural_experiences", "sunrise_viewing", "base_walk", "helicopter_tours"],
            "coordinates": {"latitude": -25.3444, "longitude": 131.0369}
        }
    },
    
    # Free Camping Spots
    {
        "name": "East MacDonnell Ranges Free Camping",
        "description": "Remote free camping spots in the stunning East MacDonnell Ranges",
        "category": "4wd_adventures",
        "is_public": True,
        "tags": ["free_camping", "4wd", "northern_territory", "remote", "outback"],
        "template_data": {
            "type": "free_camping",
            "camping_spots": [
                {
                    "name": "Trephina Gorge",
                    "type": "free_bush_camping",
                    "facilities": ["basic_toilets", "picnic_tables"],
                    "coordinates": {"lat": -23.5333, "lng": 134.3833},
                    "access": "2WD accessible",
                    "best_for": "tents and small campers"
                },
                {
                    "name": "N'Dhala Gorge",
                    "type": "free_4wd_camping",
                    "facilities": ["none"],
                    "coordinates": {"lat": -23.6000, "lng": 134.6333},
                    "access": "4WD only",
                    "best_for": "self-sufficient camping"
                },
                {
                    "name": "Ruby Gap",
                    "type": "free_remote_camping",
                    "facilities": ["basic_toilets"],
                    "coordinates": {"lat": -23.4833, "lng": 134.9167},
                    "access": "4WD essential",
                    "best_for": "adventure seekers"
                }
            ],
            "best_season": "April to September",
            "vehicle_requirements": ["4WD recommended", "extra_water", "recovery_gear"],
            "warnings": ["No water available", "Remote location", "Check road conditions"]
        }
    },
    {
        "name": "Litchfield National Park Free Camping",
        "description": "Free camping near spectacular waterfalls and swimming holes",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["free_camping", "waterfalls", "swimming", "northern_territory"],
        "template_data": {
            "type": "free_camping",
            "camping_spots": [
                {
                    "name": "Sandy Creek Falls",
                    "type": "free_camping",
                    "facilities": ["toilets", "picnic_area"],
                    "coordinates": {"lat": -13.0667, "lng": 130.7833},
                    "features": ["waterfall", "swimming", "4wd_track"]
                },
                {
                    "name": "Surprise Creek Falls",
                    "type": "free_bush_camping",
                    "facilities": ["basic_toilets"],
                    "coordinates": {"lat": -13.1500, "lng": 130.6833},
                    "features": ["secluded", "swimming_hole"]
                }
            ],
            "best_season": "May to October",
            "distance_from_darwin": "115 km",
            "highlights": ["waterfalls", "magnetic_termite_mounds", "swimming_holes"]
        }
    },
    
    # RV Parks
    {
        "name": "Darwin FreeSpirit Resort",
        "description": "Premium RV resort with tropical pool and modern facilities near Darwin",
        "category": "comfort_luxury",
        "is_public": True,
        "tags": ["rv_park", "resort", "pool", "darwin", "northern_territory"],
        "template_data": {
            "type": "rv_park",
            "park_name": "Darwin FreeSpirit Resort",
            "location": {
                "country": "australia",
                "state": "Northern Territory",
                "city": "Darwin",
                "latitude": -12.3745,
                "longitude": 130.8797
            },
            "amenities": {
                "powered_sites": True,
                "water": True,
                "dump_station": True,
                "wifi": True,
                "pool": True,
                "camp_kitchen": True,
                "laundry": True,
                "playground": True
            },
            "pricing": {
                "powered_site": 45,
                "unpowered": 35,
                "currency": "AUD"
            },
            "max_rig_length": 50,
            "pet_friendly": True,
            "contact": {
                "phone": "+61 8 8983 2113",
                "website": "https://darwinfreespiritresort.com.au"
            },
            "coordinates": {"latitude": -12.3745, "longitude": 130.8797}
        }
    },
    
    # Swimming Spots
    {
        "name": "Litchfield Waterfalls Swimming Tour",
        "description": "Discover the best swimming holes and waterfalls in Litchfield National Park",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["swimming", "waterfalls", "northern_territory", "day_trip"],
        "template_data": {
            "type": "swimming_tour",
            "swimming_spots": [
                {
                    "name": "Florence Falls",
                    "type": "waterfall_plunge_pool",
                    "features": ["160_steps_down", "spectacular_views", "deep_pool"],
                    "coordinates": {"lat": -13.1000, "lng": 130.7833},
                    "safety": "Generally safe, watch for slippery rocks"
                },
                {
                    "name": "Wangi Falls",
                    "type": "waterfall_pool",
                    "features": ["easy_access", "large_pool", "popular"],
                    "coordinates": {"lat": -13.1633, "lng": 130.6850},
                    "safety": "Closed during wet season"
                },
                {
                    "name": "Buley Rockhole",
                    "type": "rock_pools",
                    "features": ["series_of_pools", "natural_spa", "family_friendly"],
                    "coordinates": {"lat": -13.0500, "lng": 130.7167},
                    "safety": "Shallow pools, great for kids"
                }
            ],
            "best_season": "May to October",
            "warnings": ["No swimming in wet season", "Check for closures"],
            "facilities": ["parking", "toilets", "picnic_areas"]
        }
    },
    {
        "name": "Katherine Gorge Swimming Adventure",
        "description": "Swim in the stunning gorges of Nitmiluk National Park",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["swimming", "gorge", "kayaking", "northern_territory"],
        "template_data": {
            "type": "swimming_tour",
            "location": {
                "name": "Nitmiluk National Park",
                "coordinates": {"lat": -14.3167, "lng": 132.4333}
            },
            "swimming_spots": [
                {
                    "name": "First Gorge",
                    "type": "gorge_swimming",
                    "access": "boat_ramp",
                    "features": ["calm_water", "scenic_cliffs"]
                },
                {
                    "name": "Edith Falls",
                    "type": "waterfall_pool",
                    "access": "short_walk",
                    "features": ["upper_pools", "lower_pool", "warm_water"]
                }
            ],
            "activities": ["swimming", "kayaking", "boat_tours"],
            "best_season": "May to September",
            "entry_fee": 15.00
        }
    },
    
    # Tourist Attractions
    {
        "name": "Darwin City Highlights",
        "description": "Explore the tropical capital of the Northern Territory",
        "category": "city_sightseeing",
        "is_public": True,
        "tags": ["city", "museums", "markets", "darwin", "attractions"],
        "template_data": {
            "type": "city_attractions",
            "attractions": [
                {
                    "name": "Mindil Beach Sunset Market",
                    "type": "market",
                    "when": "Thursday and Sunday evenings (dry season)",
                    "coordinates": {"lat": -12.4381, "lng": 130.8342},
                    "highlights": ["food_stalls", "crafts", "sunset_viewing"]
                },
                {
                    "name": "Crocosaurus Cove",
                    "type": "wildlife_attraction",
                    "coordinates": {"lat": -12.4628, "lng": 130.8418},
                    "features": ["cage_of_death", "crocodile_feeding", "reptile_house"],
                    "entry_fee": 38.00
                },
                {
                    "name": "Museum and Art Gallery NT",
                    "type": "museum",
                    "coordinates": {"lat": -12.4375, "lng": 130.8375},
                    "features": ["cyclone_tracy_exhibit", "aboriginal_art", "maritime_gallery"],
                    "entry_fee": "free"
                }
            ],
            "rv_parking": ["Mindil Beach carpark", "Waterfront precinct"],
            "best_season": "May to October"
        }
    }
]

# More data for other states/countries can be added...

async def load_travel_data():
    """Load comprehensive travel data to trip_templates"""
    
    # Get Supabase credentials
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    
    supabase: Client = create_client(url, key)
    
    print("🌟 Loading comprehensive travel data to Wheels & Wins database")
    print("=" * 60)
    
    success_count = 0
    error_count = 0
    
    # Load each travel template
    for i, template in enumerate(AUSTRALIA_TRAVEL_DATA, 1):
        try:
            # Add metadata
            template['usage_count'] = 0
            template['created_at'] = datetime.now().isoformat()
            
            # Insert to database
            result = supabase.table('trip_templates').insert(template).execute()
            
            if result.data:
                print(f"✅ [{i}/{len(AUSTRALIA_TRAVEL_DATA)}] Added: {template['name']}")
                success_count += 1
            else:
                print(f"❌ [{i}/{len(AUSTRALIA_TRAVEL_DATA)}] Failed: {template['name']}")
                error_count += 1
                
        except Exception as e:
            print(f"❌ [{i}/{len(AUSTRALIA_TRAVEL_DATA)}] Error adding {template['name']}: {str(e)[:50]}...")
            error_count += 1
    
    print("\n" + "=" * 60)
    print(f"🎉 Data loading complete!")
    print(f"✅ Successfully added: {success_count} templates")
    print(f"❌ Failed: {error_count} templates")
    
    # Show summary of what was added
    print("\n📊 Added travel data includes:")
    print("  • National Parks with camping info")
    print("  • Free camping spots with GPS coordinates")
    print("  • RV parks with full amenities")
    print("  • Swimming spots and waterfalls")
    print("  • Tourist attractions")
    
    print("\n🚀 PAM can now use this data for trip planning!")
    
    # Verify the data
    print("\n📋 Verifying data in database...")
    try:
        # Count templates by category
        categories = {}
        result = supabase.table('trip_templates').select('category').execute()
        
        for item in result.data:
            cat = item.get('category', 'unknown')
            categories[cat] = categories.get(cat, 0) + 1
        
        print("Templates by category:")
        for cat, count in sorted(categories.items()):
            print(f"  • {cat}: {count} templates")
            
        # Get total count
        total = sum(categories.values())
        print(f"\n📊 Total templates in database: {total}")
        
    except Exception as e:
        print(f"Error verifying data: {e}")
    
    return success_count > 0

if __name__ == "__main__":
    asyncio.run(load_travel_data())