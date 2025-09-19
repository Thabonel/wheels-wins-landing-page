import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SimplePAM } from './SimplePAM';
import { toast } from 'sonner';

// Mock all dependencies
vi.mock('@/services/claude');
vi.mock('@/services/pam/tools/toolRegistry');
vi.mock('@supabase/auth-helpers-react');
vi.mock('./voice/VoiceSettings');
vi.mock('./voice/VoiceToggle');
vi.mock('@/hooks/voice/useTextToSpeech');
vi.mock('sonner');

// Import mocked modules
import claudeService from '@/services/claude';
import { getToolsForClaude } from '@/services/pam/tools/toolRegistry';
import { useUser } from '@supabase/auth-helpers-react';
import { VoiceSettings } from './voice/VoiceSettings';
import { VoiceToggle } from './voice/VoiceToggle';
import { useTextToSpeech } from '@/hooks/voice/useTextToSpeech';

const mockClaudeService = claudeService as { chat: Mock };
const mockGetToolsForClaude = getToolsForClaude as Mock;
const mockUseUser = useUser as Mock;
const mockVoiceSettings = VoiceSettings as Mock;
const mockVoiceToggle = VoiceToggle as Mock;
const mockUseTextToSpeech = useTextToSpeech as Mock;
const mockToast = toast as any;

describe('SimplePAM Voice Integration', () => {
  let mockTTS: any;
  let user: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock user
    user = userEvent.setup();

    // Mock TTS hook
    mockTTS = {
      isSupported: true,
      isSpeaking: false,
      speak: vi.fn(),
      stopSpeaking: vi.fn()
    };
    mockUseTextToSpeech.mockReturnValue(mockTTS);

    // Mock user hook
    mockUseUser.mockReturnValue({
      id: 'test-user',
      email: 'test@example.com'
    });

    // Mock Claude service
    mockClaudeService.chat.mockResolvedValue({
      content: 'Hello! I can help you with your finances.',
      timestamp: new Date()
    });

    // Mock tools
    mockGetToolsForClaude.mockReturnValue([]);

    // Mock toast
    mockToast.success = vi.fn();
    mockToast.error = vi.fn();
    mockToast.info = vi.fn();

    // Mock voice components with pass-through behavior
    mockVoiceSettings.mockImplementation(({ onVoiceInputChange, onVoiceOutputChange }) => (
      <div data-testid="voice-settings">
        <button onClick={() => onVoiceInputChange?.(false)}>Disable Voice Input</button>
        <button onClick={() => onVoiceOutputChange?.(false)}>Disable Voice Output</button>
      </div>
    ));

    mockVoiceToggle.mockImplementation(({ onTranscript, onVoiceCommand, disabled }) => (
      <div data-testid="voice-toggle">
        <button 
          disabled={disabled}
          onClick={() => onTranscript?.('Hello PAM', 0.9)}
        >
          Voice Input
        </button>
        <button onClick={() => onVoiceCommand?.('clear chat')}>Voice Command</button>
      </div>
    ));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Voice Settings Integration', () => {
    it('should render voice settings when enabled', () => {
      render(<SimplePAM enableVoice={true} showVoiceSettings={true} />);

      expect(screen.getByTestId('voice-settings')).toBeInTheDocument();
    });

    it('should not render voice settings when disabled', () => {
      render(<SimplePAM enableVoice={false} showVoiceSettings={true} />);

      expect(screen.queryByTestId('voice-settings')).not.toBeInTheDocument();
    });

    it('should handle voice input toggle', async () => {
      render(<SimplePAM enableVoice={true} showVoiceSettings={true} />);

      const disableButton = screen.getByText('Disable Voice Input');
      fireEvent.click(disableButton);

      // Voice toggle should not be visible when voice input is disabled
      await waitFor(() => {
        expect(screen.queryByTestId('voice-toggle')).not.toBeInTheDocument();
      });
    });

    it('should handle voice output toggle and stop TTS', async () => {
      mockTTS.isSpeaking = true;
      render(<SimplePAM enableVoice={true} showVoiceSettings={true} />);

      const disableButton = screen.getByText('Disable Voice Output');
      fireEvent.click(disableButton);

      expect(mockTTS.stopSpeaking).toHaveBeenCalled();
    });
  });

  describe('Voice Input Integration', () => {
    it('should render voice toggle when voice input is enabled', () => {
      render(<SimplePAM enableVoice={true} />);

      expect(screen.getByTestId('voice-toggle')).toBeInTheDocument();
    });

    it('should populate input field when voice transcript is received', async () => {
      render(<SimplePAM enableVoice={true} autoSendVoiceInput={false} />);

      const voiceButton = screen.getByText('Voice Input');
      fireEvent.click(voiceButton);

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
        expect(input).toHaveValue('Hello PAM');
      });
    });

    it('should auto-send message when auto-send is enabled and confidence is high', async () => {
      render(<SimplePAM enableVoice={true} autoSendVoiceInput={true} />);

      const voiceButton = screen.getByText('Voice Input');
      fireEvent.click(voiceButton);

      await waitFor(() => {
        expect(mockClaudeService.chat).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Hello PAM'
            })
          ]),
          expect.any(Object)
        );
      });
    });

    it('should not auto-send when loading', async () => {
      // Mock Claude service to be slow
      mockClaudeService.chat.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<SimplePAM enableVoice={true} autoSendVoiceInput={true} />);

      // Start a regular message first
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      await user.type(input, 'Test message');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      // Now try voice input while loading
      const voiceButton = screen.getByText('Voice Input');
      fireEvent.click(voiceButton);

      // Should not send another message while loading
      expect(mockClaudeService.chat).toHaveBeenCalledTimes(1);
    });

    it('should disable voice toggle when chat is loading', async () => {
      // Mock Claude service to be slow
      mockClaudeService.chat.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<SimplePAM enableVoice={true} />);

      // Start loading state
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      await user.type(input, 'Test message');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      // Voice toggle should be disabled
      await waitFor(() => {
        const voiceButton = screen.getByText('Voice Input');
        expect(voiceButton).toBeDisabled();
      });
    });
  });

  describe('Voice Commands', () => {
    it('should handle clear chat voice command', async () => {
      render(<SimplePAM enableVoice={true} />);

      // Add a message first
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      await user.type(input, 'Test message');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });

      // Use voice command to clear
      const commandButton = screen.getByText('Voice Command');
      fireEvent.click(commandButton);

      await waitFor(() => {
        expect(screen.queryByText('Test message')).not.toBeInTheDocument();
      });

      expect(mockTTS.speak).toHaveBeenCalledWith('Chat cleared.');
    });

    it('should stop TTS when processing voice commands', async () => {
      mockTTS.isSpeaking = true;
      render(<SimplePAM enableVoice={true} />);

      const commandButton = screen.getByText('Voice Command');
      fireEvent.click(commandButton);

      expect(mockTTS.stopSpeaking).toHaveBeenCalled();
    });
  });

  describe('Voice Output Integration', () => {
    it('should speak assistant responses when voice output is enabled', async () => {
      render(<SimplePAM enableVoice={true} />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      await user.type(input, 'Hello');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockTTS.speak).toHaveBeenCalledWith('Hello! I can help you with your finances.');
      });
    });

    it('should clean markdown from responses before speaking', async () => {
      mockClaudeService.chat.mockResolvedValue({
        content: '**Hello!** I can help you with *your* finances. Here is `code` and # Header',
        timestamp: new Date()
      });

      render(<SimplePAM enableVoice={true} />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      await user.type(input, 'Hello');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockTTS.speak).toHaveBeenCalledWith('Hello! I can help you with your finances. Here is code and Header');
      });
    });

    it('should not speak responses when voice output is disabled', async () => {
      render(<SimplePAM enableVoice={true} showVoiceSettings={true} />);

      // Disable voice output
      const disableButton = screen.getByText('Disable Voice Output');
      fireEvent.click(disableButton);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      await user.type(input, 'Hello');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/Hello! I can help you/)).toBeInTheDocument();
      });

      expect(mockTTS.speak).not.toHaveBeenCalled();
    });
  });

  describe('TTS Visual Feedback', () => {
    it('should show speaking indicator when TTS is active', () => {
      mockTTS.isSpeaking = true;
      render(<SimplePAM enableVoice={true} />);

      expect(screen.getByText('Speaking...')).toBeInTheDocument();
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    it('should hide speaking indicator when TTS is not active', () => {
      mockTTS.isSpeaking = false;
      render(<SimplePAM enableVoice={true} />);

      expect(screen.queryByText('Speaking...')).not.toBeInTheDocument();
      expect(screen.queryByText('Stop')).not.toBeInTheDocument();
    });

    it('should stop TTS when stop button is clicked', () => {
      mockTTS.isSpeaking = true;
      render(<SimplePAM enableVoice={true} />);

      const stopButton = screen.getByText('Stop');
      fireEvent.click(stopButton);

      expect(mockTTS.stopSpeaking).toHaveBeenCalled();
    });
  });

  describe('Interruption Handling', () => {
    it('should stop TTS before sending new message', async () => {
      mockTTS.isSpeaking = true;
      render(<SimplePAM enableVoice={true} />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      await user.type(input, 'New message');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      expect(mockTTS.stopSpeaking).toHaveBeenCalled();
    });

    it('should stop TTS when voice input is received', async () => {
      mockTTS.isSpeaking = true;
      render(<SimplePAM enableVoice={true} />);

      const voiceButton = screen.getByText('Voice Input');
      fireEvent.click(voiceButton);

      expect(mockTTS.stopSpeaking).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle Claude service errors gracefully', async () => {
      mockClaudeService.chat.mockRejectedValue(new Error('API Error'));
      
      render(<SimplePAM enableVoice={true} />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      await user.type(input, 'Hello');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument();
      });

      // Should not try to speak error messages
      expect(mockTTS.speak).not.toHaveBeenCalled();
    });

    it('should not break when TTS is not supported', async () => {
      mockTTS.isSupported = false;
      
      render(<SimplePAM enableVoice={true} />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      await user.type(input, 'Hello');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/Hello! I can help you/)).toBeInTheDocument();
      });

      // Should not crash when TTS is not supported
      expect(mockTTS.speak).not.toHaveBeenCalled();
    });
  });

  describe('Callback Integration', () => {
    it('should call onMessageSent callback with voice input', async () => {
      const onMessageSent = vi.fn();
      render(<SimplePAM enableVoice={true} autoSendVoiceInput={true} onMessageSent={onMessageSent} />);

      const voiceButton = screen.getByText('Voice Input');
      fireEvent.click(voiceButton);

      await waitFor(() => {
        expect(onMessageSent).toHaveBeenCalledWith(
          'Hello PAM',
          'Hello! I can help you with your finances.'
        );
      });
    });

    it('should call onMessageSent callback with correct voice transcript', async () => {
      const onMessageSent = vi.fn();
      
      // Mock voice toggle to provide different transcript
      mockVoiceToggle.mockImplementation(({ onTranscript, autoSendVoiceInput }) => (
        <button onClick={() => onTranscript?.('Check my budget', 0.95)}>
          Voice Input
        </button>
      ));

      render(<SimplePAM enableVoice={true} autoSendVoiceInput={true} onMessageSent={onMessageSent} />);

      const voiceButton = screen.getByText('Voice Input');
      fireEvent.click(voiceButton);

      await waitFor(() => {
        expect(onMessageSent).toHaveBeenCalledWith(
          'Check my budget',
          'Hello! I can help you with your finances.'
        );
      });
    });
  });

  describe('Confidence Threshold Handling', () => {
    it('should auto-send when confidence is above threshold', async () => {
      // Mock high confidence
      mockVoiceToggle.mockImplementation(({ onTranscript }) => (
        <button onClick={() => onTranscript?.('High confidence message', 0.95)}>
          Voice Input
        </button>
      ));

      render(<SimplePAM enableVoice={true} autoSendVoiceInput={true} />);

      const voiceButton = screen.getByText('Voice Input');
      fireEvent.click(voiceButton);

      await waitFor(() => {
        expect(mockClaudeService.chat).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'High confidence message'
            })
          ]),
          expect.any(Object)
        );
      });
    });

    it('should not auto-send when confidence is below threshold', async () => {
      // Mock low confidence
      mockVoiceToggle.mockImplementation(({ onTranscript }) => (
        <button onClick={() => onTranscript?.('Low confidence message', 0.5)}>
          Voice Input
        </button>
      ));

      render(<SimplePAM enableVoice={true} autoSendVoiceInput={true} />);

      const voiceButton = screen.getByText('Voice Input');
      fireEvent.click(voiceButton);

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
        expect(input).toHaveValue('Low confidence message');
      });

      // Should not auto-send
      expect(mockClaudeService.chat).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should maintain keyboard navigation with voice components', async () => {
      render(<SimplePAM enableVoice={true} />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      
      // Should be able to tab to input
      await user.tab();
      expect(input).toHaveFocus();

      // Should be able to type and submit with Enter
      await user.type(input, 'Test message{enter}');

      await waitFor(() => {
        expect(mockClaudeService.chat).toHaveBeenCalled();
      });
    });

    it('should provide appropriate ARIA labels and roles', () => {
      render(<SimplePAM enableVoice={true} />);

      // Should have proper heading structure
      expect(screen.getByRole('heading', { name: /PAM - Personal AI Manager/ })).toBeInTheDocument();
      
      // Should have proper input labeling
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      expect(input).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not create excessive renders when voice state changes', async () => {
      const renderSpy = vi.fn();
      
      const TestWrapper = (props: any) => {
        renderSpy();
        return <SimplePAM {...props} />;
      };

      render(<TestWrapper enableVoice={true} />);

      const initialRenderCount = renderSpy.mock.calls.length;

      // Trigger voice input
      const voiceButton = screen.getByText('Voice Input');
      fireEvent.click(voiceButton);

      await waitFor(() => {
        // Should not cause excessive re-renders
        expect(renderSpy.mock.calls.length - initialRenderCount).toBeLessThan(5);
      });
    });
  });
});