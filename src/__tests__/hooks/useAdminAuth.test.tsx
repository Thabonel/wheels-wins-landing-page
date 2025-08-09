import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAuth } from '@/context/AuthContext';
import { 
  mockUser, 
  mockSession, 
  mockAdminUser, 
  mockAdminSession,
  resetAllMocks 
} from '@/test/mocks/supabase';

// Mock the useAuth hook
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn()
}));

const mockUseAuth = vi.mocked(useAuth);

describe('useAdminAuth', () => {
  const mockAuthContext = {
    user: null,
    token: null,
    session: null,
    loading: false,
    isAuthenticated: false,
    isDevMode: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    logout: vi.fn()
  };

  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(mockAuthContext);
  });

  describe('Admin status checking', () => {
    it('should return non-admin status for unauthenticated users', async () => {
      const unauthenticatedContext = {
        ...mockAuthContext,
        user: null,
        session: null,
        isAuthenticated: false
      };
      mockUseAuth.mockReturnValue(unauthenticatedContext);

      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should return non-admin status for regular users', async () => {
      const regularUserContext = {
        ...mockAuthContext,
        user: mockUser,
        session: mockSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(regularUserContext);

      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.error).toBeNull();
    });

    it('should return admin status for admin users', async () => {
      const adminUserContext = {
        ...mockAuthContext,
        user: mockAdminUser,
        session: mockAdminSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(adminUserContext);

      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.user).toEqual(mockAdminUser);
      expect(result.current.session).toEqual(mockAdminSession);
      expect(result.current.error).toBeNull();
    });

    it('should handle the second admin email (thabonel0@gmail.com)', async () => {
      const secondAdminUser = {
        ...mockUser,
        email: 'thabonel0@gmail.com'
      };
      const secondAdminSession = {
        ...mockSession,
        user: secondAdminUser
      };
      const secondAdminContext = {
        ...mockAuthContext,
        user: secondAdminUser,
        session: secondAdminSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(secondAdminContext);

      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.user).toEqual(secondAdminUser);
    });
  });

  describe('Loading states', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useAdminAuth());

      expect(result.current.loading).toBe(true);
      expect(result.current.isAdmin).toBe(false);
    });

    it('should finish loading after checking admin status', async () => {
      const authenticatedContext = {
        ...mockAuthContext,
        user: mockUser,
        session: mockSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(authenticatedContext);

      const { result } = renderHook(() => useAdminAuth());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Authentication state changes', () => {
    it('should update when authentication state changes', async () => {
      const { result, rerender } = renderHook(() => useAdminAuth());

      // Initially unauthenticated
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.isAdmin).toBe(false);
      });

      // User becomes authenticated as admin
      const adminContext = {
        ...mockAuthContext,
        user: mockAdminUser,
        session: mockAdminSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(adminContext);

      rerender();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.isAdmin).toBe(true);
      });
    });

    it('should update when user logs out', async () => {
      // Start with admin user
      const adminContext = {
        ...mockAuthContext,
        user: mockAdminUser,
        session: mockAdminSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(adminContext);

      const { result, rerender } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(true);
      });

      // User logs out
      const loggedOutContext = {
        ...mockAuthContext,
        user: null,
        session: null,
        isAuthenticated: false
      };
      mockUseAuth.mockReturnValue(loggedOutContext);

      rerender();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.isAdmin).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
      });
    });

    it('should update when switching between users', async () => {
      // Start with regular user
      const regularUserContext = {
        ...mockAuthContext,
        user: mockUser,
        session: mockSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(regularUserContext);

      const { result, rerender } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(false);
      });

      // Switch to admin user
      const adminContext = {
        ...mockAuthContext,
        user: mockAdminUser,
        session: mockAdminSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(adminContext);

      rerender();

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(true);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle user without email', async () => {
      const userWithoutEmail = {
        ...mockUser,
        email: null
      };
      const contextWithoutEmail = {
        ...mockAuthContext,
        user: userWithoutEmail,
        session: mockSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(contextWithoutEmail);

      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle user with empty email', async () => {
      const userWithEmptyEmail = {
        ...mockUser,
        email: ''
      };
      const contextWithEmptyEmail = {
        ...mockAuthContext,
        user: userWithEmptyEmail,
        session: mockSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(contextWithEmptyEmail);

      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle user with undefined email', async () => {
      const userWithUndefinedEmail = {
        ...mockUser,
        email: undefined as any
      };
      const contextWithUndefinedEmail = {
        ...mockAuthContext,
        user: userWithUndefinedEmail,
        session: mockSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(contextWithUndefinedEmail);

      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle missing user but with session', async () => {
      const contextWithoutUser = {
        ...mockAuthContext,
        user: null,
        session: mockSession,
        isAuthenticated: false
      };
      mockUseAuth.mockReturnValue(contextWithoutUser);

      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle missing session but with user', async () => {
      const contextWithoutSession = {
        ...mockAuthContext,
        user: mockUser,
        session: null,
        isAuthenticated: false
      };
      mockUseAuth.mockReturnValue(contextWithoutSession);

      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Recheck functionality', () => {
    it('should provide recheckAdminStatus function', async () => {
      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.recheckAdminStatus).toBe('function');
    });

    it('should recheck admin status when recheckAdminStatus is called', async () => {
      const regularUserContext = {
        ...mockAuthContext,
        user: mockUser,
        session: mockSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(regularUserContext);

      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.isAdmin).toBe(false);
      });

      // Change to admin user and trigger recheck
      const adminContext = {
        ...mockAuthContext,
        user: mockAdminUser,
        session: mockAdminSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(adminContext);

      // Call recheck
      result.current.recheckAdminStatus();

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.isAdmin).toBe(true);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle errors during admin status check gracefully', async () => {
      // Mock console.error to capture error logs
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create a context that might cause issues
      const problematicContext = {
        ...mockAuthContext,
        user: mockUser,
        session: mockSession,
        isAuthenticated: true
      };

      // Mock the email check to throw an error
      const problematicUser = {
        ...mockUser,
        get email() {
          throw new Error('Email access error');
        }
      };
      problematicContext.user = problematicUser;

      mockUseAuth.mockReturnValue(problematicContext);

      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.error).toBe('Failed to verify admin status');

      consoleSpy.mockRestore();
    });

    it('should reset error state on successful recheck', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Start with error state
      const problematicContext = {
        ...mockAuthContext,
        user: {
          ...mockUser,
          get email() {
            throw new Error('Email access error');
          }
        },
        session: mockSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(problematicContext);

      const { result } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to verify admin status');
      });

      // Fix the issue and recheck
      const fixedContext = {
        ...mockAuthContext,
        user: mockAdminUser,
        session: mockAdminSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(fixedContext);

      result.current.recheckAdminStatus();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.isAdmin).toBe(true);
        expect(result.current.error).toBeNull();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Performance and stability', () => {
    it('should not cause infinite re-renders', async () => {
      const stableContext = {
        ...mockAuthContext,
        user: mockAdminUser,
        session: mockAdminSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(stableContext);

      const { result, rerender } = renderHook(() => useAdminAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialResult = result.current;

      // Multiple rerenders with same context
      rerender();
      rerender();
      rerender();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Results should be consistent
      expect(result.current.isAdmin).toBe(initialResult.isAdmin);
      expect(result.current.error).toBe(initialResult.error);
    });

    it('should handle rapid authentication state changes', async () => {
      const { result, rerender } = renderHook(() => useAdminAuth());

      const contexts = [
        { ...mockAuthContext, isAuthenticated: false },
        { ...mockAuthContext, user: mockUser, isAuthenticated: true },
        { ...mockAuthContext, user: mockAdminUser, isAuthenticated: true },
        { ...mockAuthContext, isAuthenticated: false },
        { ...mockAuthContext, user: mockAdminUser, isAuthenticated: true }
      ];

      // Rapidly change contexts
      for (const context of contexts) {
        mockUseAuth.mockReturnValue(context);
        rerender();
      }

      // Should settle on the final state (admin)
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.isAdmin).toBe(true);
      });
    });
  });

  describe('Admin email list', () => {
    it('should recognize all admin emails', async () => {
      const adminEmails = ['admin@wheelsandwins.com', 'thabonel0@gmail.com'];

      for (const email of adminEmails) {
        const adminUser = { ...mockUser, email };
        const adminSession = { ...mockSession, user: adminUser };
        const adminContext = {
          ...mockAuthContext,
          user: adminUser,
          session: adminSession,
          isAuthenticated: true
        };
        mockUseAuth.mockReturnValue(adminContext);

        const { result } = renderHook(() => useAdminAuth());

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect(result.current.isAdmin).toBe(true);
      }
    });

    it('should not recognize non-admin emails', async () => {
      const nonAdminEmails = [
        'user@example.com',
        'admin@example.com',
        'thabonelX@gmail.com',
        'admin.wheelsandwins@gmail.com',
        'admin@wheelsandwins.net'
      ];

      for (const email of nonAdminEmails) {
        const nonAdminUser = { ...mockUser, email };
        const nonAdminSession = { ...mockSession, user: nonAdminUser };
        const nonAdminContext = {
          ...mockAuthContext,
          user: nonAdminUser,
          session: nonAdminSession,
          isAuthenticated: true
        };
        mockUseAuth.mockReturnValue(nonAdminContext);

        const { result } = renderHook(() => useAdminAuth());

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect(result.current.isAdmin).toBe(false);
      }
    });
  });
});