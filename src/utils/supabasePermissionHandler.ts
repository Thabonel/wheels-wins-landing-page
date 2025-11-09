import { supabase } from '@/integrations/supabase/client';

/**
 * Handles Supabase permission errors by automatically refreshing the JWT token
 * and retrying the query. This is necessary because JWT tokens issued before
 * GRANT statements don't include new permissions.
 *
 * @param queryFn - The Supabase query function to execute
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @returns The result of the query function
 * @throws The original error if retries are exhausted or non-permission error
 */
export async function handlePermissionError<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  try {
    return await queryFn();
  } catch (error: any) {
    // Check if this is a PostgreSQL permission denied error (error code 42501)
    if (error?.code === '42501' && maxRetries > 0) {
      console.warn('[Permission Handler] Permission denied (42501). Refreshing token and retrying...', {
        retriesLeft: maxRetries,
        error: error.message
      });

      // Wait 500ms before retry to allow any background processes to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force refresh the JWT token to get updated permissions
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('[Permission Handler] Token refresh failed:', refreshError);
        throw error; // Re-throw original error if refresh fails
      }

      console.log('[Permission Handler] Token refreshed successfully. Retrying query...');

      // Retry the query with fresh token
      return handlePermissionError(queryFn, maxRetries - 1);
    }

    // Re-throw non-permission errors or if retries exhausted
    throw error;
  }
}

/**
 * Checks if the current session token is about to expire and refreshes it
 * proactively. Call this before critical operations that require permissions.
 *
 * @param thresholdSeconds - Refresh if token expires within this many seconds (default: 300 = 5 minutes)
 * @returns True if token was refreshed, false if refresh was not needed or failed
 */
export async function refreshTokenIfExpiring(thresholdSeconds: number = 300): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn('[Permission Handler] No active session found');
      return false;
    }

    const expiresAt = session.expires_at;
    if (!expiresAt) {
      console.warn('[Permission Handler] Session has no expiry time');
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - now;

    if (timeUntilExpiry < thresholdSeconds) {
      console.log(`[Permission Handler] Token expires in ${timeUntilExpiry}s. Refreshing...`);

      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('[Permission Handler] Proactive token refresh failed:', error);
        return false;
      }

      console.log('[Permission Handler] Token refreshed proactively');
      return true;
    }

    return false; // Token is still valid
  } catch (error) {
    console.error('[Permission Handler] Error checking token expiry:', error);
    return false;
  }
}
