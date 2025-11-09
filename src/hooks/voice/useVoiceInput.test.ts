import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoiceInput, type VoiceInputResult } from './useVoiceInput';

// Mock logger to avoid console spam in tests
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock speech recognition interfaces
interface MockSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onaudiostart: ((event: Event) => void) | null;
  onnomatch: ((event: Event) => void) | null;
  start: Mock;
  stop: Mock;
  abort: Mock;
}

interface MockSpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface MockSpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

// Create mock speech recognition
const createMockSpeechRecognition = (): MockSpeechRecognition => ({
  continuous: false,
  interimResults: false,
  maxAlternatives: 1,
  lang: 'en-US',
  onstart: null,
  onend: null,
  onresult: null,
  onerror: null,
  onaudiostart: null,
  onnomatch: null,
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn()
});

// Mock result helper
const createMockResult = (transcript: string, isFinal: boolean, confidence: number = 0.9) => ({
  resultIndex: 0,
  results: [{
    0: { transcript, confidence },
    isFinal,
    length: 1,
    *[Symbol.iterator] () {
      yield this[0];
    }
  }] as any
});

describe('useVoiceInput', () => {
  let mockSpeechRecognition: MockSpeechRecognition;
  let mockNavigator: any;
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create fresh mock recognition
    mockSpeechRecognition = createMockSpeechRecognition();
    
    // Mock global objects
    global.window = {
      SpeechRecognition: vi.fn(() => mockSpeechRecognition),
      webkitSpeechRecognition: vi.fn(() => mockSpeechRecognition)
    } as any;

    // Mock navigator
    mockNavigator = {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: vi.fn().mockReturnValue([{
            stop: vi.fn()
          }])
        })
      },
      permissions: {
        query: vi.fn().mockResolvedValue({ state: 'granted' })
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

  describe('Initialization', () => {
    it('should initialize with correct default state when supported', () => {
      const { result } = renderHook(() => useVoiceInput());

      expect(result.current.isSupported).toBe(true);
      expect(result.current.isListening).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.transcript).toBe('');
      expect(result.current.interimTranscript).toBe('');
      expect(result.current.confidence).toBe(0);
      expect(result.current.error).toBe(null);
      expect(result.current.hasPermission).toBe(null);
    });

    it('should initialize with unsupported state when no speech recognition', () => {
      global.window = {} as any;
      
      const { result } = renderHook(() => useVoiceInput());

      expect(result.current.isSupported).toBe(false);
    });

    it('should configure recognition with default options', async () => {
      renderHook(() => useVoiceInput());

      await waitFor(() => {
        expect(mockSpeechRecognition.continuous).toBe(false);
        expect(mockSpeechRecognition.interimResults).toBe(true);
        expect(mockSpeechRecognition.maxAlternatives).toBe(1);
        expect(mockSpeechRecognition.lang).toBe('en-US');
      });
    });

    it('should configure recognition with custom options', async () => {
      renderHook(() => useVoiceInput(undefined, undefined, {
        continuous: true,
        interimResults: false,
        maxAlternatives: 3,
        lang: 'es-ES'
      }));

      await waitFor(() => {
        expect(mockSpeechRecognition.continuous).toBe(true);
        expect(mockSpeechRecognition.interimResults).toBe(false);
        expect(mockSpeechRecognition.maxAlternatives).toBe(3);
        expect(mockSpeechRecognition.lang).toBe('es-ES');
      });
    });
  });

  describe('Starting and stopping', () => {
    it('should start listening successfully', async () => {
      const { result } = renderHook(() => useVoiceInput());

      await act(async () => {
        const started = await result.current.startListening();
        expect(started).toBe(true);
      });

      expect(mockSpeechRecognition.start).toHaveBeenCalledOnce();
    });

    it('should not start when not supported', async () => {
      global.window = {} as any;
      const { result } = renderHook(() => useVoiceInput());

      await act(async () => {
        const started = await result.current.startListening();
        expect(started).toBe(false);
      });
    });

    it('should not start when already listening', async () => {
      const { result } = renderHook(() => useVoiceInput());

      // First start
      await act(async () => {
        await result.current.startListening();
      });

      // Simulate onstart event
      act(() => {
        mockSpeechRecognition.onstart?.(new Event('start'));
      });

      // Try to start again
      await act(async () => {
        const started = await result.current.startListening();
        expect(started).toBe(true); // Returns true because already listening
      });

      expect(mockSpeechRecognition.start).toHaveBeenCalledOnce();
    });

    it('should handle permission denied error', async () => {
      mockNavigator.permissions.query.mockResolvedValue({ state: 'denied' });
      const onError = vi.fn();
      const { result } = renderHook(() => useVoiceInput(undefined, onError));

      await act(async () => {
        const started = await result.current.startListening();
        expect(started).toBe(false);
      });

      expect(result.current.hasPermission).toBe(false);
      expect(onError).toHaveBeenCalledWith('Microphone permission denied');
    });

    it('should stop listening', () => {
      const { result } = renderHook(() => useVoiceInput());

      // Simulate listening state
      act(() => {
        mockSpeechRecognition.onstart?.(new Event('start'));
      });

      act(() => {
        result.current.stopListening();
      });

      expect(mockSpeechRecognition.stop).toHaveBeenCalledOnce();
    });

    it('should abort listening', () => {
      const { result } = renderHook(() => useVoiceInput());

      act(() => {
        result.current.abortListening();
      });

      expect(mockSpeechRecognition.abort).toHaveBeenCalledOnce();
    });
  });

  describe('Speech recognition events', () => {
    it('should handle onstart event', async () => {
      const { result } = renderHook(() => useVoiceInput());

      await act(async () => {
        await result.current.startListening();
      });

      act(() => {
        mockSpeechRecognition.onstart?.(new Event('start'));
      });

      expect(result.current.isListening).toBe(true);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle onend event', async () => {
      const { result } = renderHook(() => useVoiceInput());

      // Start listening
      await act(async () => {
        await result.current.startListening();
      });

      act(() => {
        mockSpeechRecognition.onstart?.(new Event('start'));
      });

      act(() => {
        mockSpeechRecognition.onend?.(new Event('end'));
      });

      expect(result.current.isListening).toBe(false);
      expect(result.current.isProcessing).toBe(false);
    });

    it('should handle onaudiostart event', async () => {
      const { result } = renderHook(() => useVoiceInput());

      await act(async () => {
        await result.current.startListening();
      });

      act(() => {
        mockSpeechRecognition.onaudiostart?.(new Event('audiostart'));
      });

      expect(result.current.hasPermission).toBe(true);
      expect(result.current.isProcessing).toBe(true);
    });

    it('should handle final result', async () => {
      const onResult = vi.fn();
      const { result } = renderHook(() => useVoiceInput(onResult));

      await act(async () => {
        await result.current.startListening();
      });

      const mockEvent = createMockResult('Hello world', true, 0.95);

      act(() => {
        mockSpeechRecognition.onresult?.(mockEvent as any);
      });

      expect(result.current.transcript).toBe('Hello world');
      expect(result.current.confidence).toBe(0.95);
      expect(result.current.interimTranscript).toBe('');
      expect(onResult).toHaveBeenCalledWith({
        transcript: 'Hello world',
        confidence: 0.95,
        isFinal: true,
        alternatives: [{ transcript: 'Hello world', confidence: 0.95 }]
      });
    });

    it('should handle interim result', async () => {
      const onResult = vi.fn();
      const { result } = renderHook(() => useVoiceInput(onResult));

      await act(async () => {
        await result.current.startListening();
      });

      const mockEvent = createMockResult('Hello', false, 0);

      act(() => {
        mockSpeechRecognition.onresult?.(mockEvent as any);
      });

      expect(result.current.transcript).toBe('');
      expect(result.current.interimTranscript).toBe('Hello');
      expect(result.current.isProcessing).toBe(true);
      expect(onResult).toHaveBeenCalledWith({
        transcript: 'Hello',
        confidence: 0,
        isFinal: false,
        alternatives: undefined
      });
    });

    it('should handle error events', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useVoiceInput(undefined, onError));

      await act(async () => {
        await result.current.startListening();
      });

      const errorEvent: MockSpeechRecognitionErrorEvent = {
        error: 'network',
        message: 'Network error occurred'
      };

      act(() => {
        mockSpeechRecognition.onerror?.(errorEvent as any);
      });

      expect(result.current.error).toBe('Speech recognition error: network');
      expect(result.current.isListening).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(onError).toHaveBeenCalledWith('Speech recognition error: network');
    });

    it('should handle permission error', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useVoiceInput(undefined, onError));

      await act(async () => {
        await result.current.startListening();
      });

      const errorEvent: MockSpeechRecognitionErrorEvent = {
        error: 'not-allowed'
      };

      act(() => {
        mockSpeechRecognition.onerror?.(errorEvent as any);
      });

      expect(result.current.hasPermission).toBe(false);
    });

    it('should handle no match', async () => {
      const { result } = renderHook(() => useVoiceInput());

      await act(async () => {
        await result.current.startListening();
      });

      act(() => {
        mockSpeechRecognition.onnomatch?.(new Event('nomatch'));
      });

      expect(result.current.error).toBe('No speech was recognized');
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('Utility methods', () => {
    it('should clear transcript', () => {
      const { result } = renderHook(() => useVoiceInput());

      // Set some state
      act(() => {
        const mockEvent = createMockResult('Hello world', true);
        mockSpeechRecognition.onresult?.(mockEvent as any);
      });

      expect(result.current.transcript).toBe('Hello world');

      act(() => {
        result.current.clearTranscript();
      });

      expect(result.current.transcript).toBe('');
      expect(result.current.interimTranscript).toBe('');
      expect(result.current.confidence).toBe(0);
      expect(result.current.error).toBe(null);
    });

    it('should update options', async () => {
      const { result } = renderHook(() => useVoiceInput());

      await waitFor(() => {
        expect(mockSpeechRecognition.lang).toBe('en-US');
      });

      act(() => {
        result.current.updateOptions({
          lang: 'fr-FR',
          continuous: true
        });
      });

      expect(result.current.currentOptions.lang).toBe('fr-FR');
      expect(result.current.currentOptions.continuous).toBe(true);
      expect(mockSpeechRecognition.lang).toBe('fr-FR');
      expect(mockSpeechRecognition.continuous).toBe(true);
    });

    it('should request permission successfully', async () => {
      const { result } = renderHook(() => useVoiceInput());

      await act(async () => {
        const granted = await result.current.requestPermission();
        expect(granted).toBe(true);
      });

      expect(result.current.hasPermission).toBe(true);
      expect(mockNavigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    it('should handle permission request failure', async () => {
      mockNavigator.mediaDevices.getUserMedia.mockRejectedValue(new Error('Permission denied'));
      const onError = vi.fn();
      const { result } = renderHook(() => useVoiceInput(undefined, onError));

      await act(async () => {
        const granted = await result.current.requestPermission();
        expect(granted).toBe(false);
      });

      expect(result.current.hasPermission).toBe(false);
      expect(onError).toHaveBeenCalledWith('Microphone permission denied or not available');
    });
  });

  describe('Computed values', () => {
    it('should compute canStart correctly', async () => {
      const { result } = renderHook(() => useVoiceInput());

      expect(result.current.canStart).toBe(true);

      // Start listening
      await act(async () => {
        await result.current.startListening();
      });

      act(() => {
        mockSpeechRecognition.onstart?.(new Event('start'));
      });

      expect(result.current.canStart).toBe(false);
    });

    it('should compute canStop correctly', async () => {
      const { result } = renderHook(() => useVoiceInput());

      expect(result.current.canStop).toBe(false);

      // Start listening
      await act(async () => {
        await result.current.startListening();
      });

      act(() => {
        mockSpeechRecognition.onstart?.(new Event('start'));
      });

      expect(result.current.canStop).toBe(true);
    });

    it('should compute hasContent correctly', () => {
      const { result } = renderHook(() => useVoiceInput());

      expect(result.current.hasContent).toBe(false);

      act(() => {
        const mockEvent = createMockResult('Hello', false);
        mockSpeechRecognition.onresult?.(mockEvent as any);
      });

      expect(result.current.hasContent).toBe(true);
    });

    it('should compute fullTranscript correctly', () => {
      const { result } = renderHook(() => useVoiceInput());

      act(() => {
        const finalEvent = createMockResult('Hello ', true);
        mockSpeechRecognition.onresult?.(finalEvent as any);
      });

      act(() => {
        const interimEvent = createMockResult('world', false);
        mockSpeechRecognition.onresult?.(interimEvent as any);
      });

      expect(result.current.fullTranscript).toBe('Hello world');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useVoiceInput());

      unmount();

      expect(mockSpeechRecognition.abort).toHaveBeenCalledOnce();
    });
  });
});