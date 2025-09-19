/**
 * Advanced Authentication Investigation
 * Deep dive into why auth.uid() returns null
 */

import { supabase } from '@/integrations/supabase/client';

export interface AuthInvestigationReport {
  clientConfig: {
    url: string;
    hasAnonKey: boolean;
    storageKey: string;
  };
  sessionState: {
    hasSession: boolean;
    hasUser: boolean;
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    tokenExpiry: string | null;
    isExpired: boolean;
  };
  jwtAnalysis: {
    isValidFormat: boolean;
    header?: any;
    payload?: any;
    hasRequiredClaims: boolean;
    missingClaims: string[];
  };
  networkTest: {
    canReachSupabase: boolean;
    responseTime?: number;
    error?: string;
  };
  databaseTest: {
    canConnect: boolean;
    authUidResult: string | null;
    error?: string;
  };
  browserEnvironment: {
    storage: {
      localStorage: boolean;
      sessionStorage: boolean;
      cookies: boolean;
    };
    network: {
      online: boolean;
      connection: string;
    };
    security: {
      isHttps: boolean;
      domain: string;
      isLocalhost: boolean;
    };
  };
}

/**
 * Comprehensive authentication investigation
 */
export async function investigateAuthIssue(): Promise<AuthInvestigationReport> {
  console.log('🕵️ Starting comprehensive authentication investigation...');

  const report: AuthInvestigationReport = {
    clientConfig: {
      url: '',
      hasAnonKey: false,
      storageKey: ''
    },
    sessionState: {
      hasSession: false,
      hasUser: false,
      hasAccessToken: false,
      hasRefreshToken: false,
      tokenExpiry: null,
      isExpired: false
    },
    jwtAnalysis: {
      isValidFormat: false,
      hasRequiredClaims: false,
      missingClaims: []
    },
    networkTest: {
      canReachSupabase: false
    },
    databaseTest: {
      canConnect: false,
      authUidResult: null
    },
    browserEnvironment: {
      storage: {
        localStorage: false,
        sessionStorage: false,
        cookies: false
      },
      network: {
        online: navigator.onLine,
        connection: (navigator as any).connection?.effectiveType || 'unknown'
      },
      security: {
        isHttps: window.location.protocol === 'https:',
        domain: window.location.hostname,
        isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      }
    }
  };

  // 1. Client Configuration Analysis
  try {
    report.clientConfig = {
      url: supabase.supabaseUrl,
      hasAnonKey: !!supabase.supabaseKey,
      storageKey: 'pam-auth-token'
    };
    console.log('✅ Client configuration analyzed');
  } catch (error) {
    console.error('❌ Client configuration analysis failed:', error);
  }

  // 2. Session State Analysis
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('❌ Session retrieval failed:', error);
    } else {
      const now = Math.floor(Date.now() / 1000);
      report.sessionState = {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasAccessToken: !!session?.access_token,
        hasRefreshToken: !!session?.refresh_token,
        tokenExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        isExpired: session?.expires_at ? session.expires_at < now : false
      };
      console.log('✅ Session state analyzed');

      // 3. JWT Analysis
      if (session?.access_token) {
        try {
          const parts = session.access_token.split('.');
          if (parts.length === 3) {
            const header = JSON.parse(atob(parts[0]));
            const payload = JSON.parse(atob(parts[1]));

            report.jwtAnalysis = {
              isValidFormat: true,
              header,
              payload,
              hasRequiredClaims: !!(payload.sub && payload.role && payload.aud),
              missingClaims: []
            };

            // Check for missing required claims
            const requiredClaims = ['sub', 'role', 'aud', 'exp', 'iat'];
            report.jwtAnalysis.missingClaims = requiredClaims.filter(claim => !payload[claim]);

            console.log('✅ JWT analysis completed');
          } else {
            report.jwtAnalysis.isValidFormat = false;
            console.error('❌ JWT has invalid format - not 3 parts');
          }
        } catch (jwtError) {
          console.error('❌ JWT parsing failed:', jwtError);
          report.jwtAnalysis.isValidFormat = false;
        }
      }
    }
  } catch (sessionError) {
    console.error('❌ Session analysis failed:', sessionError);
  }

  // 4. Network Test
  try {
    const startTime = Date.now();
    const response = await fetch(`${supabase.supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabase.supabaseKey,
        'Authorization': `Bearer ${supabase.supabaseKey}`
      }
    });

    report.networkTest = {
      canReachSupabase: response.ok,
      responseTime: Date.now() - startTime
    };

    if (!response.ok) {
      report.networkTest.error = `HTTP ${response.status}: ${response.statusText}`;
    }

    console.log('✅ Network test completed');
  } catch (networkError) {
    report.networkTest = {
      canReachSupabase: false,
      error: networkError.message
    };
    console.error('❌ Network test failed:', networkError);
  }

  // 5. Database Test
  try {
    // Test basic connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);

    if (error) {
      report.databaseTest = {
        canConnect: false,
        authUidResult: null,
        error: error.message
      };
    } else {
      report.databaseTest.canConnect = true;

      // Test auth.uid() function
      try {
        const { data: authData, error: authError } = await supabase
          .rpc('get_current_user_id')
          .single();

        if (authError) {
          report.databaseTest.authUidResult = `ERROR: ${authError.message}`;
        } else {
          report.databaseTest.authUidResult = authData || 'NULL';
        }
      } catch {
        // Function might not exist, that's ok
        report.databaseTest.authUidResult = 'FUNCTION_NOT_FOUND';
      }
    }

    console.log('✅ Database test completed');
  } catch (dbError) {
    report.databaseTest = {
      canConnect: false,
      authUidResult: null,
      error: dbError.message
    };
    console.error('❌ Database test failed:', dbError);
  }

  // 6. Browser Environment Analysis
  try {
    report.browserEnvironment.storage = {
      localStorage: typeof localStorage !== 'undefined' && localStorage.getItem('test') === null,
      sessionStorage: typeof sessionStorage !== 'undefined',
      cookies: navigator.cookieEnabled
    };

    // Test localStorage
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      report.browserEnvironment.storage.localStorage = true;
    } catch {
      report.browserEnvironment.storage.localStorage = false;
    }

    console.log('✅ Browser environment analyzed');
  } catch (envError) {
    console.error('❌ Browser environment analysis failed:', envError);
  }

  console.log('📊 Authentication Investigation Report:', report);
  return report;
}

/**
 * Generate human-readable diagnosis from investigation report
 */
export function generateAuthDiagnosis(report: AuthInvestigationReport): string[] {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check client configuration
  if (!report.clientConfig.hasAnonKey) {
    issues.push('Missing or invalid Supabase anonymous key');
    recommendations.push('Verify VITE_SUPABASE_ANON_KEY environment variable');
  }

  // Check session state
  if (!report.sessionState.hasSession) {
    issues.push('No active session found');
    recommendations.push('User needs to sign in');
  } else if (!report.sessionState.hasAccessToken) {
    issues.push('Session exists but missing access token');
    recommendations.push('Try refreshing the session');
  } else if (report.sessionState.isExpired) {
    issues.push('Access token has expired');
    recommendations.push('Refresh the token automatically');
  }

  // Check JWT
  if (report.sessionState.hasAccessToken && !report.jwtAnalysis.isValidFormat) {
    issues.push('JWT token has invalid format');
    recommendations.push('Clear browser storage and sign in again');
  } else if (report.jwtAnalysis.missingClaims.length > 0) {
    issues.push(`JWT missing required claims: ${report.jwtAnalysis.missingClaims.join(', ')}`);
    recommendations.push('Check Supabase project JWT configuration');
  }

  // Check network
  if (!report.networkTest.canReachSupabase) {
    issues.push('Cannot reach Supabase servers');
    recommendations.push('Check internet connection and Supabase URL');
  }

  // Check database
  if (!report.databaseTest.canConnect) {
    issues.push('Cannot connect to database');
    recommendations.push('Check database availability and permissions');
  } else if (report.databaseTest.authUidResult === 'NULL') {
    issues.push('auth.uid() returns NULL - this is the core issue');
    recommendations.push('Check JWT secret configuration in Supabase dashboard');
  }

  // Check browser environment
  if (!report.browserEnvironment.storage.localStorage) {
    issues.push('localStorage not available');
    recommendations.push('Enable localStorage in browser settings');
  }

  if (!report.browserEnvironment.security.isHttps && !report.browserEnvironment.security.isLocalhost) {
    issues.push('Not using HTTPS - may cause auth issues');
    recommendations.push('Use HTTPS in production');
  }

  return [...issues.map(i => `❌ ${i}`), ...recommendations.map(r => `💡 ${r}`)];
}

/**
 * Quick investigation and diagnosis
 */
export async function quickAuthInvestigation(): Promise<void> {
  const report = await investigateAuthIssue();
  const diagnosis = generateAuthDiagnosis(report);

  console.log('\n🩺 AUTHENTICATION DIAGNOSIS');
  console.log('==========================');
  diagnosis.forEach(item => console.log(item));
  console.log('==========================\n');
}