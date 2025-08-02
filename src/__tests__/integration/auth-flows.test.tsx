import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  renderWithAuth, 
  authScenarios, 
  AuthFlowTester,
  createTestUser,
  createTestSession
} from '@/test/utils/auth-test-utils';
import { 
  mockSupabaseAuth, 
  resetAllMocks, 
  setMockSignUpSuccess,
  mockUser,
  mockSession,
  mockAdminUser,
  mockAdminSession
} from '@/test/mocks/supabase';

// Mock react-router-dom Navigate for testing redirects
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
      <div data-testid="navigate-mock" data-to={to} data-replace={replace?.toString()}>
        Redirecting to {to}
      </div>
    )
  };
});

// Test app component for integration testing
const TestApp = ({ initialRoute = '/' }: { initialRoute?: string }) => {
  // Mock protected content
  const ProtectedContent = () => <div data-testid="protected-content">Protected Content</div>;
  const AdminContent = () => <div data-testid="admin-content">Admin Content</div>;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route 
        path="/you" 
        element={
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute>
            <AdminContent />
          </ProtectedRoute>
        } 
      />
      <Route path="/" element={<div data-testid="home">Home</div>} />
    </Routes>
  );
};

describe('Authentication Integration Tests', () => {
  let authFlowTester: AuthFlowTester;

  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
    authFlowTester = new AuthFlowTester();
  });

  describe('Complete Login Flow', () => {
    it('should complete full login flow from login page to protected content', async () => {
      // Start at login page, unauthenticated
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.unauthenticated,
        initialRoute: '/login'
      });

      // Verify we're on login page
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

      // Mock successful login
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      // Verify Supabase auth was called
      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });

      // Simulate successful authentication state change
      await authFlowTester.login(mockUser, mockSession);

      // Should redirect to /you after successful login
      await waitFor(() => {
        expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
        expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', '/you');
      });
    });

    it('should handle login errors and remain on login page', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.unauthenticated,
        initialRoute: '/login'
      });

      // Mock login error
      const loginError = new Error('Invalid login credentials');
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: loginError
      });

      // Fill in login form with invalid credentials
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'invalid@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(loginButton);

      // Should display error message
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });

      // Should remain on login page
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    });
  });

  describe('Complete Signup Flow', () => {
    it('should complete full signup flow from signup page', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.unauthenticated,
        initialRoute: '/signup'
      });

      // Verify we're on signup page
      expect(screen.getByText('Create Your Account')).toBeInTheDocument();
      
      // Mock successful signup
      setMockSignUpSuccess();

      // Fill in signup form
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const signupButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(signupButton);

      // Verify Supabase signup was called
      await waitFor(() => {
        expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'password123',
          options: {
            emailRedirectTo: 'http://localhost:3000/you'
          }
        });
      });
    });

    it('should handle signup validation errors', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.unauthenticated,
        initialRoute: '/signup'
      });

      // Fill in signup form with mismatched passwords
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const signupButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
      fireEvent.click(signupButton);

      // Should display validation error
      await waitFor(() => {
        expect(screen.getByText('Passwords don\'t match')).toBeInTheDocument();
      });

      // Should not call Supabase signup
      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });
  });

  describe('OAuth Authentication Flow', () => {
    it('should handle Google OAuth login flow', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.unauthenticated,
        initialRoute: '/login'
      });

      // Mock successful OAuth
      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
        data: { provider: 'google', url: 'https://oauth.google.com' },
        error: null
      });

      // Click Google OAuth button
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      // Verify OAuth was initiated
      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: 'http://localhost:3000/you'
          }
        });
      });
    });

    it('should handle Facebook OAuth signup flow', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.unauthenticated,
        initialRoute: '/signup'
      });

      // Mock successful OAuth
      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
        data: { provider: 'facebook', url: 'https://oauth.facebook.com' },
        error: null
      });

      // Click Facebook OAuth button
      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });
      fireEvent.click(facebookButton);

      // Verify OAuth was initiated with onboarding redirect for signup
      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'facebook',
          options: {
            redirectTo: 'http://localhost:3000/onboarding'
          }
        });
      });
    });
  });

  describe('Protected Route Access', () => {
    it('should redirect unauthenticated users to login page', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.unauthenticated,
        initialRoute: '/you'
      });

      // Should redirect to login
      expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
      expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', '/login');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should allow authenticated users to access protected routes', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.authenticatedUser,
        initialRoute: '/you'
      });

      // Should show protected content
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-mock')).not.toBeInTheDocument();
    });

    it('should allow admin users to access all protected routes', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.authenticatedAdmin,
        initialRoute: '/admin'
      });

      // Should show admin content
      expect(screen.getByTestId('admin-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-mock')).not.toBeInTheDocument();
    });
  });

  describe('Authentication State Changes', () => {
    it('should handle login to logout flow', async () => {
      // Start authenticated
      const { rerender } = renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.authenticatedUser,
        initialRoute: '/you'
      });

      // Should show protected content
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();

      // Simulate logout
      await authFlowTester.logout();

      // Rerender with unauthenticated state
      rerender(<TestApp />);

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
      });
    });

    it('should handle authentication while on protected route', async () => {
      // Start unauthenticated on protected route
      const { rerender } = renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.unauthenticated,
        initialRoute: '/you'
      });

      // Should redirect to login
      expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();

      // Simulate login
      await authFlowTester.login();

      // Rerender with authenticated state
      rerender(<TestApp />);

      // Should show protected content
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('should handle token refresh', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.authenticatedUser,
        initialRoute: '/you'
      });

      // Should show protected content
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();

      // Simulate token refresh
      const newSession = createTestSession(mockUser, { 
        access_token: 'new_access_token' 
      });
      await authFlowTester.refreshToken(newSession);

      // Should continue showing protected content
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Admin Authorization Flow', () => {
    it('should handle regular user trying to access admin content', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.authenticatedUser,
        initialRoute: '/admin'
      });

      // Regular user should still be able to access the route
      // (Admin-specific authorization would be handled by additional components)
      expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    });

    it('should handle admin user accessing admin content', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.authenticatedAdmin,
        initialRoute: '/admin'
      });

      // Admin should access content
      expect(screen.getByTestId('admin-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-mock')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors during authentication', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.unauthenticated,
        initialRoute: '/login'
      });

      // Mock network error
      const networkError = new Error('Network request failed');
      mockSupabaseAuth.signInWithPassword.mockRejectedValue(networkError);

      // Fill and submit login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      // Should display network error
      await waitFor(() => {
        expect(screen.getByText('Network request failed')).toBeInTheDocument();
      });
    });

    it('should handle rapid authentication state changes', async () => {
      let currentScenario = authScenarios.unauthenticated;
      
      const { rerender } = renderWithAuth(<TestApp />, { 
        authScenario: currentScenario,
        initialRoute: '/you'
      });

      // Should start with redirect
      expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();

      // Rapidly change authentication states
      const scenarios = [
        authScenarios.authenticatedUser,
        authScenarios.unauthenticated,
        authScenarios.authenticatedAdmin,
        authScenarios.unauthenticated,
        authScenarios.authenticatedUser
      ];

      for (const scenario of scenarios) {
        currentScenario = scenario;
        rerender(<TestApp />);
        
        // Small delay to simulate realistic state changes
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Should end in authenticated state showing content
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('should handle simultaneous login attempts', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.unauthenticated,
        initialRoute: '/login'
      });

      // Mock successful login
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Fill form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Rapidly click login button multiple times
      fireEvent.click(loginButton);
      fireEvent.click(loginButton);
      fireEvent.click(loginButton);

      // Should only make one authentication request
      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Navigation Between Auth Pages', () => {
    it('should navigate from login to signup page', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.unauthenticated,
        initialRoute: '/login'
      });

      // Should be on login page
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();

      // Click signup link
      const signupLink = screen.getByRole('link', { name: /sign up/i });
      expect(signupLink).toHaveAttribute('href', '/signup');
    });

    it('should navigate from signup to login page', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.unauthenticated,
        initialRoute: '/signup'
      });

      // Should be on signup page
      expect(screen.getByText('Create Your Account')).toBeInTheDocument();

      // Click login link
      const loginLink = screen.getByRole('link', { name: /log in/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should prevent authenticated users from accessing auth pages', async () => {
      // Test login page
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.authenticatedUser,
        initialRoute: '/login'
      });

      // Should redirect away from login page
      await waitFor(() => {
        expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
        expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', '/you');
      });
    });

    it('should prevent authenticated users from accessing signup page', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.authenticatedUser,
        initialRoute: '/signup'
      });

      // Should redirect away from signup page
      await waitFor(() => {
        expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
        expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', '/you');
      });
    });
  });

  describe('Dev Mode Behavior', () => {
    it('should allow access to protected routes in dev mode', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.devMode,
        initialRoute: '/you'
      });

      // Should show protected content even without authentication
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-mock')).not.toBeInTheDocument();
    });

    it('should work normally when authenticated in dev mode', async () => {
      renderWithAuth(<TestApp />, { 
        authScenario: authScenarios.devModeAuthenticated,
        initialRoute: '/you'
      });

      // Should show protected content
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-mock')).not.toBeInTheDocument();
    });
  });
});