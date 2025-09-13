import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';

export interface TextToSpeechOptions {
  rate?: number;        // 0.1 to 10, default 1
  pitch?: number;       // 0 to 2, default 1  
  volume?: number;      // 0 to 1, default 1
  voice?: SpeechSynthesisVoice | null;
  lang?: string;        // Language code, e.g., 'en-US'
}

export interface TextToSpeechState {
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  currentText: string | null;
  queueLength: number;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
}

interface QueuedSpeech {
  text: string;
  options: TextToSpeechOptions;
  id: string;
}

const DEFAULT_OPTIONS: Required<Omit<TextToSpeechOptions, 'voice'>> & { voice: SpeechSynthesisVoice | null } = {
  rate: 1.0,
  pitch: 1.0,
  volume: 0.8,
  voice: null,
  lang: 'en-US'
};

// Maximum text length for a single utterance (browser limits vary)
const MAX_TEXT_LENGTH = 200;

// Text truncation patterns - prioritize keeping important content
const TRUNCATION_PATTERNS = [
  /^(.{0,180})\s+.*$/,  // Break at word boundary around 180 chars
  /^(.{0,190}).*$/,     // Hard break at 190 chars
];

export function useTextToSpeech(initialOptions: TextToSpeechOptions = {}) {
  // Merge with defaults
  const options = useRef<Required<TextToSpeechOptions>>({
    ...DEFAULT_OPTIONS,
    ...initialOptions,
    voice: initialOptions.voice || null
  });

  // State
  const [state, setState] = useState<TextToSpeechState>(() => {
    const isSupported = typeof window !== 'undefined' && 
                       'speechSynthesis' in window && 
                       'SpeechSynthesisUtterance' in window;
    
    return {
      isSupported,
      isSpeaking: false,
      isPaused: false,
      currentText: null,
      queueLength: 0,
      availableVoices: [],
      selectedVoice: null
    };
  });

  // Refs for managing speech queue and current utterance
  const speechQueue = useRef<QueuedSpeech[]>([]);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const isProcessingQueue = useRef(false);

  // Load available voices
  const loadVoices = useCallback(() => {
    if (!state.isSupported) return;

    const voices = speechSynthesis.getVoices();
    logger.debug('Available TTS voices:', voices.length);

    setState(prev => ({
      ...prev,
      availableVoices: voices,
      selectedVoice: prev.selectedVoice || voices.find(v => v.default) || voices[0] || null
    }));

    // Set default voice in options if not already set
    if (!options.current.voice && voices.length > 0) {
      options.current.voice = voices.find(v => v.default) || voices[0];
    }
  }, [state.isSupported]);

  // Initialize voices on mount and when voices change
  useEffect(() => {
    if (!state.isSupported) return;

    loadVoices();
    
    // Some browsers load voices asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [loadVoices, state.isSupported]);

  // Truncate text intelligently
  const truncateText = useCallback((text: string): string => {
    if (text.length <= MAX_TEXT_LENGTH) return text;

    // Try each truncation pattern
    for (const pattern of TRUNCATION_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const truncated = match[1].trim();
        if (truncated.length > 50) { // Ensure we keep meaningful content
          logger.debug('TTS: Truncated text from', text.length, 'to', truncated.length, 'characters');
          return truncated + '...';
        }
      }
    }

    // Fallback: simple truncation
    const truncated = text.substring(0, MAX_TEXT_LENGTH - 3).trim();
    logger.debug('TTS: Fallback truncation from', text.length, 'to', truncated.length, 'characters');
    return truncated + '...';
  }, []);

  // Create utterance with proper configuration
  const createUtterance = useCallback((text: string, speechOptions: TextToSpeechOptions = {}) => {
    const utteranceOptions = { ...options.current, ...speechOptions };
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.rate = Math.max(0.1, Math.min(10, utteranceOptions.rate));
    utterance.pitch = Math.max(0, Math.min(2, utteranceOptions.pitch));
    utterance.volume = Math.max(0, Math.min(1, utteranceOptions.volume));
    utterance.lang = utteranceOptions.lang;
    
    if (utteranceOptions.voice) {
      utterance.voice = utteranceOptions.voice;
    }

    return utterance;
  }, []);

  // Process speech queue
  const processQueue = useCallback(() => {
    if (isProcessingQueue.current || speechQueue.current.length === 0) {
      return;
    }

    isProcessingQueue.current = true;
    const nextSpeech = speechQueue.current.shift()!;
    
    setState(prev => ({
      ...prev,
      queueLength: speechQueue.current.length,
      currentText: nextSpeech.text,
      isSpeaking: true,
      isPaused: false
    }));

    const truncatedText = truncateText(nextSpeech.text);
    const utterance = createUtterance(truncatedText, nextSpeech.options);
    currentUtterance.current = utterance;

    // Set up event handlers
    utterance.onstart = () => {
      logger.debug('TTS: Started speaking:', truncatedText.substring(0, 50) + '...');
      setState(prev => ({ ...prev, isSpeaking: true, isPaused: false }));
    };

    utterance.onend = () => {
      logger.debug('TTS: Finished speaking');
      currentUtterance.current = null;
      isProcessingQueue.current = false;
      
      setState(prev => ({
        ...prev,
        isSpeaking: false,
        isPaused: false,
        currentText: null
      }));

      // Process next item in queue
      setTimeout(() => processQueue(), 100);
    };

    utterance.onerror = (event) => {
      logger.error('TTS: Speech synthesis error:', event.error);
      currentUtterance.current = null;
      isProcessingQueue.current = false;
      
      setState(prev => ({
        ...prev,
        isSpeaking: false,
        isPaused: false,
        currentText: null
      }));

      // Try to continue with queue after error
      setTimeout(() => processQueue(), 500);
    };

    utterance.onpause = () => {
      setState(prev => ({ ...prev, isPaused: true }));
    };

    utterance.onresume = () => {
      setState(prev => ({ ...prev, isPaused: false }));
    };

    // Start speaking
    try {
      speechSynthesis.speak(utterance);
    } catch (error) {
      logger.error('TTS: Failed to speak:', error);
      utterance.onerror?.(new SpeechSynthesisErrorEvent('error', { error: 'synthesis-failed' }));
    }
  }, [truncateText, createUtterance]);

  // Speak method - adds to queue
  const speak = useCallback((text: string, speechOptions: TextToSpeechOptions = {}) => {
    if (!state.isSupported) {
      logger.warn('TTS: Speech synthesis not supported');
      return;
    }

    if (!text || text.trim().length === 0) {
      logger.warn('TTS: Empty text provided');
      return;
    }

    const speechId = `speech-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const queuedSpeech: QueuedSpeech = {
      text: text.trim(),
      options: speechOptions,
      id: speechId
    };

    speechQueue.current.push(queuedSpeech);
    
    setState(prev => ({
      ...prev,
      queueLength: speechQueue.current.length
    }));

    logger.debug('TTS: Added to queue:', text.substring(0, 50) + '...');
    
    // Start processing if not already
    processQueue();
  }, [state.isSupported, processQueue]);

  // Stop all speech immediately
  const stopSpeaking = useCallback(() => {
    if (!state.isSupported) return;

    logger.debug('TTS: Stopping speech');
    
    try {
      speechSynthesis.cancel();
    } catch (error) {
      logger.error('TTS: Error stopping speech:', error);
    }

    // Clear queue and reset state
    speechQueue.current = [];
    currentUtterance.current = null;
    isProcessingQueue.current = false;
    
    setState(prev => ({
      ...prev,
      isSpeaking: false,
      isPaused: false,
      currentText: null,
      queueLength: 0
    }));
  }, [state.isSupported]);

  // Pause current speech
  const pauseSpeaking = useCallback(() => {
    if (!state.isSupported || !state.isSpeaking) return;

    try {
      speechSynthesis.pause();
      logger.debug('TTS: Paused speech');
    } catch (error) {
      logger.error('TTS: Error pausing speech:', error);
    }
  }, [state.isSupported, state.isSpeaking]);

  // Resume paused speech
  const resumeSpeaking = useCallback(() => {
    if (!state.isSupported || !state.isPaused) return;

    try {
      speechSynthesis.resume();
      logger.debug('TTS: Resumed speech');
    } catch (error) {
      logger.error('TTS: Error resuming speech:', error);
    }
  }, [state.isSupported, state.isPaused]);

  // Clear queue without stopping current speech
  const clearQueue = useCallback(() => {
    speechQueue.current = [];
    setState(prev => ({
      ...prev,
      queueLength: 0
    }));
    logger.debug('TTS: Cleared queue');
  }, []);

  // Update speech options
  const updateOptions = useCallback((newOptions: Partial<TextToSpeechOptions>) => {
    options.current = { ...options.current, ...newOptions };
    
    if (newOptions.voice !== undefined) {
      setState(prev => ({
        ...prev,
        selectedVoice: newOptions.voice || null
      }));
    }
    
    logger.debug('TTS: Updated options:', newOptions);
  }, []);

  // Set voice by name or index
  const setVoice = useCallback((voice: SpeechSynthesisVoice | string | number | null) => {
    if (!state.isSupported || state.availableVoices.length === 0) return;

    let selectedVoice: SpeechSynthesisVoice | null = null;

    if (typeof voice === 'string') {
      // Find by name
      selectedVoice = state.availableVoices.find(v => 
        v.name.toLowerCase().includes(voice.toLowerCase()) ||
        v.lang.toLowerCase().includes(voice.toLowerCase())
      ) || null;
    } else if (typeof voice === 'number') {
      // Find by index
      selectedVoice = state.availableVoices[voice] || null;
    } else if (voice && 'name' in voice) {
      // Direct voice object
      selectedVoice = voice;
    }

    updateOptions({ voice: selectedVoice });
  }, [state.isSupported, state.availableVoices, updateOptions]);

  // Get current speech status
  const getSpeechStatus = useCallback(() => {
    if (!state.isSupported) {
      return { supported: false, speaking: false, pending: false };
    }

    return {
      supported: true,
      speaking: speechSynthesis.speaking,
      pending: speechSynthesis.pending,
      paused: speechSynthesis.paused
    };
  }, [state.isSupported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  return {
    // State
    ...state,
    
    // Methods
    speak,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    clearQueue,
    updateOptions,
    setVoice,
    getSpeechStatus,
    
    // Computed values
    canSpeak: state.isSupported && !state.isSpeaking,
    canPause: state.isSupported && state.isSpeaking && !state.isPaused,
    canResume: state.isSupported && state.isPaused,
    hasQueue: state.queueLength > 0,
    
    // Current options (readonly)
    currentOptions: { ...options.current }
  };
}