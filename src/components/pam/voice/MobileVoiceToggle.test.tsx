import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileVoiceToggle } from './MobileVoiceToggle';

// Mock mobile detection and voice hooks
vi.mock('@/lib/mobile');
vi.mock('@/hooks/voice/useMobileVoice');
vi.mock('sonner');

import { getMobileInfo, getOptimalTouchTargetSize, getMobileCSSClasses } from '@/lib/mobile';
import { useMobileVoice } from '@/hooks/voice/useMobileVoice';
import { toast } from 'sonner';

const mockGetMobileInfo = getMobileInfo as Mock;
const mockGetOptimalTouchTargetSize = getOptimalTouchTargetSize as Mock;
const mockGetMobileCSSClasses = getMobileCSSClasses as Mock;
const mockUseMobileVoice = useMobileVoice as Mock;
const mockToast = toast as any;

describe('MobileVoiceToggle', () => {
  let mockMobileVoice: any;
  let user: any;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();

    // Mock mobile info
    mockGetMobileInfo.mockReturnValue({
      isMobile: true,
      isIOS: false,
      isAndroid: true,
      isSafari: false,
      isChrome: true,
      isWebView: false
    });

    mockGetOptimalTouchTargetSize.mockReturnValue(48);
    mockGetMobileCSSClasses.mockReturnValue(['is-mobile', 'is-android', 'is-chrome']);

    // Mock mobile voice hook
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
      isProcessing: false,
      isSpeaking: false,
      keyboardOpen: false,
      isInBackground: false,
      isPortrait: true,
      audioUnlocked: true,
      canListen: true,
      speak: vi.fn(),
      stopSpeaking: vi.fn(),
      startListening: vi.fn().mockResolvedValue(true),
      stopListening: vi.fn(),
      unlockAudio: vi.fn().mockResolvedValue(true)
    };

    mockUseMobileVoice.mockReturnValue(mockMobileVoice);

    // Mock toast
    mockToast.success = vi.fn();
    mockToast.error = vi.fn();

    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Mobile Device Detection', () => {
    it('should apply mobile-specific classes', () => {
      render(<MobileVoiceToggle />);
      
      const container = screen.getByRole('button', { name: /toggle voice input/i }).parentElement;
      expect(container).toHaveClass('voice-component', 'is-mobile', 'is-android', 'is-chrome');
    });

    it('should use optimal touch target size for Android', () => {
      render(<MobileVoiceToggle />);
      
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      expect(button).toHaveStyle({ height: '48px', width: '48px' });
    });

    it('should use iOS-specific touch target size', () => {
      mockGetMobileInfo.mockReturnValue({
        isMobile: true,
        isIOS: true,
        isAndroid: false,
        isSafari: true,
        isChrome: false
      });
      
      mockGetOptimalTouchTargetSize.mockReturnValue(44);
      
      render(<MobileVoiceToggle />);
      
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      expect(button).toHaveStyle({ height: '44px', width: '44px' });
    });
  });

  describe('Touch Interactions', () => {
    it('should provide haptic feedback on touch', async () => {
      render(<MobileVoiceToggle />);
      
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.touchStart(button);
      
      expect(navigator.vibrate).toHaveBeenCalledWith(50);
    });

    it('should show visual press feedback', async () => {
      render(<MobileVoiceToggle />);
      
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      
      fireEvent.touchStart(button);
      expect(button).toHaveClass('scale-95');
      
      fireEvent.touchEnd(button);
      expect(button).not.toHaveClass('scale-95');
    });

    it('should handle mouse events for desktop testing', async () => {
      render(<MobileVoiceToggle />);
      
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      
      fireEvent.mouseDown(button);
      expect(button).toHaveClass('scale-95');
      
      fireEvent.mouseUp(button);
      expect(button).not.toHaveClass('scale-95');
    });
  });

  describe('iOS-Specific Behavior', () => {
    beforeEach(() => {
      mockGetMobileInfo.mockReturnValue({
        isMobile: true,
        isIOS: true,
        isAndroid: false,
        isSafari: true,
        isChrome: false
      });
      
      mockMobileVoice.mobileInfo = {
        isIOS: true,
        isSafari: true,
        isMobile: true
      };
    });

    it('should unlock audio context before voice operations', async () => {
      mockMobileVoice.audioUnlocked = false;
      render(<MobileVoiceToggle />);
      
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockMobileVoice.unlockAudio).toHaveBeenCalled();
      });
    });

    it('should show iOS-specific permission message', async () => {
      mockMobileVoice.canListen = false;
      render(<MobileVoiceToggle />);
      
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/Allow microphone access to use voice input/)).toBeInTheDocument();
        expect(screen.getByText(/This will open Safari settings/)).toBeInTheDocument();
      });
    });

    it('should handle audio unlock for TTS', async () => {
      mockMobileVoice.audioUnlocked = false;
      render(<MobileVoiceToggle showTTSButton={true} />);
      
      const ttsButton = screen.getByRole('button', { name: /toggle text-to-speech/i });
      fireEvent.click(ttsButton);
      
      await waitFor(() => {
        expect(mockMobileVoice.unlockAudio).toHaveBeenCalled();
      });
    });
  });

  describe('Keyboard Interaction Handling', () => {
    it('should show keyboard warning when keyboard is open', () => {
      mockMobileVoice.keyboardOpen = true;
      mockMobileVoice.isListening = true;
      
      render(<MobileVoiceToggle showMobileHints={true} />);
      
      expect(screen.getByText(/Close keyboard to continue voice input/)).toBeInTheDocument();
    });

    it('should prevent voice input when keyboard is open', async () => {
      mockMobileVoice.keyboardOpen = true;
      render(<MobileVoiceToggle />);
      
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/Close keyboard to use voice input/)).toBeInTheDocument();
        expect(mockMobileVoice.startListening).not.toHaveBeenCalled();
      });
    });
  });

  describe('Orientation Changes', () => {
    it('should show landscape mode hint', () => {
      mockMobileVoice.isPortrait = false;
      mockMobileVoice.isListening = true;
      
      render(<MobileVoiceToggle showMobileHints={true} />);
      
      expect(screen.getByText(/Voice input works better in portrait mode/)).toBeInTheDocument();
    });

    it('should not show hint in portrait mode', () => {
      mockMobileVoice.isPortrait = true;
      mockMobileVoice.isListening = true;
      
      render(<MobileVoiceToggle showMobileHints={true} />);
      
      expect(screen.queryByText(/Voice input works better in portrait mode/)).not.toBeInTheDocument();
    });
  });

  describe('Background/Foreground Handling', () => {
    it('should show background warning', () => {
      mockMobileVoice.isInBackground = true;
      
      render(<MobileVoiceToggle showMobileHints={true} />);
      
      expect(screen.getByText(/Voice features paused - return to app/)).toBeInTheDocument();
    });

    it('should not show warning when app is active', () => {
      mockMobileVoice.isInBackground = false;
      
      render(<MobileVoiceToggle showMobileHints={true} />);
      
      expect(screen.queryByText(/Voice features paused - return to app/)).not.toBeInTheDocument();
    });
  });

  describe('Voice Input Functionality', () => {
    it('should start voice input successfully', async () => {
      render(<MobileVoiceToggle />);
      
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockMobileVoice.startListening).toHaveBeenCalled();
      });
    });

    it('should stop voice input when already listening', async () => {
      mockMobileVoice.isListening = true;
      render(<MobileVoiceToggle />);
      
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockMobileVoice.stopListening).toHaveBeenCalled();
      });
    });

    it('should handle voice input errors gracefully', async () => {
      mockMobileVoice.startListening.mockRejectedValue(new Error('Permission denied'));
      render(<MobileVoiceToggle />);
      
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/Voice input error occurred/)).toBeInTheDocument();
      });
    });

    it('should call onTranscript when voice result received', async () => {
      const onTranscript = vi.fn();
      
      // Mock the hook to immediately call the callback
      mockUseMobileVoice.mockImplementation((options, onResult) => {
        setTimeout(() => {
          onResult({
            transcript: 'Test transcript',
            confidence: 0.9,
            isFinal: true
          });
        }, 0);
        return mockMobileVoice;
      });
      
      render(<MobileVoiceToggle onTranscript={onTranscript} />);
      
      await waitFor(() => {
        expect(onTranscript).toHaveBeenCalledWith('Test transcript', 0.9);
      });
    });
  });

  describe('Text-to-Speech Functionality', () => {
    it('should render TTS button when enabled', () => {
      render(<MobileVoiceToggle showTTSButton={true} />);
      
      expect(screen.getByRole('button', { name: /toggle text-to-speech/i })).toBeInTheDocument();
    });

    it('should not render TTS button when disabled', () => {
      render(<MobileVoiceToggle showTTSButton={false} />);
      
      expect(screen.queryByRole('button', { name: /toggle text-to-speech/i })).not.toBeInTheDocument();
    });

    it('should test TTS when button clicked', async () => {
      render(<MobileVoiceToggle showTTSButton={true} />);
      
      const ttsButton = screen.getByRole('button', { name: /toggle text-to-speech/i });
      fireEvent.click(ttsButton);
      
      await waitFor(() => {
        expect(mockMobileVoice.speak).toHaveBeenCalledWith('Voice system is ready.');
      });
    });

    it('should stop TTS when already speaking', async () => {
      mockMobileVoice.isSpeaking = true;
      render(<MobileVoiceToggle showTTSButton={true} />);
      
      const ttsButton = screen.getByRole('button', { name: /toggle text-to-speech/i });
      fireEvent.click(ttsButton);
      
      await waitFor(() => {
        expect(mockMobileVoice.stopSpeaking).toHaveBeenCalled();
      });
    });

    it('should handle TTS not supported', async () => {
      mockMobileVoice.ttsSupported = false;
      render(<MobileVoiceToggle showTTSButton={true} />);
      
      const ttsButton = screen.getByRole('button', { name: /toggle text-to-speech/i });
      expect(ttsButton).toBeDisabled();
      
      fireEvent.click(ttsButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Text-to-speech not available/)).toBeInTheDocument();
      });
    });
  });

  describe('Visual Feedback', () => {
    it('should show listening animation when active', () => {
      mockMobileVoice.isListening = true;
      render(<MobileVoiceToggle />);
      
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      expect(button).toHaveClass('voice-listening-mobile');
    });

    it('should show speaking animation when TTS active', () => {
      mockMobileVoice.isSpeaking = true;
      render(<MobileVoiceToggle />);
      
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      expect(button).toHaveClass('voice-speaking-mobile');
    });

    it('should show processing spinner', () => {
      mockMobileVoice.isProcessing = true;
      render(<MobileVoiceToggle />);
      
      expect(screen.getByRole('button', { name: /toggle voice input/i }).querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should hide visual feedback when disabled', () => {
      render(<MobileVoiceToggle enableVisualFeedback={false} />);
      
      // Trigger a status message
      mockMobileVoice.isSupported = false;
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);
      
      // Status message should not appear
      expect(screen.queryByText(/Voice input not available/)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MobileVoiceToggle />);
      
      const voiceButton = screen.getByRole('button', { name: /toggle voice input/i });
      expect(voiceButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should update ARIA pressed state when listening', () => {
      mockMobileVoice.isListening = true;
      render(<MobileVoiceToggle />);
      
      const voiceButton = screen.getByRole('button', { name: /toggle voice input/i });
      expect(voiceButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have appropriate title attributes', () => {
      render(<MobileVoiceToggle />);
      
      const voiceButton = screen.getByRole('button', { name: /toggle voice input/i });
      expect(voiceButton).toHaveAttribute('title', 'Start voice input');
    });

    it('should show keyboard-specific title when keyboard open', () => {
      mockMobileVoice.keyboardOpen = true;
      render(<MobileVoiceToggle />);
      
      const voiceButton = screen.getByRole('button', { name: /toggle voice input/i });
      expect(voiceButton).toHaveAttribute('title', 'Close keyboard to use voice');
    });

    it('should support custom aria label', () => {
      render(<MobileVoiceToggle ariaLabel="Custom voice label" />);
      
      expect(screen.getByRole('button', { name: /custom voice label/i })).toBeInTheDocument();
    });
  });

  describe('Permission Handling', () => {
    it('should show permission prompt when needed', async () => {
      mockMobileVoice.canListen = false;
      render(<MobileVoiceToggle />);
      
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Enable Voice Input')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /enable/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });

    it('should handle permission grant', async () => {
      mockMobileVoice.canListen = false;
      render(<MobileVoiceToggle />);
      
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Enable Voice Input')).toBeInTheDocument();
      });
      
      const enableButton = screen.getByRole('button', { name: /enable/i });
      fireEvent.click(enableButton);
      
      await waitFor(() => {
        expect(mockMobileVoice.startListening).toHaveBeenCalled();
        expect(screen.queryByText('Enable Voice Input')).not.toBeInTheDocument();
      });
    });

    it('should handle permission denial', async () => {
      mockMobileVoice.canListen = false;
      render(<MobileVoiceToggle />);
      
      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Enable Voice Input')).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Enable Voice Input')).not.toBeInTheDocument();
      });
    });
  });
});