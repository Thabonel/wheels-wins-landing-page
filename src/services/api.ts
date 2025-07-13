import { supabase } from '@/integrations/supabase/client';

export const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || 'https://pam-backend.onrender.com';

// Allow overriding the WebSocket endpoint separately if needed
const WS_OVERRIDE = import.meta.env.VITE_PAM_WEBSOCKET_URL;

/**
 * Enhanced API fetch with automatic authentication
 * Uses Supabase session management for proper JWT + refresh token flow
 */
export async function authenticatedFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`;
  
  // Get current session with automatic token refresh
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    throw new Error(`Authentication error: ${error.message}`);
  }
  
  if (!session?.access_token) {
    throw new Error('No valid session found. Please log in.');
  }
  
  // Merge authentication headers with provided options
  const authenticatedOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    },
  };
  
  const response = await fetch(url, authenticatedOptions);
  
  // Handle token expiration - trigger refresh
  if (response.status === 401) {
    console.log('🔄 Token expired, attempting refresh...');
    
    // Force session refresh
    const { data: { session: refreshedSession }, error: refreshError } = 
      await supabase.auth.refreshSession();
    
    if (refreshError || !refreshedSession?.access_token) {
      throw new Error('Session expired and refresh failed. Please log in again.');
    }
    
    // Retry with new token
    const retryOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshedSession.access_token}`,
        ...options.headers,
      },
    };
    
    return fetch(url, retryOptions);
  }
  
  return response;
}

/**
 * Basic API fetch without authentication (for public endpoints)
 */
export function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`;
  return fetch(url, options);
}

/**
 * Get WebSocket URL with authentication token
 */
export async function getAuthenticatedWebSocketUrl(path: string): Promise<string> {
  // Get current session
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || 'anonymous';
  
  let baseUrl: string;
  
  // Use explicit WebSocket override if provided
  if (WS_OVERRIDE) {
    baseUrl = WS_OVERRIDE;
  } else {
    // Otherwise derive from the HTTP base URL
    baseUrl = API_BASE_URL.replace(/^http/, 'ws');
  }
  
  // Append token as query parameter for WebSocket authentication
  const wsUrl = `${baseUrl}${path}`;
  const separator = wsUrl.includes('?') ? '&' : '?';
  
  return `${wsUrl}${separator}token=${encodeURIComponent(token)}`;
}

export function getWebSocketUrl(path: string) {
  // Use explicit WebSocket override if provided
  if (WS_OVERRIDE) {
    return WS_OVERRIDE;
  }

  // Otherwise derive from the HTTP base URL
  const baseUrl = API_BASE_URL.replace(/^http/, 'ws');
  return `${baseUrl}${path}`;
}
