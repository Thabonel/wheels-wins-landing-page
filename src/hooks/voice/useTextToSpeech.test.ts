import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { useTextToSpeech } from './useTextToSpeech';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

// Speech Synthesis API Mock
interface MockSpeechSynthesis {
  speak: Mock;
  cancel: Mock;
  pause: Mock;
  resume: Mock;
  getVoices: Mock;
  speaking: boolean;
  pending: boolean;
  paused: boolean;
  onvoiceschanged: (() => void) | null;
}

interface MockSpeechSynthesisUtterance {
  text: string;
  rate: number;
  pitch: number;
  volume: number;
  lang: string;
  voice: SpeechSynthesisVoice | null;
  onstart: ((event: SpeechSynthesisEvent) => void) | null;
  onend: ((event: SpeechSynthesisEvent) => void) | null;
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null;
  onpause: ((event: SpeechSynthesisEvent) => void) | null;
  onresume: ((event: SpeechSynthesisEvent) => void) | null;
}

class MockSpeechSynthesisUtteranceClass implements MockSpeechSynthesisUtterance {
  text: string;
  rate: number = 1;
  pitch: number = 1;
  volume: number = 1;
  lang: string = 'en-US';
  voice: SpeechSynthesisVoice | null = null;
  onstart: ((event: SpeechSynthesisEvent) => void) | null = null;
  onend: ((event: SpeechSynthesisEvent) => void) | null = null;
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;
  onpause: ((event: SpeechSynthesisEvent) => void) | null = null;
  onresume: ((event: SpeechSynthesisEvent) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

describe('useTextToSpeech', () => {
  let mockSpeechSynthesis: MockSpeechSynthesis;
  let mockVoices: SpeechSynthesisVoice[];
  let currentUtterance: MockSpeechSynthesisUtterance | null = null;

  beforeEach(() => {
    // Create mock voices
    mockVoices = [
      {
        name: 'English (US) - Female',
        lang: 'en-US',
        default: true,
        localService: true,
        voiceURI: 'en-US-female'
      } as SpeechSynthesisVoice,
      {
        name: 'English (UK) - Male',
        lang: 'en-GB', 
        default: false,
        localService: true,
        voiceURI: 'en-GB-male'
      } as SpeechSynthesisVoice,
      {
        name: 'Spanish (ES) - Female',
        lang: 'es-ES',
        default: false,
        localService: true,
        voiceURI: 'es-ES-female'
      } as SpeechSynthesisVoice
    ];

    // Mock Speech Synthesis API
    mockSpeechSynthesis = {
      speak: vi.fn((utterance: MockSpeechSynthesisUtterance) => {
        currentUtterance = utterance;
        mockSpeechSynthesis.speaking = true;
        mockSpeechSynthesis.pending = false;
        
        // Simulate async speech start
        setTimeout(() => {
          if (utterance.onstart) {
            utterance.onstart(new Event('start') as SpeechSynthesisEvent);
          }
        }, 10);
      }),
      cancel: vi.fn(() => {
        mockSpeechSynthesis.speaking = false;
        mockSpeechSynthesis.pending = false;
        mockSpeechSynthesis.paused = false;
        
        if (currentUtterance?.onend) {
          currentUtterance.onend(new Event('end') as SpeechSynthesisEvent);
        }
        currentUtterance = null;
      }),
      pause: vi.fn(() => {
        if (mockSpeechSynthesis.speaking) {
          mockSpeechSynthesis.paused = true;
          if (currentUtterance?.onpause) {
            currentUtterance.onpause(new Event('pause') as SpeechSynthesisEvent);
          }
        }
      }),
      resume: vi.fn(() => {
        if (mockSpeechSynthesis.paused) {
          mockSpeechSynthesis.paused = false;
          if (currentUtterance?.onresume) {
            currentUtterance.onresume(new Event('resume') as SpeechSynthesisEvent);
          }
        }
      }),
      getVoices: vi.fn(() => mockVoices),
      speaking: false,
      pending: false,
      paused: false,
      onvoiceschanged: null
    };

    // Mock global objects
    Object.defineProperty(global, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      writable: true
    });

    Object.defineProperty(global, 'SpeechSynthesisUtterance', {
      value: MockSpeechSynthesisUtteranceClass,
      writable: true
    });

    // Reset current utterance
    currentUtterance = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
    currentUtterance = null;
  });

  describe('Initialization', () => {
    it('should initialize with supported state when Speech Synthesis is available', () => {
      const { result } = renderHook(() => useTextToSpeech());

      expect(result.current.isSupported).toBe(true);
      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.currentText).toBe(null);
      expect(result.current.queueLength).toBe(0);
    });

    it('should initialize with unsupported state when Speech Synthesis is not available', () => {
      // Remove Speech Synthesis API
      delete (global as any).speechSynthesis;
      delete (global as any).SpeechSynthesisUtterance;

      const { result } = renderHook(() => useTextToSpeech());

      expect(result.current.isSupported).toBe(false);
    });

    it('should load available voices on initialization', async () => {
      const { result } = renderHook(() => useTextToSpeech());

      await act(async () => {
        // Trigger voices loaded
        if (mockSpeechSynthesis.onvoiceschanged) {
          mockSpeechSynthesis.onvoiceschanged();
        }
      });

      expect(result.current.availableVoices).toHaveLength(3);
      expect(result.current.selectedVoice).toEqual(mockVoices[0]); // Default voice
    });

    it('should accept initial options', () => {
      const initialOptions = {
        rate: 1.5,
        pitch: 0.8,
        volume: 0.9,
        lang: 'es-ES'
      };

      const { result } = renderHook(() => useTextToSpeech(initialOptions));

      expect(result.current.currentOptions.rate).toBe(1.5);
      expect(result.current.currentOptions.pitch).toBe(0.8);
      expect(result.current.currentOptions.volume).toBe(0.9);
      expect(result.current.currentOptions.lang).toBe('es-ES');
    });
  });

  describe('Speaking functionality', () => {
    it('should speak text successfully', async () => {
      const { result } = renderHook(() => useTextToSpeech());

      await act(async () => {
        result.current.speak('Hello, world!');
      });

      expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);
      expect(currentUtterance?.text).toBe('Hello, world!');
      
      // Wait for async speech start
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      expect(result.current.isSpeaking).toBe(true);
      expect(result.current.currentText).toBe('Hello, world!');
    });

    it('should not speak when not supported', () => {
      delete (global as any).speechSynthesis;
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Hello, world!');
      });

      expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
    });

    it('should not speak empty text', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('');
      });

      expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();

      act(() => {
        result.current.speak('   ');
      });

      expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
    });

    it('should truncate long text', async () => {
      const longText = 'A'.repeat(300); // Exceeds MAX_TEXT_LENGTH
      const { result } = renderHook(() => useTextToSpeech());

      await act(async () => {
        result.current.speak(longText);
      });

      expect(currentUtterance?.text).toBeDefined();
      expect(currentUtterance!.text.length).toBeLessThan(longText.length);
      expect(currentUtterance!.text).toMatch(/\.\.\.$/); // Should end with ellipsis
    });

    it('should apply speech options correctly', async () => {
      const { result } = renderHook(() => useTextToSpeech());

      await act(async () => {
        result.current.speak('Test text', {
          rate: 1.5,
          pitch: 0.8,
          volume: 0.6,
          lang: 'en-GB'
        });
      });

      expect(currentUtterance?.rate).toBe(1.5);
      expect(currentUtterance?.pitch).toBe(0.8);
      expect(currentUtterance?.volume).toBe(0.6);
      expect(currentUtterance?.lang).toBe('en-GB');
    });

    it('should clamp speech options to valid ranges', async () => {
      const { result } = renderHook(() => useTextToSpeech());

      await act(async () => {
        result.current.speak('Test text', {
          rate: 15, // Above max
          pitch: -1, // Below min
          volume: 2 // Above max
        });
      });

      expect(currentUtterance?.rate).toBe(10); // Clamped to max
      expect(currentUtterance?.pitch).toBe(0); // Clamped to min
      expect(currentUtterance?.volume).toBe(1); // Clamped to max
    });
  });

  describe('Queue management', () => {
    it('should queue multiple speak requests', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('First text');
        result.current.speak('Second text');
        result.current.speak('Third text');
      });

      expect(result.current.queueLength).toBe(2); // First is currently speaking
      expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1); // Only first started
    });

    it('should process queue sequentially', async () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('First text');
        result.current.speak('Second text');
      });

      // First speech should be speaking
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      expect(result.current.currentText).toBe('First text');
      expect(result.current.queueLength).toBe(1);

      // Complete first speech
      await act(async () => {
        if (currentUtterance?.onend) {
          currentUtterance.onend(new Event('end') as SpeechSynthesisEvent);
        }
        await new Promise(resolve => setTimeout(resolve, 120)); // Wait for queue processing
      });

      expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(2);
    });

    it('should clear queue without stopping current speech', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('First text');
        result.current.speak('Second text');
        result.current.speak('Third text');
      });

      expect(result.current.queueLength).toBe(2);

      act(() => {
        result.current.clearQueue();
      });

      expect(result.current.queueLength).toBe(0);
      // Current speech should continue
      expect(mockSpeechSynthesis.cancel).not.toHaveBeenCalled();
    });
  });

  describe('Speech control', () => {
    it('should stop speaking', async () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Test text');
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      expect(result.current.isSpeaking).toBe(true);

      act(() => {
        result.current.stopSpeaking();
      });

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalledTimes(1);
      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.queueLength).toBe(0);
    });

    it('should pause speaking', async () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Test text');
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      act(() => {
        result.current.pauseSpeaking();
      });

      expect(mockSpeechSynthesis.pause).toHaveBeenCalledTimes(1);
    });

    it('should resume speaking', async () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Test text');
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      // Pause first
      act(() => {
        result.current.pauseSpeaking();
      });

      // Then resume
      act(() => {
        result.current.resumeSpeaking();
      });

      expect(mockSpeechSynthesis.resume).toHaveBeenCalledTimes(1);
    });

    it('should not pause when not speaking', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.pauseSpeaking();
      });

      expect(mockSpeechSynthesis.pause).not.toHaveBeenCalled();
    });

    it('should not resume when not paused', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.resumeSpeaking();
      });

      expect(mockSpeechSynthesis.resume).not.toHaveBeenCalled();
    });
  });

  describe('Voice management', () => {
    beforeEach(() => {
      // Ensure voices are loaded
      const { result } = renderHook(() => useTextToSpeech());
      act(() => {
        if (mockSpeechSynthesis.onvoiceschanged) {
          mockSpeechSynthesis.onvoiceschanged();
        }
      });
    });

    it('should set voice by object', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        if (mockSpeechSynthesis.onvoiceschanged) {
          mockSpeechSynthesis.onvoiceschanged();
        }
      });

      act(() => {
        result.current.setVoice(mockVoices[1]);
      });

      expect(result.current.selectedVoice).toEqual(mockVoices[1]);
    });

    it('should set voice by name', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        if (mockSpeechSynthesis.onvoiceschanged) {
          mockSpeechSynthesis.onvoiceschanged();
        }
      });

      act(() => {
        result.current.setVoice('english (uk)');
      });

      expect(result.current.selectedVoice?.lang).toBe('en-GB');
    });

    it('should set voice by index', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        if (mockSpeechSynthesis.onvoiceschanged) {
          mockSpeechSynthesis.onvoiceschanged();
        }
      });

      act(() => {
        result.current.setVoice(2);
      });

      expect(result.current.selectedVoice).toEqual(mockVoices[2]);
    });

    it('should handle invalid voice selection gracefully', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        if (mockSpeechSynthesis.onvoiceschanged) {
          mockSpeechSynthesis.onvoiceschanged();
        }
      });

      const originalVoice = result.current.selectedVoice;

      act(() => {
        result.current.setVoice('non-existent-voice');
      });

      expect(result.current.selectedVoice).toBe(null);

      act(() => {
        result.current.setVoice(999); // Invalid index
      });

      expect(result.current.selectedVoice).toBe(null);
    });
  });

  describe('Options management', () => {
    it('should update options', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.updateOptions({
          rate: 1.8,
          volume: 0.5
        });
      });

      expect(result.current.currentOptions.rate).toBe(1.8);
      expect(result.current.currentOptions.volume).toBe(0.5);
      // Other options should remain unchanged
      expect(result.current.currentOptions.pitch).toBe(1.0);
    });
  });

  describe('Status methods', () => {
    it('should return correct speech status', () => {
      const { result } = renderHook(() => useTextToSpeech());

      const status = result.current.getSpeechStatus();

      expect(status.supported).toBe(true);
      expect(status.speaking).toBe(false);
      expect(status.pending).toBe(false);
    });

    it('should return unsupported status when API not available', () => {
      delete (global as any).speechSynthesis;
      const { result } = renderHook(() => useTextToSpeech());

      const status = result.current.getSpeechStatus();

      expect(status.supported).toBe(false);
    });
  });

  describe('Computed properties', () => {
    it('should compute canSpeak correctly', async () => {
      const { result } = renderHook(() => useTextToSpeech());

      expect(result.current.canSpeak).toBe(true);

      act(() => {
        result.current.speak('Test text');
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      expect(result.current.canSpeak).toBe(false);
    });

    it('should compute canPause correctly', async () => {
      const { result } = renderHook(() => useTextToSpeech());

      expect(result.current.canPause).toBe(false);

      act(() => {
        result.current.speak('Test text');
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      expect(result.current.canPause).toBe(true);
    });

    it('should compute hasQueue correctly', () => {
      const { result } = renderHook(() => useTextToSpeech());

      expect(result.current.hasQueue).toBe(false);

      act(() => {
        result.current.speak('First text');
        result.current.speak('Second text');
      });

      expect(result.current.hasQueue).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle speech synthesis errors gracefully', async () => {
      const { result } = renderHook(() => useTextToSpeech());

      // Mock speak to throw error
      mockSpeechSynthesis.speak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
        currentUtterance = utterance;
        setTimeout(() => {
          if (utterance.onerror) {
            utterance.onerror(new SpeechSynthesisErrorEvent('error', { error: 'synthesis-failed' }));
          }
        }, 10);
      });

      await act(async () => {
        result.current.speak('Test text');
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      expect(result.current.isSpeaking).toBe(false);
    });

    it('should handle errors in speech synthesis calls', async () => {
      const { result } = renderHook(() => useTextToSpeech());

      mockSpeechSynthesis.speak.mockImplementation(() => {
        throw new Error('Speech synthesis failed');
      });

      await act(async () => {
        result.current.speak('Test text');
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      // Should handle error gracefully without breaking
      expect(result.current.isSpeaking).toBe(false);
    });

    it('should handle errors in control methods', () => {
      const { result } = renderHook(() => useTextToSpeech());

      mockSpeechSynthesis.cancel.mockImplementation(() => {
        throw new Error('Cancel failed');
      });

      expect(() => {
        result.current.stopSpeaking();
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should stop speaking on unmount', () => {
      const { result, unmount } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Test text');
      });

      unmount();

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });
  });

  describe('Event handling', () => {
    it('should handle speech events correctly', async () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Test text');
      });

      // Test start event
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      expect(result.current.isSpeaking).toBe(true);

      // Test pause event
      await act(async () => {
        result.current.pauseSpeaking();
      });

      expect(result.current.isPaused).toBe(true);

      // Test resume event
      await act(async () => {
        result.current.resumeSpeaking();
      });

      expect(result.current.isPaused).toBe(false);

      // Test end event
      await act(async () => {
        if (currentUtterance?.onend) {
          currentUtterance.onend(new Event('end') as SpeechSynthesisEvent);
        }
      });

      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.currentText).toBe(null);
    });
  });
});