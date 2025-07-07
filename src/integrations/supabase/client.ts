import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use direct URLs instead of environment variables for Lovable
const SUPABASE_URL = "https://kycoklimpzkyrecbjecn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Y29rbGltcHpreXJlY2JqZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNTU4MDAsImV4cCI6MjA2MTgzMTgwMH0.nRZhYxImQ0rOlh0xZjHcdVq2Q2NY0v-9W3wciaxV2EA";

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
