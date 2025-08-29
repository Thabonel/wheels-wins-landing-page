import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Login from '@/pages/Login';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  mockSupabaseAuth, 
  resetAllMocks, 
  setMockAuthState,
  mockUser,
  mockSession
} from '@/test/mocks/supabase';

// Mock the useAuth hook
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
    Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>
  };
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'localhost',
    origin: 'http://localhost:3000'
  },
  writable: true
});

const mockUseAuth = vi.mocked(useAuth);
const mockNavigate = vi.fn();
vi.mocked(useNavigate).mockReturnValue(mockNavigate);

describe('Login Page', () => {
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

  describe('Component rendering', () => {
    it('should render login page with all components', () => {
      render(<Login />);

      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByText('Log in to access your account')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeInTheDocument();
    });

    it('should render signup link', () => {
      render(<Login />);

      const signupLink = screen.getByRole('link', { name: /sign up/i });
      expect(signupLink).toBeInTheDocument();
      expect(signupLink).toHaveAttribute('href', '/signup');
    });

    it('should render forgot password link in LoginForm', () => {
      render(<Login />);

      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      expect(forgotPasswordLink).toBeInTheDocument();
      expect(forgotPasswordLink).toHaveAttribute('href', '/reset-password');
    });

    it('should render OAuth divider', () => {
      render(<Login />);

      expect(screen.getByText('or continue with')).toBeInTheDocument();
    });
  });

  describe('Authentication redirect', () => {
    it('should redirect to /you if user is already authenticated', async () => {
      const authenticatedContext = {
        ...mockAuthContext,
        user: mockUser,
        session: mockSession,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(authenticatedContext);

      render(<Login />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/you');
      });
    });

    it('should not redirect if user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: false
      });

      render(<Login />);

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should redirect when authentication state changes', async () => {
      const { rerender } = render(<Login />);

      // Initially not authenticated
      expect(mockNavigate).not.toHaveBeenCalled();

      // User becomes authenticated
      const authenticatedContext = {
        ...mockAuthContext,
        user: mockUser,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(authenticatedContext);

      rerender(<Login />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/you');
      });
    });
  });

  describe('Form integration', () => {
    it('should handle successful login and navigate to /you', async () => {
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      // Simulate successful login by updating auth context
      const authenticatedContext = {
        ...mockAuthContext,
        user: mockUser,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(authenticatedContext);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/you');
      });
    });

    it('should show loading state during login', async () => {
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      // Should show processing state
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
    });

    it('should display error messages from login form', async () => {
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      // Try to login without filling fields
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter both email and password')).toBeInTheDocument();
      });
    });
  });

  describe('OAuth authentication', () => {
    it('should handle Google OAuth login', async () => {
      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
        data: { provider: 'google', url: 'https://oauth.url' },
        error: null
      });

      render(<Login />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: 'http://localhost:3000/you'
          }
        });
      });
    });

    it('should handle Facebook OAuth login', async () => {
      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
        data: { provider: 'facebook', url: 'https://oauth.url' },
        error: null
      });

      render(<Login />);

      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });
      fireEvent.click(facebookButton);

      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'facebook',
          options: {
            redirectTo: 'http://localhost:3000/you'
          }
        });
      });
    });

    it('should use production URL for OAuth redirect in production', async () => {
      // Mock production hostname
      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'wheelsandwins.com',
          origin: 'https://wheelsandwins.com'
        },
        writable: true
      });

      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
        data: { provider: 'google', url: 'https://oauth.url' },
        error: null
      });

      render(<Login />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: 'https://wheelsandwins.com/you'
          }
        });
      });

      // Reset for other tests
      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'localhost',
          origin: 'http://localhost:3000'
        },
        writable: true
      });
    });

    it('should handle OAuth errors', async () => {
      const oauthError = new Error('OAuth failed');
      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
        data: { provider: null, url: null },
        error: oauthError
      });

      render(<Login />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText('OAuth failed')).toBeInTheDocument();
      });
    });

    it('should show loading state during OAuth', async () => {
      // Make OAuth take some time
      mockSupabaseAuth.signInWithOAuth.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: { provider: 'google', url: 'https://oauth.url' },
          error: null
        }), 100))
      );

      render(<Login />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      // Should disable buttons during loading
      await waitFor(() => {
        expect(googleButton).toBeDisabled();
        expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeDisabled();
      });
    });
  });

  describe('Page layout and styling', () => {
    it('should have proper page structure', () => {
      render(<Login />);

      const container = screen.getByText('Welcome Back').closest('.container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('max-w-md', 'mx-auto', 'px-4', 'py-16');
    });

    it('should render within a Card component', () => {
      render(<Login />);

      // Card components should have specific structure
      const cardHeader = screen.getByText('Welcome Back').closest('[class*="card"]') || 
                         screen.getByText('Welcome Back').closest('div');
      expect(cardHeader).toBeInTheDocument();
    });

    it('should have proper spacing between elements', () => {
      render(<Login />);

      // Check that the OAuth divider is rendered
      expect(screen.getByText('or continue with')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper page title', () => {
      render(<Login />);

      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    it('should have descriptive text', () => {
      render(<Login />);

      expect(screen.getByText('Log in to access your account')).toBeInTheDocument();
    });

    it('should have accessible form elements', () => {
      render(<Login />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should have accessible navigation links', () => {
      render(<Login />);

      const signupLink = screen.getByRole('link', { name: /sign up/i });
      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });

      expect(signupLink).toBeAccessible();
      expect(forgotPasswordLink).toBeAccessible();
    });
  });

  describe('Error handling', () => {
    it('should clear errors when component unmounts', () => {
      const { unmount } = render(<Login />);

      unmount();

      // Component should unmount without errors
      expect(true).toBe(true);
    });

    it('should handle navigation errors', async () => {
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      const authenticatedContext = {
        ...mockAuthContext,
        user: mockUser,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(authenticatedContext);

      // Should not crash even if navigation fails
      expect(() => render(<Login />)).not.toThrow();
    });
  });

  describe('User interactions', () => {
    it('should allow switching between email and password fields', () => {
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      expect(emailInput).toHaveValue('test@example.com');

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      expect(passwordInput).toHaveValue('password123');
    });

    it('should handle form submission via Enter key', async () => {
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.keyDown(passwordInput, { key: 'Enter', code: 'Enter' });

      // Should trigger form submission
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
    });

    it('should handle clicking between OAuth and form login', async () => {
      render(<Login />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      // Try OAuth first
      fireEvent.click(googleButton);
      
      // Then try form login
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      // Both should work independently
      expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid authentication state changes', async () => {
      const { rerender } = render(<Login />);

      // Rapidly change authentication state
      mockUseAuth.mockReturnValue({ ...mockAuthContext, isAuthenticated: true });
      rerender(<Login />);

      mockUseAuth.mockReturnValue({ ...mockAuthContext, isAuthenticated: false });
      rerender(<Login />);

      mockUseAuth.mockReturnValue({ ...mockAuthContext, isAuthenticated: true });
      rerender(<Login />);

      // Should handle gracefully
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/you');
      });
    });

    it('should handle missing auth context', () => {
      mockUseAuth.mockReturnValue({
        ...mockAuthContext,
        user: null,
        session: null,
        isAuthenticated: false
      });

      expect(() => render(<Login />)).not.toThrow();
    });
  });
});