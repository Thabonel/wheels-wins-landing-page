import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';

export interface VoiceInputOptions {
  continuous?: boolean;           // Continue listening after speech stops
  interimResults?: boolean;      // Return interim results
  maxAlternatives?: number;      // Maximum number of alternatives
  lang?: string;                // Language code, e.g., 'en-US'
  autoTimeoutMs?: number;       // Auto-stop after this many ms of inactivity (0 = disabled)
}

export interface VoiceInputState {
  isSupported: boolean;
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  interimTranscript: string;
  confidence: number;
  error: string | null;
  hasPermission: boolean | null;  // null = unknown, true = granted, false = denied
}

export interface VoiceInputResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: SpeechRecognitionAlternative[];
}

const DEFAULT_OPTIONS: Required<VoiceInputOptions> = {
  continuous: false,
  interimResults: true,
  maxAlternatives: 1,
  lang: 'en-US',
  autoTimeoutMs: 60000 // Auto-stop after 60 seconds of inactivity (0 to disable)
};

// Check for browser support with proper typing
const getSpeechRecognition = (): typeof SpeechRecognition | null => {
  if (typeof window === 'undefined') return null;
  
  const SpeechRecognitionAPI = 
    (window as any).SpeechRecognition || 
    (window as any).webkitSpeechRecognition || 
    (window as any).mozSpeechRecognition || 
    (window as any).msSpeechRecognition;
    
  return SpeechRecognitionAPI || null;
};

export function useVoiceInput(
  onResult?: (result: VoiceInputResult) => void,
  onError?: (error: string) => void,
  initialOptions: VoiceInputOptions = {}
) {
  const options = useRef<Required<VoiceInputOptions>>({
    ...DEFAULT_OPTIONS,
    ...initialOptions
  });

  // State
  const [state, setState] = useState<VoiceInputState>(() => {
    const SpeechRecognitionAPI = getSpeechRecognition();
    const isSupported = !!SpeechRecognitionAPI;
    
    return {
      isSupported,
      isListening: false,
      isProcessing: false,
      transcript: '',
      interimTranscript: '',
      confidence: 0,
      error: null,
      hasPermission: null
    };
  });

  // Refs for managing recognition instance
  const recognition = useRef<SpeechRecognition | null>(null);
  const isInitialized = useRef(false);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimeoutRef = useRef<(() => void) | null>(null);

  // Initialize recognition with proper configuration
  const initializeRecognition = useCallback(() => {
    if (!state.isSupported || isInitialized.current) return;

    const SpeechRecognitionAPI = getSpeechRecognition();
    if (!SpeechRecognitionAPI) {
      logger.error('Speech Recognition API not available');
      return;
    }

    try {
      const recognitionInstance = new SpeechRecognitionAPI() as SpeechRecognition;
      
      // Configure recognition
      recognitionInstance.continuous = options.current.continuous;
      recognitionInstance.interimResults = options.current.interimResults;
      recognitionInstance.maxAlternatives = options.current.maxAlternatives;
      recognitionInstance.lang = options.current.lang;

      // Event handlers
      recognitionInstance.onstart = () => {
        logger.debug('Voice input: Recognition started');
        setState(prev => ({
          ...prev,
          isListening: true,
          isProcessing: false,
          error: null
        }));
      };

      recognitionInstance.onend = () => {
        logger.debug('Voice input: Recognition ended');
        setState(prev => ({
          ...prev,
          isListening: false,
          isProcessing: false
        }));
      };

      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';
        let confidence = 0;
        let alternatives: SpeechRecognitionAlternative[] = [];

        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;

          if (result.isFinal) {
            finalTranscript += transcript;
            confidence = result[0].confidence || 0;
            
            // Collect alternatives if available
            alternatives = Array.from(result).slice(0, options.current.maxAlternatives);
          } else {
            interimTranscript += transcript;
          }
        }

        // Update state
        setState(prev => ({
          ...prev,
          transcript: finalTranscript || prev.transcript,
          interimTranscript,
          confidence,
          isProcessing: !finalTranscript && !!interimTranscript
        }));

        // Call result callback
        if ((finalTranscript || interimTranscript) && onResult) {
          onResult({
            transcript: finalTranscript || interimTranscript,
            confidence,
            isFinal: !!finalTranscript,
            alternatives: alternatives.length > 0 ? alternatives : undefined
          });
        }

        logger.debug('Voice input result:', {
          final: finalTranscript,
          interim: interimTranscript,
          confidence
        });
      };

      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errorMessage = `Speech recognition error: ${event.error}`;
        logger.error(errorMessage, event);

        setState(prev => ({
          ...prev,
          error: errorMessage,
          isListening: false,
          isProcessing: false,
          hasPermission: event.error === 'not-allowed' ? false : prev.hasPermission
        }));

        if (onError) {
          onError(errorMessage);
        }
      };

      recognitionInstance.onaudiostart = () => {
        logger.debug('Voice input: Audio capture started');
        setState(prev => ({
          ...prev,
          hasPermission: true,
          isProcessing: true
        }));
        // Reset inactivity timer - user is actively speaking
        if (resetTimeoutRef.current) {
          resetTimeoutRef.current();
        }
      };

      recognitionInstance.onnomatch = () => {
        logger.debug('Voice input: No speech recognized');
        setState(prev => ({
          ...prev,
          error: 'No speech was recognized',
          isProcessing: false
        }));
      };

      recognition.current = recognitionInstance;
      isInitialized.current = true;

      logger.debug('Voice input: Recognition initialized');
    } catch (error) {
      const errorMessage = 'Failed to initialize speech recognition';
      logger.error(errorMessage, error);
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isSupported: false
      }));
    }
  }, [state.isSupported, onResult, onError]);

  // Initialize on mount
  useEffect(() => {
    if (state.isSupported && !isInitialized.current) {
      initializeRecognition();
    }
  }, [state.isSupported, initializeRecognition]);

  // Inactivity timeout management
  const resetInactivityTimeout = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  const startInactivityTimeout = useCallback(() => {
    // Skip if timeout is disabled
    if (!options.current.autoTimeoutMs || options.current.autoTimeoutMs <= 0) {
      return;
    }

    // Clear any existing timeout
    resetInactivityTimeout();

    // Set new timeout
    inactivityTimeoutRef.current = setTimeout(() => {
      if (recognition.current && state.isListening) {
        logger.debug('Voice input: Auto-stopping due to inactivity');
        try {
          recognition.current.stop();
          setState(prev => ({
            ...prev,
            isListening: false,
            isProcessing: false
          }));
        } catch (error) {
          logger.error('Voice input: Error auto-stopping', error);
        }
      }
    }, options.current.autoTimeoutMs);
  }, [resetInactivityTimeout, state.isListening]);

  // Keep ref updated with latest startInactivityTimeout
  useEffect(() => {
    resetTimeoutRef.current = startInactivityTimeout;
  }, [startInactivityTimeout]);

  // Start listening
  const startListening = useCallback(async () => {
    if (!state.isSupported || !recognition.current) {
      logger.warn('Voice input: Speech recognition not supported or not initialized');
      return false;
    }

    if (state.isListening) {
      logger.debug('Voice input: Already listening');
      return true;
    }

    try {
      // Check for microphone permission
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permission.state === 'denied') {
          const errorMessage = 'Microphone permission denied';
          setState(prev => ({
            ...prev,
            error: errorMessage,
            hasPermission: false
          }));
          if (onError) onError(errorMessage);
          return false;
        }
      }

      // Clear previous state
      setState(prev => ({
        ...prev,
        transcript: '',
        interimTranscript: '',
        confidence: 0,
        error: null
      }));

      recognition.current.start();
      logger.debug('Voice input: Started listening');
      // Start inactivity timeout
      startInactivityTimeout();
      return true;
    } catch (error) {
      const errorMessage = 'Failed to start speech recognition';
      logger.error(errorMessage, error);
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
      if (onError) onError(errorMessage);
      return false;
    }
  }, [state.isSupported, state.isListening, onError, startInactivityTimeout]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognition.current || !state.isListening) return;

    // Clear inactivity timeout
    resetInactivityTimeout();

    try {
      // Update state immediately for instant UI feedback
      setState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false
      }));

      recognition.current.stop();
      logger.debug('Voice input: Stopped listening');
    } catch (error) {
      logger.error('Voice input: Error stopping recognition', error);
    }
  }, [state.isListening, resetInactivityTimeout]);

  // Abort listening (immediate stop)
  const abortListening = useCallback(() => {
    if (!recognition.current) return;

    // Clear inactivity timeout
    resetInactivityTimeout();

    try {
      recognition.current.abort();
      setState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false,
        error: null
      }));
      logger.debug('Voice input: Aborted listening');
    } catch (error) {
      logger.error('Voice input: Error aborting recognition', error);
    }
  }, [resetInactivityTimeout]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      confidence: 0,
      error: null
    }));
  }, []);

  // Update options
  const updateOptions = useCallback((newOptions: Partial<VoiceInputOptions>) => {
    options.current = { ...options.current, ...newOptions };
    
    // Reinitialize if recognition exists and options changed
    if (recognition.current && !state.isListening) {
      recognition.current.continuous = options.current.continuous;
      recognition.current.interimResults = options.current.interimResults;
      recognition.current.maxAlternatives = options.current.maxAlternatives;
      recognition.current.lang = options.current.lang;
    }

    logger.debug('Voice input: Updated options', newOptions);
  }, [state.isListening]);

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    try {
      // Try to access microphone to prompt for permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Clean up
      
      setState(prev => ({
        ...prev,
        hasPermission: true,
        error: null
      }));
      
      return true;
    } catch (error) {
      const errorMessage = 'Microphone permission denied or not available';
      setState(prev => ({
        ...prev,
        hasPermission: false,
        error: errorMessage
      }));
      
      if (onError) onError(errorMessage);
      return false;
    }
  }, [onError]);

  // Cleanup on unmount
  useEffect(() => {
    // Listen for global stop requests (e.g., turning off PAM voice elsewhere)
    const handleGlobalStop = () => {
      abortListening();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('pam-voice:stop-all', handleGlobalStop as EventListener);
    }

    return () => {
      // Clear inactivity timeout
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      if (recognition.current) {
        recognition.current.abort();
        recognition.current = null;
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pam-voice:stop-all', handleGlobalStop as EventListener);
      }
    };
  }, [abortListening]);

  return {
    // State
    ...state,
    
    // Methods
    startListening,
    stopListening,
    abortListening,
    clearTranscript,
    updateOptions,
    requestPermission,
    
    // Computed values
    canStart: state.isSupported && !state.isListening && !state.isProcessing,
    canStop: state.isListening,
    hasContent: !!state.transcript || !!state.interimTranscript,
    fullTranscript: state.transcript + state.interimTranscript,
    
    // Current options (readonly)
    currentOptions: { ...options.current }
  };
}
