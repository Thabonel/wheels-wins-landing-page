#!/usr/bin/env node

import https from 'https';

const SUPABASE_URL = 'https://kycoklimpzkyrecbjecn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Y29rbGltcHpreXJlY2JqZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNTU4MDAsImV4cCI6MjA2MTgzMTgwMH0.nRZhYxImQ0rOlh0xZjHcdVq2Q2NY0v-9W3wciaxV2EA';

// Tables that need RLS fixes
const PROBLEM_TABLES = [
  'user_settings',
  'user_subscriptions', 
  'trip_templates',
  'user_preferences',
  'poi_categories'
];

/**
 * Make a REST API request to Supabase
 */
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
      path: path,
      method: method,
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

/**
 * Test table access
 */
async function testTableAccess(tableName, withAuth = false) {
  console.log(`\n🔍 Testing access to ${tableName} (${withAuth ? 'authenticated' : 'anonymous'})...`);
  
  try {
    const headers = withAuth ? { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } : {};
    const path = `/rest/v1/${tableName}?select=*&limit=1`;
    
    const result = await makeRequest(path, 'GET', headers);
    
    if (result.status === 200) {
      console.log(`✅ ${tableName}: Access granted (${result.status})`);
      if (result.data && Array.isArray(result.data)) {
        console.log(`   Found ${result.data.length} records`);
      }
      return true;
    } else if (result.status === 403) {
      console.log(`❌ ${tableName}: Access denied (403 - RLS policy issue)`);
      console.log(`   Error: ${result.data?.message || result.data || 'No details'}`);
      return false;
    } else if (result.status === 404) {
      console.log(`⚠️  ${tableName}: Table not found (404)`);
      return null; // Table doesn't exist
    } else {
      console.log(`⚠️  ${tableName}: Unexpected status ${result.status}`);
      console.log(`   Response: ${result.data?.message || result.data || 'No details'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${tableName}: Request failed - ${error.message}`);
    return false;
  }
}

/**
 * Get table schema information
 */
async function getTableInfo(tableName) {
  console.log(`\n📊 Getting schema info for ${tableName}...`);
  
  try {
    // Use the Supabase API to get table information
    const path = `/rest/v1/${tableName}`;
    const result = await makeRequest(path, 'HEAD');
    
    console.log(`Status: ${result.status}`);
    console.log(`Headers:`, Object.keys(result.headers).filter(h => 
      h.includes('content-') || h.includes('accept-') || h.includes('vary')
    ).map(h => `${h}: ${result.headers[h]}`));
    
    return result.status === 200 || result.status === 206;
  } catch (error) {
    console.log(`❌ Failed to get table info: ${error.message}`);
    return false;
  }
}

/**
 * Execute SQL via Supabase RPC
 */
async function executeSQL(sql, description = '') {
  console.log(`\n🔧 ${description || 'Executing SQL'}...`);
  console.log(`SQL: ${sql.substring(0, 100)}...`);
  
  try {
    // We can't directly execute SQL via REST API without service key
    // So we'll use the stored procedure approach if available
    console.log('⚠️  Note: Cannot execute raw SQL via anon key. Would need service role key.');
    return false;
  } catch (error) {
    console.log(`❌ SQL execution failed: ${error.message}`);
    return false;
  }
}

/**
 * Check if a table has any policies
 */
async function checkPolicies(tableName) {
  console.log(`\n🛡️  Checking RLS policies for ${tableName}...`);
  
  // Try to access with different permission levels to infer policy existence
  const anonymous = await testTableAccess(tableName, false);
  const authenticated = await testTableAccess(tableName, true);
  
  if (anonymous === null) {
    console.log(`   Table ${tableName} does not exist`);
    return 'missing';
  } else if (anonymous === true && authenticated === true) {
    console.log(`   ${tableName} allows both anonymous and authenticated access`);
    return 'permissive';
  } else if (anonymous === false && authenticated === true) {
    console.log(`   ${tableName} requires authentication (good for user tables)`);
    return 'auth_required';
  } else if (anonymous === false && authenticated === false) {
    console.log(`   ${tableName} blocks all access (may need policy fixes)`);
    return 'blocked';
  } else {
    console.log(`   ${tableName} has unusual access pattern`);
    return 'unusual';
  }
}

/**
 * Generate SQL to fix RLS policies for each table type
 */
function generateFixSQL() {
  return {
    user_settings: `
-- Fix user_settings RLS policies
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;

-- Create new policies
CREATE POLICY "Users can read their own settings"
ON public.user_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.user_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
`,
    
    user_subscriptions: `
-- Fix user_subscriptions RLS policies
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can manage their own subscription" ON public.user_subscriptions;

-- Create new policies
CREATE POLICY "Users can read their own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own subscription"
ON public.user_subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
`,

    trip_templates: `
-- Fix trip_templates RLS policies
ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage own templates" ON public.trip_templates;
DROP POLICY IF EXISTS "Users can view public templates" ON public.trip_templates;
DROP POLICY IF EXISTS "Anyone can view public templates" ON public.trip_templates;

-- Create new policies
CREATE POLICY "Users can manage own templates"
ON public.trip_templates
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public templates"
ON public.trip_templates
FOR SELECT
TO authenticated, anon
USING (is_public = true);

-- Grant permissions
GRANT SELECT ON public.trip_templates TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.trip_templates TO authenticated;
`,

    user_preferences: `
-- Create user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;

-- Create new policies
CREATE POLICY "Users can manage their own preferences"
ON public.user_preferences
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
`,

    poi_categories: `
-- Create poi_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.poi_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.poi_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read poi categories" ON public.poi_categories;

-- Create new policies (public read access)
CREATE POLICY "Anyone can read poi categories"
ON public.poi_categories
FOR SELECT
TO authenticated, anon
USING (is_active = true);

-- Grant permissions
GRANT SELECT ON public.poi_categories TO authenticated, anon;
`
  };
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting RLS Policy Check and Fix for Supabase Tables\n');
  console.log(`📍 Database: ${SUPABASE_URL}`);
  console.log(`🔑 Using anon key for testing\n`);
  
  const results = {};
  
  // Step 1: Check current state of all tables
  console.log('=' .repeat(60));
  console.log('STEP 1: CHECKING CURRENT TABLE ACCESS');
  console.log('=' .repeat(60));
  
  for (const table of PROBLEM_TABLES) {
    results[table] = await checkPolicies(table);
    await getTableInfo(table);
  }
  
  // Step 2: Show summary
  console.log('\n' + '=' .repeat(60));
  console.log('STEP 2: SUMMARY OF CURRENT STATE');
  console.log('=' .repeat(60));
  
  for (const [table, status] of Object.entries(results)) {
    const statusEmoji = {
      'missing': '❓',
      'permissive': '✅',
      'auth_required': '🔐',
      'blocked': '❌',
      'unusual': '⚠️'
    }[status] || '❓';
    
    console.log(`${statusEmoji} ${table.padEnd(20)} : ${status}`);
  }
  
  // Step 3: Generate fix SQL
  console.log('\n' + '=' .repeat(60));
  console.log('STEP 3: GENERATED SQL FIXES');
  console.log('=' .repeat(60));
  
  const fixSQL = generateFixSQL();
  
  console.log('\n📝 To apply these fixes, run the following SQL in your Supabase SQL Editor:');
  console.log('\n```sql');
  console.log('-- RLS Policy Fixes for 403 Errors');
  console.log('-- Generated by check_and_fix_rls_policies.js');
  console.log('-- Apply these one table at a time and test after each\n');
  
  Object.entries(fixSQL).forEach(([table, sql]) => {
    if (results[table] === 'blocked' || results[table] === 'missing' || results[table] === 'unusual') {
      console.log(`-- ${table.toUpperCase()} FIXES`);
      console.log(sql);
      console.log('');
    }
  });
  
  console.log('```\n');
  
  // Step 4: Recommendations
  console.log('=' .repeat(60));
  console.log('STEP 4: RECOMMENDATIONS');
  console.log('=' .repeat(60));
  
  const blockedTables = Object.entries(results).filter(([, status]) => status === 'blocked');
  const missingTables = Object.entries(results).filter(([, status]) => status === 'missing');
  const workingTables = Object.entries(results).filter(([, status]) => 
    status === 'permissive' || status === 'auth_required');
  
  if (blockedTables.length > 0) {
    console.log(`❌ URGENT: ${blockedTables.length} tables are completely blocked:`);
    blockedTables.forEach(([table]) => console.log(`   - ${table}`));
    console.log('   These need immediate RLS policy fixes.\n');
  }
  
  if (missingTables.length > 0) {
    console.log(`❓ INFO: ${missingTables.length} tables don't exist:`);
    missingTables.forEach(([table]) => console.log(`   - ${table}`));
    console.log('   These might need to be created first.\n');
  }
  
  if (workingTables.length > 0) {
    console.log(`✅ GOOD: ${workingTables.length} tables are working:`);
    workingTables.forEach(([table, status]) => console.log(`   - ${table} (${status})`));
    console.log('   These may still need fine-tuning but basic access works.\n');
  }
  
  console.log('🔧 NEXT STEPS:');
  console.log('1. Copy the SQL fixes above');
  console.log('2. Go to your Supabase Dashboard → SQL Editor');
  console.log('3. Apply fixes one table at a time');
  console.log('4. Test each fix by running this script again');
  console.log('5. Monitor your application logs for remaining 403 errors\n');
  
  console.log('🏁 RLS Policy Analysis Complete!');
}

// Run the script
main().catch(console.error);