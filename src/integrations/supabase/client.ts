
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kycoklimpzkyrecbjecn.supabase.co';
const supabaseAnonKey = '<JWT_TOKEN>';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
