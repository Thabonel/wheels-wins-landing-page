import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Load Supabase configuration from environment variables - NO HARDCODED FALLBACKS
let SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
let SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';


// Auto-detect and fix swapped environment variables (common Netlify configuration issue)
const isJWTToken = (value: string) => value.startsWith('eyJ') && value.includes('.');
const isValidURL = (value: string) => {
  try {
    new URL(value);
    return value.includes('supabase.co');
  } catch {
    return false;
  }
};

// Debug logging for staging environment (skip in test environment)
if ((import.meta.env.MODE === 'staging' || (typeof window !== 'undefined' && window.location.hostname.includes('staging'))) && typeof window !== 'undefined') {
  console.log('🔍 Supabase Configuration Debug:', {
    mode: import.meta.env.MODE,
    urlLength: SUPABASE_URL?.length,
    urlFirst20: `${SUPABASE_URL?.substring(0, 20)  }...`,
    urlLast20: `...${  SUPABASE_URL?.substring(SUPABASE_URL.length - 20)}`,
    hasKey: !!SUPABASE_ANON_KEY,
    keyPrefix: `${SUPABASE_ANON_KEY?.substring(0, 10)  }...`,
    urlHasSpaces: SUPABASE_URL?.includes(' '),
    urlHasNewlines: SUPABASE_URL?.includes('\n'),
    urlHasTrailingSlash: SUPABASE_URL?.endsWith('/'),
  });
}

// Check if variables are swapped and auto-correct
if (isJWTToken(SUPABASE_URL) && isValidURL(SUPABASE_ANON_KEY)) {
  console.warn('🔄 Detected swapped Supabase environment variables - auto-correcting...');
  const temp = SUPABASE_URL;
  SUPABASE_URL = SUPABASE_ANON_KEY;
  SUPABASE_ANON_KEY = temp;
}

// Clean up URL formatting issues
if (SUPABASE_URL) {
  SUPABASE_URL = SUPABASE_URL.trim().replace(/\/$/, ''); // Remove whitespace and trailing slash
  if (SUPABASE_URL.includes(' ') || SUPABASE_URL.includes('\n')) {
    console.error('⚠️ Supabase URL contains whitespace or newlines - this will cause authentication to fail');
  }
}

// Enhanced validation with better error messaging for Netlify deployment debugging
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const envVars = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'undefined',
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '[REDACTED]' : 'undefined',
    MODE: import.meta.env.MODE,
    PROD: import.meta.env.PROD,
    DEV: import.meta.env.DEV
  };
  
  console.error('Supabase Environment Variables Check:', envVars);
  
  throw new Error(
    `Missing required Supabase environment variables for ${import.meta.env.MODE} mode. ` +
    `VITE_SUPABASE_URL: ${SUPABASE_URL ? 'SET' : 'MISSING'}, ` +
    `VITE_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? 'SET' : 'MISSING'}. ` +
    'Please configure these in your Netlify site environment variables.'
  );
}

// Additional URL validation to catch invalid URLs before Supabase client creation
if (!isValidURL(SUPABASE_URL)) {
  console.error('Invalid VITE_SUPABASE_URL:', SUPABASE_URL);
  throw new Error(`Invalid VITE_SUPABASE_URL: "${SUPABASE_URL}". Please provide a valid Supabase URL.`);
}

// Create the supabase client optimized for minimal JWT size (SaaS best practice)
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'pam-auth-token',
      // Optimize JWT claims for minimal size
      detectSessionInUrl: false, // Reduce auth metadata
      flowType: 'pkce', // Use more efficient flow
      debug: import.meta.env.MODE === 'development', // Enable debug logging in dev
    },
    realtime: {
      params: {
        eventsPerSecond: 10, // Reduce for mobile
      },
    },
    global: {
      headers: {
        'X-Client-Info': 'pam-mobile',
      },
    }
    // Removed db.schema to allow access to all schemas (public, storage, etc.)
    // This fixes: "relation 'objects' does not exist" error when uploading to storage
  }
);

// Add auth debugging for development
if (import.meta.env.MODE === 'development' || import.meta.env.MODE === 'staging') {
  console.log('🔧 Supabase Client Configuration:', {
    url: SUPABASE_URL,
    hasAnonKey: !!SUPABASE_ANON_KEY,
    keyPrefix: `${SUPABASE_ANON_KEY?.substring(0, 10)  }...`,
    authStorageKey: 'pam-auth-token',
    flowType: 'pkce'
  });

  // Monitor auth state changes in Supabase client
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('📡 Supabase Auth State Change:', {
      event,
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      tokenExpiry: session?.expires_at,
      userId: session?.user?.id,
      timestamp: new Date().toISOString()
    });

    // Log JWT token details for debugging auth.uid() issues
    if (session?.access_token) {
      try {
        // Decode JWT header to check if it's properly formatted
        const parts = session.access_token.split('.');
        if (parts.length === 3) {
          const header = JSON.parse(atob(parts[0]));
          const payload = JSON.parse(atob(parts[1]));

          console.log('🔍 JWT Debug:', {
            algorithm: header.alg,
            type: header.typ,
            issuer: payload.iss,
            subject: payload.sub,
            audience: payload.aud,
            role: payload.role,
            expirationTime: new Date(payload.exp * 1000).toISOString(),
            issuedAt: new Date(payload.iat * 1000).toISOString(),
            claims: Object.keys(payload)
          });

          // Check if the JWT contains the required claims for auth.uid()
          if (!payload.sub) {
            console.error('❌ JWT missing "sub" claim - this will cause auth.uid() to return null');
          }
          if (!payload.role) {
            console.error('❌ JWT missing "role" claim - this may cause permission issues');
          }
          // Enhanced role detection with proper admin role support
          if (payload.role === 'admin') {
            console.info('🔐 JWT role is "admin" - this is supported and will work with database RLS policies');
            console.info('📊 Admin role provides equivalent access to "authenticated" role for user data');
          } else if (payload.role === 'authenticated') {
            console.info('🔐 JWT role is "authenticated" - standard user role');
          } else if (payload.role !== 'service_role' && payload.role !== 'anon') {
            console.warn('⚠️ JWT role is unexpected:', payload.role);
            console.warn('💡 Expected roles: "authenticated", "admin", "service_role", or "anon"');
          }
        } else {
          console.error('❌ Invalid JWT format - token does not have 3 parts');
        }
      } catch (error) {
        console.error('❌ Failed to decode JWT token:', error);
      }
    } else {
      console.log('⚠️ No access token in session');
    }
  });
}

export default supabase;
