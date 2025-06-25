import { useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';

const useSupabaseClient = (): SupabaseClient => {
  const supabase = useMemo(() => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.error('Supabase URL and Anon Key must be provided.');
      // In a real application, you might want to throw an error or handle this differently
      // For now, returning null or an uninitialized client
      return createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY'); // Replace with placeholder or error handling
    }
    return createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
  }, []); // Empty dependency array ensures the client is created only once

  return supabase;
};

export default useSupabaseClient;