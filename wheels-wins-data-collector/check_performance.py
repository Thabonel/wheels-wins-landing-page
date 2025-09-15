#!/usr/bin/env python3
"""
Performance Check Script for Wheels & Wins Data Collector
Checks if the scraper is meeting the 500 trips/week target
"""

import os
import sys
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
import logging

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PerformanceChecker:
    """Check scraper performance against 500/week target"""

    def __init__(self):
        self.supabase = self._init_supabase()
        self.weekly_target = 500

    def _init_supabase(self) -> Client:
        """Initialize Supabase client"""
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_KEY')

        if not url or not key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY environment variables")

        return create_client(url, key)

    async def check_weekly_performance(self) -> dict:
        """Check performance for the last 8 weeks"""
        logger.info("📊 Checking weekly scraper performance...")

        try:
            # Query weekly performance
            query = """
            SELECT
                DATE_TRUNC('week', created_at) as week_start,
                COUNT(*) as trips_created,
                COUNT(DISTINCT DATE(created_at)) as active_days,
                CASE
                    WHEN COUNT(*) >= 500 THEN '✅ Target Met'
                    WHEN COUNT(*) >= 400 THEN '⚠️ Close to Target'
                    ELSE '❌ Below Target'
                END as performance_status
            FROM trips
            WHERE created_at >= NOW() - INTERVAL '8 weeks'
            GROUP BY DATE_TRUNC('week', created_at)
            ORDER BY week_start DESC;
            """

            result = self.supabase.rpc('execute_sql', {'query': query}).execute()

            if result.data:
                performance_data = result.data

                logger.info("\n" + "=" * 80)
                logger.info("📈 WEEKLY PERFORMANCE REPORT")
                logger.info("=" * 80)
                logger.info(f"{'Week Start':<12} {'Trips':<8} {'Days Active':<12} {'Status':<20}")
                logger.info("-" * 80)

                total_weeks = len(performance_data)
                weeks_meeting_target = 0
                total_trips = 0

                for week in performance_data:
                    week_start = week.get('week_start', 'Unknown')[:10]
                    trips = week.get('trips_created', 0)
                    days = week.get('active_days', 0)
                    status = week.get('performance_status', 'Unknown')

                    logger.info(f"{week_start:<12} {trips:<8} {days:<12} {status:<20}")

                    total_trips += trips
                    if trips >= 500:
                        weeks_meeting_target += 1

                # Summary statistics
                avg_per_week = total_trips / total_weeks if total_weeks > 0 else 0
                success_rate = (weeks_meeting_target / total_weeks * 100) if total_weeks > 0 else 0

                logger.info("-" * 80)
                logger.info(f"📊 SUMMARY:")
                logger.info(f"   Target: {self.weekly_target} trips/week")
                logger.info(f"   Average: {avg_per_week:.1f} trips/week")
                logger.info(f"   Success Rate: {success_rate:.1f}% of weeks meeting target")
                logger.info(f"   Total Trips (8 weeks): {total_trips}")
                logger.info("=" * 80)

                return {
                    'weeks_data': performance_data,
                    'total_weeks': total_weeks,
                    'weeks_meeting_target': weeks_meeting_target,
                    'success_rate': success_rate,
                    'average_per_week': avg_per_week,
                    'total_trips': total_trips
                }

            else:
                logger.warning("⚠️ No performance data found")
                return {'error': 'No data found'}

        except Exception as e:
            logger.error(f"❌ Error checking performance: {e}")
            return {'error': str(e)}

    async def check_recent_activity(self) -> dict:
        """Check recent activity (last 7 days)"""
        logger.info("🔍 Checking recent scraper activity...")

        try:
            # Query recent activity
            query = """
            SELECT
                DATE(created_at) as date,
                COUNT(*) as trips_created,
                EXTRACT(DOW FROM created_at) as day_of_week,
                CASE EXTRACT(DOW FROM created_at)
                    WHEN 0 THEN 'Sunday'
                    WHEN 1 THEN 'Monday'
                    WHEN 2 THEN 'Tuesday'
                    WHEN 3 THEN 'Wednesday'
                    WHEN 4 THEN 'Thursday'
                    WHEN 5 THEN 'Friday'
                    WHEN 6 THEN 'Saturday'
                END as day_name
            FROM trips
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at), EXTRACT(DOW FROM created_at)
            ORDER BY date DESC;
            """

            result = self.supabase.rpc('execute_sql', {'query': query}).execute()

            if result.data:
                recent_data = result.data

                logger.info("\n📅 RECENT ACTIVITY (Last 7 days):")
                logger.info(f"{'Date':<12} {'Day':<10} {'Trips':<8}")
                logger.info("-" * 30)

                total_recent = 0
                for day in recent_data:
                    date = day.get('date', 'Unknown')
                    day_name = day.get('day_name', 'Unknown')
                    trips = day.get('trips_created', 0)
                    total_recent += trips
                    logger.info(f"{date:<12} {day_name:<10} {trips:<8}")

                logger.info("-" * 30)
                logger.info(f"Total (7 days): {total_recent}")
                logger.info(f"Daily Average: {total_recent / 7:.1f}")

                # Check if scraper is active
                if total_recent == 0:
                    logger.error("🚨 CRITICAL: No trips created in last 7 days - scraper appears INACTIVE")
                elif total_recent < 300:  # Less than 60% of weekly target
                    logger.warning(f"⚠️ WARNING: Only {total_recent} trips in last 7 days (target: ~500/week)")
                else:
                    logger.info(f"✅ GOOD: {total_recent} trips in last 7 days")

                return {
                    'recent_data': recent_data,
                    'total_recent': total_recent,
                    'daily_average': total_recent / 7
                }

            else:
                logger.error("🚨 CRITICAL: No recent activity found - scraper appears INACTIVE")
                return {'error': 'No recent activity', 'total_recent': 0}

        except Exception as e:
            logger.error(f"❌ Error checking recent activity: {e}")
            return {'error': str(e)}

    async def get_health_status(self) -> dict:
        """Get overall health status"""
        logger.info("🏥 Checking overall scraper health...")

        try:
            # Get total trips and date range
            query = """
            SELECT
                COUNT(*) as total_trips,
                MIN(created_at) as oldest_trip,
                MAX(created_at) as newest_trip,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as trips_last_24h
            FROM trips;
            """

            result = self.supabase.rpc('execute_sql', {'query': query}).execute()

            if result.data and len(result.data) > 0:
                data = result.data[0]
                total_trips = data.get('total_trips', 0)
                oldest = data.get('oldest_trip', 'Unknown')
                newest = data.get('newest_trip', 'Unknown')
                last_24h = data.get('trips_last_24h', 0)

                logger.info(f"\n🏥 HEALTH STATUS:")
                logger.info(f"   Total trips in database: {total_trips}")
                logger.info(f"   Oldest trip: {oldest}")
                logger.info(f"   Newest trip: {newest}")
                logger.info(f"   Last 24 hours: {last_24h} trips")

                # Determine health status
                if newest:
                    newest_date = datetime.fromisoformat(newest.replace('Z', '+00:00'))
                    days_since_last = (datetime.now().replace(tzinfo=newest_date.tzinfo) - newest_date).days

                    if days_since_last == 0:
                        health = "EXCELLENT"
                        emoji = "🟢"
                    elif days_since_last <= 2:
                        health = "GOOD"
                        emoji = "🟡"
                    elif days_since_last <= 7:
                        health = "WARNING"
                        emoji = "🟠"
                    else:
                        health = "CRITICAL"
                        emoji = "🔴"

                    logger.info(f"   Health Status: {emoji} {health}")
                    logger.info(f"   Days since last trip: {days_since_last}")

                return {
                    'total_trips': total_trips,
                    'oldest_trip': oldest,
                    'newest_trip': newest,
                    'last_24h': last_24h,
                    'health': health if newest else 'CRITICAL',
                    'days_since_last': days_since_last if newest else 999
                }

            else:
                logger.error("🚨 CRITICAL: No trips found in database")
                return {'error': 'No trips in database', 'health': 'CRITICAL'}

        except Exception as e:
            logger.error(f"❌ Error checking health: {e}")
            return {'error': str(e), 'health': 'ERROR'}

async def main():
    """Main performance check"""
    try:
        checker = PerformanceChecker()

        logger.info("🚀 Starting Wheels & Wins Scraper Performance Check")
        logger.info(f"Target: {checker.weekly_target} trips per week")

        # Check overall health
        health = await checker.get_health_status()

        # Check recent activity
        recent = await checker.check_recent_activity()

        # Check weekly performance
        weekly = await checker.check_weekly_performance()

        # Overall assessment
        logger.info("\n" + "=" * 80)
        logger.info("🎯 OVERALL ASSESSMENT")
        logger.info("=" * 80)

        if health.get('health') == 'CRITICAL':
            logger.error("🔴 CRITICAL: Scraper is not functioning - immediate attention required")
            logger.error("   1. Check Render cron job configuration")
            logger.error("   2. Verify environment variables")
            logger.error("   3. Check service logs for errors")
        elif recent.get('total_recent', 0) == 0:
            logger.error("🔴 CRITICAL: No activity in last 7 days - scraper appears down")
            logger.error("   1. Trigger manual run in Render dashboard")
            logger.error("   2. Check cron schedule (should be weekly or daily)")
        elif weekly.get('success_rate', 0) < 50:
            logger.warning("🟡 WARNING: Consistently missing 500/week target")
            logger.warning("   1. Consider switching to daily collection")
            logger.warning("   2. Optimize collection algorithms")
            logger.warning("   3. Add more data sources")
        else:
            logger.info("🟢 GOOD: Scraper is functioning within acceptable parameters")

        logger.info("=" * 80)

    except Exception as e:
        logger.error(f"❌ Performance check failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())