#!/usr/bin/env python3
"""
Load comprehensive New Zealand travel data to trip_templates
This includes real locations with accurate coordinates
"""

import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime
import json

load_dotenv()

# Comprehensive New Zealand travel data with real locations
NEW_ZEALAND_DATA = [
    # === NORTH ISLAND ===
    {
        "name": "Bay of Islands Maritime Paradise",
        "description": "Discover 144 subtropical islands with dolphins, historic sites, and pristine beaches",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["bay_of_islands", "new_zealand", "dolphins", "beaches", "sailing", "camping"],
        "template_data": {
            "type": "island_hopping",
            "region": "Northland",
            "coordinates": {"latitude": -35.2824, "longitude": 174.0912},
            "highlights": [
                "Swim with dolphins",
                "Hole in the Rock cruise",
                "Russell historic town",
                "Waitangi Treaty Grounds"
            ],
            "camping_options": [
                {
                    "name": "Bay of Islands Holiday Park",
                    "location": "Paihia",
                    "coordinates": {"lat": -35.2833, "lng": 174.0917},
                    "amenities": ["powered_sites", "pool", "kitchen"],
                    "price_range": "$45-70 NZD/night"
                },
                {
                    "name": "Twin Pines Tourist Park",
                    "location": "Haruru Falls",
                    "amenities": ["waterfront_sites", "boat_ramp"],
                    "price_range": "$40-60 NZD/night"
                }
            ],
            "activities": ["dolphin_tours", "sailing", "fishing", "kayaking", "diving"],
            "best_season": "October to April",
            "distance": "240km from Auckland"
        }
    },
    {
        "name": "Coromandel Peninsula Gold & Beaches",
        "description": "Golden beaches, natural hot pools, and historic gold mining towns",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["coromandel", "hot_water_beach", "cathedral_cove", "new_zealand", "beaches"],
        "template_data": {
            "type": "peninsula_tour",
            "region": "Coromandel",
            "must_visit": [
                {
                    "name": "Cathedral Cove",
                    "coordinates": {"lat": -36.8281, "lng": 175.7903},
                    "activity": "Iconic beach archway",
                    "access": "45min walk or boat"
                },
                {
                    "name": "Hot Water Beach",
                    "coordinates": {"lat": -36.8842, "lng": 175.8739},
                    "activity": "Dig your own hot pool",
                    "best_time": "2hr either side of low tide"
                },
                {
                    "name": "Karangahake Gorge",
                    "activity": "Historic gold mining tunnels",
                    "walk": "Rail tunnel walk with glowworms"
                }
            ],
            "camping": [
                {
                    "name": "Hot Water Beach TOP 10",
                    "coordinates": {"lat": -36.8833, "lng": 175.8750},
                    "features": ["beachfront", "powered_sites", "camp_store"],
                    "book_ahead": "Essential in summer"
                },
                {
                    "name": "Hahei Holiday Resort",
                    "features": ["near_cathedral_cove", "pool", "playground"]
                }
            ],
            "scenic_drives": [
                "Thames Coast road",
                "309 Road (gravel, waterfalls)",
                "Coromandel to Whitianga coastal"
            ],
            "best_season": "December to March",
            "tips": ["Book camping well ahead", "Check tide times for Hot Water Beach"]
        }
    },
    {
        "name": "Rotorua Geothermal Wonderland",
        "description": "Experience bubbling mud pools, geysers, Maori culture, and adventure activities",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["rotorua", "geothermal", "maori_culture", "hot_springs", "new_zealand"],
        "template_data": {
            "type": "geothermal_adventure",
            "location": {
                "name": "Rotorua",
                "coordinates": {"lat": -38.1368, "lng": 176.2497}
            },
            "geothermal_parks": [
                {
                    "name": "Te Puia",
                    "features": ["Pohutu Geyser", "Maori cultural shows", "Kiwi house"],
                    "coordinates": {"lat": -38.1625, "lng": 176.2556}
                },
                {
                    "name": "Wai-O-Tapu",
                    "features": ["Champagne Pool", "Lady Knox Geyser", "Mud pools"],
                    "coordinates": {"lat": -38.3583, "lng": 176.3667}
                },
                {
                    "name": "Kuirau Park",
                    "features": ["Free hot pools", "Steam vents"],
                    "cost": "Free"
                }
            ],
            "camping": [
                {
                    "name": "Rotorua TOP 10 Holiday Park",
                    "coordinates": {"lat": -38.1639, "lng": 176.2347},
                    "features": ["heated_pools", "powered_sites", "close_to_town"]
                },
                {
                    "name": "Blue Lake TOP 10",
                    "features": ["lakefront", "swimming", "peaceful"],
                    "distance": "8km from city"
                }
            ],
            "activities": [
                "Skyline Gondola & Luge",
                "Redwoods Tree Walk",
                "Mountain biking",
                "Polynesian Spa"
            ],
            "maori_experiences": [
                "Hangi dinner",
                "Traditional performances",
                "Mitai Maori Village"
            ],
            "best_season": "Year round",
            "warning": "Sulphur smell throughout area"
        }
    },
    {
        "name": "Tongariro Alpine Crossing Adventure",
        "description": "New Zealand's best one-day walk through volcanic landscapes",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["tongariro", "hiking", "volcanoes", "alpine_crossing", "new_zealand"],
        "template_data": {
            "type": "alpine_hiking",
            "location": {
                "name": "Tongariro National Park",
                "coordinates": {"lat": -39.2000, "lng": 175.5833},
                "world_heritage": "Dual (Natural & Cultural)"
            },
            "the_crossing": {
                "distance": "19.4km",
                "duration": "7-8 hours",
                "difficulty": "challenging",
                "elevation_gain": "760m",
                "highlights": [
                    "Emerald Lakes",
                    "Red Crater",
                    "Mt Ngauruhoe (Mt Doom)",
                    "Blue Lake"
                ],
                "start": "Mangatepopo",
                "end": "Ketetahi"
            },
            "camping_base": [
                {
                    "name": "National Park Village",
                    "facilities": ["backpackers", "holiday_park", "shuttles"],
                    "coordinates": {"lat": -39.2000, "lng": 175.4167}
                },
                {
                    "name": "Whakapapa Village",
                    "facilities": ["DOC_campground", "visitor_centre"],
                    "coordinates": {"lat": -39.2000, "lng": 175.5333}
                }
            ],
            "other_walks": [
                "Taranaki Falls (2hr)",
                "Tama Lakes (5-6hr)",
                "Ruapehu Crater Lake (summer only)"
            ],
            "season_info": {
                "summer": "October to April - best conditions",
                "winter": "Alpine experience required, ice axe/crampons"
            },
            "bookings": "Shuttle booking essential",
            "warnings": ["Weather changes rapidly", "No camping on crossing"]
        }
    },
    
    # === SOUTH ISLAND ===
    {
        "name": "Milford Sound & Fiordland Expedition",
        "description": "Journey to the 'eighth wonder of the world' through dramatic fiords and rainforest",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["milford_sound", "fiordland", "new_zealand", "waterfalls", "scenic_drive"],
        "template_data": {
            "type": "fiord_adventure",
            "region": "Fiordland National Park",
            "world_heritage": True,
            "key_destination": {
                "name": "Milford Sound / Piopiotahi",
                "coordinates": {"lat": -44.6717, "lng": 167.9256},
                "rainfall": "7m annually",
                "features": ["Mitre Peak", "Stirling Falls", "Fur seals", "Dolphins"]
            },
            "scenic_route": {
                "name": "Milford Road (SH94)",
                "distance": "120km from Te Anau",
                "duration": "2.5 hours (no stops)",
                "stops": [
                    "Mirror Lakes",
                    "Lake Gunn Nature Walk",
                    "The Chasm",
                    "Homer Tunnel"
                ]
            },
            "camping_options": [
                {
                    "name": "Te Anau TOP 10",
                    "location": "Te Anau (base for trips)",
                    "coordinates": {"lat": -45.4144, "lng": 167.7181},
                    "features": ["powered_sites", "lake_views", "modern_facilities"]
                },
                {
                    "name": "Cascade Creek DOC",
                    "location": "On Milford Road",
                    "type": "basic_camping",
                    "features": ["riverside", "basic_facilities"],
                    "cost": "$15 NZD/adult"
                }
            ],
            "activities": [
                "Milford Sound cruises",
                "Kayaking",
                "Milford Track (4 days)",
                "Scenic flights",
                "Underwater observatory"
            ],
            "best_season": "October to April",
            "tips": [
                "Book cruise in advance",
                "Allow full day from Te Anau",
                "Sandfly repellent essential",
                "Road can close in winter"
            ]
        }
    },
    {
        "name": "West Coast Glaciers & Wilderness",
        "description": "Walk on ancient glaciers and explore pristine rainforest on the wild West Coast",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["franz_josef", "fox_glacier", "west_coast", "new_zealand", "glaciers"],
        "template_data": {
            "type": "glacier_adventure",
            "region": "West Coast",
            "main_attractions": [
                {
                    "name": "Franz Josef Glacier",
                    "coordinates": {"lat": -43.4647, "lng": 170.1883},
                    "activities": ["Heli-hike", "Glacier valley walk", "Hot pools"],
                    "township": "Franz Josef village"
                },
                {
                    "name": "Fox Glacier",
                    "coordinates": {"lat": -43.5320, "lng": 170.0170},
                    "activities": ["Glacier walks", "Lake Matheson mirror lake"],
                    "township": "Fox Glacier village"
                }
            ],
            "camping": [
                {
                    "name": "Franz Josef TOP 10",
                    "coordinates": {"lat": -43.3892, "lng": 170.1831},
                    "features": ["powered_sites", "camp_kitchen", "rainforest_setting"]
                },
                {
                    "name": "Fox Glacier TOP 10",
                    "features": ["mountain_views", "powered_sites", "peaceful"]
                }
            ],
            "other_highlights": [
                {
                    "name": "Hokitika Gorge",
                    "feature": "Stunning turquoise water",
                    "coordinates": {"lat": -42.9542, "lng": 171.0411}
                },
                {
                    "name": "Pancake Rocks",
                    "location": "Punakaiki",
                    "feature": "Limestone formations & blowholes"
                }
            ],
            "weather_warning": "Very high rainfall - 5m+ annually",
            "glacier_access": "Guided tours only for ice access",
            "best_season": "December to March",
            "driving_tips": ["Winding roads", "Allow extra time", "Fuel up regularly"]
        }
    },
    {
        "name": "Queenstown Adventure Capital",
        "description": "Adrenaline activities, stunning lakes, and world-class skiing in the adventure capital",
        "category": "4wd_adventures",
        "is_public": True,
        "tags": ["queenstown", "adventure", "bungy", "skiing", "new_zealand", "lakes"],
        "template_data": {
            "type": "adventure_hub",
            "location": {
                "name": "Queenstown",
                "coordinates": {"lat": -45.0312, "lng": 168.6626},
                "setting": "Lake Wakatipu & Remarkables"
            },
            "adventure_activities": [
                {
                    "name": "AJ Hackett Bungy",
                    "options": ["Kawarau Bridge", "Ledge Bungy", "Nevis Bungy"],
                    "claim_to_fame": "Birthplace of commercial bungy"
                },
                {
                    "name": "Shotover Jet",
                    "activity": "Jet boat through canyon"
                },
                {
                    "name": "Skyline Gondola",
                    "features": ["Luge", "Restaurant", "Paragliding"]
                }
            ],
            "scenic_drives": [
                {
                    "name": "Glenorchy Road",
                    "distance": "45km",
                    "highlights": ["Lake views", "Lord of Rings locations"]
                },
                {
                    "name": "Crown Range Road",
                    "feature": "Highest sealed road in NZ",
                    "destination": "Wanaka"
                }
            ],
            "camping": [
                {
                    "name": "Queenstown Lakeview Holiday Park",
                    "coordinates": {"lat": -45.0356, "lng": 168.6689},
                    "features": ["lake_views", "close_to_town", "powered_sites"],
                    "book_ahead": "Essential year-round"
                },
                {
                    "name": "12 Mile Delta",
                    "type": "freedom_camping",
                    "restrictions": "Self-contained only"
                }
            ],
            "seasonal_activities": {
                "winter": ["Skiing at Remarkables/Coronet Peak", "Snowboarding"],
                "summer": ["Hiking", "Mountain biking", "Wine tours"]
            },
            "nearby_attractions": [
                "Arrowtown historic gold town",
                "Gibbston Valley wineries",
                "Routeburn Track"
            ],
            "best_season": "Year round (different activities)",
            "budget_tip": "Many free walks with stunning views"
        }
    },
    {
        "name": "Abel Tasman Coastal Paradise",
        "description": "Golden beaches, turquoise waters, and coastal walks in NZ's smallest national park",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["abel_tasman", "beaches", "kayaking", "hiking", "new_zealand", "camping"],
        "template_data": {
            "type": "coastal_park",
            "location": {
                "name": "Abel Tasman National Park",
                "coordinates": {"lat": -40.9333, "lng": 173.0000},
                "size": "237 sq km"
            },
            "access_points": [
                {
                    "name": "Marahau",
                    "type": "southern_gateway",
                    "services": ["water_taxis", "kayak_hire", "camping"]
                },
                {
                    "name": "Kaiteriteri",
                    "type": "beach_resort",
                    "services": ["boats", "accommodation", "supplies"]
                }
            ],
            "coastal_track": {
                "distance": "60km",
                "duration": "3-5 days",
                "difficulty": "easy-moderate",
                "highlights": [
                    "Anchorage Bay",
                    "Bark Bay",
                    "Awaroa Inlet",
                    "Totaranui"
                ],
                "camping": "Designated sites only"
            },
            "camping_options": [
                {
                    "name": "Marahau Beach Camp",
                    "coordinates": {"lat": -40.9958, "lng": 173.0089},
                    "features": ["beachfront", "powered_sites", "kayak_storage"]
                },
                {
                    "name": "DOC Campsites",
                    "locations": ["Anchorage", "Bark Bay", "Awaroa"],
                    "booking": "Required year-round",
                    "facilities": "Basic - toilets, water"
                }
            ],
            "activities": [
                "Sea kayaking",
                "Beach camping",
                "Swimming",
                "Water taxi trips",
                "Canyoning"
            ],
            "tides_important": "Awaroa Inlet crossing",
            "best_season": "December to April",
            "book_ahead": "Campsites fill months ahead in summer"
        }
    },
    
    # === CLASSIC ROAD TRIPS ===
    {
        "name": "Southern Scenic Route: Dunedin to Milford",
        "description": "One of the world's great coastal drives through the Catlins to Fiordland",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["southern_scenic_route", "catlins", "coastal", "new_zealand", "road_trip"],
        "template_data": {
            "type": "scenic_highway",
            "distance": "610km",
            "duration": "4-6 days recommended",
            "start": "Dunedin",
            "end": "Milford Sound",
            "route_highlights": [
                {
                    "name": "Nugget Point",
                    "coordinates": {"lat": -46.4478, "lng": 169.8167},
                    "features": ["Lighthouse", "Fur seals", "Scenic views"]
                },
                {
                    "name": "Cathedral Caves",
                    "access": "Low tide only",
                    "feature": "30m high sea caves"
                },
                {
                    "name": "Curio Bay",
                    "feature": "Petrified forest & yellow-eyed penguins"
                },
                {
                    "name": "Slope Point",
                    "feature": "South Island's southernmost point"
                }
            ],
            "camping_spots": [
                {
                    "name": "Kaka Point Camping Ground",
                    "features": ["beachfront", "basic_facilities"],
                    "coordinates": {"lat": -46.3867, "lng": 169.7867}
                },
                {
                    "name": "Curio Bay Camping Ground",
                    "features": ["penguin_viewing", "basic_facilities"]
                },
                {
                    "name": "Riverton Beach Camp",
                    "features": ["powered_sites", "beach_access"]
                }
            ],
            "wildlife": [
                "Hector's dolphins",
                "Yellow-eyed penguins",
                "Fur seals",
                "Sea lions"
            ],
            "detours": [
                "Stewart Island ferry from Bluff",
                "Invercargill - southernmost city"
            ],
            "best_season": "November to March",
            "tips": ["Check cave tide times", "Book Milford cruise ahead", "Allow time for wildlife stops"]
        }
    },
    {
        "name": "Thermal Explorer Highway",
        "description": "Geothermal wonders from Auckland to Napier via Rotorua and Taupo",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["thermal_highway", "rotorua", "taupo", "geothermal", "new_zealand"],
        "template_data": {
            "type": "thermal_route",
            "distance": "456km",
            "duration": "3-5 days",
            "route": "Auckland → Rotorua → Taupo → Napier",
            "geothermal_stops": [
                {
                    "name": "Hobbiton",
                    "location": "Matamata",
                    "feature": "Movie set tours",
                    "coordinates": {"lat": -37.8721, "lng": 175.6839}
                },
                {
                    "name": "Rotorua",
                    "features": ["Multiple thermal parks", "Maori culture"],
                    "stay": "1-2 days minimum"
                },
                {
                    "name": "Orakei Korako",
                    "feature": "Hidden Valley thermal area",
                    "access": "Boat across lake"
                },
                {
                    "name": "Taupo",
                    "features": ["Huka Falls", "Lake activities", "Geothermal walks"],
                    "coordinates": {"lat": -38.6857, "lng": 176.0702}
                }
            ],
            "camping_recommendations": [
                {
                    "name": "Taupo DeBretts Hot Springs",
                    "features": ["hot_pools", "powered_sites", "family_friendly"],
                    "coordinates": {"lat": -38.7747, "lng": 176.0856}
                },
                {
                    "name": "Rotorua Thermal Holiday Park",
                    "features": ["mineral_pools", "close_to_attractions"]
                }
            ],
            "adventure_add_ons": [
                "Waitomo Caves (glowworms)",
                "Tongariro Alpine Crossing",
                "Huka Falls jet boat"
            ],
            "wine_finish": "Napier Art Deco & Hawke's Bay wines",
            "best_season": "Year round",
            "tip": "Many thermal attractions have combo tickets"
        }
    }
]

async def load_new_zealand_data():
    """Load comprehensive New Zealand travel data to trip_templates"""
    
    # Get Supabase credentials
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    
    supabase: Client = create_client(url, key)
    
    print("🌟 Loading Comprehensive New Zealand Travel Data")
    print("=" * 60)
    print(f"📊 Preparing to load {len(NEW_ZEALAND_DATA)} detailed travel templates")
    print()
    
    success_count = 0
    error_count = 0
    
    # Categories being loaded
    categories = set()
    regions = set()
    
    # Load each template
    for i, template in enumerate(NEW_ZEALAND_DATA, 1):
        try:
            # Extract metadata
            categories.add(template['category'])
            for tag in template['tags']:
                if 'island' in tag.lower() or any(place in tag for place in ['auckland', 'wellington', 'queenstown', 'rotorua']):
                    regions.add(tag)
            
            # Add metadata
            template['usage_count'] = 0
            template['created_at'] = datetime.now().isoformat()
            
            # Insert to database
            result = supabase.table('trip_templates').insert(template).execute()
            
            if result.data:
                print(f"✅ [{i:2d}/{len(NEW_ZEALAND_DATA)}] {template['name']}")
                success_count += 1
            else:
                print(f"❌ [{i:2d}/{len(NEW_ZEALAND_DATA)}] Failed: {template['name']}")
                error_count += 1
                
        except Exception as e:
            print(f"❌ [{i:2d}/{len(NEW_ZEALAND_DATA)}] Error: {template['name']} - {str(e)[:50]}...")
            error_count += 1
    
    print("\n" + "=" * 60)
    print(f"🎉 Data Loading Complete!")
    print(f"✅ Successfully loaded: {success_count} templates")
    if error_count > 0:
        print(f"❌ Failed: {error_count} templates")
    
    print(f"\n📍 Coverage:")
    print(f"   Islands: North Island, South Island")
    print(f"   Categories: {', '.join(sorted(categories))}")
    
    print("\n🌟 Added comprehensive data for:")
    print("   • Iconic destinations (Milford Sound, Bay of Islands)")
    print("   • Adventure activities (Queenstown, Rotorua)")
    print("   • Coastal walks (Abel Tasman, Coromandel)")
    print("   • Geothermal wonders (Rotorua, Taupo)")
    print("   • Glacier experiences (Franz Josef, Fox)")
    print("   • Great Walks and hiking trails")
    print("   • Maori cultural experiences")
    print("   • Wine regions and scenic drives")
    
    print("\n💡 PAM now has detailed New Zealand travel data including:")
    print("   • DOC campgrounds and holiday parks")
    print("   • Tide-dependent activities")
    print("   • Seasonal considerations")
    print("   • Ferry connections")
    print("   • Adventure activity options")
    print("   • Conservation area access")
    
    return success_count > 0

if __name__ == "__main__":
    asyncio.run(load_new_zealand_data())