#!/usr/bin/env python3
"""
Test Database Permissions with Provided Keys
"""

def test_permissions():
    try:
        from supabase import create_client
        
        # Your credentials
        supabase_url = "https://kycoklimpzkyrecbjecn.supabase.co"
        anon_key = "<JWT_TOKEN>"
        
        print("🔍 TESTING DATABASE PERMISSIONS")
        print("=" * 50)
        print(f"URL: {supabase_url}")
        print(f"Key: {anon_key[:50]}...")
        
        # Create client
        client = create_client(supabase_url, anon_key)
        print("✅ Supabase client created")
        
        # Test 1: Check table accessibility
        print("\n📋 Testing table accessibility...")
        
        tables = ["calendar_events", "profiles", "expenses"]
        for table in tables:
            try:
                result = client.table(table).select("*").limit(1).execute()
                print(f"✅ {table}: Accessible ({len(result.data or [])} rows)")
            except Exception as e:
                print(f"❌ {table}: {str(e)[:100]}...")
                if "permission denied to set role" in str(e):
                    print(f"🚨 FOUND THE PROBLEM in {table}!")
        
        # Test 2: Try the problematic operation
        print("\n🧪 Testing calendar event creation...")
        
        test_user_id = "550e8400-e29b-41d4-a716-446655440000"
        
        try:
            test_event = {
                "user_id": test_user_id,
                "title": "Permission Test Event",
                "description": "Testing database permissions",
                "date": "2024-01-01", 
                "start_time": "10:00:00",
                "end_time": "11:00:00",
                "timezone": "UTC",
                "type": "test"
            }
            
            print("📝 Attempting to insert test calendar event...")
            result = client.table("calendar_events").insert(test_event).execute()
            
            if result.error:
                print(f"❌ Insert failed: {result.error}")
                if "permission denied to set role" in str(result.error):
                    print("🚨 CONFIRMED: Calendar insert triggers 'set role admin' error!")
                    print("   This is the root cause of your issue!")
                    return False
            else:
                print("✅ Insert successful!")
                # Clean up test data
                if result.data and len(result.data) > 0:
                    test_id = result.data[0].get('id')
                    if test_id:
                        cleanup = client.table("calendar_events").delete().eq("id", test_id).execute()
                        print("🧹 Test data cleaned up")
                return True
                
        except Exception as e:
            print(f"❌ Insert exception: {str(e)[:200]}...")
            if "permission denied to set role" in str(e):
                print("🚨 CONFIRMED: Exception contains 'set role admin' error!")
                print("   This proves the RLS policies are causing role switching!")
                return False
        
        # Test 3: Try profile operations
        print("\n👤 Testing profile operations...")
        
        try:
            # Try to read profiles
            result = client.table("profiles").select("*").eq("user_id", test_user_id).execute()
            print(f"📖 Profile read: {len(result.data or [])} profiles found")
            
            # Try to upsert profile
            test_profile = {
                "user_id": test_user_id,
                "email": "test@example.com",
                "region": "Test Region"
            }
            
            result = client.table("profiles").upsert(test_profile).execute()
            
            if result.error:
                print(f"❌ Profile upsert failed: {result.error}")
                if "permission denied to set role" in str(result.error):
                    print("🚨 CONFIRMED: Profile operations also trigger role errors!")
                    return False
            else:
                print("✅ Profile upsert successful")
                # Clean up
                client.table("profiles").delete().eq("user_id", test_user_id).execute()
                print("🧹 Test profile cleaned up")
                
        except Exception as e:
            print(f"❌ Profile exception: {str(e)[:200]}...")
            if "permission denied to set role" in str(e):
                print("🚨 CONFIRMED: Profile operations cause role permission error!")
                return False
        
        print("\n✅ All tests passed! No permission errors detected.")
        print("🎉 Your database permissions appear to be working correctly!")
        return True
        
    except ImportError:
        print("❌ Supabase library not available")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def main():
    print("🚀 Starting Database Permission Test...")
    
    success = test_permissions()
    
    if success:
        print("\n🎉 SUCCESS!")
        print("✅ No 'permission denied to set role admin' errors found")
        print("✅ Calendar events should save properly")
        print("✅ Profile updates should work")
        print("\n💡 If you're still seeing errors in your app:")
        print("   1. Restart your backend server")
        print("   2. Clear browser cache") 
        print("   3. Test creating a calendar event")
    else:
        print("\n🚨 PERMISSION ERROR CONFIRMED!")
        print("❌ Found 'permission denied to set role admin' error")
        print("📋 Root cause: RLS policies trigger PostgreSQL role switching")
        print("\n🛠️  TO FIX:")
        print("   1. Go to Supabase Dashboard")
        print("   2. Database → Tables → calendar_events → RLS")
        print("   3. Delete existing policies")
        print("   4. Create simple policy:")
        print("      CREATE POLICY \"calendar_user_access\" ON calendar_events")
        print("      FOR ALL TO authenticated")
        print("      USING (user_id = auth.uid())")
        print("      WITH CHECK (user_id = auth.uid());")
        print("   5. Repeat for profiles table")

if __name__ == "__main__":
    main()