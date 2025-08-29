#!/usr/bin/env python3
"""
Load comprehensive tourist attractions and points of interest data to trip_templates
This includes landmarks, museums, theme parks, historical sites, and unique attractions
"""

import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime
import json

load_dotenv()

# Comprehensive attractions and POI data
ATTRACTIONS_DATA = [
    # === AUSTRALIA ATTRACTIONS ===
    {
        "name": "Australia's Must-See Attractions & Hidden Gems",
        "description": "Iconic landmarks, unique experiences, and off-the-beaten-path discoveries across Australia",
        "category": "tourist_attractions",
        "is_public": True,
        "tags": ["attractions", "australia", "landmarks", "tourist_spots", "museums", "unique_experiences"],
        "template_data": {
            "type": "attractions_guide",
            "country": "Australia",
            "iconic_attractions": [
                {
                    "name": "Sydney Opera House",
                    "location": "Sydney, NSW",
                    "coordinates": {"lat": -33.8568, "lng": 151.2153},
                    "type": "landmark",
                    "features": [
                        "Architectural icon",
                        "Performance venue",
                        "Harbor views",
                        "Guided tours available"
                    ],
                    "cost": "Tours from $42 AUD",
                    "best_time": "Sunset for photos",
                    "nearby_camping": "Lane Cove River Tourist Park",
                    "tips": ["Book performances ahead", "Walk around Circular Quay", "Combine with Harbour Bridge"]
                },
                {
                    "name": "Uluru (Ayers Rock)",
                    "location": "Northern Territory",
                    "coordinates": {"lat": -25.3444, "lng": 131.0369},
                    "type": "natural_landmark",
                    "cultural_significance": "Sacred to Anangu people",
                    "experiences": [
                        "Base walk (10.6km)",
                        "Field of Light installation",
                        "Sounds of Silence dinner",
                        "Sunrise/sunset viewing"
                    ],
                    "respect": "No climbing - culturally sensitive",
                    "camping": "Ayers Rock Resort Campground",
                    "best_time": "April to September"
                },
                {
                    "name": "Great Ocean Road Twelve Apostles",
                    "location": "Victoria",
                    "coordinates": {"lat": -38.6662, "lng": 143.1044},
                    "type": "natural_formation",
                    "features": [
                        "Limestone stacks",
                        "Visitor center",
                        "Helicopter tours",
                        "Sunset viewing"
                    ],
                    "free": True,
                    "parking": "$2 donation suggested",
                    "nearby": ["Loch Ard Gorge", "Gibson Steps", "Lord Ard Gorge"],
                    "camping": "Port Campbell Holiday Park"
                }
            ],
            "unique_experiences": [
                {
                    "name": "Coober Pedy Underground Town",
                    "location": "South Australia",
                    "coordinates": {"lat": -29.0135, "lng": 134.7544},
                    "type": "unique_town",
                    "features": [
                        "Underground homes",
                        "Opal mining",
                        "Underground churches",
                        "Desert golf course"
                    ],
                    "accommodation": "Underground camping/hotels",
                    "weather": "Extreme heat - that's why it's underground!",
                    "must_see": "Breakaways Reserve"
                },
                {
                    "name": "Horizontal Falls",
                    "location": "Kimberley, WA",
                    "coordinates": {"lat": -16.3969, "lng": 123.9961},
                    "type": "natural_phenomenon",
                    "features": [
                        "Tidal phenomenon",
                        "Seaplane/boat access only",
                        "Jet boat rides",
                        "David Attenborough's 'Natural Wonder'"
                    ],
                    "access": "Tours from Broome or Derby",
                    "cost": "From $395 for seaplane tour",
                    "season": "March to October"
                },
                {
                    "name": "Pink Lake (Lake Hillier)",
                    "location": "Middle Island, WA",
                    "coordinates": {"lat": -34.0953, "lng": 123.2033},
                    "type": "natural_wonder",
                    "features": [
                        "Permanently pink water",
                        "Scientific mystery",
                        "Aerial viewing only",
                        "Research station"
                    ],
                    "access": "Scenic flights from Esperance",
                    "why_pink": "Algae and bacteria combination",
                    "similar": "Hutt Lagoon also pink - road accessible"
                }
            ],
            "wildlife_attractions": [
                {
                    "name": "Australia Zoo",
                    "location": "Beerwah, Queensland",
                    "coordinates": {"lat": -26.8419, "lng": 152.9628},
                    "founded_by": "Steve Irwin family",
                    "features": [
                        "Crocodile shows",
                        "Wildlife hospital",
                        "Africa savannah",
                        "Tiger temple"
                    ],
                    "cost": "Adults $59, Kids $35",
                    "camping": "Beerwah Caravan Park nearby",
                    "highlight": "Crocodile feeding shows"
                },
                {
                    "name": "Kangaroo Island Wildlife",
                    "location": "South Australia",
                    "features": [
                        "Seal Bay sea lions",
                        "Remarkable Rocks",
                        "Koala sanctuary",
                        "Little penguins"
                    ],
                    "access": "Ferry from Cape Jervis",
                    "self_drive": "Ideal for exploring",
                    "camping": "Multiple options on island"
                }
            ],
            "aboriginal_culture": [
                {
                    "name": "Kakadu Rock Art",
                    "location": "Northern Territory",
                    "coordinates": {"lat": -12.8628, "lng": 132.3917},
                    "significance": "65,000 years of history",
                    "sites": [
                        "Ubirr",
                        "Nourlangie",
                        "Nanguluwur"
                    ],
                    "guided_tours": "Indigenous guides available",
                    "respect": "Sacred sites - follow guidelines",
                    "camping": "Multiple campgrounds in park"
                },
                {
                    "name": "Tjapukai Aboriginal Cultural Park",
                    "location": "Cairns, Queensland",
                    "features": [
                        "Dance performances",
                        "Didgeridoo demonstrations",
                        "Bush tucker tours",
                        "Art gallery"
                    ],
                    "interactive": "Spear throwing, boomerang",
                    "cost": "From $62 adult",
                    "duration": "Half day experience"
                }
            ],
            "quirky_attractions": [
                {
                    "name": "Big Things Trail",
                    "type": "roadside_attractions",
                    "examples": [
                        {
                            "name": "Big Banana",
                            "location": "Coffs Harbour, NSW",
                            "coordinates": {"lat": -30.3206, "lng": 153.1189}
                        },
                        {
                            "name": "Big Pineapple",
                            "location": "Sunshine Coast, QLD",
                            "coordinates": {"lat": -26.6547, "lng": 152.9669}
                        },
                        {
                            "name": "Big Merino",
                            "location": "Goulburn, NSW",
                            "coordinates": {"lat": -34.7516, "lng": 149.7201}
                        }
                    ],
                    "total": "Over 150 'Big Things' across Australia",
                    "instagram": "Perfect road trip photo ops"
                },
                {
                    "name": "Daly Waters Pub",
                    "location": "Northern Territory",
                    "coordinates": {"lat": -16.2547, "lng": 133.3683},
                    "features": [
                        "Outback icon",
                        "Bra and underwear collection",
                        "Live music",
                        "Character accommodation"
                    ],
                    "history": "Since 1930s",
                    "camping": "Behind pub available"
                }
            ],
            "adventure_attractions": [
                {
                    "name": "Cage of Death",
                    "location": "Darwin, NT",
                    "venue": "Crocosaurus Cove",
                    "experience": "Swim with saltwater crocodiles",
                    "duration": "15 minutes in cage",
                    "cost": "From $170 per person",
                    "age_limit": "15 years+"
                },
                {
                    "name": "Bridge Climb Sydney",
                    "location": "Sydney Harbour Bridge",
                    "options": [
                        "Standard climb",
                        "Express climb",
                        "Dawn/twilight climbs"
                    ],
                    "duration": "3.5 hours",
                    "cost": "From $174",
                    "fitness": "Moderate fitness required"
                }
            ]
        }
    },
    
    # === NEW ZEALAND ATTRACTIONS ===
    {
        "name": "New Zealand's Adventure Capital Attractions",
        "description": "From adrenaline activities to movie locations and cultural experiences",
        "category": "tourist_attractions",
        "is_public": True,
        "tags": ["attractions", "new_zealand", "adventure", "lord_of_rings", "maori_culture", "activities"],
        "template_data": {
            "type": "attractions_guide",
            "country": "New Zealand",
            "adventure_activities": [
                {
                    "name": "Queenstown Bungy",
                    "location": "Queenstown",
                    "coordinates": {"lat": -45.0312, "lng": 168.6626},
                    "options": [
                        {
                            "name": "Kawarau Bridge",
                            "height": "43m",
                            "special": "Original bungy site",
                            "cost": "$205 NZD"
                        },
                        {
                            "name": "The Ledge",
                            "height": "47m",
                            "special": "Harness only, freestyle",
                            "cost": "$205 NZD"
                        },
                        {
                            "name": "Nevis Bungy",
                            "height": "134m",
                            "special": "NZ's highest",
                            "cost": "$275 NZD"
                        }
                    ],
                    "combo_deals": "Multi-activity packages available",
                    "age_limit": "10+ varies by jump"
                },
                {
                    "name": "Skydive Franz Josef",
                    "location": "West Coast",
                    "coordinates": {"lat": -43.3851, "lng": 170.1831},
                    "heights": ["9,000ft", "13,000ft", "16,500ft"],
                    "views": [
                        "Fox & Franz Josef Glaciers",
                        "Mount Cook",
                        "Tasman Sea"
                    ],
                    "cost": "From $299 NZD",
                    "weather_dependent": "Yes - flexible booking"
                },
                {
                    "name": "Shotover Jet",
                    "location": "Queenstown",
                    "experience": "Jet boat through canyon",
                    "famous_for": "360° spins",
                    "duration": "25 minutes",
                    "cost": "$135 NZD adult",
                    "combines_with": "Helicopter tours"
                }
            ],
            "movie_locations": [
                {
                    "name": "Hobbiton Movie Set",
                    "location": "Matamata",
                    "coordinates": {"lat": -37.8721, "lng": 175.6839},
                    "features": [
                        "44 hobbit holes",
                        "Green Dragon Inn",
                        "Party Tree",
                        "Guided tours only"
                    ],
                    "includes": "Complimentary beverage",
                    "duration": "2 hours",
                    "cost": "$89 NZD adult",
                    "book_ahead": "Essential",
                    "camping": "Matamata township"
                },
                {
                    "name": "Weta Workshop",
                    "location": "Wellington",
                    "coordinates": {"lat": -41.3051, "lng": 174.8256},
                    "tours": [
                        "Workshop Tour",
                        "Thunderbirds Tour",
                        "Evening Workshop Experience"
                    ],
                    "see": "Props, costumes, weapons from LOTR",
                    "cost": "From $28 NZD",
                    "hands_on": "Make your own props experience"
                },
                {
                    "name": "Mount Sunday (Edoras)",
                    "location": "Canterbury",
                    "coordinates": {"lat": -43.5672, "lng": 170.8892},
                    "significance": "Rohan's capital in LOTR",
                    "access": "4WD recommended or tours",
                    "features": ["360° mountain views", "No structures remain"],
                    "nearby": "Lake Clearwater camping"
                }
            ],
            "maori_experiences": [
                {
                    "name": "Te Puia",
                    "location": "Rotorua",
                    "coordinates": {"lat": -38.1625, "lng": 176.2556},
                    "features": [
                        "Pohutu Geyser",
                        "Maori arts school",
                        "Kiwi conservation",
                        "Cultural performances"
                    ],
                    "evening_experience": "Te Po - dinner & show",
                    "cost": "Day entry from $60 NZD",
                    "highlight": "See traditional crafts being made"
                },
                {
                    "name": "Waitangi Treaty Grounds",
                    "location": "Bay of Islands",
                    "coordinates": {"lat": -35.2653, "lng": 174.0817},
                    "significance": "Birthplace of modern NZ",
                    "features": [
                        "Treaty House",
                        "Carved meeting house",
                        "War canoe",
                        "Cultural performances"
                    ],
                    "guided_tours": "Included in entry",
                    "cost": "$50 NZD adult",
                    "museum": "Interactive displays"
                }
            ],
            "natural_wonders": [
                {
                    "name": "Waitomo Glowworm Caves",
                    "location": "Waikato",
                    "coordinates": {"lat": -38.2614, "lng": 175.1036},
                    "experiences": [
                        {
                            "name": "Glowworm Cave tour",
                            "duration": "45 minutes",
                            "includes": "Boat ride",
                            "cost": "$55 NZD"
                        },
                        {
                            "name": "Black water rafting",
                            "adventure_level": "High",
                            "duration": "3-5 hours",
                            "cost": "From $130 NZD"
                        }
                    ],
                    "combo_tickets": "Multiple cave options",
                    "camping": "Top 10 Holiday Park nearby"
                },
                {
                    "name": "Moeraki Boulders",
                    "location": "Otago Coast",
                    "coordinates": {"lat": -45.3454, "lng": 170.8260},
                    "features": [
                        "Spherical boulders on beach",
                        "Up to 2m diameter",
                        "Best at low tide",
                        "Cafe with viewing deck"
                    ],
                    "access": "Small fee or free beach access",
                    "legend": "Maori eel baskets",
                    "photography": "Sunrise/sunset best"
                }
            ],
            "unique_attractions": [
                {
                    "name": "Puzzling World",
                    "location": "Wanaka",
                    "coordinates": {"lat": -44.6975, "lng": 169.1419},
                    "features": [
                        "Illusion rooms",
                        "Great maze",
                        "Puzzle café",
                        "Leaning tower"
                    ],
                    "duration": "2-3 hours",
                    "cost": "$20 NZD adult",
                    "family_friendly": "All ages"
                },
                {
                    "name": "International Antarctic Centre",
                    "location": "Christchurch",
                    "experiences": [
                        "Antarctic storm room",
                        "Hagglund ride",
                        "Blue penguin encounter",
                        "4D theatre"
                    ],
                    "cost": "$59 NZD adult",
                    "duration": "2-3 hours",
                    "location": "Near airport"
                }
            ],
            "scenic_flights": [
                {
                    "name": "Mount Cook Ski Planes",
                    "base": "Lake Tekapo/Mount Cook",
                    "options": [
                        "Glacier landing",
                        "Grand Circle",
                        "Tasman Glacier"
                    ],
                    "unique": "Land on glacier",
                    "cost": "From $399 NZD",
                    "season": "Weather dependent"
                },
                {
                    "name": "Milford Sound Scenic Flight",
                    "departure": "Queenstown",
                    "includes": "Glacier lakes, fiords, mountains",
                    "combo": "Fly-cruise-fly options",
                    "advantage": "Skip long drive",
                    "cost": "From $385 NZD"
                }
            ]
        }
    },
    
    # === CANADA ATTRACTIONS ===
    {
        "name": "Canada's Natural Wonders & Cultural Treasures",
        "description": "From Niagara Falls to Northern Lights, experience Canada's diverse attractions",
        "category": "tourist_attractions",
        "is_public": True,
        "tags": ["attractions", "canada", "niagara_falls", "northern_lights", "museums", "natural_wonders"],
        "template_data": {
            "type": "attractions_guide",
            "country": "Canada",
            "natural_wonders": [
                {
                    "name": "Niagara Falls",
                    "province": "Ontario",
                    "coordinates": {"lat": 43.0896, "lng": -79.0849},
                    "components": [
                        "Horseshoe Falls",
                        "American Falls",
                        "Bridal Veil Falls"
                    ],
                    "experiences": [
                        {
                            "name": "Hornblower Cruise",
                            "season": "April-November",
                            "cost": "$32.75 CAD",
                            "gets_wet": "Poncho provided"
                        },
                        {
                            "name": "Journey Behind Falls",
                            "year_round": True,
                            "cost": "$22.75 CAD",
                            "see": "Falls from behind"
                        },
                        {
                            "name": "Skylon Tower",
                            "height": "236m",
                            "features": ["Observation deck", "Revolving restaurant"],
                            "cost": "$18.95 CAD"
                        }
                    ],
                    "illumination": "Nightly year-round",
                    "fireworks": "Summer evenings",
                    "camping": "Niagara Falls KOA"
                },
                {
                    "name": "Northern Lights Viewing",
                    "best_locations": [
                        {
                            "name": "Yellowknife, NWT",
                            "coordinates": {"lat": 62.4540, "lng": -114.3718},
                            "season": "Aug-Apr & Dec-Mar",
                            "success_rate": "90% over 3 nights",
                            "tours": "Aurora Village, heated teepees"
                        },
                        {
                            "name": "Churchill, MB",
                            "coordinates": {"lat": 58.7684, "lng": -94.1647},
                            "bonus": "Polar bears in fall",
                            "season": "Jan-Mar best",
                            "access": "Fly or train only"
                        },
                        {
                            "name": "Jasper Dark Sky",
                            "coordinates": {"lat": 52.8737, "lng": -118.0814},
                            "advantage": "Road accessible",
                            "festival": "October Dark Sky Festival"
                        }
                    ],
                    "aurora_apps": ["Aurora alerts", "Aurora forecast"],
                    "photography": "Tripod essential"
                },
                {
                    "name": "Bay of Fundy Tides",
                    "provinces": ["New Brunswick", "Nova Scotia"],
                    "features": [
                        "16m tidal range",
                        "100 billion tonnes water",
                        "Walk on ocean floor"
                    ],
                    "key_spots": [
                        {
                            "name": "Hopewell Rocks",
                            "coordinates": {"lat": 45.8244, "lng": -64.5733},
                            "do": "Walk among flowerpot rocks",
                            "timing": "Low tide essential"
                        },
                        {
                            "name": "Tidal bore rafting",
                            "location": "Shubenacadie River",
                            "adventure": "Ride tidal wave",
                            "wet": "Very!"
                        }
                    ]
                }
            ],
            "cultural_attractions": [
                {
                    "name": "CN Tower",
                    "location": "Toronto",
                    "coordinates": {"lat": 43.6426, "lng": -79.3871},
                    "height": "553.3m",
                    "experiences": [
                        "Glass floor",
                        "EdgeWalk (hands-free walk outside)",
                        "360 Restaurant"
                    ],
                    "edgewalk": {
                        "cost": "$225 CAD",
                        "duration": "90 minutes",
                        "includes": "Video & photos"
                    },
                    "general_admission": "$43 CAD",
                    "skip_line": "Buy online"
                },
                {
                    "name": "Old Quebec City",
                    "province": "Quebec",
                    "coordinates": {"lat": 46.8139, "lng": -71.2080},
                    "unesco": "World Heritage Site",
                    "highlights": [
                        "Château Frontenac",
                        "Plains of Abraham",
                        "Petit-Champlain",
                        "City walls"
                    ],
                    "best_time": "Year-round charm",
                    "winter": "Winter Carnival (Feb)",
                    "camping": "Camping Transit (20min)"
                },
                {
                    "name": "Royal Canadian Mint",
                    "location": "Winnipeg",
                    "coordinates": {"lat": 49.8951, "lng": -97.1384},
                    "tour_highlights": [
                        "See money being made",
                        "Hold gold bar ($750,000)",
                        "Olympic medals made here"
                    ],
                    "cost": "$6 CAD",
                    "duration": "45 minutes",
                    "book_ahead": "Recommended"
                }
            ],
            "unique_experiences": [
                {
                    "name": "Polar Bear Tours",
                    "location": "Churchill, Manitoba",
                    "season": "October-November",
                    "vehicles": "Tundra Buggies",
                    "also_see": "Beluga whales (summer)",
                    "accommodations": "Tundra Buggy Lodge",
                    "cost": "Multi-day packages from $2000"
                },
                {
                    "name": "Icefields Parkway",
                    "provinces": ["Alberta", "BC"],
                    "length": "232km",
                    "highlights": [
                        "Athabasca Glacier",
                        "Peyto Lake",
                        "Bow Lake",
                        "Wildlife viewing"
                    ],
                    "glacier_experience": {
                        "name": "Columbia Icefield Adventure",
                        "vehicle": "Ice Explorer",
                        "includes": "Glacier Skywalk",
                        "cost": "$125 CAD"
                    }
                },
                {
                    "name": "Capilano Suspension Bridge",
                    "location": "Vancouver",
                    "coordinates": {"lat": 49.3429, "lng": -123.1149},
                    "stats": "137m long, 70m high",
                    "park_includes": [
                        "Treetops Adventure",
                        "Cliffwalk",
                        "First Nations culture"
                    ],
                    "cost": "$64.95 CAD adult",
                    "free_shuttle": "From downtown Vancouver"
                }
            ],
            "museums_galleries": [
                {
                    "name": "Canadian Museum of History",
                    "location": "Gatineau, QC",
                    "features": [
                        "Grand Hall with totem poles",
                        "First Peoples Hall",
                        "Canadian History Hall"
                    ],
                    "architecture": "Douglas Cardinal design",
                    "cost": "$20 CAD",
                    "free": "Thursdays 5-8pm"
                },
                {
                    "name": "Royal Tyrrell Museum",
                    "location": "Drumheller, AB",
                    "focus": "Paleontology",
                    "highlights": [
                        "130,000+ fossils",
                        "T-Rex 'Black Beauty'",
                        "Hands-on experiences"
                    ],
                    "nearby": "Dinosaur Provincial Park",
                    "badlands": "Unique landscape"
                }
            ],
            "seasonal_attractions": [
                {
                    "name": "Quebec Winter Carnival",
                    "when": "February",
                    "features": [
                        "Ice palace",
                        "Night parades",
                        "Ice sculptures",
                        "Bonhomme mascot"
                    ],
                    "unique": "World's largest winter carnival"
                },
                {
                    "name": "Calgary Stampede",
                    "when": "July",
                    "nickname": "Greatest Outdoor Show",
                    "events": [
                        "Rodeo",
                        "Chuckwagon races",
                        "Midway",
                        "Concerts"
                    ],
                    "duration": "10 days",
                    "camping": "Book very early"
                }
            ]
        }
    },
    
    # === USA ATTRACTIONS ===
    {
        "name": "USA's Iconic Landmarks & Hidden Treasures",
        "description": "From Lady Liberty to Area 51, America's most famous and unusual attractions",
        "category": "tourist_attractions",
        "is_public": True,
        "tags": ["attractions", "usa", "landmarks", "theme_parks", "national_monuments", "roadside_attractions"],
        "template_data": {
            "type": "attractions_guide",
            "country": "USA",
            "iconic_landmarks": [
                {
                    "name": "Statue of Liberty",
                    "location": "New York",
                    "coordinates": {"lat": 40.6892, "lng": -74.0445},
                    "tickets": [
                        {
                            "type": "Grounds only",
                            "cost": "$24.30",
                            "includes": "Ferry, Ellis Island"
                        },
                        {
                            "type": "Pedestal access",
                            "cost": "$24.80",
                            "book": "Weeks ahead"
                        },
                        {
                            "type": "Crown access",
                            "cost": "$24.80",
                            "book": "2-3 months ahead",
                            "limit": "4 tickets per order"
                        }
                    ],
                    "ferry_departure": "Battery Park or Liberty State Park",
                    "time_needed": "4-5 hours total",
                    "camping": "Liberty Harbor RV Park, NJ"
                },
                {
                    "name": "Mount Rushmore",
                    "location": "South Dakota",
                    "coordinates": {"lat": 43.8791, "lng": -103.4591},
                    "features": [
                        "60ft tall faces",
                        "Evening lighting ceremony",
                        "Presidential Trail",
                        "Sculptor's Studio"
                    ],
                    "parking": "$10/vehicle (annual pass)",
                    "free_viewing": "From highway pullouts",
                    "nearby": "Crazy Horse Memorial",
                    "camping": "Custer State Park"
                },
                {
                    "name": "Golden Gate Bridge",
                    "location": "San Francisco",
                    "coordinates": {"lat": 37.8199, "lng": -122.4783},
                    "experiences": [
                        "Walk/bike across (free)",
                        "Vista points both sides",
                        "Battery Spencer viewpoint",
                        "Boat tours underneath"
                    ],
                    "parking": "Limited - arrive early",
                    "fog": "Common in summer mornings",
                    "rv_parking": "Challenging - use tour"
                }
            ],
            "theme_parks": [
                {
                    "name": "Walt Disney World",
                    "location": "Orlando, Florida",
                    "parks": [
                        "Magic Kingdom",
                        "EPCOT",
                        "Hollywood Studios",
                        "Animal Kingdom"
                    ],
                    "tickets": "$109-189/day varies by date",
                    "genie_plus": "Skip lines - $15-25/day",
                    "camping": "Disney's Fort Wilderness Resort",
                    "rv_sites": "Full hookups, resort amenities",
                    "tips": ["Book 60 days out", "Use app for wait times"]
                },
                {
                    "name": "Universal Studios Hollywood",
                    "location": "California",
                    "coordinates": {"lat": 34.1381, "lng": -118.3534},
                    "must_do": [
                        "Studio Tour",
                        "Wizarding World of Harry Potter",
                        "Jurassic World ride"
                    ],
                    "express_pass": "Skip lines - from $189",
                    "combo": "With Universal Orlando",
                    "rv_parking": "Oversized vehicle lot"
                }
            ],
            "natural_phenomena": [
                {
                    "name": "Old Faithful",
                    "location": "Yellowstone NP",
                    "coordinates": {"lat": 44.4605, "lng": -110.8281},
                    "eruptions": "Every 60-110 minutes",
                    "prediction": "Visitor center posts times",
                    "webcam": "Live stream available",
                    "nearby_camping": "Madison Campground",
                    "other_geysers": "Upper Geyser Basin walk"
                },
                {
                    "name": "Northern Lights Alaska",
                    "location": "Fairbanks",
                    "coordinates": {"lat": 64.8378, "lng": -147.7164},
                    "best_time": "August-April",
                    "peak": "March equinox",
                    "tours": [
                        "Heated aurora domes",
                        "Dog sledding combos",
                        "Photography workshops"
                    ],
                    "forecast": "UAF aurora forecast",
                    "camping": "Chena Hot Springs Resort"
                }
            ],
            "quirky_attractions": [
                {
                    "name": "Area 51 Alien Highway",
                    "location": "Nevada",
                    "highway": "SR 375 - Extraterrestrial Highway",
                    "stops": [
                        {
                            "name": "Little A'Le'Inn",
                            "location": "Rachel, NV",
                            "features": ["Alien burgers", "Gift shop", "Basic rooms"]
                        },
                        {
                            "name": "Black Mailbox",
                            "note": "Now white, GPS: 37.2489°N 115.3631°W"
                        }
                    ],
                    "warning": "No services for 150 miles",
                    "photography": "Restricted near base",
                    "camping": "Dispersed desert camping"
                },
                {
                    "name": "Carhenge",
                    "location": "Alliance, Nebraska",
                    "coordinates": {"lat": 42.1422, "lng": -102.8589},
                    "what": "Stonehenge replica with cars",
                    "created": "1987 by Jim Reinders",
                    "admission": "Free",
                    "features": ["Visitor center", "Gift shop", "Car art reserve"],
                    "camping": "Alliance city parks"
                },
                {
                    "name": "Cadillac Ranch",
                    "location": "Amarillo, Texas",
                    "coordinates": {"lat": 35.1872, "lng": -101.9873},
                    "features": [
                        "10 Cadillacs buried nose-down",
                        "Bring spray paint",
                        "Public art installation"
                    ],
                    "access": "Free, roadside",
                    "route_66": "Classic stop",
                    "camping": "Amarillo KOA"
                }
            ],
            "museums_institutions": [
                {
                    "name": "Smithsonian Museums",
                    "location": "Washington DC",
                    "free_admission": "All Smithsonian museums",
                    "highlights": [
                        "Natural History (Hope Diamond)",
                        "Air & Space",
                        "American History",
                        "Native American"
                    ],
                    "timed_entry": "Some require passes",
                    "rv_parking": "Use Metro, park outside city",
                    "camping": "Cherry Hill Park, MD"
                },
                {
                    "name": "Kennedy Space Center",
                    "location": "Florida",
                    "coordinates": {"lat": 28.5721, "lng": -80.6480},
                    "experiences": [
                        "Space Shuttle Atlantis",
                        "Saturn V rocket",
                        "Astronaut encounters",
                        "Launch viewing"
                    ],
                    "tickets": "$75 adult",
                    "launch_schedule": "Check NASA site",
                    "camping": "Jetty Park Campground"
                }
            ],
            "historic_sites": [
                {
                    "name": "Alcatraz Island",
                    "location": "San Francisco Bay",
                    "ferry": "From Pier 33",
                    "audio_tour": "Included - excellent",
                    "book_ahead": "2-3 weeks minimum",
                    "cost": "$41 adult",
                    "duration": "2.5-3 hours",
                    "tip": "Early bird or night tours"
                },
                {
                    "name": "Pearl Harbor",
                    "location": "Honolulu, Hawaii",
                    "coordinates": {"lat": 21.3650, "lng": -157.9388},
                    "sites": [
                        "USS Arizona Memorial (free, reserve online)",
                        "USS Missouri Battleship",
                        "USS Bowfin Submarine",
                        "Aviation Museum"
                    ],
                    "parking": "$7",
                    "no_bags": "Storage available $7"
                }
            ],
            "scenic_wonders": [
                {
                    "name": "Antelope Canyon",
                    "location": "Page, Arizona",
                    "types": [
                        {
                            "name": "Upper Antelope",
                            "navajo": "Tsé bighánílíní",
                            "features": "Light beams, easier walk",
                            "cost": "$90-120 with guide"
                        },
                        {
                            "name": "Lower Antelope",
                            "features": "Ladders, less crowded",
                            "cost": "$50-80 with guide"
                        }
                    ],
                    "photography": "Tripods extra fee",
                    "book": "Essential - Navajo guided only",
                    "camping": "Page Lake Powell Campground"
                },
                {
                    "name": "Horseshoe Bend",
                    "location": "Page, Arizona",
                    "coordinates": {"lat": 36.8791, "lng": -111.5103},
                    "hike": "1.5 miles round trip",
                    "parking": "$10/vehicle",
                    "best_time": "Sunrise or sunset",
                    "safety": "No barriers - careful!",
                    "combine_with": "Antelope Canyon"
                }
            ]
        }
    },
    
    # === GREAT BRITAIN ATTRACTIONS ===
    {
        "name": "Great Britain's Historic Sites & Modern Marvels",
        "description": "From ancient stone circles to royal palaces and quirky British attractions",
        "category": "tourist_attractions",
        "is_public": True,
        "tags": ["attractions", "uk", "castles", "museums", "historic_sites", "harry_potter", "british"],
        "template_data": {
            "type": "attractions_guide",
            "country": "Great Britain",
            "royal_attractions": [
                {
                    "name": "Buckingham Palace",
                    "location": "London",
                    "coordinates": {"lat": 51.5014, "lng": -0.1419},
                    "experiences": [
                        {
                            "name": "State Rooms",
                            "when": "July-September",
                            "cost": "£30 adult",
                            "book": "Advance recommended"
                        },
                        {
                            "name": "Changing of Guard",
                            "when": "11am most days",
                            "cost": "Free",
                            "tip": "Arrive by 10:15am"
                        },
                        {
                            "name": "Royal Mews",
                            "see": "Royal carriages",
                            "cost": "£13.50"
                        }
                    ],
                    "garden_tours": "Selected dates",
                    "rv_parking": "Not in central London - use transport"
                },
                {
                    "name": "Edinburgh Castle",
                    "location": "Scotland",
                    "coordinates": {"lat": 55.9486, "lng": -3.1999},
                    "perched": "Castle Rock - extinct volcano",
                    "highlights": [
                        "Crown Jewels of Scotland",
                        "Stone of Destiny",
                        "One O'Clock Gun",
                        "St Margaret's Chapel (1130)"
                    ],
                    "cost": "£19.50 adult",
                    "audio_guide": "Included",
                    "military_tattoo": "August - book early",
                    "camping": "Mortonhall Caravan Park"
                },
                {
                    "name": "Windsor Castle",
                    "location": "Berkshire",
                    "coordinates": {"lat": 51.4839, "lng": -0.6044},
                    "claims": "Oldest occupied castle",
                    "must_see": [
                        "State Apartments",
                        "St George's Chapel",
                        "Queen Mary's Dolls' House"
                    ],
                    "cost": "£28.50 adult",
                    "parking": "Park & ride recommended",
                    "combine": "Hampton Court same day"
                }
            ],
            "ancient_mysteries": [
                {
                    "name": "Stonehenge",
                    "location": "Wiltshire",
                    "coordinates": {"lat": 51.1789, "lng": -1.8262},
                    "age": "5,000 years",
                    "experiences": [
                        {
                            "name": "Standard visit",
                            "cost": "£21.50",
                            "includes": "Audio guide, visitor centre"
                        },
                        {
                            "name": "Stone circle access",
                            "when": "Outside hours",
                            "cost": "£38.50",
                            "book": "English Heritage"
                        }
                    ],
                    "solstice": "Free access dawn",
                    "nearby": "Avebury stone circle",
                    "camping": "Stonehenge Touring Park"
                },
                {
                    "name": "Roman Baths",
                    "location": "Bath",
                    "coordinates": {"lat": 51.3811, "lng": -2.3590},
                    "features": [
                        "2,000 year old baths",
                        "Sacred spring",
                        "Roman temple",
                        "Georgian Pump Room"
                    ],
                    "audio_guide": "Excellent - Bill Bryson option",
                    "cost": "£25 adult",
                    "combine": "Bath Abbey, Royal Crescent",
                    "camping": "Bath Marina Caravan Park"
                },
                {
                    "name": "Hadrian's Wall",
                    "location": "Northern England",
                    "length": "73 miles",
                    "best_sections": [
                        "Housesteads Roman Fort",
                        "Vindolanda",
                        "Birdoswald"
                    ],
                    "walking": "Hadrian's Wall Path",
                    "museums": "Several along route",
                    "camping": "Numerous sites along wall"
                }
            ],
            "harry_potter_sites": [
                {
                    "name": "Warner Bros Studio Tour",
                    "location": "Leavesden",
                    "coordinates": {"lat": 51.6904, "lng": -0.4203},
                    "see": [
                        "Original sets",
                        "Diagon Alley",
                        "Hogwarts Express",
                        "Great Hall"
                    ],
                    "duration": "3-4 hours minimum",
                    "cost": "£53.50 adult",
                    "book": "Essential - months ahead",
                    "transport": "Shuttle from Watford Junction"
                },
                {
                    "name": "Alnwick Castle",
                    "location": "Northumberland",
                    "used_for": "Hogwarts exterior, flying lessons",
                    "other_films": "Downton Abbey",
                    "activities": [
                        "Broomstick training",
                        "Medieval events",
                        "Poison Garden"
                    ],
                    "cost": "£19.25 adult",
                    "camping": "Alnwick Rugby Club"
                },
                {
                    "name": "Platform 9¾",
                    "location": "King's Cross Station",
                    "features": [
                        "Photo opportunity",
                        "Harry Potter shop",
                        "Free to visit"
                    ],
                    "tip": "Queue can be long",
                    "best_time": "Early morning"
                }
            ],
            "unique_experiences": [
                {
                    "name": "London Eye",
                    "coordinates": {"lat": 51.5033, "lng": -0.1196},
                    "height": "135m",
                    "duration": "30 minutes",
                    "capacity": "25 per capsule",
                    "tickets": {
                        "standard": "£32",
                        "fast_track": "£42",
                        "combo_deals": "With other attractions"
                    },
                    "best_time": "Sunset",
                    "book_online": "Save 15%"
                },
                {
                    "name": "Giant's Causeway",
                    "location": "Northern Ireland",
                    "coordinates": {"lat": 55.2408, "lng": -6.5116},
                    "features": [
                        "40,000 basalt columns",
                        "UNESCO site",
                        "Visitor centre"
                    ],
                    "legend": "Built by giant Finn McCool",
                    "cost": "£13.50 adult",
                    "walk": "Free access via coastal path",
                    "camping": "Causeway Coast Caravan Park"
                },
                {
                    "name": "Eden Project",
                    "location": "Cornwall",
                    "coordinates": {"lat": 50.3619, "lng": -4.7447},
                    "biomes": [
                        "Rainforest Biome",
                        "Mediterranean Biome",
                        "Outdoor gardens"
                    ],
                    "cost": "£35 adult online",
                    "zip_wire": "Longest in England",
                    "events": "Eden Sessions concerts",
                    "camping": "YHA Eden Project"
                }
            ],
            "museums_galleries": [
                {
                    "name": "British Museum",
                    "location": "London",
                    "coordinates": {"lat": 51.5194, "lng": -0.1270},
                    "admission": "Free",
                    "highlights": [
                        "Rosetta Stone",
                        "Egyptian mummies",
                        "Elgin Marbles",
                        "Lewis Chessmen"
                    ],
                    "tours": "Free daily tours",
                    "time_needed": "3-4 hours minimum",
                    "nearby_parking": "No RV parking central London"
                },
                {
                    "name": "National Railway Museum",
                    "location": "York",
                    "admission": "Free",
                    "collection": [
                        "300+ vehicles",
                        "Royal trains",
                        "Mallard (speed record)",
                        "Japanese bullet train"
                    ],
                    "experiences": "Simulator rides",
                    "camping": "Rowntree Park Caravan Site"
                }
            ],
            "quirky_british": [
                {
                    "name": "Cheddar Gorge & Caves",
                    "location": "Somerset",
                    "features": [
                        "UK's biggest gorge",
                        "Stalactite caves",
                        "Britain's oldest skeleton",
                        "Cliff-top walk"
                    ],
                    "cost": "£24.95 adult",
                    "extra": "Cheese making demos",
                    "camping": "Multiple sites in Cheddar"
                },
                {
                    "name": "Blackpool Illuminations",
                    "when": "September-January",
                    "length": "6 miles of lights",
                    "features": [
                        "Light displays",
                        "Blackpool Tower",
                        "Pleasure Beach"
                    ],
                    "free": "Drive through lights",
                    "tradition": "Since 1879"
                },
                {
                    "name": "Portmeirion Village",
                    "location": "Wales",
                    "coordinates": {"lat": 52.9136, "lng": -4.0983},
                    "style": "Italian village in Wales",
                    "famous_for": "The Prisoner TV series",
                    "cost": "£15 adult",
                    "stay": "Hotel or self-catering",
                    "nearby_camping": "Tyddyn Llwyn"
                }
            ]
        }
    }
]

async def load_attractions_data():
    """Load comprehensive attractions data to trip_templates"""
    
    # Get Supabase credentials
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    
    supabase: Client = create_client(url, key)
    
    print("🎡 Loading Tourist Attractions & POI Data")
    print("=" * 60)
    print(f"📊 Preparing to load {len(ATTRACTIONS_DATA)} attraction guides")
    print()
    
    success_count = 0
    error_count = 0
    
    # Load each template
    for i, template in enumerate(ATTRACTIONS_DATA, 1):
        try:
            # Add metadata
            template['usage_count'] = 0
            template['created_at'] = datetime.now().isoformat()
            
            # Insert to database
            result = supabase.table('trip_templates').insert(template).execute()
            
            if result.data:
                print(f"✅ [{i}/{len(ATTRACTIONS_DATA)}] {template['name']}")
                success_count += 1
            else:
                print(f"❌ [{i}/{len(ATTRACTIONS_DATA)}] Failed: {template['name']}")
                error_count += 1
                
        except Exception as e:
            print(f"❌ [{i}/{len(ATTRACTIONS_DATA)}] Error: {template['name']} - {str(e)[:50]}...")
            error_count += 1
    
    print("\n" + "=" * 60)
    print(f"🎉 Attractions Data Loading Complete!")
    print(f"✅ Successfully loaded: {success_count} templates")
    if error_count > 0:
        print(f"❌ Failed: {error_count} templates")
    
    print("\n🎡 Added comprehensive attractions data including:")
    print("   • World-famous landmarks and monuments")
    print("   • Theme parks and entertainment")
    print("   • Museums and cultural sites")
    print("   • Natural wonders and phenomena")
    print("   • Movie locations and TV sites")
    print("   • Quirky and unusual attractions")
    print("   • Adventure activities and experiences")
    print("   • Historical sites and ancient mysteries")
    
    return success_count > 0

if __name__ == "__main__":
    asyncio.run(load_attractions_data())