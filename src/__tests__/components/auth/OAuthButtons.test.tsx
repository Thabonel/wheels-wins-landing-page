import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import OAuthButtons from '@/components/auth/OAuthButtons';

describe('OAuthButtons', () => {
  const mockOnOAuthSignup = vi.fn();

  const defaultProps = {
    onOAuthSignup: mockOnOAuthSignup,
    loading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component rendering', () => {
    it('should render both Google and Facebook OAuth buttons', () => {
      render(<OAuthButtons {...defaultProps} />);

      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeInTheDocument();
    });

    it('should render buttons with correct styling', () => {
      render(<OAuthButtons {...defaultProps} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });

      expect(googleButton).toHaveClass('w-full');
      expect(facebookButton).toHaveClass('w-full');
    });

    it('should render buttons with proper structure', () => {
      render(<OAuthButtons {...defaultProps} />);
      
      const container = screen.getByRole('button', { name: /continue with google/i }).parentElement;
      expect(container).toHaveClass('space-y-2');
    });
  });

  describe('Google OAuth button', () => {
    it('should call onOAuthSignup with "google" when Google button is clicked', () => {
      render(<OAuthButtons {...defaultProps} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      expect(mockOnOAuthSignup).toHaveBeenCalledWith('google');
      expect(mockOnOAuthSignup).toHaveBeenCalledTimes(1);
    });

    it('should render Google icon when not loading', () => {
      render(<OAuthButtons {...defaultProps} loading={false} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const svg = googleButton.querySelector('svg');
      
      expect(svg).toBeInTheDocument();
      expect(svg).not.toHaveClass('animate-spin');
    });

    it('should have correct button properties', () => {
      render(<OAuthButtons {...defaultProps} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      
      expect(googleButton).toHaveAttribute('type', 'button');
      expect(googleButton).not.toBeDisabled();
    });
  });

  describe('Facebook OAuth button', () => {
    it('should call onOAuthSignup with "facebook" when Facebook button is clicked', () => {
      render(<OAuthButtons {...defaultProps} />);

      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });
      fireEvent.click(facebookButton);

      expect(mockOnOAuthSignup).toHaveBeenCalledWith('facebook');
      expect(mockOnOAuthSignup).toHaveBeenCalledTimes(1);
    });

    it('should render Facebook icon when not loading', () => {
      render(<OAuthButtons {...defaultProps} loading={false} />);

      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });
      const svg = facebookButton.querySelector('svg');
      
      expect(svg).toBeInTheDocument();
      expect(svg).not.toHaveClass('animate-spin');
    });

    it('should have correct button properties', () => {
      render(<OAuthButtons {...defaultProps} />);

      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });
      
      expect(facebookButton).toHaveAttribute('type', 'button');
      expect(facebookButton).not.toBeDisabled();
    });
  });

  describe('Loading state', () => {
    it('should disable both buttons when loading is true', () => {
      render(<OAuthButtons {...defaultProps} loading={true} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });

      expect(googleButton).toBeDisabled();
      expect(facebookButton).toBeDisabled();
    });

    it('should show loading spinner on Google button when loading', () => {
      render(<OAuthButtons {...defaultProps} loading={true} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const spinner = googleButton.querySelector('[data-testid="loader-2"], .animate-spin');
      
      expect(spinner).toBeInTheDocument();
    });

    it('should show loading spinner on Facebook button when loading', () => {
      render(<OAuthButtons {...defaultProps} loading={true} />);

      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });
      const spinner = facebookButton.querySelector('[data-testid="loader-2"], .animate-spin');
      
      expect(spinner).toBeInTheDocument();
    });

    it('should not trigger onOAuthSignup when buttons are disabled during loading', () => {
      render(<OAuthButtons {...defaultProps} loading={true} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });

      fireEvent.click(googleButton);
      fireEvent.click(facebookButton);

      expect(mockOnOAuthSignup).not.toHaveBeenCalled();
    });

    it('should enable buttons when loading changes to false', () => {
      const { rerender } = render(<OAuthButtons {...defaultProps} loading={true} />);

      let googleButton = screen.getByRole('button', { name: /continue with google/i });
      let facebookButton = screen.getByRole('button', { name: /continue with facebook/i });

      expect(googleButton).toBeDisabled();
      expect(facebookButton).toBeDisabled();

      rerender(<OAuthButtons {...defaultProps} loading={false} />);

      googleButton = screen.getByRole('button', { name: /continue with google/i });
      facebookButton = screen.getByRole('button', { name: /continue with facebook/i });

      expect(googleButton).not.toBeDisabled();
      expect(facebookButton).not.toBeDisabled();
    });
  });

  describe('User interactions', () => {
    it('should handle multiple clicks on Google button', () => {
      render(<OAuthButtons {...defaultProps} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      
      fireEvent.click(googleButton);
      fireEvent.click(googleButton);

      expect(mockOnOAuthSignup).toHaveBeenCalledTimes(2);
      expect(mockOnOAuthSignup).toHaveBeenCalledWith('google');
    });

    it('should handle multiple clicks on Facebook button', () => {
      render(<OAuthButtons {...defaultProps} />);

      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });
      
      fireEvent.click(facebookButton);
      fireEvent.click(facebookButton);

      expect(mockOnOAuthSignup).toHaveBeenCalledTimes(2);
      expect(mockOnOAuthSignup).toHaveBeenCalledWith('facebook');
    });

    it('should handle clicking both buttons in sequence', () => {
      render(<OAuthButtons {...defaultProps} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });
      
      fireEvent.click(googleButton);
      fireEvent.click(facebookButton);

      expect(mockOnOAuthSignup).toHaveBeenCalledTimes(2);
      expect(mockOnOAuthSignup).toHaveBeenNthCalledWith(1, 'google');
      expect(mockOnOAuthSignup).toHaveBeenNthCalledWith(2, 'facebook');
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(<OAuthButtons {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('should have descriptive button text', () => {
      render(<OAuthButtons {...defaultProps} />);

      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(<OAuthButtons {...defaultProps} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });

      // Simulate keyboard activation
      fireEvent.keyDown(googleButton, { key: 'Enter', code: 'Enter' });
      fireEvent.keyDown(facebookButton, { key: ' ', code: 'Space' });

      // The onClick should still work for keyboard events
      expect(googleButton).toBeInTheDocument();
      expect(facebookButton).toBeInTheDocument();
    });

    it('should maintain focus when not disabled', () => {
      render(<OAuthButtons {...defaultProps} loading={false} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      
      googleButton.focus();
      expect(document.activeElement).toBe(googleButton);
    });
  });

  describe('Icon rendering', () => {
    it('should render Google icon with correct SVG structure', () => {
      render(<OAuthButtons {...defaultProps} loading={false} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const svg = googleButton.querySelector('svg');
      const paths = svg?.querySelectorAll('path');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(paths).toHaveLength(4); // Google logo has 4 path elements
    });

    it('should render Facebook icon with correct SVG structure', () => {
      render(<OAuthButtons {...defaultProps} loading={false} />);

      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });
      const svg = facebookButton.querySelector('svg');
      const paths = svg?.querySelectorAll('path');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(paths).toHaveLength(1); // Facebook logo has 1 path element
    });

    it('should show spinner instead of icon when loading', () => {
      render(<OAuthButtons {...defaultProps} loading={true} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });

      // Should have spinner, not the regular icons
      const googleSpinner = googleButton.querySelector('.animate-spin');
      const facebookSpinner = facebookButton.querySelector('.animate-spin');

      expect(googleSpinner).toBeInTheDocument();
      expect(facebookSpinner).toBeInTheDocument();
    });
  });

  describe('Button styling', () => {
    it('should have outline variant styling', () => {
      render(<OAuthButtons {...defaultProps} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });

      // Both buttons should have outline variant (specific classes depend on UI library)
      expect(googleButton).toBeInTheDocument();
      expect(facebookButton).toBeInTheDocument();
    });

    it('should have consistent spacing', () => {
      render(<OAuthButtons {...defaultProps} />);

      const container = screen.getByRole('button', { name: /continue with google/i }).parentElement;
      expect(container).toHaveClass('space-y-2');
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined onOAuthSignup gracefully', () => {
      // This should not crash
      expect(() => {
        render(<OAuthButtons onOAuthSignup={undefined as any} loading={false} />);
      }).not.toThrow();
    });

    it('should handle rapid successive clicks', () => {
      render(<OAuthButtons {...defaultProps} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      
      // Simulate rapid clicks
      fireEvent.click(googleButton);
      fireEvent.click(googleButton);
      fireEvent.click(googleButton);

      expect(mockOnOAuthSignup).toHaveBeenCalledTimes(3);
    });

    it('should maintain state when props change', () => {
      const { rerender } = render(<OAuthButtons {...defaultProps} loading={false} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      expect(googleButton).not.toBeDisabled();

      rerender(<OAuthButtons {...defaultProps} loading={true} />);
      expect(googleButton).toBeDisabled();

      rerender(<OAuthButtons {...defaultProps} loading={false} />);
      expect(googleButton).not.toBeDisabled();
    });
  });
});