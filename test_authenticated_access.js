#!/usr/bin/env node

import https from 'https';

const SUPABASE_URL = 'https://kycoklimpzkyrecbjecn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Y29rbGltcHpreXJlY2JqZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNTU4MDAsImV4cCI6MjA2MTgzMTgwMH0.nRZhYxImQ0rOlh0xZjHcdVq2Q2NY0v-9W3wciaxV2EA';

/**
 * Test authenticated user access patterns that typically cause 403s
 */
async function testAuthenticatedScenarios() {
  const testCases = [
    {
      name: "User Settings for Authenticated User",
      table: "user_settings",
      filter: "user_id=eq.auth.uid()",
      description: "Should return settings for authenticated user only"
    },
    {
      name: "User Subscriptions for Authenticated User", 
      table: "user_subscriptions",
      filter: "user_id=eq.auth.uid()",
      description: "Should return subscriptions for authenticated user only"
    },
    {
      name: "Trip Templates - Public Only",
      table: "trip_templates", 
      filter: "is_public=eq.true",
      description: "Should return public trip templates for any user"
    },
    {
      name: "Trip Templates - User's Own",
      table: "trip_templates",
      filter: "user_id=eq.auth.uid()",
      description: "Should return user's own trip templates"
    },
    {
      name: "User Settings - Insert Test",
      table: "user_settings",
      method: "POST",
      data: {
        user_id: "auth.uid()", // This won't work without a real user, but tests the policy
        setting_name: "test_setting",
        setting_value: {"test": true}
      },
      description: "Test if authenticated users can insert their own settings"
    }
  ];

  console.log('🧪 Testing Authenticated Access Scenarios\n');
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    console.log(`   Description: ${testCase.description}`);
    
    try {
      let path = `/rest/v1/${testCase.table}`;
      if (testCase.filter) {
        path += `?${testCase.filter}&select=*&limit=5`;
      }
      
      const options = {
        hostname: 'kycoklimpzkyrecbjecn.supabase.co',
        port: 443,
        path: path,
        method: testCase.method || 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      };

      const result = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = data ? JSON.parse(data) : null;
              resolve({ status: res.statusCode, data: parsed, headers: res.headers });
            } catch (e) {
              resolve({ status: res.statusCode, data: data, headers: res.headers, parseError: e.message });
            }
          });
        });
        
        req.on('error', reject);
        
        if (testCase.data) {
          req.write(JSON.stringify(testCase.data));
        }
        
        req.end();
      });

      // Analyze the result
      if (result.status === 200 || result.status === 201) {
        console.log(`   ✅ Status: ${result.status} - Request successful`);
        if (Array.isArray(result.data)) {
          console.log(`   📊 Returned ${result.data.length} records`);
        } else if (result.data) {
          console.log(`   📊 Returned data:`, Object.keys(result.data));
        }
      } else if (result.status === 403) {
        console.log(`   ❌ Status: 403 - Forbidden (RLS policy blocking)`);
        console.log(`   💡 Error: ${result.data?.message || result.data || 'No details'}`);
      } else if (result.status === 401) {
        console.log(`   🔐 Status: 401 - Unauthorized (authentication issue)`);
        console.log(`   💡 This might be expected for some operations`);
      } else if (result.status === 400) {
        console.log(`   ⚠️  Status: 400 - Bad Request`);
        console.log(`   💡 Error: ${result.data?.message || result.data || 'No details'}`);
      } else {
        console.log(`   ⚠️  Status: ${result.status} - ${result.data?.message || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
  }
}

/**
 * Test the specific RLS filters that should work
 */
async function testRLSFilters() {
  console.log('\n🛡️  Testing RLS Filter Effectiveness\n');
  
  const tables = ['user_settings', 'user_subscriptions', 'trip_templates'];
  
  for (const table of tables) {
    console.log(`\n🔍 Testing ${table} RLS behavior:`);
    
    // Test 1: Anonymous access (should be restricted or show only public data)
    console.log(`   👥 Anonymous access:`);
    try {
      const anonResult = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'kycoklimpzkyrecbjecn.supabase.co',
          port: 443,
          path: `/rest/v1/${table}?select=*&limit=5`,
          method: 'GET',
          headers: {
            'apikey': SUPABASE_ANON_KEY
            // No Authorization header = anonymous
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, data: data });
            }
          });
        });
        req.on('error', reject);
        req.end();
      });
      
      console.log(`      Status: ${anonResult.status}`);
      if (anonResult.status === 200 && Array.isArray(anonResult.data)) {
        console.log(`      Records: ${anonResult.data.length} (should be 0 for user tables, or public only)`);
      }
    } catch (error) {
      console.log(`      Error: ${error.message}`);
    }
    
    // Test 2: Authenticated access with anon token (limited)
    console.log(`   🔐 Authenticated access:`);
    try {
      const authResult = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'kycoklimpzkyrecbjecn.supabase.co',
          port: 443,
          path: `/rest/v1/${table}?select=*&limit=5`,
          method: 'GET',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, data: data });
            }
          });
        });
        req.on('error', reject);
        req.end();
      });
      
      console.log(`      Status: ${authResult.status}`);
      if (authResult.status === 200 && Array.isArray(authResult.data)) {
        console.log(`      Records: ${authResult.data.length}`);
      }
    } catch (error) {
      console.log(`      Error: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Testing Authenticated Access Patterns That May Cause 403 Errors\n');
  
  await testAuthenticatedScenarios();
  await testRLSFilters();
  
  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(60));
  
  console.log('\n💡 Key Insights:');
  console.log('• If you see 403 errors above, the RLS policies need fixing');
  console.log('• If anonymous users can access user-specific data, policies are too permissive');
  console.log('• The anon key cannot simulate real authenticated user access');
  console.log('• Real 403s would happen when authenticated users try to access their own data');
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Apply the RLS fixes from the previous script');
  console.log('2. Test with a real authenticated user in your app');
  console.log('3. Check application logs for specific 403 error patterns');
  console.log('4. Consider creating a test user account for thorough testing');
}

main().catch(console.error);