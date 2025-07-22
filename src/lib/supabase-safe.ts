import { createClient } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';

// Safe Supabase client initialization with better error handling
export function createSafeSupabaseClient() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  // Log environment state
  console.group('🔍 Supabase Environment Check');
  console.log('VITE_SUPABASE_URL:', SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : 'NOT SET');
  console.log('VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
  console.log('Build Mode:', import.meta.env.MODE);
  console.log('Is Production:', import.meta.env.PROD);
  console.groupEnd();

  // If environment variables are missing, return a mock client for debugging
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('⚠️ Supabase environment variables are missing!');
    console.error('Please configure the following in Netlify:');
    console.error('- VITE_SUPABASE_URL');
    console.error('- VITE_SUPABASE_ANON_KEY');
    
    // Return null to prevent the "Invalid URL" error
    return null;
  }

  // Validate URL format
  try {
    new URL(SUPABASE_URL);
  } catch (error) {
    console.error('❌ Invalid VITE_SUPABASE_URL format:', SUPABASE_URL);
    return null;
  }

  // Create the actual client
  return createClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'pam-auth-token',
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: {
          'X-Client-Info': 'pam-mobile',
        },
      },
    }
  );
}

// Export a safe client instance
export const supabase = createSafeSupabaseClient();