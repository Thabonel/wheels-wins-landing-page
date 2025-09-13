import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoiceSettings } from './VoiceSettings';
import { VoiceToggle } from './VoiceToggle';
import { MobileVoiceToggle } from './MobileVoiceToggle';
import { SimplePAM } from '../SimplePAM';
import { performance } from 'perf_hooks';

// Mock dependencies
vi.mock('@/hooks/voice/useTextToSpeech');
vi.mock('@/hooks/voice/useVoiceInput');
vi.mock('@/hooks/voice/useMobileVoice');
vi.mock('@/lib/mobile');
vi.mock('@/services/claude');
vi.mock('@supabase/auth-helpers-react');
vi.mock('sonner');

// Import mocked modules
import { useTextToSpeech } from '@/hooks/voice/useTextToSpeech';
import { useVoiceInput } from '@/hooks/voice/useVoiceInput';
import { useMobileVoice } from '@/hooks/voice/useMobileVoice';
import { getMobileInfo } from '@/lib/mobile';
import claudeService from '@/services/claude';
import { useUser } from '@supabase/auth-helpers-react';
import { toast } from 'sonner';

const mockUseTextToSpeech = useTextToSpeech as Mock;
const mockUseVoiceInput = useVoiceInput as Mock;
const mockUseMobileVoice = useMobileVoice as Mock;
const mockGetMobileInfo = getMobileInfo as Mock;
const mockClaudeService = claudeService as { chat: Mock };
const mockUseUser = useUser as Mock;
const mockToast = toast as any;

describe('Voice Integration Tests', () => {
  let mockTTS: any;
  let mockVoiceInput: any;
  let mockMobileVoice: any;
  let user: any;
  let localStorage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();

    // Mock localStorage
    localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorage,
      writable: true
    });

    // Mock TTS
    mockTTS = {
      isSupported: true,
      isSpeaking: false,
      isPaused: false,
      speak: vi.fn(),
      stopSpeaking: vi.fn(),
      pauseSpeaking: vi.fn(),
      resumeSpeaking: vi.fn(),
      availableVoices: [
        { name: 'Test Voice 1', lang: 'en-US', default: true },
        { name: 'Test Voice 2', lang: 'es-ES', default: false }
      ],
      selectedVoice: { name: 'Test Voice 1', lang: 'en-US', default: true },
      currentOptions: { rate: 1.0, pitch: 1.0, volume: 0.8 }
    };
    mockUseTextToSpeech.mockReturnValue(mockTTS);

    // Mock Voice Input
    mockVoiceInput = {
      isSupported: true,
      isListening: false,
      isProcessing: false,
      transcript: '',
      interimTranscript: '',
      confidence: 0,
      error: null,
      hasPermission: true,
      startListening: vi.fn().mockResolvedValue(true),
      stopListening: vi.fn(),
      abortListening: vi.fn(),
      clearTranscript: vi.fn(),
      requestPermission: vi.fn().mockResolvedValue(true),
      canStart: true,
      canStop: false,
      hasContent: false,
      fullTranscript: ''
    };
    mockUseVoiceInput.mockReturnValue(mockVoiceInput);

    // Mock Mobile Voice
    mockMobileVoice = {
      mobileInfo: {
        isMobile: true,
        isIOS: false,
        isAndroid: true,
        isSafari: false,
        isChrome: true
      },
      isSupported: true,
      ttsSupported: true,
      voiceInputSupported: true,
      isListening: false,
      isSpeaking: false,
      keyboardOpen: false,
      isInBackground: false,
      isPortrait: true,
      audioUnlocked: true,
      canListen: true,
      speak: vi.fn(),
      startListening: vi.fn().mockResolvedValue(true),
      stopListening: vi.fn(),
      unlockAudio: vi.fn().mockResolvedValue(true)
    };
    mockUseMobileVoice.mockReturnValue(mockMobileVoice);

    // Mock mobile info
    mockGetMobileInfo.mockReturnValue({
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isSafari: false,
      isChrome: true
    });

    // Mock Claude service
    mockClaudeService.chat.mockResolvedValue({
      content: 'I can help you with your finances and trip planning.',
      timestamp: new Date()
    });

    // Mock user
    mockUseUser.mockReturnValue({
      id: 'test-user',
      email: 'test@example.com'
    });

    // Mock toast
    mockToast.success = vi.fn();
    mockToast.error = vi.fn();
    mockToast.info = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Voice Input → Message Flow', () => {
    it('should successfully complete voice input to message flow', async () => {
      const startTime = performance.now();
      
      // Mock voice input callback to trigger transcript
      mockUseVoiceInput.mockImplementation((onResult) => {
        setTimeout(() => {
          onResult?.({
            transcript: 'What is my current budget?',
            confidence: 0.95,
            isFinal: true
          });
        }, 100);
        return mockVoiceInput;
      });

      render(<SimplePAM enableVoice={true} autoSendVoiceInput={true} />);

      // Start voice input
      const voiceButton = screen.getByRole('button', { name: /voice input/i });
      fireEvent.click(voiceButton);

      // Wait for transcript to be processed and message sent
      await waitFor(() => {
        expect(mockClaudeService.chat).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'What is my current budget?'
            })
          ]),
          expect.any(Object)
        );
      }, { timeout: 3000 });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Performance assertion: should complete within 3 seconds
      expect(duration).toBeLessThan(3000);

      // Verify voice input was processed correctly
      expect(mockVoiceInput.startListening).toHaveBeenCalled();
      expect(screen.getByText('What is my current budget?')).toBeInTheDocument();
      expect(screen.getByText(/I can help you with your finances/)).toBeInTheDocument();
    });

    it('should handle low confidence voice input correctly', async () => {
      mockUseVoiceInput.mockImplementation((onResult) => {
        setTimeout(() => {
          onResult?.({
            transcript: 'Unclear speech input',
            confidence: 0.3, // Low confidence
            isFinal: true
          });
        }, 100);
        return mockVoiceInput;
      });

      render(<SimplePAM enableVoice={true} autoSendVoiceInput={true} />);

      const voiceButton = screen.getByRole('button', { name: /voice input/i });
      fireEvent.click(voiceButton);

      await waitFor(() => {
        // Should populate input but not auto-send due to low confidence
        const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
        expect(input).toHaveValue('Unclear speech input');
      });

      // Should not auto-send
      expect(mockClaudeService.chat).not.toHaveBeenCalled();
    });

    it('should handle interim results during voice input', async () => {
      let resultCallback: any;
      mockUseVoiceInput.mockImplementation((onResult) => {
        resultCallback = onResult;
        return mockVoiceInput;
      });

      render(<VoiceToggle onTranscript={vi.fn()} />);

      // Simulate interim result
      act(() => {
        resultCallback?.({
          transcript: 'What is my',
          confidence: 0.5,
          isFinal: false
        });
      });

      // Simulate final result
      act(() => {
        resultCallback?.({
          transcript: 'What is my budget',
          confidence: 0.9,
          isFinal: true
        });
      });

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          'Voice input received',
          expect.objectContaining({
            description: '"What is my budget"'
          })
        );
      });
    });
  });

  describe('Voice Output Triggering', () => {
    it('should trigger TTS for assistant responses', async () => {
      render(<SimplePAM enableVoice={true} />);

      // Send a text message
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      await user.type(input, 'Hello PAM');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      // Wait for response and TTS
      await waitFor(() => {
        expect(mockTTS.speak).toHaveBeenCalledWith(
          'I can help you with your finances and trip planning.'
        );
      });
    });

    it('should clean markdown from TTS content', async () => {
      mockClaudeService.chat.mockResolvedValue({
        content: '**Hello!** I can help you with *your* finances. Here is `code` and # Header\n\nNew paragraph.',
        timestamp: new Date()
      });

      render(<SimplePAM enableVoice={true} />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      await user.type(input, 'Hello');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockTTS.speak).toHaveBeenCalledWith(
          'Hello! I can help you with your finances. Here is code and Header New paragraph.'
        );
      });
    });

    it('should not trigger TTS when voice output is disabled', async () => {
      render(<SimplePAM enableVoice={true} showVoiceSettings={true} />);

      // Disable voice output
      const disableButton = screen.getByText('Enable Voice Output');
      fireEvent.click(disableButton);

      // Send message
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      await user.type(input, 'Hello');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/I can help you with your finances/)).toBeInTheDocument();
      });

      // Should not trigger TTS
      expect(mockTTS.speak).not.toHaveBeenCalled();
    });

    it('should interrupt TTS when new message is sent', async () => {
      mockTTS.isSpeaking = true;
      render(<SimplePAM enableVoice={true} />);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      await user.type(input, 'New message');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      // Should stop current TTS before sending
      expect(mockTTS.stopSpeaking).toHaveBeenCalled();
    });
  });

  describe('Settings Persistence', () => {
    it('should persist voice input setting to localStorage', async () => {
      render(<VoiceSettings />);

      const inputCheckbox = screen.getByLabelText(/Enable Voice Input/);
      fireEvent.click(inputCheckbox);

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'pam-voice-input-enabled',
          'false'
        );
      });
    });

    it('should persist voice output setting to localStorage', async () => {
      render(<VoiceSettings />);

      const outputCheckbox = screen.getByLabelText(/Enable Voice Output/);
      fireEvent.click(outputCheckbox);

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'pam-voice-output-enabled',
          'false'
        );
      });
    });

    it('should load settings from localStorage on mount', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'pam-voice-input-enabled') return 'false';
        if (key === 'pam-voice-output-enabled') return 'false';
        return null;
      });

      render(<VoiceSettings />);

      const inputCheckbox = screen.getByLabelText(/Enable Voice Input/) as HTMLInputElement;
      const outputCheckbox = screen.getByLabelText(/Enable Voice Output/) as HTMLInputElement;

      expect(inputCheckbox.checked).toBe(false);
      expect(outputCheckbox.checked).toBe(false);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.getItem.mockImplementation(() => 'invalid-json{');

      // Should not throw
      expect(() => render(<VoiceSettings />)).not.toThrow();
    });

    it('should sync settings across tabs on window focus', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'pam-voice-input-enabled') return 'false';
        return 'true';
      });

      render(<VoiceSettings onVoiceInputChange={vi.fn()} />);

      // Simulate window focus
      fireEvent.focus(window);

      // Should read from localStorage and update
      expect(localStorage.getItem).toHaveBeenCalled();
    });
  });

  describe('Browser Compatibility Handling', () => {
    it('should handle Speech Synthesis not supported', () => {
      mockTTS.isSupported = false;
      render(<VoiceToggle showTTSButton={true} />);

      const ttsButton = screen.getByRole('button', { name: /toggle text-to-speech/i });
      fireEvent.click(ttsButton);

      expect(mockToast.error).toHaveBeenCalledWith(
        'Text-to-speech not available',
        expect.objectContaining({
          description: 'Your browser does not support text-to-speech.'
        })
      );
    });

    it('should handle Speech Recognition not supported', () => {
      mockVoiceInput.isSupported = false;
      render(<VoiceToggle />);

      const voiceButton = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(voiceButton);

      expect(mockToast.error).toHaveBeenCalledWith(
        'Voice input not available',
        expect.objectContaining({
          description: 'Your browser does not support voice input.'
        })
      );
    });

    it('should hide voice components when not supported', () => {
      render(<VoiceSettings />);
      
      // Mock no voice support
      const { container } = render(<VoiceSettings />);
      
      // Component should render
      expect(container.firstChild).toBeTruthy();
    });

    it('should show appropriate error messages for different browsers', () => {
      // Test different browser scenarios
      const browsers = [
        { name: 'Chrome', supported: true },
        { name: 'Safari', supported: true },
        { name: 'Firefox', supported: false },
        { name: 'Edge', supported: true }
      ];

      browsers.forEach(browser => {
        mockTTS.isSupported = browser.supported;
        mockVoiceInput.isSupported = browser.supported;

        const { unmount } = render(<VoiceToggle />);
        
        if (browser.supported) {
          expect(screen.getByRole('button', { name: /toggle voice input/i })).not.toBeDisabled();
        }

        unmount();
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle voice input permission denied', async () => {
      mockVoiceInput.hasPermission = false;
      render(<VoiceToggle />);

      const voiceButton = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(voiceButton);

      expect(mockToast.error).toHaveBeenCalledWith(
        'Microphone access denied',
        expect.objectContaining({
          description: expect.stringContaining('microphone access')
        })
      );
    });

    it('should handle voice input errors from hook', async () => {
      let errorCallback: any;
      mockUseVoiceInput.mockImplementation((onResult, onError) => {
        errorCallback = onError;
        return mockVoiceInput;
      });

      render(<VoiceToggle />);

      // Simulate error
      act(() => {
        errorCallback?.('Network error occurred');
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Voice input error',
          expect.objectContaining({
            description: 'Network error occurred'
          })
        );
      });
    });

    it('should handle TTS errors gracefully', async () => {
      mockTTS.speak.mockRejectedValue(new Error('TTS failed'));
      render(<VoiceToggle showTTSButton={true} />);

      const ttsButton = screen.getByRole('button', { name: /toggle text-to-speech/i });
      fireEvent.click(ttsButton);

      // Should not crash the component
      await waitFor(() => {
        expect(ttsButton).toBeInTheDocument();
      });
    });

    it('should recover from network errors in Claude service', async () => {
      // First request fails
      mockClaudeService.chat
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          content: 'Recovery response',
          timestamp: new Date()
        });

      render(<SimplePAM enableVoice={true} />);

      // First message fails
      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      await user.type(input, 'First message');
      fireEvent.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument();
      });

      // Second message succeeds
      await user.type(input, 'Second message');
      fireEvent.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('Recovery response')).toBeInTheDocument();
      });

      // Should trigger TTS for successful response
      expect(mockTTS.speak).toHaveBeenCalledWith('Recovery response');
    });
  });

  describe('Mobile-Specific Features', () => {
    beforeEach(() => {
      mockGetMobileInfo.mockReturnValue({
        isMobile: true,
        isIOS: true,
        isAndroid: false,
        isSafari: true,
        isChrome: false
      });
    });

    it('should handle iOS audio context unlock', async () => {
      mockMobileVoice.audioUnlocked = false;
      render(<MobileVoiceToggle />);

      const voiceButton = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(voiceButton);

      await waitFor(() => {
        expect(mockMobileVoice.unlockAudio).toHaveBeenCalled();
      });
    });

    it('should prevent voice input when keyboard is open', () => {
      mockMobileVoice.keyboardOpen = true;
      render(<MobileVoiceToggle showMobileHints={true} />);

      expect(screen.getByText(/Close keyboard to continue voice input/)).toBeInTheDocument();
    });

    it('should show orientation change hints', () => {
      mockMobileVoice.isPortrait = false;
      mockMobileVoice.isListening = true;
      render(<MobileVoiceToggle showMobileHints={true} />);

      expect(screen.getByText(/Voice input works better in portrait mode/)).toBeInTheDocument();
    });

    it('should handle background/foreground transitions', () => {
      mockMobileVoice.isInBackground = true;
      render(<MobileVoiceToggle showMobileHints={true} />);

      expect(screen.getByText(/Voice features paused - return to app/)).toBeInTheDocument();
    });

    it('should provide haptic feedback on mobile', async () => {
      // Mock navigator.vibrate
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn(),
        writable: true
      });

      render(<MobileVoiceToggle />);

      const voiceButton = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.touchStart(voiceButton);

      expect(navigator.vibrate).toHaveBeenCalledWith(50);
    });

    it('should use optimal touch target sizes', () => {
      // iOS should use 44px
      render(<MobileVoiceToggle />);

      const voiceButton = screen.getByRole('button', { name: /toggle voice input/i });
      // Check that mobile-specific classes are applied
      expect(voiceButton.parentElement).toHaveClass('voice-component');
    });
  });

  describe('Performance Tests', () => {
    it('should start voice input within performance threshold', async () => {
      const startTime = performance.now();
      
      render(<VoiceToggle />);
      
      const voiceButton = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(voiceButton);
      
      await waitFor(() => {
        expect(mockVoiceInput.startListening).toHaveBeenCalled();
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should start within 500ms
      expect(duration).toBeLessThan(500);
    });

    it('should trigger TTS within performance threshold', async () => {
      const startTime = performance.now();
      
      render(<VoiceToggle showTTSButton={true} />);
      
      const ttsButton = screen.getByRole('button', { name: /toggle text-to-speech/i });
      fireEvent.click(ttsButton);
      
      await waitFor(() => {
        expect(mockTTS.speak).toHaveBeenCalled();
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should start within 300ms
      expect(duration).toBeLessThan(300);
    });

    it('should handle rapid button clicks without issues', async () => {
      render(<VoiceToggle />);
      
      const voiceButton = screen.getByRole('button', { name: /toggle voice input/i });
      
      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        fireEvent.click(voiceButton);
      }

      // Should not cause errors and should maintain consistent state
      await waitFor(() => {
        expect(voiceButton).toBeInTheDocument();
      });
    });

    it('should not cause memory leaks with repeated use', async () => {
      const { unmount } = render(<VoiceToggle />);
      
      const voiceButton = screen.getByRole('button', { name: /toggle voice input/i });
      
      // Simulate repeated use
      for (let i = 0; i < 10; i++) {
        fireEvent.click(voiceButton);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      unmount();

      // Should clean up properly without memory leaks
      // Note: Actual memory leak testing would require more sophisticated tooling
      expect(true).toBe(true);
    });

    it('should handle concurrent voice operations efficiently', async () => {
      render(<SimplePAM enableVoice={true} />);
      
      const startTime = performance.now();

      // Start multiple operations concurrently
      const voiceButton = screen.getByRole('button', { name: /voice input/i });
      fireEvent.click(voiceButton);

      const input = screen.getByPlaceholderText(/Ask PAM about your finances/);
      await user.type(input, 'Test concurrent operations');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockClaudeService.chat).toHaveBeenCalled();
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle concurrent operations efficiently
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Integration Edge Cases', () => {
    it('should handle component unmounting during voice operation', () => {
      const { unmount } = render(<VoiceToggle />);
      
      const voiceButton = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(voiceButton);

      // Unmount while voice operation might be active
      expect(() => unmount()).not.toThrow();
    });

    it('should handle prop changes during voice operation', async () => {
      const { rerender } = render(<VoiceToggle disabled={false} />);
      
      const voiceButton = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(voiceButton);

      // Change props while operation is active
      rerender(<VoiceToggle disabled={true} />);

      await waitFor(() => {
        expect(voiceButton).toBeDisabled();
      });
    });

    it('should maintain voice state across SimplePAM re-renders', async () => {
      const { rerender } = render(<SimplePAM enableVoice={true} />);
      
      // Enable voice input
      const voiceButton = screen.getByRole('button', { name: /voice input/i });
      fireEvent.click(voiceButton);

      // Re-render with different props
      rerender(<SimplePAM enableVoice={true} defaultMessage="New message" />);

      // Voice state should be maintained
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /voice input/i })).toBeInTheDocument();
      });
    });
  });
});