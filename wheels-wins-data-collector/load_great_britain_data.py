#!/usr/bin/env python3
"""
Load comprehensive Great Britain travel data to trip_templates
This includes real locations with accurate coordinates
"""

import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime
import json

load_dotenv()

# Comprehensive Great Britain travel data with real locations
GREAT_BRITAIN_DATA = [
    # === SCOTLAND ===
    {
        "name": "North Coast 500: Scotland's Ultimate Road Trip",
        "description": "Epic 500-mile coastal route through the Scottish Highlands",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["north_coast_500", "scotland", "highlands", "uk", "coastal", "road_trip"],
        "template_data": {
            "type": "highland_circuit",
            "distance": "830km",
            "duration": "5-7 days minimum",
            "start_end": "Inverness",
            "direction": "Traditionally clockwise",
            "key_stops": [
                {
                    "name": "Inverness",
                    "coordinates": {"lat": 57.4778, "lng": -4.2247},
                    "features": ["Castle", "Loch Ness nearby", "Supply stop"]
                },
                {
                    "name": "Applecross Pass",
                    "coordinates": {"lat": 57.4333, "lng": -5.8000},
                    "feature": "UK's steepest road - Bealach na Bà",
                    "gradient": "20% - not for large RVs",
                    "alternative": "Coastal route via Shieldaig"
                },
                {
                    "name": "Ullapool",
                    "coordinates": {"lat": 57.8953, "lng": -5.1631},
                    "features": ["Fishing village", "Ferry to Outer Hebrides", "Seafood"]
                },
                {
                    "name": "Durness",
                    "coordinates": {"lat": 58.5686, "lng": -4.7464},
                    "features": ["Smoo Cave", "Pristine beaches", "Northernmost village"]
                },
                {
                    "name": "John o' Groats",
                    "coordinates": {"lat": 58.6439, "lng": -3.0703},
                    "claim": "Mainland Britain's northeastern tip",
                    "photo_op": "Signpost"
                },
                {
                    "name": "Dunrobin Castle",
                    "coordinates": {"lat": 57.9839, "lng": -3.9489},
                    "feature": "Fairytale castle with falconry"
                }
            ],
            "camping_options": [
                {
                    "name": "Inverness Caravan Park",
                    "features": ["Full facilities", "Good base", "Bus to city"],
                    "coordinates": {"lat": 57.4564, "lng": -4.1919}
                },
                {
                    "name": "Sands Caravan & Camping",
                    "location": "Gairloch",
                    "features": ["Beach location", "Sea views", "Wildlife"],
                    "coordinates": {"lat": 57.7303, "lng": -5.6889}
                },
                {
                    "name": "Durness Caravan Park",
                    "features": ["Cliff-top location", "Basic facilities", "Stunning views"]
                }
            ],
            "highlights": [
                "Eilean Donan Castle",
                "Wester Ross beaches",
                "Flow Country (peatlands)",
                "Duncansby Stacks",
                "Black Isle"
            ],
            "driving_challenges": [
                "Single track roads with passing places",
                "Sheep on roads",
                "Limited fuel stations",
                "Weather can change rapidly"
            ],
            "best_season": "May to September",
            "avoid": "July-August midges worst",
            "tips": [
                "Book accommodation early",
                "Allow more time than GPS suggests",
                "Respect passing place etiquette",
                "Carry midge repellent"
            ]
        }
    },
    {
        "name": "Isle of Skye & Inner Hebrides",
        "description": "Mystical islands with dramatic landscapes and ancient history",
        "category": "island_adventures",
        "is_public": True,
        "tags": ["isle_of_skye", "scotland", "hebrides", "uk", "islands", "hiking"],
        "template_data": {
            "type": "island_exploration",
            "main_island": "Skye",
            "access": "Bridge from Kyle of Lochalsh",
            "key_attractions": [
                {
                    "name": "Old Man of Storr",
                    "coordinates": {"lat": 57.5072, "lng": -6.1833},
                    "type": "Rock formation",
                    "hike": "45min to viewpoint"
                },
                {
                    "name": "Quiraing",
                    "coordinates": {"lat": 57.6439, "lng": -6.2653},
                    "feature": "Otherworldly landscape",
                    "activity": "Hill walking"
                },
                {
                    "name": "Fairy Pools",
                    "coordinates": {"lat": 57.2500, "lng": -6.2500},
                    "feature": "Crystal clear pools",
                    "swimming": "Brave souls only - cold!"
                },
                {
                    "name": "Neist Point",
                    "coordinates": {"lat": 57.4233, "lng": -6.7886},
                    "feature": "Westernmost point lighthouse",
                    "wildlife": "Whales, dolphins possible"
                },
                {
                    "name": "Dunvegan Castle",
                    "coordinates": {"lat": 57.4456, "lng": -6.5847},
                    "claim": "Oldest continuously inhabited castle in Scotland",
                    "features": ["Gardens", "Boat trips", "Seal colony"]
                }
            ],
            "camping": [
                {
                    "name": "Kinloch Campsite",
                    "location": "Near Dunvegan",
                    "features": ["Loch views", "Basic facilities", "Central location"]
                },
                {
                    "name": "Glenbrittle Campsite",
                    "features": ["Beach access", "Cuillin views", "Popular with climbers"],
                    "coordinates": {"lat": 57.1972, "lng": -6.2833}
                }
            ],
            "other_islands": [
                {
                    "name": "Isle of Mull",
                    "access": "Ferry from Oban",
                    "highlights": ["Tobermory", "Eagles", "Iona day trip"]
                },
                {
                    "name": "Isle of Islay",
                    "famous_for": "Whisky distilleries",
                    "distilleries": 9
                },
                {
                    "name": "Isle of Arran",
                    "nickname": "Scotland in miniature",
                    "features": ["Mountains", "Beaches", "Castles"]
                }
            ],
            "weather": "Unpredictable - pack for all conditions",
            "best_season": "May to September",
            "booking": "Essential in summer",
            "local_products": ["Whisky", "Seafood", "Harris Tweed"]
        }
    },
    {
        "name": "Loch Ness & Great Glen Way",
        "description": "Monster hunting and canal cruising through Scotland's Great Glen",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["loch_ness", "scotland", "great_glen", "uk", "hiking", "canals"],
        "template_data": {
            "type": "loch_and_glen",
            "region": "Scottish Highlands",
            "main_feature": "Caledonian Canal & lochs",
            "loch_ness": {
                "length": "37km",
                "depth": "230m max",
                "coordinates": {"lat": 57.3229, "lng": -4.4244},
                "monster_sightings": "First recorded 565 AD",
                "key_spots": [
                    {
                        "name": "Urquhart Castle",
                        "coordinates": {"lat": 57.3240, "lng": -4.4419},
                        "features": ["Ruins", "Visitor center", "Best monster watching spot"]
                    },
                    {
                        "name": "Loch Ness Centre",
                        "location": "Drumnadrochit",
                        "feature": "Monster exhibition"
                    },
                    {
                        "name": "Fort Augustus",
                        "coordinates": {"lat": 57.1444, "lng": -4.6806},
                        "features": ["Canal locks", "Benedictine Abbey"]
                    }
                ]
            },
            "great_glen_way": {
                "distance": "127km",
                "duration": "5-6 days walking",
                "route": "Fort William to Inverness",
                "terrain": "Canal towpaths, forest tracks",
                "camping": "Wild camping allowed (follow code)"
            },
            "camping_options": [
                {
                    "name": "Loch Ness Shores",
                    "location": "Foyers",
                    "features": ["Lochside", "Pods available", "Shop"],
                    "coordinates": {"lat": 57.2506, "lng": -4.4764}
                },
                {
                    "name": "Glen Nevis Caravan Park",
                    "location": "Fort William",
                    "features": ["Ben Nevis access", "River location", "Full facilities"]
                }
            ],
            "activities": [
                "Loch cruises",
                "Monster spotting",
                "Hiking",
                "Mountain biking",
                "Whisky distillery tours"
            ],
            "nearby_attractions": [
                "Ben Nevis (UK's highest mountain)",
                "Glen Coe",
                "Cairngorms National Park"
            ],
            "best_season": "April to October",
            "midges": "Worst June to August",
            "tips": ["Book cruises ahead", "Waterproofs essential", "Try local venison"]
        }
    },
    
    # === ENGLAND ===
    {
        "name": "Lake District: Peaks and Poets",
        "description": "England's largest national park with lakes, fells, and literary history",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["lake_district", "england", "hiking", "uk", "national_park", "lakes"],
        "template_data": {
            "type": "lake_and_fell",
            "location": "Cumbria, England",
            "unesco_status": "World Heritage Site",
            "area": "2362 sq km",
            "key_areas": [
                {
                    "name": "Windermere",
                    "coordinates": {"lat": 54.3805, "lng": -2.9340},
                    "claim": "England's largest lake",
                    "activities": ["Lake cruises", "Beatrix Potter museum", "Hill Top house"]
                },
                {
                    "name": "Keswick & Derwentwater",
                    "coordinates": {"lat": 54.6013, "lng": -3.1347},
                    "features": ["Launch cruises", "Theatre by the Lake", "Castlerigg Stone Circle"]
                },
                {
                    "name": "Grasmere",
                    "coordinates": {"lat": 54.4594, "lng": -3.0244},
                    "famous_for": ["Wordsworth's home", "Gingerbread", "Central location"]
                },
                {
                    "name": "Scafell Pike",
                    "elevation": "978m",
                    "claim": "England's highest mountain",
                    "difficulty": "Challenging day hike"
                }
            ],
            "camping_recommendations": [
                {
                    "name": "Hill Cottage Farm",
                    "location": "Near Keswick",
                    "features": ["Working farm", "Lake access", "Family friendly"],
                    "coordinates": {"lat": 54.5833, "lng": -3.1333}
                },
                {
                    "name": "Park Cliffe",
                    "location": "Windermere",
                    "features": ["Holiday park", "Pool", "Entertainment"],
                    "large_units": "Accommodates American RVs"
                },
                {
                    "name": "Wasdale Head NT Campsite",
                    "features": ["Remote valley", "Scafell Pike access", "Basic facilities"],
                    "note": "Narrow access road"
                }
            ],
            "scenic_drives": [
                "Hardknott Pass (steepest in England)",
                "Kirkstone Pass",
                "Honister Pass"
            ],
            "literary_connections": [
                "William Wordsworth (Dove Cottage)",
                "Beatrix Potter (Hill Top)",
                "Arthur Ransome (Swallows and Amazons)"
            ],
            "walking_grades": [
                "Easy: Tarn Hows, Buttermere circuit",
                "Moderate: Cat Bells, Loughrigg Fell",
                "Hard: Scafell Pike, Helvellyn"
            ],
            "best_season": "May to September",
            "busy_periods": "School holidays, bank holidays",
            "weather": "Rain likely any time - pack accordingly",
            "parking": "Popular spots fill early"
        }
    },
    {
        "name": "Cornwall's Coastal Paradise",
        "description": "Surf beaches, fishing villages, and cream teas in England's far southwest",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["cornwall", "england", "beaches", "surfing", "uk", "coastal"],
        "template_data": {
            "type": "coastal_county",
            "location": "Southwest England",
            "coastline": "697km",
            "highlights": [
                {
                    "name": "St Ives",
                    "coordinates": {"lat": 50.2111, "lng": -5.4806},
                    "features": ["Artists' colony", "Tate gallery", "Beaches", "Narrow streets"]
                },
                {
                    "name": "Land's End",
                    "coordinates": {"lat": 50.0664, "lng": -5.7147},
                    "claim": "Most westerly point of mainland England",
                    "nearby": "Minack Theatre (cliff-top amphitheatre)"
                },
                {
                    "name": "St Michael's Mount",
                    "coordinates": {"lat": 50.1175, "lng": -5.4767},
                    "feature": "Tidal island castle",
                    "access": "Causeway at low tide, boat at high"
                },
                {
                    "name": "Eden Project",
                    "coordinates": {"lat": 50.3619, "lng": -4.7447},
                    "features": ["Biomes", "Gardens", "Education center"]
                },
                {
                    "name": "Tintagel Castle",
                    "coordinates": {"lat": 50.6685, "lng": -4.7604},
                    "legend": "King Arthur's birthplace",
                    "feature": "New footbridge"
                }
            ],
            "surf_beaches": [
                {
                    "name": "Fistral Beach",
                    "location": "Newquay",
                    "status": "UK surf capital",
                    "facilities": "Surf schools, rentals"
                },
                {
                    "name": "Watergate Bay",
                    "features": ["2 miles of sand", "Extreme Academy"]
                },
                {
                    "name": "Sennen Cove",
                    "location": "Near Land's End",
                    "vibe": "Less commercial"
                }
            ],
            "camping_options": [
                {
                    "name": "Ayr Holiday Park",
                    "location": "St Ives",
                    "features": ["Sea views", "Direct beach access", "Heated pool"],
                    "book_early": "Very popular"
                },
                {
                    "name": "Franchis Holiday Park",
                    "location": "Near Padstow",
                    "features": ["Family park", "Entertainment", "Indoor pool"]
                },
                {
                    "name": "Trevalgan Holiday Park",
                    "location": "St Ives Bay",
                    "features": ["Beachside", "Large pitches", "Dog friendly"]
                }
            ],
            "cornish_treats": [
                "Cornish pasties",
                "Cream tea (jam first!)",
                "Fresh seafood",
                "Cornish ice cream"
            ],
            "coastal_path": "South West Coast Path - 1014km total",
            "best_season": "June to September",
            "avoid": "August peak crowds",
            "weather": "Milder than rest of UK",
            "tips": ["Book early", "Many narrow roads", "Park and ride in towns"]
        }
    },
    {
        "name": "Cotswolds Countryside Charm",
        "description": "Honey-colored villages, rolling hills, and quintessential English countryside",
        "category": "scenic_routes",
        "is_public": True,
        "tags": ["cotswolds", "england", "villages", "countryside", "uk", "historic"],
        "template_data": {
            "type": "rural_touring",
            "region": "Gloucestershire/Oxfordshire",
            "area_of_outstanding_natural_beauty": True,
            "iconic_villages": [
                {
                    "name": "Bourton-on-the-Water",
                    "coordinates": {"lat": 51.8860, "lng": -1.7580},
                    "nickname": "Venice of the Cotswolds",
                    "features": ["Model village", "River Windrush", "Motor museum"]
                },
                {
                    "name": "Bibury",
                    "coordinates": {"lat": 51.7597, "lng": -1.8325},
                    "claim": "England's prettiest village (William Morris)",
                    "photo_op": "Arlington Row cottages"
                },
                {
                    "name": "Chipping Campden",
                    "coordinates": {"lat": 52.0494, "lng": -1.7778},
                    "features": ["High Street", "Market Hall", "St James Church"],
                    "walking": "Start of Cotswold Way"
                },
                {
                    "name": "Castle Combe",
                    "coordinates": {"lat": 51.4933, "lng": -2.2275},
                    "features": ["Film location", "No modern buildings", "14th century market cross"]
                },
                {
                    "name": "Stow-on-the-Wold",
                    "elevation": "800 feet",
                    "features": ["Antique shops", "Market square", "Ancient inns"]
                }
            ],
            "camping_bases": [
                {
                    "name": "Moreton-in-Marsh Caravan Club",
                    "features": ["Train station nearby", "Level pitches", "Good facilities"],
                    "location": "Central for exploring"
                },
                {
                    "name": "Ranch Caravan Park",
                    "location": "Honeybourne",
                    "features": ["Adults only", "Peaceful", "Good reviews"]
                },
                {
                    "name": "Cotswold View Caravan Park",
                    "location": "Charfield",
                    "features": ["Views", "Easy access", "All weather pitches"]
                }
            ],
            "attractions": [
                "Blenheim Palace (Woodstock)",
                "Sudeley Castle",
                "Hidcote Garden",
                "Broadway Tower",
                "Cotswold Farm Park"
            ],
            "cotswold_way": {
                "distance": "164km",
                "route": "Chipping Campden to Bath",
                "duration": "7-10 days walking"
            },
            "local_products": [
                "Cotswold cheese",
                "Local ales",
                "Farmers markets",
                "Wool products"
            ],
            "driving_notes": [
                "Narrow lanes common",
                "Limited parking in villages",
                "Use park and ride where available"
            ],
            "best_season": "May to September",
            "events": "Various festivals throughout summer",
            "tips": ["Visit villages early morning", "Midweek less crowded", "Book restaurants ahead"]
        }
    },
    {
        "name": "Peak District Adventures",
        "description": "England's first national park with dramatic peaks, caves, and spa towns",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["peak_district", "england", "hiking", "caves", "uk", "national_park"],
        "template_data": {
            "type": "peak_and_valley",
            "location": "Derbyshire/Yorkshire",
            "established": "1951 - UK's first national park",
            "visitors": "13 million annually",
            "districts": {
                "dark_peak": {
                    "terrain": "Gritstone moorlands",
                    "highlights": ["Kinder Scout", "Bleaklow", "Wild landscapes"],
                    "activities": ["Hiking", "Rock climbing", "Mountain biking"]
                },
                "white_peak": {
                    "terrain": "Limestone valleys",
                    "highlights": ["Dovedale", "Chatsworth", "Cave systems"],
                    "activities": ["Gentle walks", "Cycling", "Cave tours"]
                }
            },
            "key_attractions": [
                {
                    "name": "Chatsworth House",
                    "coordinates": {"lat": 53.2278, "lng": -1.6119},
                    "features": ["Stately home", "Gardens", "Farm shop", "Adventure playground"]
                },
                {
                    "name": "Castleton Caves",
                    "coordinates": {"lat": 53.3425, "lng": -1.7767},
                    "caves": ["Blue John Cavern", "Peak Cavern", "Speedwell Cavern", "Treak Cliff"],
                    "unique": "Blue John stone found nowhere else"
                },
                {
                    "name": "Bakewell",
                    "coordinates": {"lat": 53.2147, "lng": -1.6756},
                    "famous_for": "Bakewell pudding (not tart!)",
                    "features": ["Market town", "River Wye", "Monday market"]
                },
                {
                    "name": "Buxton",
                    "coordinates": {"lat": 53.2575, "lng": -1.9119},
                    "features": ["Spa town", "Opera House", "Pavilion Gardens"],
                    "elevation": "1000 feet"
                }
            ],
            "camping_options": [
                {
                    "name": "Hayfield Camping",
                    "features": ["Kinder Scout access", "Village location", "Basic facilities"],
                    "good_for": "Hikers"
                },
                {
                    "name": "Greenhills Holiday Park",
                    "location": "Bakewell",
                    "features": ["Riverside", "Full facilities", "Near town"]
                },
                {
                    "name": "Beech Croft Farm",
                    "location": "Blackwell",
                    "features": ["Working farm", "Adults only", "Peaceful"]
                }
            ],
            "walking_highlights": [
                "Kinder Scout (Mass Trespass 1932)",
                "Mam Tor (Shivering Mountain)",
                "Stanage Edge",
                "Dovedale stepping stones"
            ],
            "cycling_trails": [
                "Tissington Trail",
                "Monsal Trail (tunnels)",
                "High Peak Trail"
            ],
            "weather": "Can change quickly - be prepared",
            "best_season": "April to October",
            "winter": "Beautiful but challenging conditions",
            "respect": "Right to Roam but respect private land"
        }
    },
    
    # === WALES ===
    {
        "name": "Wales Coast Path: Pembrokeshire",
        "description": "Dramatic cliffs, golden beaches, and puffins along Wales' stunning coast",
        "category": "coastal_routes",
        "is_public": True,
        "tags": ["pembrokeshire", "wales", "coastal_path", "uk", "beaches", "wildlife"],
        "template_data": {
            "type": "coastal_walking",
            "location": "Southwest Wales",
            "total_path": "186 miles in Pembrokeshire",
            "national_park": "UK's only coastal national park",
            "highlights": [
                {
                    "name": "St Davids",
                    "coordinates": {"lat": 51.8819, "lng": -5.2694},
                    "claim": "UK's smallest city",
                    "features": ["Cathedral", "Bishop's Palace", "Whitesands Bay"]
                },
                {
                    "name": "Tenby",
                    "coordinates": {"lat": 51.6729, "lng": -4.7036},
                    "features": ["Medieval walls", "Harbour", "Victorian resort", "Beaches"]
                },
                {
                    "name": "Skomer Island",
                    "coordinates": {"lat": 51.7367, "lng": -5.3000},
                    "wildlife": ["Puffins (April-July)", "Seals", "Manx shearwaters"],
                    "access": "Boat from Martin's Haven"
                },
                {
                    "name": "Barafundle Bay",
                    "claim": "One of UK's best beaches",
                    "access": "Walk from Stackpole Quay",
                    "facilities": "None - unspoiled"
                },
                {
                    "name": "Green Bridge of Wales",
                    "feature": "Natural arch",
                    "location": "Near Stack Rocks",
                    "note": "MOD land - check access"
                }
            ],
            "camping_options": [
                {
                    "name": "Caerfai Bay Caravan Park",
                    "location": "St Davids",
                    "features": ["Organic farm", "Cliff-top location", "Beach access"],
                    "coordinates": {"lat": 51.8694, "lng": -5.2875}
                },
                {
                    "name": "Trefalun Park",
                    "location": "St Florence",
                    "features": ["Near Tenby", "Family park", "Entertainment"]
                },
                {
                    "name": "Coastal Stay",
                    "location": "Pembroke",
                    "features": ["Adults only", "Sea views", "Peaceful"]
                }
            ],
            "coastal_activities": [
                "Coasteering (invented here)",
                "Sea kayaking",
                "Wildlife boat trips",
                "Surfing (Freshwater West)",
                "Rock climbing"
            ],
            "inland_attractions": [
                "Pembroke Castle",
                "Preseli Hills (Stonehenge bluestones)",
                "St Govan's Chapel"
            ],
            "walking_sections": [
                "St Dogmaels to Cardigan",
                "Fishguard to St Davids",
                "St Davids to Milford Haven",
                "Pembroke to Amroth"
            ],
            "best_season": "May to September",
            "puffin_season": "April to July",
            "weather": "Atlantic storms possible",
            "welsh_language": "Widely spoken - bilingual signs"
        }
    },
    {
        "name": "Snowdonia Mountain Explorer",
        "description": "Wales' highest peaks, zip lines, and slate mining heritage",
        "category": "mountain_scenic",
        "is_public": True,
        "tags": ["snowdonia", "wales", "mountains", "hiking", "uk", "national_park"],
        "template_data": {
            "type": "mountain_park",
            "welsh_name": "Eryri",
            "area": "2130 sq km",
            "highest_peak": "Snowdon/Yr Wyddfa (1085m)",
            "mountain_ranges": [
                {
                    "name": "Snowdon Massif",
                    "peaks": ["Snowdon", "Crib Goch", "Y Lliwedd"],
                    "routes_to_summit": [
                        {
                            "name": "Llanberis Path",
                            "difficulty": "Easiest",
                            "distance": "9 miles return"
                        },
                        {
                            "name": "Pyg Track",
                            "difficulty": "Moderate",
                            "start": "Pen-y-Pass"
                        },
                        {
                            "name": "Crib Goch",
                            "difficulty": "Scrambling required",
                            "warning": "Experienced only"
                        }
                    ]
                },
                {
                    "name": "Glyderau",
                    "features": ["Tryfan", "Glyder Fawr", "Castle of the Winds"],
                    "famous": "Tryfan's leap between Adam and Eve stones"
                },
                {
                    "name": "Carneddau",
                    "features": ["Wild ponies", "Remote", "Multiple peaks"],
                    "highest": "Carnedd Llewelyn"
                }
            ],
            "unique_attractions": [
                {
                    "name": "Snowdon Mountain Railway",
                    "coordinates": {"lat": 53.1186, "lng": -4.1283},
                    "feature": "Rack railway to summit",
                    "operates": "March to October"
                },
                {
                    "name": "Zip World",
                    "locations": ["Velocity (fastest)", "Titan (4 person)", "Underground trampolines"],
                    "claim": "Various world records"
                },
                {
                    "name": "Portmeirion",
                    "coordinates": {"lat": 52.9136, "lng": -4.0983},
                    "feature": "Italianate village",
                    "famous": "The Prisoner TV series"
                }
            ],
            "camping_bases": [
                {
                    "name": "Llyn Gwynant Campsite",
                    "features": ["Lakeside", "Mountain views", "Basic facilities"],
                    "coordinates": {"lat": 53.0333, "lng": -4.0167}
                },
                {
                    "name": "Beddgelert Forest",
                    "features": ["Forest setting", "Family friendly", "Good facilities"]
                },
                {
                    "name": "Camping in Llanberis",
                    "features": ["Near Snowdon railway", "Village amenities", "Electric hookups"]
                }
            ],
            "other_activities": [
                "Slate mine tours",
                "Mountain biking",
                "White water rafting",
                "Via ferrata",
                "Canyoning"
            ],
            "castles": [
                "Caernarfon Castle",
                "Conwy Castle",
                "Harlech Castle",
                "Beaumaris Castle"
            ],
            "weather_warning": "Mountain weather severe - proper equipment essential",
            "best_season": "May to September",
            "avoid": "Snowdon on summer weekends (very crowded)",
            "parking": "Pen-y-Pass fills by 6am in summer"
        }
    },
    
    # === NORTHERN ENGLAND ===
    {
        "name": "Yorkshire Dales & Moors Discovery",
        "description": "Stone villages, dramatic dales, and wild moorland in God's Own County",
        "category": "nature_wildlife",
        "is_public": True,
        "tags": ["yorkshire_dales", "yorkshire", "england", "uk", "hiking", "countryside"],
        "template_data": {
            "type": "dales_and_moors",
            "region": "Yorkshire",
            "two_parks": ["Yorkshire Dales NP", "North York Moors NP"],
            "yorkshire_dales": {
                "features": ["Limestone scenery", "Dry stone walls", "Market towns"],
                "key_dales": [
                    {
                        "name": "Wharfedale",
                        "attractions": ["Bolton Abbey", "Grassington", "Kilnsey Crag"]
                    },
                    {
                        "name": "Swaledale",
                        "features": ["Most northerly", "Lead mining history", "Sheep"]
                    },
                    {
                        "name": "Malhamdale",
                        "coordinates": {"lat": 54.0719, "lng": -2.1600},
                        "attractions": ["Malham Cove", "Gordale Scar", "Janet's Foss"]
                    }
                ],
                "three_peaks": {
                    "peaks": ["Pen-y-ghent", "Whernside", "Ingleborough"],
                    "challenge": "24 miles in 12 hours",
                    "difficulty": "Strenuous"
                }
            },
            "north_york_moors": {
                "features": ["Heather moorland", "Steam railway", "Coastal section"],
                "highlights": [
                    {
                        "name": "Whitby",
                        "coordinates": {"lat": 54.4863, "lng": -0.6133},
                        "features": ["Dracula connection", "Abbey ruins", "199 steps", "Fish & chips"]
                    },
                    {
                        "name": "North Yorkshire Moors Railway",
                        "route": "Pickering to Whitby",
                        "feature": "Heritage steam trains"
                    },
                    {
                        "name": "Rosedale",
                        "feature": "Former ironstone mining",
                        "attraction": "Chimney Bank (33% gradient)"
                    }
                ]
            },
            "camping_recommendations": [
                {
                    "name": "Gordale Scar Campsite",
                    "location": "Malham",
                    "features": ["Near attractions", "Basic facilities", "Stunning location"]
                },
                {
                    "name": "Studfold Caravan Park",
                    "location": "Nidderdale",
                    "features": ["Farm setting", "Good facilities", "Dog friendly"]
                },
                {
                    "name": "Rosedale Abbey Caravan Park",
                    "location": "North York Moors",
                    "features": ["Village location", "Peaceful", "Good base"]
                }
            ],
            "market_towns": [
                "Skipton (Gateway to Dales)",
                "Richmond (Georgian)",
                "Hawes (Wensleydale cheese)",
                "Helmsley (Moors gateway)"
            ],
            "walking_classics": [
                "Malham circular",
                "Aysgarth Falls",
                "Hardraw Force",
                "Coast to Coast path"
            ],
            "best_season": "April to October",
            "heather_bloom": "August-September",
            "weather": "Can be bleak - prepare accordingly",
            "local_delicacies": ["Yorkshire pudding", "Wensleydale cheese", "Parkin cake"]
        }
    }
]

async def load_great_britain_data():
    """Load comprehensive Great Britain travel data to trip_templates"""
    
    # Get Supabase credentials
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    
    supabase: Client = create_client(url, key)
    
    print("🌟 Loading Comprehensive Great Britain Travel Data")
    print("=" * 60)
    print(f"📊 Preparing to load {len(GREAT_BRITAIN_DATA)} detailed travel templates")
    print()
    
    success_count = 0
    error_count = 0
    
    # Categories being loaded
    categories = set()
    regions = set()
    
    # Load each template
    for i, template in enumerate(GREAT_BRITAIN_DATA, 1):
        try:
            # Extract metadata
            categories.add(template['category'])
            for tag in template['tags']:
                if tag in ['scotland', 'england', 'wales', 'highlands', 'yorkshire', 
                           'cornwall', 'lake_district', 'cotswolds']:
                    regions.add(tag)
            
            # Add metadata
            template['usage_count'] = 0
            template['created_at'] = datetime.now().isoformat()
            
            # Insert to database
            result = supabase.table('trip_templates').insert(template).execute()
            
            if result.data:
                print(f"✅ [{i:2d}/{len(GREAT_BRITAIN_DATA)}] {template['name']}")
                success_count += 1
            else:
                print(f"❌ [{i:2d}/{len(GREAT_BRITAIN_DATA)}] Failed: {template['name']}")
                error_count += 1
                
        except Exception as e:
            print(f"❌ [{i:2d}/{len(GREAT_BRITAIN_DATA)}] Error: {template['name']} - {str(e)[:50]}...")
            error_count += 1
    
    print("\n" + "=" * 60)
    print(f"🎉 Data Loading Complete!")
    print(f"✅ Successfully loaded: {success_count} templates")
    if error_count > 0:
        print(f"❌ Failed: {error_count} templates")
    
    print(f"\n📍 Coverage:")
    print(f"   Countries: Scotland, England, Wales")
    print(f"   Categories: {', '.join(sorted(categories))}")
    
    print("\n🌟 Added comprehensive data for:")
    print("   • Scotland (North Coast 500, Skye, Loch Ness)")
    print("   • England (Lake District, Cornwall, Cotswolds)")
    print("   • Wales (Pembrokeshire, Snowdonia)")
    print("   • National Parks and AONBs")
    print("   • Coastal paths and beaches")
    print("   • Historic castles and sites")
    print("   • Mountain ranges and hiking")
    print("   • Traditional villages and market towns")
    
    print("\n💡 PAM now has detailed Great Britain travel data including:")
    print("   • Caravan parks and camping sites")
    print("   • Wild camping areas (Scotland)")
    print("   • Narrow road warnings")
    print("   • Weather considerations")
    print("   • Local customs and traditions")
    print("   • Public transport connections")
    
    return success_count > 0

if __name__ == "__main__":
    asyncio.run(load_great_britain_data())