import { supabase } from '@/integrations/supabase/client';

// Use environment-specific backend URL
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 
  import.meta.env.VITE_BACKEND_URL || 
  'https://pam-backend.onrender.com';

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
  
  // Generate a CSRF token from the JWT token
  let csrfToken = 'xhr-token';
  try {
    // Create a simple CSRF token using JWT hash and timestamp
    const tokenHash = btoa(session.access_token.substring(0, 20)).replace(/[^a-zA-Z0-9]/g, '');
    csrfToken = `${tokenHash}-${Date.now()}`;
  } catch (error) {
    console.warn('Could not generate CSRF token, using fallback');
  }

  // Standard Authorization header approach with CSRF protection
  const authenticatedOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'X-Auth-Type': 'jwt', // Signal authentication method
      'X-Requested-With': 'XMLHttpRequest', // CSRF protection
      'X-CSRF-Token': csrfToken, // CSRF token
      'Origin': window.location.origin, // CORS origin
      'Referer': window.location.href, // Additional security
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
    
    // Generate CSRF token for retry
    let retryCsrfToken = 'xhr-retry-token';
    try {
      const tokenHash = btoa(refreshedSession.access_token.substring(0, 20)).replace(/[^a-zA-Z0-9]/g, '');
      retryCsrfToken = `${tokenHash}-${Date.now()}`;
    } catch (error) {
      console.warn('Could not generate retry CSRF token, using fallback');
    }

    // Retry with new token
    const retryOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshedSession.access_token}`,
        'X-Auth-Type': 'jwt', // Signal authentication method
        'X-Requested-With': 'XMLHttpRequest', // CSRF protection
        'X-CSRF-Token': retryCsrfToken, // CSRF token
        'Origin': window.location.origin, // CORS origin
        'Referer': window.location.href, // Additional security
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
  console.log('🔌 WebSocket URL Construction Debug:', {
    path,
    WS_OVERRIDE,
    API_BASE_URL,
    env_ws_url: import.meta.env.VITE_PAM_WEBSOCKET_URL
  });

  // Use explicit WebSocket override if provided
  if (WS_OVERRIDE) {
    console.log('✅ Using WebSocket override:', WS_OVERRIDE);
    // If override already includes the path, use as-is
    if (WS_OVERRIDE.includes(path)) {
      return WS_OVERRIDE;
    }
    // Otherwise append the path (shouldn't happen with current config)
    return WS_OVERRIDE + path;
  }

  // Otherwise derive from the HTTP base URL
  console.log('⚠️ No WebSocket override found, deriving from API_BASE_URL');
  const baseUrl = API_BASE_URL.replace(/^http/, 'ws');
  const finalUrl = `${baseUrl}${path}`;
  console.log('🔗 Derived WebSocket URL:', finalUrl);
  return finalUrl;
}
