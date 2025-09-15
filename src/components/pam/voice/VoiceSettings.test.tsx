import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceSettings } from './VoiceSettings';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

describe('VoiceSettings', () => {
  let mockNavigator: any;

  beforeEach(() => {
    // Reset localStorage mock
    mockLocalStorage.clear();
    vi.clearAllMocks();
    
    // Mock global localStorage
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    // Mock window with both speech APIs available by default
    global.window = {
      SpeechRecognition: vi.fn(),
      webkitSpeechRecognition: vi.fn(),
      speechSynthesis: {},
      SpeechSynthesisUtterance: vi.fn()
    } as any;

    // Mock navigator
    mockNavigator = {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
        })
      }
    };

    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Capability Detection', () => {
    it('should render both checkboxes when both features are supported', () => {
      render(<VoiceSettings />);

      expect(screen.getByLabelText(/Enable Voice Input/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Enable Voice Output/i)).toBeInTheDocument();
    });

    it('should render only voice output when speech recognition is not supported', () => {
      // Remove speech recognition support
      global.window = {
        speechSynthesis: {},
        SpeechSynthesisUtterance: vi.fn()
      } as any;

      render(<VoiceSettings />);

      expect(screen.queryByLabelText(/Enable Voice Input/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Enable Voice Output/i)).toBeInTheDocument();
    });

    it('should render only voice input when speech synthesis is not supported', () => {
      // Remove speech synthesis support
      global.window = {
        SpeechRecognition: vi.fn(),
        webkitSpeechRecognition: vi.fn()
      } as any;

      render(<VoiceSettings />);

      expect(screen.getByLabelText(/Enable Voice Input/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Enable Voice Output/i)).not.toBeInTheDocument();
    });

    it('should not render anything when no voice features are supported', () => {
      // Remove all voice support
      global.window = {} as any;

      const { container } = render(<VoiceSettings />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Initial State', () => {
    it('should initialize with default values when localStorage is empty', () => {
      render(<VoiceSettings />);

      const voiceInputCheckbox = screen.getByLabelText(/Enable Voice Input/i) as HTMLInputElement;
      const voiceOutputCheckbox = screen.getByLabelText(/Enable Voice Output/i) as HTMLInputElement;

      // Should default to true when features are supported
      expect(voiceInputCheckbox.checked).toBe(true);
      expect(voiceOutputCheckbox.checked).toBe(true);
    });

    it('should initialize with stored values from localStorage', () => {
      // Set some stored values
      mockLocalStorage.setItem('pam-voice-input-enabled', 'false');
      mockLocalStorage.setItem('pam-voice-output-enabled', 'false');

      render(<VoiceSettings />);

      const voiceInputCheckbox = screen.getByLabelText(/Enable Voice Input/i) as HTMLInputElement;
      const voiceOutputCheckbox = screen.getByLabelText(/Enable Voice Output/i) as HTMLInputElement;

      expect(voiceInputCheckbox.checked).toBe(false);
      expect(voiceOutputCheckbox.checked).toBe(false);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Set corrupted data
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'pam-voice-input-enabled') return 'invalid-json';
        return null;
      });

      // Should not throw and should use fallback
      expect(() => render(<VoiceSettings />)).not.toThrow();

      const voiceInputCheckbox = screen.getByLabelText(/Enable Voice Input/i) as HTMLInputElement;
      expect(voiceInputCheckbox.checked).toBe(true); // Should use fallback
    });
  });

  describe('User Interactions', () => {
    it('should toggle voice input setting when checkbox is clicked', async () => {
      const onVoiceInputChange = vi.fn();
      render(<VoiceSettings onVoiceInputChange={onVoiceInputChange} />);

      const voiceInputCheckbox = screen.getByLabelText(/Enable Voice Input/i);

      fireEvent.click(voiceInputCheckbox);

      await waitFor(() => {
        expect(onVoiceInputChange).toHaveBeenCalledWith(false);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('pam-voice-input-enabled', 'false');
      });
    });

    it('should toggle voice output setting when checkbox is clicked', async () => {
      const onVoiceOutputChange = vi.fn();
      render(<VoiceSettings onVoiceOutputChange={onVoiceOutputChange} />);

      const voiceOutputCheckbox = screen.getByLabelText(/Enable Voice Output/i);

      fireEvent.click(voiceOutputCheckbox);

      await waitFor(() => {
        expect(onVoiceOutputChange).toHaveBeenCalledWith(false);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('pam-voice-output-enabled', 'false');
      });
    });

    it('should toggle settings multiple times correctly', async () => {
      const onVoiceInputChange = vi.fn();
      render(<VoiceSettings onVoiceInputChange={onVoiceInputChange} />);

      const voiceInputCheckbox = screen.getByLabelText(/Enable Voice Input/i);

      // First toggle (true -> false)
      fireEvent.click(voiceInputCheckbox);
      await waitFor(() => {
        expect(onVoiceInputChange).toHaveBeenNthCalledWith(1, false);
      });

      // Second toggle (false -> true)
      fireEvent.click(voiceInputCheckbox);
      await waitFor(() => {
        expect(onVoiceInputChange).toHaveBeenNthCalledWith(2, true);
      });

      expect(onVoiceInputChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should save settings to localStorage', async () => {
      render(<VoiceSettings />);

      const voiceInputCheckbox = screen.getByLabelText(/Enable Voice Input/i);
      fireEvent.click(voiceInputCheckbox);

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('pam-voice-input-enabled', 'false');
      });
    });

    it('should handle localStorage write errors gracefully', async () => {
      // Mock setItem to throw an error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage is full');
      });

      // Should not throw error in component
      expect(() => {
        render(<VoiceSettings />);
        const voiceInputCheckbox = screen.getByLabelText(/Enable Voice Input/i);
        fireEvent.click(voiceInputCheckbox);
      }).not.toThrow();
    });

    it('should handle localStorage read errors gracefully', () => {
      // Mock getItem to throw an error
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });

      // Should not throw and should use fallback values
      expect(() => render(<VoiceSettings />)).not.toThrow();

      const voiceInputCheckbox = screen.getByLabelText(/Enable Voice Input/i) as HTMLInputElement;
      expect(voiceInputCheckbox.checked).toBe(true); // Should use fallback
    });
  });

  describe('Window Focus Synchronization', () => {
    it('should sync settings when window gains focus', async () => {
      const onVoiceInputChange = vi.fn();
      render(<VoiceSettings onVoiceInputChange={onVoiceInputChange} />);

      // Simulate external change in localStorage
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'pam-voice-input-enabled') return 'false';
        if (key === 'pam-voice-output-enabled') return 'true';
        return null;
      });

      // Trigger window focus event
      fireEvent.focus(window);

      await waitFor(() => {
        expect(onVoiceInputChange).toHaveBeenCalledWith(false);
      });
    });

    it('should not trigger callbacks if settings have not changed', () => {
      const onVoiceInputChange = vi.fn();
      const onVoiceOutputChange = vi.fn();
      render(<VoiceSettings onVoiceInputChange={onVoiceInputChange} onVoiceOutputChange={onVoiceOutputChange} />);

      // Clear any initial calls
      vi.clearAllMocks();

      // Trigger focus without changing values
      fireEvent.focus(window);

      expect(onVoiceInputChange).not.toHaveBeenCalled();
      expect(onVoiceOutputChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(<VoiceSettings />);

      const voiceInputCheckbox = screen.getByLabelText(/Enable Voice Input/i);
      const voiceOutputCheckbox = screen.getByLabelText(/Enable Voice Output/i);

      expect(voiceInputCheckbox).toHaveAttribute('aria-describedby', 'voice-input-description');
      expect(voiceOutputCheckbox).toHaveAttribute('aria-describedby', 'voice-output-description');

      // Check that descriptions exist
      expect(screen.getByText(/Toggle voice input to speak commands/i)).toBeInTheDocument();
      expect(screen.getByText(/Toggle voice output to hear PAM's responses/i)).toBeInTheDocument();
    });

    it('should have proper form associations', () => {
      render(<VoiceSettings />);

      const voiceInputLabel = screen.getByText(/Enable Voice Input/i);
      const voiceOutputLabel = screen.getByText(/Enable Voice Output/i);

      expect(voiceInputLabel).toHaveAttribute('for', 'voice-input-enabled');
      expect(voiceOutputLabel).toHaveAttribute('for', 'voice-output-enabled');
    });

    it('should support keyboard navigation', () => {
      render(<VoiceSettings />);

      const voiceInputCheckbox = screen.getByLabelText(/Enable Voice Input/i);
      
      voiceInputCheckbox.focus();
      expect(document.activeElement).toBe(voiceInputCheckbox);

      // Should be toggleable with space key
      fireEvent.keyDown(voiceInputCheckbox, { key: ' ', code: 'Space' });
      fireEvent.keyUp(voiceInputCheckbox, { key: ' ', code: 'Space' });
    });
  });

  describe('Visual Design', () => {
    it('should apply custom className', () => {
      const { container } = render(<VoiceSettings className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should render with proper default styling', () => {
      render(<VoiceSettings />);

      const container = screen.getByRole('group', { hidden: true })?.parentElement;
      expect(container).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('should display icons with checkboxes', () => {
      render(<VoiceSettings />);

      // Check that icons are rendered (by checking for specific text in labels)
      expect(screen.getByText(/Enable Voice Input/i)).toBeInTheDocument();
      expect(screen.getByText(/Enable Voice Output/i)).toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    it('should cleanup event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(<VoiceSettings />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function));
    });

    it('should not cause memory leaks with multiple mounts/unmounts', () => {
      const { unmount, rerender } = render(<VoiceSettings />);
      unmount();

      // Rerender should work without issues
      expect(() => rerender(<VoiceSettings />)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should work in SSR environment (no window)', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      // Should not throw
      expect(() => render(<VoiceSettings />)).not.toThrow();

      global.window = originalWindow;
    });

    it('should handle rapid toggle clicks', async () => {
      const onVoiceInputChange = vi.fn();
      render(<VoiceSettings onVoiceInputChange={onVoiceInputChange} />);

      const voiceInputCheckbox = screen.getByLabelText(/Enable Voice Input/i);

      // Rapid clicks
      fireEvent.click(voiceInputCheckbox);
      fireEvent.click(voiceInputCheckbox);
      fireEvent.click(voiceInputCheckbox);

      await waitFor(() => {
        expect(onVoiceInputChange).toHaveBeenCalledTimes(3);
      });

      expect(onVoiceInputChange).toHaveBeenNthCalledWith(1, false);
      expect(onVoiceInputChange).toHaveBeenNthCalledWith(2, true);
      expect(onVoiceInputChange).toHaveBeenNthCalledWith(3, false);
    });
  });
});