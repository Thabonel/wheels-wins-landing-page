/**
 * Authentication Error Handler
 * Provides comprehensive error handling for authentication issues
 */

import { supabase } from '@/integrations/supabase/client';

export enum AuthErrorType {
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  SESSION_MISSING = 'SESSION_MISSING',
  REFRESH_FAILED = 'REFRESH_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  UNKNOWN = 'UNKNOWN',
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  originalError?: any;
  canRetry: boolean;
  suggestedAction: 'refresh' | 'login' | 'retry' | 'reload' | 'none';
}

export interface AuthErrorHandlerConfig {
  onTokenRefresh?: () => Promise<void>;
  onLogout?: () => Promise<void>;
  onReload?: () => void;
  maxRetries?: number;
}

/**
 * Maps WebSocket close codes to authentication errors
 */
export function mapWebSocketCloseCodeToAuthError(code: number, reason?: string): AuthError {
  switch (code) {
    case 1008: // Policy Violation
      return {
        type: AuthErrorType.TOKEN_INVALID,
        message: 'Authentication failed - invalid token',
        canRetry: true,
        suggestedAction: 'refresh',
      };
    
    case 4001: // Unauthorized
      return {
        type: AuthErrorType.UNAUTHORIZED,
        message: 'Unauthorized - please log in again',
        canRetry: false,
        suggestedAction: 'login',
      };
    
    case 4003: // Forbidden
      return {
        type: AuthErrorType.FORBIDDEN,
        message: 'Access forbidden - insufficient permissions',
        canRetry: false,
        suggestedAction: 'none',
      };
    
    case 4004: // Token Expired
      return {
        type: AuthErrorType.TOKEN_EXPIRED,
        message: 'Session expired - refreshing token',
        canRetry: true,
        suggestedAction: 'refresh',
      };
    
    default:
      if (reason?.toLowerCase().includes('auth')) {
        return {
          type: AuthErrorType.UNAUTHORIZED,
          message: reason || 'Authentication required',
          canRetry: true,
          suggestedAction: 'refresh',
        };
      }
      
      return {
        type: AuthErrorType.UNKNOWN,
        message: `Connection closed: ${reason || `Code ${code}`}`,
        canRetry: true,
        suggestedAction: 'retry',
      };
  }
}

/**
 * Maps HTTP status codes to authentication errors
 */
export function mapHttpStatusToAuthError(status: number, message?: string): AuthError | null {
  switch (status) {
    case 401:
      return {
        type: AuthErrorType.UNAUTHORIZED,
        message: message || 'Authentication required',
        canRetry: true,
        suggestedAction: 'refresh',
      };
    
    case 403:
      return {
        type: AuthErrorType.FORBIDDEN,
        message: message || 'Access forbidden',
        canRetry: false,
        suggestedAction: 'none',
      };
    
    default:
      return null;
  }
}

/**
 * Maps JWT errors to authentication errors
 */
export function mapJWTErrorToAuthError(error: string): AuthError {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes('expired')) {
    return {
      type: AuthErrorType.TOKEN_EXPIRED,
      message: 'Token expired',
      originalError: error,
      canRetry: true,
      suggestedAction: 'refresh',
    };
  }
  
  if (lowerError.includes('invalid') || lowerError.includes('malformed')) {
    return {
      type: AuthErrorType.TOKEN_INVALID,
      message: 'Invalid token format',
      originalError: error,
      canRetry: true,
      suggestedAction: 'login',
    };
  }
  
  if (lowerError.includes('signature')) {
    return {
      type: AuthErrorType.TOKEN_INVALID,
      message: 'Invalid token signature',
      originalError: error,
      canRetry: false,
      suggestedAction: 'login',
    };
  }
  
  return {
    type: AuthErrorType.UNKNOWN,
    message: error,
    originalError: error,
    canRetry: true,
    suggestedAction: 'refresh',
  };
}

/**
 * Authentication Error Handler
 * Handles authentication errors with automatic recovery
 */
export class AuthErrorHandler {
  private config: Required<AuthErrorHandlerConfig>;
  private retryCount: Map<string, number> = new Map();

  constructor(config: AuthErrorHandlerConfig = {}) {
    this.config = {
      onTokenRefresh: config.onTokenRefresh || this.defaultTokenRefresh,
      onLogout: config.onLogout || this.defaultLogout,
      onReload: config.onReload || (() => window.location.reload()),
      maxRetries: config.maxRetries || 3,
    };
  }

  /**
   * Handles authentication error with automatic recovery
   */
  async handleAuthError(error: AuthError): Promise<boolean> {
    const errorKey = `${error.type}-${error.message}`;
    const currentRetries = this.retryCount.get(errorKey) || 0;

    // Check if we've exceeded max retries
    if (currentRetries >= this.config.maxRetries && error.canRetry) {
      console.error(`❌ Max retries (${this.config.maxRetries}) exceeded for ${error.type}`);
      await this.handleMaxRetriesExceeded(error);
      return false;
    }

    // Increment retry count
    if (error.canRetry) {
      this.retryCount.set(errorKey, currentRetries + 1);
    }

    // Handle based on suggested action
    try {
      switch (error.suggestedAction) {
        case 'refresh':
          console.log('🔄 Attempting token refresh...');
          await this.config.onTokenRefresh();
          this.resetRetryCount(errorKey);
          return true;

        case 'login':
          console.log('🔐 Redirecting to login...');
          await this.config.onLogout();
          return false;

        case 'retry':
          console.log('🔁 Will retry connection...');
          return true;

        case 'reload':
          console.log('🔃 Reloading page...');
          this.config.onReload();
          return false;

        case 'none':
        default:
          console.warn('⚠️ No action available for error:', error.message);
          return false;
      }
    } catch (actionError) {
      console.error('❌ Error handling failed:', actionError);
      
      // If refresh failed, try logout
      if (error.suggestedAction === 'refresh') {
        await this.config.onLogout();
      }
      
      return false;
    }
  }

  /**
   * Handles case when max retries are exceeded
   */
  private async handleMaxRetriesExceeded(error: AuthError): Promise<void> {
    switch (error.type) {
      case AuthErrorType.TOKEN_EXPIRED:
      case AuthErrorType.TOKEN_INVALID:
      case AuthErrorType.UNAUTHORIZED:
        // For auth errors, logout after max retries
        await this.config.onLogout();
        break;
      
      case AuthErrorType.NETWORK_ERROR:
        // For network errors, show message and don't logout
        this.showErrorMessage('Network connection issues. Please check your connection and refresh the page.');
        break;
      
      default:
        // For other errors, reload the page
        this.config.onReload();
    }
  }

  /**
   * Default token refresh implementation
   */
  private async defaultTokenRefresh(): Promise<void> {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      throw error;
    }
  }

  /**
   * Default logout implementation
   */
  private async defaultLogout(): Promise<void> {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  /**
   * Shows error message to user
   */
  private showErrorMessage(message: string): void {
    // This could be replaced with a toast notification system
    console.error(`🚨 ${  message}`);
    
    // Create a simple error banner if it doesn't exist
    let errorBanner = document.getElementById('auth-error-banner');
    if (!errorBanner) {
      errorBanner = document.createElement('div');
      errorBanner.id = 'auth-error-banner';
      errorBanner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: #ef4444;
        color: white;
        padding: 12px;
        text-align: center;
        z-index: 9999;
        font-family: sans-serif;
      `;
      document.body.appendChild(errorBanner);
    }
    
    errorBanner.textContent = message;
    errorBanner.style.display = 'block';
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (errorBanner) {
        errorBanner.style.display = 'none';
      }
    }, 10000);
  }

  /**
   * Resets retry count for an error
   */
  resetRetryCount(errorKey?: string): void {
    if (errorKey) {
      this.retryCount.delete(errorKey);
    } else {
      this.retryCount.clear();
    }
  }

  /**
   * Gets current retry count for an error
   */
  getRetryCount(error: AuthError): number {
    const errorKey = `${error.type}-${error.message}`;
    return this.retryCount.get(errorKey) || 0;
  }
}