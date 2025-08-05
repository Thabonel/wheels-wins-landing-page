#!/usr/bin/env python3
"""
Check if Bayfield National Park was added successfully
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.database import get_database_service
from app.core.logging import setup_logging, get_logger

setup_logging()
logger = get_logger(__name__)

async def check_bayfield_added():
    """Check if Bayfield National Park was added to the database"""
    
    try:
        # Get database service
        db = get_database_service()
        
        logger.info("Checking for Bayfield National Park...")
        
        # Check trip_templates table
        logger.info("Searching trip_templates...")
        result = db.client.table("trip_templates").select("*").ilike("name", "%Bayfield%").execute()
        
        if result.data:
            template = result.data[0]
            print("\n" + "="*60)
            print("🎉 BAYFIELD NATIONAL PARK FOUND!")
            print("="*60)
            print(f"📋 Name: {template['name']}")
            print(f"📍 Category: {template['category']}")
            print(f"🏷️  Tags: {template['tags']}")
            print(f"📝 Description: {template['description'][:100]}...")
            print(f"🆔 ID: {template['id']}")
            print("="*60)
            
            # Check template data
            template_data = template.get('template_data', {})
            if template_data:
                print("📊 Template Data:")
                print(f"   🏔️  Difficulty: {template_data.get('difficulty')}")
                print(f"   📅 Duration: {template_data.get('duration_days')} days")
                print(f"   💰 Budget: ${template_data.get('estimated_budget')} {template_data.get('currency')}")
                print(f"   🌍 Region: {template_data.get('region')}")
                if template_data.get('highlights'):
                    print(f"   ⭐ Highlights: {len(template_data['highlights'])} items")
                if template_data.get('coordinates'):
                    coords = template_data['coordinates']
                    print(f"   📍 Coordinates: {coords.get('latitude')}, {coords.get('longitude')}")
            
            return True
        else:
            print("❌ Bayfield National Park not found in trip_templates")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error checking database: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(check_bayfield_added())