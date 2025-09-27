#!/usr/bin/env python3
"""
Quick script to check database status for data collection
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add wheel collector path
sys.path.append(str(Path(__file__).parent / 'wheels-wins-data-collector'))

try:
    from supabase import create_client, Client
    from dotenv import load_dotenv

    # Try to load from multiple locations
    env_files = [
        '.env',
        'backend/.env',
        'wheels-wins-data-collector/.env'
    ]

    for env_file in env_files:
        if os.path.exists(env_file):
            load_dotenv(env_file)
            print(f"Loading environment from: {env_file}")
            break

    # Check for environment variables
    supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')

    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase credentials")
        print(f"URL: {'Found' if supabase_url else 'Missing'}")
        print(f"Key: {'Found' if supabase_key else 'Missing'}")

        # Try to read from backend config files
        backend_env = Path('backend/.env')
        if backend_env.exists():
            with open(backend_env, 'r') as f:
                content = f.read()
                if 'your-project.supabase.co' in content:
                    print("⚠️ Backend .env file contains placeholder values")
                else:
                    print("📋 Backend .env file exists but may have real values")

        sys.exit(1)

    # Initialize Supabase client
    print(f"🔗 Connecting to Supabase...")
    supabase: Client = create_client(supabase_url, supabase_key)

    # Query database status
    print("📊 Checking database status...")

    # Check trip_locations
    try:
        locations_result = supabase.table('trip_locations').select('*', count='exact').limit(1).execute()
        total_locations = locations_result.count

        # Check recent additions (last 24 hours)
        yesterday = (datetime.now() - timedelta(days=1)).isoformat()
        recent_result = supabase.table('trip_locations')\
            .select('*', count='exact')\
            .gte('created_at', yesterday)\
            .limit(1)\
            .execute()
        recent_locations = recent_result.count

        print(f"📍 Trip Locations:")
        print(f"   Total: {total_locations:,}")
        print(f"   Added in last 24h: {recent_locations:,}")

        # Get latest entry
        if total_locations > 0:
            latest = supabase.table('trip_locations')\
                .select('created_at, name, data_source')\
                .order('created_at', desc=True)\
                .limit(1)\
                .execute()

            if latest.data:
                entry = latest.data[0]
                print(f"   Latest entry: {entry['name']} ({entry['data_source']}) at {entry['created_at']}")

    except Exception as e:
        print(f"❌ Error checking trip_locations: {e}")

    # Check trip_templates
    try:
        templates_result = supabase.table('trip_templates').select('*', count='exact').limit(1).execute()
        total_templates = templates_result.count

        recent_templates = supabase.table('trip_templates')\
            .select('*', count='exact')\
            .gte('created_at', yesterday)\
            .limit(1)\
            .execute()
        recent_template_count = recent_templates.count

        print(f"🎯 Trip Templates:")
        print(f"   Total: {total_templates:,}")
        print(f"   Added in last 24h: {recent_template_count:,}")

    except Exception as e:
        print(f"❌ Error checking trip_templates: {e}")

    # Check data collector state if table exists
    try:
        collector_result = supabase.table('data_collector_state').select('*').execute()
        if collector_result.data:
            state = collector_result.data[0] if collector_result.data else {}
            print(f"🤖 Data Collector State:")
            print(f"   Total collected: {state.get('total_collected', 'N/A')}")
            print(f"   Last run: {state.get('last_run', 'N/A')}")
            print(f"   Next priority: {state.get('next_priority', 'N/A')}")

    except Exception as e:
        print(f"⚠️ Data collector state table not accessible: {e}")

    # Check recent runs
    try:
        runs_result = supabase.table('data_collector_runs')\
            .select('*')\
            .order('started_at', desc=True)\
            .limit(5)\
            .execute()

        if runs_result.data:
            print(f"🏃 Recent Collection Runs:")
            for run in runs_result.data:
                print(f"   {run['started_at']}: {run['status']} - {run.get('actual_count', 0)} items")

    except Exception as e:
        print(f"⚠️ Collection runs not accessible: {e}")

    print("✅ Database check complete!")

except ImportError as e:
    print(f"❌ Missing dependencies: {e}")
    print("Install with: pip install supabase python-dotenv")
except Exception as e:
    print(f"❌ Error: {e}")