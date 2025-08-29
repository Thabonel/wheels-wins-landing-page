#!/usr/bin/env python3
"""
Load comprehensive USA travel data to trip_templates
This includes real locations with accurate coordinates
"""

import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime
import json

load_dotenv()

# Comprehensive USA travel data with real locations
USA_DATA = [
    # === WEST COAST ===
    {
        "name": "Pacific Coast Highway: California Dreaming",
        "description": "Drive the iconic Highway 1 from San Francisco to San Diego through Big Sur",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["pacific_coast_highway", "california", "big_sur", "usa", "coastal", "scenic_drive"],
        "template_data": {
            "type": "coastal_highway",
            "highway": "California State Route 1",
            "distance": "1055km total",
            "duration": "5-7 days recommended",
            "iconic_stops": [
                {
                    "name": "Golden Gate Bridge",
                    "coordinates": {"lat": 37.8199, "lng": -122.4783},
                    "photo_ops": ["Vista Point", "Battery Spencer"],
                    "start_point": True
                },
                {
                    "name": "Half Moon Bay",
                    "features": ["Pumpkin farms", "Coastal trails", "Surfing"],
                    "coordinates": {"lat": 37.4636, "lng": -122.4286}
                },
                {
                    "name": "Santa Cruz",
                    "features": ["Beach Boardwalk", "Surfing Museum", "Redwoods"],
                    "coordinates": {"lat": 36.9741, "lng": -122.0308}
                },
                {
                    "name": "Monterey & Carmel",
                    "features": ["Aquarium", "17-Mile Drive", "Pebble Beach"],
                    "coordinates": {"lat": 36.6002, "lng": -121.8947}
                },
                {
                    "name": "Big Sur",
                    "features": ["Bixby Bridge", "McWay Falls", "Pfeiffer Beach"],
                    "coordinates": {"lat": 36.2704, "lng": -121.8078},
                    "note": "Check road conditions - landslides common"
                },
                {
                    "name": "San Luis Obispo",
                    "features": ["Madonna Inn", "Cal Poly", "Downtown"],
                    "coordinates": {"lat": 35.2828, "lng": -120.6596}
                },
                {
                    "name": "Santa Barbara",
                    "features": ["Spanish architecture", "Wine country", "Beaches"],
                    "coordinates": {"lat": 34.4208, "lng": -119.6982}
                }
            ],
            "camping_recommendations": [
                {
                    "name": "Kirk Creek Campground",
                    "location": "Big Sur",
                    "features": ["Cliff-top sites", "Ocean views", "No reservations"],
                    "coordinates": {"lat": 35.9917, "lng": -121.4933}
                },
                {
                    "name": "Plaskett Creek Campground",
                    "location": "Big Sur",
                    "features": ["Near beach", "Redwoods", "Reservable"],
                    "coordinates": {"lat": 35.9183, "lng": -121.4683}
                },
                {
                    "name": "Morro Bay State Park",
                    "features": ["Bay views", "Golf course", "Museum"],
                    "coordinates": {"lat": 35.3373, "lng": -120.8291}
                }
            ],
            "rv_considerations": {
                "big_sur": "Narrow, winding roads - not for large RVs",
                "alternate": "US-101 for larger vehicles",
                "parking": "Limited in coastal towns"
            },
            "best_season": "September to November (clear, less crowded)",
            "fuel_stops": "Fill up before Big Sur stretch",
            "fog_season": "June to August mornings"
        }
    },
    {
        "name": "Yellowstone & Grand Teton National Parks",
        "description": "Geysers, hot springs, wildlife, and dramatic mountain peaks in America's first national park",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["yellowstone", "grand_teton", "wyoming", "usa", "national_parks", "wildlife"],
        "template_data": {
            "type": "national_park_combo",
            "region": "Wyoming/Montana/Idaho",
            "combined_area": "3472 sq miles",
            "elevation": "6000-11000 feet",
            "yellowstone_highlights": [
                {
                    "name": "Old Faithful",
                    "coordinates": {"lat": 44.4605, "lng": -110.8281},
                    "eruption": "Every 60-110 minutes",
                    "nearby": ["Grand Prismatic Spring", "Fountain Paint Pot"]
                },
                {
                    "name": "Grand Canyon of Yellowstone",
                    "coordinates": {"lat": 44.7200, "lng": -110.4975},
                    "features": ["Lower Falls", "Artist Point", "Uncle Tom's Trail"]
                },
                {
                    "name": "Lamar Valley",
                    "wildlife": ["Wolves", "Bison", "Bears", "Elk"],
                    "best_viewing": "Dawn and dusk"
                },
                {
                    "name": "Mammoth Hot Springs",
                    "coordinates": {"lat": 44.9765, "lng": -110.7048},
                    "features": ["Terraces", "Elk in town", "Historic Fort"]
                }
            ],
            "grand_teton_highlights": [
                {
                    "name": "Jenny Lake",
                    "coordinates": {"lat": 43.7495, "lng": -110.7222},
                    "activities": ["Boat shuttle", "Hidden Falls hike", "Inspiration Point"]
                },
                {
                    "name": "Jackson Lake",
                    "features": ["Mountain views", "Boating", "Fishing"],
                    "lodges": ["Jackson Lake Lodge", "Signal Mountain Lodge"]
                },
                {
                    "name": "Mormon Row",
                    "feature": "Historic barns with Teton backdrop",
                    "photography": "Sunrise golden hour"
                }
            ],
            "camping_options": [
                {
                    "name": "Madison Campground",
                    "park": "Yellowstone",
                    "sites": "278",
                    "features": ["Near west entrance", "Riverside", "Elk viewing"],
                    "reservations": "Required May-Oct"
                },
                {
                    "name": "Grant Village",
                    "park": "Yellowstone",
                    "features": ["Lake access", "Marina", "General store"],
                    "rv_limit": "40 feet"
                },
                {
                    "name": "Colter Bay RV Park",
                    "park": "Grand Teton",
                    "features": ["Full hookups", "Lake views", "Marina"],
                    "coordinates": {"lat": 43.9058, "lng": -110.6414}
                }
            ],
            "wildlife_safety": [
                "Bears: 100 yards distance",
                "Other wildlife: 25 yards",
                "Bear spray recommended",
                "Food storage mandatory"
            ],
            "entrance_fees": "$35/vehicle (7 days each park)",
            "best_season": "June to September",
            "shoulder_season": "May & October (snow possible)",
            "winter": "Most roads closed, snowcoach tours available"
        }
    },
    {
        "name": "Route 66: The Mother Road",
        "description": "Classic American road trip from Chicago to Santa Monica on the historic Route 66",
        "category": "historical",
        "is_public": True,
        "tags": ["route_66", "historic", "usa", "road_trip", "americana", "mother_road"],
        "template_data": {
            "type": "historic_highway",
            "total_distance": "3940km",
            "states": ["Illinois", "Missouri", "Kansas", "Oklahoma", "Texas", "New Mexico", "Arizona", "California"],
            "duration": "2-3 weeks recommended",
            "key_stops": [
                {
                    "name": "Chicago",
                    "state": "Illinois",
                    "coordinates": {"lat": 41.8781, "lng": -87.6298},
                    "start_point": "Adams St & Michigan Ave",
                    "must_see": ["Willis Tower", "Art Institute", "Lou Mitchell's"]
                },
                {
                    "name": "Springfield",
                    "state": "Illinois",
                    "features": ["Lincoln sites", "Cozy Dog Drive In"],
                    "coordinates": {"lat": 39.7817, "lng": -89.6501}
                },
                {
                    "name": "St. Louis",
                    "state": "Missouri",
                    "features": ["Gateway Arch", "Ted Drewes Frozen Custard"],
                    "coordinates": {"lat": 38.6270, "lng": -90.1994}
                },
                {
                    "name": "Tulsa & Oklahoma City",
                    "state": "Oklahoma",
                    "features": ["Route 66 Museum", "Blue Dome District"],
                    "coordinates": {"lat": 36.1540, "lng": -95.9928}
                },
                {
                    "name": "Amarillo",
                    "state": "Texas",
                    "features": ["Cadillac Ranch", "Big Texan Steak Ranch"],
                    "coordinates": {"lat": 35.2220, "lng": -101.8313}
                },
                {
                    "name": "Albuquerque",
                    "state": "New Mexico",
                    "features": ["Old Town", "Neon signs", "Breaking Bad sites"],
                    "coordinates": {"lat": 35.0844, "lng": -106.6504}
                },
                {
                    "name": "Flagstaff",
                    "state": "Arizona",
                    "features": ["Downtown historic district", "Near Grand Canyon"],
                    "coordinates": {"lat": 35.1983, "lng": -111.6513}
                },
                {
                    "name": "Santa Monica",
                    "state": "California",
                    "end_point": "Santa Monica Pier",
                    "coordinates": {"lat": 34.0195, "lng": -118.4912}
                }
            ],
            "camping_stops": [
                {
                    "name": "KOA Journey Campgrounds",
                    "locations": "Multiple along route",
                    "features": ["RV friendly", "Pools", "Stores"]
                },
                {
                    "name": "Meramec Caverns Campground",
                    "state": "Missouri",
                    "features": ["Cave tours", "Riverside sites"]
                },
                {
                    "name": "Blue Hole RV Park",
                    "location": "Santa Rosa, NM",
                    "features": ["Near swimming hole", "Full hookups"]
                }
            ],
            "authentic_experiences": [
                "Classic diners and drive-ins",
                "Vintage motels with neon signs",
                "Roadside attractions",
                "Ghost towns",
                "Trading posts"
            ],
            "navigation_tip": "Historic route differs from I-40",
            "best_season": "April to October",
            "special_events": "Route 66 festivals in various towns"
        }
    },
    
    # === SOUTHWEST ===
    {
        "name": "Utah's Mighty Five National Parks",
        "description": "Red rock wonders through Zion, Bryce, Capitol Reef, Arches, and Canyonlands",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["utah", "mighty_five", "national_parks", "red_rocks", "usa", "desert"],
        "template_data": {
            "type": "park_circuit",
            "total_distance": "1400km loop",
            "duration": "7-10 days minimum",
            "parks": [
                {
                    "name": "Zion National Park",
                    "coordinates": {"lat": 37.2982, "lng": -113.0263},
                    "highlights": ["Angels Landing", "The Narrows", "Emerald Pools"],
                    "gateway_town": "Springdale",
                    "camping": "Watchman & South campgrounds"
                },
                {
                    "name": "Bryce Canyon National Park",
                    "coordinates": {"lat": 37.5930, "lng": -112.1871},
                    "elevation": "8000-9000 feet",
                    "highlights": ["Sunrise Point", "Navajo Loop", "Stargazing"],
                    "unique": "Hoodoos amphitheater"
                },
                {
                    "name": "Capitol Reef National Park",
                    "coordinates": {"lat": 38.0877, "lng": -111.1355},
                    "highlights": ["Scenic Drive", "Petroglyphs", "Fruit orchards"],
                    "feature": "100-mile Waterpocket Fold"
                },
                {
                    "name": "Arches National Park",
                    "coordinates": {"lat": 38.7331, "lng": -109.5925},
                    "highlights": ["Delicate Arch", "Devils Garden", "Fiery Furnace"],
                    "gateway_town": "Moab",
                    "tip": "Enter before 8am or after 3pm"
                },
                {
                    "name": "Canyonlands National Park",
                    "coordinates": {"lat": 38.3269, "lng": -109.8783},
                    "districts": ["Island in the Sky", "Needles", "Maze"],
                    "highlights": ["Mesa Arch sunrise", "Grand View Point"]
                }
            ],
            "camping_strategy": [
                {
                    "park": "Zion",
                    "options": ["Watchman (reservable)", "South (first-come)"],
                    "alternative": "Springdale RV parks"
                },
                {
                    "park": "Bryce",
                    "options": ["North Campground", "Sunset Campground"],
                    "note": "Cold at night even in summer"
                },
                {
                    "park": "Moab area",
                    "options": ["BLM camping", "State parks", "Private RV parks"],
                    "tip": "Base for Arches & Canyonlands"
                }
            ],
            "seasonal_considerations": {
                "spring": "Perfect weather, some crowds",
                "summer": "Very hot in lower elevations, crowded",
                "fall": "Ideal temperatures, moderate crowds",
                "winter": "Bryce often snowy, others mild"
            },
            "photography_tips": [
                "Golden hour essential",
                "Delicate Arch at sunset",
                "Mesa Arch at sunrise",
                "Milky Way at Bryce"
            ],
            "park_pass": "$35/vehicle per park or $80 annual pass",
            "water": "Carry plenty - limited in parks"
        }
    },
    {
        "name": "Grand Canyon Rim to Rim Experience",
        "description": "Explore both rims of America's most iconic natural wonder",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["grand_canyon", "arizona", "usa", "national_park", "hiking", "natural_wonder"],
        "template_data": {
            "type": "canyon_exploration",
            "location": "Northern Arizona",
            "south_rim": {
                "coordinates": {"lat": 36.0544, "lng": -112.1401},
                "elevation": "7000 feet",
                "open": "Year-round",
                "highlights": [
                    {
                        "name": "Mather Point",
                        "feature": "First viewpoint from entrance"
                    },
                    {
                        "name": "Bright Angel Trail",
                        "difficulty": "Strenuous",
                        "options": ["3-mile resthouse", "Indian Garden", "River (permit)"]
                    },
                    {
                        "name": "Hermit Road",
                        "length": "7 miles",
                        "access": "Shuttle or bike March-November"
                    },
                    {
                        "name": "Desert View Watchtower",
                        "feature": "Historic stone tower",
                        "drive": "25 miles east"
                    }
                ],
                "camping": [
                    {
                        "name": "Mather Campground",
                        "sites": "327",
                        "amenities": ["Showers nearby", "Market", "Shuttle access"],
                        "reservations": "Essential Mar-Nov"
                    },
                    {
                        "name": "Trailer Village RV Park",
                        "features": ["Full hookups", "Near rim", "Year-round"]
                    }
                ]
            },
            "north_rim": {
                "coordinates": {"lat": 36.2138, "lng": -112.0634},
                "elevation": "8000 feet",
                "open": "May 15 - October 15",
                "highlights": [
                    "Bright Angel Point",
                    "Cape Royal Drive",
                    "Point Imperial",
                    "North Kaibab Trail"
                ],
                "camping": {
                    "name": "North Rim Campground",
                    "sites": "90",
                    "note": "No hookups, generators allowed"
                }
            },
            "rim_to_rim_options": [
                {
                    "type": "Hike",
                    "distance": "24 miles",
                    "difficulty": "Extremely strenuous",
                    "permit": "Required for overnight"
                },
                {
                    "type": "Drive",
                    "distance": "215 miles",
                    "duration": "4.5 hours",
                    "route": "Around via Cameron"
                },
                {
                    "type": "Shuttle",
                    "service": "Trans-Canyon Shuttle",
                    "duration": "4.5 hours",
                    "season": "May 15 - Oct 15"
                }
            ],
            "best_times": {
                "south_rim": "Spring and fall",
                "north_rim": "Summer only",
                "avoid": "Summer midday heat"
            },
            "sunrise_sunset_spots": [
                "Hopi Point (sunset)",
                "Mather Point (sunrise)",
                "Cape Royal (both)"
            ],
            "entry_fee": "$35/vehicle (valid 7 days)",
            "warnings": ["Altitude affects some", "Don't hike down unprepared", "Summer temps exceed 100°F in canyon"]
        }
    },
    
    # === SOUTHEAST ===
    {
        "name": "Blue Ridge Parkway: Appalachian Highlands",
        "description": "America's favorite drive through the Appalachian Mountains from Virginia to North Carolina",
        "category": "mountain_scenic",
        "is_public": True,
        "tags": ["blue_ridge_parkway", "appalachian", "virginia", "north_carolina", "usa", "scenic_drive"],
        "template_data": {
            "type": "scenic_parkway",
            "distance": "755km",
            "duration": "3-5 days minimum",
            "speed_limit": "45 mph max",
            "mileposts": "469 total",
            "northern_section": {
                "start": "Shenandoah NP, Virginia",
                "coordinates": {"lat": 38.0336, "lng": -78.5080},
                "highlights": [
                    {
                        "name": "Humpback Rocks",
                        "milepost": 5.8,
                        "feature": "Historic farm, hiking"
                    },
                    {
                        "name": "Natural Bridge",
                        "milepost": 61.5,
                        "feature": "215-foot limestone arch"
                    },
                    {
                        "name": "Peaks of Otter",
                        "milepost": 86,
                        "features": ["Lodge", "Lake", "Sharp Top hike"]
                    },
                    {
                        "name": "Roanoke",
                        "milepost": 120,
                        "feature": "Largest city on parkway"
                    }
                ]
            },
            "southern_section": {
                "highlights": [
                    {
                        "name": "Mabry Mill",
                        "milepost": 176,
                        "feature": "Most photographed spot",
                        "coordinates": {"lat": 36.7506, "lng": -80.4023}
                    },
                    {
                        "name": "Blue Ridge Music Center",
                        "milepost": 213,
                        "feature": "Traditional mountain music"
                    },
                    {
                        "name": "Grandfather Mountain",
                        "milepost": 305,
                        "features": ["Mile-high bridge", "Wildlife habitats"]
                    },
                    {
                        "name": "Mount Mitchell",
                        "milepost": 355,
                        "feature": "Highest peak east of Mississippi"
                    }
                ],
                "end": "Great Smoky Mountains NP, NC"
            },
            "camping_along_parkway": [
                {
                    "name": "Otter Creek Campground",
                    "milepost": 60.8,
                    "features": ["Creek sites", "Restaurant nearby"],
                    "virginia": True
                },
                {
                    "name": "Rocky Knob Campground",
                    "milepost": 167,
                    "features": ["High elevation", "Cool summers"]
                },
                {
                    "name": "Linville Falls Campground",
                    "milepost": 316.4,
                    "features": ["Near waterfalls", "RV sites"],
                    "north_carolina": True
                }
            ],
            "seasonal_highlights": {
                "spring": "Wildflowers, rhododendrons",
                "summer": "Cool mountain escape",
                "fall": "Spectacular foliage (October)",
                "winter": "Sections may close for ice"
            },
            "nearby_attractions": [
                "Asheville (artsy mountain city)",
                "Biltmore Estate",
                "Great Smoky Mountains NP",
                "Shenandoah NP"
            ],
            "services": "Limited - plan fuel stops",
            "no_commercial_vehicles": True,
            "free_admission": True
        }
    },
    {
        "name": "Florida Keys: Tropical Island Highway",
        "description": "Island hop 180km from mainland to Key West on the Overseas Highway",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["florida_keys", "key_west", "florida", "usa", "tropical", "island_hopping"],
        "template_data": {
            "type": "island_chain",
            "highway": "US Route 1",
            "distance": "180km Miami to Key West",
            "duration": "3.5 hours minimum (full day with stops)",
            "key_stops": [
                {
                    "name": "Key Largo",
                    "mile_marker": 90-107,
                    "coordinates": {"lat": 25.0865, "lng": -80.4473},
                    "features": ["John Pennekamp Coral Reef SP", "Diving capital"],
                    "famous_for": "First underwater park"
                },
                {
                    "name": "Islamorada",
                    "mile_marker": 80-90,
                    "features": ["Sport fishing capital", "History of Diving Museum"],
                    "coordinates": {"lat": 24.9243, "lng": -80.6278}
                },
                {
                    "name": "Marathon",
                    "mile_marker": 45-65,
                    "features": ["Turtle Hospital", "Sombrero Beach", "Seven Mile Bridge"],
                    "coordinates": {"lat": 24.7128, "lng": -81.0884}
                },
                {
                    "name": "Big Pine Key",
                    "mile_marker": 30-40,
                    "features": ["Key deer refuge", "Blue Hole"],
                    "wildlife": "Tiny Key deer"
                },
                {
                    "name": "Key West",
                    "mile_marker": 0,
                    "coordinates": {"lat": 24.5551, "lng": -81.7800},
                    "features": ["Southernmost Point", "Duval Street", "Hemingway House"],
                    "sunset": "Mallory Square celebration"
                }
            ],
            "camping_options": [
                {
                    "name": "John Pennekamp Coral Reef State Park",
                    "location": "Key Largo",
                    "features": ["Waterfront sites", "Boat ramp", "Snorkeling"],
                    "sites": "47 RV sites"
                },
                {
                    "name": "Long Key State Park",
                    "mile_marker": 67.5,
                    "features": ["Oceanfront sites", "Nature trail", "Kayaking"],
                    "note": "Very popular - book early"
                },
                {
                    "name": "Bahia Honda State Park",
                    "mile_marker": 37,
                    "features": ["Best beaches", "Old bridge views", "Snorkeling"],
                    "coordinates": {"lat": 24.6565, "lng": -81.2745}
                },
                {
                    "name": "Boyd's Key West Campground",
                    "features": ["Near Key West", "Pool", "Full hookups"],
                    "location": "Stock Island"
                }
            ],
            "activities": [
                "Snorkeling/Diving",
                "Fishing (offshore, flats, bridge)",
                "Kayaking mangroves",
                "Sunset watching",
                "Bar hopping in Key West"
            ],
            "bridges": [
                "Seven Mile Bridge (Marathon)",
                "Card Sound Bridge (alternate route)",
                "Bahia Honda Bridge"
            ],
            "best_season": "December to May (dry season)",
            "hurricane_season": "June to November",
            "tips": ["Book camping months ahead", "Bring reef-safe sunscreen", "Watch for Key deer at night"]
        }
    },
    
    # === MIDWEST ===
    {
        "name": "Great Lakes Circle Tour",
        "description": "Epic journey around all five Great Lakes through 8 states and Canada",
        "category": "scenic_routes",
        "is_public": True,
        "tags": ["great_lakes", "michigan", "wisconsin", "midwest", "usa", "circle_tour"],
        "template_data": {
            "type": "lake_circuit",
            "total_distance": "6500km+",
            "duration": "4-6 weeks",
            "lakes": ["Superior", "Michigan", "Huron", "Erie", "Ontario"],
            "key_segments": [
                {
                    "name": "Lake Superior Circle",
                    "distance": "2000km",
                    "highlights": [
                        {
                            "name": "Pictured Rocks",
                            "location": "Michigan UP",
                            "coordinates": {"lat": 46.5708, "lng": -86.3142},
                            "features": ["Colored cliffs", "Waterfalls", "Beaches"]
                        },
                        {
                            "name": "Apostle Islands",
                            "location": "Wisconsin",
                            "features": ["Sea caves", "Lighthouses", "Kayaking"]
                        },
                        {
                            "name": "Split Rock Lighthouse",
                            "location": "Minnesota",
                            "coordinates": {"lat": 47.2000, "lng": -91.3672}
                        },
                        {
                            "name": "Thunder Bay",
                            "location": "Ontario",
                            "features": ["Sleeping Giant", "Canadian gateway"]
                        }
                    ]
                },
                {
                    "name": "Lake Michigan Circle",
                    "highlights": [
                        {
                            "name": "Sleeping Bear Dunes",
                            "location": "Michigan",
                            "coordinates": {"lat": 44.8111, "lng": -86.0589},
                            "features": ["Massive dunes", "Scenic drive", "Beach"]
                        },
                        {
                            "name": "Door County",
                            "location": "Wisconsin",
                            "features": ["Cherry orchards", "Fish boils", "Lighthouses"]
                        },
                        {
                            "name": "Chicago",
                            "location": "Illinois",
                            "features": ["Architecture", "Museums", "Lakefront"]
                        }
                    ]
                }
            ],
            "camping_highlights": [
                {
                    "name": "Tahquamenon Falls State Park",
                    "location": "Michigan UP",
                    "features": ["Upper and Lower falls", "Brewery on site"]
                },
                {
                    "name": "Peninsula State Park",
                    "location": "Door County, WI",
                    "features": ["Golf course", "Theater", "Tower views"]
                },
                {
                    "name": "Muskegon State Park",
                    "location": "Michigan",
                    "features": ["Beach", "Dunes", "Winter sports"]
                }
            ],
            "ferry_crossings": [
                {
                    "route": "Ludington-Manitowoc",
                    "saves": "Driving around Lake Michigan",
                    "duration": "4 hours"
                },
                {
                    "route": "Tobermory-Manitoulin Island",
                    "location": "Ontario",
                    "feature": "Scenic Georgian Bay"
                }
            ],
            "lighthouse_trail": "Over 150 historic lighthouses",
            "best_season": "June to September",
            "fall_colors": "Late September to October",
            "winter_consideration": "Many parks close/limited services",
            "passport_required": "For Canadian portions"
        }
    },
    {
        "name": "Black Hills & Badlands Adventure",
        "description": "Sacred lands, presidents' faces, and alien landscapes in South Dakota",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["black_hills", "badlands", "south_dakota", "usa", "mount_rushmore", "midwest"],
        "template_data": {
            "type": "hills_and_badlands",
            "region": "South Dakota",
            "duration": "4-5 days minimum",
            "black_hills": {
                "sacred_to": "Lakota people",
                "highest_point": "Black Elk Peak (7242 ft)",
                "key_attractions": [
                    {
                        "name": "Mount Rushmore",
                        "coordinates": {"lat": 43.8791, "lng": -103.4591},
                        "features": ["Presidents' faces", "Evening lighting", "Museum"],
                        "parking": "$10/vehicle"
                    },
                    {
                        "name": "Crazy Horse Memorial",
                        "coordinates": {"lat": 43.8356, "lng": -103.6189},
                        "status": "In progress since 1948",
                        "features": ["Museum", "Native American culture"],
                        "admission": "$15/person"
                    },
                    {
                        "name": "Custer State Park",
                        "coordinates": {"lat": 43.7328, "lng": -103.4122},
                        "features": ["Wildlife Loop", "1400 bison", "Needles Highway"],
                        "fee": "$20/vehicle"
                    },
                    {
                        "name": "Wind Cave National Park",
                        "features": ["Boxwork formations", "Prairie wildlife"],
                        "tours": "Reserve online"
                    },
                    {
                        "name": "Jewel Cave",
                        "claim": "3rd longest cave in world",
                        "tours": "Various difficulty levels"
                    }
                ],
                "scenic_drives": [
                    "Needles Highway (SD 87)",
                    "Iron Mountain Road (US 16A)",
                    "Wildlife Loop Road"
                ]
            },
            "badlands": {
                "type": "National Park",
                "coordinates": {"lat": 43.8554, "lng": -102.3397},
                "features": ["Eroded buttes", "Fossil beds", "Prairie dogs"],
                "highlights": [
                    "Badlands Loop Road",
                    "Notch Trail",
                    "Fossil Exhibit Trail",
                    "Night sky viewing"
                ],
                "camping": {
                    "name": "Cedar Pass Campground",
                    "features": ["Some electric sites", "Near visitor center"]
                }
            },
            "camping_options": [
                {
                    "name": "Custer State Park",
                    "campgrounds": ["Game Lodge", "Legion Lake", "Sylvan Lake"],
                    "features": ["Various settings", "Some hookups", "Reserve early"]
                },
                {
                    "name": "Rafter J Bar Ranch",
                    "location": "Hill City",
                    "features": ["Full hookups", "Near attractions", "Big rig friendly"]
                }
            ],
            "annual_events": [
                "Sturgis Motorcycle Rally (August)",
                "Custer State Park Buffalo Roundup (September)"
            ],
            "best_season": "May to September",
            "weather": "Thunderstorms common in summer",
            "tips": ["Book early if near Sturgis Rally", "Carry layers - weather changes", "Watch for wildlife on roads"]
        }
    },
    
    # === NORTHEAST ===
    {
        "name": "New England Fall Foliage Spectacular",
        "description": "Chase autumn colors through six states on America's most colorful road trip",
        "category": "scenic_routes",
        "is_public": True,
        "tags": ["new_england", "fall_foliage", "vermont", "new_hampshire", "maine", "usa"],
        "template_data": {
            "type": "foliage_tour",
            "states": ["Maine", "New Hampshire", "Vermont", "Massachusetts", "Rhode Island", "Connecticut"],
            "peak_season": "Late September to mid-October",
            "duration": "7-10 days",
            "classic_route": [
                {
                    "name": "White Mountains, NH",
                    "coordinates": {"lat": 44.2705, "lng": -71.3033},
                    "highlights": ["Mount Washington", "Kancamagus Highway", "Franconia Notch"],
                    "peak_time": "Early October"
                },
                {
                    "name": "Green Mountains, VT",
                    "highlights": ["Route 100", "Stowe", "Smugglers Notch"],
                    "features": ["Covered bridges", "Maple farms", "Cheese trail"],
                    "coordinates": {"lat": 44.1371, "lng": -72.8092}
                },
                {
                    "name": "Berkshires, MA",
                    "coordinates": {"lat": 42.3118, "lng": -73.1822},
                    "features": ["Mount Greylock", "Mohawk Trail", "Tanglewood"],
                    "peak_time": "Mid-October"
                },
                {
                    "name": "Maine Coast",
                    "highlights": ["Acadia National Park", "Camden Hills", "Coastal villages"],
                    "coordinates": {"lat": 44.3386, "lng": -68.2733},
                    "bonus": "Lobster season"
                }
            ],
            "scenic_drives": [
                {
                    "name": "Kancamagus Highway",
                    "location": "New Hampshire",
                    "length": "56km",
                    "features": ["No services", "Multiple overlooks", "Waterfalls"]
                },
                {
                    "name": "Route 100",
                    "location": "Vermont",
                    "length": "200+ miles",
                    "features": ["Classic Vermont villages", "Farm stands", "Ski resorts"]
                },
                {
                    "name": "Mohawk Trail",
                    "location": "Massachusetts",
                    "features": ["Hairpin turn", "Native American history"]
                }
            ],
            "camping_recommendations": [
                {
                    "name": "Dolly Copp Campground",
                    "location": "White Mountains, NH",
                    "features": ["176 sites", "Near Mount Washington"],
                    "note": "No hookups"
                },
                {
                    "name": "Quechee State Park",
                    "location": "Vermont",
                    "features": ["Quechee Gorge views", "Some lean-tos"]
                },
                {
                    "name": "Mount Desert Campground",
                    "location": "Near Acadia, ME",
                    "features": ["Ocean views", "Full hookups available"]
                }
            ],
            "fall_experiences": [
                "Apple picking",
                "Pumpkin patches",
                "Corn mazes",
                "Craft fairs",
                "Oktoberfest celebrations"
            ],
            "foliage_reports": "Check state websites for current conditions",
            "tips": [
                "Book accommodations months ahead",
                "Weekdays less crowded",
                "Higher elevations change first",
                "Bring layers - cool mornings"
            ]
        }
    },
    {
        "name": "Acadia National Park & Downeast Maine",
        "description": "Rocky coastline, lighthouses, and lobster rolls in America's easternmost regions",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["acadia", "maine", "new_england", "usa", "national_park", "lobster"],
        "template_data": {
            "type": "coastal_park",
            "location": "Mount Desert Island, Maine",
            "park_stats": {
                "size": "49,000 acres",
                "coastline": "45 miles",
                "mountains": "26 peaks",
                "established": 1919
            },
            "acadia_highlights": [
                {
                    "name": "Cadillac Mountain",
                    "coordinates": {"lat": 44.3528, "lng": -68.2247},
                    "claim": "First sunrise in US (Oct-Mar)",
                    "access": "Summit road or hiking"
                },
                {
                    "name": "Park Loop Road",
                    "distance": "27 miles",
                    "features": ["Thunder Hole", "Sand Beach", "Otter Cliff"],
                    "note": "One way sections"
                },
                {
                    "name": "Jordan Pond",
                    "famous_for": "Popovers at Jordan Pond House",
                    "trails": ["Pond Path", "Bubbles Trail"]
                },
                {
                    "name": "Bass Harbor Head Light",
                    "feature": "Iconic lighthouse",
                    "best_time": "Sunset photography"
                }
            ],
            "camping_options": [
                {
                    "name": "Blackwoods Campground",
                    "location": "Near Bar Harbor",
                    "sites": "280",
                    "features": ["Some RV sites", "No hookups", "Shuttle to town"],
                    "reservations": "Required May-Oct"
                },
                {
                    "name": "Seawall Campground",
                    "location": "Quieter west side",
                    "sites": "200",
                    "features": ["Walk to coast", "First-come sites"]
                },
                {
                    "name": "Bar Harbor Campground",
                    "type": "Private",
                    "features": ["Full hookups", "Pool", "Near town"]
                }
            ],
            "downeast_extension": [
                {
                    "name": "Schoodic Peninsula",
                    "feature": "Less crowded Acadia section",
                    "highlight": "Schoodic Point waves"
                },
                {
                    "name": "Lubec",
                    "claim": "Easternmost US town",
                    "features": ["West Quoddy Head Light", "Campobello Island"]
                },
                {
                    "name": "Eastport",
                    "features": ["Whale watching", "Old Sow whirlpool"],
                    "tides": "18-20 feet"
                }
            ],
            "lobster_trail": [
                "Thurston's Lobster Pound",
                "Beal's Lobster Pier",
                "McLaughlin's Lobster Shack"
            ],
            "activities": [
                "Carriage road biking",
                "Tide pooling",
                "Kayaking",
                "Rock climbing",
                "Ranger programs"
            ],
            "best_season": "June to October",
            "peak_crowds": "July-August",
            "fall_colors": "Early October",
            "park_pass": "$30/vehicle or $55 annual"
        }
    }
]

async def load_usa_data():
    """Load comprehensive USA travel data to trip_templates"""
    
    # Get Supabase credentials
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    
    supabase: Client = create_client(url, key)
    
    print("🌟 Loading Comprehensive USA Travel Data")
    print("=" * 60)
    print(f"📊 Preparing to load {len(USA_DATA)} detailed travel templates")
    print()
    
    success_count = 0
    error_count = 0
    
    # Categories being loaded
    categories = set()
    regions = set()
    
    # Load each template
    for i, template in enumerate(USA_DATA, 1):
        try:
            # Extract metadata
            categories.add(template['category'])
            for tag in template['tags']:
                if any(state in tag for state in ['california', 'arizona', 'utah', 'florida', 'maine', 
                                                   'wyoming', 'south_dakota', 'virginia', 'michigan']):
                    regions.add(tag)
            
            # Add metadata
            template['usage_count'] = 0
            template['created_at'] = datetime.now().isoformat()
            
            # Insert to database
            result = supabase.table('trip_templates').insert(template).execute()
            
            if result.data:
                print(f"✅ [{i:2d}/{len(USA_DATA)}] {template['name']}")
                success_count += 1
            else:
                print(f"❌ [{i:2d}/{len(USA_DATA)}] Failed: {template['name']}")
                error_count += 1
                
        except Exception as e:
            print(f"❌ [{i:2d}/{len(USA_DATA)}] Error: {template['name']} - {str(e)[:50]}...")
            error_count += 1
    
    print("\n" + "=" * 60)
    print(f"🎉 Data Loading Complete!")
    print(f"✅ Successfully loaded: {success_count} templates")
    if error_count > 0:
        print(f"❌ Failed: {error_count} templates")
    
    print(f"\n📍 Coverage:")
    print(f"   Regions: West Coast, Southwest, Southeast, Midwest, Northeast")
    print(f"   Categories: {', '.join(sorted(categories))}")
    
    print("\n🌟 Added comprehensive data for:")
    print("   • National Parks (Yellowstone, Grand Canyon, Zion, etc.)")
    print("   • Iconic road trips (Route 66, PCH, Blue Ridge)")
    print("   • Coastal adventures (Florida Keys, Big Sur)")
    print("   • Mountain experiences (Rockies, Appalachians)")
    print("   • Great Lakes exploration")
    print("   • Desert wonders (Utah, Arizona)")
    print("   • Historical routes and cultural sites")
    print("   • Seasonal experiences (fall foliage, summer beaches)")
    
    print("\n💡 PAM now has detailed USA travel data including:")
    print("   • National Park campgrounds and RV limits")
    print("   • State park systems")
    print("   • Private RV parks and KOAs")
    print("   • Scenic byways and viewpoints")
    print("   • Regional specialties and must-dos")
    print("   • Seasonal considerations and closures")
    
    return success_count > 0

if __name__ == "__main__":
    asyncio.run(load_usa_data())