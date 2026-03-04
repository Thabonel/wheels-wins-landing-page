import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PAMVoiceNativeService,
  createVoiceService,
  getVoiceService,
  destroyVoiceService,
  type VoiceSessionConfig,
  type VoiceStatus
} from '../pamVoiceNativeService';

// --- Mocks ---

class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  lang = 'en-US';

  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  start = vi.fn(() => { this.onstart?.(); });
  stop = vi.fn(() => { this.onend?.(); });
  abort = vi.fn(() => { this.onend?.(); });

  simulateFinalResult(transcript: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [{
        isFinal: true,
        length: 1,
        0: { transcript, confidence: 0.9 },
        [Symbol.iterator]: function* () { yield this[0]; }
      }]
    });
  }

  simulateInterimResult(transcript: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [{
        isFinal: false,
        length: 1,
        0: { transcript, confidence: 0 },
        [Symbol.iterator]: function* () { yield this[0]; }
      }]
    });
  }

  simulateError(error: string) {
    this.onerror?.({ error });
  }
}

let mockRecognitionInstance: MockSpeechRecognition;

// Auto-fires onended after play() so async tests don't block
class MockHTMLAudioElement {
  src = '';
  onended: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;

  play = vi.fn().mockImplementation(() => {
    Promise.resolve().then(() => this.onended?.());
    return Promise.resolve();
  });
  pause = vi.fn();
}

let mockAudioInstance: MockHTMLAudioElement;

const mockFetch = vi.fn();
const mockRevokeObjectURL = vi.fn();
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');

function buildConfig(overrides?: Partial<VoiceSessionConfig>): VoiceSessionConfig {
  return {
    userId: 'user-123',
    apiBaseUrl: 'https://api.example.com',
    authToken: 'test-token',
    voice: 'en-US-AriaNeural',
    language: 'en-US',
    onTranscript: vi.fn(),
    onResponse: vi.fn(),
    onStatusChange: vi.fn(),
    ...overrides
  };
}

function makePamResponse(response = 'Hello from PAM!') {
  return {
    response,
    actions: [],
    conversation_id: 'conv-1',
    message_id: 'msg-1',
    session_id: 'sess-1',
    processing_time_ms: 300,
    timestamp: new Date().toISOString()
  };
}

// --- Setup ---

beforeEach(() => {
  mockRecognitionInstance = new MockSpeechRecognition();
  mockAudioInstance = new MockHTMLAudioElement();

  (window as any).SpeechRecognition = vi.fn(() => mockRecognitionInstance);
  (window as any).webkitSpeechRecognition = undefined;

  vi.spyOn(global, 'Audio' as any).mockImplementation(() => mockAudioInstance);

  global.fetch = mockFetch;
  mockFetch.mockReset();

  URL.createObjectURL = mockCreateObjectURL;
  URL.revokeObjectURL = mockRevokeObjectURL;

  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
    writable: true,
    configurable: true
  });

  destroyVoiceService();
  vi.useRealTimers();
});

afterEach(() => {
  destroyVoiceService();
  vi.restoreAllMocks();
});

// --- Tests ---

describe('PAMVoiceNativeService', () => {
  describe('start()', () => {
    it('initializes SpeechRecognition and sets isConnected=true', async () => {
      const config = buildConfig();
      const svc = new PAMVoiceNativeService(config);

      await svc.start();

      expect(config.onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({ isConnected: true })
      );
    });

    it('plays greeting audio on start', async () => {
      const svc = new PAMVoiceNativeService(buildConfig());
      await svc.start();
      expect(mockAudioInstance.play).toHaveBeenCalled();
    });

    it('starts SpeechRecognition once greeting finishes', async () => {
      const svc = new PAMVoiceNativeService(buildConfig());
      // Greeting onended fires automatically via mock during await
      await svc.start();
      expect(mockRecognitionInstance.start).toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('stops recognition and sets isConnected=false', async () => {
      const config = buildConfig();
      const svc = new PAMVoiceNativeService(config);
      await svc.start();
      await svc.stop();

      expect(config.onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({ isConnected: false })
      );
      expect(mockRecognitionInstance.abort).toHaveBeenCalled();
    });

    it('pauses audio if speaking when stop() is called', async () => {
      // Prevent greeting from ending so audio stays in playing state
      mockAudioInstance.play = vi.fn().mockReturnValue(new Promise(() => {}));

      const svc = new PAMVoiceNativeService(buildConfig());
      svc.start(); // don't await - blocked on playGreeting
      // Macro-task flush lets start() run through requestMicPermission and into playGreeting
      await new Promise(r => setTimeout(r, 0));

      await svc.stop();
      expect(mockAudioInstance.pause).toHaveBeenCalled();
    });
  });

  describe('transcript handling', () => {
    it('calls onTranscript with final transcript text', async () => {
      const config = buildConfig();
      const svc = new PAMVoiceNativeService(config);
      await svc.start();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => makePamResponse()
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(100)
        });

      mockRecognitionInstance.simulateFinalResult('What is the weather?');

      await vi.waitFor(() => {
        expect(config.onTranscript).toHaveBeenCalledWith('What is the weather?');
      });
    });

    it('ignores empty/whitespace-only transcripts', async () => {
      const config = buildConfig();
      const svc = new PAMVoiceNativeService(config);
      await svc.start();

      mockRecognitionInstance.simulateFinalResult('   ');

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockFetch).not.toHaveBeenCalled();
      expect(config.onTranscript).not.toHaveBeenCalled();
    });
  });

  describe('interrupt()', () => {
    it('pauses audio and sets isSpeaking=false if speaking when interrupt() is called', async () => {
      // Prevent greeting from ending so audio stays in playing state
      mockAudioInstance.play = vi.fn().mockReturnValue(new Promise(() => {}));

      const config = buildConfig();
      const svc = new PAMVoiceNativeService(config);
      svc.start(); // don't await - blocked on playGreeting
      // Macro-task flush lets start() run through requestMicPermission and into playGreeting
      await new Promise(r => setTimeout(r, 0));

      svc.interrupt();

      expect(mockAudioInstance.pause).toHaveBeenCalled();
      expect(config.onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({ isSpeaking: false })
      );
    });

    it('restarts SpeechRecognition after interrupt', async () => {
      const svc = new PAMVoiceNativeService(buildConfig());
      await svc.start();

      const callsBefore = mockRecognitionInstance.start.mock.calls.length;
      svc.interrupt();

      expect(mockRecognitionInstance.start).toHaveBeenCalledTimes(callsBefore + 1);
    });
  });

  describe('echo prevention', () => {
    it('aborts recognition while processing transcript (prevents echo)', async () => {
      const config = buildConfig();
      const svc = new PAMVoiceNativeService(config);
      await svc.start();

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => makePamResponse() })
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(100) });

      mockRecognitionInstance.simulateFinalResult('Tell me a joke');

      await vi.waitFor(() => {
        // abort() is called to silence mic immediately during TTS
        expect(mockRecognitionInstance.abort).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('handles backend error gracefully without crashing', async () => {
      const config = buildConfig();
      const svc = new PAMVoiceNativeService(config);
      await svc.start();

      // Both PAM endpoints fail with network errors
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      mockRecognitionInstance.simulateFinalResult('Hello PAM');

      await vi.waitFor(() => {
        expect(config.onStatusChange).toHaveBeenCalledWith(
          expect.objectContaining({ isWaitingForSupervisor: false })
        );
      });
    });

    it('falls back to second endpoint when first returns non-ok status', async () => {
      const config = buildConfig();
      const svc = new PAMVoiceNativeService(config);
      await svc.start();

      // First endpoint returns 503, second succeeds
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockResolvedValueOnce({ ok: true, json: async () => makePamResponse('Fallback response') })
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(100) });

      mockRecognitionInstance.simulateFinalResult('Hello');

      await vi.waitFor(() => {
        expect(config.onResponse).toHaveBeenCalledWith('Fallback response');
      });
    });

    it('handles mic permission denied', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied'))
        },
        writable: true,
        configurable: true
      });

      const config = buildConfig();
      const svc = new PAMVoiceNativeService(config);

      await expect(svc.start()).resolves.not.toThrow();
    });
  });

  describe('inactivity timeout', () => {
    it('calls stop() after 30 seconds of inactivity', async () => {
      vi.useFakeTimers();
      const config = buildConfig();
      const svc = new PAMVoiceNativeService(config);
      const stopSpy = vi.spyOn(svc, 'stop');

      await svc.start(); // greeting onended fires via microtask, starts timer

      await vi.advanceTimersByTimeAsync(30000);

      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('singleton pattern', () => {
    it('createVoiceService returns the same instance on second call', () => {
      const config = buildConfig();
      const svc1 = createVoiceService(config);
      const svc2 = createVoiceService(config);
      expect(svc1).toBe(svc2);
    });

    it('getVoiceService returns null when no service exists', () => {
      expect(getVoiceService()).toBeNull();
    });

    it('getVoiceService returns service after create', () => {
      const svc = createVoiceService(buildConfig());
      expect(getVoiceService()).toBe(svc);
    });

    it('destroyVoiceService clears the singleton', () => {
      createVoiceService(buildConfig());
      destroyVoiceService();
      expect(getVoiceService()).toBeNull();
    });
  });

  describe('getStatus()', () => {
    it('returns initial disconnected status', () => {
      const svc = new PAMVoiceNativeService(buildConfig());
      expect(svc.getStatus()).toMatchObject({
        isConnected: false,
        isListening: false,
        isSpeaking: false,
        isWaitingForSupervisor: false
      });
    });
  });
});
