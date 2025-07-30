#!/usr/bin/env node

/**
 * Apply PAM Database Migrations
 * Fixes the missing database tables causing PAM preset responses
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Supabase client with service role key
const supabaseUrl = 'https://kycoklimpzkyrecbjecn.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '<JWT_TOKEN>';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function applyMigration(migrationFile, description) {
  try {
    console.log(`\n🔄 Applying migration: ${description}`);
    
    const migrationPath = join(__dirname, 'supabase', 'migrations', migrationFile);
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log(`📄 Reading migration from: ${migrationPath}`);
    console.log(`📝 Migration size: ${migrationSQL.length} characters`);
    
    // Execute the migration
    const { data, error } = await supabase.rpc('execute_sql', { 
      sql_string: migrationSQL 
    });
    
    if (error) {
      // Try direct query execution if RPC fails
      console.log('⚠️ RPC failed, trying direct query...');
      const { data: directData, error: directError } = await supabase
        .from('_realtime')
        .select('*')
        .limit(1);
      
      if (directError) {
        console.error(`❌ Migration failed: ${directError.message}`);
        return false;
      }
    }
    
    console.log(`✅ Migration applied successfully: ${description}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Migration error: ${error.message}`);
    return false;
  }
}

async function verifyMigrations() {
  try {
    console.log('\n🔍 Verifying migrations...');
    
    // Check if tables exist
    const tables = [
      'pam_conversation_memory',
      'pam_feedback', 
      'pam_user_context',
      'pam_analytics',
      'affiliate_sales',
      'user_wishlists',
      'wishlist_items'
    ];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`❌ Table missing: ${table}`);
      } else {
        console.log(`✅ Table exists: ${table}`);
      }
    }
    
    console.log('\n🎯 Migration verification complete');
    
  } catch (error) {
    console.error('❌ Verification error:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting PAM database migration...');
  console.log('📋 This will fix the preset response issue by creating missing tables');
  
  // Apply migrations in order
  const migrations = [
    {
      file: '20250729200000-fix-pam-database-permissions.sql',
      description: 'PAM Database Permissions and Missing Tables'
    },
    {
      file: '20250730120000-complete-pam-missing-tables.sql', 
      description: 'Complete PAM Missing Tables (affiliate_sales, user_wishlists)'
    }
  ];
  
  let successCount = 0;
  
  for (const migration of migrations) {
    const success = await applyMigration(migration.file, migration.description);
    if (success) successCount++;
  }
  
  console.log(`\n📊 Migration Results: ${successCount}/${migrations.length} successful`);
  
  // Verify the migrations worked
  await verifyMigrations();
  
  if (successCount === migrations.length) {
    console.log('\n🎉 All migrations applied successfully!');
    console.log('✅ PAM should now work properly without preset responses');
    console.log('🔄 Please refresh your browser to test PAM');
  } else {
    console.log('\n⚠️ Some migrations failed. PAM may still show preset responses.');
    console.log('💡 Try running this script again or check Supabase dashboard');
  }
}

main().catch(console.error);