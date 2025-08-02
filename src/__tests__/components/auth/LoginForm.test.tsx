import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/context/AuthContext';
import { 
  mockSupabaseAuth, 
  resetAllMocks, 
  setMockAuthError,
  mockAuthError
} from '@/test/mocks/supabase';

// Mock the useAuth hook
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn()
}));

const mockUseAuth = vi.mocked(useAuth);

describe('LoginForm', () => {
  const mockProps = {
    loading: false,
    setLoading: vi.fn(),
    error: null,
    setError: vi.fn(),
    onSuccess: vi.fn()
  };

  const mockSignIn = vi.fn();

  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      session: null,
      loading: false,
      isAuthenticated: false,
      isDevMode: false,
      signIn: mockSignIn,
      signUp: vi.fn(),
      signOut: vi.fn(),
      logout: vi.fn()
    });
  });

  describe('Component rendering', () => {
    it('should render login form with all required fields', () => {
      render(<LoginForm {...mockProps} />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
    });

    it('should render with correct placeholder text', () => {
      render(<LoginForm {...mockProps} />);

      expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument();
    });

    it('should display error message when error prop is provided', () => {
      const errorMessage = 'Invalid credentials';
      render(<LoginForm {...mockProps} error={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should show loading state when loading prop is true', () => {
      render(<LoginForm {...mockProps} loading={true} />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();
    });

    it('should show normal login button when not loading', () => {
      render(<LoginForm {...mockProps} loading={false} />);

      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).not.toBeDisabled();
    });
  });

  describe('Form validation', () => {
    it('should require email field', async () => {
      render(<LoginForm {...mockProps} />);

      const submitButton = screen.getByRole('button', { name: /login/i });
      const emailInput = screen.getByLabelText(/email/i);

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.setError).toHaveBeenCalledWith('Please enter both email and password');
      });
    });

    it('should require password field', async () => {
      render(<LoginForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.setError).toHaveBeenCalledWith('Please enter both email and password');
      });
    });

    it('should validate email format', () => {
      render(<LoginForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
    });

    it('should validate password is required', () => {
      render(<LoginForm {...mockProps} />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('required');
    });
  });

  describe('Form submission', () => {
    it('should call signIn with correct credentials on form submission', async () => {
      mockSignIn.mockResolvedValue(undefined);
      
      render(<LoginForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.setLoading).toHaveBeenCalledWith(true);
        expect(mockProps.setError).toHaveBeenCalledWith(null);
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should call onSuccess after successful login', async () => {
      mockSignIn.mockResolvedValue(undefined);
      
      render(<LoginForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.onSuccess).toHaveBeenCalled();
        expect(mockProps.setLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should handle form submission via Enter key', async () => {
      mockSignIn.mockResolvedValue(undefined);
      
      render(<LoginForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });
  });

  describe('Error handling', () => {
    it('should handle generic login error', async () => {
      const error = new Error('Network error');
      mockSignIn.mockRejectedValue(error);
      
      render(<LoginForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.setError).toHaveBeenCalledWith('Network error');
        expect(mockProps.setLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should handle invalid credentials error with user-friendly message', async () => {
      const error = new Error('Invalid login credentials');
      mockSignIn.mockRejectedValue(error);
      
      render(<LoginForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.setError).toHaveBeenCalledWith(
          'Invalid email or password. Please check your credentials and try again.'
        );
      });
    });

    it('should handle permission denied error', async () => {
      const error = new Error('permission denied');
      mockSignIn.mockRejectedValue(error);
      
      render(<LoginForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.setError).toHaveBeenCalledWith(
          'There was an authentication issue. Please try again or contact support.'
        );
      });
    });

    it('should handle email not confirmed error', async () => {
      const error = new Error('Email not confirmed');
      mockSignIn.mockRejectedValue(error);
      
      render(<LoginForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.setError).toHaveBeenCalledWith(
          'Please check your email and click the confirmation link before logging in.'
        );
      });
    });

    it('should handle error without message', async () => {
      const error = {};
      mockSignIn.mockRejectedValue(error);
      
      render(<LoginForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.setError).toHaveBeenCalledWith('Failed to login');
      });
    });
  });

  describe('User interactions', () => {
    it('should update email input value', () => {
      render(<LoginForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

      expect(emailInput).toHaveValue('user@example.com');
    });

    it('should update password input value', () => {
      render(<LoginForm {...mockProps} />);

      const passwordInput = screen.getByLabelText(/password/i);
      fireEvent.change(passwordInput, { target: { value: 'mypassword' } });

      expect(passwordInput).toHaveValue('mypassword');
    });

    it('should clear error when form is submitted again', async () => {
      render(<LoginForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      expect(mockProps.setError).toHaveBeenCalledWith(null);
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form fields', () => {
      render(<LoginForm {...mockProps} />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should have accessible error alert', () => {
      const errorMessage = 'Login failed';
      render(<LoginForm {...mockProps} error={errorMessage} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(errorMessage);
    });

    it('should have proper form structure', () => {
      render(<LoginForm {...mockProps} />);

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });

    it('should have proper button states', () => {
      const { rerender } = render(<LoginForm {...mockProps} loading={false} />);

      const button = screen.getByRole('button', { name: /login/i });
      expect(button).not.toBeDisabled();

      rerender(<LoginForm {...mockProps} loading={true} />);
      expect(button).toBeDisabled();
    });
  });

  describe('Password input component', () => {
    it('should render password input with show/hide functionality', () => {
      render(<LoginForm {...mockProps} />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should pass correct props to PasswordInput component', () => {
      render(<LoginForm {...mockProps} />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('id', 'password');
    });
  });

  describe('Navigation links', () => {
    it('should render forgot password link', () => {
      render(<LoginForm {...mockProps} />);

      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      expect(forgotPasswordLink).toBeInTheDocument();
      expect(forgotPasswordLink).toHaveAttribute('href', '/reset-password');
    });

    it('should have proper link styling', () => {
      render(<LoginForm {...mockProps} />);

      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      expect(forgotPasswordLink).toHaveClass('text-sm', 'text-blue-600', 'hover:text-blue-800');
    });
  });
});