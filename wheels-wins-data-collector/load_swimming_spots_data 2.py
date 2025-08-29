#!/usr/bin/env python3
"""
Load comprehensive swimming spots and waterfalls data to trip_templates
This includes beaches, rivers, lakes, hot springs, and waterfalls
"""

import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime
import json

load_dotenv()

# Comprehensive swimming spots data for all countries
SWIMMING_SPOTS_DATA = [
    # === AUSTRALIA SWIMMING SPOTS ===
    {
        "name": "Australian Natural Swimming Holes Collection",
        "description": "Crystal clear rock pools, tropical waterfalls, and pristine beaches across Australia",
        "category": "swimming_waterfalls",
        "is_public": True,
        "tags": ["swimming", "waterfalls", "australia", "natural_pools", "beaches", "rock_pools"],
        "template_data": {
            "type": "swimming_collection",
            "country": "Australia",
            "spots": [
                # Queensland
                {
                    "name": "Josephine Falls",
                    "state": "Queensland",
                    "coordinates": {"lat": -17.4308, "lng": 145.8647},
                    "type": "waterfall_pool",
                    "features": ["Natural rock slide", "Crystal clear water", "Rainforest setting"],
                    "access": "Easy 600m walk",
                    "best_time": "Year round",
                    "safety": "Flash floods possible in wet season",
                    "facilities": ["Toilets", "Picnic area", "Parking"],
                    "camping_nearby": "Babinda Boulders campground"
                },
                {
                    "name": "Millaa Millaa Falls",
                    "state": "Queensland",
                    "coordinates": {"lat": -17.4933, "lng": 145.6125},
                    "type": "waterfall_pool",
                    "features": ["18m waterfall", "Deep swimming hole", "Behind waterfall walk"],
                    "water_temp": "Cold year round",
                    "facilities": ["Parking", "Viewing platform"],
                    "part_of": "Waterfall Circuit"
                },
                {
                    "name": "Mossman Gorge",
                    "state": "Queensland",
                    "coordinates": {"lat": -16.4717, "lng": 145.3417},
                    "type": "river_swimming",
                    "features": ["Boulder pools", "Clear mountain water", "Rainforest"],
                    "cultural": "Kuku Yalanji country",
                    "access": "Shuttle bus from visitor centre",
                    "facilities": ["Visitor centre", "Cafe", "Cultural tours"]
                },
                {
                    "name": "Lake McKenzie",
                    "state": "Queensland",
                    "location": "Fraser Island",
                    "coordinates": {"lat": -25.4472, "lng": 153.0556},
                    "type": "perched_lake",
                    "features": ["Pure white sand", "Crystal clear freshwater", "No boat access"],
                    "access": "4WD only",
                    "camping": "Central Station nearby"
                },
                {
                    "name": "Champagne Pools",
                    "state": "Queensland",
                    "location": "Fraser Island",
                    "coordinates": {"lat": -25.2736, "lng": 153.3567},
                    "type": "ocean_rock_pool",
                    "features": ["Natural spa pools", "Wave action creates bubbles", "Safe ocean swimming"],
                    "best_time": "Low tide",
                    "access": "Beach driving required"
                },
                # New South Wales
                {
                    "name": "Figure Eight Pools",
                    "state": "New South Wales",
                    "coordinates": {"lat": -34.1878, "lng": 151.0428},
                    "type": "rock_pools",
                    "features": ["Unique figure-8 shaped pools", "Instagram famous"],
                    "access": "1hr hike from Burning Palms Beach",
                    "danger": "Only safe at low tide with calm seas",
                    "best_time": "Check tide charts essential"
                },
                {
                    "name": "Jenolan Caves Blue Lake",
                    "state": "New South Wales",
                    "coordinates": {"lat": -33.8192, "lng": 150.0228},
                    "type": "lake",
                    "features": ["Brilliant blue color", "Surrounded by caves", "Historic area"],
                    "water_temp": "Cold - 10°C year round",
                    "facilities": ["Accommodation", "Cafe", "Cave tours"],
                    "no_camping": "Day visits only"
                },
                {
                    "name": "Wattamolla Beach",
                    "state": "New South Wales",
                    "location": "Royal National Park",
                    "coordinates": {"lat": -34.1367, "lng": 151.1156},
                    "type": "lagoon_beach",
                    "features": ["Lagoon swimming", "Beach", "Cliff jumping", "Waterfall"],
                    "facilities": ["Toilets", "Picnic area", "BBQs"],
                    "access": "Sealed road, parking fee"
                },
                # Victoria
                {
                    "name": "MacKenzie Falls Pool",
                    "state": "Victoria",
                    "location": "Grampians",
                    "coordinates": {"lat": -37.2211, "lng": 142.4158},
                    "type": "waterfall_pool",
                    "features": ["Spectacular waterfall", "Deep pool", "Rainbow mists"],
                    "access": "Steep walk down",
                    "swimming": "Cold but refreshing",
                    "camping": "Nearby campgrounds"
                },
                {
                    "name": "Turpins Falls",
                    "state": "Victoria",
                    "coordinates": {"lat": -37.4833, "lng": 144.0500},
                    "type": "waterfall_pool",
                    "features": ["5m waterfall", "Deep swimming hole", "Cliff jumping"],
                    "access": "Private property - entry fee",
                    "facilities": ["Camping available", "BBQ areas"],
                    "popular": "Very busy on hot days"
                },
                # Northern Territory
                {
                    "name": "Gunlom Falls",
                    "state": "Northern Territory",
                    "location": "Kakadu",
                    "coordinates": {"lat": -13.4333, "lng": 132.4167},
                    "type": "plunge_pool",
                    "features": ["Infinity pool views", "Natural spa at top", "Waterfall pool below"],
                    "access": "Steep climb to top pools",
                    "camping": "Beautiful campground at base",
                    "crocodile_safe": "Yes - monitored"
                },
                {
                    "name": "Bitter Springs",
                    "state": "Northern Territory",
                    "location": "Mataranka",
                    "coordinates": {"lat": -14.9208, "lng": 133.0625},
                    "type": "thermal_spring",
                    "features": ["34°C water", "Crystal clear", "Palm forest"],
                    "access": "Easy boardwalk",
                    "facilities": ["Change rooms", "Picnic area"],
                    "camping": "Nearby caravan park"
                },
                {
                    "name": "Edith Falls",
                    "state": "Northern Territory",
                    "coordinates": {"lat": -14.1833, "lng": 132.1833},
                    "type": "tiered_pools",
                    "features": ["Multiple pools", "Different levels", "Pandanus beach"],
                    "swimming": "Upper pools best",
                    "camping": "Excellent campground",
                    "facilities": ["Kiosk", "Toilets", "Showers"]
                },
                # Tasmania
                {
                    "name": "Wineglass Bay",
                    "state": "Tasmania",
                    "coordinates": {"lat": -42.1481, "lng": 148.3008},
                    "type": "beach",
                    "features": ["Perfect crescent beach", "White sand", "Turquoise water"],
                    "access": "45min walk from lookout",
                    "water_temp": "Cold even in summer",
                    "camping": "Freycinet National Park"
                },
                {
                    "name": "Bay of Fires",
                    "state": "Tasmania",
                    "coordinates": {"lat": -41.0167, "lng": 148.2667},
                    "type": "beaches",
                    "features": ["Orange lichen rocks", "White sand", "Clear water"],
                    "swimming": "Multiple beaches",
                    "camping": "Free camping areas",
                    "best_spots": ["Swimcart Beach", "Cosy Corner"]
                },
                # Western Australia
                {
                    "name": "Karijini Spa Pool",
                    "state": "Western Australia",
                    "coordinates": {"lat": -22.4792, "lng": 118.2675},
                    "type": "gorge_pool",
                    "features": ["Natural spa pool", "Smooth rocks", "Narrow gorge"],
                    "access": "Challenging - rock hopping required",
                    "best_time": "April to September",
                    "camping": "Karijini Eco Retreat"
                },
                {
                    "name": "Turquoise Bay",
                    "state": "Western Australia",
                    "location": "Ningaloo",
                    "coordinates": {"lat": -22.0981, "lng": 113.9019},
                    "type": "beach_snorkel",
                    "features": ["Drift snorkeling", "Coral from beach", "Turquoise water"],
                    "facilities": ["Toilets", "Shade shelters"],
                    "camping": "Nearby bush camps"
                },
                {
                    "name": "Greens Pool",
                    "state": "Western Australia",
                    "location": "Denmark",
                    "coordinates": {"lat": -35.0550, "lng": 117.2317},
                    "type": "ocean_pool",
                    "features": ["Granite rocks protect from waves", "Crystal clear", "White sand"],
                    "family_friendly": True,
                    "nearby": "Elephant Rocks"
                }
            ],
            "safety_tips": [
                "Always check for crocodile warnings in Northern Australia",
                "Flash floods can occur at waterfalls",
                "Check tide times for ocean pools",
                "Never dive into unknown water",
                "Respect sacred Indigenous sites"
            ],
            "what_to_bring": [
                "Water shoes for rocky areas",
                "Snorkel gear for clear spots",
                "Dry bag for belongings",
                "Sun protection",
                "First aid kit"
            ]
        }
    },
    
    # === NEW ZEALAND SWIMMING SPOTS ===
    {
        "name": "New Zealand Hot Springs & Swimming Holes",
        "description": "Geothermal hot pools, glacial lakes, and hidden waterfalls across both islands",
        "category": "swimming_waterfalls",
        "is_public": True,
        "tags": ["swimming", "hot_springs", "new_zealand", "waterfalls", "lakes", "natural_pools"],
        "template_data": {
            "type": "swimming_collection",
            "country": "New Zealand",
            "spots": [
                # North Island
                {
                    "name": "Hot Water Beach",
                    "island": "North Island",
                    "region": "Coromandel",
                    "coordinates": {"lat": -36.8842, "lng": 175.8739},
                    "type": "hot_spring_beach",
                    "features": ["Dig your own hot pool", "Natural hot water", "Ocean beach"],
                    "best_time": "2 hours either side of low tide",
                    "equipment": "Spade rental available",
                    "camping": "Hot Water Beach TOP 10",
                    "book_ahead": "Essential in summer"
                },
                {
                    "name": "Kerosene Creek",
                    "island": "North Island",
                    "region": "Rotorua",
                    "coordinates": {"lat": -38.3583, "lng": 176.2167},
                    "type": "hot_stream",
                    "features": ["Natural hot stream", "Waterfall", "Bush setting"],
                    "temperature": "35-40°C",
                    "access": "Short walk from carpark",
                    "facilities": "Basic - no toilets",
                    "free": True
                },
                {
                    "name": "Blue Springs",
                    "island": "North Island",
                    "region": "Putaruru",
                    "coordinates": {"lat": -37.9333, "lng": 175.8167},
                    "type": "spring",
                    "features": ["Crystal clear water", "Constant 11°C", "70% of NZ bottled water"],
                    "activities": ["Walking track", "Swimming", "Picnicking"],
                    "access": "Te Waihou Walkway",
                    "no_dogs": True
                },
                {
                    "name": "Orakei Korako Cave & Pool",
                    "island": "North Island",
                    "coordinates": {"lat": -38.4667, "lng": 176.1333},
                    "type": "thermal_pool",
                    "features": ["Hidden hot pool in cave", "Jade colored water", "Geothermal area"],
                    "access": "Boat across lake then walk",
                    "entry_fee": "$39 adult",
                    "unique": "One of two such caves worldwide"
                },
                {
                    "name": "Tarawera Falls",
                    "island": "North Island",
                    "coordinates": {"lat": -38.2833, "lng": 176.5167},
                    "type": "waterfall_swim",
                    "features": ["65m waterfall", "Swimming hole", "Bush walk"],
                    "access": "45min walk",
                    "water": "Cold but swimmable in summer",
                    "permits": "Required - check DOC"
                },
                # South Island
                {
                    "name": "Hanmer Springs",
                    "island": "South Island",
                    "coordinates": {"lat": -42.5228, "lng": 172.8306},
                    "type": "thermal_complex",
                    "features": ["Natural thermal pools", "Various temperatures", "Alpine setting"],
                    "facilities": ["Changing rooms", "Cafe", "Spa treatments"],
                    "camping": "Multiple holiday parks nearby",
                    "year_round": True
                },
                {
                    "name": "Welcome Flat Hot Pools",
                    "island": "South Island",
                    "location": "Fox Glacier",
                    "coordinates": {"lat": -43.4167, "lng": 170.1833},
                    "type": "backcountry_hot_springs",
                    "features": ["Remote hot pools", "Mountain views", "Natural setting"],
                    "access": "6-7 hour hike each way",
                    "accommodation": "DOC hut available",
                    "booking": "Hut must be booked"
                },
                {
                    "name": "Pelorus Bridge",
                    "island": "South Island",
                    "region": "Marlborough",
                    "coordinates": {"lat": -41.2989, "lng": 173.5744},
                    "type": "river_swimming",
                    "features": ["Crystal clear river", "Swimming holes", "Swing bridge"],
                    "famous_for": "Hobbit barrel scene filming",
                    "camping": "DOC campground on site",
                    "facilities": ["Toilets", "Picnic areas"]
                },
                {
                    "name": "Blue Pools",
                    "island": "South Island",
                    "location": "Mount Aspiring NP",
                    "coordinates": {"lat": -44.1500, "lng": 169.2667},
                    "type": "glacial_pools",
                    "features": ["Vibrant blue water", "Crystal clear", "Swing bridge"],
                    "water_temp": "Extremely cold - glacial fed",
                    "access": "30min return walk",
                    "best_time": "Summer for brave swimmers"
                },
                {
                    "name": "Lake Tekapo",
                    "island": "South Island",
                    "coordinates": {"lat": -43.8833, "lng": 170.5167},
                    "type": "glacial_lake",
                    "features": ["Turquoise water", "Mountain backdrop", "Lupins in summer"],
                    "activities": ["Swimming", "Hot pools nearby", "Stargazing"],
                    "water": "Cold but stunning",
                    "camping": "Lake Tekapo Motels & Holiday Park"
                },
                {
                    "name": "Abel Tasman Beaches",
                    "island": "South Island",
                    "coordinates": {"lat": -40.9333, "lng": 173.0167},
                    "type": "beaches",
                    "features": ["Golden sand", "Clear water", "Sheltered bays"],
                    "best_beaches": ["Anchorage", "Bark Bay", "Totaranui"],
                    "access": "Walk, kayak, or water taxi",
                    "camping": "Book DOC sites in advance"
                }
            ],
            "hot_spring_etiquette": [
                "Shower before entering if facilities available",
                "No soap or shampoo in natural pools",
                "Keep noise down",
                "Pack out all rubbish",
                "Respect other users"
            ],
            "safety": [
                "Amoebic meningitis risk in some hot pools",
                "Don't put head under in thermal water",
                "Glacial water can cause rapid hypothermia",
                "Check water flow before swimming",
                "Some pools have hot spots - test carefully"
            ]
        }
    },
    
    # === CANADA SWIMMING SPOTS ===
    {
        "name": "Canadian Lakes, Hot Springs & Swimming Holes",
        "description": "From Pacific hot springs to Prairie lakes and Atlantic ocean pools",
        "category": "swimming_waterfalls",
        "is_public": True,
        "tags": ["swimming", "hot_springs", "canada", "lakes", "waterfalls", "natural_pools"],
        "template_data": {
            "type": "swimming_collection",
            "country": "Canada",
            "spots": [
                # British Columbia
                {
                    "name": "Radium Hot Springs",
                    "province": "British Columbia",
                    "coordinates": {"lat": 50.6214, "lng": -116.0628},
                    "type": "hot_springs",
                    "features": ["Odourless mineral water", "39°C pool", "Mountain views"],
                    "facilities": ["Change rooms", "Lockers", "Cafe"],
                    "open": "Year round",
                    "camping": "Redstreak Campground nearby"
                },
                {
                    "name": "Liard River Hot Springs",
                    "province": "British Columbia",
                    "coordinates": {"lat": 59.4261, "lng": -126.1004},
                    "type": "natural_hot_springs",
                    "features": ["Alaska Highway stop", "Boardwalk through swamp", "42°C water"],
                    "wildlife": "Moose and bears common",
                    "camping": "Provincial park campground",
                    "unique": "Tropical plants grow here"
                },
                {
                    "name": "Joffre Lakes",
                    "province": "British Columbia",
                    "coordinates": {"lat": 50.3667, "lng": -122.5000},
                    "type": "glacial_lakes",
                    "features": ["Three turquoise lakes", "Glacier views", "Instagram famous"],
                    "hiking": ["Lower: 5min", "Middle: 1.5hr", "Upper: 2.5hr"],
                    "swimming": "Extremely cold but possible",
                    "busy": "Arrive before 7am in summer"
                },
                {
                    "name": "Cultus Lake",
                    "province": "British Columbia",
                    "coordinates": {"lat": 49.0528, "lng": -121.9939},
                    "type": "lake",
                    "features": ["Warm water", "Sandy beaches", "Water sports"],
                    "facilities": ["Water park", "Marina", "Restaurants"],
                    "camping": "Multiple campgrounds",
                    "family_friendly": True
                },
                # Alberta
                {
                    "name": "Banff Upper Hot Springs",
                    "province": "Alberta",
                    "coordinates": {"lat": 51.1525, "lng": -115.5611},
                    "type": "hot_springs",
                    "features": ["Mountain views", "Historic bathhouse", "38-40°C"],
                    "elevation": "1585m",
                    "facilities": ["Rentals available", "Lockers", "Spa"],
                    "winter": "Magical with snow around"
                },
                {
                    "name": "Lake Louise",
                    "province": "Alberta",
                    "coordinates": {"lat": 51.4254, "lng": -116.1773},
                    "type": "glacial_lake",
                    "features": ["Iconic turquoise water", "Canoe rentals", "Glacier backdrop"],
                    "swimming": "Only for polar bears - 4°C",
                    "better": "Canoe or SUP instead",
                    "camping": "Lake Louise campground"
                },
                {
                    "name": "Sylvan Lake",
                    "province": "Alberta",
                    "coordinates": {"lat": 52.3106, "lng": -114.0964},
                    "type": "lake",
                    "features": ["Sandy beach", "Warm water", "Water sports"],
                    "facilities": ["Marina", "Restaurants", "Mini golf"],
                    "camping": "Provincial park",
                    "summer_spot": "Alberta's beach playground"
                },
                # Ontario
                {
                    "name": "Tobermory Grotto",
                    "province": "Ontario",
                    "coordinates": {"lat": 45.2553, "lng": -81.5239},
                    "type": "sea_cave",
                    "features": ["Caribbean blue water", "Cave swimming", "Cliff jumping"],
                    "access": "Bruce Trail - book parking",
                    "water_temp": "Cold even in summer",
                    "crowded": "Very popular - go early"
                },
                {
                    "name": "Wasaga Beach",
                    "province": "Ontario",
                    "coordinates": {"lat": 44.5167, "lng": -80.0167},
                    "type": "beach",
                    "features": ["14km sandy beach", "Warm shallow water", "World's longest freshwater beach"],
                    "facilities": ["Beach bars", "Volleyball", "Events"],
                    "camping": "Provincial park",
                    "party_spot": "Beach 1 is main area"
                },
                {
                    "name": "Elora Quarry",
                    "province": "Ontario",
                    "coordinates": {"lat": 43.6792, "lng": -80.4325},
                    "type": "quarry_lake",
                    "features": ["Former limestone quarry", "Deep blue water", "Cliff jumping"],
                    "facilities": ["Beach", "Picnic areas", "Trails"],
                    "admission": "Conservation area fees",
                    "nearby": "Elora Gorge tubing"
                },
                # Quebec
                {
                    "name": "Parc de la Chute-Montmorency",
                    "province": "Quebec",
                    "coordinates": {"lat": 46.8897, "lng": -71.1469},
                    "type": "waterfall",
                    "features": ["83m waterfall", "Higher than Niagara", "Suspension bridge"],
                    "swimming": "Pool at base in summer",
                    "winter": "Ice climbing",
                    "access": "Cable car or stairs"
                },
                # Atlantic Canada
                {
                    "name": "Peggy's Cove",
                    "province": "Nova Scotia",
                    "coordinates": {"lat": 44.4919, "lng": -63.9178},
                    "type": "ocean_rocks",
                    "features": ["Iconic lighthouse", "Granite rocks", "Ocean views"],
                    "swimming": "Dangerous - viewing only",
                    "safety": "Stay off black rocks",
                    "nearby": "Polly's Cove for safer exploration"
                },
                {
                    "name": "Singing Sands Beach",
                    "province": "Prince Edward Island",
                    "coordinates": {"lat": 46.4167, "lng": -63.0167},
                    "type": "beach",
                    "features": ["Sand 'sings' when walked on", "Warm water", "Red cliffs"],
                    "facilities": ["Supervised swimming", "Picnic area"],
                    "camping": "National park campground",
                    "unique": "High silica content sand"
                }
            ],
            "cold_water_tips": [
                "Acclimatize gradually",
                "Never swim alone",
                "Know signs of hypothermia",
                "Wetsuit for longer swims",
                "Warm up immediately after"
            ],
            "hot_springs_tips": [
                "Stay hydrated",
                "Limit time in hot water",
                "Cool down between soaks",
                "Remove jewelry (can tarnish)",
                "Shower after (mineral content)"
            ]
        }
    },
    
    # === USA SWIMMING SPOTS ===
    {
        "name": "USA Natural Swimming Paradise",
        "description": "From desert oases to mountain lakes and ocean tide pools across America",
        "category": "swimming_waterfalls",
        "is_public": True,
        "tags": ["swimming", "hot_springs", "usa", "waterfalls", "beaches", "natural_pools"],
        "template_data": {
            "type": "swimming_collection",
            "country": "USA",
            "spots": [
                # West Coast
                {
                    "name": "McWay Falls",
                    "state": "California",
                    "location": "Big Sur",
                    "coordinates": {"lat": 36.1581, "lng": -121.6719},
                    "type": "beach_waterfall",
                    "features": ["80ft waterfall onto beach", "Turquoise cove", "No beach access"],
                    "viewing": "Julia Pfeiffer Burns State Park",
                    "photography": "Iconic Big Sur shot",
                    "no_swimming": "Viewing only"
                },
                {
                    "name": "Havasu Falls",
                    "state": "Arizona",
                    "coordinates": {"lat": 36.2552, "lng": -112.6979},
                    "type": "desert_oasis",
                    "features": ["Blue-green water", "Red rocks", "100ft waterfall"],
                    "access": "10-mile hike or helicopter",
                    "permits": "Required - book months ahead",
                    "camping": "Mandatory 2-night minimum",
                    "tribe": "Havasupai Reservation"
                },
                {
                    "name": "Crater Lake",
                    "state": "Oregon",
                    "coordinates": {"lat": 42.9446, "lng": -122.1090},
                    "type": "volcanic_lake",
                    "features": ["Deepest US lake", "Brilliant blue", "Crystal clear"],
                    "swimming": "Allowed but cold (16°C max)",
                    "access": "Cleetwood Cove Trail only",
                    "season": "July to September"
                },
                {
                    "name": "Deep Creek Hot Springs",
                    "state": "California",
                    "coordinates": {"lat": 34.2833, "lng": -117.2500},
                    "type": "hot_springs",
                    "features": ["Natural pools", "Creek swimming", "Clothing optional"],
                    "hike": "2.5 miles steep trail",
                    "crowded": "Weekends very busy",
                    "parking": "Adventure Pass required"
                },
                # Southwest
                {
                    "name": "Slide Rock State Park",
                    "state": "Arizona",
                    "location": "Sedona",
                    "coordinates": {"lat": 34.9439, "lng": -111.7528},
                    "type": "natural_waterslide",
                    "features": ["80ft natural slide", "Red rock canyon", "Swimming holes"],
                    "busy": "Extremely crowded in summer",
                    "facilities": ["Parking", "Restrooms", "Picnic areas"],
                    "water": "Cold year-round"
                },
                {
                    "name": "Hamilton Pool",
                    "state": "Texas",
                    "coordinates": {"lat": 30.3422, "lng": -98.1267},
                    "type": "grotto_pool",
                    "features": ["Collapsed grotto", "50ft waterfall", "Jade pool"],
                    "reservations": "Required May-September",
                    "access": "0.25 mile steep trail",
                    "swimming": "When bacteria levels safe"
                },
                {
                    "name": "The Narrows",
                    "state": "Utah",
                    "location": "Zion NP",
                    "coordinates": {"lat": 37.2850, "lng": -112.9478},
                    "type": "slot_canyon_river",
                    "features": ["Wade through Virgin River", "2000ft walls", "Narrow canyon"],
                    "equipment": "Water shoes, walking stick",
                    "danger": "Flash floods - check forecast",
                    "permit": "Needed for full route"
                },
                # Southeast
                {
                    "name": "Blue Spring State Park",
                    "state": "Florida",
                    "coordinates": {"lat": 28.9472, "lng": -81.3403},
                    "type": "spring",
                    "features": ["72°F year-round", "Crystal clear", "Manatees in winter"],
                    "activities": ["Swimming", "Snorkeling", "Paddling"],
                    "manatee_season": "November to March",
                    "facilities": ["Camping", "Cabins", "Concessions"]
                },
                {
                    "name": "Devil's Den",
                    "state": "Florida",
                    "coordinates": {"lat": 29.3656, "lng": -82.4733},
                    "type": "underground_spring",
                    "features": ["Prehistoric spring", "Snorkeling", "Scuba diving"],
                    "water_temp": "72°F constant",
                    "unique": "Swim in underground cave",
                    "equipment": "Rental available"
                },
                {
                    "name": "Sliding Rock",
                    "state": "North Carolina",
                    "coordinates": {"lat": 35.2953, "lng": -82.7736},
                    "type": "natural_waterslide",
                    "features": ["60ft natural slide", "Deep pool", "Mountain setting"],
                    "water": "Cold - 50-60°F",
                    "facilities": ["Parking", "Viewing area", "Lifeguards in summer"],
                    "nearby": "Looking Glass Falls"
                },
                # Northeast
                {
                    "name": "Robert H. Treman State Park",
                    "state": "New York",
                    "coordinates": {"lat": 42.4033, "lng": -76.5672},
                    "type": "gorge_swimming",
                    "features": ["115ft Lucifer Falls", "Swimming hole", "Stone diving board"],
                    "trails": ["Gorge Trail", "Rim Trail"],
                    "facilities": ["Camping", "Pavilions", "Playground"],
                    "season": "Swimming June-September"
                },
                {
                    "name": "Warren Falls",
                    "state": "Vermont",
                    "coordinates": {"lat": 44.1147, "lng": -72.8989},
                    "type": "river_pools",
                    "features": ["Series of pools", "Natural slides", "Cliff jumping"],
                    "access": "Short trail from road",
                    "popular": "Local favorite",
                    "parking": "Limited roadside"
                },
                # Hawaii
                {
                    "name": "Queen's Bath",
                    "state": "Hawaii",
                    "island": "Kauai",
                    "coordinates": {"lat": 22.2139, "lng": -159.4958},
                    "type": "tide_pool",
                    "features": ["Natural lava pool", "Ocean filled", "Sea turtles"],
                    "danger": "Deadly in high surf",
                    "safe_months": "Summer only",
                    "access": "Slippery trail"
                },
                {
                    "name": "Seven Sacred Pools",
                    "state": "Hawaii",
                    "island": "Maui",
                    "coordinates": {"lat": 20.6667, "lng": -156.0433},
                    "type": "waterfall_pools",
                    "proper_name": "'Ohe'o Gulch",
                    "features": ["Multiple pools", "Ocean views", "Bamboo forest"],
                    "cultural": "Respect sacred site",
                    "road": "Past Hana"
                }
            ],
            "swimming_hole_safety": [
                "Never dive headfirst",
                "Check depth and obstacles",
                "Watch for flash flood risk",
                "Respect private property",
                "Leave no trace"
            ],
            "gear_recommendations": [
                "Water shoes for rocky areas",
                "Dry bag for valuables",
                "Underwater camera",
                "Reef-safe sunscreen",
                "First aid kit"
            ]
        }
    },
    
    # === GREAT BRITAIN SWIMMING SPOTS ===
    {
        "name": "Wild Swimming Britain: Lochs, Tarns & Tidal Pools",
        "description": "From Scottish lochs to Cornish coves, Britain's best wild swimming spots",
        "category": "swimming_waterfalls",
        "is_public": True,
        "tags": ["swimming", "wild_swimming", "uk", "lochs", "lakes", "beaches", "waterfalls"],
        "template_data": {
            "type": "swimming_collection",
            "country": "Great Britain",
            "spots": [
                # Scotland
                {
                    "name": "Fairy Pools",
                    "country": "Scotland",
                    "location": "Isle of Skye",
                    "coordinates": {"lat": 57.2500, "lng": -6.2500},
                    "type": "mountain_pools",
                    "features": ["Crystal clear pools", "Cuillin backdrop", "Waterfalls"],
                    "water_temp": "Cold year-round",
                    "access": "2.4km walk from car park",
                    "busy": "Very popular - go early",
                    "parking": "£5 fee"
                },
                {
                    "name": "Loch Lomond",
                    "country": "Scotland",
                    "coordinates": {"lat": 56.0833, "lng": -4.6333},
                    "type": "loch",
                    "features": ["Largest UK lake", "Multiple beaches", "Islands"],
                    "best_spots": ["Milarrochy Bay", "Luss Beach", "Firkin Point"],
                    "camping": "Many sites around loch",
                    "activities": ["Swimming", "Kayaking", "SUP"]
                },
                {
                    "name": "Falls of Falloch",
                    "country": "Scotland",
                    "coordinates": {"lat": 56.3483, "lng": -4.6856},
                    "type": "waterfall_pool",
                    "features": ["30ft falls", "Deep pools", "Rob Roy Way"],
                    "access": "Short walk from A82",
                    "swimming": "Plunge pools below falls",
                    "scenic": "Very photogenic"
                },
                {
                    "name": "Linn of Dee",
                    "country": "Scotland",
                    "location": "Cairngorms",
                    "coordinates": {"lat": 56.9667, "lng": -3.5833},
                    "type": "river_gorge",
                    "features": ["Narrow gorge", "Clear pools", "Ancient Caledonian pine"],
                    "danger": "Strong currents in gorge",
                    "safer_spots": "Pools upstream/downstream",
                    "midges": "Bad in summer"
                },
                # England
                {
                    "name": "Hampstead Heath Ponds",
                    "country": "England",
                    "location": "London",
                    "coordinates": {"lat": 51.5608, "lng": -0.1631},
                    "type": "swimming_ponds",
                    "features": ["Men's, Women's, Mixed ponds", "Lifeguarded", "Year-round swimming"],
                    "unique": "Wild swimming in London",
                    "facilities": ["Changing rooms", "Sunbathing areas"],
                    "fee": "Small charge"
                },
                {
                    "name": "River Waveney",
                    "country": "England",
                    "location": "Suffolk/Norfolk border",
                    "coordinates": {"lat": 52.4667, "lng": 1.4500},
                    "type": "river_swimming",
                    "features": ["Meandering river", "Water meadows", "Wildlife"],
                    "best_spot": "Outney Common",
                    "facilities": ["Pub nearby", "Picnic areas"],
                    "otter_country": "Possible sightings"
                },
                {
                    "name": "Durdle Door",
                    "country": "England",
                    "location": "Dorset",
                    "coordinates": {"lat": 50.6214, "lng": -2.2772},
                    "type": "beach_arch",
                    "features": ["Limestone arch", "Sheltered bay", "Clear water"],
                    "access": "Steep path from car park",
                    "nearby": "Man O' War Beach",
                    "jurassic_coast": "World Heritage Site"
                },
                {
                    "name": "Stainforth Force",
                    "country": "England",
                    "location": "Yorkshire Dales",
                    "coordinates": {"lat": 54.1039, "lng": -2.2836},
                    "type": "waterfall_pool",
                    "features": ["Wide waterfall", "Deep pools", "Packhorse bridge"],
                    "jumping": "Popular but check depth",
                    "busy": "Summer weekends packed",
                    "parking": "National Trust car park"
                },
                {
                    "name": "Gaddings Dam",
                    "country": "England",
                    "location": "Yorkshire",
                    "coordinates": {"lat": 53.7333, "lng": -2.0167},
                    "type": "reservoir",
                    "claim": "England's highest beach (1300ft)",
                    "features": ["Sand beach", "Pennine views", "Wild location"],
                    "access": "20min walk from road",
                    "weather": "Can be bleak"
                },
                # Wales
                {
                    "name": "Blue Lagoon",
                    "country": "Wales",
                    "location": "Pembrokeshire",
                    "coordinates": {"lat": 51.7344, "lng": -5.1617},
                    "type": "flooded_quarry",
                    "features": ["Bright blue water", "Deep quarry", "Cliff jumping"],
                    "water_color": "Due to minerals",
                    "depth": "25m deep",
                    "caution": "No safety equipment"
                },
                {
                    "name": "Sgwd yr Eira",
                    "country": "Wales",
                    "location": "Brecon Beacons",
                    "coordinates": {"lat": 51.7833, "lng": -3.5667},
                    "type": "waterfall",
                    "features": ["Walk behind waterfall", "Swimming pools", "Four falls trail"],
                    "translation": "Fall of Snow",
                    "trail": "Waterfall Country walk",
                    "slippery": "Take care on paths"
                },
                {
                    "name": "Llyn Padarn",
                    "country": "Wales",
                    "location": "Snowdonia",
                    "coordinates": {"lat": 53.1292, "lng": -4.1261},
                    "type": "lake",
                    "features": ["2-mile long lake", "Mountain views", "Clear water"],
                    "activities": ["Swimming", "Paddleboarding", "Diving"],
                    "facilities": ["Beach areas", "Parking", "Cafes"],
                    "nearby": "Llanberis"
                },
                # Northern Ireland bonus
                {
                    "name": "Marble Arch Caves",
                    "country": "Northern Ireland",
                    "coordinates": {"lat": 54.2667, "lng": -7.8167},
                    "type": "cave_pools",
                    "features": ["Underground river", "Boat tour", "Stalactites"],
                    "swimming": "Not permitted in caves",
                    "nearby": "Cladagh River swimming",
                    "geopark": "UNESCO site"
                }
            ],
            "wild_swimming_code": [
                "Check water quality",
                "Respect private property",
                "Know your limits",
                "Never swim alone",
                "Acclimatize gradually",
                "Leave no trace"
            ],
            "cold_water_swimming": [
                "Wetsuit recommended",
                "Neoprene gloves/socks help",
                "Warm clothes for after",
                "Hot drink in flask",
                "Build up tolerance slowly"
            ],
            "resources": [
                "Wild Swimming app",
                "Outdoor Swimming Society",
                "Local wild swimming groups"
            ]
        }
    }
]

async def load_swimming_spots_data():
    """Load comprehensive swimming spots data to trip_templates"""
    
    # Get Supabase credentials
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    
    supabase: Client = create_client(url, key)
    
    print("🌊 Loading Swimming Spots & Waterfalls Data")
    print("=" * 60)
    print(f"📊 Preparing to load {len(SWIMMING_SPOTS_DATA)} swimming collections")
    print()
    
    success_count = 0
    error_count = 0
    
    # Load each template
    for i, template in enumerate(SWIMMING_SPOTS_DATA, 1):
        try:
            # Add metadata
            template['usage_count'] = 0
            template['created_at'] = datetime.now().isoformat()
            
            # Insert to database
            result = supabase.table('trip_templates').insert(template).execute()
            
            if result.data:
                print(f"✅ [{i}/{len(SWIMMING_SPOTS_DATA)}] {template['name']}")
                success_count += 1
            else:
                print(f"❌ [{i}/{len(SWIMMING_SPOTS_DATA)}] Failed: {template['name']}")
                error_count += 1
                
        except Exception as e:
            print(f"❌ [{i}/{len(SWIMMING_SPOTS_DATA)}] Error: {template['name']} - {str(e)[:50]}...")
            error_count += 1
    
    print("\n" + "=" * 60)
    print(f"🎉 Swimming Spots Data Loading Complete!")
    print(f"✅ Successfully loaded: {success_count} templates")
    if error_count > 0:
        print(f"❌ Failed: {error_count} templates")
    
    # Count total spots
    total_spots = sum(len(t['template_data']['spots']) for t in SWIMMING_SPOTS_DATA)
    print(f"\n🏊 Total swimming spots across all countries: {total_spots}")
    
    print("\n💧 Added comprehensive swimming data including:")
    print("   • Natural hot springs and thermal pools")
    print("   • Waterfalls with swimming holes")
    print("   • Ocean pools and beaches")
    print("   • Lakes and rivers")
    print("   • Quarries and hidden gems")
    print("   • Safety information and access details")
    print("   • Facilities and nearby camping")
    
    return success_count > 0

if __name__ == "__main__":
    asyncio.run(load_swimming_spots_data())