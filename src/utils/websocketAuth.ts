import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export interface TokenValidationResult {
  isValid: boolean;
  token?: string;
  error?: string;
  shouldRefresh?: boolean;
}

export interface WebSocketAuthOptions {
  maxRetries?: number;
  retryDelay?: number;
  refreshThreshold?: number; // Minutes before expiry to trigger refresh
}

/**
 * Validates and prepares JWT token for WebSocket authentication
 * Ensures we're sending proper JWT access tokens instead of user IDs
 */
export async function validateAndPrepareToken(
  options: WebSocketAuthOptions = {}
): Promise<TokenValidationResult> {
  const { 
    maxRetries = 3, 
    retryDelay = 1000,
    refreshThreshold = 5 
  } = options;
  
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      console.log(`🔐 Token validation attempt ${attempt + 1}/${maxRetries}`);
      
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('🔐 Session retrieval error:', error);
        return {
          isValid: false,
          error: `Session error: ${error.message}`,
          shouldRefresh: true
        };
      }
      
      if (!session?.access_token) {
        console.error('🔐 No session or access token available');
        return {
          isValid: false,
          error: 'No valid session found. Please log in.',
          shouldRefresh: false
        };
      }
      
      // Validate token format (JWT should have 3 parts separated by dots)
      const tokenParts = session.access_token.split('.');
      if (tokenParts.length !== 3) {
        console.error('🔐 Invalid JWT format - expected 3 parts, got:', tokenParts.length);
        return {
          isValid: false,
          error: 'Invalid JWT token format',
          shouldRefresh: true
        };
      }
      
      // Check token expiry
      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        const expTime = payload.exp;
        
        if (!expTime) {
          console.warn('🔐 Token missing expiration claim');
          return {
            isValid: false,
            error: 'Token missing expiration',
            shouldRefresh: true
          };
        }
        
        // Check if token is expired
        if (currentTime >= expTime) {
          console.error('🔐 Token is expired');
          return {
            isValid: false,
            error: 'Token expired',
            shouldRefresh: true
          };
        }
        
        // Check if token is close to expiry (trigger proactive refresh)
        const timeUntilExpiry = expTime - currentTime;
        const minutesUntilExpiry = timeUntilExpiry / 60;
        
        if (minutesUntilExpiry <= refreshThreshold) {
          console.warn(`🔐 Token expires in ${minutesUntilExpiry.toFixed(1)} minutes, should refresh soon`);
        }
        
        // Validate required claims
        if (!payload.sub) {
          console.error('🔐 Token missing subject (user ID)');
          return {
            isValid: false,
            error: 'Token missing user ID',
            shouldRefresh: true
          };
        }
        
        console.log(`🔐 Token validation successful:`, {
          userId: payload.sub,
          expiresIn: `${minutesUntilExpiry.toFixed(1)} minutes`,
          tokenLength: session.access_token.length,
          tokenPreview: session.access_token.substring(0, 30) + '...'
        });
        
        return {
          isValid: true,
          token: session.access_token,
          shouldRefresh: minutesUntilExpiry <= refreshThreshold
        };
        
      } catch (decodeError) {
        console.error('🔐 Failed to decode token payload:', decodeError);
        return {
          isValid: false,
          error: 'Failed to decode token',
          shouldRefresh: true
        };
      }
      
    } catch (error) {
      console.error(`🔐 Token validation attempt ${attempt + 1} failed:`, error);
      attempt++;
      
      if (attempt < maxRetries) {
        console.log(`🔐 Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  return {
    isValid: false,
    error: `Token validation failed after ${maxRetries} attempts`,
    shouldRefresh: true
  };
}

/**
 * Refreshes the current session and returns new token
 */
export async function refreshToken(): Promise<TokenValidationResult> {
  try {
    console.log('🔄 Attempting token refresh...');
    
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('🔄 Token refresh failed:', error);
      return {
        isValid: false,
        error: `Token refresh failed: ${error.message}`,
        shouldRefresh: false
      };
    }
    
    if (!session?.access_token) {
      console.error('🔄 No token received after refresh');
      return {
        isValid: false,
        error: 'No token received after refresh',
        shouldRefresh: false
      };
    }
    
    console.log('🔄 Token refresh successful');
    return {
      isValid: true,
      token: session.access_token
    };
    
  } catch (error) {
    console.error('🔄 Token refresh error:', error);
    return {
      isValid: false,
      error: `Token refresh error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      shouldRefresh: false
    };
  }
}

/**
 * Gets a valid token, refreshing if necessary
 */
export async function getValidTokenForWebSocket(
  options: WebSocketAuthOptions = {}
): Promise<TokenValidationResult> {
  console.log('🔐 Getting valid token for WebSocket...');
  
  // First, try to validate current token
  let result = await validateAndPrepareToken(options);
  
  // If token is invalid or should be refreshed, attempt refresh
  if (!result.isValid || result.shouldRefresh) {
    console.log('🔄 Token needs refresh, attempting...');
    
    const refreshResult = await refreshToken();
    
    if (refreshResult.isValid) {
      // Refresh successful, validate the new token
      result = await validateAndPrepareToken(options);
    } else {
      // Refresh failed, return the refresh error
      return refreshResult;
    }
  }
  
  return result;
}

/**
 * Creates a properly formatted WebSocket URL with JWT authentication
 */
export function createAuthenticatedWebSocketUrl(
  baseUrl: string,
  token: string,
  additionalParams: Record<string, string> = {}
): string {
  try {
    const url = new URL(baseUrl);
    
    // Add token parameter
    url.searchParams.set('token', token);
    
    // Add any additional parameters
    Object.entries(additionalParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    
    const finalUrl = url.toString();
    
    console.log('🔗 WebSocket URL created:', {
      baseUrl,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 30) + '...',
      finalUrl: finalUrl.substring(0, 100) + '...'
    });
    
    return finalUrl;
    
  } catch (error) {
    console.error('🔗 Failed to create WebSocket URL:', error);
    throw new Error(`Invalid WebSocket URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * WebSocket authentication helper class
 */
export class WebSocketAuthManager {
  private refreshInProgress = false;
  private refreshPromise: Promise<TokenValidationResult> | null = null;
  
  constructor(private options: WebSocketAuthOptions = {}) {}
  
  /**
   * Gets a valid token, ensuring only one refresh happens at a time
   */
  async getValidToken(): Promise<TokenValidationResult> {
    // If refresh is already in progress, wait for it
    if (this.refreshInProgress && this.refreshPromise) {
      console.log('🔄 Refresh already in progress, waiting...');
      return this.refreshPromise;
    }
    
    const result = await validateAndPrepareToken(this.options);
    
    if (!result.isValid || result.shouldRefresh) {
      if (!this.refreshInProgress) {
        this.refreshInProgress = true;
        this.refreshPromise = this.performRefresh();
        
        try {
          const refreshResult = await this.refreshPromise;
          return refreshResult;
        } finally {
          this.refreshInProgress = false;
          this.refreshPromise = null;
        }
      }
    }
    
    return result;
  }
  
  private async performRefresh(): Promise<TokenValidationResult> {
    const refreshResult = await refreshToken();
    
    if (refreshResult.isValid) {
      // Validate the refreshed token
      return validateAndPrepareToken(this.options);
    }
    
    return refreshResult;
  }
}