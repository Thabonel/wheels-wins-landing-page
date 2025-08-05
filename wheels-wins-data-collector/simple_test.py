#!/usr/bin/env python3
"""
Simple validation test - just check if the system can start and connect to Supabase
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
sys.path.append(str(Path(__file__).parent))

def test_simple():
    """Simple test to validate system setup"""
    print("🧪 Simple System Validation Test")
    print("=" * 40)
    
    # Check environment variables
    required_vars = ['SUPABASE_URL', 'SUPABASE_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing environment variables: {missing_vars}")
        return False
    
    print("✅ Environment variables loaded")
    
    # Test Supabase connection
    try:
        from supabase import create_client
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_KEY')
        
        supabase = create_client(url, key)
        
        # Simple test query
        result = supabase.table('trip_templates').select('id').limit(1).execute()
        print("✅ Supabase connection successful")
        print(f"📊 Found {len(result.data)} existing templates")
        
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False
    
    # Test scraper imports
    try:
        from scrapers.real_camping_scraper import RealCampingScraperService
        from scrapers.real_parks_scraper import RealParksScraperService  
        from scrapers.real_attractions_scraper import RealAttractionsScraperService
        print("✅ All scrapers import successfully")
        
    except Exception as e:
        print(f"❌ Scraper import failed: {e}")
        return False
    
    # Test main autonomous collector import
    try:
        from main_autonomous import AutonomousCollector
        collector = AutonomousCollector()
        print("✅ Autonomous collector initialized")
        print(f"📈 Current progress: {collector.progress['total_collected']} items")
        
    except Exception as e:
        print(f"❌ Autonomous collector failed: {e}")
        return False
    
    print("\n🎉 All validation tests passed!")
    print("✅ System is ready for Render deployment")
    return True

if __name__ == "__main__":
    success = test_simple()
    sys.exit(0 if success else 1)