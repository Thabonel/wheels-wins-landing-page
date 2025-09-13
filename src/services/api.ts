import { supabase } from '@/integrations/supabase/client';
import { logger } from '../lib/logger';


/**
 * Backend URL configuration - uses environment variables set by Netlify build context
 * Falls back to production URL if no environment variables are set
 * @constant {string}
 */
export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'https://pam-backend.onrender.com';

// Debug logging to track URL resolution
console.log('🔧 API Configuration Debug:', {
  VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
  resolved_API_BASE_URL: API_BASE_URL,
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side'
});

/**
 * WebSocket endpoint for PAM connections - uses environment variable or derives from API_BASE_URL
 * @constant {string}
 */
const WS_BASE_URL = import.meta.env.VITE_PAM_WEBSOCKET_URL || API_BASE_URL.replace(/^http/, 'ws');

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
 * Simplified version to avoid network issues
 */
export async function authenticatedFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`;
  
  logger.debug('🌐 Authenticated fetch to:', url);
  
  // Get session token
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    logger.error('Authentication error:', error.message);
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
  
  logger.debug('🔐 Token length:', session.access_token.length, 'characters');
  
  // Simplified headers - only include essential ones
  const authenticatedOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'Accept': 'application/json',
      ...options.headers,
    },
  };
  
  try {
    const response = await fetchWithTimeout(url, authenticatedOptions);
    
    logger.debug('🔐 API: Response status:', response.status);
    
    // Handle 401 responses with automatic token refresh
    if (response.status === 401) {
      logger.debug('🔄 Token expired, retrying with refreshed session');
      
      // Get the new session after refresh
      const { data: { session: newSession }, error: newSessionError } = 
        await supabase.auth.getSession();
      
      if (newSessionError || !newSession?.access_token) {
        throw new Error('Session refresh failed');
      }
      
      // Retry with new token
      const retryOptions: RequestInit = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newSession.access_token}`,
          'Accept': 'application/json',
          ...options.headers,
        },
      };
      
      return fetchWithTimeout(url, retryOptions);
    }
    
    return response;
  } catch (fetchError: any) {
    logger.error('🔐 Authenticated fetch failed:', fetchError.message);
    throw fetchError;
  }
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
  return `${WS_BASE_URL}${path}`;
}

export function getWebSocketUrl(path: string) {
  const finalUrl = `${WS_BASE_URL}${path}`;
  
  logger.debug('🔌 WebSocket URL Construction Debug:', {
    path,
    WS_BASE_URL,
    VITE_PAM_WEBSOCKET_URL: import.meta.env.VITE_PAM_WEBSOCKET_URL,
    API_BASE_URL,
    finalUrl
  });
  
  return finalUrl;
}