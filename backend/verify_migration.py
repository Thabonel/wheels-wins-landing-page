#!/usr/bin/env python3
"""
Verify Vehicle Fuel Consumption Migration
Checks if all required columns exist in the vehicles table
"""

import os
import sys

# Check if supabase module is available
try:
    from supabase import create_client, Client
except ImportError:
    print("❌ supabase-py module not installed")
    print("Installing...")
    os.system("pip install supabase --quiet")
    from supabase import create_client, Client

# Get Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ydevatqwkoccxhtejdor.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    print("❌ SUPABASE_SERVICE_ROLE_KEY not found in environment")
    print("Please set SUPABASE_SERVICE_ROLE_KEY environment variable")
    sys.exit(1)

print("🔍 Verifying Vehicle Fuel Consumption Migration...\n")

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Check if vehicles table exists
try:
    result = supabase.table("vehicles").select("*").limit(0).execute()
    print("✅ vehicles table exists")
except Exception as e:
    print(f"❌ vehicles table not found: {e}")
    sys.exit(1)

# Check for fuel consumption columns by trying to select them
required_columns = [
    "fuel_consumption_mpg",
    "fuel_consumption_l_per_100km",
    "fuel_consumption_source",
    "fuel_consumption_last_updated",
    "fuel_consumption_sample_size"
]

print("\n📊 Checking fuel consumption columns:\n")

missing_columns = []
for column in required_columns:
    try:
        result = supabase.table("vehicles").select(column).limit(0).execute()
        print(f"   ✅ {column}")
    except Exception as e:
        print(f"   ❌ {column} - NOT FOUND")
        missing_columns.append(column)

# Summary
print("\n" + "="*60)
if missing_columns:
    print(f"❌ Migration INCOMPLETE - Missing {len(missing_columns)} columns:")
    for col in missing_columns:
        print(f"   - {col}")
    print("\n💡 Run the migration again:")
    print("   supabase/migrations/20251010000000-add-vehicle-fuel-consumption.sql")
    sys.exit(1)
else:
    print("✅ Migration SUCCESSFUL!")
    print(f"   All {len(required_columns)} fuel consumption columns present")
    print("\n🎉 Ready to test fuel consumption tracking!")
    print("\n📋 Next steps:")
    print("   1. Test Imperial: 'PAM, my truck uses 10 MPG'")
    print("   2. Test Metric: 'PAM, my truck uses 24 liters per 100km'")
    print("   3. Verify unit conversions work correctly")
    sys.exit(0)
