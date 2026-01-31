#!/usr/bin/env node
/**
 * RLS Security Analysis Script
 * Analyzes current database for overly permissive WITH CHECK (true) policies
 */

const fs = require('fs');

async function analyzeRLSSecurity() {
  console.log('🔍 RLS Security Analysis Starting...\n');

  // Check if Supabase client is available
  let createClient;
  try {
    createClient = require('@supabase/supabase-js').createClient;
  } catch (error) {
    console.log('❌ @supabase/supabase-js not found');
    console.log('   Install with: npm install @supabase/supabase-js');
    console.log('   Or run the SQL fixes directly in Supabase dashboard');
    return;
  }

  // Read Supabase configuration
  const envPath = '.env.local';
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local file not found');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const supabaseUrlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
  const supabaseKeyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

  if (!supabaseUrlMatch || !supabaseKeyMatch) {
    console.log('❌ Supabase configuration not found in .env.local');
    return;
  }

  const supabaseUrl = supabaseUrlMatch[1].trim();
  const supabaseKey = supabaseKeyMatch[1].trim();

  console.log('📡 Connecting to:', supabaseUrl);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  try {
    // Test for potential security vulnerabilities by attempting operations
    console.log('\n🚨 Testing for RLS security vulnerabilities...');

    const testTables = ['affiliate_product_clicks', 'agent_logs', 'product_issue_reports', 'trip_locations'];

    for (const tableName of testTables) {
      console.log(`\n📊 Testing ${tableName}:`);

      // Test if table exists and is accessible
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact' })
          .limit(1);

        if (error) {
          if (error.code === '42P01') {
            console.log(`   ❌ Table does not exist`);
          } else if (error.code === '42501') {
            console.log(`   🔒 Access denied (good - RLS working)`);
          } else {
            console.log(`   ⚠️  Error: ${error.message} (Code: ${error.code})`);
          }
        } else {
          console.log(`   ✅ Table exists, ${count || 0} total rows`);
          if (count > 0) {
            console.log(`   ⚠️  Data accessible with anon key - check RLS policies`);
          }
        }
      } catch (e) {
        console.log(`   💥 Unexpected error: ${e.message}`);
      }
    }

    // Test INSERT operations (should be blocked by secure RLS)
    console.log('\n🧪 Testing INSERT capabilities (should be blocked)...');

    const insertTests = [
      {
        table: 'affiliate_product_clicks',
        data: { product_id: 'test-product', clicked_at: new Date().toISOString() }
      },
      {
        table: 'agent_logs',
        data: { message: 'security test log', level: 'info' }
      },
      {
        table: 'product_issue_reports',
        data: { description: 'test report', product_id: 'test' }
      },
      {
        table: 'trip_locations',
        data: { name: 'test location', latitude: 0, longitude: 0 }
      }
    ];

    let vulnerabilitiesFound = 0;

    for (const test of insertTests) {
      try {
        const { error } = await supabase
          .from(test.table)
          .insert(test.data);

        if (error) {
          if (error.code === '42501') {
            console.log(`   ✅ ${test.table}: INSERT properly blocked`);
          } else if (error.code === '42P01') {
            console.log(`   ❌ ${test.table}: Table does not exist`);
          } else {
            console.log(`   ⚠️  ${test.table}: ${error.message} (Code: ${error.code})`);
          }
        } else {
          console.log(`   🚨 ${test.table}: INSERT SUCCEEDED - CRITICAL SECURITY VULNERABILITY!`);
          vulnerabilitiesFound++;
        }
      } catch (e) {
        console.log(`   💥 ${test.table}: ${e.message}`);
      }
    }

    // Summary and recommendations
    console.log('\n' + '='.repeat(60));
    console.log('📊 SECURITY ANALYSIS SUMMARY');
    console.log('='.repeat(60));

    if (vulnerabilitiesFound > 0) {
      console.log(`🚨 CRITICAL: ${vulnerabilitiesFound} security vulnerabilities found!`);
      console.log('   Immediate action required - apply security fixes now');
    } else {
      console.log('✅ No immediate vulnerabilities detected with anon key');
      console.log('   However, WITH CHECK (true) policies still need to be fixed');
    }

    console.log('\n🔧 REQUIRED ACTIONS:');
    console.log('1. Open Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/sql');
    console.log('2. Run the security analysis:');
    console.log('   Execute: docs/sql-fixes/ANALYZE_TABLE_STRUCTURES.sql');
    console.log('3. Apply the security fix:');
    console.log('   Execute: docs/sql-fixes/FIX_RLS_SECURITY_ISSUES.sql');
    console.log('4. Test application functionality');
    console.log('5. If issues occur, use rollback:');
    console.log('   Execute: docs/sql-fixes/ROLLBACK_RLS_SECURITY_FIX.sql');

    console.log('\n📚 Documentation created:');
    console.log('• docs/sql-fixes/README_RLS_SECURITY_FIX.md - Complete implementation guide');

  } catch (error) {
    console.log('❌ Database connection error:', error.message);
    console.log('\nThis may be normal if RLS is properly configured.');
    console.log('Proceed with manual SQL execution in Supabase dashboard.');
  }
}

if (require.main === module) {
  analyzeRLSSecurity().catch(console.error);
}

module.exports = { analyzeRLSSecurity };