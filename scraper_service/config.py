# scraper_service/config.py

DATA_SOURCES = [
    {
        "domain": "example.com",
        "urls": [
            "https://example.com",
        ],
    },
    {
        "domain": "overpass-api.de",
        "urls": [
            # Query free campsites within 50km of Sydney (lat -33.86, lon 151.21)
            "https://overpass-api.de/api/interpreter?data=[out:json];node[\"tourism\"=\"camp_site\"](around:50000,-33.86,151.21);out;",
        ],
    },
]
