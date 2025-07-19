#!/usr/bin/env python3
"""
Test database operations with service client to verify current state
"""

def test_with_service_client():
    try:
        from supabase import create_client
        
        # Your credentials
        supabase_url = "https://kycoklimpzkyrecbjecn.supabase.co"
        service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Y29rbGltcHpreXJlY2JqZWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjI1NTgwMCwiZXhwIjoyMDYxODMxODAwfQ.Ts-qusf4uucGwIneyxtnvnv2vlfeYrz9wFvELHrZqvQ"
        anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Y29rbGltcHpreXJlY2JqZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNTU4MDAsImV4cCI6MjA2MTgzMTgwMH0.nRZhYxImQ0rOlh0xZjHcdVq2Q2NY0v-9W3wciaxV2EA"
        
        print("🧪 TESTING WITH SERVICE CLIENT")
        print("=" * 50)
        
        # Create both clients
        service_client = create_client(supabase_url, service_key)
        regular_client = create_client(supabase_url, anon_key)
        
        print("✅ Service client created (bypasses RLS)")
        print("✅ Regular client created (subject to RLS)")
        
        # Test 1: Calendar event with service client (should work)
        print("\n📅 Test 1: Calendar event with SERVICE client...")
        
        test_user_id = "550e8400-e29b-41d4-a716-446655440000"
        
        try:
            test_event = {
                "user_id": test_user_id,
                "title": "Service Client Test",
                "description": "Testing with service client",
                "date": "2024-01-01",
                "start_time": "10:00:00",
                "end_time": "11:00:00",
                "timezone": "UTC",
                "type": "test"
            }
            
            result = service_client.table("calendar_events").insert(test_event).execute()
            
            print(f"✅ Service client insert successful: {len(result.data)} rows")
            
            # Clean up
            if result.data and len(result.data) > 0:
                test_id = result.data[0].get('id')
                if test_id:
                    service_client.table("calendar_events").delete().eq("id", test_id).execute()
                    print("🧹 Test data cleaned up")
                    
        except Exception as e:
            print(f"❌ Service client test failed: {e}")
            if "permission denied to set role" in str(e):
                print("🚨 Even service client gets role permission error!")
        
        # Test 2: Calendar event with regular client (will show RLS issue)
        print("\n📅 Test 2: Calendar event with REGULAR client...")
        
        try:
            test_event = {
                "user_id": test_user_id,
                "title": "Regular Client Test",
                "description": "Testing with regular client",
                "date": "2024-01-01", 
                "start_time": "10:00:00",
                "end_time": "11:00:00",
                "timezone": "UTC",
                "type": "test"
            }
            
            result = regular_client.table("calendar_events").insert(test_event).execute()
            
            print(f"✅ Regular client insert successful: {len(result.data)} rows")
            
        except Exception as e:
            error_str = str(e)
            print(f"❌ Regular client test failed: {error_str[:200]}...")
            
            if "permission denied to set role" in error_str:
                print("🚨 CONFIRMED: Regular client triggers 'set role admin' error!")
                print("   This is the root cause of your application issues")
            elif "row-level security policy" in error_str:
                print("🔒 CONFIRMED: RLS policy blocks insert")
                print("   This is expected with anon client and restrictive policies")
            else:
                print("⚠️  Different error type")
        
        # Test 3: Check table structure
        print("\n📋 Test 3: Checking table accessibility...")
        
        tables = ["calendar_events", "profiles", "expenses"]
        
        for table in tables:
            try:
                # Check with service client
                result = service_client.table(table).select("*").limit(1).execute()
                service_count = len(result.data or [])
                
                # Check with regular client
                try:
                    result = regular_client.table(table).select("*").limit(1).execute()
                    regular_count = len(result.data or [])
                    print(f"✅ {table}: Service({service_count}) Regular({regular_count})")
                except Exception as e:
                    if "permission denied to set role" in str(e):
                        print(f"🚨 {table}: Service({service_count}) Regular(ROLE ERROR)")
                    else:
                        print(f"⚠️  {table}: Service({service_count}) Regular(RLS BLOCK)")
                        
            except Exception as e:
                print(f"❌ {table}: Service client failed - {e}")
        
        # Test 4: Profile operations
        print("\n👤 Test 4: Profile operations...")
        
        try:
            # Try with service client first
            test_profile = {
                "user_id": test_user_id,
                "email": "service-test@example.com",
                "region": "Australia"  # Use valid region to avoid constraint errors
            }
            
            result = service_client.table("profiles").upsert(test_profile).execute()
            print("✅ Service client profile upsert successful")
            
            # Clean up
            service_client.table("profiles").delete().eq("user_id", test_user_id).execute()
            print("🧹 Test profile cleaned up")
            
        except Exception as e:
            error_str = str(e)
            print(f"❌ Profile test failed: {error_str[:200]}...")
            
            if "permission denied to set role" in error_str:
                print("🚨 Profile operations trigger role permission error!")
            elif "check constraint" in error_str:
                print("⚠️  Database constraint error (not permission related)")
            else:
                print("⚠️  Other error type")
        
        print("\n📊 SUMMARY:")
        print("=" * 40)
        print("Service client: Bypasses RLS, shows actual database state")
        print("Regular client: Subject to RLS, shows user experience")
        print("If regular client fails with 'set role admin' → RLS policy issue")
        print("If regular client fails with 'RLS policy' → Normal RLS behavior")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def main():
    print("🚀 Starting Service Client Database Test...")
    
    success = test_with_service_client()
    
    if success:
        print("\n✅ Test completed")
        print("📋 Check the results above to understand the permission issues")
    else:
        print("\n❌ Test failed")

if __name__ == "__main__":
    main()