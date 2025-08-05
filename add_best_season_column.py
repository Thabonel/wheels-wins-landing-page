#!/usr/bin/env python3
"""
Add best_season column to trip_templates table
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

async def add_best_season_column():
    """Add best_season column to trip_templates table and populate it"""
    
    try:
        # Get database service
        db = get_database_service()
        
        logger.info("Adding best_season column to trip_templates table...")
        
        # Step 1: Add the column
        alter_query = """
        ALTER TABLE trip_templates 
        ADD COLUMN IF NOT EXISTS best_season TEXT;
        """
        
        try:
            # Use raw SQL execution
            result = await db.client.rpc('exec_sql', {'sql': alter_query}).execute()
            logger.info("✅ Successfully added best_season column")
        except Exception as e:
            logger.error(f"❌ Could not add column with RPC: {e}")
            logger.info("🔄 Trying alternative approach...")
            
            # Alternative: Add column via direct SQL (if RPC not available)
            # This is a fallback - in production you'd run this via Supabase dashboard
            logger.info("⚠️  Please run this SQL manually in Supabase dashboard:")
            print("\n" + "="*60)
            print("📝 SQL TO RUN MANUALLY:")
            print("="*60)
            print(alter_query)
            print("="*60)
        
        # Step 2: Update existing templates with best_season data
        logger.info("Updating existing templates with best_season data...")
        
        # Define season mappings based on template data patterns
        season_updates = [
            # Great Ocean Road - temperate climate
            {
                "pattern": "Great Ocean Road",
                "best_season": "October to April"
            },
            # Red Centre/Uluru - avoid extreme heat
            {
                "pattern": "Red Centre",
                "best_season": "April to September"
            },
            {
                "pattern": "Uluru",
                "best_season": "April to September"
            },
            # Pacific Coast - avoid wet season
            {
                "pattern": "Pacific Coast",
                "best_season": "April to October"
            },
            # Big Lap - depends on region planning
            {
                "pattern": "Big Lap",
                "best_season": "Plan by region"
            },
            # Western Australia - avoid extreme heat
            {
                "pattern": "Western Australia",
                "best_season": "April to September"
            },
            # Nullarbor - avoid summer heat
            {
                "pattern": "Nullarbor",
                "best_season": "April to October"
            },
            # Queensland Outback - dry season
            {
                "pattern": "Queensland Outback",
                "best_season": "April to September"
            },
            # Blue Mountains - avoid extreme weather
            {
                "pattern": "Blue Mountains",
                "best_season": "September to May"
            },
            # Bayfield National Park - dry season
            {
                "pattern": "Bayfield",
                "best_season": "April to October"
            },
            # Victorian High Country - summer/autumn
            {
                "pattern": "Victorian High Country",
                "best_season": "November to April"
            },
            # Gibb River Road - dry season only
            {
                "pattern": "Gibb River",
                "best_season": "May to September"
            },
            # Murray River - year round but best in warmer months
            {
                "pattern": "Murray River",
                "best_season": "October to April"
            }
        ]
        
        # Get all templates to update
        templates_result = db.client.table("trip_templates").select("id, name, template_data").execute()
        
        if templates_result.data:
            updated_count = 0
            
            for template in templates_result.data:
                template_name = template['name']
                template_id = template['id']
                template_data = template.get('template_data', {})
                
                # Find matching season data
                best_season = None
                
                # First check if it's already in template_data
                if template_data.get('best_season'):
                    best_season = template_data['best_season']
                
                # Otherwise match by name pattern
                if not best_season:
                    for season_update in season_updates:
                        if season_update['pattern'].lower() in template_name.lower():
                            best_season = season_update['best_season']
                            break
                
                # Default fallback
                if not best_season:
                    best_season = "Year round (check regional conditions)"
                
                # Update the template
                try:
                    update_result = db.client.table("trip_templates").update({
                        "best_season": best_season
                    }).eq("id", template_id).execute()
                    
                    if update_result.data:
                        logger.info(f"✅ Updated '{template_name}' -> {best_season}")
                        updated_count += 1
                    else:
                        logger.warning(f"⚠️  Could not update '{template_name}'")
                        
                except Exception as e:
                    logger.error(f"❌ Error updating '{template_name}': {e}")
            
            logger.info(f"🎉 Successfully updated {updated_count} templates with best_season data")
            
        else:
            logger.warning("⚠️  No templates found to update")
        
        # Step 3: Verify the changes
        logger.info("Verifying changes...")
        
        # Check a few templates
        verify_result = db.client.table("trip_templates").select("name, best_season").limit(5).execute()
        
        if verify_result.data:
            print("\n" + "="*60)
            print("✅ BEST_SEASON COLUMN ADDED & POPULATED")
            print("="*60)
            for template in verify_result.data:
                season = template.get('best_season', 'Not set')
                print(f"📅 {template['name']}: {season}")
            print("="*60)
            print("🎉 Users can now see the best travel seasons!")
        
    except Exception as e:
        logger.error(f"❌ Failed to add best_season column: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(add_best_season_column())