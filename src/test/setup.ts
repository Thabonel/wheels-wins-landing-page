import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Import Supabase mocks to apply globally
import './mocks/supabase';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Speech Synthesis API (for PAM Voice features)
const mockSpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  lang: 'en-US',
  volume: 1,
  rate: 1,
  pitch: 1,
  voice: null,
  onstart: null,
  onend: null,
  onerror: null,
  onpause: null,
  onresume: null,
  onmark: null,
  onboundary: null,
}));

global.SpeechSynthesisUtterance = mockSpeechSynthesisUtterance as any;

// Mock SpeechSynthesisErrorEvent
global.SpeechSynthesisErrorEvent = class SpeechSynthesisErrorEvent extends Event {
  error: any;
  constructor(type: string, eventInitDict?: any) {
    super(type, eventInitDict);
    this.error = eventInitDict?.error || 'unknown';
  }
} as any;

// Mock SpeechSynthesisEvent
global.SpeechSynthesisEvent = class SpeechSynthesisEvent extends Event {
  charIndex: number;
  charLength: number;
  elapsedTime: number;
  name: string;
  utterance: any;
  constructor(type: string, eventInitDict?: any) {
    super(type, eventInitDict);
    this.charIndex = eventInitDict?.charIndex || 0;
    this.charLength = eventInitDict?.charLength || 0;
    this.elapsedTime = eventInitDict?.elapsedTime || 0;
    this.name = eventInitDict?.name || '';
    this.utterance = eventInitDict?.utterance || null;
  }
} as any;

Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
    speaking: false,
    pending: false,
    paused: false,
    onvoiceschanged: null,
  },
});

// Mock Speech Recognition API (for PAM Voice input)
const mockSpeechRecognition = vi.fn().mockImplementation(() => ({
  lang: 'en-US',
  continuous: false,
  interimResults: false,
  maxAlternatives: 1,
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  onstart: null,
  onend: null,
  onerror: null,
  onresult: null,
  onspeechend: null,
  onsoundstart: null,
  onsoundend: null,
  onaudiostart: null,
  onaudioend: null,
}));

(global as any).SpeechRecognition = mockSpeechRecognition;
(global as any).webkitSpeechRecognition = mockSpeechRecognition;

// Mock fetch
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Suppress React error boundary errors in tests
const originalError = console.error;
beforeEach(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('The above error occurred in the') ||
       args[0].includes('Error: Uncaught [Error:') ||
       args[0].includes('useAuth must be used within an AuthProvider'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  console.error = originalError;
});