
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase";

export const useAuthState = () => {
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAuthState(session?.user ? 'authenticated' : 'unauthenticated');
      } catch (error) {
        console.error("Auth check failed:", error);
        setAuthState('unauthenticated');
      }
    };

    checkAuthState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthState(session?.user ? 'authenticated' : 'unauthenticated');
    });

    return () => subscription.unsubscribe();
  }, []);

  return authState;
};
