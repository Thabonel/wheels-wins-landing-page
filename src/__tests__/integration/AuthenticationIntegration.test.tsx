/**
 * Integration Tests: Authentication Flow
 * Tests complete authentication scenarios including protected routes, 
 * auth state management, and user session handling
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { 
  mockSupabaseClient, 
  resetAllMocks, 
  createMockAuthUser, 
  createMockSession 
} from '../../test/mocks/supabase';

// Mock pages and components
const LoginPage = () => (
  <div data-testid="login-page">
    <h1>Login</h1>
    <form data-testid="login-form">
      <input 
        data-testid="email-input" 
        type="email" 
        placeholder="Email"
      />
      <input 
        data-testid="password-input" 
        type="password" 
        placeholder="Password"
      />
      <button type="submit" data-testid="login-submit">Login</button>
    </form>
    <button data-testid="google-login">Login with Google</button>
  </div>
);

const SignupPage = () => (
  <div data-testid="signup-page">
    <h1>Sign Up</h1>
    <form data-testid="signup-form">
      <input 
        data-testid="signup-email-input" 
        type="email" 
        placeholder="Email"
      />
      <input 
        data-testid="signup-password-input" 
        type="password" 
        placeholder="Password"
      />
      <input 
        data-testid="confirm-password-input" 
        type="password" 
        placeholder="Confirm Password"
      />
      <button type="submit" data-testid="signup-submit">Sign Up</button>
    </form>
  </div>
);

const DashboardPage = () => (
  <div data-testid="dashboard-page">
    <h1>Dashboard</h1>
    <p>Welcome to your dashboard!</p>
    <button data-testid="logout-btn">Logout</button>
  </div>
);

const ProtectedPage = () => (
  <div data-testid="protected-page">
    <h1>Protected Content</h1>
    <p>This content requires authentication</p>
  </div>
);

// Mock authentication provider
const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate auth state check
    mockSupabaseClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = mockSupabaseClient.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div data-testid="auth-loading">Loading...</div>;
  }

  return (
    <div data-testid="auth-provider">
      {children}
    </div>
  );
};

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    mockSupabaseClient.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  if (!user) {
    return <div data-testid="auth-redirect">Please log in to continue</div>;
  }

  return <>{children}</>;
};

const TestApp = ({ initialEntries = ['/'] }: { initialEntries?: string[] }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/protected" element={
              <ProtectedRoute>
                <ProtectedPage />
              </ProtectedRoute>
            } />
            <Route path="/" element={<div data-testid="home-page">Home</div>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    resetAllMocks();
    // Clear any stored auth state
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Flow', () => {
    it('should complete successful login flow and redirect to dashboard', async () => {
      const user = userEvent.setup();
      
      render(<TestApp initialEntries={['/login']} />);

      // Should show login page
      expect(screen.getByTestId('login-page')).toBeInTheDocument();

      // Fill login form
      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'password123');

      // Mock successful login
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { 
          user: createMockAuthUser(), 
          session: createMockSession() 
        },
        error: null
      });

      // Submit login form
      await user.click(screen.getByTestId('login-submit'));

      // Should call auth API
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });

      // Should redirect to dashboard after successful login
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });

    it('should handle login errors gracefully', async () => {
      const user = userEvent.setup();
      
      render(<TestApp initialEntries={['/login']} />);

      // Mock login error
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      });

      await user.type(screen.getByTestId('email-input'), 'invalid@example.com');
      await user.type(screen.getByTestId('password-input'), 'wrongpassword');
      await user.click(screen.getByTestId('login-submit'));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Should remain on login page
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('should handle social login (Google)', async () => {
      const user = userEvent.setup();
      
      render(<TestApp initialEntries={['/login']} />);

      // Mock Google login
      mockSupabaseClient.auth.signInWithOAuth = vi.fn().mockResolvedValue({
        data: { 
          user: createMockAuthUser(), 
          session: createMockSession() 
        },
        error: null
      });

      await user.click(screen.getByTestId('google-login'));

      expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google'
      });
    });
  });

  describe('Signup Flow', () => {
    it('should complete successful signup and redirect', async () => {
      const user = userEvent.setup();
      
      render(<TestApp initialEntries={['/signup']} />);

      expect(screen.getByTestId('signup-page')).toBeInTheDocument();

      // Fill signup form
      await user.type(screen.getByTestId('signup-email-input'), 'newuser@example.com');
      await user.type(screen.getByTestId('signup-password-input'), 'newpassword123');
      await user.type(screen.getByTestId('confirm-password-input'), 'newpassword123');

      // Mock successful signup
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { 
          user: createMockAuthUser({ email: 'newuser@example.com' }),
          session: createMockSession()
        },
        error: null
      });

      await user.click(screen.getByTestId('signup-submit'));

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'newpassword123'
      });

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });

    it('should validate password confirmation', async () => {
      const user = userEvent.setup();
      
      render(<TestApp initialEntries={['/signup']} />);

      await user.type(screen.getByTestId('signup-email-input'), 'test@example.com');
      await user.type(screen.getByTestId('signup-password-input'), 'password123');
      await user.type(screen.getByTestId('confirm-password-input'), 'differentpassword');

      await user.click(screen.getByTestId('signup-submit'));

      // Should show password mismatch error
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should handle signup errors', async () => {
      const user = userEvent.setup();
      
      render(<TestApp initialEntries={['/signup']} />);

      // Mock signup error
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already registered' }
      });

      await user.type(screen.getByTestId('signup-email-input'), 'existing@example.com');
      await user.type(screen.getByTestId('signup-password-input'), 'password123');
      await user.type(screen.getByTestId('confirm-password-input'), 'password123');
      await user.click(screen.getByTestId('signup-submit'));

      await waitFor(() => {
        expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
      });
    });
  });

  describe('Protected Routes', () => {
    it('should redirect unauthenticated users to login', async () => {
      // Mock unauthenticated state
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      render(<TestApp initialEntries={['/protected']} />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-redirect')).toBeInTheDocument();
        expect(screen.getByText(/please log in to continue/i)).toBeInTheDocument();
      });
    });

    it('should allow authenticated users to access protected routes', async () => {
      // Mock authenticated state
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: createMockAuthUser() },
        error: null
      });

      render(<TestApp initialEntries={['/protected']} />);

      await waitFor(() => {
        expect(screen.getByTestId('protected-page')).toBeInTheDocument();
      });
    });
  });

  describe('Logout Flow', () => {
    it('should logout user and redirect to home', async () => {
      const user = userEvent.setup();
      
      // Start with authenticated state
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: createMockAuthUser() },
        error: null
      });

      render(<TestApp initialEntries={['/dashboard']} />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Mock logout
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      await user.click(screen.getByTestId('logout-btn'));

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();

      // Should redirect to home
      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });
  });

  describe('Session Management', () => {
    it('should persist authentication across page reloads', async () => {
      // Mock existing session
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: createMockSession() },
        error: null
      });

      const { rerender } = render(<TestApp initialEntries={['/dashboard']} />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Simulate page reload
      rerender(<TestApp initialEntries={['/dashboard']} />);

      // Should still be authenticated
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });

    it('should handle expired sessions', async () => {
      // Mock expired session
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' }
      });

      render(<TestApp initialEntries={['/dashboard']} />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-redirect')).toBeInTheDocument();
      });
    });

    it('should refresh expired tokens automatically', async () => {
      // Mock token refresh
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: createMockSession() },
        error: null
      });

      // Mock initial session with near-expiry
      const expiringSoon = Date.now() / 1000 + 300; // 5 minutes from now
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { 
          session: createMockSession({ 
            expires_at: expiringSoon 
          }) 
        },
        error: null
      });

      render(<TestApp initialEntries={['/dashboard']} />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Should attempt token refresh
      expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    it('should handle network errors during authentication', async () => {
      const user = userEvent.setup();
      
      render(<TestApp initialEntries={['/login']} />);

      // Mock network error
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      );

      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'password123');
      await user.click(screen.getByTestId('login-submit'));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Should provide retry option
      expect(screen.getByText(/retry/i)).toBeInTheDocument();
    });

    it('should handle concurrent authentication attempts', async () => {
      const user = userEvent.setup();
      
      render(<TestApp initialEntries={['/login']} />);

      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'password123');

      // Click login multiple times rapidly
      const loginBtn = screen.getByTestId('login-submit');
      await user.click(loginBtn);
      await user.click(loginBtn);
      await user.click(loginBtn);

      // Should only call auth once (debounced/protected)
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledTimes(1);
    });
  });
});