#!/usr/bin/env python3
"""
Quick script to check Supabase results after data collector improvements
"""

import os
import asyncio
from supabase import create_client, Client
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def init_supabase() -> Client:
    """Initialize Supabase client"""
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')

    if not url or not key:
        print("❌ Missing Supabase credentials")
        print("Make sure SUPABASE_URL and SUPABASE_KEY are set in .env")
        return None

    return create_client(url, key)

async def check_collection_results():
    """Check the results of the improved data collector"""

    print("=" * 60)
    print("🔍 CHECKING DATA COLLECTOR RESULTS")
    print("=" * 60)

    supabase = init_supabase()
    if not supabase:
        return

    try:
        # 1. Get total count
        total_response = supabase.table('trip_templates').select('id', count='exact').execute()
        total_count = total_response.count if hasattr(total_response, 'count') else len(total_response.data)

        print(f"📊 Total trip templates: {total_count}")

        # 2. Check recent additions (last 24 hours)
        yesterday = (datetime.now() - timedelta(hours=24)).isoformat()
        recent_response = supabase.table('trip_templates')\
            .select('id, name, data_source, created_at')\
            .gte('created_at', yesterday)\
            .execute()

        recent_count = len(recent_response.data)
        print(f"🕐 Added in last 24 hours: {recent_count}")

        # 3. Data source breakdown
        all_response = supabase.table('trip_templates')\
            .select('data_source')\
            .execute()

        source_counts = {}
        for item in all_response.data:
            source = item.get('data_source', 'unknown')
            source_counts[source] = source_counts.get(source, 0) + 1

        print("\n📈 Data source breakdown:")
        for source, count in sorted(source_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"  {source}: {count} items")

        # 4. Show recent enhanced entries
        if recent_count > 0:
            print(f"\n🎯 Recent entries (last {min(recent_count, 10)}):")
            for i, item in enumerate(recent_response.data[:10]):
                name = item.get('name', 'Unnamed')[:40]
                source = item.get('data_source', 'unknown')
                created = item.get('created_at', '')[:16]
                print(f"  {i+1}. {name} ({source}) - {created}")

        # 5. Check for enhanced sources
        enhanced_sources = [source for source in source_counts.keys()
                          if 'enhanced' in source or 'openstreetmap' in source]

        if enhanced_sources:
            enhanced_total = sum(source_counts[source] for source in enhanced_sources)
            print(f"\n✅ Enhanced collection sources found: {enhanced_total} items")
            print("🎉 Data collector improvements are working!")
        else:
            print("\n⚠️ No enhanced sources found yet")
            print("💡 The improvements may not have run yet, or still processing")

        # 6. Success assessment
        print("\n" + "=" * 60)
        print("📊 IMPROVEMENT ASSESSMENT")
        print("=" * 60)

        if recent_count >= 50:
            print("🎉 EXCELLENT: Major improvement in collection rate!")
            print(f"   Collected {recent_count} items in 24 hours")
        elif recent_count >= 10:
            print("✅ GOOD: Significant improvement detected")
            print(f"   Collected {recent_count} items in 24 hours")
        elif recent_count > 0:
            print("🔄 PROGRESS: Some improvement, collection ongoing")
            print(f"   Collected {recent_count} items in 24 hours")
        else:
            print("⏳ PENDING: No recent items found")
            print("   Enhanced system may be deploying or scheduled to run")

        if total_count >= 500:
            print(f"🏆 DATABASE: Excellent total collection ({total_count} items)")
        elif total_count >= 100:
            print(f"📈 DATABASE: Good progress ({total_count} items)")
        else:
            print(f"🌱 DATABASE: Building up collection ({total_count} items)")

    except Exception as e:
        print(f"❌ Error checking results: {e}")
        print("💡 Make sure your Supabase credentials are correct")

if __name__ == "__main__":
    asyncio.run(check_collection_results())