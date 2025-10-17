/**
 * JWT Token Transmission Test
 * Tests if JWT tokens are properly sent from frontend to database
 */

import { supabase } from '@/integrations/supabase/client';

export async function testRealJWTTransmission(): Promise<{
  success: boolean;
  findings: {
    hasSession: boolean;
    hasToken: boolean;
    tokenValid: boolean;
    databaseReceivesJWT: boolean;
    authUidWorks: boolean;
    specificError?: string;
  };
  recommendations: string[];
}> {
  console.log('🧪 Testing REAL JWT transmission (not SQL Editor)...');

  const findings = {
    hasSession: false,
    hasToken: false,
    tokenValid: false,
    databaseReceivesJWT: false,
    authUidWorks: false,
    specificError: undefined as string | undefined
  };

  const recommendations: string[] = [];

  try {
    // Step 1: Check if we have a session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    findings.hasSession = !!session && !sessionError;
    findings.hasToken = !!session?.access_token;

    if (!findings.hasSession) {
      recommendations.push('User needs to sign in - no active session');
      return { success: false, findings, recommendations };
    }

    if (!findings.hasToken) {
      recommendations.push('Session exists but no access token - try refreshing session');
      return { success: false, findings, recommendations };
    }

    // Step 2: Validate JWT token format
    try {
      const parts = session!.access_token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        findings.tokenValid = !!(payload.sub && payload.role && payload.exp);

        if (!findings.tokenValid) {
          recommendations.push('JWT token is malformed - missing required claims (sub, role, exp)');
          findings.specificError = `Missing claims: ${['sub', 'role', 'exp'].filter(claim => !payload[claim]).join(', ')}`;
        }
      } else {
        findings.tokenValid = false;
        recommendations.push('JWT token has invalid format - not 3 parts');
        findings.specificError = `Token has ${parts.length} parts instead of 3`;
      }
    } catch (jwtError) {
      findings.tokenValid = false;
      recommendations.push('Cannot decode JWT token');
      findings.specificError = jwtError.message;
    }

    // Step 3: Test if database receives JWT through real application request
    try {
      // Test 1: Try accessing profiles table (has RLS that depends on auth.uid())
      console.log('🔍 Testing auth.uid() with profiles table...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id')
        .limit(1);

      if (profileError) {
        findings.databaseReceivesJWT = true; // Request reached database

        if (profileError.code === '42501') {
          // Permission denied - auth.uid() is NULL
          findings.authUidWorks = false;
          recommendations.push('❌ auth.uid() returns NULL - RLS permission denied on profiles table');
          findings.specificError = 'Permission denied (42501) - auth.uid() is NULL in database context';

          // Test 2: Try a table that might not have RLS
          console.log('🔍 Testing with trip_templates (non-RLS table)...');
          const { data: templateData, error: templateError } = await supabase
            .from('trip_templates')
            .select('id')
            .limit(1);

          if (templateError) {
            recommendations.push('❌ Even non-RLS table access failed - deeper auth issue');
          } else {
            recommendations.push('✅ Non-RLS table works - confirms auth.uid() RLS issue');
          }
        } else {
          findings.authUidWorks = false;
          recommendations.push(`Database error (not auth related): ${  profileError.message}`);
          findings.specificError = profileError.message;
        }
      } else if (profileData) {
        // Success! This means auth.uid() is working
        findings.databaseReceivesJWT = true;
        findings.authUidWorks = true;
        recommendations.push('✅ auth.uid() is working! Retrieved profile data successfully');

        // Test 3: Verify the user ID matches
        if (session?.user?.id && profileData[0]?.user_id === session.user.id) {
          recommendations.push('✅ User ID matches between session and database - auth context is correct');
        } else {
          recommendations.push('⚠️ User ID mismatch between session and database');
        }
      } else {
        // No data but no error - might be empty table
        findings.databaseReceivesJWT = true;
        findings.authUidWorks = true;
        recommendations.push('✅ Database access successful (no data found, but no permission error)');
      }

      // Test 4: Try user_settings table (RLS policies were recently fixed)
      console.log('🔍 Testing auth.uid() with user_settings table...');
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('user_id')
        .limit(1);

      if (settingsError) {
        if (settingsError.code === '42501') {
          recommendations.push('❌ user_settings table RLS permission denied - may need to run CORRECTED Fix script');
        } else {
          recommendations.push(`⚠️ user_settings error: ${settingsError.message}`);
        }
      } else if (settingsData && settingsData.length > 0) {
        recommendations.push('✅ user_settings table accessible with data - RLS policies working correctly');
      } else {
        recommendations.push('✅ user_settings table accessible - RLS policies allow access (no data found)');
      }

    } catch (dbError) {
      findings.databaseReceivesJWT = false;
      recommendations.push(`Cannot connect to database: ${  dbError.message}`);
      findings.specificError = dbError.message;
    }

  } catch (error) {
    findings.specificError = error.message;
    recommendations.push(`Test failed: ${  error.message}`);
  }

  const success = findings.hasSession && findings.hasToken && findings.tokenValid && findings.databaseReceivesJWT;

  console.log('🔍 JWT Transmission Test Results:', { findings, recommendations });

  return { success, findings, recommendations };
}

/**
 * Quick fix attempt for JWT transmission issues
 */
export async function attemptJWTFix(): Promise<{ success: boolean; action: string; error?: string }> {
  console.log('🔧 Attempting JWT transmission fix...');

  try {
    // Strategy 1: Force token refresh
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      return { success: false, action: 'Token refresh failed', error: error.message };
    }

    if (!data.session) {
      return { success: false, action: 'Refresh succeeded but no session', error: 'No session after refresh' };
    }

    // Test if the refresh fixed the issue
    const testResult = await testRealJWTTransmission();

    if (testResult.success) {
      return { success: true, action: 'Token refresh fixed the issue' };
    } else {
      return {
        success: false,
        action: 'Token refresh did not fix JWT transmission',
        error: testResult.findings.specificError
      };
    }

  } catch (error) {
    return { success: false, action: 'Fix attempt failed', error: error.message };
  }
}

/**
 * Create a simple test to verify JWT is working through the application
 */
export async function createJWTTestFunction(): Promise<{ success: boolean; message: string }> {
  console.log('📝 Creating JWT test function...');

  try {
    // Try to access a simple table that should work with RLS
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id')
      .limit(1);

    if (!error) {
      return {
        success: true,
        message: '✅ JWT transmission is working - can access RLS protected table'
      };
    }

    if (error.code === '42501') {
      return {
        success: false,
        message: '❌ JWT transmission broken - permission denied on RLS table (auth.uid() is NULL)'
      };
    }

    return {
      success: false,
      message: `❌ Database error: ${error.message}`
    };

  } catch (err) {
    return {
      success: false,
      message: `❌ Test failed: ${err.message}`
    };
  }
}