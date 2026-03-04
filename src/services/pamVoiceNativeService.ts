/**
 * PAM Voice Native Service
 *
 * Replaces OpenAI Realtime with free, browser-native voice I/O:
 * - STT: Browser SpeechRecognition API (Chrome/Safari/Edge)
 * - TTS: Edge TTS via backend /api/v1/tts/synthesize (free, Microsoft neural voices)
 * - Reasoning: Claude via existing PAM REST chat endpoint
 *
 * Cost: $0/min for voice I/O (only Claude API costs remain)
 */

import { API_BASE_URL } from './api';

const LOG_PREFIX = '[VoiceNative]';
const VOICE_INACTIVITY_TIMEOUT_MS = 30000;
const GREETING_COUNT = 4;

// ------- Public types (must match pamVoiceHybridService interface) --------

export interface VoiceSessionConfig {
  userId: string;
  apiBaseUrl: string;
  authToken: string;
  voice?: string;
  temperature?: number;
  language?: string;
  location?: { lat: number; lng: number; city?: string; region?: string };
  currentPage?: string;
  onTranscript?: (text: string) => void;
  onResponse?: (text: string) => void;
  onStatusChange?: (status: VoiceStatus) => void;
}

export interface VoiceStatus {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isWaitingForSupervisor: boolean;
  latency?: number;
}

// UI action types returned by PAM tools
interface UIAction {
  type: 'reload_calendar' | 'reload_expenses' | 'reload_trips' | 'open_map' | string;
  entity_id?: string;
  entity_type?: string;
  entity_title?: string;
}

// -------- Utility: SpeechRecognition factory --------

function getSpeechRecognitionAPI(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    (window as any).mozSpeechRecognition ||
    null
  );
}

// -------- Main service class --------

export class PAMVoiceNativeService {
  private config: VoiceSessionConfig;
  private status: VoiceStatus = {
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    isWaitingForSupervisor: false
  };

  private recognition: SpeechRecognition | null = null;
  private audio: HTMLAudioElement | null = null;
  private audioBlobUrl: string | null = null;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(config: VoiceSessionConfig) {
    this.config = config;
  }

  // -------- Lifecycle --------

  async start(): Promise<void> {
    this.stopped = false;
    console.debug(LOG_PREFIX, 'Starting native voice service');

    try {
      await this.requestMicPermission();
    } catch {
      console.warn(LOG_PREFIX, 'Mic permission denied - voice input unavailable');
    }

    this.initRecognition();
    await this.playGreeting();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    console.debug(LOG_PREFIX, 'Stopping native voice service');

    this.clearInactivityTimer();
    this.stopRecognition();
    this.stopAudio();
    this.revokeAudioBlob();
    this.updateStatus({
      isConnected: false,
      isListening: false,
      isSpeaking: false,
      isWaitingForSupervisor: false
    });

    window.dispatchEvent(new CustomEvent('pam-voice:stop-all'));
  }

  interrupt(): void {
    console.debug(LOG_PREFIX, 'Interrupt');
    this.stopAudio();
    this.updateStatus({ isSpeaking: false });
    if (!this.stopped) {
      this.startRecognition();
    }
  }

  getStatus(): VoiceStatus {
    return { ...this.status };
  }

  // -------- Recognition --------

  private initRecognition(): void {
    const SpeechRecognitionAPI = getSpeechRecognitionAPI();
    if (!SpeechRecognitionAPI) {
      console.warn(LOG_PREFIX, 'SpeechRecognition not supported in this browser');
      return;
    }

    const rec = new SpeechRecognitionAPI();
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = this.config.language || 'en-US';

    rec.onstart = () => {
      if (this.stopped) return;
      console.debug(LOG_PREFIX, 'STT started');
      this.updateStatus({ isListening: true });
      this.resetInactivityTimer();
    };

    rec.onend = () => {
      if (this.stopped) return;
      this.updateStatus({ isListening: false });
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      if (this.stopped) return;
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          console.debug(LOG_PREFIX, 'Final transcript:', text, 'confidence:', result[0].confidence);
          if (text.length > 0) {
            this.handleFinalTranscript(text);
          }
          return;
        } else {
          interimText += result[0].transcript;
        }
      }

      // Interim - just fire onTranscript for live display, don't process
      if (interimText.trim()) {
        this.config.onTranscript?.(interimText);
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn(LOG_PREFIX, 'STT error:', event.error);
      this.updateStatus({ isListening: false });

      // Recoverable errors - restart recognition
      if (!this.stopped && event.error !== 'not-allowed' && event.error !== 'service-not-allowed') {
        setTimeout(() => {
          if (!this.stopped && !this.status.isSpeaking) {
            this.startRecognition();
          }
        }, 500);
      }
    };

    this.recognition = rec;
  }

  private startRecognition(): void {
    if (!this.recognition || this.stopped) return;
    try {
      this.recognition.start();
    } catch (err) {
      console.warn(LOG_PREFIX, 'Could not start recognition:', err);
    }
  }

  private stopRecognition(): void {
    if (!this.recognition) return;
    try {
      this.recognition.abort();
    } catch {
      // ignore
    }
    this.updateStatus({ isListening: false });
  }

  // -------- Transcript -> PAM -> TTS pipeline --------

  private async handleFinalTranscript(text: string): Promise<void> {
    // Stop recognition to prevent echo during TTS playback
    this.stopRecognition();

    this.config.onTranscript?.(text);
    this.updateStatus({ isWaitingForSupervisor: true, isListening: false });

    const startTime = Date.now();
    try {
      const pamResponse = await this.callPAM(text);
      const latency = Date.now() - startTime;

      this.config.onResponse?.(pamResponse.response);
      this.processUIActions(pamResponse.actions || []);

      this.updateStatus({ isWaitingForSupervisor: false, latency });

      await this.speak(pamResponse.response);
    } catch (err) {
      console.error(LOG_PREFIX, 'Pipeline error:', err);
      this.updateStatus({ isWaitingForSupervisor: false });
      // Resume listening after error
      if (!this.stopped) {
        setTimeout(() => this.startRecognition(), 300);
      }
    }
  }

  private async callPAM(message: string): Promise<{ response: string; actions: UIAction[] }> {
    const apiBase = this.config.apiBaseUrl || API_BASE_URL;
    const endpoints = [
      `${apiBase}/api/v1/pam-simple/chat`,
      `${apiBase}/api/v1/pam/chat`
    ];

    const body = {
      message,
      user_id: this.config.userId,
      voice_input: true,
      context: {
        current_page: this.config.currentPage || 'pam_chat',
        ...(this.config.location && {
          userLocation: {
            lat: this.config.location.lat,
            lng: this.config.location.lng,
            city: this.config.location.city,
            region: this.config.location.region
          }
        })
      }
    };

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.authToken}`
          },
          body: JSON.stringify(body)
        });

        if (res.ok) {
          const data = await res.json();
          return {
            response: data.response || data.message || data.content || 'Got it!',
            actions: data.actions || []
          };
        }
      } catch {
        continue;
      }
    }

    throw new Error('All PAM endpoints failed');
  }

  // -------- TTS --------

  private async speak(text: string): Promise<void> {
    if (!text.trim() || this.stopped) return;

    const apiBase = this.config.apiBaseUrl || API_BASE_URL;
    const voiceId = this.config.voice || 'en-US-AriaNeural';

    console.debug(LOG_PREFIX, `TTS request: "${text.substring(0, 50)}..." voice=${voiceId}`);

    try {
      const res = await fetch(`${apiBase}/api/v1/tts/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.authToken}`
        },
        body: JSON.stringify({
          text,
          voice_id: voiceId,
          format: 'mp3',
          use_cache: true
        })
      });

      if (!res.ok) throw new Error(`TTS failed: ${res.status}`);

      const audioBuffer = await res.arrayBuffer();
      if (audioBuffer.byteLength === 0) throw new Error('TTS returned empty audio');

      await this.playAudioBuffer(audioBuffer);
    } catch (err) {
      console.error(LOG_PREFIX, 'TTS error:', err);
      // Resume listening even if TTS fails
      this.updateStatus({ isSpeaking: false });
      if (!this.stopped) {
        setTimeout(() => this.startRecognition(), 300);
      }
    }
  }

  private async playAudioBuffer(buffer: ArrayBuffer): Promise<void> {
    if (this.stopped) return;

    this.revokeAudioBlob();

    const blob = new Blob([buffer], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    this.audioBlobUrl = url;

    const audio = new Audio(url);
    this.audio = audio;

    this.updateStatus({ isSpeaking: true });
    console.debug(LOG_PREFIX, 'Audio playing');

    await new Promise<void>((resolve) => {
      audio.onended = () => {
        console.debug(LOG_PREFIX, 'Audio finished');
        this.revokeAudioBlob();
        this.updateStatus({ isSpeaking: false });
        if (!this.stopped) {
          this.startRecognition();
          this.resetInactivityTimer();
        }
        resolve();
      };
      audio.onerror = (e) => {
        console.error(LOG_PREFIX, 'Audio playback error:', e);
        this.revokeAudioBlob();
        this.updateStatus({ isSpeaking: false });
        if (!this.stopped) {
          this.startRecognition();
        }
        resolve();
      };
      audio.play().catch((err) => {
        console.error(LOG_PREFIX, 'audio.play() failed:', err);
        this.updateStatus({ isSpeaking: false });
        if (!this.stopped) {
          this.startRecognition();
        }
        resolve();
      });
    });
  }

  private stopAudio(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    this.revokeAudioBlob();
  }

  private revokeAudioBlob(): void {
    if (this.audioBlobUrl) {
      URL.revokeObjectURL(this.audioBlobUrl);
      this.audioBlobUrl = null;
    }
  }

  // -------- Greeting --------

  private async playGreeting(): Promise<void> {
    const index = Math.floor(Math.random() * GREETING_COUNT) + 1;
    const greetingUrl = `/audio/greetings/greeting-${index}.mp3`;
    console.debug(LOG_PREFIX, 'Playing greeting:', greetingUrl);

    const audio = new Audio(greetingUrl);
    this.audio = audio;
    this.updateStatus({ isConnected: true, isSpeaking: true });

    await new Promise<void>((resolve) => {
      audio.onended = () => {
        this.updateStatus({ isSpeaking: false });
        if (!this.stopped) {
          this.startRecognition();
          this.resetInactivityTimer();
        }
        resolve();
      };
      audio.onerror = () => {
        // Greeting failed silently - just start listening
        this.updateStatus({ isSpeaking: false });
        if (!this.stopped) {
          this.startRecognition();
          this.resetInactivityTimer();
        }
        resolve();
      };
      audio.play().catch(() => {
        this.updateStatus({ isSpeaking: false });
        if (!this.stopped) {
          this.startRecognition();
          this.resetInactivityTimer();
        }
        resolve();
      });
    });
  }

  // -------- UI Actions --------

  private processUIActions(actions: UIAction[]): void {
    for (const action of actions) {
      switch (action.type) {
        case 'reload_calendar':
          window.dispatchEvent(new CustomEvent('reload-calendar'));
          break;
        case 'reload_expenses':
          window.dispatchEvent(new CustomEvent('reload-expenses'));
          break;
        case 'reload_trips':
          window.dispatchEvent(new CustomEvent('reload-trips'));
          break;
        case 'open_map':
          window.dispatchEvent(new CustomEvent('open-map', { detail: action }));
          break;
        default:
          console.debug(LOG_PREFIX, 'Unknown UI action:', action.type);
      }
    }
  }

  // -------- Inactivity timer --------

  private resetInactivityTimer(): void {
    this.clearInactivityTimer();
    this.inactivityTimer = setTimeout(() => {
      console.debug(LOG_PREFIX, 'Inactivity timeout - stopping voice mode');
      this.stop();
    }, VOICE_INACTIVITY_TIMEOUT_MS);
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  // -------- Permissions --------

  private async requestMicPermission(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
  }

  // -------- Status --------

  private updateStatus(partial: Partial<VoiceStatus>): void {
    this.status = { ...this.status, ...partial };
    this.config.onStatusChange?.(this.getStatus());
  }
}

// -------- Singleton management --------

let _instance: PAMVoiceNativeService | null = null;

export function createVoiceService(config: VoiceSessionConfig): PAMVoiceNativeService {
  if (_instance) {
    console.debug(LOG_PREFIX, 'Returning existing service instance');
    return _instance;
  }
  _instance = new PAMVoiceNativeService(config);
  return _instance;
}

export function getVoiceService(): PAMVoiceNativeService | null {
  return _instance;
}

export function destroyVoiceService(): void {
  if (_instance) {
    _instance.stop().catch(() => {});
    _instance = null;
  }
}
