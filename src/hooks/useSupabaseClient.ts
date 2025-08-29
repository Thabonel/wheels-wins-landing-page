import { useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const useSupabaseClient = (): SupabaseClient => {
  const supabase = useMemo(() => {
    const url = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dev-anon-key';
    return createClient(url, key);
  }, []);

  return supabase;
};

export default useSupabaseClient;
