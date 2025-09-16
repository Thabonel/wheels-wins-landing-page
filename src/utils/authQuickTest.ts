/**
 * Quick Auth Test - Minimal test to isolate auth.uid() issue
 * This helps identify if the issue is configuration vs code
 */

import { supabase } from '@/integrations/supabase/client';

export async function quickAuthTest(): Promise<{
  step: string;
  success: boolean;
  details: any;
  error?: string;
}[]> {
  const results: {
    step: string;
    success: boolean;
    details: any;
    error?: string;
  }[] = [];

  console.log('🧪 Starting Quick Auth Test...');

  // Step 1: Check if we can get a session
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    results.push({
      step: '1. Get Session',
      success: !error && !!session,
      details: {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasToken: !!session?.access_token,
        userId: session?.user?.id,
        email: session?.user?.email
      },
      error: error?.message
    });
  } catch (err) {
    results.push({
      step: '1. Get Session',
      success: false,
      details: null,
      error: err.message
    });
  }

  // Step 2: Test basic database connection (no RLS)
  try {
    const { data, error } = await supabase
      .from('trip_templates')
      .select('id')
      .limit(1);

    results.push({
      step: '2. Basic DB Connection',
      success: !error,
      details: { data, rowCount: data?.length || 0 },
      error: error?.message
    });
  } catch (err) {
    results.push({
      step: '2. Basic DB Connection',
      success: false,
      details: null,
      error: err.message
    });
  }

  // Step 3: Test RLS-protected table (this should fail if auth.uid() is null)
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    results.push({
      step: '3. RLS Protected Table',
      success: !error,
      details: { data, rowCount: data?.length || 0 },
      error: error?.message
    });
  } catch (err) {
    results.push({
      step: '3. RLS Protected Table',
      success: false,
      details: null,
      error: err.message
    });
  }

  // Step 4: Test custom RPC function if it exists
  try {
    const { data, error } = await supabase
      .rpc('get_user_id_alternative');

    results.push({
      step: '4. Alternative Auth Function',
      success: !error,
      details: { userId: data },
      error: error?.message
    });
  } catch (err) {
    results.push({
      step: '4. Alternative Auth Function',
      success: false,
      details: null,
      error: err.message
    });
  }

  // Step 5: Test with explicit user filtering (should work with temp policies)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id')
        .eq('user_id', session.user.id)
        .limit(1);

      results.push({
        step: '5. Explicit User Filter',
        success: !error,
        details: { data, userMatches: data?.[0]?.user_id === session.user.id },
        error: error?.message
      });
    } else {
      results.push({
        step: '5. Explicit User Filter',
        success: false,
        details: null,
        error: 'No session or user ID available'
      });
    }
  } catch (err) {
    results.push({
      step: '5. Explicit User Filter',
      success: false,
      details: null,
      error: err.message
    });
  }

  console.log('🧪 Quick Auth Test Results:', results);
  return results;
}

/**
 * Environment check - verify we're using the right configuration
 */
export function checkEnvironment(): {
  environment: string;
  supabaseUrl: string;
  isLocalhost: boolean;
  isStaging: boolean;
  isProduction: boolean;
  hasAnonKey: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const hostname = window.location.hostname;

  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isStaging = hostname.includes('staging') || hostname.includes('netlify');
  const isProduction = hostname.includes('wheelsandwins.com');

  const supabaseUrl = supabase.supabaseUrl;

  // Check for potential mismatches
  if (isStaging && !supabaseUrl.includes('staging') && !supabaseUrl.includes('localhost')) {
    warnings.push('Staging site might be using production Supabase URL');
  }

  if (isProduction && supabaseUrl.includes('staging')) {
    warnings.push('Production site using staging Supabase URL');
  }

  if (!supabase.supabaseKey || supabase.supabaseKey.length < 100) {
    warnings.push('Supabase anonymous key seems too short or missing');
  }

  return {
    environment: isProduction ? 'production' : isStaging ? 'staging' : isLocalhost ? 'development' : 'unknown',
    supabaseUrl,
    isLocalhost,
    isStaging,
    isProduction,
    hasAnonKey: !!supabase.supabaseKey,
    warnings
  };
}

/**
 * Complete quick diagnosis
 */
export async function runQuickDiagnosis(): Promise<void> {
  console.log('\n🔬 QUICK AUTH DIAGNOSIS');
  console.log('========================');

  // Environment check
  const env = checkEnvironment();
  console.log('\n🌍 Environment:', env);

  if (env.warnings.length > 0) {
    console.log('\n⚠️  Environment Warnings:');
    env.warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  // Auth tests
  const testResults = await quickAuthTest();

  console.log('\n📊 Test Results:');
  testResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.step}`);
    if (!result.success && result.error) {
      console.log(`      Error: ${result.error}`);
    }
  });

  // Analysis
  const sessionTest = testResults.find(r => r.step.includes('Session'));
  const rlsTest = testResults.find(r => r.step.includes('RLS Protected'));
  const altTest = testResults.find(r => r.step.includes('Alternative'));

  console.log('\n🔍 Analysis:');

  if (!sessionTest?.success) {
    console.log('   ❌ PRIMARY ISSUE: Cannot get session - user needs to sign in');
  } else if (!rlsTest?.success && rlsTest?.error?.includes('42501')) {
    console.log('   ❌ PRIMARY ISSUE: RLS permission denied - auth.uid() returning null');
    if (altTest?.success) {
      console.log('   ✅ Alternative auth function works - use as workaround');
    }
  } else if (rlsTest?.success) {
    console.log('   ✅ RLS is working - auth.uid() seems to be functional');
    console.log('   💡 Original issue may be resolved');
  }

  console.log('========================\n');
}