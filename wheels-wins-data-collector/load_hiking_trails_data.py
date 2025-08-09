#!/usr/bin/env python3
"""
Load comprehensive hiking trails and outdoor activities data to trip_templates
This includes day hikes, multi-day treks, lookouts, and outdoor adventures
"""

import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime
import json

load_dotenv()

# Comprehensive hiking and outdoor activities data
HIKING_TRAILS_DATA = [
    # === MULTI-COUNTRY EPIC TRAILS ===
    {
        "name": "World's Greatest Hiking Trails Collection",
        "description": "Iconic multi-day treks and challenging adventures across all five countries",
        "category": "hiking_trails",
        "is_public": True,
        "tags": ["hiking", "trekking", "multi_day", "epic_trails", "bucket_list", "adventure"],
        "template_data": {
            "type": "epic_trails_guide",
            "difficulty_scale": "Easy, Moderate, Challenging, Expert",
            "epic_trails": [
                # Australia
                {
                    "name": "Overland Track",
                    "country": "Australia",
                    "location": "Tasmania",
                    "coordinates": {"lat": -41.6833, "lng": 145.9500},
                    "distance": "65km",
                    "duration": "6 days",
                    "difficulty": "Challenging",
                    "highlights": [
                        "Cradle Mountain",
                        "Alpine lakes",
                        "Ancient rainforest",
                        "Mount Ossa summit"
                    ],
                    "best_season": "October to May",
                    "booking": "Required Oct-May ($200)",
                    "accommodation": "Huts or camping",
                    "start": "Cradle Mountain",
                    "end": "Lake St Clair",
                    "water": "Available at huts",
                    "resupply": "None - carry all food"
                },
                {
                    "name": "Larapinta Trail",
                    "country": "Australia",
                    "location": "Northern Territory",
                    "coordinates": {"lat": -23.7167, "lng": 133.8667},
                    "distance": "223km",
                    "duration": "12-20 days",
                    "difficulty": "Challenging",
                    "features": [
                        "West MacDonnell Ranges",
                        "Aboriginal culture",
                        "Desert landscapes",
                        "Gorges and waterholes"
                    ],
                    "sections": "12 sections - can do parts",
                    "water": "Tank water at camps",
                    "best_season": "April to September",
                    "heat": "Extreme in summer",
                    "camping": "Designated sites only"
                },
                # New Zealand
                {
                    "name": "Milford Track",
                    "country": "New Zealand",
                    "location": "Fiordland",
                    "coordinates": {"lat": -44.8167, "lng": 167.7333},
                    "distance": "53.5km",
                    "duration": "4 days",
                    "difficulty": "Moderate",
                    "title": "Finest walk in the world",
                    "highlights": [
                        "Sutherland Falls",
                        "MacKinnon Pass",
                        "Clinton Valley",
                        "Milford Sound finish"
                    ],
                    "season": "Late Oct to April",
                    "booking": "Essential - ballot system",
                    "options": ["Independent ($140)", "Guided ($2000+)"],
                    "huts": "3 nights required",
                    "weather": "200+ rain days/year"
                },
                {
                    "name": "Routeburn Track",
                    "country": "New Zealand",
                    "location": "Fiordland/Mt Aspiring",
                    "distance": "32km",
                    "duration": "2-4 days",
                    "difficulty": "Moderate",
                    "alpine_scenery": "Spectacular",
                    "key_points": [
                        "Harris Saddle",
                        "Lake Mackenzie",
                        "Routeburn Falls",
                        "Key Summit side trip"
                    ],
                    "booking": "DOC huts required",
                    "season": "Late Oct to April",
                    "connects": "Queenstown to Milford Road"
                },
                # Canada
                {
                    "name": "West Coast Trail",
                    "country": "Canada",
                    "location": "Vancouver Island, BC",
                    "coordinates": {"lat": 48.6667, "lng": -124.7500},
                    "distance": "75km",
                    "duration": "5-7 days",
                    "difficulty": "Expert",
                    "features": [
                        "Rugged coastline",
                        "Ladders and cables",
                        "Tidal pools",
                        "Shipwreck history"
                    ],
                    "permit": "Required ($182.25)",
                    "season": "May 1 to Sept 30",
                    "tides": "Critical for some sections",
                    "camping": "Designated beaches",
                    "emergency": "Trail guardians stationed"
                },
                {
                    "name": "Skyline Trail",
                    "country": "Canada",
                    "location": "Jasper, Alberta",
                    "distance": "44km",
                    "duration": "2-3 days",
                    "difficulty": "Challenging",
                    "elevation_gain": "1400m",
                    "highlights": [
                        "Alpine meadows",
                        "Mountain ridges",
                        "Wildlife viewing",
                        "Spectacular views"
                    ],
                    "camping": "Backcountry sites",
                    "permits": "Parks Canada required",
                    "season": "July to September"
                },
                # USA
                {
                    "name": "John Muir Trail",
                    "country": "USA",
                    "location": "California",
                    "distance": "211 miles",
                    "duration": "21 days average",
                    "difficulty": "Expert",
                    "elevation": "14,505ft highest point",
                    "highlights": [
                        "Mount Whitney summit",
                        "Evolution Basin",
                        "Thousand Island Lake",
                        "8 mountain passes"
                    ],
                    "permit": "Lottery system",
                    "resupply": "Multiple options",
                    "season": "July to September",
                    "snow": "Check conditions"
                },
                {
                    "name": "Appalachian Trail Section",
                    "country": "USA",
                    "location": "Eastern USA",
                    "total_distance": "2,190 miles",
                    "popular_section": "Virginia Triple Crown",
                    "virginia_distance": "34 miles",
                    "duration": "2-3 days",
                    "highlights": [
                        "McAfee Knob",
                        "Tinker Cliffs",
                        "Dragons Tooth"
                    ],
                    "difficulty": "Moderate",
                    "camping": "Shelters and tent sites"
                },
                # UK
                {
                    "name": "Coast to Coast Walk",
                    "country": "UK",
                    "location": "Northern England",
                    "distance": "192 miles",
                    "duration": "12-14 days",
                    "difficulty": "Moderate",
                    "route": "St Bees to Robin Hood's Bay",
                    "crosses": [
                        "Lake District",
                        "Yorkshire Dales",
                        "North York Moors"
                    ],
                    "accommodation": "B&Bs, hostels, camping",
                    "baggage": "Transfer services available",
                    "navigation": "Not waymarked"
                },
                {
                    "name": "West Highland Way",
                    "country": "UK",
                    "location": "Scotland",
                    "distance": "96 miles",
                    "duration": "5-8 days",
                    "difficulty": "Moderate",
                    "start": "Milngavie (Glasgow)",
                    "end": "Fort William",
                    "highlights": [
                        "Loch Lomond",
                        "Rannoch Moor",
                        "Devil's Staircase",
                        "Ben Nevis views"
                    ],
                    "wild_camping": "Allowed (Scotland)",
                    "midges": "May to September"
                }
            ],
            "preparation_tips": [
                "Train with weighted pack",
                "Break in boots thoroughly",
                "Test all gear beforehand",
                "Plan resupply points",
                "Check permit requirements",
                "Consider weather windows",
                "Have emergency plan"
            ]
        }
    },
    
    # === DAY HIKES COLLECTION ===
    {
        "name": "Best Day Hikes: Waterfalls, Summits & Scenic Trails",
        "description": "Accessible day adventures perfect for all skill levels",
        "category": "hiking_trails",
        "is_public": True,
        "tags": ["day_hikes", "waterfalls", "lookouts", "family_friendly", "scenic_walks"],
        "template_data": {
            "type": "day_hikes_guide",
            "hike_categories": ["Waterfall", "Summit", "Coastal", "Forest", "Desert", "Alpine"],
            "trails_by_country": {
                "australia": [
                    {
                        "name": "Three Sisters Walk",
                        "location": "Blue Mountains, NSW",
                        "coordinates": {"lat": -33.7320, "lng": 150.3120},
                        "distance": "1km",
                        "duration": "30 minutes",
                        "difficulty": "Easy",
                        "type": "Lookout",
                        "features": [
                            "Iconic rock formation",
                            "Echo Point views",
                            "Aboriginal legend"
                        ],
                        "facilities": ["Visitor center", "Cafe", "Toilets"],
                        "parking": "Large car park",
                        "best_time": "Sunrise or sunset",
                        "extends_to": "Grand Canyon walk (3-4hrs)"
                    },
                    {
                        "name": "Wineglass Bay Lookout",
                        "location": "Tasmania",
                        "coordinates": {"lat": -42.1481, "lng": 148.3008},
                        "distance": "3km return",
                        "duration": "1.5 hours",
                        "difficulty": "Moderate",
                        "elevation": "215m",
                        "features": [
                            "Perfect crescent beach view",
                            "Granite peaks",
                            "Photo opportunity"
                        ],
                        "continue": "Beach descent adds 2hrs",
                        "camping": "Freycinet NP campground"
                    },
                    {
                        "name": "Kings Canyon Rim Walk",
                        "location": "Northern Territory",
                        "distance": "6km loop",
                        "duration": "3-4 hours",
                        "difficulty": "Challenging",
                        "start_early": "Before 9am in heat",
                        "highlights": [
                            "Garden of Eden pools",
                            "500m cliff views",
                            "Lost City formations"
                        ],
                        "steep_start": "500 steps",
                        "water": "Carry 3L per person"
                    }
                ],
                "new_zealand": [
                    {
                        "name": "Roy's Peak",
                        "location": "Wanaka",
                        "coordinates": {"lat": -44.6883, "lng": 169.0558},
                        "distance": "16km return",
                        "duration": "5-6 hours",
                        "difficulty": "Challenging",
                        "elevation": "1228m gain",
                        "famous_for": "Instagram ridge photo",
                        "views": "Lake Wanaka, Southern Alps",
                        "tips": [
                            "Start early to avoid crowds",
                            "No water on track",
                            "Exposed - sun protection"
                        ],
                        "parking": "Roadside, arrive early"
                    },
                    {
                        "name": "Hooker Valley Track",
                        "location": "Mount Cook NP",
                        "distance": "10km return",
                        "duration": "3 hours",
                        "difficulty": "Easy",
                        "features": [
                            "3 swing bridges",
                            "Mueller Lake views",
                            "Hooker Lake icebergs",
                            "Mount Cook views"
                        ],
                        "suitable": "All ages",
                        "best_season": "Year round",
                        "camping": "White Horse Hill"
                    }
                ],
                "canada": [
                    {
                        "name": "Plain of Six Glaciers",
                        "location": "Lake Louise, Alberta",
                        "distance": "13.8km return",
                        "duration": "4-5 hours",
                        "difficulty": "Moderate",
                        "elevation": "365m",
                        "highlights": [
                            "Lake Louise views",
                            "Historic tea house",
                            "Glacier views",
                            "Possible wildlife"
                        ],
                        "tea_house": "Open summer only",
                        "combine": "Lake Agnes same day",
                        "parking": "Arrive before 8am"
                    },
                    {
                        "name": "Joffre Lakes",
                        "location": "BC",
                        "distance": "10km return",
                        "duration": "4-5 hours",
                        "difficulty": "Moderate",
                        "three_lakes": [
                            "Lower (5 min walk)",
                            "Middle (1.5 hrs)",
                            "Upper (2.5 hrs)"
                        ],
                        "color": "Turquoise glacier-fed",
                        "camping": "Upper lake only",
                        "permits": "Day use free pass required"
                    }
                ],
                "usa": [
                    {
                        "name": "Angels Landing",
                        "location": "Zion NP, Utah",
                        "distance": "8.7km return",
                        "duration": "4-5 hours",
                        "difficulty": "Expert",
                        "elevation": "488m",
                        "famous_for": "Chain section",
                        "dangers": "Steep dropoffs",
                        "permit": "Required - lottery",
                        "alternative": "Scout Lookout (no permit)",
                        "deaths": "Average 1 per year",
                        "tips": "Start before sunrise"
                    },
                    {
                        "name": "Delicate Arch",
                        "location": "Arches NP, Utah",
                        "distance": "4.8km return",
                        "duration": "2-3 hours",
                        "difficulty": "Moderate",
                        "features": [
                            "Utah's icon",
                            "Slickrock hiking",
                            "No shade"
                        ],
                        "best_time": "Sunset",
                        "crowded": "Very - go early/late",
                        "summer": "Extremely hot"
                    }
                ],
                "uk": [
                    {
                        "name": "Scafell Pike",
                        "location": "Lake District",
                        "elevation": "978m - England's highest",
                        "distance": "9-12km varies by route",
                        "duration": "5-7 hours",
                        "difficulty": "Challenging",
                        "routes": [
                            "Wasdale Head (shortest)",
                            "Seathwaite (most scenic)",
                            "Langdale (quieter)"
                        ],
                        "weather": "Changes rapidly",
                        "navigation": "Poor visibility common",
                        "camping": "Wasdale Head NT"
                    },
                    {
                        "name": "Giant's Causeway Coastal Path",
                        "location": "Northern Ireland",
                        "distance": "Variable 2-16km",
                        "difficulty": "Easy to Moderate",
                        "features": [
                            "Basalt columns",
                            "Coastal cliffs",
                            "Carrick-a-Rede bridge"
                        ],
                        "free_access": "Via cliff path",
                        "visitor_center": "£13.50",
                        "best_section": "To Dunseverick"
                    }
                ]
            },
            "safety_essentials": [
                "Tell someone your plans",
                "Check weather forecast",
                "Carry map and compass",
                "Bring first aid kit",
                "Pack extra food/water",
                "Know your limits",
                "Turn back if needed"
            ]
        }
    },
    
    # === COASTAL WALKS ===
    {
        "name": "Spectacular Coastal Walks & Beach Trails",
        "description": "Ocean paths, cliff walks, and beach hikes with stunning sea views",
        "category": "hiking_trails",
        "is_public": True,
        "tags": ["coastal_walks", "beach_trails", "cliff_paths", "ocean_views", "lighthouses"],
        "template_data": {
            "type": "coastal_walks_guide",
            "walk_types": ["Cliff top", "Beach walk", "Coastal path", "Headland circuit"],
            "coastal_trails": [
                {
                    "name": "Bondi to Coogee Coastal Walk",
                    "country": "Australia",
                    "location": "Sydney, NSW",
                    "distance": "6km",
                    "duration": "2-3 hours",
                    "difficulty": "Easy",
                    "features": [
                        "6 beaches",
                        "Sculptures by the Sea (Oct-Nov)",
                        "Ocean pools",
                        "Cafes along route"
                    ],
                    "highlights": [
                        "Bondi Beach",
                        "Tamarama Beach",
                        "Bronte Park",
                        "Clovelly Bay",
                        "Gordons Bay",
                        "Coogee Beach"
                    ],
                    "facilities": "Multiple along route",
                    "return": "Bus 333",
                    "best_time": "Early morning",
                    "swimming": "Multiple spots"
                },
                {
                    "name": "Great Ocean Walk",
                    "country": "Australia",
                    "location": "Victoria",
                    "distance": "104km full",
                    "duration": "8 days",
                    "day_sections": "Multiple options",
                    "highlights": [
                        "Twelve Apostles section",
                        "Remote beaches",
                        "Koala spotting",
                        "Shipwreck history"
                    ],
                    "camping": "Designated hikers camps",
                    "booking": "Required for camping",
                    "easier_option": "Drive and day walk sections"
                },
                {
                    "name": "Cape Reinga Coastal Walkway",
                    "country": "New Zealand",
                    "location": "Northland",
                    "distance": "8.5km",
                    "duration": "3-4 hours",
                    "difficulty": "Moderate",
                    "spiritual": "Where two oceans meet",
                    "features": [
                        "Lighthouse",
                        "Sacred Maori site",
                        "Tasman/Pacific meeting",
                        "90 Mile Beach views"
                    ],
                    "respect": "Very sacred to Maori",
                    "no_food": "At Cape itself"
                },
                {
                    "name": "Pacific Rim Trail",
                    "country": "Canada",
                    "location": "Vancouver Island",
                    "options": [
                        {
                            "name": "South Beach Trail",
                            "distance": "3km loop",
                            "features": ["Old growth", "Beach access"]
                        },
                        {
                            "name": "Nuu-chah-nulth Trail",
                            "distance": "2.5km loop",
                            "cultural": "First Nations history"
                        }
                    ],
                    "wildlife": ["Whales", "Bears", "Eagles"],
                    "camping": "Green Point Campground"
                },
                {
                    "name": "Lost Coast Trail",
                    "country": "USA",
                    "location": "California",
                    "distance": "25 miles",
                    "duration": "3-4 days",
                    "difficulty": "Expert",
                    "features": [
                        "Remote wilderness",
                        "Black sand beaches",
                        "Sea lions",
                        "Tide dependent sections"
                    ],
                    "permits": "Required",
                    "tides": "Critical - plan carefully",
                    "water": "Stream dependent"
                },
                {
                    "name": "South West Coast Path Section",
                    "country": "UK",
                    "location": "Cornwall",
                    "total": "630 miles full path",
                    "popular_section": "St Ives to Zennor",
                    "distance": "10 miles",
                    "duration": "4-5 hours",
                    "difficulty": "Moderate",
                    "features": [
                        "Tin mine ruins",
                        "Seal colonies",
                        "Celtic crosses",
                        "Mermaid of Zennor"
                    ],
                    "pub_stop": "Tinners Arms, Zennor",
                    "return": "Bus to St Ives"
                }
            ],
            "coastal_safety": [
                "Check tide times",
                "Watch for rogue waves",
                "Cliff edges unstable",
                "Sun protection essential",
                "Carry water",
                "Mobile signal patchy"
            ]
        }
    },
    
    # === FAMILY FRIENDLY TRAILS ===
    {
        "name": "Family-Friendly Nature Walks & Easy Trails",
        "description": "Short walks perfect for kids, seniors, and casual hikers",
        "category": "hiking_trails",
        "is_public": True,
        "tags": ["family_walks", "easy_trails", "kids_hiking", "accessible", "nature_walks", "short_walks"],
        "template_data": {
            "type": "family_trails_guide",
            "suitable_for": ["Toddlers", "Young children", "Seniors", "Wheelchairs", "Prams"],
            "family_trails": [
                {
                    "name": "Gruffalo Trail",
                    "country": "UK",
                    "location": "Forest of Dean",
                    "distance": "2.5km",
                    "duration": "1 hour",
                    "age_range": "2-10 years",
                    "features": [
                        "Gruffalo sculptures",
                        "Story trail",
                        "Play areas",
                        "Flat path"
                    ],
                    "facilities": ["Cafe", "Toilets", "Parking"],
                    "pushchair": "Suitable",
                    "dogs": "Welcome on leads",
                    "free": True
                },
                {
                    "name": "Lady Carrington Drive",
                    "country": "Australia",
                    "location": "Royal National Park, NSW",
                    "distance": "Up to 10km",
                    "surface": "Sealed road (no cars)",
                    "features": [
                        "River views",
                        "Wallaby spotting",
                        "Picnic spots",
                        "Swimming holes"
                    ],
                    "suitable": "Bikes, prams, wheelchairs",
                    "facilities": "At entrance",
                    "shade": "Good coverage"
                },
                {
                    "name": "Mirror Lake Loop",
                    "country": "USA",
                    "location": "Yosemite NP",
                    "distance": "3-5 miles",
                    "duration": "2 hours",
                    "difficulty": "Easy",
                    "features": [
                        "Meadow views",
                        "Mountain reflections",
                        "Wildlife viewing",
                        "Interpretive signs"
                    ],
                    "seasonal": "Lake dries in summer",
                    "accessible": "Paved sections",
                    "shuttle": "Valley shuttle stop"
                },
                {
                    "name": "Blue Lake Track",
                    "country": "New Zealand",
                    "location": "Mount Cook Village",
                    "distance": "1.5km return",
                    "duration": "40 minutes",
                    "difficulty": "Easy",
                    "features": [
                        "Glacier-fed lake",
                        "Mountain views",
                        "Information panels",
                        "Bird life"
                    ],
                    "kids_love": "Blue milk color",
                    "continue": "To Tasman Glacier view"
                },
                {
                    "name": "Johnston Canyon Lower Falls",
                    "country": "Canada",
                    "location": "Banff NP",
                    "distance": "2.4km return",
                    "duration": "1 hour",
                    "features": [
                        "Catwalks through canyon",
                        "Waterfall views",
                        "Interpretive signs"
                    ],
                    "continue": "Upper Falls adds 2.4km",
                    "winter": "Ice walk tours",
                    "busy": "Very - go early/late"
                }
            ],
            "keeping_kids_engaged": [
                "Nature scavenger hunts",
                "Photo challenges",
                "Trail mix rewards",
                "Let them lead sometimes",
                "Frequent snack breaks",
                "Stories about surroundings",
                "Collect (where allowed) treasures"
            ],
            "family_hiking_tips": [
                "Start with short distances",
                "Choose loops over out-and-back",
                "Pack more snacks than you think",
                "Bring entertainment for waits",
                "Let kids set pace",
                "Make it fun, not forced",
                "Celebrate achievements"
            ]
        }
    },
    
    # === ADVENTURE ACTIVITIES ===
    {
        "name": "Outdoor Adventure Activities Beyond Hiking",
        "description": "Rock climbing, canyoning, mountain biking, and more adrenaline activities",
        "category": "outdoor_activities",
        "is_public": True,
        "tags": ["adventure", "rock_climbing", "mountain_biking", "canyoning", "zip_lines", "outdoor_sports"],
        "template_data": {
            "type": "adventure_guide",
            "activity_types": ["Climbing", "Water sports", "Aerial", "Cycling", "Winter sports"],
            "adventures_by_type": {
                "rock_climbing": [
                    {
                        "name": "Blue Mountains Climbing",
                        "country": "Australia",
                        "location": "NSW",
                        "features": [
                            "1000+ routes",
                            "All grades",
                            "Sandstone cliffs",
                            "Sport and trad"
                        ],
                        "beginner_areas": ["Centennial Glen", "Mount Piddington"],
                        "guides": "Available in Katoomba",
                        "camping": "Multiple options"
                    },
                    {
                        "name": "Railay Beach Climbing",
                        "country": "Thailand",
                        "features": [
                            "Limestone cliffs",
                            "Beach setting",
                            "700+ routes",
                            "Deep water soloing"
                        ],
                        "no_experience": "Courses available",
                        "seasons": "Nov-April best"
                    }
                ],
                "canyoning": [
                    {
                        "name": "Empress Canyon",
                        "country": "Australia",
                        "location": "Blue Mountains",
                        "difficulty": "Beginner friendly",
                        "features": [
                            "Glowworms",
                            "Water jumps",
                            "Natural slides",
                            "Abseils"
                        ],
                        "tour_required": "Yes - technical",
                        "wetsuit": "Essential",
                        "season": "October to April"
                    },
                    {
                        "name": "Routeburn Canyon",
                        "country": "New Zealand",
                        "location": "Queenstown",
                        "duration": "Full day",
                        "includes": [
                            "Zip lines",
                            "Jumps to 12m",
                            "Natural slides",
                            "Scenic walk in"
                        ]
                    }
                ],
                "mountain_biking": [
                    {
                        "name": "Whistler Bike Park",
                        "country": "Canada",
                        "location": "BC",
                        "trails": "80+",
                        "difficulty": "Green to double black",
                        "season": "May to October",
                        "rentals": "Full suspension available",
                        "lessons": "All levels",
                        "camping": "Riverside Resort"
                    },
                    {
                        "name": "Moab Slickrock",
                        "country": "USA",
                        "location": "Utah",
                        "distance": "10.5 mile loop",
                        "difficulty": "Advanced",
                        "surface": "Sandstone",
                        "bring": "3L water minimum",
                        "best_time": "Spring/Fall"
                    }
                ],
                "zip_lining": [
                    {
                        "name": "Velocity 2",
                        "country": "UK",
                        "location": "Wales",
                        "stats": "Fastest in world - 100mph",
                        "length": "1.5km",
                        "height": "500ft",
                        "age": "10+",
                        "weight": "Limits apply"
                    },
                    {
                        "name": "Gibbon Experience",
                        "country": "Laos",
                        "features": [
                            "3-day experience",
                            "Treehouse stays",
                            "Wildlife viewing",
                            "Jungle zip lines"
                        ],
                        "book_ahead": "Months in advance"
                    }
                ],
                "water_adventures": [
                    {
                        "name": "Franklin River Rafting",
                        "country": "Australia",
                        "location": "Tasmania",
                        "duration": "7-10 days",
                        "difficulty": "Expert",
                        "wilderness": "World Heritage",
                        "guides": "Essential",
                        "season": "November to March"
                    },
                    {
                        "name": "Shotover River Rafting",
                        "country": "New Zealand",
                        "grade": "3-5 rapids",
                        "duration": "Half day",
                        "includes": "Tunnel rapid",
                        "combine": "Jet boat option"
                    }
                ]
            },
            "safety_considerations": [
                "Use qualified guides",
                "Check insurance coverage",
                "Know your limits",
                "Quality gear essential",
                "Weather dependent",
                "Emergency procedures"
            ]
        }
    }
]

async def load_hiking_trails_data():
    """Load comprehensive hiking trails data to trip_templates"""
    
    # Get Supabase credentials
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    
    supabase: Client = create_client(url, key)
    
    print("🥾 Loading Hiking Trails & Outdoor Activities Data")
    print("=" * 60)
    print(f"📊 Preparing to load {len(HIKING_TRAILS_DATA)} hiking guides")
    print()
    
    success_count = 0
    error_count = 0
    
    # Load each template
    for i, template in enumerate(HIKING_TRAILS_DATA, 1):
        try:
            # Add metadata
            template['usage_count'] = 0
            template['created_at'] = datetime.now().isoformat()
            
            # Insert to database
            result = supabase.table('trip_templates').insert(template).execute()
            
            if result.data:
                print(f"✅ [{i}/{len(HIKING_TRAILS_DATA)}] {template['name']}")
                success_count += 1
            else:
                print(f"❌ [{i}/{len(HIKING_TRAILS_DATA)}] Failed: {template['name']}")
                error_count += 1
                
        except Exception as e:
            print(f"❌ [{i}/{len(HIKING_TRAILS_DATA)}] Error: {template['name']} - {str(e)[:50]}...")
            error_count += 1
    
    print("\n" + "=" * 60)
    print(f"🎉 Hiking Trails Data Loading Complete!")
    print(f"✅ Successfully loaded: {success_count} templates")
    if error_count > 0:
        print(f"❌ Failed: {error_count} templates")
    
    print("\n🥾 Added comprehensive hiking data including:")
    print("   • Epic multi-day trails")
    print("   • Day hikes and lookouts")
    print("   • Coastal walks and beach trails")
    print("   • Family-friendly nature walks")
    print("   • Adventure activities beyond hiking")
    print("   • Safety tips and trail conditions")
    print("   • Permit and booking information")
    
    return success_count > 0

if __name__ == "__main__":
    asyncio.run(load_hiking_trails_data())