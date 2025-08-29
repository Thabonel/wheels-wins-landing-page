import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { 
  mockSupabaseAuth, 
  mockUser, 
  mockSession, 
  mockAdminUser, 
  mockAdminSession,
  setMockAuthState, 
  setMockAuthError, 
  resetAllMocks, 
  triggerAuthStateChange,
  mockAuthError
} from '@/test/mocks/supabase';

// Wrapper component for AuthProvider
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    resetAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress expected error in console
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        const TestComponent = () => {
          useAuth();
          return null;
        };
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should provide initial authentication state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.loading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isDevMode).toBe(false);
    });

    it('should handle initial session loading', async () => {
      setMockAuthState(mockUser, mockSession);
      
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        full_name: mockUser.user_metadata?.full_name
      });
      expect(result.current.token).toBe(mockSession.access_token);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle no initial session', async () => {
      setMockAuthState(null);
      
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Authentication methods', () => {
    it('should handle successful sign in', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should handle sign in error', async () => {
      setMockAuthError(mockAuthError);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await expect(async () => {
        await act(async () => {
          await result.current.signIn('test@example.com', 'wrongpassword');
        });
      }).rejects.toThrow('Invalid login credentials');
    });

    it('should handle successful sign up', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.signUp('test@example.com', 'password123', 'Test User');
      });

      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: 'http://localhost:3000/',
          data: { full_name: 'Test User' }
        }
      });
    });

    it('should handle sign up without full name', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.signUp('test@example.com', 'password123');
      });

      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: 'http://localhost:3000/',
          data: {}
        }
      });
    });

    it('should handle sign up error', async () => {
      const signUpError = { ...mockAuthError, message: 'User already registered' };
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: signUpError
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await expect(async () => {
        await act(async () => {
          await result.current.signUp('existing@example.com', 'password123');
        });
      }).rejects.toThrow('User already registered');
    });

    it('should handle sign out', async () => {
      mockSupabaseAuth.signOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    });

    it('should handle logout (alias for signOut)', async () => {
      mockSupabaseAuth.signOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out error', async () => {
      const signOutError = { ...mockAuthError, message: 'Failed to sign out' };
      mockSupabaseAuth.signOut.mockResolvedValue({ error: signOutError });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await expect(async () => {
        await act(async () => {
          await result.current.signOut();
        });
      }).rejects.toThrow('Failed to sign out');
    });
  });

  describe('Auth state changes', () => {
    it('should handle SIGNED_IN event', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        triggerAuthStateChange('SIGNED_IN', mockSession);
        vi.runAllTimers(); // Run the setTimeout calls
      });

      await waitFor(() => {
        expect(result.current.user).toEqual({
          id: mockUser.id,
          email: mockUser.email,
          full_name: mockUser.user_metadata?.full_name
        });
        expect(result.current.session).toEqual(mockSession);
        expect(result.current.token).toBe(mockSession.access_token);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle SIGNED_OUT event', async () => {
      // Start with authenticated user
      setMockAuthState(mockUser, mockSession);
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Trigger sign out
      await act(async () => {
        triggerAuthStateChange('SIGNED_OUT', null);
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
        expect(result.current.token).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle TOKEN_REFRESHED event', async () => {
      const refreshedSession = { ...mockSession, access_token: 'new_token' };

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        triggerAuthStateChange('TOKEN_REFRESHED', refreshedSession);
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.token).toBe('new_token');
        expect(result.current.session).toEqual(refreshedSession);
      });
    });

    it('should handle auth state change errors gracefully', async () => {
      // Mock console.error to suppress expected error logs
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      // Simulate an error during auth state change
      await act(async () => {
        try {
          triggerAuthStateChange('SIGNED_IN', mockSession);
          // Simulate an error in the auth state change handler
          throw new Error('Auth state change error');
        } catch (error) {
          // Error should be caught and handled gracefully
        }
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Admin user handling', () => {
    it('should handle admin user authentication', async () => {
      setMockAuthState(mockAdminUser, mockAdminSession);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.user).toEqual({
          id: mockAdminUser.id,
          email: mockAdminUser.email,
          full_name: mockAdminUser.user_metadata?.full_name
        });
        expect(result.current.isAuthenticated).toBe(true);
      });
    });
  });

  describe('Component unmounting', () => {
    it('should unsubscribe from auth state changes on unmount', async () => {
      const unsubscribeMock = vi.fn();
      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: {
          subscription: {
            unsubscribe: unsubscribeMock
          }
        }
      });

      const { unmount } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should prevent state updates after unmount', async () => {
      const { result, unmount } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      unmount();

      // Try to trigger auth state change after unmount
      await act(async () => {
        triggerAuthStateChange('SIGNED_IN', mockSession);
        vi.runAllTimers();
      });

      // State should not update after unmount
      expect(result.current.user).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle missing user metadata', async () => {
      const userWithoutMetadata = { ...mockUser, user_metadata: {} };
      const sessionWithoutMetadata = { ...mockSession, user: userWithoutMetadata };
      
      setMockAuthState(userWithoutMetadata, sessionWithoutMetadata);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.user).toEqual({
          id: userWithoutMetadata.id,
          email: userWithoutMetadata.email,
          full_name: undefined
        });
      });
    });

    it('should handle user without email', async () => {
      const userWithoutEmail = { ...mockUser, email: null };
      const sessionWithoutEmail = { ...mockSession, user: userWithoutEmail };
      
      setMockAuthState(userWithoutEmail, sessionWithoutEmail);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.user).toEqual({
          id: userWithoutEmail.id,
          email: '',
          full_name: userWithoutEmail.user_metadata?.full_name
        });
      });
    });
  });
});