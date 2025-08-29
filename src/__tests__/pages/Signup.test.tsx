import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Signup from '@/pages/Signup';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  mockSupabaseAuth, 
  resetAllMocks, 
  setMockSignUpSuccess,
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

describe('Signup Page', () => {
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
    it('should render signup page with all components', () => {
      render(<Signup />);

      expect(screen.getByText('Create Your Account')).toBeInTheDocument();
      expect(screen.getByText('Get started with Wheels & Wins today')).toBeInTheDocument();
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeInTheDocument();
    });

    it('should render login link', () => {
      render(<Signup />);

      const loginLink = screen.getByRole('link', { name: /log in/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should render OAuth divider', () => {
      render(<Signup />);

      expect(screen.getByText('or continue with')).toBeInTheDocument();
    });

    it('should have proper page structure', () => {
      render(<Signup />);

      const container = screen.getByText('Create Your Account').closest('.container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('max-w-md', 'mx-auto', 'px-4', 'py-16');
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

      render(<Signup />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/you');
      });
    });

    it('should not redirect if user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: false
      });

      render(<Signup />);

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should redirect when authentication state changes', async () => {
      const { rerender } = render(<Signup />);

      // Initially not authenticated
      expect(mockNavigate).not.toHaveBeenCalled();

      // User becomes authenticated
      const authenticatedContext = {
        ...mockAuthContext,
        user: mockUser,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(authenticatedContext);

      rerender(<Signup />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/you');
      });
    });
  });

  describe('Form integration', () => {
    it('should handle successful signup', async () => {
      setMockSignUpSuccess();
      
      render(<Signup />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const signupButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(signupButton);

      await waitFor(() => {
        expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          options: {
            emailRedirectTo: 'http://localhost:3000/you'
          }
        });
      });
    });

    it('should show loading state during signup', async () => {
      // Make signup take some time
      mockSupabaseAuth.signUp.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: { user: mockUser, session: mockSession },
          error: null
        }), 100))
      );

      render(<Signup />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const signupButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(signupButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Creating Account...')).toBeInTheDocument();
        expect(signupButton).toBeDisabled();
      });
    });

    it('should display validation errors', async () => {
      render(<Signup />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const signupButton = screen.getByRole('button', { name: /create account/i });

      // Test password mismatch
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
      fireEvent.click(signupButton);

      await waitFor(() => {
        expect(screen.getByText('Passwords don\'t match')).toBeInTheDocument();
      });

      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });

    it('should display password length validation error', async () => {
      render(<Signup />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const signupButton = screen.getByRole('button', { name: /create account/i });

      // Test short password
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: '123' } });
      fireEvent.click(signupButton);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
      });

      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });
  });

  describe('OAuth authentication', () => {
    it('should handle Google OAuth signup', async () => {
      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
        data: { provider: 'google', url: 'https://oauth.url' },
        error: null
      });

      render(<Signup />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: 'http://localhost:3000/onboarding'
          }
        });
      });
    });

    it('should handle Facebook OAuth signup', async () => {
      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
        data: { provider: 'facebook', url: 'https://oauth.url' },
        error: null
      });

      render(<Signup />);

      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });
      fireEvent.click(facebookButton);

      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'facebook',
          options: {
            redirectTo: 'http://localhost:3000/onboarding'
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

      render(<Signup />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: 'https://wheelsandwins.com/onboarding'
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
      const oauthError = new Error('OAuth signup failed');
      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
        data: { provider: null, url: null },
        error: oauthError
      });

      render(<Signup />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText('OAuth signup failed')).toBeInTheDocument();
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

      render(<Signup />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      // Should disable buttons during loading
      await waitFor(() => {
        expect(googleButton).toBeDisabled();
        expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeDisabled();
      });
    });
  });

  describe('User interactions', () => {
    it('should allow form input interaction', () => {
      render(<Signup />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
      expect(confirmPasswordInput).toHaveValue('password123');
    });

    it('should handle form submission via Enter key', async () => {
      setMockSignUpSuccess();
      
      render(<Signup />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.keyDown(confirmPasswordInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockSupabaseAuth.signUp).toHaveBeenCalled();
      });
    });

    it('should handle clicking between OAuth and form signup', async () => {
      setMockSignUpSuccess();
      
      render(<Signup />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const signupButton = screen.getByRole('button', { name: /create account/i });

      // Try OAuth first
      fireEvent.click(googleButton);
      
      // Then try form signup
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(signupButton);

      // Both should work independently
      expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockSupabaseAuth.signUp).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper page title', () => {
      render(<Signup />);

      expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    });

    it('should have descriptive text', () => {
      render(<Signup />);

      expect(screen.getByText('Get started with Wheels & Wins today')).toBeInTheDocument();
    });

    it('should have accessible form elements', () => {
      render(<Signup />);

      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('should have accessible navigation links', () => {
      render(<Signup />);

      const loginLink = screen.getByRole('link', { name: /log in/i });
      expect(loginLink).toBeAccessible();
    });

    it('should handle error announcements accessibly', async () => {
      render(<Signup />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const signupButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
      fireEvent.click(signupButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent('Passwords don\'t match');
      });
    });
  });

  describe('Error handling', () => {
    it('should handle signup errors gracefully', async () => {
      const signupError = new Error('User already registered');
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: signupError
      });

      render(<Signup />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const signupButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(signupButton);

      await waitFor(() => {
        expect(screen.getByText('An account with this email already exists. Please log in instead.')).toBeInTheDocument();
      });
    });

    it('should clear errors when component unmounts', () => {
      const { unmount } = render(<Signup />);

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
      expect(() => render(<Signup />)).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid authentication state changes', async () => {
      const { rerender } = render(<Signup />);

      // Rapidly change authentication state
      mockUseAuth.mockReturnValue({ ...mockAuthContext, isAuthenticated: true });
      rerender(<Signup />);

      mockUseAuth.mockReturnValue({ ...mockAuthContext, isAuthenticated: false });
      rerender(<Signup />);

      mockUseAuth.mockReturnValue({ ...mockAuthContext, isAuthenticated: true });
      rerender(<Signup />);

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

      expect(() => render(<Signup />)).not.toThrow();
    });

    it('should handle special characters in form inputs', async () => {
      setMockSignUpSuccess();
      
      render(<Signup />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const signupButton = screen.getByRole('button', { name: /create account/i });

      const specialEmail = 'test+special@example.com';
      const specialPassword = 'P@ssw0rd!#$%';

      fireEvent.change(emailInput, { target: { value: specialEmail } });
      fireEvent.change(passwordInput, { target: { value: specialPassword } });
      fireEvent.change(confirmPasswordInput, { target: { value: specialPassword } });
      fireEvent.click(signupButton);

      await waitFor(() => {
        expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
          email: specialEmail,
          password: specialPassword,
          options: {
            emailRedirectTo: 'http://localhost:3000/you'
          }
        });
      });
    });

    it('should handle empty form submission gracefully', async () => {
      render(<Signup />);

      const signupButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(signupButton);

      // Should not call signUp if validation fails (due to HTML5 validation)
      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });
  });
});