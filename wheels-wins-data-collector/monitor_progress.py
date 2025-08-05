#!/usr/bin/env python3
"""
Monitor the autonomous data collector progress
Run this script to check if the collector is working
"""

import os
import json
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

def check_collector_progress():
    """Check the progress of the autonomous collector"""
    print("🔍 Checking Autonomous Collector Progress")
    print("=" * 50)
    
    # 1. Check Supabase connection and data
    try:
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_KEY')
        
        if not url or not key:
            print("❌ Missing Supabase credentials")
            return
            
        supabase = create_client(url, key)
        
        # Get total templates
        total_result = supabase.table('trip_templates').select('id', count='exact').execute()
        total_count = total_result.count
        
        # Get recent templates (last 30 days)
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        recent_result = supabase.table('trip_templates').select('id', count='exact').gte('created_at', thirty_days_ago).execute()
        recent_count = recent_result.count
        
        print(f"📊 **Supabase Data:**")
        print(f"   Total templates: {total_count}")
        print(f"   Added last 30 days: {recent_count}")
        print(f"   Target: 5000+ templates")
        print(f"   Progress: {(total_count/5000)*100:.1f}%")
        
        # Check data sources
        try:
            sources_result = supabase.rpc('get_template_sources').execute()
            if sources_result.data:
                print(f"\n📍 **Data Sources:**")
                for source in sources_result.data[:5]:  # Top 5 sources
                    source_name = source.get('source', 'unknown')
                    count = source.get('count', 0)
                    print(f"   {source_name}: {count} templates")
        except:
            # If RPC doesn't exist, get basic info
            sample_result = supabase.table('trip_templates').select('template_data').limit(10).execute()
            sources = set()
            for template in sample_result.data:
                source = template.get('template_data', {}).get('source')
                if source:
                    sources.add(source)
            print(f"\n📍 **Active Data Sources:** {', '.join(sources) if sources else 'None detected'}")
        
    except Exception as e:
        print(f"❌ Supabase check failed: {e}")
        return
    
    # 2. Check local progress file (if exists)
    progress_file = Path('data/collection_progress.json')
    if progress_file.exists():
        try:
            with open(progress_file, 'r') as f:
                progress = json.load(f)
            
            print(f"\n📈 **Collection Progress:**")
            print(f"   Total collected: {progress.get('total_collected', 0)}")
            print(f"   Last run: {progress.get('last_run', 'Never')}")
            print(f"   Next priority: {progress.get('next_priority', 'camping')}")
            
            # Show recent collection history
            history = progress.get('collection_history', [])
            if history:
                print(f"\n📅 **Recent Collections:**")
                for run in history[-3:]:  # Last 3 runs
                    date = run.get('date', 'Unknown')[:10]  # Just date part
                    collected = run.get('collected', 0)
                    duration = run.get('duration', 0)
                    print(f"   {date}: {collected} items in {duration:.0f}s")
            
        except Exception as e:
            print(f"⚠️  Could not read progress file: {e}")
    else:
        print(f"\n📁 **Progress File:** Not found (normal for remote execution)")
    
    # 3. Next run prediction
    now = datetime.now()
    if now.day >= 1:
        # Next run is next month
        next_month = now.replace(month=now.month+1 if now.month < 12 else 1, 
                                year=now.year if now.month < 12 else now.year+1,
                                day=1, hour=2, minute=0, second=0, microsecond=0)
    else:
        # Next run is this month
        next_month = now.replace(day=1, hour=2, minute=0, second=0, microsecond=0)
    
    days_until = (next_month - now).days
    print(f"\n⏰ **Next Collection:**")
    print(f"   Date: {next_month.strftime('%B 1, %Y at 2:00 AM UTC')}")
    print(f"   Days until: {days_until}")
    
    # 4. Health assessment
    print(f"\n🏥 **System Health:**")
    
    if total_count == 0:
        print("   ⚠️  No data collected yet - wait for first run")
        health = "WAITING"
    elif recent_count > 0:
        print("   ✅ System is actively collecting data")
        health = "HEALTHY"
    elif total_count > 0 and recent_count == 0:
        print("   ⚠️  No recent collections - check Render logs")
        health = "CHECK_LOGS"
    else:
        print("   ❓ Status unclear - manual check needed")
        health = "UNCLEAR"
    
    print(f"\n🎯 **Summary:**")
    print(f"   Status: {health}")
    print(f"   Progress: {total_count}/5000 locations ({(total_count/5000)*100:.1f}%)")
    print(f"   Next milestone: {1000 - (total_count % 1000)} locations to next 1000")
    
    if health == "CHECK_LOGS":
        print(f"\n🔧 **Next Steps:**")
        print(f"   1. Check Render dashboard logs")
        print(f"   2. Verify environment variables are set")
        print(f"   3. Check for any API key issues")

if __name__ == "__main__":
    check_collector_progress()