import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceToggle } from './VoiceToggle';
import { toast } from 'sonner';

// Mock hooks
vi.mock('@/hooks/voice/useVoiceInput');
vi.mock('@/hooks/voice/useTextToSpeech');
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

// Import mocked hooks to access their implementations
import { useVoiceInput } from '@/hooks/voice/useVoiceInput';
import { useTextToSpeech } from '@/hooks/voice/useTextToSpeech';

const mockUseVoiceInput = useVoiceInput as Mock;
const mockUseTextToSpeech = useTextToSpeech as Mock;

describe('VoiceToggle', () => {
  let mockVoiceInput: any;
  let mockTTS: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useVoiceInput return value
    mockVoiceInput = {
      isSupported: true,
      isListening: false,
      isProcessing: false,
      hasPermission: true,
      startListening: vi.fn().mockResolvedValue(true),
      stopListening: vi.fn(),
      requestPermission: vi.fn().mockResolvedValue(true)
    };

    // Mock useTextToSpeech return value
    mockTTS = {
      isSupported: true,
      isSpeaking: false,
      speak: vi.fn(),
      stopSpeaking: vi.fn()
    };

    mockUseVoiceInput.mockReturnValue(mockVoiceInput);
    mockUseTextToSpeech.mockReturnValue(mockTTS);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render voice input button by default', () => {
      render(<VoiceToggle />);

      expect(screen.getByRole('button', { name: /toggle voice input/i })).toBeInTheDocument();
    });

    it('should render both buttons when showTTSButton is true', () => {
      render(<VoiceToggle showTTSButton={true} />);

      expect(screen.getByRole('button', { name: /toggle voice input/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle text-to-speech/i })).toBeInTheDocument();
    });

    it('should render only voice input button when showTTSButton is false', () => {
      render(<VoiceToggle showTTSButton={false} />);

      expect(screen.getByRole('button', { name: /toggle voice input/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /toggle text-to-speech/i })).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<VoiceToggle className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should use custom aria label', () => {
      render(<VoiceToggle ariaLabel="Custom voice label" />);

      expect(screen.getByRole('button', { name: /custom voice label/i })).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render with small size', () => {
      render(<VoiceToggle size="sm" />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      expect(button).toHaveClass('h-8', 'w-8');
    });

    it('should render with medium size (default)', () => {
      render(<VoiceToggle size="md" />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      expect(button).toHaveClass('h-10', 'w-10');
    });

    it('should render with large size', () => {
      render(<VoiceToggle size="lg" />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      expect(button).toHaveClass('h-12', 'w-12');
    });
  });

  describe('Voice Input Functionality', () => {
    it('should start listening when button is clicked', async () => {
      render(<VoiceToggle />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockVoiceInput.startListening).toHaveBeenCalled();
        expect(toast.info).toHaveBeenCalledWith('Listening...', {
          description: 'Speak now to input voice commands.',
          duration: 2000,
        });
      });
    });

    it('should stop listening when button is clicked while listening', async () => {
      mockVoiceInput.isListening = true;
      render(<VoiceToggle />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockVoiceInput.stopListening).toHaveBeenCalled();
        expect(toast.info).toHaveBeenCalledWith('Voice input stopped', {
          duration: 2000,
        });
      });
    });

    it('should show error when voice input is not supported', async () => {
      mockVoiceInput.isSupported = false;
      render(<VoiceToggle />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Voice input not available', {
          description: 'Your browser does not support voice input.',
          duration: 5000,
        });
      });
    });

    it('should show error when microphone permission is denied', async () => {
      mockVoiceInput.hasPermission = false;
      render(<VoiceToggle />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Microphone access denied', {
          description: 'Please enable microphone access in your browser settings.',
          duration: 7000,
        });
      });
    });

    it('should handle start listening failure', async () => {
      mockVoiceInput.startListening.mockResolvedValue(false);
      render(<VoiceToggle />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockVoiceInput.startListening).toHaveBeenCalled();
        expect(toast.info).not.toHaveBeenCalledWith('Listening...');
      });
    });

    it('should call onTranscript when voice result is received', async () => {
      const onTranscript = vi.fn();
      
      // Mock the hook to call the result callback immediately
      mockUseVoiceInput.mockImplementation((onResult) => {
        // Simulate calling the callback with a result
        setTimeout(() => {
          onResult({
            transcript: 'Hello world',
            confidence: 0.95,
            isFinal: true
          });
        }, 0);
        
        return mockVoiceInput;
      });

      render(<VoiceToggle onTranscript={onTranscript} />);

      await waitFor(() => {
        expect(onTranscript).toHaveBeenCalledWith('Hello world', 0.95);
        expect(toast.success).toHaveBeenCalledWith('Voice input received', {
          description: '"Hello world"',
          duration: 3000,
        });
      });
    });

    it('should call onVoiceCommand when voice result is received', async () => {
      const onVoiceCommand = vi.fn();
      
      mockUseVoiceInput.mockImplementation((onResult) => {
        setTimeout(() => {
          onResult({
            transcript: 'Test command',
            confidence: 0.9,
            isFinal: true
          });
        }, 0);
        
        return mockVoiceInput;
      });

      render(<VoiceToggle onVoiceCommand={onVoiceCommand} />);

      await waitFor(() => {
        expect(onVoiceCommand).toHaveBeenCalledWith('Test command');
      });
    });

    it('should truncate long transcripts in toast notifications', async () => {
      const longTranscript = 'A'.repeat(60);
      
      mockUseVoiceInput.mockImplementation((onResult) => {
        setTimeout(() => {
          onResult({
            transcript: longTranscript,
            confidence: 0.9,
            isFinal: true
          });
        }, 0);
        
        return mockVoiceInput;
      });

      render(<VoiceToggle />);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Voice input received', {
          description: `"${longTranscript.substring(0, 50)}..."`,
          duration: 3000,
        });
      });
    });
  });

  describe('Text-to-Speech Functionality', () => {
    it('should speak test phrase when TTS button is clicked', async () => {
      render(<VoiceToggle showTTSButton={true} />);

      const button = screen.getByRole('button', { name: /toggle text-to-speech/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockTTS.speak).toHaveBeenCalledWith('Voice system is ready.');
        expect(toast.success).toHaveBeenCalledWith('Text-to-speech enabled', {
          duration: 2000,
        });
      });
    });

    it('should stop speaking when TTS button is clicked while speaking', async () => {
      mockTTS.isSpeaking = true;
      render(<VoiceToggle showTTSButton={true} />);

      const button = screen.getByRole('button', { name: /toggle text-to-speech/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockTTS.stopSpeaking).toHaveBeenCalled();
        expect(toast.info).toHaveBeenCalledWith('Speech stopped', {
          duration: 2000,
        });
      });
    });

    it('should show error when TTS is not supported', async () => {
      mockTTS.isSupported = false;
      render(<VoiceToggle showTTSButton={true} />);

      const button = screen.getByRole('button', { name: /toggle text-to-speech/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Text-to-speech not available', {
          description: 'Your browser does not support text-to-speech.',
          duration: 5000,
        });
      });
    });
  });

  describe('Button States', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<VoiceToggle disabled={true} />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      expect(button).toBeDisabled();
    });

    it('should be disabled when voice input is not supported', () => {
      mockVoiceInput.isSupported = false;
      render(<VoiceToggle />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      expect(button).toBeDisabled();
    });

    it('should be disabled when microphone permission is denied', () => {
      mockVoiceInput.hasPermission = false;
      render(<VoiceToggle />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      expect(button).toBeDisabled();
    });

    it('should show active state when listening', () => {
      mockVoiceInput.isListening = true;
      render(<VoiceToggle />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(button).toHaveClass('animate-pulse');
    });

    it('should show processing state with spinner', () => {
      mockVoiceInput.isProcessing = true;
      render(<VoiceToggle />);

      expect(screen.getByRole('button')).toContainHTML('animate-spin');
    });

    it('should show active TTS state when speaking', () => {
      mockTTS.isSpeaking = true;
      render(<VoiceToggle showTTSButton={true} />);

      const button = screen.getByRole('button', { name: /toggle text-to-speech/i });
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Visual Feedback', () => {
    it('should show status indicator when listening', () => {
      mockVoiceInput.isListening = true;
      render(<VoiceToggle />);

      expect(screen.getByText('Listening...')).toBeInTheDocument();
    });

    it('should show status indicator when processing', () => {
      mockVoiceInput.isProcessing = true;
      render(<VoiceToggle />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should hide status text on small screens', () => {
      mockVoiceInput.isListening = true;
      render(<VoiceToggle />);

      const statusText = screen.getByText('Listening...');
      expect(statusText).toHaveClass('hidden', 'sm:inline');
    });

    it('should show visual indicator with pulsing border when active', () => {
      mockVoiceInput.isListening = true;
      render(<VoiceToggle />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      expect(button.querySelector('.animate-ping')).toBeInTheDocument();
    });
  });

  describe('Mouse and Touch Events', () => {
    it('should handle mouse press feedback', () => {
      render(<VoiceToggle />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      
      fireEvent.mouseDown(button);
      expect(button).toHaveClass('scale-95');

      fireEvent.mouseUp(button);
      expect(button).not.toHaveClass('scale-95');
    });

    it('should handle touch events', () => {
      render(<VoiceToggle />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      
      fireEvent.touchStart(button);
      expect(button).toHaveClass('scale-95');

      fireEvent.touchEnd(button);
      expect(button).not.toHaveClass('scale-95');
    });

    it('should reset press state on mouse leave', () => {
      render(<VoiceToggle />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      
      fireEvent.mouseDown(button);
      fireEvent.mouseLeave(button);
      
      expect(button).not.toHaveClass('scale-95');
    });
  });

  describe('Permission Handling', () => {
    it('should request permission on initialization', async () => {
      mockVoiceInput.hasPermission = null;
      render(<VoiceToggle />);

      await waitFor(() => {
        expect(mockVoiceInput.requestPermission).toHaveBeenCalled();
      });
    });

    it('should show error toast when permission is denied', async () => {
      mockVoiceInput.requestPermission.mockResolvedValue(false);
      mockVoiceInput.hasPermission = null;
      
      render(<VoiceToggle />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Microphone access required', {
          description: 'Please allow microphone access to use voice input.',
          duration: 7000,
        });
      });
    });

    it('should not request permission multiple times', async () => {
      mockVoiceInput.hasPermission = true;
      render(<VoiceToggle />);

      // Re-render to simulate component update
      render(<VoiceToggle />);

      expect(mockVoiceInput.requestPermission).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle voice toggle errors gracefully', async () => {
      const error = new Error('Network error');
      mockVoiceInput.startListening.mockRejectedValue(error);
      
      render(<VoiceToggle />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to toggle voice input', {
          description: 'Network error',
          duration: 5000,
        });
      });
    });

    it('should handle unknown errors', async () => {
      mockVoiceInput.startListening.mockRejectedValue('Unknown error');
      
      render(<VoiceToggle />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to toggle voice input', {
          description: 'Unknown error occurred.',
          duration: 5000,
        });
      });
    });

    it('should handle voice input errors from hook', async () => {
      mockUseVoiceInput.mockImplementation((onResult, onError) => {
        setTimeout(() => {
          onError('Speech recognition error');
        }, 0);
        
        return mockVoiceInput;
      });

      render(<VoiceToggle />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Voice input error', {
          description: 'Speech recognition error',
          duration: 5000,
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      mockVoiceInput.isListening = true;
      render(<VoiceToggle />);

      const button = screen.getByRole('button', { name: /toggle voice input/i });
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(button).toHaveAttribute('title', 'Stop voice input');
    });

    it('should have proper title attributes for different states', () => {
      // Test disabled state
      mockVoiceInput.isSupported = false;
      const { rerender } = render(<VoiceToggle />);
      
      let button = screen.getByRole('button', { name: /toggle voice input/i });
      expect(button).toHaveAttribute('title', 'Voice input not available');

      // Test active state
      mockVoiceInput.isSupported = true;
      mockVoiceInput.isListening = true;
      rerender(<VoiceToggle />);
      
      button = screen.getByRole('button', { name: /toggle voice input/i });
      expect(button).toHaveAttribute('title', 'Stop voice input');

      // Test ready state
      mockVoiceInput.isListening = false;
      rerender(<VoiceToggle />);
      
      button = screen.getByRole('button', { name: /toggle voice input/i });
      expect(button).toHaveAttribute('title', 'Start voice input');
    });
  });
});