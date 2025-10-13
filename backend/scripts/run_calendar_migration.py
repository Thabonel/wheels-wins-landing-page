#!/usr/bin/env python3
"""
Run calendar events migration to add missing columns.
"""
import os
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

MIGRATION_SQL = """
ALTER TABLE public.calendar_events
ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER,
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

CREATE INDEX IF NOT EXISTS idx_calendar_events_all_day ON public.calendar_events(all_day);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON public.calendar_events(user_id, date);
"""

def main():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        sys.exit(1)

    print(f"Connecting to Supabase at {supabase_url}...")
    supabase = create_client(supabase_url, supabase_key)

    print("Running migration to add calendar_events columns...")
    print("-" * 50)
    print(MIGRATION_SQL)
    print("-" * 50)

    try:
        result = supabase.rpc("exec_sql", {"query": MIGRATION_SQL}).execute()
        print("✅ Migration completed successfully!")
        print(f"Result: {result}")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        print("\nYou can run this SQL manually in the Supabase dashboard:")
        print(MIGRATION_SQL)
        sys.exit(1)

if __name__ == "__main__":
    main()
