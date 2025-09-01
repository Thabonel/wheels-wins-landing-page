#!/usr/bin/env python3
"""
Test script for the data collector
Run this locally to verify everything works before deploying
"""

import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime
import logging

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from main_autonomous import AutonomousCollector
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_database_connection():
    """Test database connection and table access"""
    logger.info("Testing database connection...")
    
    try:
        collector = AutonomousCollector()
        await collector.initialize()
        
        # Check state
        if collector.state:
            logger.info(f"✅ Database connected. Total collected: {collector.state['total_collected']}")
            return True
        else:
            logger.error("❌ Failed to load state from database")
            return False
            
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False


async def test_small_collection():
    """Test collecting a small batch of data"""
    logger.info("\nTesting small data collection (10 items)...")
    
    try:
        collector = AutonomousCollector()
        await collector.initialize()
        
        # Override target for testing
        collector.weekly_target = 10
        
        # Start a test run
        run_id = await collector.state_manager.start_run('test', 10)
        logger.info(f"Started test run: {run_id}")
        
        # Collect a small batch
        from scrapers.real_camping_scraper import RealCampingScraperService
        
        async with RealCampingScraperService() as scraper:
            items = await scraper.collect_all_countries(limit=10)
            
            if items:
                logger.info(f"✅ Collected {len(items)} test items")
                
                # Test deduplication
                inserted = await collector.state_manager.batch_insert_locations(items[:5])
                logger.info(f"✅ Inserted {inserted} locations (with deduplication)")
                
                # Complete run
                await collector.state_manager.complete_run(inserted, ['test'])
                
                return True
            else:
                logger.error("❌ No items collected")
                return False
                
    except Exception as e:
        logger.error(f"❌ Collection test failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


async def test_monitoring():
    """Test monitoring and health checks"""
    logger.info("\nTesting monitoring service...")
    
    try:
        from services.monitoring import MonitoringService
        from services.database_state import DatabaseStateManager
        from supabase import create_client
        
        # Initialize services
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_KEY')
        supabase = create_client(url, key)
        
        state_manager = DatabaseStateManager(supabase)
        await state_manager.initialize()
        
        monitor = MonitoringService()
        
        # Check health
        health = await monitor.check_health_metrics(state_manager)
        
        logger.info(f"Health check results:")
        logger.info(f"  • Total locations: {health.get('total_locations', 0)}")
        logger.info(f"  • Verified: {health.get('verified_locations', 0)}")
        logger.info(f"  • Warnings: {len(health.get('warnings', []))}")
        
        for warning in health.get('warnings', []):
            logger.warning(f"  ⚠️ {warning['message']}")
        
        # Create performance report
        stats = await state_manager.get_collection_stats()
        report = monitor.create_performance_report(stats)
        logger.info("\n" + report)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Monitoring test failed: {e}")
        return False


async def main():
    """Run all tests"""
    logger.info("=" * 60)
    logger.info("🧪 Data Collector Test Suite")
    logger.info("=" * 60)
    
    tests_passed = []
    
    # Test 1: Database connection
    result = await test_database_connection()
    tests_passed.append(('Database Connection', result))
    
    # Test 2: Small collection
    if result:  # Only if database works
        result = await test_small_collection()
        tests_passed.append(('Small Collection', result))
    
    # Test 3: Monitoring
    result = await test_monitoring()
    tests_passed.append(('Monitoring Service', result))
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("📊 Test Results:")
    for test_name, passed in tests_passed:
        icon = "✅" if passed else "❌"
        logger.info(f"  {icon} {test_name}")
    
    total_passed = sum(1 for _, p in tests_passed if p)
    logger.info(f"\nTotal: {total_passed}/{len(tests_passed)} tests passed")
    
    if total_passed == len(tests_passed):
        logger.info("✨ All tests passed! Ready for deployment.")
        return 0
    else:
        logger.error("❌ Some tests failed. Please fix issues before deploying.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)