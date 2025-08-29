#!/usr/bin/env python3
"""
Test the autonomous collector locally before Render deployment
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from main_autonomous import AutonomousCollector

async def test_collector():
    """Test the autonomous collector with limited data"""
    print("🧪 Testing Autonomous Collector Locally")
    print("=" * 60)
    
    # Check environment variables
    required_vars = ['SUPABASE_URL', 'SUPABASE_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing environment variables: {missing_vars}")
        print("Please set these in your .env file")
        return
    
    print("✅ Environment variables loaded")
    
    # Create test instance
    collector = AutonomousCollector()
    
    # Override targets for faster testing
    collector.monthly_target = 10  # Just collect 10 items for test
    
    # Override scrapers' targets for faster testing
    for scraper in collector.scrapers.values():
        scraper.target_per_source = 3  # Only 3 items per source
    
    print(f"📊 Current progress: {collector.progress['total_collected']} items collected")
    print(f"🎯 Test target: {collector.monthly_target} items")
    
    # Run test collection
    try:
        await collector.run_monthly_collection()
        print("\n✅ Test completed successfully!")
        print(f"📈 New total: {collector.progress['total_collected']} items")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_collector())