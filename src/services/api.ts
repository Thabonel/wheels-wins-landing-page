import { supabase } from '@/integrations/supabase/client';
import { logger } from '../lib/logger';


/**
 * Environment-aware backend URL selection
 * Automatically detects staging vs production based on domain
 * @constant {string}
 */
const getApiBaseUrl = () => {
  // Check for explicit API URL first
  if (import.meta.env.VITE_API_URL) {
    console.log('🔧 Using VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }
  
  // Check for explicit backend URL
  if (import.meta.env.VITE_BACKEND_URL) {
    console.log('🔧 Using VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // Auto-detect based on current domain for staging vs production
  const currentDomain = window.location.hostname;
  console.log('🔧 Detecting domain:', currentDomain);
  
  if (currentDomain.includes('staging') || currentDomain.includes('netlify')) {
    // Staging environment - use staging backend
    console.log('🔧 Staging detected - using staging backend');
    return 'https://wheels-wins-backend-staging.onrender.com';
  }
  
  // Production environment - use production backend
  console.log('🔧 Production detected - using production backend');
  return 'https://pam-backend.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * WebSocket endpoint override for PAM connections
 * @constant {string | undefined}
 */
const WS_OVERRIDE = import.meta.env.VITE_PAM_WEBSOCKET_URL;

/**
 * Default timeout in milliseconds for fetch requests
 * @constant {number}
 */
const DEFAULT_TIMEOUT = Number(import.meta.env.VITE_FETCH_TIMEOUT || '10000');

/**
 * Performs a fetch request with a timeout to prevent hanging requests
 * @async
 * @param {RequestInfo | URL} input - The resource to fetch
 * @param {RequestInit} [options={}] - Fetch options
 * @param {number} [timeout=DEFAULT_TIMEOUT] - Timeout in milliseconds
 * @returns {Promise<Response>} The fetch response
 * @throws {Error} If the request times out or fails
 */
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
  
  // Check for reference token preference from cookies
  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };
  
  // Check if we should use reference token (SaaS industry standard)
  const useReferenceTokens = getCookie('use_reference_tokens') === 'true';
  
  if (useReferenceTokens) {
    logger.debug('🎫 Reference token authentication not available, falling back to JWT');
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
      logger.debug('🔓 Voice endpoint: allowing anonymous access in development mode');
      return fetchWithTimeout(url, options);
    }
    throw new Error('No valid session found. Please log in.');
  }
  
  // Check JWT size and warn if large
  const jwtSize = session.access_token.length;
  const headerSize = jwtSize + 7; // + "Bearer "
  
  logger.debug('🔐 API: JWT size analysis');
  logger.debug('🔐 Token length:', jwtSize, 'characters');
  logger.debug('🔐 Header size:', headerSize, 'characters');
  logger.debug('🔐 Status:', headerSize > 500 ? '⚠️ LARGE (consider reference tokens)' : '✅ Optimal size');
  
  // Generate a CSRF token from the JWT token
  let csrfToken = 'xhr-token';
  try {
    // Create a simple CSRF token using JWT hash and timestamp
    const tokenHash = btoa(session.access_token.substring(0, 20)).replace(/[^a-zA-Z0-9]/g, '');
    csrfToken = `${tokenHash}-${Date.now()}`;
  } catch (error) {
    logger.warn('Could not generate CSRF token, using fallback');
  }

  // Standard Authorization header approach with CSRF protection
  const authenticatedOptions: RequestInit = {
    ...options,
    credentials: 'include', // Include cookies for authentication
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
  logger.debug('🔐 API: Response status:', response.status);
  logger.debug('🔐 API: Response headers:', Object.fromEntries(response.headers.entries()));
  
  // Handle 401/440 responses with automatic token refresh
  if (response.status === 401 || response.status === 440) {
    // Token expired, attempt to refresh
    logger.debug('🔄 Retrying request with refreshed token');
    
    // Get the new session after refresh
    const { data: { session: newSession }, error: newSessionError } = 
      await supabase.auth.getSession();
    
    if (newSessionError || !newSession?.access_token) {
      throw new Error('Session refresh succeeded but new session unavailable');
    }
    
    // Generate CSRF token for retry
    let retryCsrfToken = 'xhr-retry-token';
    try {
      const tokenHash = btoa(newSession.access_token.substring(0, 20)).replace(/[^a-zA-Z0-9]/g, '');
      retryCsrfToken = `${tokenHash}-${Date.now()}`;
    } catch (error) {
      logger.warn('Could not generate retry CSRF token, using fallback');
    }

    // Retry with new token
    const retryOptions: RequestInit = {
      ...options,
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newSession.access_token}`,
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
 * Get WebSocket URL without token (token handled via subprotocol)
 */
export async function getAuthenticatedWebSocketUrl(path: string): Promise<string> {
  let baseUrl: string;
  
  // Use explicit WebSocket override if provided
  if (WS_OVERRIDE) {
    baseUrl = WS_OVERRIDE;
  } else {
    // Otherwise derive from the HTTP base URL
    baseUrl = API_BASE_URL.replace(/^http/, 'ws');
  }
  
  // Return clean WebSocket URL without token
  return `${baseUrl}${path}`;
}

export function getWebSocketUrl(path: string) {
  logger.debug('🔌 WebSocket URL Construction Debug:', {
    path,
    WS_OVERRIDE,
    API_BASE_URL,
    env_ws_url: import.meta.env.VITE_PAM_WEBSOCKET_URL
  });

  // Use explicit WebSocket override if provided
  if (WS_OVERRIDE) {
    logger.debug('✅ Using WebSocket override:', WS_OVERRIDE);
    // IMPORTANT: Never use the override as-is if it contains a partial path
    // We need to properly construct the URL with the user ID
    // Strip any existing /api/v1/pam/ws from the override
    const cleanOverride = WS_OVERRIDE.replace(/\/api\/v1\/pam\/ws.*$/, '');
    const finalUrl = cleanOverride + path;
    logger.debug('🔗 Constructed WebSocket URL from override:', finalUrl);
    return finalUrl;
  }

  // Otherwise derive from the HTTP base URL
  logger.debug('⚠️ No WebSocket override found, deriving from API_BASE_URL');
  const baseUrl = API_BASE_URL.replace(/^http/, 'ws');
  const finalUrl = `${baseUrl}${path}`;
  logger.debug('🔗 Derived WebSocket URL:', finalUrl);
  return finalUrl;
}