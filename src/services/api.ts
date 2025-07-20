import { supabase } from '@/integrations/supabase/client';

export const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || 'https://pam-backend.onrender.com';

// Allow overriding the WebSocket endpoint separately if needed
const WS_OVERRIDE = import.meta.env.VITE_PAM_WEBSOCKET_URL;

// Default timeout in milliseconds for fetch requests
const DEFAULT_TIMEOUT = Number(import.meta.env.VITE_FETCH_TIMEOUT || '10000');

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  options: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(input, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Enhanced API fetch with SaaS-standard authentication
 * Uses reference tokens (industry best practice) for minimal header size
 * Falls back to optimized JWTs when needed
 */
export async function authenticatedFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`;
  
  // Check if we should use reference token (SaaS industry standard)
  const useReferenceTokens = localStorage.getItem('use_reference_tokens') === 'true';
  
  if (useReferenceTokens) {
    console.log('🎫 Reference token authentication not available, falling back to JWT');
    // Reference token authentication has been removed, fall back to JWT
  }
  
  // Fallback to JWT with optimization
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    throw new Error(`Authentication error: ${error.message}`);
  }
  
  if (!session?.access_token) {
    // For voice endpoints, allow anonymous access in development/testing
    if (path.includes('/voice') && import.meta.env.DEV) {
      console.log('🔓 Voice endpoint: allowing anonymous access in development mode');
      return fetchWithTimeout(url, options);
    }
    throw new Error('No valid session found. Please log in.');
  }
  
  // Check JWT size and warn if large
  const jwtSize = session.access_token.length;
  const headerSize = jwtSize + 7; // + "Bearer "
  
  console.log('🔐 API: JWT size analysis');
  console.log('🔐 Token length:', jwtSize, 'characters');
  console.log('🔐 Header size:', headerSize, 'characters');
  console.log('🔐 Status:', headerSize > 500 ? '⚠️ LARGE (consider reference tokens)' : '✅ Optimal size');
  
  // Standard Authorization header approach
  const authenticatedOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'X-Auth-Type': 'jwt', // Signal authentication method
      ...options.headers,
    },
  };
  
  const response = await fetchWithTimeout(url, authenticatedOptions);
  
  // Debug: Log response details
  console.log('🔐 API: Response status:', response.status);
  console.log('🔐 API: Response headers:', Object.fromEntries(response.headers.entries()));
  
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
    
    return fetchWithTimeout(url, retryOptions);
  }
  
  return response;
}

/**
 * Basic API fetch without authentication (for public endpoints)
 */
export function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`;
  return fetchWithTimeout(url, options);
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
