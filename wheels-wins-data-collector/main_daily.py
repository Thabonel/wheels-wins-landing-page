#!/usr/bin/env python3
"""
Daily Data Collection System for Render Cron Job
Collects ~72 travel locations daily to reach 500/week target
"""

import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime
import logging
from typing import List, Dict, Optional

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from main_autonomous import AutonomousCollector

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DailyCollector(AutonomousCollector):
    """Daily collector that runs 7 times per week to reach 500/week target"""

    def __init__(self):
        super().__init__()
        self.daily_target = 72  # 500 ÷ 7 = ~72 per day

    async def run_daily_collection(self):
        """Main collection routine - runs daily via Render cron"""
        start_time = datetime.now()
        logger.info("=" * 60)
        logger.info("🌅 Starting Autonomous Daily Collection")
        logger.info(f"Target: {self.daily_target} new locations today")
        logger.info(f"Weekly target: {self.weekly_target} locations")
        logger.info(f"Total collected so far: {self.state['total_collected']}")

        collected_items = []
        errors = []
        sources_succeeded = []

        # Start a new run in database
        run_id = await self.state_manager.start_run('daily_scheduled', self.daily_target)

        try:
            # Get configuration from database
            config = self.state_manager.get_config()

            # Determine what to collect today (smaller portions)
            collection_plan = self._create_daily_collection_plan()

            # Execute collection with retry logic
            for data_type, target_count in collection_plan.items():
                if target_count <= 0:
                    continue

                logger.info(f"\n📍 Collecting {target_count} {data_type} locations...")

                source_start = time.time()
                try:
                    items = await self._collect_with_retry(data_type, target_count)

                    if items:
                        # Process and upload to database with deduplication
                        if config.get('enable_deduplication', True):
                            uploaded_count = await self._process_and_upload_dedupe(items, data_type)
                        else:
                            uploaded = await self._process_and_upload(items, data_type)
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
                await asyncio.sleep(2)

            # Complete the run
            total_collected = len(collected_items) if collected_items else \
                             sum([collection_plan.get(s, 0) for s in sources_succeeded])
            await self.state_manager.complete_run(total_collected, sources_succeeded)

            # Get updated stats
            stats = await self.state_manager.get_collection_stats()

            # Performance analysis
            performance_pct = (total_collected / self.daily_target) * 100
            status_emoji = "✅" if total_collected >= self.daily_target else "⚠️" if total_collected >= 50 else "❌"

            logger.info("\n" + "=" * 60)
            logger.info(f"✅ Daily collection complete!")
            logger.info(f"📊 Collected: {total_collected} new locations")
            logger.info(f"🎯 Daily target: {self.daily_target} locations")
            logger.info(f"📈 Performance: {performance_pct:.1f}% of daily target {status_emoji}")
            logger.info(f"📈 Total in database: {stats.get('total_locations', 0)}")

            # Weekly projection
            weekly_projection = total_collected * 7
            weekly_performance = (weekly_projection / self.weekly_target) * 100
            logger.info(f"📅 Weekly projection: {weekly_projection} locations ({weekly_performance:.1f}% of 500/week target)")

            # Add performance alert for daily targets
            if total_collected < 50:  # Less than 70% of daily target
                logger.warning(f"🚨 DAILY PERFORMANCE ALERT: Only {total_collected}/{self.daily_target} target achieved ({performance_pct:.1f}%)")

            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"Critical error in daily collection: {e}")
            import traceback
            error_trace = traceback.format_exc()
            logger.error(error_trace)

            # Mark run as failed
            await self.state_manager.fail_run(str(e))
            raise

    def _create_daily_collection_plan(self) -> Dict[str, int]:
        """Create daily collection plan (smaller portions of weekly plan)"""
        import time
        from datetime import datetime

        total_collected = self.state['total_collected']
        target = self.daily_target

        # Use day of week to vary collection focus
        day_of_week = datetime.now().weekday()  # 0=Monday, 6=Sunday

        if total_collected < 1000:
            # Focus on camping first (high value content)
            if day_of_week in [0, 1, 2]:  # Mon, Tue, Wed - Heavy camping
                return {
                    'camping': int(target * 0.8),   # 80%
                    'parks': int(target * 0.15),    # 15%
                    'attractions': int(target * 0.05) # 5%
                }
            elif day_of_week in [3, 4]:  # Thu, Fri - Balanced
                return {
                    'camping': int(target * 0.6),     # 60%
                    'parks': int(target * 0.25),      # 25%
                    'attractions': int(target * 0.15) # 15%
                }
            else:  # Sat, Sun - Attractions focus
                return {
                    'camping': int(target * 0.4),     # 40%
                    'parks': int(target * 0.3),       # 30%
                    'attractions': int(target * 0.3)  # 30%
                }
        else:
            # Balanced collection with daily rotation
            base_per_type = int(target / 3)  # ~24 each
            plan = {
                'camping': base_per_type,
                'parks': base_per_type,
                'attractions': base_per_type
            }

            # Boost one type based on day of week
            remaining = target - (base_per_type * 3)
            if day_of_week % 3 == 0:
                plan['camping'] += remaining
            elif day_of_week % 3 == 1:
                plan['parks'] += remaining
            else:
                plan['attractions'] += remaining

            return plan

async def main():
    """Main entry point for daily collection"""
    try:
        logger.info("🌅 Starting daily data collector initialization...")
        collector = DailyCollector()

        # Initialize state from database
        await collector.initialize()
        logger.info("✅ Daily data collector initialized successfully")

        # Run daily collection
        await collector.run_daily_collection()
        logger.info("✅ Daily collection completed successfully")

    except Exception as e:
        logger.error(f"❌ Fatal error in daily collection: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        sys.exit(1)

if __name__ == "__main__":
    # Check if this is a health check
    if len(sys.argv) > 1 and sys.argv[1] == '--health':
        print("OK")
        sys.exit(0)

    # Run the daily collector
    asyncio.run(main())