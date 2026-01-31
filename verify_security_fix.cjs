#!/usr/bin/env node
/**
 * Verify RLS Security Fix Applied Correctly
 * Run this AFTER applying the security fix
 */

const fs = require('fs');

async function verifySecurityFix() {
  console.log('🔍 Verifying RLS Security Fix...\n');

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

  console.log('📡 Connected to:', supabaseUrl);
  console.log('🧪 Testing security after fix application...\n');

  const testTables = ['affiliate_product_clicks', 'product_issue_reports', 'trip_locations'];
  let securityIssues = 0;
  let totalTests = 0;

  for (const tableName of testTables) {
    console.log(`🔒 Testing ${tableName}:`);

    // Test 1: Check if table is still accessible for reading with anon key
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      totalTests++;

      if (error) {
        if (error.code === '42501') {
          console.log(`   ✅ SELECT properly blocked (secured)`);
        } else {
          console.log(`   ⚠️  Unexpected error: ${error.message} (${error.code})`);
        }
      } else {
        console.log(`   ⚠️  Still accessible for SELECT with anon key`);
        console.log('      Note: This may be acceptable depending on table design');
      }
    } catch (e) {
      console.log(`   💥 Unexpected error: ${e.message}`);
    }

    // Test 2: Attempt INSERT with anon key (should be blocked)
    const testData = {
      'affiliate_product_clicks': { product_id: '123e4567-e89b-12d3-a456-426614174000' },
      'product_issue_reports': { product_id: '123e4567-e89b-12d3-a456-426614174000', issue_type: 'test' },
      'trip_locations': { name: 'test', latitude: 0, longitude: 0 }
    };

    try {
      const { error } = await supabase
        .from(tableName)
        .insert(testData[tableName]);

      totalTests++;

      if (error) {
        if (error.code === '42501') {
          console.log(`   ✅ INSERT properly blocked (security fixed)`);
        } else if (error.code === '23503' || error.code === '23502') {
          console.log(`   ⚠️  INSERT blocked by constraints, not RLS: ${error.message}`);
          console.log('      This provides some protection but RLS should also block it');
        } else {
          console.log(`   ⚠️  INSERT failed: ${error.message} (${error.code})`);
        }
      } else {
        console.log(`   🚨 INSERT SUCCEEDED - SECURITY ISSUE REMAINS!`);
        securityIssues++;
      }
    } catch (e) {
      console.log(`   💥 Unexpected error: ${e.message}`);
    }

    console.log('');
  }

  // Test agent_logs to ensure it's still properly secured
  console.log('🔒 Testing agent_logs (should remain secure):');
  try {
    const { error } = await supabase
      .from('agent_logs')
      .insert({ message: 'test', session_id: 'test' });

    if (error && error.code === '42501') {
      console.log('   ✅ agent_logs properly blocked (security maintained)');
    } else {
      console.log('   ⚠️  agent_logs test result:', error?.message || 'succeeded');
    }
  } catch (e) {
    console.log(`   ⚠️  agent_logs test error: ${e.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SECURITY FIX VERIFICATION RESULTS');
  console.log('='.repeat(60));

  if (securityIssues === 0) {
    console.log('✅ SUCCESS: No critical security vulnerabilities detected');
    console.log('   The RLS security fix appears to be working correctly');
  } else {
    console.log(`🚨 CRITICAL: ${securityIssues} security issues remain!`);
    console.log('   The security fix may not have been applied correctly');
    console.log('   Check the SQL execution in Supabase dashboard for errors');
  }

  console.log(`\n📋 Tests completed: ${totalTests}`);
  console.log(`🔒 Critical issues: ${securityIssues}`);

  if (securityIssues > 0) {
    console.log('\n🚨 IMMEDIATE ACTION REQUIRED:');
    console.log('1. Check Supabase SQL Editor for execution errors');
    console.log('2. Re-run the security fix: docs/sql-fixes/TARGETED_SECURITY_FIX.sql');
    console.log('3. If issues persist, use manual policy creation');
    console.log('4. Contact system administrator if needed');
  } else {
    console.log('\n✅ NEXT STEPS:');
    console.log('1. Test application functionality thoroughly');
    console.log('2. Verify PAM system still works correctly');
    console.log('3. Test user operations (affiliate clicks, issue reports, trips)');
    console.log('4. Monitor for any broken features');
    console.log('5. If issues occur, use rollback: docs/sql-fixes/ROLLBACK_RLS_SECURITY_FIX.sql');
  }
}

verifySecurityFix().catch(console.error);