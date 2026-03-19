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
    urlFirst20: `${SUPABASE_URL?.substring(0, 20)}...`,
    urlLast20: `...${SUPABASE_URL?.substring(SUPABASE_URL.length - 20)}`,
    hasKey: !!SUPABASE_ANON_KEY,
    keyPrefix: `${SUPABASE_ANON_KEY?.substring(0, 10)}...`,
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

// PWA detection utilities
const isPWAStandalone = (): boolean => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true ||
    ((window.navigator as any).standalone === true)
  );
};

const isIOSDevice = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

// Detect PWA authentication isolation issue
const isPWAWithStorageIsolation = (): boolean => {
  return isPWAStandalone() && isIOSDevice();
};

// Lazy initialization with retry logic
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

function createSupabaseClient(): ReturnType<typeof createClient<Database>> {
  initializationAttempts++;

  // Reload environment variables on each attempt (handles race conditions)
  const currentURL = import.meta.env.VITE_SUPABASE_URL || '';
  const currentKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  console.log(`🚀 Supabase client initialization attempt ${initializationAttempts}`, {
    hasURL: !!currentURL,
    hasKey: !!currentKey,
    urlLength: currentURL.length,
    keyLength: currentKey.length
  });

  // Enhanced validation with better error messaging for Netlify deployment debugging
  if (!currentURL || !currentKey) {
    const envVars = {
      VITE_SUPABASE_URL: currentURL || 'undefined',
      VITE_SUPABASE_ANON_KEY: currentKey ? '[REDACTED]' : 'undefined',
      MODE: import.meta.env.MODE,
      PROD: import.meta.env.PROD,
      DEV: import.meta.env.DEV,
      attempt: initializationAttempts
    };

    console.error('Supabase Environment Variables Check:', envVars);

    throw new Error(
      `Missing required Supabase environment variables for ${import.meta.env.MODE} mode (attempt ${initializationAttempts}/${MAX_INIT_ATTEMPTS}). ` +
      `VITE_SUPABASE_URL: ${currentURL ? 'SET' : 'MISSING'}, ` +
      `VITE_SUPABASE_ANON_KEY: ${currentKey ? 'SET' : 'MISSING'}. ` +
      'Please configure these in your Netlify site environment variables.'
    );
  }

  // Additional URL validation to catch invalid URLs before Supabase client creation
  if (!isValidURL(currentURL)) {
    console.error('Invalid VITE_SUPABASE_URL:', currentURL);
    throw new Error(`Invalid VITE_SUPABASE_URL: "${currentURL}". Please provide a valid Supabase URL.`);
  }

  // PWA storage configuration - handle iOS PWA localStorage isolation
  const isPWAIsolated = isPWAWithStorageIsolation();
  let authConfig: any = {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'pam-auth-token',
    // Optimize JWT claims for minimal size
    detectSessionInUrl: false, // Reduce auth metadata
    flowType: 'pkce', // Use more efficient flow
    debug: import.meta.env.MODE === 'development' || isPWAIsolated, // Enable debug logging in dev and PWA
  };

  // For iOS PWA, use hybrid storage to survive modal operations while maintaining PWA isolation
  if (isPWAIsolated) {
    console.warn('🔍 PWA storage isolation detected - using hybrid memory+sessionStorage auth storage');

    // Custom hybrid storage adapter that uses memory for performance + sessionStorage for persistence
    let memoryStorage: { [key: string]: string } = {};

    const hybridStorage = {
      getItem: async (key: string) => {
        // Try memory first (fastest), fallback to sessionStorage (survives modals)
        let value = memoryStorage[key] || sessionStorage.getItem(key);
        if (value && !memoryStorage[key]) {
          memoryStorage[key] = value; // Restore to memory for performance
          console.log(`[PWA Storage] Restored ${key} from sessionStorage to memory`);
        }
        console.log(`[PWA Storage] Getting ${key}: ${value ? 'FOUND' : 'NOT FOUND'}`);
        return value;
      },
      setItem: async (key: string, value: string) => {
        memoryStorage[key] = value;
        sessionStorage.setItem(key, value); // Survives modal operations
        console.log(`[PWA Storage] Setting ${key} in both memory and sessionStorage`);
      },
      removeItem: async (key: string) => {
        delete memoryStorage[key];
        sessionStorage.removeItem(key);
        console.log(`[PWA Storage] Removing ${key} from both storages`);
      }
    };

    authConfig.storage = hybridStorage;
    authConfig.persistSession = true; // Re-enable persistence with hybrid storage
  }

  // Create the supabase client optimized for minimal JWT size (SaaS best practice)
  return createClient<Database>(
    currentURL,
    currentKey,
    {
      auth: authConfig,
      realtime: {
        params: {
          eventsPerSecond: 10, // Reduce for mobile
        },
      },
      global: {
        headers: {
          'X-Client-Info': isPWAIsolated ? 'pam-pwa-ios' : 'pam-mobile',
        },
      }
      // Removed db.schema to allow access to all schemas (public, storage, etc.)
      // This fixes: "relation 'objects' does not exist" error when uploading to storage
    }
  );
}

// Lazy initialization function with retry logic
function getSupabaseClient(): ReturnType<typeof createClient<Database>> {
  if (supabaseClient) {
    return supabaseClient;
  }

  try {
    supabaseClient = createSupabaseClient();
    console.log('✅ Supabase client initialized successfully');
    return supabaseClient;
  } catch (error) {
    console.error(`❌ Supabase client initialization failed (attempt ${initializationAttempts}/${MAX_INIT_ATTEMPTS}):`, error);

    // Retry logic for production race conditions
    if (initializationAttempts < MAX_INIT_ATTEMPTS && import.meta.env.PROD) {
      console.log('🔄 Retrying Supabase client initialization in production...');
      // Small delay to allow environment to settle
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            resolve(getSupabaseClient());
          } catch (retryError) {
            reject(retryError);
          }
        }, 100 * initializationAttempts); // Exponential backoff
      }) as any; // TypeScript workaround for async return
    }

    throw error;
  }
}

// Initialize client directly (removed problematic Proxy pattern)
export const supabase = (() => {
  try {
    return getSupabaseClient();
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    throw error;
  }
})();

// Add auth debugging for development
if (import.meta.env.MODE === 'development' || import.meta.env.MODE === 'staging') {
  // Defer auth debugging until client is actually used
  setTimeout(() => {
    try {
      const client = getSupabaseClient();
      console.log('🔧 Supabase Client Configuration:', {
        url: SUPABASE_URL,
        hasAnonKey: !!SUPABASE_ANON_KEY,
        keyPrefix: `${SUPABASE_ANON_KEY?.substring(0, 10)}...`,
        authStorageKey: 'pam-auth-token',
        flowType: 'pkce'
      });

      // Monitor auth state changes in Supabase client
      client.auth.onAuthStateChange((event, session) => {
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
    } catch (error) {
      console.warn('Auth debugging setup failed:', error);
    }
  }, 1000);
}

export default supabase;