import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { setUser, setTag } from '@/lib/sentry';

/**
 * Hook to sync authenticated user information with Sentry for better error tracking
 * This helps correlate errors with specific users while respecting privacy
 */
export function useSentryUser() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Set user context in Sentry (without PII)
      setUser({
        id: user.id,
        // Don't include email or other PII for privacy
        // Sentry will help track errors per user without exposing personal data
      });

      // Set useful tags for filtering
      setTag('authenticated', 'true');
      setTag('user_type', user.role || 'user');
      
      // Add any custom user properties that help with debugging
      if (user.created_at) {
        const userAge = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
        setTag('user_age_days', userAge.toString());
      }
    } else {
      // Clear user context when logged out
      setUser(null);
      setTag('authenticated', 'false');
      setTag('user_type', 'anonymous');
    }
  }, [user]);
}

/**
 * Utility to manually report specific user actions or errors to Sentry
 */
export function reportUserAction(action: string, data?: Record<string, any>) {
  const { user } = useAuth();
  
  // Add breadcrumb for user action
  import('@/lib/sentry').then(({ addBreadcrumb }) => {
    addBreadcrumb({
      message: `User action: ${action}`,
      level: 'info',
      category: 'user_action',
      data: {
        action,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        ...data,
      },
    });
  });
}