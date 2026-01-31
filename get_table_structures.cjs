#!/usr/bin/env node
/**
 * Get actual table structures for security policy design
 */

const fs = require('fs');

async function getTableStructures() {
  console.log('🔍 Getting table structures for security fix...\n');

  let createClient;
  try {
    createClient = require('@supabase/supabase-js').createClient;
  } catch (error) {
    console.log('❌ @supabase/supabase-js not found');
    return;
  }

  const envContent = fs.readFileSync('.env.local', 'utf8');
  const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
  const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

  const supabase = createClient(supabaseUrl, supabaseKey);

  const tables = ['affiliate_product_clicks', 'agent_logs', 'product_issue_reports', 'trip_locations'];

  for (const tableName of tables) {
    console.log(`📋 ${tableName}:`);

    try {
      // Try to get a single row to understand structure
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === '42P01') {
          console.log(`   ❌ Table does not exist`);
        } else if (error.code === '42501') {
          console.log(`   🔒 Access denied - RLS blocking (good)`);
        } else {
          console.log(`   ⚠️  Error: ${error.message}`);
        }
      } else {
        console.log(`   ✅ Accessible - columns can be inferred from successful operations`);
        if (data && data.length > 0) {
          console.log(`   📊 Sample data structure:`, Object.keys(data[0]).join(', '));
        }
      }

      // Test a minimal insert to see what columns are expected
      const testInserts = {
        'affiliate_product_clicks': {
          product_id: '123e4567-e89b-12d3-a456-426614174000'
        },
        'agent_logs': {
          message: 'test'
        },
        'product_issue_reports': {
          issue_type: 'test'
        },
        'trip_locations': {
          name: 'test location'
        }
      };

      if (testInserts[tableName]) {
        const { error: insertError } = await supabase
          .from(tableName)
          .insert(testInserts[tableName]);

        if (insertError) {
          if (insertError.code === '42501') {
            console.log(`   🔒 INSERT blocked by RLS (secure)`);
          } else if (insertError.code === '23502') {
            console.log(`   ⚠️  Missing required columns: ${insertError.message}`);
          } else if (insertError.code === 'PGRST204') {
            console.log(`   ⚠️  Column not found: ${insertError.message}`);
          } else {
            console.log(`   ⚠️  INSERT error: ${insertError.message} (${insertError.code})`);
          }
        } else {
          console.log(`   🚨 INSERT SUCCEEDED - SECURITY ISSUE!`);
        }
      }

    } catch (e) {
      console.log(`   💥 Unexpected error: ${e.message}`);
    }

    console.log('');
  }

  console.log('📋 Summary:');
  console.log('• Use this information to create precise RLS policies');
  console.log('• Tables with successful INSERTs need immediate fixing');
  console.log('• Apply the comprehensive security fix in Supabase dashboard');
}

getTableStructures().catch(console.error);