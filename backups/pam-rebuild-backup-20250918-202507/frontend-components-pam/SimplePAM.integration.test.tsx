/**
 * Integration tests for SimplePAM component
 * Tests the complete flow from user input to Claude API responses
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimplePAM, type SimplePAMProps } from './SimplePAM';

// Mock the Claude service completely for integration testing
const mockClaudeService = {
  chat: vi.fn(),
  isReady: vi.fn(() => true),
  testConnection: vi.fn(() => Promise.resolve(true)),
  sendMessage: vi.fn(),
  chatStream: vi.fn(),
  updateConfig: vi.fn(),
  getConfig: vi.fn(() => ({ model: 'claude-3-5-sonnet-20241022', maxTokens: 1000, temperature: 0.7 }))
};

vi.mock('@/services/claude', () => ({
  default: mockClaudeService,
  ClaudeService: vi.fn(() => mockClaudeService),
  ClaudeServiceError: class ClaudeServiceError extends Error {
    constructor(message: string, public type: string, public originalError?: any) {
      super(message);
      this.name = 'ClaudeServiceError';
    }
  },
  ClaudeErrorType: {
    API_KEY_MISSING: 'API_KEY_MISSING',
    API_KEY_INVALID: 'API_KEY_INVALID',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    NETWORK_ERROR: 'NETWORK_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  }
}));

// Mock the Supabase auth hook
vi.mock('@supabase/auth-helpers-react', () => ({
  useUser: vi.fn(() => ({ email: 'test@example.com', id: 'test-user-id' }))
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
    <div className={className} data-testid="card">{children}</div>
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
    <div ref={ref} className={className} data-testid="scroll-area">{children}</div>
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

describe('SimplePAM Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  describe('Complete Message Flow Integration', () => {
    it('should handle complete user message to Claude response flow', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const onMessageSent = vi.fn();
      
      // Mock successful Claude response
      const mockResponse = {
        content: 'Hello! I can help you with your finances and trip planning.',
        timestamp: new Date('2025-09-13T12:00:00Z'),
        role: 'assistant' as const
      };
      
      mockClaudeService.chat.mockResolvedValueOnce(mockResponse);

      render(<SimplePAM onMessageSent={onMessageSent} />);

      // Verify initial state
      expect(screen.getByText(/Hi! I'm PAM, your personal AI manager/)).toBeInTheDocument();
      
      // Type and send message
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'What can you help me with?');
      
      // Verify input has the message
      expect(input).toHaveValue('What can you help me with?');
      
      // Send the message
      await user.click(sendButton);
      
      // Verify loading state appears
      expect(screen.getByText('PAM is thinking...')).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      
      // Verify input is cleared
      expect(input).toHaveValue('');
      
      // Verify input and button are disabled during loading
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
      
      // Wait for Claude API call to complete
      await waitFor(() => {
        expect(mockClaudeService.chat).toHaveBeenCalledWith(
          [
            {
              role: 'user',
              content: 'What can you help me with?',
              timestamp: expect.any(Date)
            }
          ],
          expect.objectContaining({
            systemPrompt: expect.stringContaining('test@example.com'),
            maxTokens: 500,
            temperature: 0.7
          })
        );
      });
      
      // Wait for response to appear and loading to disappear
      await waitFor(() => {
        expect(screen.queryByText('PAM is thinking...')).not.toBeInTheDocument();
        expect(screen.getByText('Hello! I can help you with your finances and trip planning.')).toBeInTheDocument();
      });
      
      // Verify user message is displayed
      expect(screen.getByText('What can you help me with?')).toBeInTheDocument();
      
      // Verify input and button are re-enabled
      expect(input).not.toBeDisabled();
      expect(sendButton).not.toBeDisabled();
      
      // Verify callback was called
      expect(onMessageSent).toHaveBeenCalledWith(
        'What can you help me with?',
        'Hello! I can help you with your finances and trip planning.'
      );
    });

    it('should handle multiple messages in conversation', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Mock responses for conversation
      const responses = [
        {
          content: 'I can help with budgeting and expense tracking.',
          timestamp: new Date('2025-09-13T12:01:00Z'),
          role: 'assistant' as const
        },
        {
          content: 'Start by categorizing your expenses into needs and wants.',
          timestamp: new Date('2025-09-13T12:02:00Z'),
          role: 'assistant' as const
        }
      ];
      
      mockClaudeService.chat
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1]);

      render(<SimplePAM />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // First message
      await user.type(input, 'Help me with budgeting');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('I can help with budgeting and expense tracking.')).toBeInTheDocument();
      });

      // Second message
      await user.type(input, 'How do I start?');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Start by categorizing your expenses into needs and wants.')).toBeInTheDocument();
      });

      // Verify conversation history is maintained
      expect(screen.getByText('Help me with budgeting')).toBeInTheDocument();
      expect(screen.getByText('How do I start?')).toBeInTheDocument();
      expect(screen.getByText('I can help with budgeting and expense tracking.')).toBeInTheDocument();
      expect(screen.getByText('Start by categorizing your expenses into needs and wants.')).toBeInTheDocument();

      // Verify Claude service was called with conversation history
      expect(mockClaudeService.chat).toHaveBeenCalledTimes(2);
      
      // Second call should include first message in history
      const secondCallArgs = mockClaudeService.chat.mock.calls[1];
      expect(secondCallArgs[0]).toHaveLength(2); // user message + previous user message
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle Claude API failures gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Mock API failure
      const apiError = new Error('API Error: Rate limit exceeded');
      mockClaudeService.chat.mockRejectedValueOnce(apiError);

      render(<SimplePAM />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test error handling');
      await user.click(sendButton);

      // Wait for loading to appear
      await waitFor(() => {
        expect(screen.getByText('PAM is thinking...')).toBeInTheDocument();
      });

      // Wait for error handling
      await waitFor(() => {
        expect(screen.queryByText('PAM is thinking...')).not.toBeInTheDocument();
      });

      // Verify error message appears
      expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument();
      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByText(/Failed to get response from PAM/)).toBeInTheDocument();

      // Verify input is re-enabled for retry
      expect(input).not.toBeDisabled();
      expect(sendButton).not.toBeDisabled();
    });

    it('should clear errors on successful message', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // First message fails, second succeeds
      const apiError = new Error('Network error');
      const successResponse = {
        content: 'This message worked fine!',
        timestamp: new Date(),
        role: 'assistant' as const
      };
      
      mockClaudeService.chat
        .mockRejectedValueOnce(apiError)
        .mockResolvedValueOnce(successResponse);

      render(<SimplePAM />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // First message (fails)
      await user.type(input, 'First message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument();
      });

      // Second message (succeeds)
      await user.type(input, 'Second message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
        expect(screen.getByText('This message worked fine!')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States Integration', () => {
    it('should show loading state during API call', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimers });
      
      // Mock delayed response
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockClaudeService.chat.mockReturnValueOnce(delayedPromise);

      render(<SimplePAM />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test loading');
      await user.click(sendButton);

      // Verify loading state immediately
      expect(screen.getByText('PAM is thinking...')).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
      expect(input).toHaveValue('');

      // Resolve the promise
      resolvePromise!({
        content: 'Response after loading',
        timestamp: new Date(),
        role: 'assistant'
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('PAM is thinking...')).not.toBeInTheDocument();
        expect(screen.getByText('Response after loading')).toBeInTheDocument();
      });

      // Verify controls are re-enabled
      expect(input).not.toBeDisabled();
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('Message Persistence Integration', () => {
    it('should persist messages in state across interactions', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      const responses = [
        { content: 'First response', timestamp: new Date(), role: 'assistant' as const },
        { content: 'Second response', timestamp: new Date(), role: 'assistant' as const }
      ];
      
      mockClaudeService.chat
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1]);

      render(<SimplePAM />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send first message
      await user.type(input, 'First message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('First response')).toBeInTheDocument();
      });

      // Send second message
      await user.type(input, 'Second message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Second response')).toBeInTheDocument();
      });

      // Verify all messages are still visible
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('First response')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
      expect(screen.getByText('Second response')).toBeInTheDocument();
      
      // Verify welcome message is still there
      expect(screen.getByText(/Hi! I'm PAM, your personal AI manager/)).toBeInTheDocument();
    });

    it('should clear all messages when clear chat is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      mockClaudeService.chat.mockResolvedValueOnce({
        content: 'Test response',
        timestamp: new Date(),
        role: 'assistant'
      });

      render(<SimplePAM />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send a message
      await user.type(input, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test response')).toBeInTheDocument();
      });

      // Clear chat
      const clearButton = screen.getByRole('button', { name: /clear chat/i });
      await user.click(clearButton);

      // Verify messages are cleared but welcome message remains
      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
      expect(screen.queryByText('Test response')).not.toBeInTheDocument();
      expect(screen.getByText(/Hi! I'm PAM, your personal AI manager/)).toBeInTheDocument();
    });
  });

  describe('User Context Integration', () => {
    it('should include user context in Claude API calls', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      mockClaudeService.chat.mockResolvedValueOnce({
        content: 'Personalized response',
        timestamp: new Date(),
        role: 'assistant'
      });

      render(<SimplePAM />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Help me with finances');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockClaudeService.chat).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({
            systemPrompt: expect.stringContaining('test@example.com'),
            maxTokens: 500,
            temperature: 0.7
          })
        );
      });

      // Verify system prompt includes user context
      const callArgs = mockClaudeService.chat.mock.calls[0];
      expect(callArgs[1].systemPrompt).toContain('The user is logged in with email: test@example.com');
    });
  });

  describe('Edge Cases Integration', () => {
    it('should handle Enter key submission', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      mockClaudeService.chat.mockResolvedValueOnce({
        content: 'Enter key response',
        timestamp: new Date(),
        role: 'assistant'
      });

      render(<SimplePAM />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);

      await user.type(input, 'Test enter key');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Enter key response')).toBeInTheDocument();
      });

      expect(mockClaudeService.chat).toHaveBeenCalledTimes(1);
    });

    it('should not submit on Shift+Enter', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<SimplePAM />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/) as HTMLInputElement;

      await user.type(input, 'Test shift enter');
      await user.keyboard('{Shift>}{Enter}{/Shift}');

      // Should not have called Claude service
      expect(mockClaudeService.chat).not.toHaveBeenCalled();
      
      // Input should still have value
      expect(input.value).toBe('Test shift enter');
    });

    it('should not submit empty messages', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<SimplePAM />);

      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.click(sendButton);

      // Should not have called Claude service
      expect(mockClaudeService.chat).not.toHaveBeenCalled();
    });
  });
});