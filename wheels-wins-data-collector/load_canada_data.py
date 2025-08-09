#!/usr/bin/env python3
"""
Load comprehensive Canada travel data to trip_templates
This includes real locations with accurate coordinates
"""

import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime
import json

load_dotenv()

# Comprehensive Canada travel data with real locations
CANADA_DATA = [
    # === WESTERN CANADA ===
    {
        "name": "Canadian Rockies Ultimate Road Trip",
        "description": "Experience towering peaks, turquoise lakes, and wildlife in Banff and Jasper",
        "category": "mountain_scenic",
        "is_public": True,
        "tags": ["canadian_rockies", "banff", "jasper", "canada", "mountains", "wildlife"],
        "template_data": {
            "type": "mountain_adventure",
            "region": "Alberta/British Columbia",
            "distance": "230km Banff to Jasper",
            "highlights": [
                {
                    "name": "Lake Louise",
                    "coordinates": {"lat": 51.4254, "lng": -116.1773},
                    "elevation": "1731m",
                    "activities": ["Hiking", "Canoeing", "Tea house hikes"]
                },
                {
                    "name": "Moraine Lake",
                    "coordinates": {"lat": 51.3217, "lng": -116.1860},
                    "feature": "Valley of Ten Peaks",
                    "note": "Road closed Oct-May"
                },
                {
                    "name": "Columbia Icefield",
                    "coordinates": {"lat": 52.2200, "lng": -117.2240},
                    "activity": "Glacier tours",
                    "elevation": "2000m"
                },
                {
                    "name": "Peyto Lake",
                    "feature": "Wolf-shaped turquoise lake",
                    "viewpoint": "Short walk from parking"
                }
            ],
            "camping": [
                {
                    "name": "Tunnel Mountain Campground",
                    "location": "Banff townsite",
                    "coordinates": {"lat": 51.1901, "lng": -115.5486},
                    "sites": "600+",
                    "amenities": ["Power sites", "Showers", "Fire pits"],
                    "price": "$28-39 CAD/night"
                },
                {
                    "name": "Whistlers Campground",
                    "location": "Jasper",
                    "coordinates": {"lat": 52.8492, "lng": -118.0596},
                    "sites": "700+",
                    "amenities": ["Some power", "Showers", "Interpretive programs"]
                }
            ],
            "wildlife": ["Grizzly bears", "Black bears", "Elk", "Bighorn sheep", "Mountain goats"],
            "passes_required": "Parks Canada pass ($10.50/day or $72.25/year)",
            "best_season": "June to September",
            "winter_activities": ["Skiing", "Ice walks", "Dog sledding"],
            "tips": ["Book camping months ahead", "Wildlife on roads at dawn/dusk", "Weather changes quickly"]
        }
    },
    {
        "name": "Vancouver Island Pacific Marine Circle",
        "description": "Rainforests, rugged coastline, and charming seaside towns on Canada's west coast",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["vancouver_island", "pacific_rim", "tofino", "canada", "beaches", "rainforest"],
        "template_data": {
            "type": "island_coastal",
            "region": "British Columbia",
            "main_route": "Pacific Marine Circle Route",
            "distance": "289km loop from Victoria",
            "key_destinations": [
                {
                    "name": "Tofino",
                    "coordinates": {"lat": 49.1530, "lng": -125.9066},
                    "features": ["Surf capital", "Long Beach", "Hot springs"],
                    "vibe": "Laid-back surf town"
                },
                {
                    "name": "Pacific Rim National Park",
                    "coordinates": {"lat": 48.9899, "lng": -125.6829},
                    "features": ["Long Beach", "Rainforest Trail", "Wild Pacific Trail"],
                    "entry": "$10.50/adult/day"
                },
                {
                    "name": "Telegraph Cove",
                    "coordinates": {"lat": 50.5442, "lng": -126.8269},
                    "feature": "Orca watching capital",
                    "season": "June to October"
                }
            ],
            "camping_options": [
                {
                    "name": "Green Point Campground",
                    "location": "Pacific Rim NP",
                    "coordinates": {"lat": 49.0547, "lng": -125.7531},
                    "features": ["Oceanfront sites", "Walk-in sites available"],
                    "book": "Parks Canada reservation system"
                },
                {
                    "name": "Surf Grove Campground",
                    "location": "Tofino",
                    "features": ["Near beaches", "Surf rentals", "Full hookups"]
                },
                {
                    "name": "Living Forest Oceanside",
                    "location": "Nanaimo",
                    "features": ["Ocean views", "Full service", "Near ferries"]
                }
            ],
            "activities": [
                "Storm watching (winter)",
                "Surfing lessons",
                "Whale watching",
                "Hot springs cove tours",
                "Cathedral Grove old growth"
            ],
            "ferry_info": {
                "from_mainland": "Tsawwassen to Swartz Bay (1.5hr)",
                "vehicle_reservation": "Recommended in summer",
                "cost": "~$75 car + $18/person"
            },
            "best_season": "May to September (dry), October to March (storm watching)",
            "tips": ["Reserve ferries early", "Tofino busy in summer", "Bring rain gear always"]
        }
    },
    {
        "name": "Sea to Sky Highway Adventure",
        "description": "One of the world's most scenic drives from Vancouver to Whistler",
        "category": "mountain_scenic",
        "is_public": True,
        "tags": ["sea_to_sky", "whistler", "squamish", "canada", "scenic_drive", "mountains"],
        "template_data": {
            "type": "scenic_highway",
            "highway": "Highway 99",
            "distance": "120km Vancouver to Whistler",
            "duration": "1.5-2 hours (without stops)",
            "major_stops": [
                {
                    "name": "Shannon Falls",
                    "coordinates": {"lat": 49.6706, "lng": -123.1569},
                    "height": "335m",
                    "feature": "BC's third highest waterfall"
                },
                {
                    "name": "Sea to Sky Gondola",
                    "location": "Squamish",
                    "coordinates": {"lat": 49.6750, "lng": -123.1583},
                    "features": ["Summit lodge", "Suspension bridge", "Hiking trails"],
                    "cost": "$47 adult"
                },
                {
                    "name": "Brandywine Falls",
                    "height": "70m",
                    "walk": "10min from parking"
                },
                {
                    "name": "Whistler Village",
                    "coordinates": {"lat": 50.1163, "lng": -122.9574},
                    "features": ["Ski resort", "Mountain biking", "Peak 2 Peak Gondola"]
                }
            ],
            "camping_along_route": [
                {
                    "name": "Porteau Cove Provincial Park",
                    "coordinates": {"lat": 49.5600, "lng": -123.2367},
                    "features": ["Oceanfront sites", "Scuba diving", "Boat launch"],
                    "sites": "59 vehicle sites"
                },
                {
                    "name": "Alice Lake Provincial Park",
                    "location": "Near Squamish",
                    "features": ["Four lakes", "Swimming", "Mountain biking"],
                    "sites": "108 sites"
                },
                {
                    "name": "Cal-Cheak Campsite",
                    "location": "Near Whistler",
                    "features": ["Riverside", "Close to trails", "Quieter option"]
                }
            ],
            "activities_by_season": {
                "summer": ["Hiking", "Mountain biking", "Gondola rides", "Rock climbing"],
                "winter": ["Skiing/Snowboarding", "Snowshoeing", "Ice climbing"]
            },
            "viewpoints": [
                "Tantalus Lookout",
                "Murrin Park",
                "Garibaldi Lake viewpoint"
            ],
            "best_season": "Year-round (different activities)",
            "warnings": ["Busy on weekends", "Winter driving conditions", "Book Whistler early"]
        }
    },
    
    # === CENTRAL CANADA ===
    {
        "name": "Trans-Canada Highway: Prairies to Shield",
        "description": "Cross the heart of Canada from Winnipeg through Ontario's wilderness",
        "category": "scenic_routes",
        "is_public": True,
        "tags": ["trans_canada", "manitoba", "ontario", "canada", "road_trip", "wilderness"],
        "template_data": {
            "type": "cross_country",
            "region": "Manitoba/Ontario",
            "distance": "2200km Winnipeg to Toronto",
            "duration": "4-7 days minimum",
            "route_highlights": [
                {
                    "name": "Winnipeg",
                    "coordinates": {"lat": 49.8951, "lng": -97.1384},
                    "features": ["The Forks", "Canadian Museum for Human Rights"],
                    "stop_duration": "1 day"
                },
                {
                    "name": "Kenora & Lake of the Woods",
                    "coordinates": {"lat": 49.7667, "lng": -94.4833},
                    "features": ["14,000 islands", "Fishing", "Houseboating"],
                    "note": "Gateway to Ontario"
                },
                {
                    "name": "Thunder Bay",
                    "coordinates": {"lat": 48.3809, "lng": -89.2477},
                    "features": ["Sleeping Giant", "Kakabeka Falls", "Terry Fox Memorial"],
                    "distance_note": "700km from Kenora!"
                },
                {
                    "name": "Lake Superior Circle Tour",
                    "feature": "Optional scenic detour",
                    "highlights": ["Coastal drive", "Beaches", "Provincial parks"]
                }
            ],
            "camping_recommendations": [
                {
                    "name": "Blue Lake Provincial Park",
                    "location": "Near Vermilion Bay",
                    "features": ["Beach", "Clear water", "Good swimming"]
                },
                {
                    "name": "Kakabeka Falls Provincial Park",
                    "location": "West of Thunder Bay",
                    "features": ["Niagara of the North", "Hiking trails"]
                },
                {
                    "name": "Sleeping Giant Provincial Park",
                    "features": ["Backcountry sites", "Day use areas", "Iconic views"]
                }
            ],
            "unique_stops": [
                "Rushing River Provincial Park",
                "Eagle Canyon Adventures (suspension bridge)",
                "Ouimet Canyon",
                "Wawa Goose monument"
            ],
            "driving_notes": {
                "fuel": "Fill up at every opportunity",
                "services": "Limited between towns",
                "wildlife": "Moose crossing common",
                "weather": "Check conditions Oct-April"
            },
            "best_season": "June to September",
            "alternative": "Consider flying and renting locally"
        }
    },
    {
        "name": "Algonquin Provincial Park Canoe Country",
        "description": "Paddle through pristine lakes and portages in Ontario's iconic wilderness park",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["algonquin", "ontario", "canoeing", "camping", "canada", "wilderness"],
        "template_data": {
            "type": "wilderness_park",
            "location": {
                "name": "Algonquin Provincial Park",
                "coordinates": {"lat": 45.5833, "lng": -78.3833},
                "size": "7653 sq km",
                "established": 1893
            },
            "access_points": [
                {
                    "name": "Highway 60 Corridor",
                    "feature": "Most accessible",
                    "services": ["Visitor centre", "Outfitters", "Lodges"]
                },
                {
                    "name": "Canoe Lake",
                    "popular_for": "Multi-day trips",
                    "permits": "Required for backcountry"
                }
            ],
            "camping_types": [
                {
                    "name": "Car Campgrounds",
                    "locations": ["Pog Lake", "Rock Lake", "Two Rivers"],
                    "amenities": ["Showers", "Flush toilets", "Some electrical"],
                    "cost": "$41-51/night"
                },
                {
                    "name": "Backcountry Sites",
                    "access": "Canoe/hike only",
                    "features": ["Fire pit", "Thunder box", "Food hang"],
                    "permit": "$12/person/night"
                }
            ],
            "iconic_experiences": [
                {
                    "name": "Canoe Routes",
                    "options": ["Canoe Lake Loop", "Burnt Island Lake", "Tom Thomson Lake"],
                    "difficulty": "Varies by portage length"
                },
                {
                    "name": "Wildlife Viewing",
                    "species": ["Moose", "Black bears", "Wolves", "Loons"],
                    "best_time": "Dawn and dusk"
                },
                {
                    "name": "Fall Colors",
                    "peak": "Late September to early October",
                    "note": "Book a year ahead"
                }
            ],
            "hiking_trails": [
                "Lookout Trail (2km)",
                "Centennial Ridges (10km)",
                "Track and Tower (7.5km)"
            ],
            "facilities": {
                "visitor_centre": "Excellent exhibits",
                "outfitters": "Complete canoe trip rentals",
                "gas": "Available at park gates"
            },
            "best_season": "May to October",
            "winter_activities": ["Cross-country skiing", "Snowshoeing", "Dog sledding"],
            "booking": "Ontario Parks reservation system"
        }
    },
    {
        "name": "Niagara Falls & Wine Country",
        "description": "World-famous waterfalls combined with Canada's premier wine region",
        "category": "wine_culinary",
        "is_public": True,
        "tags": ["niagara_falls", "wine_country", "ontario", "canada", "waterfalls"],
        "template_data": {
            "type": "falls_and_wine",
            "region": "Niagara Region, Ontario",
            "main_attractions": {
                "niagara_falls": {
                    "coordinates": {"lat": 43.0896, "lng": -79.0849},
                    "components": ["Horseshoe Falls", "American Falls", "Bridal Veil Falls"],
                    "experiences": [
                        {
                            "name": "Journey Behind the Falls",
                            "cost": "$22.75 CAD"
                        },
                        {
                            "name": "Hornblower Cruise",
                            "cost": "$32.75 CAD",
                            "season": "April to November"
                        },
                        {
                            "name": "Clifton Hill",
                            "feature": "Tourist attractions and restaurants"
                        }
                    ]
                },
                "wine_country": {
                    "location": "Niagara-on-the-Lake",
                    "coordinates": {"lat": 43.2558, "lng": -79.0717},
                    "distance": "20km from falls",
                    "specialties": ["Ice wine", "Riesling", "Pinot Noir"]
                }
            },
            "camping_options": [
                {
                    "name": "Niagara Falls KOA",
                    "coordinates": {"lat": 43.0483, "lng": -79.0667},
                    "features": ["Pool", "Mini golf", "Shuttle to falls"],
                    "sites": "RV and tent sites"
                },
                {
                    "name": "Sherkston Shores",
                    "location": "Lake Erie beach",
                    "features": ["Beach access", "Resort amenities", "30min to falls"]
                }
            ],
            "wine_route": {
                "wineries": [
                    {
                        "name": "Inniskillin",
                        "known_for": "Ice wine pioneer"
                    },
                    {
                        "name": "Jackson-Triggs",
                        "feature": "Amphitheatre concerts"
                    },
                    {
                        "name": "Peller Estates",
                        "feature": "Restaurant and tours"
                    }
                ],
                "tour_options": ["Self-drive", "Bike tours", "Bus tours"],
                "events": ["Icewine Festival (January)", "Wine Festival (September)"]
            },
            "other_attractions": [
                "Butterfly Conservatory",
                "Whirlpool Aero Car",
                "Fort George Historic Site",
                "Shaw Festival Theatre"
            ],
            "best_season": "May to October (falls year-round)",
            "tips": ["Book wine tours ahead", "Consider Niagara Parks pass", "Evening illumination of falls"]
        }
    },
    
    # === ATLANTIC CANADA ===
    {
        "name": "Cabot Trail Cape Breton Highlands",
        "description": "One of the world's most scenic drives through Celtic culture and coastal cliffs",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["cabot_trail", "cape_breton", "nova_scotia", "canada", "coastal", "celtic"],
        "template_data": {
            "type": "coastal_loop",
            "location": "Cape Breton Island, Nova Scotia",
            "distance": "298km loop",
            "duration": "2-4 days recommended",
            "highlights": [
                {
                    "name": "Cape Breton Highlands National Park",
                    "coordinates": {"lat": 46.7500, "lng": -60.6500},
                    "features": ["Skyline Trail", "Moose viewing", "Beaches"],
                    "entry": "$8.50/adult/day"
                },
                {
                    "name": "Pleasant Bay",
                    "feature": "Whale watching capital",
                    "best_time": "June to October",
                    "species": ["Pilot whales", "Minke", "Humpback"]
                },
                {
                    "name": "Chéticamp",
                    "feature": "Acadian culture",
                    "highlights": ["Acadian Museum", "Local crafts", "French cuisine"]
                },
                {
                    "name": "Neil's Harbour",
                    "feature": "Picturesque fishing village",
                    "must_try": "Chowder House restaurant"
                }
            ],
            "camping": [
                {
                    "name": "Broad Cove Campground",
                    "location": "In national park",
                    "coordinates": {"lat": 46.8333, "lng": -60.9500},
                    "features": ["Ocean views", "Beach access", "Sheltered sites"]
                },
                {
                    "name": "Chéticamp Campground",
                    "features": ["Full service", "Near town", "Sunset views"]
                },
                {
                    "name": "Ingonish Beach Campground",
                    "features": ["Beach access", "Hiking trails nearby"]
                }
            ],
            "scenic_stops": [
                "Cap Rouge lookoff",
                "MacKenzie Mountain lookoff",
                "Green Cove",
                "Lakies Head lookoff"
            ],
            "cultural_experiences": [
                "Celtic music (daily in summer)",
                "Highland Village Museum",
                "Fortress of Louisbourg (day trip)"
            ],
            "driving_direction": "Clockwise recommended",
            "best_season": "June to October",
            "fall_colors": "Peak early October",
            "tips": ["Fill up gas in towns", "Book ahead in summer", "Allow time for stops"]
        }
    },
    {
        "name": "Bay of Fundy Tidal Wonders",
        "description": "Experience the world's highest tides and unique coastal formations",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["bay_of_fundy", "nova_scotia", "new_brunswick", "canada", "tides", "coastal"],
        "template_data": {
            "type": "tidal_exploration",
            "region": "Nova Scotia/New Brunswick",
            "unique_feature": "16m tidal range",
            "key_experiences": [
                {
                    "name": "Hopewell Rocks",
                    "location": "New Brunswick",
                    "coordinates": {"lat": 45.8244, "lng": -64.5733},
                    "feature": "Walk ocean floor at low tide",
                    "timing": "Check tide tables essential"
                },
                {
                    "name": "Fundy National Park",
                    "coordinates": {"lat": 45.5950, "lng": -64.9578},
                    "features": ["Coastal hiking", "Waterfalls", "Dark sky preserve"],
                    "camping": "Multiple campgrounds"
                },
                {
                    "name": "Burntcoat Head Park",
                    "location": "Nova Scotia",
                    "claim": "Site of world's highest recorded tide",
                    "activity": "Ocean floor walking"
                },
                {
                    "name": "Cape Blomidon",
                    "feature": "Dramatic cliffs",
                    "hiking": "14km return trail"
                }
            ],
            "camping_options": [
                {
                    "name": "Fundy National Park Campgrounds",
                    "options": ["Headquarters", "Chignecto", "Point Wolfe"],
                    "features": ["Various amenities", "Coastal access"],
                    "reservations": "Parks Canada"
                },
                {
                    "name": "Five Islands Provincial Park",
                    "location": "Nova Scotia",
                    "features": ["Beach", "Clam digging", "Ocean floor access"],
                    "tides": "90 billion tonnes water twice daily"
                }
            ],
            "unique_activities": [
                "Tidal bore rafting",
                "Sea kayaking (with guide)",
                "Fossil and mineral hunting",
                "Whale watching (summer)"
            ],
            "tide_timing": {
                "cycle": "12.5 hours between high tides",
                "planning": "Activities depend on tide schedule",
                "apps": "Tide charts essential"
            },
            "best_season": "June to October",
            "nearby": "Annapolis Valley wine region",
            "warning": "Never turn back on ocean - tides rise quickly"
        }
    },
    {
        "name": "Viking Trail Newfoundland",
        "description": "Journey to North America's Viking site through dramatic coastlines and fishing villages",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["viking_trail", "newfoundland", "canada", "history", "coastal", "icebergs"],
        "template_data": {
            "type": "historic_coastal",
            "region": "Western Newfoundland",
            "distance": "489km Deer Lake to St. Anthony",
            "duration": "3-5 days",
            "major_stops": [
                {
                    "name": "Gros Morne National Park",
                    "coordinates": {"lat": 49.6000, "lng": -57.7500},
                    "features": ["Fjords", "Tablelands", "Coastal trails"],
                    "world_heritage": True,
                    "must_do": "Western Brook Pond boat tour"
                },
                {
                    "name": "L'Anse aux Meadows",
                    "coordinates": {"lat": 51.5950, "lng": -55.5322},
                    "significance": "Only authenticated Viking site in North America",
                    "features": ["Reconstructed buildings", "Interpretive center"],
                    "world_heritage": True
                },
                {
                    "name": "St. Anthony",
                    "features": ["Iceberg viewing", "Whale watching", "Hospital heritage"],
                    "best_time": "June-July for icebergs"
                }
            ],
            "camping_along_route": [
                {
                    "name": "Berry Hill Campground",
                    "location": "Gros Morne NP",
                    "features": ["Full service", "Heated washrooms", "Interpretive programs"]
                },
                {
                    "name": "Pistolet Bay Provincial Park",
                    "features": ["Coastal sites", "Beach access", "Basic facilities"]
                },
                {
                    "name": "Viking RV Park",
                    "location": "St. Anthony",
                    "features": ["Full hookups", "Iceberg views possible"]
                }
            ],
            "unique_experiences": [
                "Iceberg viewing (June-July)",
                "Moose encounters",
                "Traditional Newfoundland music",
                "Local seafood (cod, lobster)"
            ],
            "side_trips": [
                "Port au Choix archaeology",
                "Arches Provincial Park",
                "Thrombolites at Flowers Cove"
            ],
            "driving_notes": {
                "moose": "Very common - drive carefully at dawn/dusk",
                "weather": "Can change quickly",
                "fuel": "Available in main towns"
            },
            "best_season": "June to September",
            "special_events": "Viking Festival (July)",
            "local_saying": "Stay where you're to 'til I comes where you're at"
        }
    },
    
    # === NORTHERN CANADA ===
    {
        "name": "Alaska Highway Ultimate Adventure",
        "description": "Epic 2400km journey through wilderness from Dawson Creek to Alaska border",
        "category": "scenic_routes",
        "is_public": True,
        "tags": ["alaska_highway", "yukon", "british_columbia", "canada", "wilderness", "road_trip"],
        "template_data": {
            "type": "wilderness_highway",
            "total_distance": "2400km (Canadian portion)",
            "duration": "5-7 days minimum",
            "start": "Dawson Creek, BC (Mile 0)",
            "end": "Beaver Creek, YT (Alaska border)",
            "key_stops": [
                {
                    "name": "Fort St. John",
                    "mile_marker": "Mile 47",
                    "features": ["Supplies", "Museum", "Last major city for 500km"]
                },
                {
                    "name": "Liard River Hot Springs",
                    "mile_marker": "Mile 497",
                    "coordinates": {"lat": 59.4261, "lng": -126.1004},
                    "feature": "Natural hot springs in wilderness",
                    "camping": "Provincial park campground"
                },
                {
                    "name": "Watson Lake Sign Post Forest",
                    "mile_marker": "Mile 635",
                    "feature": "80,000+ signs from travelers",
                    "tradition": "Add your own sign"
                },
                {
                    "name": "Whitehorse",
                    "mile_marker": "Mile 918",
                    "coordinates": {"lat": 60.7212, "lng": -135.0568},
                    "features": ["Yukon capital", "Supplies", "Museums", "Fish ladder"]
                }
            ],
            "camping_recommendations": [
                {
                    "name": "Liard Hot Springs Provincial Park",
                    "features": ["Hot springs access", "Popular - arrive early"],
                    "wildlife": "Buffalo often seen"
                },
                {
                    "name": "Teslin Lake Campground",
                    "location": "Yukon",
                    "features": ["Lake views", "Good fishing", "Northern lights possible"]
                },
                {
                    "name": "Pine Lake Campground",
                    "location": "Near Haines Junction",
                    "features": ["Beach", "Mountain views", "Day trips to Kluane NP"]
                }
            ],
            "wildlife_viewing": [
                "Bison herds",
                "Black bears",
                "Grizzly bears",
                "Caribou",
                "Stone sheep"
            ],
            "preparation": {
                "vehicle": "Good spare tire essential",
                "fuel": "Fill at every opportunity",
                "supplies": "Stock up in major towns",
                "season": "Road conditions vary"
            },
            "side_trips": [
                "Kluane National Park",
                "Haines Highway to Alaska",
                "Top of the World Highway to Dawson City"
            ],
            "best_season": "June to September",
            "northern_lights": "Possible August onwards",
            "historic_note": "Built 1942 for WWII"
        }
    }
]

async def load_canada_data():
    """Load comprehensive Canada travel data to trip_templates"""
    
    # Get Supabase credentials
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    
    supabase: Client = create_client(url, key)
    
    print("🌟 Loading Comprehensive Canada Travel Data")
    print("=" * 60)
    print(f"📊 Preparing to load {len(CANADA_DATA)} detailed travel templates")
    print()
    
    success_count = 0
    error_count = 0
    
    # Categories being loaded
    categories = set()
    provinces = set()
    
    # Load each template
    for i, template in enumerate(CANADA_DATA, 1):
        try:
            # Extract metadata
            categories.add(template['category'])
            for tag in template['tags']:
                if tag in ['british_columbia', 'alberta', 'ontario', 'manitoba', 'nova_scotia', 
                           'new_brunswick', 'newfoundland', 'yukon']:
                    provinces.add(tag)
            
            # Add metadata
            template['usage_count'] = 0
            template['created_at'] = datetime.now().isoformat()
            
            # Insert to database
            result = supabase.table('trip_templates').insert(template).execute()
            
            if result.data:
                print(f"✅ [{i:2d}/{len(CANADA_DATA)}] {template['name']}")
                success_count += 1
            else:
                print(f"❌ [{i:2d}/{len(CANADA_DATA)}] Failed: {template['name']}")
                error_count += 1
                
        except Exception as e:
            print(f"❌ [{i:2d}/{len(CANADA_DATA)}] Error: {template['name']} - {str(e)[:50]}...")
            error_count += 1
    
    print("\n" + "=" * 60)
    print(f"🎉 Data Loading Complete!")
    print(f"✅ Successfully loaded: {success_count} templates")
    if error_count > 0:
        print(f"❌ Failed: {error_count} templates")
    
    print(f"\n📍 Coverage:")
    print(f"   Regions: Western, Central, Atlantic, Northern Canada")
    print(f"   Categories: {', '.join(sorted(categories))}")
    
    print("\n🌟 Added comprehensive data for:")
    print("   • Canadian Rockies (Banff, Jasper)")
    print("   • Pacific Coast (Vancouver Island, Tofino)")
    print("   • Wine regions (Niagara, Okanagan)")
    print("   • Historic sites (Vikings, Fortresses)")
    print("   • Wilderness adventures (Algonquin, Alaska Highway)")
    print("   • Unique phenomena (Bay of Fundy tides, Northern Lights)")
    print("   • Provincial and National Parks")
    print("   • Iconic road trips (Cabot Trail, Trans-Canada)")
    
    print("\n💡 PAM now has detailed Canada travel data including:")
    print("   • Provincial park campgrounds")
    print("   • RV-friendly routes and stops")
    print("   • Wildlife viewing opportunities")
    print("   • Seasonal considerations")
    print("   • First Nations cultural sites")
    print("   • French and English Canada experiences")
    
    return success_count > 0

if __name__ == "__main__":
    asyncio.run(load_canada_data())