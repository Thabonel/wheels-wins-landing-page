import { useState, useEffect, useCallback, useContext, createContext, ReactNode } from 'react';
import { secureAuthService, AuthUser, LoginCredentials, RegisterData, ApiResponse } from '@/services/auth/secureAuthService';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<ApiResponse<AuthUser>>;
  register: (data: RegisterData) => Promise<ApiResponse<AuthUser>>;
  logout: (allDevices?: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Initialize authentication state
  const initializeAuth = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const isAuthenticated = await secureAuthService.isAuthenticated();

      if (isAuthenticated) {
        const userResponse = await secureAuthService.getCurrentUser();

        if (userResponse.data) {
          setState({
            user: userResponse.data,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          });
        } else {
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            error: userResponse.error || null,
          });
        }
      } else {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
      }
    } catch (error) {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : 'Authentication check failed',
      });
    }
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials): Promise<ApiResponse<AuthUser>> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const result = await secureAuthService.login(credentials);

    if (result.data) {
      setState({
        user: result.data,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
    } else {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: result.error || 'Login failed',
      }));
    }

    return result;
  }, []);

  // Register function
  const register = useCallback(async (data: RegisterData): Promise<ApiResponse<AuthUser>> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const result = await secureAuthService.register(data);

    if (result.data) {
      setState({
        user: result.data,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
    } else {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: result.error || 'Registration failed',
      }));
    }

    return result;
  }, []);

  // Logout function
  const logout = useCallback(async (allDevices = false) => {
    setState(prev => ({ ...prev, isLoading: true }));

    await secureAuthService.logout(allDevices);

    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!state.isAuthenticated) return;

    try {
      const userResponse = await secureAuthService.getCurrentUser();

      if (userResponse.data) {
        setState(prev => ({
          ...prev,
          user: userResponse.data!,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: userResponse.error || null,
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh user data',
      }));
    }
  }, [state.isAuthenticated]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Context value
  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useSecureAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useSecureAuth must be used within an AuthProvider');
  }

  return context;
}

// Hook for MFA operations
export function useMFA() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setupMFA = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await secureAuthService.setupMFA();

      if (result.error) {
        setError(result.error);
        return null;
      }

      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA setup failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyMFA = useCallback(async (setupToken: string, totpCode: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await secureAuthService.verifyMFA(setupToken, totpCode);

      if (result.error) {
        setError(result.error);
        return false;
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA verification failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getMFAStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await secureAuthService.getMFAStatus();

      if (result.error) {
        setError(result.error);
        return null;
      }

      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get MFA status');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disableMFA = useCallback(async (mfaCode: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await secureAuthService.disableMFA(mfaCode);

      if (result.error) {
        setError(result.error);
        return false;
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable MFA');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const regenerateBackupCodes = useCallback(async (mfaCode: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await secureAuthService.regenerateBackupCodes(mfaCode);

      if (result.error) {
        setError(result.error);
        return null;
      }

      return result.data?.backup_codes;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate backup codes');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    setupMFA,
    verifyMFA,
    getMFAStatus,
    disableMFA,
    regenerateBackupCodes,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

// Hook for session management
export function useSessionManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await secureAuthService.getUserSessions();

      if (result.error) {
        setError(result.error);
        return null;
      }

      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get sessions');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const revokeSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await secureAuthService.revokeSession(sessionId);

      if (result.error) {
        setError(result.error);
        return false;
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke session');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSecuritySettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await secureAuthService.getSecuritySettings();

      if (result.error) {
        setError(result.error);
        return null;
      }

      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get security settings');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getUserSessions,
    revokeSession,
    getSecuritySettings,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}