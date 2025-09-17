import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SessionRecoveryOptions {
  onSessionRecovered?: () => void;
  onSessionLost?: () => void;
  enableVisibilityDetection?: boolean;
}

/**
 * Hook to handle session recovery scenarios:
 * - Browser refresh
 * - Tab switching with session expiration
 * - Network reconnection
 */
export function useSessionRecovery({
  onSessionRecovered,
  onSessionLost,
  enableVisibilityDetection = true
}: SessionRecoveryOptions = {}) {
  const lastSessionCheck = useRef<number>(Date.now());
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Check session validity
  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('[SessionRecovery] Session check failed:', error);
        onSessionLost?.();
        return false;
      }

      if (session) {
        // Check if session is still valid (not expired)
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = session.expires_at || 0;

        if (expiresAt > now) {
          return true;
        } else {
          console.warn('[SessionRecovery] Session expired');
          onSessionLost?.();
          return false;
        }
      } else {
        onSessionLost?.();
        return false;
      }
    } catch (error) {
      console.error('[SessionRecovery] Session check error:', error);
      onSessionLost?.();
      return false;
    }
  };

  // Handle page visibility change (tab switching)
  const handleVisibilityChange = async () => {
    if (!document.hidden) {
      // Tab became visible - check if session is still valid
      const timeSinceLastCheck = Date.now() - lastSessionCheck.current;

      // Only check if it's been more than 5 minutes since last check
      if (timeSinceLastCheck > 5 * 60 * 1000) {
        console.log('[SessionRecovery] Tab became visible, checking session...');
        const isValid = await checkSession();

        if (isValid) {
          onSessionRecovered?.();
        }

        lastSessionCheck.current = Date.now();
      }
    }
  };

  // Handle browser online/offline events
  const handleOnlineStatusChange = async () => {
    if (navigator.onLine) {
      console.log('[SessionRecovery] Browser came online, checking session...');
      const isValid = await checkSession();

      if (isValid) {
        onSessionRecovered?.();
      }
    }
  };

  // Set up periodic session checks
  const startSessionMonitoring = () => {
    sessionCheckInterval.current = setInterval(async () => {
      await checkSession();
      lastSessionCheck.current = Date.now();
    }, 10 * 60 * 1000); // Check every 10 minutes
  };

  // Clean up session monitoring
  const stopSessionMonitoring = () => {
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current);
      sessionCheckInterval.current = null;
    }
  };

  useEffect(() => {
    // Start session monitoring
    startSessionMonitoring();

    // Set up visibility change listener
    if (enableVisibilityDetection) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Set up online/offline listeners
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', () => {
      console.log('[SessionRecovery] Browser went offline');
    });

    // Initial session check
    checkSession();

    // Cleanup
    return () => {
      stopSessionMonitoring();

      if (enableVisibilityDetection) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }

      window.removeEventListener('online', handleOnlineStatusChange);
    };
  }, [onSessionRecovered, onSessionLost, enableVisibilityDetection]);

  return {
    checkSession,
    lastSessionCheck: lastSessionCheck.current
  };
}

export default useSessionRecovery;