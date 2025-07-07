import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use direct URLs instead of environment variables for Lovable
const SUPABASE_URL = "https://kycoklimpzkyrecbjecn.supabase.co";
const SUPABASE_ANON_KEY = <SUPABASE_ANON_KEY>

// URLs are directly configured for Lovable deployment

// Create the supabase client with mobile optimizations
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'pam-auth-token',
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
