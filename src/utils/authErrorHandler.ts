import { supabase } from '@/integrations/supabase/client';

export interface AuthError {
  code: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  action: 'retry' | 'refresh' | 'logout' | 'reload';
  userMessage: string;
}

/**
 * Maps WebSocket close codes to authentication errors
 */
export function mapWebSocketCloseToAuthError(closeCode: number, reason?: string): AuthError | null {
  const authRelatedCodes: Record<number, AuthError> = {
    1008: {
      code: 'WS_AUTH_REQUIRED',
      message: 'WebSocket authentication required',
      severity: 'error',
      action: 'refresh',
      userMessage: 'Authentication is required. I\'ll try to refresh your session.'
    },
    4001: {
      code: 'WS_AUTH_INVALID',
      message: 'WebSocket authentication invalid',
      severity: 'error',
      action: 'refresh',
      userMessage: 'Your session appears to be invalid. Let me refresh it.'
    },
    4003: {
      code: 'WS_AUTH_FORBIDDEN',
      message: 'WebSocket authentication forbidden',
      severity: 'critical',
      action: 'logout',
      userMessage: 'Access forbidden. Please log out and back in.'
    },
    4004: {
      code: 'WS_AUTH_EXPIRED',
      message: 'WebSocket authentication expired',
      severity: 'warning',
      action: 'refresh',
      userMessage: 'Your session expired. Refreshing authentication...'
    }
  };

  const authError = authRelatedCodes[closeCode];
  
  if (authError) {
    return authError;
  }

  // Check reason string for auth-related keywords
  if (reason) {
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('auth') || lowerReason.includes('token') || lowerReason.includes('unauthorized')) {
      return {
        code: 'WS_AUTH_GENERIC',
        message: `WebSocket authentication issue: ${reason}`,
        severity: 'error',
        action: 'refresh',
        userMessage: 'Authentication issue detected. Attempting to refresh your session.'
      };
    }
  }

  return null;
}

/**
 * Maps HTTP status codes to authentication errors
 */
export function mapHttpStatusToAuthError(status: number, responseText?: string): AuthError | null {
  const authRelatedStatus: Record<number, AuthError> = {
    401: {
      code: 'HTTP_UNAUTHORIZED',
      message: 'HTTP authentication failed',
      severity: 'error',
      action: 'refresh',
      userMessage: 'Authentication failed. Refreshing your session...'
    },
    403: {
      code: 'HTTP_FORBIDDEN',
      message: 'HTTP access forbidden',
      severity: 'critical',
      action: 'logout',
      userMessage: 'Access forbidden. Please log out and back in.'
    }
  };

  const authError = authRelatedStatus[status];
  
  if (authError) {
    return authError;
  }

  // Check response text for auth-related errors
  if (responseText) {
    const lowerText = responseText.toLowerCase();
    if (lowerText.includes('jwt') || lowerText.includes('token') || lowerText.includes('expired')) {
      return {
        code: 'HTTP_AUTH_GENERIC',
        message: `HTTP authentication issue: ${responseText}`,
        severity: 'error',
        action: 'refresh',
        userMessage: 'Session issue detected. Refreshing authentication...'
      };
    }
  }

  return null;
}

/**
 * Maps JWT decode errors to authentication errors
 */
export function mapJwtErrorToAuthError(error: Error): AuthError {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('expired')) {
    return {
      code: 'JWT_EXPIRED',
      message: 'JWT token expired',
      severity: 'warning',
      action: 'refresh',
      userMessage: 'Your session expired. Refreshing...'
    };
  }
  
  if (errorMessage.includes('not enough segments') || errorMessage.includes('invalid')) {
    return {
      code: 'JWT_INVALID_FORMAT',
      message: 'JWT token has invalid format',
      severity: 'error',
      action: 'logout',
      userMessage: 'Invalid session format. Please log out and back in.'
    };
  }
  
  if (errorMessage.includes('signature')) {
    return {
      code: 'JWT_INVALID_SIGNATURE',
      message: 'JWT token signature invalid',
      severity: 'critical',
      action: 'logout',
      userMessage: 'Session signature invalid. Please log out and back in.'
    };
  }
  
  return {
    code: 'JWT_GENERIC_ERROR',
    message: `JWT error: ${error.message}`,
    severity: 'error',
    action: 'refresh',
    userMessage: 'Session error detected. Attempting to refresh...'
  };
}

/**
 * Handles authentication errors with appropriate actions
 */
export class AuthErrorHandler {
  private static instance: AuthErrorHandler;
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;

  static getInstance(): AuthErrorHandler {
    if (!AuthErrorHandler.instance) {
      AuthErrorHandler.instance = new AuthErrorHandler();
    }
    return AuthErrorHandler.instance;
  }

  async handleAuthError(
    error: AuthError,
    context: string = 'unknown',
    onMessage?: (message: string, type: 'error' | 'warning' | 'info') => void
  ): Promise<boolean> {
    const errorKey = `${error.code}_${context}`;
    const currentAttempts = this.retryAttempts.get(errorKey) || 0;

    console.log(`🔐 AUTH ERROR: Handling ${error.code} in ${context}`, {
      severity: error.severity,
      action: error.action,
      attempts: currentAttempts,
      maxRetries: this.maxRetries
    });

    // Check if we've exceeded retry attempts
    if (currentAttempts >= this.maxRetries && error.action !== 'logout') {
      console.error(`🔐 AUTH ERROR: Max retries exceeded for ${error.code}`);
      if (onMessage) {
        onMessage(`Max retry attempts exceeded. Please refresh the page or log out and back in.`, 'error');
      }
      return false;
    }

    // Increment retry count
    this.retryAttempts.set(errorKey, currentAttempts + 1);

    // Notify user
    if (onMessage && error.userMessage) {
      const messageType = error.severity === 'critical' ? 'error' : 
                         error.severity === 'error' ? 'error' : 'warning';
      onMessage(error.userMessage, messageType);
    }

    try {
      switch (error.action) {
        case 'refresh':
          return await this.handleRefreshAction(error, context);
          
        case 'logout':
          return await this.handleLogoutAction(error, context);
          
        case 'reload':
          return this.handleReloadAction(error, context);
          
        case 'retry':
          // Retry is handled by the caller
          return true;
          
        default:
          console.warn(`🔐 AUTH ERROR: Unknown action ${error.action}`);
          return false;
      }
    } catch (actionError) {
      console.error(`🔐 AUTH ERROR: Failed to handle ${error.action} action:`, actionError);
      return false;
    }
  }

  private async handleRefreshAction(error: AuthError, context: string): Promise<boolean> {
    try {
      console.log(`🔄 AUTH: Attempting token refresh for ${error.code} in ${context}`);
      
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !data.session?.access_token) {
        console.error('🔄 AUTH: Token refresh failed:', refreshError);
        
        // If refresh fails, escalate to logout
        const logoutError: AuthError = {
          code: 'REFRESH_FAILED',
          message: 'Token refresh failed',
          severity: 'critical',
          action: 'logout',
          userMessage: 'Unable to refresh your session. Please log out and back in.'
        };
        
        return await this.handleLogoutAction(logoutError, context);
      }
      
      console.log('✅ AUTH: Token refresh successful');
      
      // Clear retry count on successful refresh
      const errorKey = `${error.code}_${context}`;
      this.retryAttempts.delete(errorKey);
      
      return true;
      
    } catch (refreshError) {
      console.error('🔄 AUTH: Exception during token refresh:', refreshError);
      return false;
    }
  }

  private async handleLogoutAction(error: AuthError, context: string): Promise<boolean> {
    try {
      console.log(`🚪 AUTH: Attempting logout for ${error.code} in ${context}`);
      
      await supabase.auth.signOut();
      
      // Clear all retry counts
      this.retryAttempts.clear();
      
      // Redirect to login page or reload
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      
      return true;
      
    } catch (logoutError) {
      console.error('🚪 AUTH: Exception during logout:', logoutError);
      return false;
    }
  }

  private handleReloadAction(error: AuthError, context: string): boolean {
    try {
      console.log(`🔄 AUTH: Attempting page reload for ${error.code} in ${context}`);
      
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      
      return true;
      
    } catch (reloadError) {
      console.error('🔄 AUTH: Exception during page reload:', reloadError);
      return false;
    }
  }

  /**
   * Reset retry count for a specific error/context combination
   */
  resetRetryCount(errorCode: string, context: string): void {
    const errorKey = `${errorCode}_${context}`;
    this.retryAttempts.delete(errorKey);
  }

  /**
   * Clear all retry counts
   */
  clearAllRetries(): void {
    this.retryAttempts.clear();
  }
}