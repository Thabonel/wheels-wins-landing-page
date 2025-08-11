/**
 * Browser Speech-to-Text Hook
 * Uses Web Speech API for real-time speech recognition
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// Browser Speech Recognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onstart: () => void;
  onend: () => void;
  onspeechstart: () => void;
  onspeechend: () => void;
  onnomatch: () => void;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Get the browser's SpeechRecognition API
const getSpeechRecognition = (): typeof SpeechRecognition | null => {
  if (typeof window === 'undefined') return null;
  
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
};

export interface BrowserSTTState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  confidence: number;
}

export interface BrowserSTTOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  maxAlternatives?: number;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export const useBrowserSTT = (options: BrowserSTTOptions = {}) => {
  const [state, setState] = useState<BrowserSTTState>({
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    isSupported: false,
    confidence: 0,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const SpeechRecognitionClass = useRef<typeof SpeechRecognition | null>(null);

  // Check browser support
  useEffect(() => {
    SpeechRecognitionClass.current = getSpeechRecognition();
    const isSupported = SpeechRecognitionClass.current !== null;
    setState(prev => ({ ...prev, isSupported }));
  }, []);

  // Initialize recognition
  const initializeRecognition = useCallback(() => {
    if (!SpeechRecognitionClass.current) {
      setState(prev => ({ 
        ...prev, 
        error: 'Speech recognition not supported in this browser' 
      }));
      return null;
    }

    const recognition = new SpeechRecognitionClass.current() as SpeechRecognition;
    
    // Configure recognition
    recognition.continuous = options.continuous ?? true;
    recognition.interimResults = options.interimResults ?? true;
    recognition.lang = options.language ?? 'en-US';
    recognition.maxAlternatives = options.maxAlternatives ?? 1;

    // Handle results
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let totalConfidence = 0;
      let confidenceCount = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alternative = result[0];
        
        if (result.isFinal) {
          finalTranscript += alternative.transcript;
          if (alternative.confidence) {
            totalConfidence += alternative.confidence;
            confidenceCount++;
          }
        } else {
          interimTranscript += alternative.transcript;
        }
      }

      const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

      setState(prev => ({
        ...prev,
        transcript: prev.transcript + finalTranscript,
        interimTranscript,
        confidence: avgConfidence,
        error: null,
      }));

      // Callback for final results
      if (finalTranscript) {
        options.onResult?.(finalTranscript, true);
      } else if (interimTranscript) {
        options.onResult?.(interimTranscript, false);
      }
    };

    // Handle errors
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = 'Speech recognition error';
      
      switch (event.error) {
        case 'network':
          errorMessage = 'Network error occurred';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected';
          break;
        case 'aborted':
          errorMessage = 'Recognition aborted';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found';
          break;
        case 'language-not-supported':
          errorMessage = `Language ${options.language} not supported`;
          break;
        default:
          errorMessage = event.message || event.error;
      }

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isListening: false,
      }));

      options.onError?.(errorMessage);
    };

    // Handle start
    recognition.onstart = () => {
      setState(prev => ({
        ...prev,
        isListening: true,
        error: null,
      }));
      options.onStart?.();
    };

    // Handle end
    recognition.onend = () => {
      setState(prev => ({
        ...prev,
        isListening: false,
      }));
      options.onEnd?.();
    };

    // Handle no match
    recognition.onnomatch = () => {
      setState(prev => ({
        ...prev,
        error: 'No speech match found',
      }));
    };

    return recognition;
  }, [options]);

  // Start listening
  const startListening = useCallback(() => {
    if (!state.isSupported) {
      setState(prev => ({ 
        ...prev, 
        error: 'Speech recognition not supported' 
      }));
      return;
    }

    // Initialize if needed
    if (!recognitionRef.current) {
      recognitionRef.current = initializeRecognition();
    }

    if (recognitionRef.current) {
      try {
        // Clear previous transcripts
        setState(prev => ({
          ...prev,
          transcript: '',
          interimTranscript: '',
          error: null,
          confidence: 0,
        }));

        recognitionRef.current.start();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start recognition';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isListening: false,
        }));
      }
    }
  }, [state.isSupported, initializeRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && state.isListening) {
      recognitionRef.current.stop();
    }
  }, [state.isListening]);

  // Abort listening
  const abortListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      setState(prev => ({
        ...prev,
        isListening: false,
        interimTranscript: '',
      }));
    }
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      confidence: 0,
      error: null,
    }));
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current && state.isListening) {
        recognitionRef.current.abort();
      }
    };
  }, [state.isListening]);

  return {
    state,
    startListening,
    stopListening,
    abortListening,
    clearTranscript,
  };
};