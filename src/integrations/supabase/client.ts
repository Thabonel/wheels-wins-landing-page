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

// Check if variables are swapped and auto-correct
if (isJWTToken(SUPABASE_URL) && isValidURL(SUPABASE_ANON_KEY)) {
  console.warn('🔄 Detected swapped Supabase environment variables - auto-correcting...');
  const temp = SUPABASE_URL;
  SUPABASE_URL = SUPABASE_ANON_KEY;
  SUPABASE_ANON_KEY = temp;
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
    },
  }
);

export default supabase;
