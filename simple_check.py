#!/usr/bin/env python3
"""
Simple check for trip templates
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

async def simple_check():
    """Simple check of trip templates"""
    
    try:
        # Get database service
        db = get_database_service()
        
        logger.info("Getting recent trip templates...")
        
        # Get recent templates
        result = db.client.table("trip_templates").select("id, name, category, tags").order("created_at", desc=True).limit(5).execute()
        
        if result.data:
            print("\n" + "="*60)
            print("📋 RECENT TRIP TEMPLATES")
            print("="*60)
            for template in result.data:
                print(f"• {template['name']} ({template.get('category', 'unknown')})")
                if 'bayfield' in template['name'].lower():
                    print("  🎉 BAYFIELD FOUND!")
            print("="*60)
            return True
        else:
            print("❌ No trip templates found")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(simple_check())