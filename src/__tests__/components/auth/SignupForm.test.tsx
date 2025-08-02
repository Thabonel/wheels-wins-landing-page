import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SignupForm from '@/components/auth/SignupForm';
import { 
  mockSupabaseAuth, 
  resetAllMocks, 
  setMockSignUpSuccess,
  setMockSignUpError,
  mockAuthError
} from '@/test/mocks/supabase';

// Mock window.location.origin
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000'
  },
  writable: true
});

describe('SignupForm', () => {
  const mockProps = {
    loading: false,
    setLoading: vi.fn(),
    error: null,
    setError: vi.fn()
  };

  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
  });

  describe('Component rendering', () => {
    it('should render signup form with all required fields', () => {
      render(<SignupForm {...mockProps} />);

      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should render with correct placeholder text', () => {
      render(<SignupForm {...mockProps} />);

      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Create a password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument();
    });

    it('should display error message when error prop is provided', () => {
      const errorMessage = 'Registration failed';
      render(<SignupForm {...mockProps} error={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should show loading state when loading prop is true', () => {
      render(<SignupForm {...mockProps} loading={true} />);

      expect(screen.getByText('Creating Account...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
      
      // All inputs should be disabled during loading
      expect(screen.getByPlaceholderText('Enter your email')).toBeDisabled();
      expect(screen.getByPlaceholderText('Create a password')).toBeDisabled();
      expect(screen.getByPlaceholderText('Confirm your password')).toBeDisabled();
    });

    it('should show normal signup button when not loading', () => {
      render(<SignupForm {...mockProps} loading={false} />);

      expect(screen.getByText('Create Account')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).not.toBeDisabled();
    });

    it('should show loading spinner during signup', () => {
      render(<SignupForm {...mockProps} loading={true} />);

      // Check for Loader2 component presence (spinner)
      expect(screen.getByText('Creating Account...')).toBeInTheDocument();
    });
  });

  describe('Form validation', () => {
    it('should require all fields', () => {
      render(<SignupForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      expect(emailInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('required');
      expect(confirmPasswordInput).toHaveAttribute('required');
    });

    it('should validate email format', () => {
      render(<SignupForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/^email$/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should validate minimum password length', () => {
      render(<SignupForm {...mockProps} />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      expect(passwordInput).toHaveAttribute('minLength', '6');
      expect(confirmPasswordInput).toHaveAttribute('minLength', '6');
    });

    it('should show error when passwords don\'t match', async () => {
      render(<SignupForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.setError).toHaveBeenCalledWith('Passwords don\'t match');
      });

      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });

    it('should show error when password is too short', async () => {
      render(<SignupForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: '123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.setError).toHaveBeenCalledWith('Password must be at least 6 characters');
      });

      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });
  });

  describe('Form submission', () => {
    it('should call supabase signUp with correct data on valid form submission', async () => {
      setMockSignUpSuccess();
      
      render(<SignupForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.setLoading).toHaveBeenCalledWith(true);
        expect(mockProps.setError).toHaveBeenCalledWith(null);
        expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          options: {
            emailRedirectTo: 'http://localhost:3000/you'
          }
        });
      });
    });

    it('should handle successful signup', async () => {
      setMockSignUpSuccess();
      
      render(<SignupForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.setLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should handle form submission via Enter key', async () => {
      setMockSignUpSuccess();
      
      render(<SignupForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(mockSupabaseAuth.signUp).toHaveBeenCalled();
      });
    });
  });

  describe('Error handling', () => {
    it('should handle generic signup error', async () => {
      const error = { ...mockAuthError, message: 'Network error' };
      setMockSignUpError(error);
      
      render(<SignupForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.setError).toHaveBeenCalledWith('Network error');
        expect(mockProps.setLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should handle user already registered error with friendly message', async () => {
      const error = { ...mockAuthError, message: 'User already registered' };
      setMockSignUpError(error);
      
      render(<SignupForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.setError).toHaveBeenCalledWith(
          'An account with this email already exists. Please log in instead.'
        );
      });
    });

    it('should reset error state on new form submission', async () => {
      render(<SignupForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      expect(mockProps.setError).toHaveBeenCalledWith(null);
    });
  });

  describe('User interactions', () => {
    it('should update email input value', () => {
      render(<SignupForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/^email$/i);
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

      expect(emailInput).toHaveValue('user@example.com');
    });

    it('should update password input value', () => {
      render(<SignupForm {...mockProps} />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      fireEvent.change(passwordInput, { target: { value: 'mypassword' } });

      expect(passwordInput).toHaveValue('mypassword');
    });

    it('should update confirm password input value', () => {
      render(<SignupForm {...mockProps} />);

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      fireEvent.change(confirmPasswordInput, { target: { value: 'mypassword' } });

      expect(confirmPasswordInput).toHaveValue('mypassword');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form fields', () => {
      render(<SignupForm {...mockProps} />);

      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('should have accessible error alert', () => {
      const errorMessage = 'Signup failed';
      render(<SignupForm {...mockProps} error={errorMessage} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(errorMessage);
    });

    it('should have proper form structure', () => {
      render(<SignupForm {...mockProps} />);

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });

    it('should disable all inputs during loading', () => {
      render(<SignupForm {...mockProps} loading={true} />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button');

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('should enable all inputs when not loading', () => {
      render(<SignupForm {...mockProps} loading={false} />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button');

      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
      expect(confirmPasswordInput).not.toBeDisabled();
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Redirect URL handling', () => {
    it('should use correct redirect URL for signup', async () => {
      setMockSignUpSuccess();
      
      render(<SignupForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

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
  });

  describe('Edge cases', () => {
    it('should handle empty form submission gracefully', async () => {
      render(<SignupForm {...mockProps} />);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      // Should not call signUp if validation fails
      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });

    it('should handle very long passwords', async () => {
      setMockSignUpSuccess();
      const longPassword = 'a'.repeat(100);
      
      render(<SignupForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: longPassword } });
      fireEvent.change(confirmPasswordInput, { target: { value: longPassword } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: longPassword,
          options: {
            emailRedirectTo: 'http://localhost:3000/you'
          }
        });
      });
    });

    it('should handle special characters in password', async () => {
      setMockSignUpSuccess();
      const specialPassword = 'P@ssw0rd!#$%';
      
      render(<SignupForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: specialPassword } });
      fireEvent.change(confirmPasswordInput, { target: { value: specialPassword } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: specialPassword,
          options: {
            emailRedirectTo: 'http://localhost:3000/you'
          }
        });
      });
    });
  });
});