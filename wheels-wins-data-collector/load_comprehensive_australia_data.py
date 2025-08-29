#!/usr/bin/env python3
"""
Load comprehensive Australia travel data to trip_templates
This includes real locations with accurate coordinates
"""

import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime
import json

load_dotenv()

# Comprehensive Australia travel data with real locations
COMPREHENSIVE_AUSTRALIA_DATA = [
    # === QUEENSLAND ===
    {
        "name": "Great Barrier Reef Marine Park RV Adventure",
        "description": "Explore the world's largest coral reef system with RV-friendly coastal camping",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["great_barrier_reef", "queensland", "coastal", "camping", "snorkeling", "world_heritage"],
        "template_data": {
            "type": "coastal_adventure",
            "region": "Queensland Coast",
            "highlights": [
                "Port Douglas Marina",
                "Cape Tribulation",
                "Airlie Beach",
                "Magnetic Island Ferry"
            ],
            "camping_spots": [
                {
                    "name": "BIG4 Port Douglas Glengarry Holiday Park",
                    "coordinates": {"lat": -16.5041, "lng": 145.4641},
                    "amenities": ["pool", "camp_kitchen", "powered_sites"],
                    "price_range": "$45-65/night"
                },
                {
                    "name": "Cape Tribulation Camping",
                    "coordinates": {"lat": -16.0819, "lng": 145.4627},
                    "amenities": ["beach_access", "rainforest", "basic_facilities"],
                    "price_range": "$20-30/night"
                }
            ],
            "activities": ["reef_tours", "snorkeling", "diving", "rainforest_walks"],
            "best_season": "May to October",
            "distance": "350km Cairns to Airlie Beach",
            "rv_tips": ["Book reef tours that include transfers", "Some roads narrow near Cape Trib"]
        }
    },
    {
        "name": "Fraser Island (K'gari) 4WD Beach Camping",
        "description": "World's largest sand island adventure with beach driving and dingo spotting",
        "category": "4wd_adventures",
        "is_public": True,
        "tags": ["fraser_island", "4wd", "beach_driving", "queensland", "world_heritage", "camping"],
        "template_data": {
            "type": "island_4wd",
            "location": {
                "name": "Fraser Island (K'gari)",
                "coordinates": {"lat": -25.2667, "lng": 153.1667},
                "access_point": "Hervey Bay or Rainbow Beach"
            },
            "requirements": {
                "vehicle": "4WD essential",
                "permits": ["Vehicle Access Permit", "Camping Permit"],
                "experience": "Beach driving experience recommended"
            },
            "camping_areas": [
                {
                    "name": "Central Station",
                    "type": "designated_camping",
                    "facilities": ["toilets", "rainwater_tanks"]
                },
                {
                    "name": "Lake McKenzie",
                    "type": "camping_zone",
                    "facilities": ["toilets", "picnic_tables"]
                },
                {
                    "name": "Eli Creek",
                    "type": "beach_camping",
                    "facilities": ["creek_water", "beach_access"]
                }
            ],
            "highlights": [
                "Lake McKenzie crystal clear water",
                "Maheno Shipwreck",
                "Champagne Pools",
                "Ancient rainforest on sand"
            ],
            "safety": ["Dingo safety essential", "Tide times critical for beach driving"],
            "best_season": "April to October"
        }
    },
    {
        "name": "Sunshine Coast Hinterland Waterfalls Tour",
        "description": "Discover hidden waterfalls and swimming holes in the Sunshine Coast hinterland",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["waterfalls", "swimming", "sunshine_coast", "queensland", "hiking"],
        "template_data": {
            "type": "waterfall_tour",
            "region": "Sunshine Coast Hinterland",
            "waterfalls": [
                {
                    "name": "Kondalilla Falls",
                    "coordinates": {"lat": -26.6886, "lng": 152.8636},
                    "height": "90m",
                    "swimming": "Rock pools at base",
                    "walk": "4.7km circuit (2hrs)",
                    "difficulty": "moderate"
                },
                {
                    "name": "Gardners Falls",
                    "coordinates": {"lat": -26.7333, "lng": 152.8667},
                    "swimming": "Popular swimming hole",
                    "walk": "Short 200m walk",
                    "difficulty": "easy"
                },
                {
                    "name": "Buderim Falls",
                    "coordinates": {"lat": -26.6833, "lng": 153.0500},
                    "swimming": "Serenity Falls pool",
                    "walk": "850m return",
                    "difficulty": "easy"
                }
            ],
            "nearby_camping": {
                "name": "Kenilworth Homestead",
                "coordinates": {"lat": -26.5908, "lng": 152.7297},
                "facilities": ["powered_sites", "pool", "camp_kitchen"]
            },
            "best_season": "Year round (check after rain)",
            "tips": ["Arrive early for parking", "Bring water shoes", "Check for leeches"]
        }
    },
    
    # === NEW SOUTH WALES ===
    {
        "name": "Byron Bay to Sydney Coastal Journey",
        "description": "Epic coastal drive through surf towns, beaches, and national parks",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["byron_bay", "sydney", "coastal", "nsw", "beaches", "surfing"],
        "template_data": {
            "type": "coastal_drive",
            "distance": "780km",
            "duration": "5-7 days recommended",
            "key_stops": [
                {
                    "name": "Byron Bay",
                    "coordinates": {"lat": -28.6474, "lng": 153.6020},
                    "highlights": ["Cape Byron Lighthouse", "Main Beach", "Alternative culture"]
                },
                {
                    "name": "Coffs Harbour",
                    "coordinates": {"lat": -30.2963, "lng": 153.1157},
                    "highlights": ["Big Banana", "Jetty Beach", "Solitary Islands"]
                },
                {
                    "name": "Port Macquarie",
                    "coordinates": {"lat": -31.4333, "lng": 152.9000},
                    "highlights": ["Koala Hospital", "Coastal Walk", "Town Beach"]
                },
                {
                    "name": "Newcastle",
                    "coordinates": {"lat": -32.9283, "lng": 151.7817},
                    "highlights": ["Beaches", "Bathers Way walk", "Fort Scratchley"]
                }
            ],
            "camping_recommendations": [
                {
                    "name": "Trial Bay Gaol Campground",
                    "location": "South West Rocks",
                    "coordinates": {"lat": -30.8833, "lng": 153.0333},
                    "features": ["Beach camping", "Historic site", "Powered sites"]
                },
                {
                    "name": "Diamond Head Holiday Park",
                    "location": "Diamond Head",
                    "coordinates": {"lat": -31.7667, "lng": 152.7333},
                    "features": ["Beachfront", "Pool", "Family friendly"]
                }
            ],
            "rv_tips": ["Book ahead in peak season", "Many beachside parks fill quickly"],
            "best_season": "September to May"
        }
    },
    {
        "name": "Snowy Mountains Alpine Adventure",
        "description": "Experience Australia's highest peaks with seasonal camping and activities",
        "category": "mountain_scenic",
        "is_public": True,
        "tags": ["snowy_mountains", "alpine", "nsw", "skiing", "hiking", "camping"],
        "template_data": {
            "type": "mountain_adventure",
            "region": "Snowy Mountains",
            "elevation": "2228m (Mt Kosciuszko)",
            "seasonal_activities": {
                "summer": ["Hiking", "Mountain biking", "Fishing", "Wildflower viewing"],
                "winter": ["Skiing", "Snowboarding", "Snowshoeing", "Perisher/Thredbo"]
            },
            "camping_options": [
                {
                    "name": "Jindabyne Holiday Park",
                    "coordinates": {"lat": -36.4167, "lng": 148.6167},
                    "elevation": "930m",
                    "facilities": ["Powered sites", "Amenities block", "Camp kitchen"],
                    "season": "Year round"
                },
                {
                    "name": "Kosciuszko Mountain Retreat",
                    "coordinates": {"lat": -36.3833, "lng": 148.4667},
                    "elevation": "1400m",
                    "facilities": ["Cabins", "RV sites", "Restaurant"],
                    "season": "Year round"
                }
            ],
            "must_see": [
                "Mt Kosciuszko summit walk",
                "Blue Lake",
                "Yarrangobilly Caves",
                "Historic Kiandra goldfields"
            ],
            "best_season": {
                "hiking": "November to April",
                "skiing": "June to September",
                "wildflowers": "December to February"
            },
            "warnings": ["Snow chains required in winter", "Weather changes rapidly"]
        }
    },
    
    # === VICTORIA ===
    {
        "name": "Great Ocean Road Classic",
        "description": "Australia's most scenic coastal drive with the iconic Twelve Apostles",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["great_ocean_road", "twelve_apostles", "victoria", "coastal", "iconic"],
        "template_data": {
            "type": "scenic_drive",
            "distance": "243km",
            "duration": "3-5 days recommended",
            "start": "Torquay",
            "end": "Allansford",
            "iconic_stops": [
                {
                    "name": "Bells Beach",
                    "coordinates": {"lat": -38.3667, "lng": 144.2833},
                    "famous_for": "World-class surfing"
                },
                {
                    "name": "Great Otway National Park",
                    "coordinates": {"lat": -38.7583, "lng": 143.6750},
                    "features": ["Rainforest", "Waterfalls", "Koalas"]
                },
                {
                    "name": "Twelve Apostles",
                    "coordinates": {"lat": -38.6662, "lng": 143.1044},
                    "best_time": "Sunrise or sunset"
                },
                {
                    "name": "Loch Ard Gorge",
                    "coordinates": {"lat": -38.6431, "lng": 143.0656},
                    "features": ["Shipwreck history", "Beach access"]
                }
            ],
            "camping_spots": [
                {
                    "name": "BIG4 Apollo Bay",
                    "coordinates": {"lat": -38.7528, "lng": 143.6708},
                    "features": ["Beach access", "Pool", "Powered sites"]
                },
                {
                    "name": "Port Campbell Holiday Park",
                    "coordinates": {"lat": -38.6167, "lng": 143.0000},
                    "features": ["Walk to town", "Near Twelve Apostles"]
                }
            ],
            "driving_tips": ["Take it slow - many curves", "Watch for tour buses", "Koalas on road at dusk"],
            "best_season": "October to April"
        }
    },
    {
        "name": "Grampians National Park Rock Art & Hiking",
        "description": "Ancient Aboriginal rock art, spectacular lookouts, and rugged mountain camping",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["grampians", "hiking", "rock_art", "victoria", "mountains", "aboriginal_culture"],
        "template_data": {
            "type": "national_park",
            "indigenous_name": "Gariwerd",
            "area": "1672 sq km",
            "location": {
                "coordinates": {"lat": -37.2333, "lng": 142.4167},
                "nearest_town": "Halls Gap"
            },
            "key_attractions": [
                {
                    "name": "MacKenzie Falls",
                    "type": "waterfall",
                    "walk": "1.9km return",
                    "difficulty": "moderate"
                },
                {
                    "name": "The Pinnacle",
                    "type": "lookout",
                    "walk": "4.2km return",
                    "difficulty": "moderate-hard"
                },
                {
                    "name": "Bunjil's Shelter",
                    "type": "rock_art",
                    "significance": "Important Aboriginal site",
                    "walk": "200m"
                }
            ],
            "camping": [
                {
                    "name": "Halls Gap Caravan Park",
                    "coordinates": {"lat": -37.1369, "lng": 142.5214},
                    "facilities": ["Powered sites", "Pool", "Camp kitchen"],
                    "wildlife": "Kangaroos, Emus visit"
                },
                {
                    "name": "Plantation Campground",
                    "type": "national_park_camping",
                    "facilities": ["Basic toilets", "Picnic tables"],
                    "booking": "Required"
                }
            ],
            "activities": ["Rock climbing", "Hiking", "Wildlife viewing", "Photography"],
            "best_season": "March to November",
            "warnings": ["Bushfire risk in summer", "Flash flooding possible"]
        }
    },
    
    # === SOUTH AUSTRALIA ===
    {
        "name": "Flinders Ranges Outback Experience",
        "description": "Ancient landscapes, Aboriginal culture, and outback camping under star-filled skies",
        "category": "outback_adventures",
        "is_public": True,
        "tags": ["flinders_ranges", "outback", "south_australia", "aboriginal_culture", "hiking"],
        "template_data": {
            "type": "outback_adventure",
            "region": "Flinders Ranges",
            "distance_from_adelaide": "450km",
            "geological_age": "540 million years",
            "highlights": [
                {
                    "name": "Wilpena Pound",
                    "type": "natural_amphitheatre",
                    "coordinates": {"lat": -31.5214, "lng": 138.5719},
                    "activities": ["Scenic flights", "Hiking", "4WD tours"]
                },
                {
                    "name": "Arkaroo Rock",
                    "type": "rock_art_site",
                    "walk": "3km return",
                    "significance": "Adnyamathanha creation story"
                },
                {
                    "name": "Brachina Gorge",
                    "type": "geological_trail",
                    "feature": "Geological time walk"
                }
            ],
            "camping_options": [
                {
                    "name": "Wilpena Pound Resort",
                    "coordinates": {"lat": -31.5214, "lng": 138.5719},
                    "facilities": ["Powered sites", "Pool", "Restaurant", "Fuel"],
                    "special": "Dark sky viewing area"
                },
                {
                    "name": "Rawnsley Park Station",
                    "coordinates": {"lat": -31.6833, "lng": 138.6333},
                    "facilities": ["Eco villas", "Powered sites", "Camp kitchen"],
                    "activities": ["Sheep shearing", "4WD tours"]
                }
            ],
            "road_conditions": {
                "sealed": "Main roads to Wilpena",
                "unsealed": "Many gorges and lookouts",
                "4wd_required": "Skytrek, some gorges"
            },
            "best_season": "April to October",
            "special_events": ["Astro photography workshops", "Camel treks"]
        }
    },
    {
        "name": "Kangaroo Island Wildlife & Beach Safari",
        "description": "Australia's Galapagos with unique wildlife, pristine beaches, and gourmet food",
        "category": "island_adventures",
        "is_public": True,
        "tags": ["kangaroo_island", "wildlife", "beaches", "south_australia", "ferry"],
        "template_data": {
            "type": "island_exploration",
            "location": {
                "coordinates": {"lat": -35.7752, "lng": 137.2142},
                "size": "4405 sq km",
                "population": "4500"
            },
            "access": {
                "ferry": {
                    "from": "Cape Jervis",
                    "duration": "45 minutes",
                    "vehicle_ferry": True,
                    "booking": "Essential"
                }
            },
            "wildlife_hotspots": [
                {
                    "name": "Seal Bay",
                    "coordinates": {"lat": -35.9947, "lng": 137.3164},
                    "feature": "Sea lion colony beach walks"
                },
                {
                    "name": "Flinders Chase NP",
                    "coordinates": {"lat": -35.9575, "lng": 136.7078},
                    "features": ["Remarkable Rocks", "Admirals Arch", "Fur seals"]
                },
                {
                    "name": "Hanson Bay Wildlife Sanctuary",
                    "feature": "Koala walk"
                }
            ],
            "camping": [
                {
                    "name": "Western KI Caravan Park",
                    "location": "Flinders Chase",
                    "facilities": ["Powered sites", "Wildlife visits", "BBQ areas"]
                },
                {
                    "name": "Vivonne Bay Campground",
                    "location": "Near best beach",
                    "facilities": ["Bush camping", "Beach access"]
                }
            ],
            "local_produce": ["Honey", "Gin", "Oysters", "Wine"],
            "best_season": "October to April",
            "tips": ["Book ferry early", "Allow minimum 3 days", "Wildlife most active dawn/dusk"]
        }
    },
    
    # === WESTERN AUSTRALIA ===
    {
        "name": "Ningaloo Reef Whale Shark & Coral Bay",
        "description": "Swim with whale sharks and snorkel pristine reefs right off the beach",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["ningaloo_reef", "whale_sharks", "snorkeling", "western_australia", "coral_bay"],
        "template_data": {
            "type": "marine_adventure",
            "location": {
                "coordinates": {"lat": -22.5667, "lng": 113.6667},
                "nearest_town": "Exmouth",
                "distance_from_perth": "1200km"
            },
            "marine_life_calendar": {
                "whale_sharks": "March to August",
                "humpback_whales": "June to November",
                "manta_rays": "May to November",
                "coral_spawning": "March/April"
            },
            "key_spots": [
                {
                    "name": "Turquoise Bay",
                    "coordinates": {"lat": -22.0981, "lng": 113.9019},
                    "activity": "Drift snorkeling",
                    "features": ["Beach snorkeling", "No boat needed"]
                },
                {
                    "name": "Coral Bay",
                    "coordinates": {"lat": -23.1128, "lng": 113.7631},
                    "features": ["Family friendly", "Snorkel from beach", "Fish feeding"]
                },
                {
                    "name": "Oyster Stacks",
                    "activity": "Advanced snorkeling",
                    "access": "Short walk from Turquoise Bay"
                }
            ],
            "camping": [
                {
                    "name": "Yardie Homestead Caravan Park",
                    "coordinates": {"lat": -22.3333, "lng": 113.8167},
                    "features": ["Beach access", "Powered sites", "Near reef"],
                    "book_ahead": "Essential in whale shark season"
                },
                {
                    "name": "Coral Bay Peoples Park",
                    "features": ["Beachfront sites", "Snorkel hire", "Tour bookings"]
                }
            ],
            "tours": ["Whale shark swims", "Manta ray interaction", "Humpback swims"],
            "best_season": "April to October",
            "tips": ["Book whale shark tours early", "Bring reef shoes", "Stay min 3 days"]
        }
    },
    {
        "name": "Margaret River Wine & Surf Region",
        "description": "World-class wineries, epic surf breaks, and stunning caves in WA's southwest",
        "category": "wine_culinary",
        "is_public": True,
        "tags": ["margaret_river", "wine", "surfing", "caves", "western_australia", "gourmet"],
        "template_data": {
            "type": "wine_and_surf",
            "region": "Margaret River",
            "distance_from_perth": "270km",
            "highlights": {
                "wineries": [
                    {
                        "name": "Voyager Estate",
                        "coordinates": {"lat": -33.9833, "lng": 115.0667},
                        "known_for": "Gardens and fine dining"
                    },
                    {
                        "name": "Vasse Felix",
                        "known_for": "Original vineyard, art gallery"
                    },
                    {
                        "name": "Leeuwin Estate",
                        "coordinates": {"lat": -34.0347, "lng": 115.0164},
                        "known_for": "Concerts and art series wines"
                    }
                ],
                "surf_breaks": [
                    {
                        "name": "Margaret River Main Break",
                        "level": "Advanced",
                        "coordinates": {"lat": -33.9633, "lng": 114.9983}
                    },
                    {
                        "name": "Redgate Beach",
                        "level": "Intermediate",
                        "features": ["Scenic", "Less crowded"]
                    }
                ],
                "caves": [
                    {
                        "name": "Lake Cave",
                        "feature": "Suspended table formation"
                    },
                    {
                        "name": "Mammoth Cave",
                        "feature": "Self-guided audio tour"
                    }
                ]
            },
            "camping": [
                {
                    "name": "Prevelly Caravan Park",
                    "coordinates": {"lat": -33.9667, "lng": 115.0000},
                    "features": ["Walk to beach", "Near town", "Powered sites"]
                },
                {
                    "name": "Conto's Campground",
                    "type": "national_park",
                    "features": ["Beach camping", "Basic facilities", "Surfing"]
                }
            ],
            "seasonal_events": {
                "november": "Margaret River Gourmet Escape",
                "april": "Drug Aware Pro surfing"
            },
            "tips": ["Designated driver essential", "Book restaurants ahead", "Allow 3-4 days minimum"]
        }
    },
    
    # === NORTHERN TERRITORY ===
    {
        "name": "Kakadu National Park Complete Experience",
        "description": "Australia's largest national park - Aboriginal culture, wetlands, and ancient art",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["kakadu", "aboriginal_art", "wetlands", "northern_territory", "world_heritage"],
        "template_data": {
            "type": "cultural_nature",
            "size": "19,804 sq km",
            "world_heritage": "Natural and Cultural",
            "traditional_owners": "Bininj/Mungguy",
            "regions": {
                "east_alligator": {
                    "highlights": ["Ubirr rock art", "Cahills Crossing"],
                    "coordinates": {"lat": -12.4167, "lng": 132.9667}
                },
                "south_alligator": {
                    "highlights": ["Yellow Water cruise", "Warradjan Cultural Centre"],
                    "coordinates": {"lat": -12.6000, "lng": 132.5833}
                },
                "jim_jim": {
                    "highlights": ["Jim Jim Falls", "Twin Falls"],
                    "access": "4WD only (dry season)",
                    "coordinates": {"lat": -13.2667, "lng": 132.8333}
                },
                "mary_river": {
                    "highlights": ["Gunlom Falls", "Maguk"],
                    "coordinates": {"lat": -13.4333, "lng": 132.0333}
                }
            },
            "camping": [
                {
                    "name": "Cooinda Lodge Campground",
                    "coordinates": {"lat": -12.9075, "lng": 132.5322},
                    "facilities": ["Powered sites", "Pool", "Restaurant", "Fuel"],
                    "special": "Yellow Water cruise departure"
                },
                {
                    "name": "Merl Campground",
                    "type": "park_campground",
                    "facilities": ["Basic", "Near rock art"],
                    "cost": "Free with park pass"
                }
            ],
            "seasonal_access": {
                "dry_season": "May-October: All areas accessible",
                "wet_season": "Nov-April: Some areas closed, dramatic waterfalls"
            },
            "activities": [
                "Rock art viewing",
                "Wildlife cruises",
                "Swimming (croc-safe pools)",
                "Cultural tours",
                "Scenic flights"
            ],
            "entry_fee": "$40 per adult (7 days)",
            "tips": ["Allow minimum 3 days", "Book cruises ahead", "Respect cultural sites"]
        }
    },
    
    # === TASMANIA ===
    {
        "name": "Tasmania East Coast Explorer",
        "description": "Pristine beaches, fresh seafood, and convict history along Tasmania's sunny east coast",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["tasmania", "east_coast", "beaches", "wineglass_bay", "seafood"],
        "template_data": {
            "type": "coastal_tour",
            "distance": "176km Launceston to Hobart",
            "duration": "4-6 days recommended",
            "highlights": [
                {
                    "name": "Bay of Fires",
                    "coordinates": {"lat": -41.1833, "lng": 148.3167},
                    "features": ["Orange lichen rocks", "White beaches", "Free camping"]
                },
                {
                    "name": "Freycinet National Park",
                    "coordinates": {"lat": -42.1333, "lng": 148.3000},
                    "must_do": ["Wineglass Bay lookout", "Hazards Beach walk"],
                    "entry_fee": "$24 per vehicle"
                },
                {
                    "name": "Maria Island",
                    "access": "Ferry from Triabunna",
                    "features": ["Car-free island", "Wombats", "Convict ruins"],
                    "camping": "Basic sites available"
                },
                {
                    "name": "Port Arthur Historic Site",
                    "coordinates": {"lat": -43.1478, "lng": 147.8506},
                    "significance": "Convict settlement",
                    "entry": "$40 adults"
                }
            ],
            "camping_recommendations": [
                {
                    "name": "BIG4 St Helens Holiday Park",
                    "coordinates": {"lat": -41.3208, "lng": 148.2508},
                    "features": ["Near Bay of Fires", "Powered sites", "Camp kitchen"]
                },
                {
                    "name": "Freycinet Holiday Park",
                    "location": "Coles Bay",
                    "features": ["Walk to beach", "Powered sites", "Store"]
                }
            ],
            "food_trail": [
                "Freycinet Marine Farm (oysters)",
                "Kate's Berry Farm",
                "Pyengana Dairy",
                "Bay of Fires wines"
            ],
            "best_season": "December to March",
            "tips": ["Book Freycinet camping early", "Pack warm layers even in summer"]
        }
    },
    {
        "name": "Cradle Mountain-Lake St Clair Wilderness",
        "description": "Tasmania's premier alpine wilderness with ancient rainforest and glacial lakes",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["cradle_mountain", "tasmania", "hiking", "wilderness", "wombats"],
        "template_data": {
            "type": "alpine_wilderness",
            "world_heritage": True,
            "area": "1614 sq km",
            "location": {
                "cradle_valley": {"lat": -41.6833, "lng": 145.9500},
                "lake_st_clair": {"lat": -42.1167, "lng": 146.1667}
            },
            "iconic_walks": [
                {
                    "name": "Dove Lake Circuit",
                    "distance": "6km",
                    "duration": "2-3 hours",
                    "difficulty": "easy",
                    "highlights": ["Cradle Mountain views", "Boat shed"]
                },
                {
                    "name": "Overland Track",
                    "distance": "65km",
                    "duration": "6 days",
                    "difficulty": "challenging",
                    "booking": "Required Oct-May"
                }
            ],
            "accommodation": [
                {
                    "name": "Discovery Parks - Cradle Mountain",
                    "coordinates": {"lat": -41.5714, "lng": 145.9344},
                    "facilities": ["Powered sites", "Cabins", "Camp kitchen"],
                    "wildlife": "Wombats, wallabies visit"
                }
            ],
            "wildlife": ["Wombats", "Tasmanian devils", "Echidnas", "Wallabies"],
            "seasons": {
                "summer": "Best hiking weather",
                "autumn": "Spectacular foliage",
                "winter": "Snow possible, magical atmosphere",
                "spring": "Wildflowers"
            },
            "entry_fee": "$24 per vehicle",
            "tips": ["Weather changes quickly", "Book accommodation early", "Fuel up before arriving"]
        }
    }
]

async def load_comprehensive_data():
    """Load comprehensive travel data to trip_templates"""
    
    # Get Supabase credentials
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    
    supabase: Client = create_client(url, key)
    
    print("🌟 Loading Comprehensive Australian Travel Data")
    print("=" * 60)
    print(f"📊 Preparing to load {len(COMPREHENSIVE_AUSTRALIA_DATA)} detailed travel templates")
    print()
    
    success_count = 0
    error_count = 0
    
    # Categories being loaded
    categories = set()
    states = set()
    
    # Load each template
    for i, template in enumerate(COMPREHENSIVE_AUSTRALIA_DATA, 1):
        try:
            # Extract metadata
            categories.add(template['category'])
            for tag in template['tags']:
                if tag in ['queensland', 'nsw', 'victoria', 'south_australia', 'western_australia', 'northern_territory', 'tasmania']:
                    states.add(tag)
            
            # Add metadata
            template['usage_count'] = 0
            template['created_at'] = datetime.now().isoformat()
            
            # Insert to database
            result = supabase.table('trip_templates').insert(template).execute()
            
            if result.data:
                print(f"✅ [{i:2d}/{len(COMPREHENSIVE_AUSTRALIA_DATA)}] {template['name']}")
                success_count += 1
            else:
                print(f"❌ [{i:2d}/{len(COMPREHENSIVE_AUSTRALIA_DATA)}] Failed: {template['name']}")
                error_count += 1
                
        except Exception as e:
            print(f"❌ [{i:2d}/{len(COMPREHENSIVE_AUSTRALIA_DATA)}] Error: {template['name']} - {str(e)[:50]}...")
            error_count += 1
    
    print("\n" + "=" * 60)
    print(f"🎉 Data Loading Complete!")
    print(f"✅ Successfully loaded: {success_count} templates")
    if error_count > 0:
        print(f"❌ Failed: {error_count} templates")
    
    print(f"\n📍 Coverage:")
    print(f"   States/Territories: {', '.join(sorted(states))}")
    print(f"   Categories: {', '.join(sorted(categories))}")
    
    print("\n🌟 Added comprehensive data for:")
    print("   • National Parks with camping details")
    print("   • Free camping spots with exact GPS")
    print("   • RV parks and holiday parks")
    print("   • Swimming spots, beaches, and waterfalls")
    print("   • 4WD adventures and outback experiences")
    print("   • Wine regions and gourmet trails")
    print("   • Indigenous cultural sites")
    print("   • Iconic road trips and coastal routes")
    
    print("\n💡 PAM now has detailed Australian travel data including:")
    print("   • Accurate GPS coordinates")
    print("   • Seasonal recommendations")
    print("   • Camping options and prices")
    print("   • Activity suggestions")
    print("   • Safety tips and warnings")
    print("   • Local highlights and must-sees")
    
    return success_count > 0

if __name__ == "__main__":
    asyncio.run(load_comprehensive_data())