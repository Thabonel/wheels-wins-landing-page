/**
 * Secure Authentication Service
 * Implements httpOnly cookies, CSRF protection, and automatic token refresh
 */

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

interface AuthUser {
  id: string;
  email: string;
  role: string;
  mfa_verified: boolean;
  requires_mfa: boolean;
  session_id?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  detail?: string;
}

class SecureAuthService {
  private baseUrl = '/api/v1/auth';
  private csrfToken: string | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeCSRF();
    this.setupTokenRefresh();
  }

  /**
   * Initialize CSRF protection
   */
  private async initializeCSRF() {
    try {
      const response = await fetch('/api/v1/auth/csrf-token', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        this.csrfToken = data.csrf_token;

        // Store CSRF token in meta tag for other components
        let metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.name = 'csrf-token';
          document.head.appendChild(metaTag);
        }
        metaTag.content = this.csrfToken;
      }
    } catch (error) {
      console.warn('Failed to initialize CSRF token:', error);
    }
  }

  /**
   * Get common headers for authenticated requests
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    return headers;
  }

  /**
   * Make authenticated API request with automatic token refresh
   */
  private async authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    // If token expired, try to refresh
    if (response.status === 401) {
      const refreshSuccess = await this.refreshToken();
      if (refreshSuccess) {
        // Retry the request with new token
        return fetch(url, {
          ...options,
          credentials: 'include',
          headers: {
            ...this.getAuthHeaders(),
            ...options.headers,
          },
        });
      }
    }

    return response;
  }

  /**
   * Login with email and password (and optional MFA code)
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthUser>> {
    try {
      const headers = this.getAuthHeaders();

      // Add MFA code to header if provided
      if (credentials.mfaCode) {
        headers['X-MFA-Code'] = credentials.mfaCode;
      }

      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || 'Login failed' };
      }

      // Setup automatic token refresh
      this.setupTokenRefresh();

      // Get user profile
      const userResponse = await this.getCurrentUser();
      if (userResponse.data) {
        return { data: userResponse.data };
      }

      return { error: 'Login succeeded but failed to get user data' };

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error during login'
      };
    }
  }

  /**
   * Register new user account
   */
  async register(userData: RegisterData): Promise<ApiResponse<AuthUser>> {
    try {
      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || 'Registration failed' };
      }

      // Setup automatic token refresh
      this.setupTokenRefresh();

      // Get user profile
      const userResponse = await this.getCurrentUser();
      if (userResponse.data) {
        return { data: userResponse.data };
      }

      return { error: 'Registration succeeded but failed to get user data' };

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error during registration'
      };
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/me`);
      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || 'Failed to get user data' };
      }

      return { data };

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error getting user data'
      };
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        this.setupTokenRefresh();
        return true;
      }

      // Refresh failed, user needs to log in again
      this.clearTokenRefreshTimer();
      return false;

    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearTokenRefreshTimer();
      return false;
    }
  }

  /**
   * Logout from current session or all sessions
   */
  async logout(allDevices = false): Promise<ApiResponse<void>> {
    try {
      const response = await this.authenticatedFetch(
        `${this.baseUrl}/logout${allDevices ? '?all_devices=true' : ''}`,
        { method: 'POST' }
      );

      this.clearTokenRefreshTimer();

      if (!response.ok) {
        const data = await response.json();
        return { error: data.detail || 'Logout failed' };
      }

      return {};

    } catch (error) {
      this.clearTokenRefreshTimer();
      return {
        error: error instanceof Error ? error.message : 'Network error during logout'
      };
    }
  }

  /**
   * Setup automatic token refresh
   */
  private setupTokenRefresh() {
    this.clearTokenRefreshTimer();

    // Refresh token every 25 minutes (5 minutes before 30-minute expiry)
    this.refreshTimer = setTimeout(() => {
      this.refreshToken();
    }, 25 * 60 * 1000);
  }

  /**
   * Clear token refresh timer
   */
  private clearTokenRefreshTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/me`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Setup MFA for current user
   */
  async setupMFA(): Promise<ApiResponse<{
    secret: string;
    qr_code: string;
    backup_codes: string[];
    setup_token: string;
  }>> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/mfa/setup`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || 'MFA setup failed' };
      }

      return { data };

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error during MFA setup'
      };
    }
  }

  /**
   * Verify and enable MFA
   */
  async verifyMFA(setupToken: string, totpCode: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/mfa/verify`, {
        method: 'POST',
        body: JSON.stringify({
          setup_token: setupToken,
          totp_code: totpCode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        return { error: data.detail || 'MFA verification failed' };
      }

      return {};

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error during MFA verification'
      };
    }
  }

  /**
   * Get MFA status
   */
  async getMFAStatus(): Promise<ApiResponse<{
    enabled: boolean;
    backup_codes_remaining: number;
    last_used?: string;
    setup_date?: string;
  }>> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/mfa/status`);
      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || 'Failed to get MFA status' };
      }

      return { data };

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error getting MFA status'
      };
    }
  }

  /**
   * Disable MFA (requires MFA verification)
   */
  async disableMFA(mfaCode: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/mfa/disable`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'X-MFA-Code': mfaCode,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        return { error: data.detail || 'Failed to disable MFA' };
      }

      return {};

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error disabling MFA'
      };
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(mfaCode: string): Promise<ApiResponse<{ backup_codes: string[] }>> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/mfa/regenerate-backup-codes`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'X-MFA-Code': mfaCode,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || 'Failed to regenerate backup codes' };
      }

      return { data };

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error regenerating backup codes'
      };
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(): Promise<ApiResponse<{
    sessions: Array<{
      session_id: string;
      created_at: string;
      last_activity: string;
      device_info?: any;
      ip_address?: string;
      user_agent?: string;
    }>;
    current_session_id?: string;
  }>> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/sessions`);
      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || 'Failed to get sessions' };
      }

      return { data };

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error getting sessions'
      };
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        return { error: data.detail || 'Failed to revoke session' };
      }

      return {};

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error revoking session'
      };
    }
  }

  /**
   * Get security settings
   */
  async getSecuritySettings(): Promise<ApiResponse<{
    mfa_enabled: boolean;
    active_sessions: number;
    last_login?: string;
  }>> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/security`);
      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || 'Failed to get security settings' };
      }

      return { data };

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error getting security settings'
      };
    }
  }

  /**
   * Cleanup on service destruction
   */
  destroy() {
    this.clearTokenRefreshTimer();
  }
}

// Export singleton instance
export const secureAuthService = new SecureAuthService();

// Export types
export type {
  AuthUser,
  LoginCredentials,
  RegisterData,
  ApiResponse,
  AuthTokens,
};