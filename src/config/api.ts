/**
 * API Configuration
 * Centralized environment-aware API endpoint configuration
 */

/**
 * Get the API base URL based on environment
 * Priority: Explicit env var > Hostname detection > Localhost fallback
 */
const getApiBaseUrl = (): string => {
  // Check for explicit environment variable first
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Fallback to hostname-based detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Production environment
    if (hostname === 'wheelsandwins.com' || hostname === 'www.wheelsandwins.com') {
      return 'https://pam-backend.onrender.com';
    }

    // Staging environment
    if (hostname.includes('wheels-wins-staging') || hostname.includes('netlify.app')) {
      return 'https://wheels-wins-backend-staging.onrender.com';
    }
  }

  // Local development fallback
  return 'http://localhost:8000';
};

/**
 * Get the WebSocket URL (converts http:// to ws:// and https:// to wss://)
 */
const getWsUrl = (): string => {
  const baseUrl = getApiBaseUrl();
  return baseUrl.replace(/^http/, 'ws');
};

/**
 * Detect current environment
 */
export const getEnvironment = (): 'production' | 'staging' | 'development' => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    if (hostname === 'wheelsandwins.com' || hostname === 'www.wheelsandwins.com') {
      return 'production';
    }

    if (hostname.includes('wheels-wins-staging') || hostname.includes('netlify.app')) {
      return 'staging';
    }
  }

  return 'development';
};

/**
 * API Configuration Object
 */
export const API_CONFIG = {
  baseUrl: getApiBaseUrl(),
  wsUrl: getWsUrl(),
  environment: getEnvironment(),

  // API endpoints
  endpoints: {
    pam: {
      health: '/api/v1/pam/health',
      chat: '/api/v1/pam/chat',
      ws: '/api/v1/pam/ws',
    },
    health: '/api/health',
  },

  // Full URLs for convenience
  getFullUrl: (path: string) => `${getApiBaseUrl()}${path}`,
  getFullWsUrl: (path: string) => `${getWsUrl()}${path}`,
} as const;

// Export helpers
export { getApiBaseUrl, getWsUrl };
