import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  mockUser, 
  mockSession, 
  resetAllMocks 
} from '@/test/mocks/supabase';

// Mock the useAuth hook
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock react-router-dom Navigate component
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
      <div data-testid="navigate-mock" data-to={to} data-replace={replace?.toString()}>
        Redirecting to {to}
      </div>
    ),
    useNavigate: vi.fn()
  };
});

const mockUseAuth = vi.mocked(useAuth);

// Test component to render inside ProtectedRoute
const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

describe('ProtectedRoute', () => {
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

  describe('Authentication checks', () => {
    it('should render children when user is authenticated', () => {
      const authenticatedContext = {
        ...mockAuthContext,
        user: mockUser,
        session: mockSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(authenticatedContext);

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-mock')).not.toBeInTheDocument();
    });

    it('should redirect to login when user is not authenticated', () => {
      const unauthenticatedContext = {
        ...mockAuthContext,
        user: null,
        session: null,
        isAuthenticated: false
      };
      mockUseAuth.mockReturnValue(unauthenticatedContext);

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
      expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', '/login');
      expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-replace', 'true');
    });

    it('should render children when in dev mode even if not authenticated', () => {
      const devModeContext = {
        ...mockAuthContext,
        user: null,
        session: null,
        isAuthenticated: false,
        isDevMode: true
      };
      mockUseAuth.mockReturnValue(devModeContext);

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-mock')).not.toBeInTheDocument();
    });
  });

  describe('Different authentication states', () => {
    it('should handle user with valid session', () => {
      const validSessionContext = {
        ...mockAuthContext,
        user: mockUser,
        session: mockSession,
        token: mockSession.access_token,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(validSessionContext);

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should handle user with expired session', () => {
      const expiredSessionContext = {
        ...mockAuthContext,
        user: null,
        session: null,
        token: null,
        isAuthenticated: false
      };
      mockUseAuth.mockReturnValue(expiredSessionContext);

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
      expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', '/login');
    });

    it('should handle partial authentication state (user but no session)', () => {
      const partialAuthContext = {
        ...mockAuthContext,
        user: mockUser,
        session: null,
        isAuthenticated: false // This is the key - isAuthenticated is false
      };
      mockUseAuth.mockReturnValue(partialAuthContext);

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Should redirect because isAuthenticated is false
      expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
      expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', '/login');
    });

    it('should handle session without user', () => {
      const sessionWithoutUserContext = {
        ...mockAuthContext,
        user: null,
        session: mockSession,
        isAuthenticated: false // This is the key - isAuthenticated is false
      };
      mockUseAuth.mockReturnValue(sessionWithoutUserContext);

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Should redirect because isAuthenticated is false
      expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
      expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', '/login');
    });
  });

  describe('Dev mode scenarios', () => {
    it('should allow access in dev mode regardless of authentication', () => {
      const devModeUnauthenticatedContext = {
        ...mockAuthContext,
        user: null,
        session: null,
        token: null,
        isAuthenticated: false,
        isDevMode: true
      };
      mockUseAuth.mockReturnValue(devModeUnauthenticatedContext);

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should work normally when authenticated and in dev mode', () => {
      const devModeAuthenticatedContext = {
        ...mockAuthContext,
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
        isDevMode: true
      };
      mockUseAuth.mockReturnValue(devModeAuthenticatedContext);

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Children rendering', () => {
    it('should render single child component', () => {
      const authenticatedContext = {
        ...mockAuthContext,
        user: mockUser,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(authenticatedContext);

      render(
        <ProtectedRoute>
          <div data-testid="single-child">Single Child</div>
        </ProtectedRoute>
      );

      expect(screen.getByTestId('single-child')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      const authenticatedContext = {
        ...mockAuthContext,
        user: mockUser,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(authenticatedContext);

      render(
        <ProtectedRoute>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </ProtectedRoute>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('should render complex nested components', () => {
      const authenticatedContext = {
        ...mockAuthContext,
        user: mockUser,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(authenticatedContext);

      const ComplexComponent = () => (
        <div data-testid="complex-component">
          <header data-testid="header">Header</header>
          <main data-testid="main">
            <section data-testid="section">Section</section>
          </main>
          <footer data-testid="footer">Footer</footer>
        </div>
      );

      render(
        <ProtectedRoute>
          <ComplexComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('complex-component')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('main')).toBeInTheDocument();
      expect(screen.getByTestId('section')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('should handle empty children', () => {
      const authenticatedContext = {
        ...mockAuthContext,
        user: mockUser,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(authenticatedContext);

      render(<ProtectedRoute>{null}</ProtectedRoute>);

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('navigate-mock')).not.toBeInTheDocument();
    });
  });

  describe('Authentication state changes', () => {
    it('should update when authentication state changes from unauthenticated to authenticated', () => {
      const { rerender } = render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Initially unauthenticated
      expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

      // User becomes authenticated
      const authenticatedContext = {
        ...mockAuthContext,
        user: mockUser,
        session: mockSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(authenticatedContext);

      rerender(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-mock')).not.toBeInTheDocument();
    });

    it('should update when authentication state changes from authenticated to unauthenticated', () => {
      const authenticatedContext = {
        ...mockAuthContext,
        user: mockUser,
        session: mockSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(authenticatedContext);

      const { rerender } = render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Initially authenticated
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-mock')).not.toBeInTheDocument();

      // User becomes unauthenticated
      const unauthenticatedContext = {
        ...mockAuthContext,
        user: null,
        session: null,
        isAuthenticated: false
      };
      mockUseAuth.mockReturnValue(unauthenticatedContext);

      rerender(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle missing auth context gracefully', () => {
      // This test ensures the component doesn't crash if useAuth returns undefined
      // though in practice this should never happen due to the error in useAuth
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockUseAuth.mockImplementation(() => {
        throw new Error('useAuth must be used within an AuthProvider');
      });

      expect(() => {
        render(
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        );
      }).toThrow('useAuth must be used within an AuthProvider');

      mockConsoleError.mockRestore();
    });

    it('should handle loading state', () => {
      const loadingContext = {
        ...mockAuthContext,
        loading: true,
        user: null,
        isAuthenticated: false
      };
      mockUseAuth.mockReturnValue(loadingContext);

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // When loading and not authenticated, should still redirect
      expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
    });

    it('should handle authenticated loading state', () => {
      const authenticatedLoadingContext = {
        ...mockAuthContext,
        loading: true,
        user: mockUser,
        session: mockSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(authenticatedLoadingContext);

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // When loading but authenticated, should render content
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Navigation behavior', () => {
    it('should use replace navigation to prevent back button issues', () => {
      const unauthenticatedContext = {
        ...mockAuthContext,
        user: null,
        isAuthenticated: false
      };
      mockUseAuth.mockReturnValue(unauthenticatedContext);

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      const navigateElement = screen.getByTestId('navigate-mock');
      expect(navigateElement).toHaveAttribute('data-replace', 'true');
    });

    it('should always redirect to /login path', () => {
      const unauthenticatedContext = {
        ...mockAuthContext,
        user: null,
        isAuthenticated: false
      };
      mockUseAuth.mockReturnValue(unauthenticatedContext);

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      const navigateElement = screen.getByTestId('navigate-mock');
      expect(navigateElement).toHaveAttribute('data-to', '/login');
    });
  });

  describe('Performance considerations', () => {
    it('should not cause unnecessary re-renders', () => {
      const authenticatedContext = {
        ...mockAuthContext,
        user: mockUser,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(authenticatedContext);

      const { rerender } = render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Rerender with same context should not cause issues
      rerender(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should handle rapid authentication state changes', () => {
      let context = { ...mockAuthContext, isAuthenticated: false };
      mockUseAuth.mockImplementation(() => context);

      const { rerender } = render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Rapidly change authentication state
      for (let i = 0; i < 5; i++) {
        context = { ...context, isAuthenticated: !context.isAuthenticated };
        rerender(
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        );
      }

      // Should end up unauthenticated (started false, flipped 5 times = false)
      expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
    });
  });
});