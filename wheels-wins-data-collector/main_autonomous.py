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
from services.database_state import DatabaseStateManager, clean_decimal_data
from services.monitoring import MonitoringService
from services.photo_scraper import add_photos_to_locations
from services.photo_storage import store_location_photos
from supabase import create_client, Client
from dotenv import load_dotenv
import sentry_sdk
from tenacity import retry, stop_after_attempt, wait_exponential
import time

# Load environment variables
load_dotenv()

# Initialize Sentry for error tracking (optional)
if os.getenv('SENTRY_DSN'):
    sentry_sdk.init(
        dsn=os.getenv('SENTRY_DSN'),
        traces_sample_rate=0.1
    )

# Ensure required directories exist BEFORE any file operations
logs_dir = Path('logs')
logs_dir.mkdir(parents=True, exist_ok=True)

data_dir = Path('data')
data_dir.mkdir(parents=True, exist_ok=True)

# Configure logging - now safe to create log file
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(str(logs_dir / 'autonomous_collector.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class AutonomousCollector:
    """Autonomous data collector that runs weekly on Render"""
    
    def __init__(self):
        self.supabase = self._init_supabase()
        self.state_manager = DatabaseStateManager(self.supabase)
        self.monitor = MonitoringService()
        self.weekly_target = 500  # Collect 500 items per week (target for Wheels & Wins)
        self.daily_target = 72   # If running daily: 500 ÷ 7 = ~72 per day
        
        # Initialize scrapers
        self.scrapers = {
            'camping': RealCampingScraperService(),
            'parks': RealParksScraperService(),
            'attractions': RealAttractionsScraperService()
        }
        
        # State will be loaded from database in initialize()
    
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
    
    async def initialize(self):
        """Initialize collector state from database"""
        try:
            self.state = await self.state_manager.initialize()
            logger.info(f"Initialized collector with {self.state['total_collected']} items collected")
        except Exception as e:
            logger.error(f"Failed to initialize state: {e}")
            raise
    
    async def run_weekly_collection(self):
        """Main collection routine - runs weekly via Render cron"""
        start_time = datetime.now()
        logger.info("=" * 60)
        logger.info("🚀 Starting Autonomous Weekly Collection")
        logger.info(f"Target: {self.weekly_target} new locations")
        logger.info(f"Total collected so far: {self.state['total_collected']}")
        
        collected_items = []
        errors = []
        sources_succeeded = []
        
        # Start a new run in database
        run_id = await self.state_manager.start_run('scheduled', self.weekly_target)
        
        try:
            # Get configuration from database
            config = self.state_manager.get_config()
            
            # Determine what to collect this week
            collection_plan = self._create_collection_plan()
            
            # Execute collection with retry logic
            for data_type, target_count in collection_plan.items():
                logger.info(f"\n📍 Collecting {target_count} {data_type} locations...")
                
                source_start = time.time()
                try:
                    items = await self._collect_with_retry(data_type, target_count)

                    if items:
                        # Add photos to items using existing photo infrastructure
                        logger.info(f"🖼️ Adding photos to {len(items)} {data_type} locations...")
                        items_with_photos = await add_photos_to_locations(items)
                        photos_stored = await store_location_photos(self.supabase, items_with_photos)

                        # Process and upload to database with deduplication
                        if config.get('enable_deduplication', True):
                            uploaded_count = await self._process_and_upload_dedupe(photos_stored, data_type)
                        else:
                            uploaded = await self._process_and_upload(photos_stored, data_type)
                            uploaded_count = len(uploaded)
                            collected_items.extend(uploaded)
                        
                        # Record metrics
                        duration = time.time() - source_start
                        quality_scores = [item.get('quality_score', 0.0) for item in items[:10]]
                        await self.state_manager.record_metric(
                            data_type, uploaded_count, duration, 
                            errors=[], quality_scores=quality_scores
                        )
                        
                        # Update source stats
                        await self.state_manager.update_source_stats(data_type, uploaded_count)
                        
                        sources_succeeded.append(data_type)
                        logger.info(f"✅ Successfully collected {uploaded_count} {data_type} locations")
                    
                except Exception as e:
                    error_msg = f"Error collecting {data_type}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    
                    # Record failed metric
                    duration = time.time() - source_start
                    await self.state_manager.record_metric(
                        data_type, 0, duration, errors=[error_msg]
                    )
                    
                # Rate limiting between types
                await asyncio.sleep(5)
            
            # Complete the run
            total_collected = len(collected_items) if collected_items else \
                             sum([collection_plan.get(s, 0) for s in sources_succeeded])
            await self.state_manager.complete_run(total_collected, sources_succeeded)
            
            # Get updated stats
            stats = await self.state_manager.get_collection_stats()
            
            # Send success notification
            duration = (datetime.now() - start_time).total_seconds()
            await self.monitor.send_success_notification(
                run_id=run_id,
                items_collected=total_collected,
                total_in_db=stats.get('total_locations', 0),
                duration_seconds=duration,
                sources_succeeded=sources_succeeded
            )
            
            # Check health metrics
            health = await self.monitor.check_health_metrics(self.state_manager)
            if health.get('warnings'):
                for warning in health['warnings']:
                    await self.monitor.send_warning_notification(
                        warning['type'],
                        warning
                    )
            
            # Performance analysis
            performance_pct = (total_collected / self.weekly_target) * 100
            status_emoji = "✅" if total_collected >= self.weekly_target else "⚠️" if total_collected >= 400 else "❌"

            logger.info("\n" + "=" * 60)
            logger.info(f"✅ Weekly collection complete!")
            logger.info(f"📊 Collected: {total_collected} new locations")
            logger.info(f"🎯 Target: {self.weekly_target} locations/week")
            logger.info(f"📈 Performance: {performance_pct:.1f}% of target {status_emoji}")
            logger.info(f"📈 Total in database: {stats.get('total_locations', 0)}")
            logger.info(f"✓ Verified locations: {stats.get('verified_locations', 0)}")

            # Add performance alert
            if total_collected < 400:
                logger.warning(f"🚨 PERFORMANCE ALERT: Only {total_collected}/500 target achieved ({performance_pct:.1f}%)")
                await self.monitor.send_warning_notification(
                    'performance_below_target',
                    {
                        'collected': total_collected,
                        'target': self.weekly_target,
                        'percentage': performance_pct,
                        'status': 'critical' if total_collected < 300 else 'warning'
                    }
                )

            logger.info("=" * 60)
            
        except Exception as e:
            logger.error(f"Critical error in collection: {e}")
            error_trace = traceback.format_exc()
            logger.error(error_trace)
            
            # Mark run as failed
            await self.state_manager.fail_run(str(e))
            
            # Send failure notification
            await self.monitor.send_failure_notification(
                run_id=run_id if 'run_id' in locals() else 'unknown',
                error_message=str(e),
                traceback_str=error_trace
            )
            
            if os.getenv('SENTRY_DSN'):
                sentry_sdk.capture_exception(e)
            raise
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def _collect_with_retry(self, data_type: str, target_count: int) -> List[Dict]:
        """Collect data with retry logic"""
        scraper = self.scrapers.get(data_type)
        if not scraper:
            logger.warning(f"No scraper available for {data_type}")
            return []
        
        try:
            items = await scraper.collect_all_countries(limit=target_count)
            return items
        except Exception as e:
            logger.error(f"Collection failed for {data_type}: {e}")
            raise
    
    def _create_collection_plan(self) -> Dict[str, int]:
        """Create collection plan based on progress and priorities"""
        total_collected = self.state['total_collected']
        target = self.weekly_target
        
        # Adaptive strategy based on total collected
        if total_collected < 1000:
            # Focus on camping first (high value content)
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
            # Focus on variety with rotating priority
            priority = self.state_manager.get_next_priority()
            base_per_type = int(target * 0.25)  # 25% each
            plan = {
                'camping': base_per_type,
                'parks': base_per_type,
                'attractions': base_per_type
            }
            # Boost priority type with remaining
            remaining = target - (base_per_type * 3)
            if priority in plan:
                plan[priority] += remaining
            
            return plan
    
    async def _process_and_upload(self, items: List[Dict], data_type: str) -> List[Dict]:
        """Process items and upload to Supabase (without deduplication)"""
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
                    # Clean decimal data from templates before upload
                    clean_templates = [clean_decimal_data(template) for template in templates]

                    # Upload to Supabase
                    result = self.supabase.table('trip_templates').insert(clean_templates).execute()
                    
                    if result.data:
                        uploaded.extend(result.data)
                        logger.info(f"Uploaded batch of {len(result.data)} items")
                    
                    # Rate limiting
                    await asyncio.sleep(1)
                    
            except Exception as e:
                logger.error(f"Error uploading batch: {e}")
                continue
        
        return uploaded
    
    async def _process_and_upload_dedupe(self, items: List[Dict], data_type: str) -> int:
        """Process items and upload with deduplication"""
        uploaded_count = 0
        
        # First, insert into trip_locations for deduplication
        location_ids = await self.state_manager.batch_insert_locations(items)
        
        # Process in batches for trip_templates
        batch_size = 50
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            
            try:
                # Transform to trip_templates format
                templates = []
                for item in batch:
                    # Check if location was inserted (not duplicate)
                    if await self._should_create_template(item):
                        template = self._transform_to_template(item, data_type)
                        if template:
                            templates.append(template)
                
                if templates:
                    # Clean decimal data from templates before upload
                    clean_templates = [clean_decimal_data(template) for template in templates]

                    # Upload to Supabase
                    result = self.supabase.table('trip_templates').insert(clean_templates).execute()
                    
                    if result.data:
                        uploaded_count += len(result.data)
                        logger.info(f"Uploaded batch of {len(result.data)} deduplicated items")
                    
                    # Rate limiting
                    await asyncio.sleep(1)
                    
            except Exception as e:
                logger.error(f"Error uploading batch: {e}")
                continue
        
        return uploaded_count
    
    async def _should_create_template(self, item: Dict) -> bool:
        """Check if we should create a template for this item"""
        # For now, create templates for all non-duplicate locations
        # In future, could add quality threshold checks here
        config = self.state_manager.get_config()
        quality_threshold = config.get('quality_threshold', 0.3)
        
        item_quality = item.get('quality_score', 0.5)
        return item_quality >= quality_threshold
    
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
            
            # Include photo URLs if available (JSONB array format)
            media_urls = []
            if item.get('photo_url') and item.get('photo_stored'):
                media_urls.append(item['photo_url'])

            template = {
                'user_id': None,  # System-generated template (NULL user_id)
                'title': item.get('name', 'Unnamed Location'),
                'description': item.get('description', '')[:500],
                'category': category_map.get(data_type, 'adventure'),
                'is_public': True,
                'tags': tags[:10],  # Limit tags
                'media_urls': media_urls,  # JSONB array of photo URLs
                'route_data': {
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
                    'price': item.get('price'),
                    'photo_metadata': {
                        'source': item.get('photo_source', 'none'),
                        'confidence': item.get('photo_confidence', 'none')
                    } if item.get('photo_url') else {}
                },
                'waypoints': [
                    {
                        'latitude': item.get('latitude'),
                        'longitude': item.get('longitude'),
                        'name': item.get('name', 'Location'),
                        'type': data_type
                    }
                ] if item.get('latitude') and item.get('longitude') else [],
                'duration_days': 1,  # Default single day trip
                'difficulty_level': 'moderate'
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

async def main():
    """Main entry point for Render cron job"""
    try:
        logger.info("🚀 Starting data collector initialization...")
        collector = AutonomousCollector()
        
        # Initialize state from database
        await collector.initialize()
        logger.info("✅ Data collector initialized successfully")
        
        # Run weekly collection
        await collector.run_weekly_collection()
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