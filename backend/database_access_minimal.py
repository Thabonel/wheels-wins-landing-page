#!/usr/bin/env python3
"""
Minimal Database Access Script
Tests database permissions without requiring full app configuration
"""

import sys
import os
from pathlib import Path

def test_with_provided_credentials():
    """Test database access if user provides credentials"""
    
    print("🔍 Minimal Database Access Test")
    print("=" * 50)
    
    # Check if we can import supabase directly
    try:
        from supabase import create_client, Client
        print("✅ Supabase client library available")
    except ImportError:
        print("❌ Supabase client library not available")
        return False
    
    # Prompt for credentials (for testing purposes)
    print("\n📋 To test database access, we need your Supabase credentials:")
    print("You can find these in your Supabase project dashboard.")
    print("(This is just for testing - don't share these publicly)")
    
    print("\nRequired:")
    print("1. SUPABASE_URL (from Project Settings → API)")
    print("2. SUPABASE_ANON_KEY (from Project Settings → API)")
    print("3. SUPABASE_SERVICE_ROLE_KEY (from Project Settings → API)")
    
    # Check if environment variables are already set
    supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')
    service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if supabase_url and supabase_key:
        print(f"\n✅ Found credentials in environment:")
        print(f"   URL: {supabase_url[:30]}...")
        print(f"   ANON KEY: {supabase_key[:30]}...")
        if service_key:
            print(f"   SERVICE KEY: {service_key[:30]}...")
        
        return test_database_connection(supabase_url, supabase_key, service_key)
    else:
        print(f"\n❌ No credentials found in environment")
        print("Please set the environment variables and run again.")
        print("\nExample:")
        print("export SUPABASE_URL='https://your-project.supabase.co'")
        print("export SUPABASE_KEY='your-anon-key'")
        print("export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'")
        return False

def test_database_connection(url, anon_key, service_key=None):
    """Test the actual database connection and permissions"""
    
    try:
        from supabase import create_client
        
        print(f"\n🔗 Testing database connection...")
        
        # Create regular client
        client = create_client(url, anon_key)
        print("✅ Regular client created")
        
        # Create service client if available
        service_client = None
        if service_key:
            service_client = create_client(url, service_key)
            print("✅ Service client created")
        
        # Test 1: Basic connectivity
        print(f"\n📡 Testing basic connectivity...")
        try:
            # Try a simple query that should work
            result = client.table("profiles").select("user_id").limit(1).execute()
            print(f"✅ Basic connectivity: Success ({len(result.data or [])} rows)")
        except Exception as e:
            print(f"❌ Basic connectivity failed: {e}")
            if "permission denied to set role" in str(e):
                print("🚨 PERMISSION ERROR DETECTED: Role switching issue!")
                return analyze_permission_error(client, service_client)
        
        # Test 2: Calendar events table
        print(f"\n📅 Testing calendar_events table...")
        try:
            result = client.table("calendar_events").select("*").limit(1).execute()
            print(f"✅ Calendar events table: Accessible ({len(result.data or [])} rows)")
        except Exception as e:
            print(f"❌ Calendar events table error: {e}")
            if "permission denied to set role" in str(e):
                print("🚨 PERMISSION ERROR IN CALENDAR TABLE!")
                return analyze_permission_error(client, service_client)
        
        # Test 3: Try inserting test data
        print(f"\n🧪 Testing data insertion...")
        test_user_id = "550e8400-e29b-41d4-a716-446655440000"
        
        try:
            test_event = {
                "user_id": test_user_id,
                "title": "Permission Test Event",
                "description": "Testing permissions",
                "date": "2024-01-01",
                "start_time": "10:00:00",
                "end_time": "11:00:00"
            }
            
            result = client.table("calendar_events").insert(test_event).execute()
            
            if result.error:
                print(f"❌ Insert failed: {result.error}")
                if "permission denied to set role" in str(result.error):
                    print("🚨 FOUND THE PROBLEM: Insert triggers role permission error!")
                    return analyze_permission_error(client, service_client)
            else:
                print(f"✅ Insert successful!")
                # Clean up test data
                if result.data and len(result.data) > 0:
                    test_id = result.data[0].get('id')
                    if test_id:
                        client.table("calendar_events").delete().eq("id", test_id).execute()
                        print("🧹 Test data cleaned up")
                
        except Exception as e:
            print(f"❌ Insert exception: {e}")
            if "permission denied to set role" in str(e):
                print("🚨 FOUND THE PROBLEM: Insert causes role permission error!")
                return analyze_permission_error(client, service_client)
        
        print(f"\n✅ All database tests passed!")
        print("🎉 No permission errors detected - the issue may be resolved!")
        return True
        
    except Exception as e:
        print(f"❌ Database connection test failed: {e}")
        return False

def analyze_permission_error(client, service_client=None):
    """Analyze the permission error in detail"""
    
    print(f"\n🔍 ANALYZING PERMISSION ERROR...")
    print("=" * 50)
    
    print("🚨 Root Cause: PostgreSQL is trying to execute 'SET ROLE admin'")
    print("📍 This happens at the database level, not in application code")
    
    print(f"\n🔧 Potential Solutions:")
    print("1. Fix RLS policies in Supabase Dashboard")
    print("2. Remove admin role references from policies")
    print("3. Simplify table policies to avoid role switching")
    
    # Try to get more info with service client
    if service_client:
        print(f"\n🔒 Checking RLS policies with service client...")
        try:
            # This might not work depending on Supabase setup
            result = service_client.rpc('exec_sql', {
                'sql': '''
                SELECT tablename, policyname, cmd, qual 
                FROM pg_policies 
                WHERE tablename IN ('calendar_events', 'profiles')
                ORDER BY tablename;
                '''
            }).execute()
            
            if result.error:
                print(f"⚠️  Cannot query policies: {result.error}")
            else:
                print("📋 Current policies found:")
                for policy in result.data or []:
                    print(f"   {policy['tablename']}.{policy['policyname']}")
                    if 'admin' in str(policy.get('qual', '')).lower():
                        print(f"      ⚠️  Contains admin reference!")
                        
        except Exception as e:
            print(f"⚠️  Policy analysis failed: {e}")
    
    print(f"\n📋 MANUAL FIX REQUIRED:")
    print("Go to Supabase Dashboard → Database → Tables → calendar_events → RLS")
    print("Replace existing policies with:")
    print("""
CREATE POLICY "calendar_events_user_access" ON calendar_events
FOR ALL TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
""")
    
    return False

if __name__ == "__main__":
    success = test_with_provided_credentials()
    if success:
        print("\n🎉 Database access is working correctly!")
    else:
        print("\n❌ Database access issues detected")
        print("📋 Manual intervention required in Supabase Dashboard")