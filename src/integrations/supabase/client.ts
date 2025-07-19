import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Load Supabase configuration from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://kycoklimpzkyrecbjecn.supabase.co";
const SUPABASE_ANON_KEY = <SUPABASE_ANON_KEY> || "<JWT_TOKEN>";

// Environment variables allow for flexible deployment across environments

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
