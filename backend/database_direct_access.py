#!/usr/bin/env python3
"""
Direct Database Access for Permission Investigation
Uses the same patterns as MCP tools to access Supabase directly
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

async def investigate_database_permissions():
    """Investigate database permissions directly"""
    try:
        # Import after path setup
        from app.database.supabase_client import get_supabase_client, get_supabase_service
        
        print("🔍 Investigating database permissions...")
        
        # Get both clients
        regular_client = get_supabase_client()
        service_client = get_supabase_service()
        
        print("✅ Database clients initialized")
        
        # Test 1: Check table accessibility
        print("\n📋 Testing table accessibility...")
        
        tables_to_test = ["calendar_events", "profiles", "expenses"]
        
        for table in tables_to_test:
            try:
                result = regular_client.table(table).select("*").limit(1).execute()
                if result.error:
                    print(f"❌ {table}: {result.error}")
                else:
                    print(f"✅ {table}: Accessible ({len(result.data or [])} rows)")
            except Exception as e:
                print(f"❌ {table}: Exception - {e}")
        
        # Test 2: Try to insert test data (will show permission errors)
        print("\n🧪 Testing data insertion...")
        
        test_user_id = "550e8400-e29b-41d4-a716-446655440000"
        
        # Test calendar event insertion
        print("📅 Testing calendar event insertion...")
        try:
            test_event = {
                "user_id": test_user_id,
                "title": "Test Event",
                "description": "Test Description",
                "date": "2024-01-01",
                "start_time": "10:00:00",
                "end_time": "11:00:00",
                "timezone": "UTC",
                "type": "test"
            }
            
            result = regular_client.table("calendar_events").insert(test_event).execute()
            
            if result.error:
                print(f"❌ Calendar insert error: {result.error}")
                if "permission denied to set role" in str(result.error):
                    print("🚨 FOUND THE PROBLEM: Role permission error detected!")
                    return "role_permission_error"
            else:
                print(f"✅ Calendar insert successful: {result.data}")
                # Clean up test data
                if result.data:
                    test_id = result.data[0].get('id')
                    if test_id:
                        regular_client.table("calendar_events").delete().eq("id", test_id).execute()
                        print("🧹 Test data cleaned up")
                        
        except Exception as e:
            print(f"❌ Calendar insert exception: {e}")
            if "permission denied to set role" in str(e):
                print("🚨 FOUND THE PROBLEM: Role permission error in exception!")
                return "role_permission_error"
        
        # Test 3: Try profile update
        print("\n👤 Testing profile operations...")
        try:
            # First try to read profiles
            result = regular_client.table("profiles").select("*").eq("id", test_user_id).execute()
            print(f"📖 Profile read: {len(result.data or [])} profiles found")
            
            # Try to insert/update profile
            test_profile = {
                "user_id": test_user_id,
                "email": "test@example.com",
                "region": "Test Region"
            }
            
            result = regular_client.table("profiles").upsert(test_profile).execute()
            
            if result.error:
                print(f"❌ Profile upsert error: {result.error}")
                if "permission denied to set role" in str(result.error):
                    print("🚨 FOUND THE PROBLEM: Role permission error in profiles!")
                    return "role_permission_error"
            else:
                print(f"✅ Profile upsert successful")
                # Clean up
                regular_client.table("profiles").delete().eq("id", test_user_id).execute()
                
        except Exception as e:
            print(f"❌ Profile operation exception: {e}")
            if "permission denied to set role" in str(e):
                print("🚨 FOUND THE PROBLEM: Role permission error in profiles!")
                return "role_permission_error"
        
        # Test 4: Check RLS policies (if we have service access)
        print("\n🔒 Checking RLS policies...")
        try:
            # Try to query pg_policies if we have access
            result = service_client.rpc('exec_sql', {
                'sql': '''
                SELECT schemaname, tablename, policyname, cmd, qual, with_check 
                FROM pg_policies 
                WHERE tablename IN ('calendar_events', 'profiles')
                ORDER BY tablename, policyname;
                '''
            }).execute()
            
            if result.error:
                print(f"⚠️  Cannot query policies directly: {result.error}")
            else:
                print("📋 Current RLS policies:")
                for policy in result.data or []:
                    print(f"   {policy['tablename']}.{policy['policyname']}: {policy['cmd']}")
                    if 'admin' in (policy.get('qual') or '').lower():
                        print(f"      ⚠️  Contains admin reference: {policy['qual']}")
                        
        except Exception as e:
            print(f"⚠️  Policy check failed: {e}")
        
        print("\n✅ Database investigation complete")
        return "investigation_complete"
        
    except Exception as e:
        print(f"❌ Database investigation failed: {e}")
        return f"error: {e}"

async def fix_database_permissions():
    """Attempt to fix database permissions directly"""
    try:
        from app.database.supabase_client import get_supabase_service
        
        print("🔧 Attempting to fix database permissions...")
        
        service_client = get_supabase_service()
        
        # Try to fix RLS policies
        fixes = [
            {
                "name": "Drop problematic calendar_events policies",
                "sql": """
                DROP POLICY IF EXISTS "Users can manage own events" ON calendar_events;
                DROP POLICY IF EXISTS "Admins can read all events" ON calendar_events;
                DROP POLICY IF EXISTS "Admins can manage all events" ON calendar_events;
                """
            },
            {
                "name": "Create safe calendar_events policy",
                "sql": """
                CREATE POLICY "calendar_events_safe_policy" ON calendar_events
                FOR ALL TO authenticated 
                USING (user_id = auth.uid())
                WITH CHECK (user_id = auth.uid());
                """
            },
            {
                "name": "Drop problematic profiles policies", 
                "sql": """
                DROP POLICY IF EXISTS "Users can manage own profiles" ON profiles;
                DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
                """
            },
            {
                "name": "Create safe profiles policy",
                "sql": """
                CREATE POLICY "profiles_safe_policy" ON profiles
                FOR ALL TO authenticated 
                USING (user_id = auth.uid())
                WITH CHECK (user_id = auth.uid());
                """
            }
        ]
        
        for fix in fixes:
            try:
                print(f"🔧 {fix['name']}...")
                result = service_client.rpc('exec_sql', {'sql': fix['sql']}).execute()
                
                if result.error:
                    print(f"⚠️  {fix['name']} - Warning: {result.error}")
                else:
                    print(f"✅ {fix['name']} - Success")
                    
            except Exception as e:
                print(f"❌ {fix['name']} - Failed: {e}")
        
        print("🧪 Testing after fixes...")
        test_result = await investigate_database_permissions()
        
        if test_result == "role_permission_error":
            print("❌ Fixes did not resolve the role permission error")
            return False
        else:
            print("✅ Fixes appear to have resolved the issues")
            return True
            
    except Exception as e:
        print(f"❌ Fix attempt failed: {e}")
        return False

async def main():
    """Main investigation and fix routine"""
    print("🚀 Starting direct database access investigation...")
    
    # First investigate
    result = await investigate_database_permissions()
    
    if result == "role_permission_error":
        print("\n🔧 Role permission error detected - attempting fixes...")
        success = await fix_database_permissions()
        
        if success:
            print("\n🎉 Database permissions fixed successfully!")
        else:
            print("\n❌ Unable to fix permissions automatically")
            print("📋 Manual intervention required in Supabase Dashboard")
    else:
        print(f"\n📊 Investigation result: {result}")

if __name__ == "__main__":
    asyncio.run(main())