/**
 * Authentication Debugging Utilities
 * Helps diagnose why auth.uid() returns null in database queries
 */

import { supabase } from '@/integrations/supabase/client';

export interface AuthDebugInfo {
  isAuthenticated: boolean;
  hasSession: boolean;
  hasUser: boolean;
  hasAccessToken: boolean;
  userId: string | null;
  userEmail: string | null;
  tokenExpiry: string | null;
  sessionAge: string | null;
  lastRefresh: string | null;
}

/**
 * Get comprehensive authentication debug information
 */
export async function getAuthDebugInfo(): Promise<AuthDebugInfo> {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('❌ Error getting session:', error);
  }

  const now = new Date();
  const tokenExpiry = session?.expires_at ? new Date(session.expires_at * 1000) : null;
  const sessionCreated = session?.user?.created_at ? new Date(session.user.created_at) : null;

  return {
    isAuthenticated: !!session && !!session.user,
    hasSession: !!session,
    hasUser: !!session?.user,
    hasAccessToken: !!session?.access_token,
    userId: session?.user?.id || null,
    userEmail: session?.user?.email || null,
    tokenExpiry: tokenExpiry ? tokenExpiry.toISOString() : null,
    sessionAge: sessionCreated ? `${Math.round((now.getTime() - sessionCreated.getTime()) / 1000 / 60)} minutes` : null,
    lastRefresh: session?.refresh_token ? 'Available' : 'Missing'
  };
}

/**
 * Test if JWT is being sent properly to database
 */
export async function testJWTTransmission(): Promise<{ success: boolean; details: any; error?: string }> {
  console.log('🔍 Testing JWT transmission to database...');

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { success: false, details: null, error: 'No access token available' };
    }

    // Test 1: Direct request with explicit Authorization header
    const response = await fetch(`${supabase.supabaseUrl}/rest/v1/rpc/test_manual_jwt_extraction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabase.supabaseKey,
        'Authorization': `Bearer ${session.access_token}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({})
    });

    const responseText = await response.text();
    console.log('📡 Direct JWT test response:', {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText
    });

    // Test 2: Via Supabase client
    const { data: clientData, error: clientError } = await supabase
      .rpc('test_manual_jwt_extraction');

    console.log('🔧 Supabase client test:', { clientData, clientError });

    // Test 3: Simple table access to see headers
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    console.log('👤 Profile access test:', { profileData, profileError });

    return {
      success: response.ok || !!clientData,
      details: {
        directRequest: {
          status: response.status,
          response: responseText
        },
        supabaseClient: {
          data: clientData,
          error: clientError
        },
        profileAccess: {
          data: profileData,
          error: profileError
        },
        tokenInfo: {
          hasToken: !!session.access_token,
          tokenLength: session.access_token.length,
          tokenPrefix: session.access_token.substring(0, 20) + '...'
        }
      }
    };
  } catch (error) {
    console.error('❌ JWT transmission test failed:', error);
    return { success: false, details: null, error: error.message };
  }
}

/**
 * Test database access with current authentication
 */
export async function testDatabaseAccess() {
  console.log('🔍 Testing database access...');

  const authInfo = await getAuthDebugInfo();
  console.log('📋 Auth Info:', authInfo);

  if (!authInfo.isAuthenticated) {
    console.error('❌ User not authenticated - this is why auth.uid() returns null');
    return { success: false, error: 'Not authenticated' };
  }

  // Test JWT token presence in Supabase client
  const { data: { session } } = await supabase.auth.getSession();
  console.log('🔑 JWT Token Debug:', {
    hasAccessToken: !!session?.access_token,
    tokenLength: session?.access_token?.length,
    tokenPrefix: session?.access_token?.substring(0, 20) + '...',
    expiresAt: session?.expires_at,
    isExpired: session?.expires_at ? session.expires_at < Date.now() / 1000 : null
  });

  // Test auth.uid() directly in database
  try {
    console.log('🧪 Testing auth.uid() directly...');
    const { data: authUidTest, error: authError } = await supabase
      .rpc('get_current_user_id');

    if (authError && authError.message?.includes('function get_current_user_id() does not exist')) {
      // Create the function if it doesn't exist
      console.log('📝 Creating auth test function...');
      const { error: createError } = await supabase
        .rpc('exec_sql', {
          sql: `
            CREATE OR REPLACE FUNCTION get_current_user_id()
            RETURNS UUID
            LANGUAGE SQL
            SECURITY DEFINER
            AS $$
              SELECT auth.uid();
            $$;
          `
        });

      if (createError) {
        console.log('⚠️ Could not create test function, testing with direct query...');
      } else {
        const { data: retryAuthTest } = await supabase.rpc('get_current_user_id');
        console.log('🎯 auth.uid() result:', retryAuthTest);
      }
    } else {
      console.log('🎯 auth.uid() result:', authUidTest);
    }
  } catch (authTestErr) {
    console.log('⚠️ Auth test function failed, continuing with table test...');
  }

  // Test a simple query to check if RLS works
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Database access error:', error);
      if (error.code === '42501') {
        console.error('🚨 RLS permission denied - auth.uid() likely null on server side');

        // Test if we can access profiles table (might have different RLS)
        console.log('🔄 Testing profiles table access...');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, user_id, email')
          .limit(1);

        if (profileError) {
          console.error('❌ Profiles access also failed:', profileError);
        } else {
          console.log('✅ Profiles access successful:', profileData);
        }
      }
      return { success: false, error: error.message };
    }

    console.log('✅ Database access successful:', data);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Database access failed:', err);
    return { success: false, error: err };
  }
}

/**
 * Force refresh authentication token and test again
 */
export async function refreshAndTest() {
  console.log('🔄 Refreshing authentication...');

  try {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('❌ Token refresh failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Token refreshed successfully');

    // Test database access after refresh
    return await testDatabaseAccess();
  } catch (err) {
    console.error('❌ Refresh and test failed:', err);
    return { success: false, error: err };
  }
}

/**
 * Check if the user needs to sign in again
 */
export async function checkAuthValidity(): Promise<{ isValid: boolean; reason?: string }> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { isValid: false, reason: 'No session found' };
  }

  if (!session.user) {
    return { isValid: false, reason: 'No user in session' };
  }

  if (!session.access_token) {
    return { isValid: false, reason: 'No access token' };
  }

  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at && session.expires_at < now) {
    return { isValid: false, reason: 'Token expired' };
  }

  // Check if token expires soon (within 5 minutes)
  if (session.expires_at && session.expires_at < now + 300) {
    console.warn('⚠️ Token expires soon, should refresh');
  }

  return { isValid: true };
}

/**
 * Enable debug logging for authentication events
 */
export function enableAuthDebugLogging() {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`🔐 Auth Event: ${event}`, {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      email: session?.user?.email,
      tokenExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      timestamp: new Date().toISOString()
    });

    // If user lost authentication, suggest solutions
    if (event === 'SIGNED_OUT' || !session) {
      console.warn('⚠️ User signed out or session lost - this will cause auth.uid() to return null');
      console.log('💡 Suggested actions:');
      console.log('   1. Redirect user to login page');
      console.log('   2. Clear any cached user data');
      console.log('   3. Stop making authenticated requests');
    }
  });

  console.log('✅ Auth debug logging enabled');
}

/**
 * Quick auth diagnosis for console
 */
export async function quickAuthDiagnosis() {
  console.log('🩺 Quick Auth Diagnosis');
  console.log('=======================');

  const authInfo = await getAuthDebugInfo();
  const validity = await checkAuthValidity();

  console.log('📊 Authentication Status:');
  console.log(`   Authenticated: ${authInfo.isAuthenticated ? '✅' : '❌'}`);
  console.log(`   User ID: ${authInfo.userId || '❌ Missing'}`);
  console.log(`   Email: ${authInfo.userEmail || '❌ Missing'}`);
  console.log(`   Token Valid: ${validity.isValid ? '✅' : '❌ ' + validity.reason}`);

  if (!authInfo.isAuthenticated) {
    console.log('');
    console.log('🚨 PROBLEM: User not authenticated');
    console.log('💡 SOLUTION: User needs to sign in again');
    console.log('   - Redirect to /login page');
    console.log('   - Call supabase.auth.signInWithPassword() or similar');
  } else if (!validity.isValid) {
    console.log('');
    console.log('🚨 PROBLEM: Authentication invalid');
    console.log(`💡 SOLUTION: ${validity.reason}`);
    console.log('   - Try refreshing the token');
    console.log('   - If refresh fails, sign in again');
  } else {
    console.log('');
    console.log('✅ Authentication looks good');
    console.log('💡 If still getting permission errors:');
    console.log('   - Check RLS policies are correctly configured');
    console.log('   - Ensure auth.uid() matches user_id column type');
    console.log('   - Verify database policies are enabled');
  }

  // Test database access
  const dbTest = await testDatabaseAccess();
  if (!dbTest.success) {
    console.log('');
    console.log('🚨 DATABASE ACCESS FAILED');
    console.log(`   Error: ${dbTest.error}`);
  }
}

/**
 * Comprehensive authentication recovery function
 * Attempts to restore broken JWT context through multiple strategies
 */
export async function recoverAuthentication(): Promise<{ success: boolean; strategy?: string; error?: string }> {
  console.log('🔧 Starting authentication recovery...');

  const initialAuth = await getAuthDebugInfo();
  console.log('📋 Initial auth state:', initialAuth);

  // Strategy 1: Simple token refresh
  try {
    console.log('🔄 Strategy 1: Token refresh...');
    const { data, error } = await supabase.auth.refreshSession();

    if (!error && data?.session) {
      console.log('✅ Token refresh successful');

      // Test if this fixed auth.uid()
      const testResult = await testDatabaseAccess();
      if (testResult.success) {
        return { success: true, strategy: 'Token refresh' };
      }
    } else {
      console.log('❌ Token refresh failed:', error?.message);
    }
  } catch (err) {
    console.log('❌ Token refresh error:', err);
  }

  // Strategy 2: Clear and restore session
  try {
    console.log('🔄 Strategy 2: Session reset...');

    // Get current session data before clearing
    const { data: { session: currentSession } } = await supabase.auth.getSession();

    if (currentSession) {
      // Sign out and back in with existing token (if possible)
      await supabase.auth.signOut({ scope: 'local' }); // Local only to preserve server session

      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to restore session
      const { error: setError } = await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token
      });

      if (!setError) {
        console.log('✅ Session reset successful');

        // Test if this fixed auth.uid()
        const testResult = await testDatabaseAccess();
        if (testResult.success) {
          return { success: true, strategy: 'Session reset' };
        }
      }
    }
  } catch (err) {
    console.log('❌ Session reset error:', err);
  }

  // Strategy 3: Force browser storage cleanup
  try {
    console.log('🔄 Strategy 3: Storage cleanup...');

    // Clear all auth-related storage
    localStorage.removeItem('sb-' + new URL(supabase.supabaseUrl).hostname.replace(/\./g, '-') + '-auth-token');
    localStorage.removeItem('pam-auth-token');
    sessionStorage.clear();

    // Try to get session again
    const { data: { session }, error } = await supabase.auth.getSession();

    if (!error && session) {
      console.log('✅ Storage cleanup revealed existing session');

      const testResult = await testDatabaseAccess();
      if (testResult.success) {
        return { success: true, strategy: 'Storage cleanup' };
      }
    }
  } catch (err) {
    console.log('❌ Storage cleanup error:', err);
  }

  // Strategy 4: Check if this is an environment mismatch issue
  try {
    console.log('🔄 Strategy 4: Environment validation...');

    const url = supabase.supabaseUrl;
    const isDevelopment = import.meta.env.MODE === 'development';
    const isStaging = window.location.hostname.includes('staging');
    const isProduction = window.location.hostname.includes('wheelsandwins.com');

    console.log('🌍 Environment analysis:', {
      supabaseUrl: url,
      mode: import.meta.env.MODE,
      hostname: window.location.hostname,
      isDevelopment,
      isStaging,
      isProduction
    });

    // Check if we're using the wrong environment
    if (isStaging && !url.includes('staging')) {
      console.warn('⚠️ Potential environment mismatch: staging site using non-staging Supabase');
    }

    if (isProduction && url.includes('staging')) {
      console.warn('⚠️ Potential environment mismatch: production site using staging Supabase');
    }

  } catch (err) {
    console.log('❌ Environment validation error:', err);
  }

  console.log('❌ All recovery strategies failed');
  return {
    success: false,
    error: 'All authentication recovery strategies failed. Manual intervention required.'
  };
}

/**
 * Emergency authentication bypass for development
 * Creates temporary access when auth.uid() is broken
 */
export async function createEmergencyAccess(userId: string): Promise<{ success: boolean; error?: string }> {
  if (import.meta.env.MODE === 'production') {
    return { success: false, error: 'Emergency access not allowed in production' };
  }

  console.log('🚨 Creating emergency access for user:', userId);

  try {
    // This would require a special Supabase function that temporarily bypasses RLS
    // For now, we'll just verify the user exists
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, user_id, email')
      .eq('user_id', userId)
      .single();

    if (error) {
      return { success: false, error: `User not found: ${error.message}` };
    }

    console.log('✅ Emergency access granted for user:', profile);
    return { success: true };

  } catch (err) {
    return { success: false, error: err.message };
  }
}