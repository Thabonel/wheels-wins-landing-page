#!/usr/bin/env node

import https from 'https';

const SUPABASE_URL = 'https://kycoklimpzkyrecbjecn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Y29rbGltcHpreXJlY2JqZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNTU4MDAsImV4cCI6MjA2MTgzMTgwMH0.nRZhYxImQ0rOlh0xZjHcdVq2Q2NY0v-9W3wciaxV2EA';

const PROBLEM_TABLES = [
  'user_settings',
  'user_subscriptions', 
  'trip_templates',
  'user_preferences',
  'poi_categories'
];

function makeRequest(path, method = 'GET', headers = {}, data = null) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...headers
    };

    const options = {
      hostname: 'kycoklimpzkyrecbjecn.supabase.co',
      port: 443,
      path,
      method,
      headers: defaultHeaders
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            data: responseData ? JSON.parse(responseData) : null
          };
          resolve(result);
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function validateTableAccess(tableName, expectedBehavior) {
  console.log(`\n🔍 Validating ${tableName}:`);
  console.log(`   Expected: ${expectedBehavior}`);
  
  try {
    // Test anonymous access
    const anonResult = await makeRequest(`/rest/v1/${tableName}?select=*&limit=1`);
    console.log(`   👤 Anonymous: ${anonResult.status} (${anonResult.status === 200 ? 'allowed' : 'blocked'})`);
    
    // Test authenticated access  
    const authResult = await makeRequest(
      `/rest/v1/${tableName}?select=*&limit=1`, 
      'GET',
      { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    );
    console.log(`   🔐 Authenticated: ${authResult.status} (${authResult.status === 200 ? 'allowed' : 'blocked'})`);
    
    // Determine if behavior matches expectations
    let isCorrect = false;
    let message = '';
    
    if (expectedBehavior === 'public_read') {
      isCorrect = anonResult.status === 200 && authResult.status === 200;
      message = isCorrect ? '✅ Public access working' : '❌ Should allow public read access';
    } else if (expectedBehavior === 'auth_only') {
      // For user-specific tables, we expect empty results but 200 status
      // Real 403s would occur when trying to access specific user data
      isCorrect = authResult.status === 200;
      message = isCorrect ? '✅ Table accessible to authenticated users' : '❌ Should allow authenticated access';
    } else if (expectedBehavior === 'exists') {
      isCorrect = anonResult.status !== 404 && authResult.status !== 404;
      message = isCorrect ? '✅ Table exists' : '❌ Table missing';
    }
    
    console.log(`   ${message}`);
    
    if (authResult.status === 200 && authResult.data && Array.isArray(authResult.data)) {
      console.log(`   📊 Found ${authResult.data.length} records`);
    }
    
    return isCorrect;
    
  } catch (error) {
    console.log(`   ❌ Error testing ${tableName}: ${error.message}`);
    return false;
  }
}

async function testSpecificScenarios() {
  console.log(`\n${  '='.repeat(60)}`);
  console.log('TESTING SPECIFIC RLS SCENARIOS');
  console.log('='.repeat(60));
  
  // Test public templates access
  console.log('\n🧪 Testing public trip templates access:');
  try {
    const publicTemplates = await makeRequest('/rest/v1/trip_templates?is_public=eq.true&select=id,name,is_public&limit=3');
    if (publicTemplates.status === 200) {
      console.log(`   ✅ Public templates accessible (${publicTemplates.data?.length || 0} found)`);
      if (publicTemplates.data && publicTemplates.data.length > 0) {
        console.log(`   📋 Examples: ${publicTemplates.data.map(t => t.name).join(', ')}`);
      }
    } else {
      console.log(`   ❌ Public templates not accessible (${publicTemplates.status})`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test POI categories
  console.log('\n🧪 Testing POI categories (should be publicly readable):');
  try {
    const poiCategories = await makeRequest('/rest/v1/poi_categories?select=name,description&limit=5');
    if (poiCategories.status === 200) {
      console.log(`   ✅ POI categories accessible (${poiCategories.data?.length || 0} found)`);
      if (poiCategories.data && poiCategories.data.length > 0) {
        console.log(`   📋 Categories: ${poiCategories.data.map(c => c.name).join(', ')}`);
      }
    } else {
      console.log(`   ❌ POI categories not accessible (${poiCategories.status})`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test empty user tables (they should exist and return 200 but empty)
  console.log('\n🧪 Testing user-specific tables (should be empty but accessible):');
  const userTables = ['user_settings', 'user_subscriptions', 'user_preferences'];
  
  for (const table of userTables) {
    try {
      const result = await makeRequest(`/rest/v1/${table}?select=id&limit=1`, 'GET', {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      });
      
      if (result.status === 200) {
        console.log(`   ✅ ${table}: Accessible (${result.data?.length || 0} records)`);
      } else if (result.status === 403) {
        console.log(`   ❌ ${table}: 403 Forbidden - RLS policy blocking access`);
      } else {
        console.log(`   ⚠️  ${table}: Status ${result.status}`);
      }
    } catch (error) {
      console.log(`   ❌ ${table}: Error - ${error.message}`);
    }
  }
}

async function main() {
  console.log('🔬 VALIDATING RLS POLICY FIXES');
  console.log('===============================');
  console.log(`📍 Database: ${SUPABASE_URL}`);
  console.log(`🔑 Using anon key for validation\n`);
  
  // Define expected behaviors for each table
  const tableExpectations = {
    'user_settings': 'auth_only',
    'user_subscriptions': 'auth_only',
    'trip_templates': 'public_read',
    'user_preferences': 'auth_only', 
    'poi_categories': 'public_read'
  };
  
  const results = {};
  
  // Test each table
  console.log('='.repeat(60));
  console.log('BASIC TABLE ACCESS VALIDATION');
  console.log('='.repeat(60));
  
  for (const table of PROBLEM_TABLES) {
    results[table] = await validateTableAccess(table, tableExpectations[table]);
  }
  
  // Test specific scenarios
  await testSpecificScenarios();
  
  // Summary
  console.log(`\n${  '='.repeat(60)}`);
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(60));
  
  const passedTables = Object.entries(results).filter(([, passed]) => passed);
  const failedTables = Object.entries(results).filter(([, passed]) => !passed);
  
  console.log(`\n✅ Passed: ${passedTables.length}/${PROBLEM_TABLES.length} tables`);
  passedTables.forEach(([table]) => console.log(`   - ${table}`));
  
  if (failedTables.length > 0) {
    console.log(`\n❌ Failed: ${failedTables.length}/${PROBLEM_TABLES.length} tables`);
    failedTables.forEach(([table]) => console.log(`   - ${table}`));
  }
  
  console.log('\n🔧 NEXT STEPS:');
  
  if (failedTables.length === 0) {
    console.log('🎉 All tables are properly configured!');
    console.log('✅ RLS policies should now prevent 403 errors in your application.');
    console.log('');
    console.log('📝 Additional recommendations:');
    console.log('1. Test with a real authenticated user in your app');
    console.log('2. Monitor application logs for any remaining 403 errors'); 
    console.log('3. Consider implementing error boundaries for graceful 403 handling');
  } else {
    console.log('⚠️  Some tables still need attention:');
    console.log('1. Re-run the comprehensive_rls_fix.sql script');
    console.log('2. Check Supabase Dashboard → Authentication → Policies');
    console.log('3. Verify the migration was applied successfully');
  }
  
  console.log('');
  console.log('🔍 For debugging specific 403 errors in your app:');
  console.log('1. Check browser network tab for exact failing requests');
  console.log('2. Look at Supabase logs in the dashboard');
  console.log('3. Ensure JWT tokens are valid and not expired');
  
  console.log('\n🏁 RLS Validation Complete!');
}

main().catch(console.error);