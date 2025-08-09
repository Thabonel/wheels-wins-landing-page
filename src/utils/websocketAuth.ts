/**
 * WebSocket Authentication Utilities
 * Provides robust JWT token management for WebSocket connections
 */

import { supabase } from '@/integrations/supabase/client';

export interface TokenValidationResult {
  isValid: boolean;
  token: string | null;
  expiresAt: number | null;
  needsRefresh: boolean;
  error?: string;
}

export interface WebSocketAuthConfig {
  tokenRefreshThreshold: number; // Minutes before expiry to refresh
  maxRetries: number;
  retryDelay: number;
}

const DEFAULT_CONFIG: WebSocketAuthConfig = {
  tokenRefreshThreshold: 5, // Refresh 5 minutes before expiry
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * Validates JWT token format and expiration
 */
export function validateJWTToken(token: string): TokenValidationResult {
  try {
    // Check basic JWT format (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return {
        isValid: false,
        token: null,
        expiresAt: null,
        needsRefresh: false,
        error: 'Invalid JWT format - expected 3 parts',
      };
    }

    // Decode payload (base64url)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    // Check expiration
    const exp = payload.exp;
    if (!exp) {
      return {
        isValid: false,
        token: null,
        expiresAt: null,
        needsRefresh: false,
        error: 'No expiration in token',
      };
    }

    const expiresAt = exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const refreshThreshold = DEFAULT_CONFIG.tokenRefreshThreshold * 60 * 1000;

    if (timeUntilExpiry <= 0) {
      return {
        isValid: false,
        token,
        expiresAt,
        needsRefresh: true,
        error: 'Token expired',
      };
    }

    return {
      isValid: true,
      token,
      expiresAt,
      needsRefresh: timeUntilExpiry < refreshThreshold,
    };
  } catch (error) {
    return {
      isValid: false,
      token: null,
      expiresAt: null,
      needsRefresh: false,
      error: `Token validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Gets a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<TokenValidationResult> {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return {
        isValid: false,
        token: null,
        expiresAt: null,
        needsRefresh: false,
        error: 'No active session',
      };
    }

    // Validate current token
    const validation = validateJWTToken(session.access_token);
    
    // If token is valid and doesn't need refresh, return it
    if (validation.isValid && !validation.needsRefresh) {
      return validation;
    }

    // Token needs refresh
    console.log('🔄 Token needs refresh, attempting to refresh session...');
    const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !newSession) {
      return {
        isValid: false,
        token: null,
        expiresAt: null,
        needsRefresh: false,
        error: `Failed to refresh token: ${refreshError?.message || 'Unknown error'}`,
      };
    }

    // Validate new token
    return validateJWTToken(newSession.access_token);
  } catch (error) {
    return {
      isValid: false,
      token: null,
      expiresAt: null,
      needsRefresh: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Creates authenticated WebSocket URL with JWT token
 */
export function createAuthenticatedWebSocketUrl(baseUrl: string, token: string): string {
  // Ensure token is properly encoded for URL
  const encodedToken = encodeURIComponent(token);
  
  // Ensure base URL doesn't already have query parameters
  const separator = baseUrl.includes('?') ? '&' : '?';
  
  return `${baseUrl}${separator}token=${encodedToken}`;
}

/**
 * WebSocket Authentication Manager
 * Handles token lifecycle for WebSocket connections
 */
export class WebSocketAuthManager {
  private config: WebSocketAuthConfig;
  private tokenRefreshTimer?: NodeJS.Timeout;
  private onTokenRefresh?: (token: string) => void;

  constructor(config: Partial<WebSocketAuthConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Sets callback for token refresh events
   */
  onTokenRefreshCallback(callback: (token: string) => void) {
    this.onTokenRefresh = callback;
  }

  /**
   * Starts monitoring token expiration and schedules refresh
   */
  async startTokenMonitoring(): Promise<void> {
    // Clear any existing timer
    this.stopTokenMonitoring();

    const validation = await getValidAccessToken();
    if (!validation.isValid || !validation.expiresAt) {
      console.error('❌ Cannot start token monitoring - invalid token');
      return;
    }

    // Calculate when to refresh (5 minutes before expiry)
    const refreshTime = validation.expiresAt - (this.config.tokenRefreshThreshold * 60 * 1000);
    const delay = Math.max(0, refreshTime - Date.now());

    console.log(`⏰ Scheduling token refresh in ${Math.round(delay / 1000 / 60)} minutes`);

    this.tokenRefreshTimer = setTimeout(async () => {
      console.log('🔄 Token refresh timer triggered');
      const newValidation = await getValidAccessToken();
      
      if (newValidation.isValid && newValidation.token && this.onTokenRefresh) {
        this.onTokenRefresh(newValidation.token);
        // Schedule next refresh
        this.startTokenMonitoring();
      }
    }, delay);
  }

  /**
   * Stops token monitoring
   */
  stopTokenMonitoring(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = undefined;
    }
  }

  /**
   * Gets valid token with retry logic
   */
  async getValidTokenWithRetry(): Promise<TokenValidationResult> {
    let lastError: string | undefined;
    
    for (let i = 0; i < this.config.maxRetries; i++) {
      const result = await getValidAccessToken();
      
      if (result.isValid) {
        return result;
      }
      
      lastError = result.error;
      console.warn(`⚠️ Token fetch attempt ${i + 1} failed: ${lastError}`);
      
      if (i < this.config.maxRetries - 1) {
        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      isValid: false,
      token: null,
      expiresAt: null,
      needsRefresh: false,
      error: `Failed after ${this.config.maxRetries} attempts. Last error: ${lastError}`,
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopTokenMonitoring();
    this.onTokenRefresh = undefined;
  }
}