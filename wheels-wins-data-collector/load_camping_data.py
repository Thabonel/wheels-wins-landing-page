#!/usr/bin/env python3
"""
Load comprehensive camping data (free camping & RV parks) to trip_templates
This includes boondocking, wild camping, and full-service RV resorts
"""

import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime
import json

load_dotenv()

# Comprehensive camping data for all countries
CAMPING_DATA = [
    # === AUSTRALIA FREE CAMPING ===
    {
        "name": "Australia Free Camping Ultimate Guide",
        "description": "Best free and low-cost camping spots across Australia for RVs and tents",
        "category": "free_camping",
        "is_public": True,
        "tags": ["free_camping", "australia", "boondocking", "rest_areas", "national_parks", "budget"],
        "template_data": {
            "type": "free_camping_guide",
            "country": "Australia",
            "apps_tools": ["WikiCamps", "CamperMate", "FreeRange Camping"],
            "rules": {
                "general": "Varies by state and council",
                "common_limits": "24-48 hours in rest areas",
                "leave_no_trace": "Essential - take all rubbish"
            },
            "free_camping_spots": [
                # Queensland
                {
                    "name": "Fisherman's Beach",
                    "state": "Queensland",
                    "coordinates": {"lat": -25.2833, "lng": 152.8500},
                    "type": "beach_camping",
                    "features": ["Beach access", "Fishing", "Dogs allowed"],
                    "facilities": ["Toilets", "Cold showers"],
                    "stay_limit": "3 nights",
                    "cost": "Free",
                    "suitable_for": ["Tents", "Caravans", "Motorhomes"],
                    "best_for": "Beach lovers"
                },
                {
                    "name": "Cania Gorge National Park",
                    "state": "Queensland",
                    "coordinates": {"lat": -24.6833, "lng": 150.9833},
                    "type": "national_park",
                    "features": ["Gorge walks", "Aboriginal art", "Wildlife"],
                    "facilities": ["Toilets", "Picnic tables", "Fire pits"],
                    "cost": "$6.75/person/night",
                    "booking": "Not required",
                    "generators": "Not permitted"
                },
                {
                    "name": "Lake Awoonga",
                    "state": "Queensland",
                    "coordinates": {"lat": -24.0744, "lng": 151.3044},
                    "type": "lake_camping",
                    "features": ["Barramundi fishing", "Boat ramp", "Swimming"],
                    "facilities": ["Toilets", "BBQs", "Playground"],
                    "stay_limit": "7 nights",
                    "cost": "Free",
                    "popular": "Book powered sites"
                },
                # New South Wales
                {
                    "name": "Bendeela Recreation Area",
                    "state": "New South Wales",
                    "coordinates": {"lat": -34.6500, "lng": 150.4833},
                    "type": "riverside",
                    "features": ["Kangaroo Valley", "River access", "Platypus"],
                    "facilities": ["Toilets", "Picnic areas", "Fire pits"],
                    "cost": "$10/vehicle/night",
                    "no_bookings": "First come first served",
                    "popular_times": "Busy weekends"
                },
                {
                    "name": "Mooball Creek Rest Area",
                    "state": "New South Wales",
                    "highway": "Pacific Highway",
                    "coordinates": {"lat": -28.4167, "lng": 153.4667},
                    "type": "rest_area",
                    "features": ["Level sites", "Pet friendly", "Quiet"],
                    "facilities": ["Toilets", "Picnic tables"],
                    "stay_limit": "24 hours",
                    "cost": "Free",
                    "suitable_for": "All RV sizes"
                },
                # Victoria
                {
                    "name": "Aire River Rest Area",
                    "state": "Victoria",
                    "location": "Great Ocean Road",
                    "coordinates": {"lat": -38.7167, "lng": 143.4833},
                    "type": "rest_area",
                    "features": ["River access", "Rainforest", "Level ground"],
                    "facilities": ["Toilets", "Tables"],
                    "stay_limit": "24 hours",
                    "cost": "Free",
                    "warning": "Fills early in summer"
                },
                {
                    "name": "Lake Cobbler",
                    "state": "Victoria",
                    "coordinates": {"lat": -37.0500, "lng": 146.8833},
                    "type": "free_bush_camp",
                    "features": ["Alpine lake", "4WD access", "Hiking"],
                    "facilities": "None - bush camping",
                    "access": "4WD only - rough track",
                    "best_season": "December to April",
                    "note": "Experienced campers only"
                },
                # South Australia
                {
                    "name": "Chinaman Creek Conservation Park",
                    "state": "South Australia",
                    "coordinates": {"lat": -34.0833, "lng": 139.7500},
                    "type": "conservation_park",
                    "features": ["River red gums", "Murray River access"],
                    "facilities": ["Drop toilets"],
                    "cost": "Free",
                    "fire_restrictions": "Check CFS",
                    "access": "2WD suitable"
                },
                {
                    "name": "Pink Lake",
                    "state": "South Australia",
                    "coordinates": {"lat": -35.5167, "lng": 138.5000},
                    "type": "rest_area",
                    "features": ["Pink lake views", "Unique landscape"],
                    "facilities": ["Toilets", "Info boards"],
                    "stay_limit": "24 hours",
                    "cost": "Free",
                    "instagram": "Popular photo spot"
                },
                # Western Australia
                {
                    "name": "Lucky Bay",
                    "state": "Western Australia",
                    "location": "Cape Le Grand NP",
                    "coordinates": {"lat": -33.9950, "lng": 122.2319},
                    "type": "beach_camping",
                    "features": ["Kangaroos on beach", "White sand", "Turquoise water"],
                    "facilities": ["Toilets", "Gas BBQs"],
                    "cost": "$15/person/night",
                    "booking": "Parks & Wildlife",
                    "must_see": "Australia's whitest sand"
                },
                {
                    "name": "80 Mile Beach",
                    "state": "Western Australia",
                    "coordinates": {"lat": -19.5000, "lng": 121.0000},
                    "type": "beach_camping",
                    "features": ["Endless beach", "Shells", "Fishing", "Sunsets"],
                    "facilities": "Basic toilets only",
                    "stay_limit": "No limit",
                    "cost": "Free",
                    "tides": "Extreme - plan accordingly"
                },
                # Tasmania
                {
                    "name": "Coles Bay Free Camp",
                    "state": "Tasmania",
                    "coordinates": {"lat": -42.1167, "lng": 148.2833},
                    "type": "coastal_reserve",
                    "features": ["Near Freycinet NP", "Beach access"],
                    "facilities": ["Toilets"],
                    "stay_limit": "2 nights",
                    "cost": "Free",
                    "alternative": "When national park full"
                },
                # Northern Territory
                {
                    "name": "Daly Waters Rest Area",
                    "state": "Northern Territory",
                    "coordinates": {"lat": -16.2500, "lng": 133.3667},
                    "type": "rest_area",
                    "features": ["Historic pub nearby", "Outback experience"],
                    "facilities": ["Toilets", "Tables"],
                    "stay_limit": "24 hours",
                    "cost": "Free",
                    "tip": "Visit famous pub"
                }
            ],
            "free_camping_tips": [
                "Download offline maps",
                "Carry extra water",
                "Have backup camp options",
                "Arrive before dark",
                "Respect locals and environment",
                "Check fire restrictions",
                "Never camp alone in remote areas"
            ],
            "state_specifics": {
                "Queensland": "Many rest areas allow 24-48hr stays",
                "NSW": "Limited free camping, many low-cost options",
                "Victoria": "Good free camping in state forests",
                "SA": "Generous with free camps",
                "WA": "Vast distances, plan fuel carefully",
                "Tasmania": "Limited free options, affordable camps",
                "NT": "Remote camping, be self-sufficient"
            }
        }
    },
    
    # === AUSTRALIA RV PARKS ===
    {
        "name": "Australia's Best RV Parks & Holiday Parks",
        "description": "Top-rated caravan parks and RV resorts with full facilities across Australia",
        "category": "rv_parks",
        "is_public": True,
        "tags": ["rv_parks", "caravan_parks", "australia", "holiday_parks", "big4", "top_parks"],
        "template_data": {
            "type": "rv_park_guide",
            "country": "Australia",
            "major_chains": ["BIG4", "Top Parks", "Discovery Parks", "NRMA"],
            "premium_parks": [
                {
                    "name": "BIG4 Airlie Cove Resort",
                    "state": "Queensland",
                    "location": "Airlie Beach",
                    "coordinates": {"lat": -20.2686, "lng": 148.7144},
                    "features": [
                        "Resort-style pool",
                        "Kids water park",
                        "Mini golf",
                        "Restaurant",
                        "Close to Whitsundays"
                    ],
                    "sites": ["Powered", "Ensuite", "Cabins"],
                    "price_range": "$55-85/night powered",
                    "big_rig_friendly": True,
                    "book_ahead": "Essential in season",
                    "highlight": "Gateway to Great Barrier Reef"
                },
                {
                    "name": "Discovery Parks - Byron Bay",
                    "state": "New South Wales",
                    "coordinates": {"lat": -28.6474, "lng": 153.6020},
                    "features": [
                        "Beach access",
                        "Pool complex",
                        "Tennis courts",
                        "Camp kitchen",
                        "Shuttle to town"
                    ],
                    "sites": ["Beachfront", "Powered", "Villas"],
                    "price_range": "$65-150/night",
                    "peak_season": "Extremely busy Dec-Jan",
                    "tip": "Book 6 months ahead for summer"
                },
                {
                    "name": "BIG4 Beacon Resort",
                    "state": "Victoria",
                    "location": "Queenscliff",
                    "coordinates": {"lat": -38.2669, "lng": 144.6614},
                    "features": [
                        "Indoor heated pool",
                        "Cinema",
                        "Games room",
                        "Jumping pillow",
                        "Close to ferry"
                    ],
                    "unique": "Victorian seaside charm",
                    "sites": "Mix of sizes available",
                    "price_range": "$50-75/night"
                },
                {
                    "name": "Adelaide Shores",
                    "state": "South Australia",
                    "coordinates": {"lat": -34.9833, "lng": 138.5000},
                    "features": [
                        "Beachfront",
                        "Mega playground",
                        "BMX track",
                        "Water activities",
                        "15min to Adelaide CBD"
                    ],
                    "sites": ["Powered", "Ensuite", "Cabins"],
                    "price_range": "$45-70/night",
                    "family_rating": "Excellent"
                },
                {
                    "name": "RAC Cervantes Holiday Park",
                    "state": "Western Australia",
                    "coordinates": {"lat": -30.5053, "lng": 115.0628},
                    "features": [
                        "Near Pinnacles Desert",
                        "Beach access",
                        "Pool",
                        "Modern facilities",
                        "Dark sky viewing"
                    ],
                    "highlight": "Pinnacles at sunset",
                    "sites": "Large sites available",
                    "price_range": "$40-60/night"
                },
                {
                    "name": "Launceston Holiday Park",
                    "state": "Tasmania",
                    "coordinates": {"lat": -41.4545, "lng": 147.1397},
                    "features": [
                        "City convenience",
                        "Heated amenities",
                        "Camp kitchen",
                        "Pet friendly",
                        "Near Cataract Gorge"
                    ],
                    "base_for": "Exploring northern Tasmania",
                    "sites": "All types",
                    "price_range": "$35-55/night"
                }
            ],
            "amenity_guide": {
                "powered_sites": "Usually 15amp, some 10amp",
                "water": "Potable at most parks",
                "dump_points": "Standard at holiday parks",
                "wifi": "Often limited/paid",
                "laundry": "Coin operated standard",
                "camp_kitchen": "Common in larger parks",
                "pools": "Heated in southern states"
            },
            "booking_tips": [
                "School holidays book 3-6 months ahead",
                "Join park loyalty programs for discounts",
                "Midweek often cheaper",
                "Powered sites book out first",
                "Check cancellation policies"
            ],
            "budget_options": [
                "Showgrounds often $15-25/night",
                "Council parks usually cheaper",
                "Pub stopovers sometimes free with meal",
                "Farm stays good value"
            ]
        }
    },
    
    # === NEW ZEALAND CAMPING ===
    {
        "name": "New Zealand Freedom Camping & Holiday Parks",
        "description": "DOC sites, freedom camping spots, and holiday parks across Aotearoa",
        "category": "free_camping",
        "is_public": True,
        "tags": ["freedom_camping", "new_zealand", "doc_sites", "holiday_parks", "self_contained"],
        "template_data": {
            "type": "camping_guide",
            "country": "New Zealand",
            "regulations": {
                "self_contained": "Required for most freedom camping",
                "certification": "Must display sticker",
                "penalties": "$200-400 for violations",
                "apps": ["CamperMate", "Rankers", "WikiCamps NZ"]
            },
            "doc_campgrounds": [
                {
                    "name": "Lake Pukaki DOC",
                    "island": "South Island",
                    "coordinates": {"lat": -44.1680, "lng": 170.2090},
                    "type": "basic",
                    "features": ["Turquoise lake views", "Mt Cook views", "Dark sky reserve"],
                    "facilities": ["Toilets", "Water", "Tables"],
                    "cost": "$8 adult/night",
                    "payment": "Honesty box",
                    "highlight": "Stunning mountain reflections"
                },
                {
                    "name": "Cascade Creek",
                    "island": "South Island",
                    "location": "Milford Road",
                    "coordinates": {"lat": -44.7833, "lng": 168.0167},
                    "type": "basic",
                    "features": ["Riverside", "Rainforest", "Near Milford Sound"],
                    "facilities": ["Toilets", "Tables"],
                    "cost": "$15 adult/night",
                    "no_bookings": "First come first served"
                },
                {
                    "name": "Waikawau Bay",
                    "island": "North Island",
                    "location": "Coromandel",
                    "coordinates": {"lat": -36.5333, "lng": 175.5667},
                    "type": "coastal",
                    "features": ["Remote beach", "Surfing", "Hiking"],
                    "facilities": ["Toilets", "Cold shower"],
                    "cost": "$10 adult/night",
                    "access": "Gravel road - take care"
                }
            ],
            "freedom_camping_spots": [
                {
                    "name": "Lake Dunstan",
                    "island": "South Island",
                    "coordinates": {"lat": -45.0333, "lng": 169.2000},
                    "type": "lakeside",
                    "features": ["Lake views", "Cycling trail", "Wineries nearby"],
                    "requirements": "Self-contained only",
                    "stay_limit": "2 nights",
                    "facilities": ["Toilets", "Dump station nearby"],
                    "popular": "Arrive early for best spots"
                },
                {
                    "name": "Omarama Freedom Camp",
                    "island": "South Island",
                    "coordinates": {"lat": -44.4833, "lng": 169.9667},
                    "type": "town_freedom_camp",
                    "features": ["Mountain views", "Near hot tubs", "Gliding capital"],
                    "facilities": ["Toilets", "Water", "Dump station"],
                    "cost": "Free",
                    "stay_limit": "2 nights",
                    "self_contained": "Required"
                },
                {
                    "name": "Tauranga Bay",
                    "island": "North Island",
                    "location": "Westport",
                    "coordinates": {"lat": -41.7333, "lng": 171.4333},
                    "type": "coastal",
                    "features": ["Seal colony", "Surfing", "Rock pools"],
                    "facilities": ["Toilets"],
                    "suitable": "All vehicles",
                    "stay_limit": "3 nights"
                }
            ],
            "top_holiday_parks": [
                {
                    "name": "Queenstown Lakeview Holiday Park",
                    "coordinates": {"lat": -45.0356, "lng": 168.6689},
                    "features": [
                        "Lake & mountain views",
                        "Walking distance to town",
                        "Gondola nearby"
                    ],
                    "price_range": "$50-80 NZD/night",
                    "book_ahead": "Essential year-round"
                },
                {
                    "name": "Franz Josef TOP 10",
                    "coordinates": {"lat": -43.3892, "lng": 170.1831},
                    "features": [
                        "Rainforest setting",
                        "Hot pools nearby",
                        "Glacier tours"
                    ],
                    "facilities": ["Kitchen", "Pool in summer"],
                    "price_range": "$45-65 NZD/night"
                },
                {
                    "name": "Bay of Islands Holiday Park",
                    "location": "Paihia",
                    "features": [
                        "Waterfront location",
                        "Pool complex",
                        "Tour bookings"
                    ],
                    "highlight": "Dolphin tours leave from here",
                    "price_range": "$45-70 NZD/night"
                }
            ],
            "camping_etiquette": [
                "Leave no trace",
                "Use toilet facilities",
                "Don't light fires unless permitted",
                "Respect quiet hours",
                "Support local communities"
            ],
            "seasonal_notes": {
                "summer": "Dec-Feb: Book everything ahead",
                "autumn": "Mar-May: Best weather, fewer crowds",
                "winter": "Jun-Aug: Many sites closed/quiet",
                "spring": "Sep-Nov: Variable weather"
            }
        }
    },
    
    # === CANADA CAMPING ===
    {
        "name": "Canada Camping: From Provincial Parks to Boondocking",
        "description": "National parks, provincial campgrounds, and crown land camping across Canada",
        "category": "camping_parks",
        "is_public": True,
        "tags": ["camping", "canada", "national_parks", "provincial_parks", "crown_land", "rv_parks"],
        "template_data": {
            "type": "camping_guide",
            "country": "Canada",
            "park_systems": {
                "parks_canada": "National parks - often busiest",
                "provincial": "Great facilities, more availability",
                "crown_land": "Free camping where permitted",
                "private": "KOA, Good Sam, local parks"
            },
            "national_park_camping": [
                {
                    "name": "Tunnel Mountain",
                    "park": "Banff National Park",
                    "province": "Alberta",
                    "coordinates": {"lat": 51.1901, "lng": -115.5486},
                    "features": [
                        "Close to Banff townsite",
                        "Mountain views",
                        "Elk frequent visitors"
                    ],
                    "loops": ["RV sites", "Tent sites", "Walk-in tent"],
                    "amenities": ["Power sites", "Showers", "Fire pits"],
                    "price": "$28-39 CAD/night",
                    "booking": "Parks Canada reservation system",
                    "book_when": "5 months ahead for summer"
                },
                {
                    "name": "Green Point",
                    "park": "Gros Morne NP",
                    "province": "Newfoundland",
                    "coordinates": {"lat": 49.6833, "lng": -57.9667},
                    "features": [
                        "Ocean views",
                        "Beach access",
                        "Dramatic coastline"
                    ],
                    "sites": "156 (some pull-through)",
                    "amenities": ["Showers", "Kitchen shelter"],
                    "wildlife": "Moose common",
                    "price": "$26-30 CAD/night"
                },
                {
                    "name": "Mazama",
                    "park": "Pacific Rim NP",
                    "province": "British Columbia",
                    "coordinates": {"lat": 49.0167, "lng": -125.6833},
                    "features": [
                        "Old-growth rainforest",
                        "Near Long Beach",
                        "Surf culture"
                    ],
                    "note": "No RVs over 35ft",
                    "amenities": ["Flush toilets", "Food storage"],
                    "price": "$24 CAD/night"
                }
            ],
            "provincial_gems": [
                {
                    "name": "Algonquin - Rock Lake",
                    "province": "Ontario",
                    "coordinates": {"lat": 45.5333, "lng": -78.5000},
                    "features": [
                        "Canoeing paradise",
                        "Fall colors",
                        "Moose viewing"
                    ],
                    "sites": "127 car camping",
                    "facilities": ["Showers", "Laundry", "Store"],
                    "price": "$41-51 CAD/night",
                    "best_time": "September for colors"
                },
                {
                    "name": "Cypress Hills",
                    "province": "Saskatchewan",
                    "coordinates": {"lat": 49.6500, "lng": -109.5167},
                    "features": [
                        "Dark sky preserve",
                        "Highest point between Rockies & Labrador",
                        "Cooler than prairies"
                    ],
                    "facilities": ["Power sites", "Pool", "Golf"],
                    "unique": "Island of forest in prairie",
                    "price": "$25-35 CAD/night"
                },
                {
                    "name": "Fundy National Park",
                    "province": "New Brunswick",
                    "coordinates": {"lat": 45.5950, "lng": -64.9578},
                    "features": [
                        "Highest tides in world",
                        "Coastal hiking",
                        "Waterfalls"
                    ],
                    "campgrounds": ["Headquarters", "Chignecto", "Point Wolfe"],
                    "amenities": "Vary by campground",
                    "price": "$26-36 CAD/night"
                }
            ],
            "crown_land_camping": {
                "what_is_it": "Public land where camping often allowed",
                "rules": "Vary by province",
                "typical": "14-21 days in one spot",
                "free": "Yes, but no facilities",
                "find_spots": "iOverlander, Crown Land Use Atlas",
                "leave_no_trace": "Essential",
                "fire_bans": "Common in summer - check"
            },
            "rv_resorts": [
                {
                    "name": "Whistler RV Park",
                    "province": "British Columbia",
                    "features": ["Full hookups", "Mountain setting", "Year-round"],
                    "price": "$65-85 CAD/night",
                    "proximity": "Walk to Whistler Village"
                },
                {
                    "name": "Calgary West KOA",
                    "province": "Alberta",
                    "features": ["Pool", "Mini golf", "Pancake breakfast"],
                    "good_for": "Stampede accommodation",
                    "price": "$50-70 CAD/night"
                }
            ],
            "winter_camping": {
                "heated_washrooms": "Look for 4-season campgrounds",
                "electrical": "30/50 amp for RV heating",
                "popular_parks": ["Jasper", "Banff year-round sections"],
                "preparation": "Winterize or heated RV essential"
            },
            "booking_timeline": {
                "parks_canada": "Launches in January for summer",
                "bc_parks": "Discover Camping - 2 months ahead",
                "ontario_parks": "5 months ahead",
                "peak_times": "Long weekends book immediately"
            }
        }
    },
    
    # === USA CAMPING ===
    {
        "name": "USA Camping: National Parks to BLM Boondocking",
        "description": "From developed campgrounds to dispersed camping on public lands",
        "category": "camping_parks",
        "is_public": True,
        "tags": ["camping", "usa", "national_parks", "blm", "national_forest", "state_parks", "boondocking"],
        "template_data": {
            "type": "camping_guide",
            "country": "USA",
            "land_types": {
                "national_parks": "Most developed, most crowded",
                "national_forests": "Often dispersed camping allowed",
                "blm": "Bureau of Land Management - much free camping",
                "state_parks": "Hidden gems, good facilities",
                "corps_engineers": "Lakeside, good value"
            },
            "iconic_campgrounds": [
                {
                    "name": "Mather Campground",
                    "location": "Grand Canyon South Rim",
                    "state": "Arizona",
                    "coordinates": {"lat": 36.0544, "lng": -112.1401},
                    "features": [
                        "Walk to rim",
                        "Market & showers nearby",
                        "Dark sky programs"
                    ],
                    "sites": "327",
                    "amenities": ["Fire rings", "Dump station", "No hookups"],
                    "price": "$18-30/night",
                    "booking": "Recreation.gov - 6 months ahead",
                    "tip": "Book the minute reservations open"
                },
                {
                    "name": "Furnace Creek",
                    "location": "Death Valley",
                    "state": "California",
                    "coordinates": {"lat": 36.4631, "lng": -116.8694},
                    "features": [
                        "Desert oasis",
                        "Palm trees",
                        "Pool nearby"
                    ],
                    "season": "October to April",
                    "summer": "Too hot - 120°F+",
                    "amenities": ["Some power sites", "Water", "Dump station"],
                    "price": "$16-36/night"
                },
                {
                    "name": "Apgar Campground",
                    "location": "Glacier National Park",
                    "state": "Montana",
                    "coordinates": {"lat": 48.8053, "lng": -114.2283},
                    "features": [
                        "Lake McDonald access",
                        "First-come sites available",
                        "Evening programs"
                    ],
                    "sites": "194",
                    "rv_limit": "40 feet",
                    "price": "$30/night",
                    "best_sites": "A loop for RVs"
                }
            ],
            "blm_boondocking": [
                {
                    "name": "Alabama Hills",
                    "state": "California",
                    "coordinates": {"lat": 36.6061, "lng": -118.1256},
                    "features": [
                        "Movie location scenery",
                        "Mount Whitney views",
                        "Rock formations"
                    ],
                    "facilities": "Vault toilets only",
                    "stay_limit": "14 days",
                    "cost": "Free",
                    "access": "Easy - graded dirt roads",
                    "popular": "Arrive early for best spots"
                },
                {
                    "name": "Quartzsite BLM",
                    "state": "Arizona",
                    "coordinates": {"lat": 33.6603, "lng": -114.2288},
                    "features": [
                        "RV mecca in winter",
                        "Rock hounding",
                        "Huge RV show January"
                    ],
                    "options": ["Free 14-day areas", "LTVA long-term areas"],
                    "ltva_cost": "$180/season or $40/2 weeks",
                    "facilities": "Varies by area",
                    "season": "October to April"
                },
                {
                    "name": "Valley of the Gods",
                    "state": "Utah",
                    "coordinates": {"lat": 37.2667, "lng": -109.8667},
                    "features": [
                        "Mini Monument Valley",
                        "Free camping",
                        "No crowds"
                    ],
                    "road": "17-mile dirt loop",
                    "suitable": "High clearance recommended",
                    "facilities": "None",
                    "stay_limit": "14 days"
                }
            ],
            "national_forest_dispersed": [
                {
                    "name": "Sedona Area Dispersed",
                    "state": "Arizona",
                    "forest": "Coconino NF",
                    "features": [
                        "Red rock views",
                        "Multiple areas",
                        "FR525 popular"
                    ],
                    "rules": "1 mile from Sedona, 300ft from water",
                    "popular_spots": "Schnebly Hill Rd, Woody Mountain Rd",
                    "cost": "Free",
                    "limit": "14 days"
                },
                {
                    "name": "Mount Hood Dispersed",
                    "state": "Oregon",
                    "forest": "Mount Hood NF",
                    "features": [
                        "Mountain views",
                        "Forest setting",
                        "Many spots"
                    ],
                    "popular_areas": "NF-25, NF-57",
                    "elevation": "Can be cold even in summer",
                    "facilities": "None - pack out everything"
                }
            ],
            "state_park_gems": [
                {
                    "name": "Bahia Honda",
                    "state": "Florida",
                    "keys": True,
                    "features": [
                        "Best Keys beaches",
                        "Snorkeling",
                        "Old bridge views"
                    ],
                    "sites": "RV and tent",
                    "price": "$36-55/night",
                    "book": "11 months ahead"
                },
                {
                    "name": "Cape Disappointment",
                    "state": "Washington",
                    "features": [
                        "Coastal cliffs",
                        "Two lighthouses",
                        "Beach access"
                    ],
                    "sites": "220+",
                    "amenities": ["Full hookups available", "Yurts"],
                    "price": "$35-45/night"
                }
            ],
            "apps_resources": [
                "Recreation.gov - Federal campgrounds",
                "Hipcamp - Private land camping",
                "FreeRoam - Public land maps",
                "Campendium - Reviews and tips",
                "iOverlander - Boondocking spots"
            ],
            "booking_strategy": {
                "national_parks": "6 months ahead exactly",
                "popular_weekends": "Book at opening time",
                "cancellations": "Check 2-3 days before",
                "first_come": "Arrive Tue-Thu morning",
                "shoulder_season": "Much easier availability"
            }
        }
    },
    
    # === UK CAMPING ===
    {
        "name": "Great Britain Camping: From Wild Camping to Holiday Parks",
        "description": "Caravan parks, wild camping, and certificated locations across England, Scotland, and Wales",
        "category": "camping_parks",
        "is_public": True,
        "tags": ["camping", "uk", "caravan_parks", "wild_camping", "cl_sites", "certificated_sites"],
        "template_data": {
            "type": "camping_guide",
            "country": "Great Britain",
            "regulations": {
                "england_wales": "Wild camping generally not permitted except Dartmoor",
                "scotland": "Wild camping allowed under Scottish Outdoor Access Code",
                "northern_ireland": "Permission needed from landowner"
            },
            "club_sites": [
                {
                    "name": "Chatsworth Park C&MC",
                    "location": "Peak District",
                    "country": "England",
                    "coordinates": {"lat": 53.2278, "lng": -1.6119},
                    "features": [
                        "Chatsworth House estate",
                        "Premium facilities",
                        "Dog friendly"
                    ],
                    "pitches": "Multiple types including serviced",
                    "price": "£35-50/night",
                    "membership": "Caravan & Motorhome Club",
                    "book_ahead": "Popular site"
                },
                {
                    "name": "Invercoe",
                    "location": "Glencoe",
                    "country": "Scotland",
                    "coordinates": {"lat": 56.6817, "lng": -5.1283},
                    "features": [
                        "Loch views",
                        "Mountain setting",
                        "Dark skies"
                    ],
                    "facilities": ["Heated washrooms", "Laundry"],
                    "price": "£28-38/night",
                    "season": "Open all year",
                    "wildness": "In spectacular Highland glen"
                }
            ],
            "certificated_sites": {
                "what": "Small sites for 5 vans max",
                "clubs": ["Caravan & Motorhome Club", "Camping & Caravanning Club"],
                "typical_facilities": "Basic - water, waste disposal, maybe electric",
                "price": "£10-20/night typically",
                "examples": [
                    {
                        "name": "Treacle Valley",
                        "location": "Yorkshire Dales",
                        "features": ["Farm setting", "Walking trails", "Peaceful"],
                        "price": "£15/night"
                    },
                    {
                        "name": "Woodlands",
                        "location": "New Forest",
                        "features": ["Forest location", "Pony visits", "Pub nearby"],
                        "price": "£18/night"
                    }
                ]
            },
            "wild_camping_scotland": [
                {
                    "name": "Glen Nevis",
                    "coordinates": {"lat": 56.7969, "lng": -5.0036},
                    "features": [
                        "Ben Nevis access",
                        "River spots",
                        "Dramatic scenery"
                    ],
                    "rules": "Not in lower glen - go higher up",
                    "leave_no_trace": "Essential",
                    "water": "From river - purify"
                },
                {
                    "name": "Loch Lomond (outside restriction zones)",
                    "features": [
                        "Loch shores",
                        "Island views",
                        "Hiking access"
                    ],
                    "restrictions": "Camping management zones Mar-Sep",
                    "permits": "Needed in some areas",
                    "alternative": "Formal campsites in zones"
                }
            ],
            "holiday_parks": [
                {
                    "name": "Darwin Forest",
                    "location": "Peak District",
                    "features": [
                        "Woodland setting",
                        "Lodge accommodation",
                        "Family oriented"
                    ],
                    "unique": "No cars on site - parking separate",
                    "facilities": ["Pool", "Shop", "Restaurant"],
                    "price": "£30-45/night"
                },
                {
                    "name": "Hill Cottage Farm",
                    "location": "Cornwall",
                    "features": [
                        "Working farm",
                        "Near beaches",
                        "Eden Project nearby"
                    ],
                    "facilities": ["Shop", "Play areas", "Animals"],
                    "pitches": "Hardstanding and grass",
                    "price": "£25-40/night"
                },
                {
                    "name": "Beadnell Bay",
                    "location": "Northumberland",
                    "features": [
                        "Direct beach access",
                        "Coastal walks",
                        "Seal watching"
                    ],
                    "sites": "Variety including fully serviced",
                    "popular": "Book early for summer",
                    "price": "£35-55/night"
                }
            ],
            "aires_and_stopovers": {
                "britstops": "Like French Aires - pubs allowing overnight parking",
                "typical": "Free with purchase from host",
                "examples": ["Pub car parks", "Farm shops", "Vineyards"],
                "membership": "£30/year for guide book",
                "etiquette": "Buy meal/drinks, leave early, be discrete"
            },
            "practical_info": {
                "electric": "Usually 16amp, sometimes 10amp",
                "pitch_types": ["Grass", "Hardstanding", "Fully serviced"],
                "peak_season": "July-August, bank holidays",
                "weather": "Be prepared for rain anytime",
                "midges": "Scotland west coast May-September"
            },
            "booking_apps": [
                "Pitchup.com",
                "Cool Camping",
                "UK Campsite Search",
                "Park4Night"
            ]
        }
    }
]

async def load_camping_data():
    """Load comprehensive camping data to trip_templates"""
    
    # Get Supabase credentials
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    
    supabase: Client = create_client(url, key)
    
    print("🏕️ Loading Camping & RV Park Data")
    print("=" * 60)
    print(f"📊 Preparing to load {len(CAMPING_DATA)} camping guides")
    print()
    
    success_count = 0
    error_count = 0
    
    # Load each template
    for i, template in enumerate(CAMPING_DATA, 1):
        try:
            # Add metadata
            template['usage_count'] = 0
            template['created_at'] = datetime.now().isoformat()
            
            # Insert to database
            result = supabase.table('trip_templates').insert(template).execute()
            
            if result.data:
                print(f"✅ [{i}/{len(CAMPING_DATA)}] {template['name']}")
                success_count += 1
            else:
                print(f"❌ [{i}/{len(CAMPING_DATA)}] Failed: {template['name']}")
                error_count += 1
                
        except Exception as e:
            print(f"❌ [{i}/{len(CAMPING_DATA)}] Error: {template['name']} - {str(e)[:50]}...")
            error_count += 1
    
    print("\n" + "=" * 60)
    print(f"🎉 Camping Data Loading Complete!")
    print(f"✅ Successfully loaded: {success_count} templates")
    if error_count > 0:
        print(f"❌ Failed: {error_count} templates")
    
    print("\n🏕️ Added comprehensive camping data including:")
    print("   • Free camping and boondocking spots")
    print("   • RV parks and holiday parks")
    print("   • National and provincial parks")
    print("   • BLM and Crown Land camping")
    print("   • Wild camping locations")
    print("   • Booking tips and regulations")
    print("   • Facilities and amenities details")
    
    return success_count > 0

if __name__ == "__main__":
    asyncio.run(load_camping_data())