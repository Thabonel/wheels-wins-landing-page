import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimplePAM, type SimplePAMProps } from './SimplePAM';

// Mock the Claude service
vi.mock('@/services/claude', () => ({
  default: {
    chat: vi.fn(),
    isReady: vi.fn(() => true)
  }
}));

// Mock the Supabase auth hook
vi.mock('@supabase/auth-helpers-react', () => ({
  useUser: vi.fn(() => null)
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, any>(({ onChange, onKeyPress, ...props }, ref) => (
    <input
      ref={ref}
      onChange={onChange}
      onKeyDown={onKeyPress}
      {...props}
    />
  ))
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  )
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>{children}</div>
  ),
  AlertDescription: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: React.forwardRef<HTMLDivElement, any>(({ children, className }, ref) => (
    <div ref={ref} className={className}>{children}</div>
  ))
}));

// Mock lucide icons
vi.mock('lucide-react', () => ({
  Send: () => <span data-testid="send-icon">Send</span>,
  Loader2: () => <span data-testid="loader-icon">Loading</span>,
  AlertCircle: () => <span data-testid="alert-icon">Alert</span>,
  Bot: () => <span data-testid="bot-icon">Bot</span>,
  User: () => <span data-testid="user-icon">User</span>
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

describe('SimplePAM Component', () => {
  const mockClaude = vi.mocked(await import('@/services/claude')).default;
  const mockUseUser = vi.mocked(await import('@supabase/auth-helpers-react')).useUser;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClaude.chat.mockResolvedValue({
      content: 'Hello! How can I help you?',
      timestamp: new Date(),
      role: 'assistant'
    });
    mockUseUser.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Rendering', () => {
    it('should render the component with default message', () => {
      render(<SimplePAM />);
      
      expect(screen.getByText('PAM - Personal AI Manager')).toBeInTheDocument();
      expect(screen.getByText(/Hi! I'm PAM, your personal AI manager/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Ask PAM about your finances/)).toBeInTheDocument();
      expect(screen.getByTestId('send-icon')).toBeInTheDocument();
    });

    it('should render with custom default message', () => {
      const customMessage = 'Custom welcome message';
      render(<SimplePAM defaultMessage={customMessage} />);
      
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(<SimplePAM className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should show login prompt when user is not logged in', () => {
      render(<SimplePAM />);
      
      expect(screen.getByText(/Log in to get personalized financial insights/)).toBeInTheDocument();
    });

    it('should not show login prompt when user is logged in', () => {
      mockUseUser.mockReturnValue({ email: 'test@example.com' } as any);
      render(<SimplePAM />);
      
      expect(screen.queryByText(/Log in to get personalized financial insights/)).not.toBeInTheDocument();
    });
  });

  describe('Message Interaction', () => {
    it('should add user message when send button is clicked', async () => {
      const user = userEvent.setup();
      render(<SimplePAM />);
      
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'Hello PAM');
      await user.click(sendButton);
      
      expect(screen.getByText('Hello PAM')).toBeInTheDocument();
    });

    it('should add user message when Enter key is pressed', async () => {
      const user = userEvent.setup();
      render(<SimplePAM />);
      
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      
      await user.type(input, 'Hello PAM{enter}');
      
      expect(screen.getByText('Hello PAM')).toBeInTheDocument();
    });

    it('should not send empty messages', async () => {
      const user = userEvent.setup();
      render(<SimplePAM />);
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.click(sendButton);
      
      // Should only have the welcome message
      expect(screen.getAllByTestId('bot-icon')).toHaveLength(1);
    });

    it('should clear input after sending message', async () => {
      const user = userEvent.setup();
      render(<SimplePAM />);
      
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/) as HTMLInputElement;
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'Test message');
      await user.click(sendButton);
      
      expect(input.value).toBe('');
    });

    it('should call onMessageSent callback when provided', async () => {
      const onMessageSent = vi.fn();
      const user = userEvent.setup();
      
      render(<SimplePAM onMessageSent={onMessageSent} />);
      
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(onMessageSent).toHaveBeenCalledWith(
          'Test message',
          'Hello! How can I help you?'
        );
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state while waiting for response', async () => {
      const user = userEvent.setup();
      
      // Make Claude service take time to respond
      mockClaude.chat.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          content: 'Response',
          timestamp: new Date(),
          role: 'assistant'
        }), 100))
      );
      
      render(<SimplePAM />);
      
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'Test message');
      await user.click(sendButton);
      
      // Should show loading message
      expect(screen.getByText('PAM is thinking...')).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      
      // Should disable input and button
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });

    it('should hide loading state after receiving response', async () => {
      const user = userEvent.setup();
      render(<SimplePAM />);
      
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.queryByText('PAM is thinking...')).not.toBeInTheDocument();
        expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
      });
      
      // Should re-enable input and button
      expect(input).not.toBeDisabled();
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when Claude service fails', async () => {
      const user = userEvent.setup();
      
      mockClaude.chat.mockRejectedValue(new Error('API Error'));
      
      render(<SimplePAM />);
      
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument();
        expect(screen.getByText(/Failed to get response from PAM/)).toBeInTheDocument();
      });
      
      // Should show error message in chat
      expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument();
    });

    it('should clear error when sending new message', async () => {
      const user = userEvent.setup();
      
      // First message fails
      mockClaude.chat.mockRejectedValueOnce(new Error('API Error'));
      // Second message succeeds
      mockClaude.chat.mockResolvedValueOnce({
        content: 'Success response',
        timestamp: new Date(),
        role: 'assistant'
      });
      
      render(<SimplePAM />);
      
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // First message
      await user.type(input, 'First message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument();
      });
      
      // Second message
      await user.type(input, 'Second message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
        expect(screen.getByText('Success response')).toBeInTheDocument();
      });
    });
  });

  describe('Chat Management', () => {
    it('should clear chat when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<SimplePAM />);
      
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Add a message
      await user.type(input, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
      
      // Clear chat
      const clearButton = screen.getByRole('button', { name: /clear chat/i });
      await user.click(clearButton);
      
      // Should only have welcome message
      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
      expect(screen.getByText(/Hi! I'm PAM, your personal AI manager/)).toBeInTheDocument();
    });

    it('should display timestamps for messages', async () => {
      const user = userEvent.setup();
      render(<SimplePAM />);
      
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        // Should have timestamp elements (using regex to match time format)
        expect(screen.getAllByText(/\d{1,2}:\d{2}/)).toHaveLength(3); // Welcome + user + assistant
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<SimplePAM />);
      
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear chat/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should focus input on mount', () => {
      render(<SimplePAM />);
      
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      expect(input).toHaveFocus();
    });

    it('should focus input after sending message', async () => {
      const user = userEvent.setup();
      render(<SimplePAM />);
      
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });
  });

  describe('User Context Integration', () => {
    it('should include user email in system prompt when logged in', async () => {
      const user = userEvent.setup();
      const mockUser = { email: 'test@example.com', id: '123' };
      
      mockUseUser.mockReturnValue(mockUser as any);
      
      render(<SimplePAM />);
      
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockClaude.chat).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({
            systemPrompt: expect.stringContaining('test@example.com')
          })
        );
      });
    });

    it('should handle not logged in state in system prompt', async () => {
      const user = userEvent.setup();
      
      mockUseUser.mockReturnValue(null);
      
      render(<SimplePAM />);
      
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockClaude.chat).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({
            systemPrompt: expect.stringContaining('not logged in')
          })
        );
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should not send message when Shift+Enter is pressed', async () => {
      const user = userEvent.setup();
      render(<SimplePAM />);
      
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      
      await user.type(input, 'Test message');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      
      // Should not have sent the message
      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });

    it('should maintain input value when Shift+Enter is pressed', async () => {
      const user = userEvent.setup();
      render(<SimplePAM />);
      
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/) as HTMLInputElement;
      
      await user.type(input, 'Test message');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      
      expect(input.value).toBe('Test message');
    });
  });
});