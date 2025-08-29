import { supabase } from '@/integrations/supabase/client';
import { jwtDecode } from 'jwt-decode';

interface RecoveryStrategy {
  shouldRetry: boolean;
  delay: number;
  message: string;
  action: 'reconnect' | 'refresh_token' | 'user_action_required';
}

export class WebSocketErrorRecovery {
  private consecutiveFailures = 0;
  private lastTokenRefresh = 0;
  private readonly MIN_TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  /**
   * Analyze error and determine recovery strategy
   */
  public analyzeError(error: any, closeCode?: number): RecoveryStrategy {
    this.consecutiveFailures++;

    // Authentication errors
    if (closeCode === 4000 || closeCode === 1008 || closeCode === 4001) {
      return {
        shouldRetry: true,
        delay: 1000,
        message: 'Authentication failed. Refreshing credentials...',
        action: 'refresh_token'
      };
    }

    // Token expired
    if (error?.message?.includes('expired') || error?.message?.includes('invalid')) {
      return {
        shouldRetry: true,
        delay: 1000,
        message: 'Session expired. Refreshing token...',
        action: 'refresh_token'
      };
    }

    // Network errors
    if (error?.message?.includes('network') || error?.message?.includes('Failed to fetch')) {
      const delay = Math.min(Math.pow(2, this.consecutiveFailures) * 1000, 30000);
      return {
        shouldRetry: this.consecutiveFailures < 5,
        delay,
        message: `Network error. Retrying in ${delay/1000}s...`,
        action: 'reconnect'
      };
    }

    // Server errors (5xx)
    if (closeCode && closeCode >= 1011 && closeCode <= 1014) {
      const delay = Math.min(Math.pow(2, this.consecutiveFailures) * 2000, 60000);
      return {
        shouldRetry: this.consecutiveFailures < 3,
        delay,
        message: `Server error. Retrying in ${delay/1000}s...`,
        action: 'reconnect'
      };
    }

    // Rate limiting
    if (closeCode === 1013) {
      return {
        shouldRetry: true,
        delay: 30000, // Wait 30 seconds for rate limit reset
        message: 'Rate limited. Waiting before retry...',
        action: 'reconnect'
      };
    }

    // Too many failures
    if (this.consecutiveFailures >= 5) {
      return {
        shouldRetry: false,
        delay: 0,
        message: 'Multiple connection failures. Please refresh the page.',
        action: 'user_action_required'
      };
    }

    // Generic error with exponential backoff
    const delay = Math.min(Math.pow(2, this.consecutiveFailures) * 1000, 30000);
    return {
      shouldRetry: true,
      delay,
      message: `Connection error. Retrying in ${delay/1000}s...`,
      action: 'reconnect'
    };
  }

  /**
   * Execute recovery action
   */
  public async executeRecovery(strategy: RecoveryStrategy): Promise<boolean> {
    switch (strategy.action) {
      case 'refresh_token':
        return await this.refreshToken();
      case 'reconnect':
        // Delay is handled by caller
        return true;
      case 'user_action_required':
        return false;
      default:
        return true;
    }
  }

  /**
   * Reset failure counter on successful connection
   */
  public reset(): void {
    this.consecutiveFailures = 0;
  }

  /**
   * Get current failure count
   */
  public getFailureCount(): number {
    return this.consecutiveFailures;
  }

  /**
   * Check if token needs refresh
   */
  public async shouldRefreshToken(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return false;
      }

      const decoded = jwtDecode(session.access_token) as any;
      const expiresAt = decoded.exp * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // Refresh if expires in less than 10 minutes
      return timeUntilExpiry < 10 * 60 * 1000;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // Better to refresh than fail
    }
  }

  /**
   * Refresh authentication token
   */
  private async refreshToken(): Promise<boolean> {
    const now = Date.now();
    
    // Prevent too frequent token refreshes
    if (now - this.lastTokenRefresh < this.MIN_TOKEN_REFRESH_INTERVAL) {
      console.log('⏳ Token refresh rate limited, skipping...');
      return true;
    }

    try {
      console.log('🔄 Refreshing authentication token...');
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        console.error('❌ Token refresh failed:', error);
        return false;
      }

      this.lastTokenRefresh = now;
      console.log('✅ Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      return false;
    }
  }

  /**
   * Get user-friendly error message
   */
  public getUserMessage(error: any, closeCode?: number): string {
    if (closeCode === 4000 || closeCode === 1008) {
      return 'Please sign in again to continue using PAM.';
    }

    if (error?.message?.includes('network')) {
      return 'Network connection issue. PAM will reconnect automatically.';
    }

    if (this.consecutiveFailures >= 5) {
      return 'PAM is having trouble connecting. Please refresh the page or try again later.';
    }

    return 'Reconnecting to PAM...';
  }

  /**
   * Check if error is recoverable
   */
  public isRecoverable(error: any, closeCode?: number): boolean {
    // Permanent failures
    if (closeCode === 1002 || closeCode === 1003) return false; // Protocol error, invalid data
    if (this.consecutiveFailures >= 5) return false; // Too many failures
    
    return true;
  }
}