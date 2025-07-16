#!/usr/bin/env python3
"""
Fix Calendar Permission Issues
This script helps resolve the "permission denied to set role 'admin'" error
when saving calendar events.
"""

import os
import sys
from pathlib import Path

def main():
    print("🔧 Calendar Permission Fix")
    print("=" * 50)
    
    # Check if .env file exists
    env_file = Path(".env")
    if not env_file.exists():
        print("❌ .env file not found!")
        print("Please create a .env file in the backend directory first.")
        return
    
    # Check current environment variables
    print("\n📋 Current Supabase Configuration:")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    print(f"SUPABASE_URL: {'✅ Set' if supabase_url else '❌ Missing'}")
    print(f"SUPABASE_KEY: {'✅ Set' if supabase_key else '❌ Missing'}")
    print(f"SUPABASE_SERVICE_ROLE_KEY: {'✅ Set' if service_key else '❌ Missing'}")
    
    if not service_key:
        print("\n🔑 SUPABASE_SERVICE_ROLE_KEY is missing!")
        print("This is required for admin users to save calendar events.")
        print("\nTo fix this:")
        print("1. Go to your Supabase dashboard")
        print("2. Navigate to Settings -> API")
        print("3. Copy the 'service_role' key (not the anon key)")
        print("4. Add it to your .env file:")
        print("   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here")
        print("\n⚠️  WARNING: Keep the service role key secure!")
        print("   Never commit it to version control.")
        
        # Optionally add it to .env file
        add_to_env = input("\nWould you like to add it to .env now? (y/N): ").lower()
        if add_to_env == 'y':
            service_key = input("Enter your Supabase service role key: ").strip()
            if service_key:
                with open(".env", "a") as f:
                    f.write(f"\nSUPABASE_SERVICE_ROLE_KEY={service_key}\n")
                print("✅ Added SUPABASE_SERVICE_ROLE_KEY to .env")
            else:
                print("❌ No key provided")
    else:
        print("\n✅ Service role key is configured!")
    
    print("\n🚀 Next Steps:")
    print("1. Restart your backend server")
    print("2. Try creating a calendar event again")
    print("3. Check the logs for any remaining errors")
    
    print("\n📝 If you still have issues:")
    print("- Verify the service role key is correct")
    print("- Check Supabase RLS policies for calendar_events table")
    print("- Ensure admin users are properly configured in admin_users table")

if __name__ == "__main__":
    main()