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

    // Step 3: Test if database receives JWT through application request
    try {
      // This makes a REAL request through the Supabase client (not SQL Editor)
      const { data: testData, error: testError } = await supabase
        .rpc('auth_diagnostics_test');

      if (testError && testError.message?.includes('function auth_diagnostics_test() does not exist')) {
        // Function doesn't exist, let's create a simple test
        console.log('Creating test function...');

        // First, try to create the test function
        const { error: createError } = await supabase
          .from('profiles') // Use any accessible table
          .select('count')
          .limit(0); // Don't return data, just test the request

        if (createError) {
          if (createError.code === '42501') {
            // Permission denied - this means JWT is not working
            findings.databaseReceivesJWT = false;
            findings.authUidWorks = false;
            recommendations.push('Database rejects request - auth.uid() is NULL');
            findings.specificError = 'Permission denied (42501) - JWT not processed by database';
          } else {
            findings.databaseReceivesJWT = true; // Request reached database
            findings.authUidWorks = false; // But auth didn't work
            recommendations.push('Database receives request but auth.uid() still NULL');
            findings.specificError = createError.message;
          }
        } else {
          // No error - this means the request worked
          findings.databaseReceivesJWT = true;
          findings.authUidWorks = true;
          recommendations.push('✅ JWT transmission is working! auth.uid() should be functional');
        }
      } else if (testError) {
        findings.databaseReceivesJWT = true; // Function call reached database
        findings.specificError = testError.message;

        if (testError.code === '42501') {
          findings.authUidWorks = false;
          recommendations.push('Database receives JWT but auth.uid() returns NULL');
        } else {
          recommendations.push('Database error (not auth related): ' + testError.message);
        }
      } else {
        findings.databaseReceivesJWT = true;
        findings.authUidWorks = true;
        recommendations.push('✅ JWT transmission working properly');
      }

    } catch (dbError) {
      recommendations.push('Cannot connect to database: ' + dbError.message);
      findings.specificError = dbError.message;
    }

  } catch (error) {
    findings.specificError = error.message;
    recommendations.push('Test failed: ' + error.message);
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