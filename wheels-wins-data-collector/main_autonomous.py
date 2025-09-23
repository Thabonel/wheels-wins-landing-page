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
from services.enhanced_fallback_collector import EnhancedFallbackCollector
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

            # Enhanced debug logging for API keys
            self._log_api_key_status()

            # Determine what to collect this week
            collection_plan = self._create_collection_plan()
            logger.info(f"📋 Collection plan: {collection_plan}")
            
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
        """Enhanced collection with smart fallback system"""
        logger.info(f"🎯 Starting enhanced collection for {data_type} (target: {target_count})")

        # Try primary scrapers first
        scraper = self.scrapers.get(data_type)
        primary_items = []

        if scraper:
            try:
                primary_items = await scraper.collect_all_countries(limit=target_count)
                logger.info(f"✅ Primary scraper collected {len(primary_items)} {data_type} items")
            except Exception as e:
                logger.warning(f"⚠️ Primary scraper failed for {data_type}: {e}")

        # If primary collection is insufficient, use fallback system
        if len(primary_items) < target_count * 0.3:  # Less than 30% of target
            logger.info(f"🔄 Primary collection insufficient ({len(primary_items)}/{target_count}), engaging fallback system")

            fallback_collector = EnhancedFallbackCollector()
            remaining_target = target_count - len(primary_items)

            try:
                fallback_items = await fallback_collector.collect_with_fallbacks(data_type, remaining_target)
                logger.info(f"✅ Fallback system collected {len(fallback_items)} additional items")

                # Combine and deduplicate
                all_items = primary_items + fallback_items
                unique_items = self._enhanced_deduplicate(all_items)

                logger.info(f"🎉 Total collection: {len(unique_items)} unique items from {len(all_items)} collected")
                return unique_items[:target_count]

            except Exception as e:
                logger.error(f"❌ Fallback system also failed: {e}")
                # Return whatever we got from primary scraper
                return primary_items

        return primary_items

    def _enhanced_deduplicate(self, items: List[Dict]) -> List[Dict]:
        """Enhanced deduplication with relaxed distance threshold"""
        if not items:
            return items

        unique_items = []
        seen_locations = set()

        for item in items:
            lat = item.get('latitude')
            lng = item.get('longitude')

            if not lat or not lng:
                continue

            # Use 1km threshold instead of 100m (more relaxed for better collection)
            location_key = f"{round(lat, 2)},{round(lng, 2)}"

            if location_key not in seen_locations:
                seen_locations.add(location_key)
                unique_items.append(item)

        logger.info(f"Enhanced deduplication: {len(items)} -> {len(unique_items)} items (relaxed 1km threshold)")
        return unique_items

    def _log_api_key_status(self):
        """Log status of API keys for debugging"""
        logger.info("🔑 API Key Status Check:")

        api_keys = {
            'RECREATION_GOV_KEY': os.getenv('RECREATION_GOV_KEY'),
            'GOOGLE_PLACES_KEY': os.getenv('GOOGLE_PLACES_KEY'),
            'OPENWEATHER_API_KEY': os.getenv('OPENWEATHER_API_KEY'),
            'FOURSQUARE_API_KEY': os.getenv('FOURSQUARE_API_KEY'),
            'SUPABASE_URL': os.getenv('SUPABASE_URL'),
            'SUPABASE_KEY': os.getenv('SUPABASE_KEY')
        }

        for key_name, key_value in api_keys.items():
            if key_value:
                # Show first 4 and last 4 characters for security
                masked_key = f"{key_value[:4]}...{key_value[-4:]}" if len(key_value) > 8 else "***"
                logger.info(f"  ✅ {key_name}: {masked_key}")
            else:
                logger.warning(f"  ❌ {key_name}: NOT SET")

        # Log data source strategy based on available keys
        if api_keys['RECREATION_GOV_KEY']:
            logger.info("🎯 Primary Strategy: Recreation.gov API (US Federal Campgrounds)")
        elif api_keys['GOOGLE_PLACES_KEY']:
            logger.info("🎯 Primary Strategy: Google Places API (Global)")
        else:
            logger.info("🔄 Fallback Strategy: OpenStreetMap + Web Scraping (API-free)")

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
                'name': item.get('name', 'Unnamed Location'),  # Fixed: 'title' → 'name'
                'description': item.get('description', '')[:500],
                'category': category_map.get(data_type, 'adventure'),
                'template_type': 'system',  # Mark as system template
                'is_public': True,
                'is_featured': item.get('rating', 0) >= 4.0,  # Feature high-rated locations
                'tags': tags[:10],  # Limit tags
                'media_urls': media_urls,  # JSONB array of photo URLs
                'template_data': {  # Fixed: 'route_data' → 'template_data'
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
                'estimated_duration': self._estimate_duration(data_type, item),
                'difficulty_level': self._estimate_difficulty(data_type, item),
                'usage_count': 0
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

    def _estimate_duration(self, data_type: str, item: Dict) -> int:
        """Estimate trip duration in hours based on type and features"""
        base_durations = {
            'camping': 24,      # Full day/overnight
            'parks': 8,         # Day visit
            'attractions': 4,   # Half day
            'swimming': 3       # Few hours
        }

        base = base_durations.get(data_type, 6)

        # Adjust based on features
        if item.get('amenities', {}).get('overnight_camping'):
            base += 16  # Add overnight component
        if item.get('amenities', {}).get('hiking_trails'):
            base += 2   # Add hiking time
        if item.get('is_free'):
            base += 1   # Free spots often require more time to access

        return min(base, 72)  # Cap at 3 days

    def _estimate_difficulty(self, data_type: str, item: Dict) -> str:
        """Estimate difficulty level based on type and accessibility"""
        # Default difficulties by type
        defaults = {
            'camping': 'moderate',
            'parks': 'easy',
            'attractions': 'easy',
            'swimming': 'easy'
        }

        difficulty = defaults.get(data_type, 'easy')

        # Increase difficulty based on features
        if item.get('access_requirements') == '4wd_only':
            difficulty = 'hard'
        elif item.get('amenities', {}).get('remote_location'):
            difficulty = 'moderate' if difficulty == 'easy' else 'hard'
        elif not item.get('amenities', {}).get('facilities'):
            # No facilities = higher difficulty
            if difficulty == 'easy':
                difficulty = 'moderate'

        return difficulty

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