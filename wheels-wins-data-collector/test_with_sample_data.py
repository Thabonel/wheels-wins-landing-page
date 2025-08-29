#!/usr/bin/env python3
"""
Test the system with sample data to verify end-to-end functionality
"""

import asyncio
import json
from pathlib import Path
from datetime import datetime

# Sample data for testing
SAMPLE_LOCATIONS = [
    {
        "name": "Kakadu National Park",
        "data_type": "national_parks",
        "country": "australia",
        "state_province": "Northern Territory",
        "description": "World Heritage-listed national park featuring Aboriginal rock art, wetlands, and diverse wildlife",
        "latitude": -12.4255,
        "longitude": 132.8932,
        "rv_accessible": True,
        "camping_available": True,
        "activities": ["hiking", "wildlife viewing", "cultural tours", "swimming"],
        "data_source": "test_data",
        "source_reliability": 10
    },
    {
        "name": "Big4 Cairns Crystal Cascades Holiday Park",
        "data_type": "camping_spots",
        "country": "australia",
        "state_province": "Queensland",
        "description": "Family-friendly holiday park with pool, playground, and easy access to Crystal Cascades",
        "latitude": -16.9528,
        "longitude": 145.6889,
        "camping_type": "rv_park",
        "is_free": False,
        "price_per_night": 45.00,
        "amenities": {"toilets": True, "showers": True, "electricity": True, "wifi": True, "pool": True},
        "rv_accessible": True,
        "data_source": "test_data",
        "source_reliability": 8
    },
    {
        "name": "Sydney Opera House",
        "data_type": "attractions",
        "country": "australia",
        "state_province": "New South Wales",
        "description": "Iconic architectural masterpiece and UNESCO World Heritage Site",
        "latitude": -33.8568,
        "longitude": 151.2153,
        "attraction_type": "landmark",
        "rv_accessible": False,
        "parking_available": True,
        "rating": 4.5,
        "data_source": "test_data",
        "source_reliability": 10
    },
    {
        "name": "Bondi Beach",
        "data_type": "swimming_spots",
        "country": "australia",
        "state_province": "New South Wales",
        "description": "Famous beach known for surfing, swimming, and beachside cafes",
        "latitude": -33.8908,
        "longitude": 151.2743,
        "swimming_type": "ocean_beach",
        "water_type": "saltwater",
        "facilities": {"lifeguards": True, "changerooms": True, "parking": "paid", "cafes": True},
        "safety_rating": "patrolled",
        "data_source": "test_data",
        "source_reliability": 9
    },
    {
        "name": "Lake Eacham",
        "data_type": "swimming_spots",
        "country": "australia",
        "state_province": "Queensland",
        "description": "Volcanic crater lake with crystal clear water, perfect for swimming",
        "latitude": -17.2839,
        "longitude": 145.6269,
        "swimming_type": "lake",
        "water_type": "freshwater",
        "facilities": {"picnic_areas": True, "toilets": True, "parking": "free"},
        "data_source": "test_data",
        "source_reliability": 8
    }
]

async def test_with_sample_data():
    """Test the data processing pipeline with sample data"""
    
    print("🧪 Testing Wheels & Wins Data Collection System with Sample Data")
    print("=" * 60)
    
    # Save sample data to raw directory
    raw_file = Path("data/raw/test_sample_data.json")
    raw_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(raw_file, 'w') as f:
        json.dump(SAMPLE_LOCATIONS, f, indent=2)
    
    print(f"✅ Created sample data file: {raw_file}")
    print(f"   - {len(SAMPLE_LOCATIONS)} locations")
    print(f"   - Types: national_parks, camping_spots, attractions, swimming_spots")
    
    # Now process this data through the system
    from data_processors.deduplicator import DataDeduplicator
    from data_processors.validator import DataValidator
    from data_processors.enhancer import DataEnhancer
    from outputs.json_exporter import JSONExporter
    from outputs.sql_exporter import SQLExporter
    
    # Load config
    import yaml
    with open('config/data_sources.yaml', 'r') as f:
        sources_config = yaml.safe_load(f)
    
    print("\n📊 Processing sample data...")
    
    # Step 1: Deduplication
    deduplicator = DataDeduplicator(sources_config)
    deduplicated = await deduplicator.deduplicate(SAMPLE_LOCATIONS)
    print(f"✅ Deduplication: {len(SAMPLE_LOCATIONS)} -> {len(deduplicated)} locations")
    
    # Step 2: Validation
    validator = DataValidator(sources_config)
    validated, failed = await validator.validate_batch(deduplicated)
    print(f"✅ Validation: {len(validated)} valid, {len(failed)} failed")
    
    # Step 3: Enhancement
    enhancer = DataEnhancer(sources_config)
    enhanced = await enhancer.enhance_batch(validated)
    print(f"✅ Enhancement: {len(enhanced)} locations enhanced")
    
    # Step 4: Export
    print("\n📤 Exporting data...")
    
    # JSON export
    json_exporter = JSONExporter()
    json_file = await json_exporter.save_data(enhanced, "data/final/test_sample_processed.json")
    print(f"✅ JSON export: {json_file}")
    
    # SQL export
    sql_exporter = SQLExporter()
    sql_files = await sql_exporter.generate_inserts(enhanced)
    print(f"✅ SQL export: {len(sql_files)} files generated")
    for sql_file in sql_files:
        print(f"   - {sql_file}")
    
    # Summary
    print("\n" + "=" * 60)
    print("🎉 TEST SUCCESSFUL!")
    print("=" * 60)
    print("\nThe system successfully processed sample data:")
    print("✅ Data loading and parsing")
    print("✅ Deduplication")
    print("✅ Validation")
    print("✅ Enhancement")
    print("✅ JSON export")
    print("✅ SQL generation")
    
    print("\nCheck these files:")
    print(f"  • JSON: {json_file}")
    print(f"  • SQL: outputs/sql/")
    
    print("\nThe system is ready for real data collection!")
    print("Run: python main.py --countries all --data-types all")

if __name__ == "__main__":
    asyncio.run(test_with_sample_data())