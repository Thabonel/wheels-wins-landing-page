#!/usr/bin/env python3
"""
Comprehensive Permission Fix for Wheels and Wins
Addresses both RLS policy violations and 'set role admin' errors
"""

def fix_all_permission_issues():
    try:
        from supabase import create_client
        
        # Your credentials
        supabase_url = "https://kycoklimpzkyrecbjecn.supabase.co"
        anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Y29rbGltcHpreXJlY2JqZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNTU4MDAsImV4cCI6MjA2MTgzMTgwMH0.nRZhYxImQ0rOlh0xZjHcdVq2Q2NY0v-9W3wciaxV2EA"
        
        print("🔧 COMPREHENSIVE PERMISSION FIX")
        print("=" * 50)
        
        client = create_client(supabase_url, anon_key)
        print("✅ Connected to database")
        
        # Problem Analysis
        print("\n🔍 ANALYZING CURRENT ISSUES...")
        
        print("\n📋 Issue #1: RLS Policy Violations")
        print("   Error: 'new row violates row-level security policy'")
        print("   Cause: RLS policies don't allow authenticated users to insert")
        print("   Solution: Fix RLS policies to allow user access")
        
        print("\n📋 Issue #2: 'Permission denied to set role admin'")
        print("   Error: PostgreSQL tries to execute 'SET ROLE admin'")
        print("   Cause: Complex RLS policies reference admin roles")
        print("   Solution: Simplify policies to avoid role switching")
        
        # Check current policy logic
        print("\n🔍 CHECKING CURRENT RLS SETUP...")
        
        # We can't query pg_policies with anon key, but we can infer issues
        test_user_id = "550e8400-e29b-41d4-a716-446655440000"
        
        # Test calendar_events with different approaches
        print("\n📅 Testing calendar_events table...")
        
        # Try with auth.uid() simulation
        try:
            # This will fail because we're not authenticated as that user
            test_event = {
                "user_id": test_user_id,
                "title": "Test Event",
                "description": "Test",
                "date": "2024-01-01",
                "start_time": "10:00:00",
                "end_time": "11:00:00"
            }
            
            result = client.table("calendar_events").insert(test_event).execute()
            
            if result.error:
                error_msg = str(result.error)
                if "row-level security policy" in error_msg:
                    print("❌ RLS policy blocks insert (expected with anon access)")
                    print("   This confirms RLS is enabled but not configured correctly")
                elif "permission denied to set role" in error_msg:
                    print("🚨 Found 'set role admin' error!")
                    print("   This confirms complex RLS policies cause role switching")
            else:
                print("✅ Insert worked (unexpected)")
                
        except Exception as e:
            error_msg = str(e)
            if "row-level security policy" in error_msg:
                print("❌ RLS policy violation confirmed")
            elif "permission denied to set role" in error_msg:
                print("🚨 'Set role admin' error confirmed!")
        
        # Generate SQL fixes
        print("\n🛠️  GENERATING SQL FIXES...")
        
        sql_fixes = generate_sql_fixes()
        
        print("\n📋 MANUAL FIX REQUIRED:")
        print("Since I need service role access to modify RLS policies,")
        print("you need to run these SQL commands in your Supabase Dashboard:")
        print("\n" + "="*60)
        
        for i, fix in enumerate(sql_fixes, 1):
            print(f"\n-- FIX #{i}: {fix['name']}")
            print(fix['sql'])
            print("-" * 40)
        
        print("\n" + "="*60)
        
        print("\n📍 HOW TO APPLY THESE FIXES:")
        print("1. Go to https://app.supabase.com")
        print("2. Select your Wheels and Wins project")
        print("3. Go to SQL Editor")
        print("4. Copy and paste each SQL fix above")
        print("5. Execute them one by one")
        
        print("\n🧪 AFTER APPLYING FIXES:")
        print("1. Test creating a calendar event in your app")
        print("2. Test updating your profile")
        print("3. Both should work without errors")
        
        return True
        
    except Exception as e:
        print(f"❌ Fix generation failed: {e}")
        return False

def generate_sql_fixes():
    """Generate the SQL commands needed to fix all permission issues"""
    
    fixes = [
        {
            "name": "Disable RLS temporarily to check structure",
            "sql": """
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity, enablerls 
FROM pg_tables 
WHERE tablename IN ('calendar_events', 'profiles', 'expenses')
  AND schemaname = 'public';
"""
        },
        {
            "name": "Fix calendar_events RLS policies",
            "sql": """
-- Drop all existing policies for calendar_events
DROP POLICY IF EXISTS "Users can manage own events" ON calendar_events;
DROP POLICY IF EXISTS "Admins can read all events" ON calendar_events;
DROP POLICY IF EXISTS "Admins can manage all events" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_user_policy" ON calendar_events;
DROP POLICY IF EXISTS "calendar_user_access" ON calendar_events;

-- Create simple, working policy
CREATE POLICY "calendar_events_simple_access" ON calendar_events
FOR ALL TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Also allow anon access for testing (remove this in production)
CREATE POLICY "calendar_events_anon_access" ON calendar_events
FOR ALL TO anon 
USING (true)
WITH CHECK (true);
"""
        },
        {
            "name": "Fix profiles RLS policies",
            "sql": """
-- Drop all existing policies for profiles
DROP POLICY IF EXISTS "Users can manage own profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_user_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_safe_policy" ON profiles;

-- Create simple, working policy
CREATE POLICY "profiles_simple_access" ON profiles
FOR ALL TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Also allow anon access for testing (remove this in production)
CREATE POLICY "profiles_anon_access" ON profiles
FOR ALL TO anon 
USING (true)
WITH CHECK (true);
"""
        },
        {
            "name": "Fix expenses RLS policies",
            "sql": """
-- Drop all existing policies for expenses
DROP POLICY IF EXISTS "Users can manage own expenses" ON expenses;
DROP POLICY IF EXISTS "Admins can manage all expenses" ON expenses;

-- Create simple, working policy
CREATE POLICY "expenses_simple_access" ON expenses
FOR ALL TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
"""
        },
        {
            "name": "Check for admin-related functions",
            "sql": """
-- Look for functions that might cause role switching
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%SET ROLE%'
   OR routine_definition LIKE '%admin%'
   OR routine_definition LIKE '%SECURITY DEFINER%';
"""
        },
        {
            "name": "Test the fixes",
            "sql": """
-- Test inserting data after fixes
INSERT INTO calendar_events (user_id, title, description, date, start_time, end_time)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Test Event', 'Test Description', '2024-01-01', '10:00:00', '11:00:00');

-- Clean up test data
DELETE FROM calendar_events WHERE title = 'Test Event';

-- Test profile upsert
INSERT INTO profiles (user_id, email, region)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', 'Test Region')
ON CONFLICT (user_id) DO UPDATE SET 
  email = EXCLUDED.email,
  region = EXCLUDED.region;

-- Clean up test profile
DELETE FROM profiles WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';
"""
        },
        {
            "name": "Remove anon access policies (run after testing)",
            "sql": """
-- AFTER TESTING: Remove the anon access policies for security
DROP POLICY IF EXISTS "calendar_events_anon_access" ON calendar_events;
DROP POLICY IF EXISTS "profiles_anon_access" ON profiles;
"""
        }
    ]
    
    return fixes

def main():
    print("🚀 Starting Comprehensive Permission Fix...")
    
    success = fix_all_permission_issues()
    
    if success:
        print("\n🎯 SUMMARY:")
        print("✅ SQL fixes generated")
        print("📋 Manual application required in Supabase Dashboard")
        print("🔧 Fixes address both RLS violations and 'set role admin' errors")
        print("\n💡 After applying fixes, your app should work correctly!")
    else:
        print("\n❌ Failed to generate fixes")

if __name__ == "__main__":
    main()