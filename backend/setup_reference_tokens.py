#!/usr/bin/env python3
"""
Setup Reference Token System - SaaS Industry Standard Authentication
This script creates the necessary database table for reference tokens.
"""

import os
import sys
from supabase import create_client

def setup_reference_token_table():
    """Create the user_sessions table for reference token authentication"""
    
    # Get Supabase credentials from environment
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing SUPABASE_URL or SUPABASE_KEY environment variables")
        print("💡 Set these in your .env file or environment")
        return False
    
    try:
        # Create Supabase client
        supabase = create_client(supabase_url, supabase_key)
        print("✅ Connected to Supabase")
        
        # SQL to create user_sessions table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS user_sessions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
          token_hash text UNIQUE NOT NULL,
          user_data jsonb NOT NULL,
          expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '1 hour'),
          created_at timestamp with time zone DEFAULT now()
        );
        """
        
        # Create indexes for performance
        create_indexes_sql = """
        CREATE INDEX IF NOT EXISTS user_sessions_token_hash_idx ON user_sessions(token_hash);
        CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions(expires_at);
        """
        
        # Create cleanup function
        create_cleanup_function_sql = """
        CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
        RETURNS void
        LANGUAGE sql
        AS $$
          DELETE FROM user_sessions WHERE expires_at < now();
        $$;
        """
        
        print("🔧 Creating user_sessions table...")
        supabase.rpc('exec_sql', {'sql': create_table_sql}).execute()
        
        print("📈 Creating performance indexes...")
        supabase.rpc('exec_sql', {'sql': create_indexes_sql}).execute()
        
        print("🧹 Creating cleanup function...")
        supabase.rpc('exec_sql', {'sql': create_cleanup_function_sql}).execute()
        
        print("✅ Reference token system setup complete!")
        print("")
        print("🎯 Benefits:")
        print("  • 32 character tokens (vs 738 character JWTs)")
        print("  • 95% size reduction")
        print("  • Industry standard (Stripe, GitHub pattern)")
        print("  • No header size limits")
        print("")
        print("🚀 Ready to use AuthConfigManager.enableReferenceTokens()")
        
        return True
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        print("")
        print("💡 Alternative: Run this SQL manually in Supabase SQL Editor:")
        print("""
        CREATE TABLE IF NOT EXISTS user_sessions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
          token_hash text UNIQUE NOT NULL,
          user_data jsonb NOT NULL,
          expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '1 hour'),
          created_at timestamp with time zone DEFAULT now()
        );
        
        CREATE INDEX IF NOT EXISTS user_sessions_token_hash_idx ON user_sessions(token_hash);
        CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions(expires_at);
        """)
        return False

if __name__ == "__main__":
    print("🎫 Setting up Reference Token System (SaaS Industry Standard)")
    print("=" * 60)
    
    success = setup_reference_token_table()
    
    if success:
        print("\n🎉 Setup completed successfully!")
        sys.exit(0)
    else:
        print("\n💡 Run the SQL manually or check your Supabase connection")
        sys.exit(1)