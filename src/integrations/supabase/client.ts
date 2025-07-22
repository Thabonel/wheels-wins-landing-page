import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Load Supabase configuration from environment variables - NO HARDCODED FALLBACKS
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
try {
  new URL(SUPABASE_URL);
} catch (error) {
  console.error('Invalid VITE_SUPABASE_URL:', SUPABASE_URL);
  throw new Error(`Invalid VITE_SUPABASE_URL: "${SUPABASE_URL}". Please provide a valid URL.`);
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
