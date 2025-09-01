#!/usr/bin/env python3
"""
Autonomous Data Collection System for Render Cron Job
Collects thousands of real travel locations monthly
"""

import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime
import logging
from typing import List, Dict, Optional
import json
import traceback

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from scrapers.real_camping_scraper import RealCampingScraperService
from scrapers.real_parks_scraper import RealParksScraperService
from scrapers.real_attractions_scraper import RealAttractionsScraperService
from supabase import create_client, Client
from dotenv import load_dotenv
import sentry_sdk

# Load environment variables
load_dotenv()

# Initialize Sentry for error tracking (optional)
if os.getenv('SENTRY_DSN'):
    sentry_sdk.init(
        dsn=os.getenv('SENTRY_DSN'),
        traces_sample_rate=0.1
    )

# Ensure logs directory exists
logs_dir = Path('logs')
logs_dir.mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/autonomous_collector.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class AutonomousCollector:
    """Autonomous data collector that runs monthly on Render"""
    
    def __init__(self):
        self.supabase = self._init_supabase()
        self.progress_file = Path('data/collection_progress.json')
        self.monthly_target = 1000  # Collect 1000 items per run
        
        # Initialize scrapers
        self.scrapers = {
            'camping': RealCampingScraperService(),
            'parks': RealParksScraperService(),
            'attractions': RealAttractionsScraperService()
        }
        
        # Load progress
        self.progress = self._load_progress()
    
    def _init_supabase(self) -> Client:
        """Initialize Supabase client"""
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_KEY')
        
        if not url or not key:
            logger.error("❌ Missing Supabase credentials")
            logger.error(f"SUPABASE_URL: {'✓' if url else '❌'}")
            logger.error(f"SUPABASE_KEY: {'✓' if key else '❌'}")
            raise ValueError("Missing required environment variables: SUPABASE_URL and SUPABASE_KEY")
        
        return create_client(url, key)
    
    def _load_progress(self) -> Dict:
        """Load collection progress from file"""
        if self.progress_file.exists():
            with open(self.progress_file, 'r') as f:
                return json.load(f)
        
        return {
            'total_collected': 0,
            'last_run': None,
            'collection_history': [],
            'next_priority': 'camping',  # Rotate through types
            'errors': []
        }
    
    def _save_progress(self):
        """Save collection progress"""
        self.progress_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.progress_file, 'w') as f:
            json.dump(self.progress, f, indent=2)
    
    async def run_monthly_collection(self):
        """Main collection routine - runs monthly via Render cron"""
        start_time = datetime.now()
        logger.info("=" * 60)
        logger.info("🚀 Starting Autonomous Monthly Collection")
        logger.info(f"Target: {self.monthly_target} new locations")
        logger.info(f"Total collected so far: {self.progress['total_collected']}")
        
        collected_items = []
        errors = []
        
        try:
            # Determine what to collect this month
            collection_plan = self._create_collection_plan()
            
            # Execute collection
            for data_type, target_count in collection_plan.items():
                logger.info(f"\n📍 Collecting {target_count} {data_type} locations...")
                
                try:
                    scraper = self.scrapers.get(data_type)
                    if scraper:
                        items = await scraper.collect_all_countries(limit=target_count)
                        
                        # Process and upload to database
                        uploaded = await self._process_and_upload(items, data_type)
                        collected_items.extend(uploaded)
                        
                        logger.info(f"✅ Successfully collected {len(uploaded)} {data_type} locations")
                    
                except Exception as e:
                    error_msg = f"Error collecting {data_type}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    
                # Rate limiting between types
                await asyncio.sleep(10)
            
            # Update progress
            run_summary = {
                'date': start_time.isoformat(),
                'collected': len(collected_items),
                'duration': (datetime.now() - start_time).total_seconds(),
                'errors': len(errors),
                'breakdown': self._count_by_type(collected_items)
            }
            
            self.progress['total_collected'] += len(collected_items)
            self.progress['last_run'] = start_time.isoformat()
            self.progress['collection_history'].append(run_summary)
            self.progress['errors'] = errors[-10:]  # Keep last 10 errors
            
            # Rotate priority for next run
            priorities = ['camping', 'parks', 'attractions', 'swimming']
            current_idx = priorities.index(self.progress.get('next_priority', 'camping'))
            self.progress['next_priority'] = priorities[(current_idx + 1) % len(priorities)]
            
            self._save_progress()
            
            # Send summary report
            await self._send_summary_report(run_summary)
            
            logger.info("\n" + "=" * 60)
            logger.info(f"✅ Monthly collection complete!")
            logger.info(f"📊 Collected: {len(collected_items)} new locations")
            logger.info(f"📈 Total in database: {self.progress['total_collected']}")
            logger.info("=" * 60)
            
        except Exception as e:
            logger.error(f"Critical error in collection: {e}")
            logger.error(traceback.format_exc())
            if os.getenv('SENTRY_DSN'):
                sentry_sdk.capture_exception(e)
            raise
    
    def _create_collection_plan(self) -> Dict[str, int]:
        """Create collection plan based on progress and priorities"""
        total_collected = self.progress['total_collected']
        target = self.monthly_target
        
        # Adaptive strategy based on total collected
        if total_collected < 1000:
            # Focus on camping first
            return {
                'camping': int(target * 0.7),  # 70%
                'parks': int(target * 0.2),    # 20%
                'attractions': int(target * 0.1) # 10%
            }
        elif total_collected < 3000:
            # Balanced collection
            return {
                'camping': int(target * 0.4),     # 40%
                'parks': int(target * 0.3),       # 30%
                'attractions': int(target * 0.3)  # 30%
            }
        else:
            # Focus on variety
            priority = self.progress.get('next_priority', 'camping')
            base_per_type = int(target * 0.2)  # 20% each
            plan = {
                'camping': base_per_type,
                'parks': base_per_type,
                'attractions': base_per_type,
                'swimming': base_per_type
            }
            # Boost priority type with remaining
            remaining = target - (base_per_type * 4)
            if priority in plan:
                plan[priority] += remaining
            
            return plan
    
    async def _process_and_upload(self, items: List[Dict], data_type: str) -> List[Dict]:
        """Process items and upload to Supabase"""
        uploaded = []
        
        # Process in batches
        batch_size = 50
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            
            try:
                # Transform to trip_templates format
                templates = []
                for item in batch:
                    template = self._transform_to_template(item, data_type)
                    if template:
                        templates.append(template)
                
                if templates:
                    # Upload to Supabase
                    result = self.supabase.table('trip_templates').insert(templates).execute()
                    
                    if result.data:
                        uploaded.extend(result.data)
                        logger.info(f"Uploaded batch of {len(result.data)} items")
                    
                    # Rate limiting
                    await asyncio.sleep(1)
                    
            except Exception as e:
                logger.error(f"Error uploading batch: {e}")
                continue
        
        return uploaded
    
    def _transform_to_template(self, item: Dict, data_type: str) -> Optional[Dict]:
        """Transform scraped item to trip_template format"""
        try:
            # Map data types to categories
            category_map = {
                'camping': 'free_camping' if item.get('is_free') else 'rv_parks',
                'parks': 'nature_wildlife',
                'attractions': 'tourist_attractions',
                'swimming': 'swimming_waterfalls'
            }
            
            # Create tags
            tags = [data_type, item.get('country', ''), item.get('state_province', '')]
            tags.extend(item.get('tags', []))
            tags = [tag for tag in tags if tag]  # Remove empty
            
            template = {
                'name': item.get('name', 'Unnamed Location'),
                'description': item.get('description', '')[:500],
                'category': category_map.get(data_type, 'nature_wildlife'),
                'is_public': True,
                'tags': tags[:10],  # Limit tags
                'template_data': {
                    'type': data_type,
                    'coordinates': {
                        'latitude': item.get('latitude'),
                        'longitude': item.get('longitude')
                    },
                    'amenities': item.get('amenities', {}),
                    'contact': item.get('contact_info', {}),
                    'source': item.get('data_source'),
                    'collected_at': item.get('collected_at'),
                    'verified': item.get('last_verified'),
                    'rating': item.get('rating'),
                    'is_free': item.get('is_free', False),
                    'price': item.get('price')
                },
                'usage_count': 0,
                'created_at': datetime.now().isoformat()
            }
            
            return template
            
        except Exception as e:
            logger.error(f"Error transforming item: {e}")
            return None
    
    def _count_by_type(self, items: List[Dict]) -> Dict[str, int]:
        """Count items by type"""
        counts = {}
        for item in items:
            data_type = item.get('category', 'unknown')
            counts[data_type] = counts.get(data_type, 0) + 1
        return counts
    
    async def _send_summary_report(self, summary: Dict):
        """Send summary report (email, Slack, etc.)"""
        # For now, just log it
        logger.info("\n📧 COLLECTION SUMMARY REPORT")
        logger.info(f"Date: {summary['date']}")
        logger.info(f"Items collected: {summary['collected']}")
        logger.info(f"Duration: {summary['duration']:.1f} seconds")
        logger.info(f"Errors: {summary['errors']}")
        logger.info(f"Breakdown: {summary['breakdown']}")
        
        # Could integrate with SendGrid, Slack, etc.
        if os.getenv('NOTIFICATION_WEBHOOK'):
            # Send to webhook
            pass

async def main():
    """Main entry point for Render cron job"""
    try:
        logger.info("🚀 Starting data collector initialization...")
        collector = AutonomousCollector()
        logger.info("✅ Data collector initialized successfully")
        
        await collector.run_monthly_collection()
        logger.info("✅ Collection completed successfully")
        
    except ValueError as e:
        logger.error(f"❌ Configuration error: {e}")
        logger.error("💡 Please check environment variables in Render dashboard")
        sys.exit(1)
    except ImportError as e:
        logger.error(f"❌ Import error: {e}")
        logger.error("💡 Please check requirements.txt dependencies")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        sys.exit(1)

if __name__ == "__main__":
    # Check if this is a health check
    if len(sys.argv) > 1 and sys.argv[1] == '--health':
        print("OK")
        sys.exit(0)
    
    # Run the collector
    asyncio.run(main())