import { useState, useEffect, useCallback, useRef } from 'react';
import { useTextToSpeech, type TextToSpeechOptions } from './useTextToSpeech';
import { useVoiceInput, type VoiceInputOptions, type VoiceInputResult } from './useVoiceInput';
import {
  getMobileInfo,
  isInBackground,
  addVisibilityChangeListener,
  addOrientationChangeListener,
  isVirtualKeyboardOpen,
  unlockAudioContextIOS,
  checkSpeechSynthesisSupport,
  checkSpeechRecognitionSupport,
  type MobileInfo
} from '@/lib/mobile';
import { logger } from '@/lib/logger';

export interface MobileVoiceOptions {
  ttsOptions?: TextToSpeechOptions;
  voiceInputOptions?: VoiceInputOptions;
  pauseOnBackground?: boolean;
  resumeOnForeground?: boolean;
  handleOrientationChange?: boolean;
  unlockAudioOnInteraction?: boolean;
}

export interface MobileVoiceState {
  mobileInfo: MobileInfo;
  isSupported: boolean;
  ttsSupported: boolean;
  voiceInputSupported: boolean;
  isInBackground: boolean;
  isPortrait: boolean;
  keyboardOpen: boolean;
  audioUnlocked: boolean;
}

export function useMobileVoice(
  options: MobileVoiceOptions = {},
  onVoiceResult?: (result: VoiceInputResult) => void,
  onVoiceError?: (error: string) => void
) {
  const {
    ttsOptions = {},
    voiceInputOptions = {},
    pauseOnBackground = true,
    resumeOnForeground = true,
    handleOrientationChange = true,
    unlockAudioOnInteraction = true
  } = options;

  // Mobile state
  const [mobileState, setMobileState] = useState<MobileVoiceState>(() => {
    const mobileInfo = getMobileInfo();
    return {
      mobileInfo,
      isSupported: mobileInfo.isMobile && (checkSpeechSynthesisSupport() || checkSpeechRecognitionSupport()),
      ttsSupported: checkSpeechSynthesisSupport(),
      voiceInputSupported: checkSpeechRecognitionSupport(),
      isInBackground: isInBackground(),
      isPortrait: true, // Will be updated
      keyboardOpen: false,
      audioUnlocked: !mobileInfo.isIOS || !mobileInfo.isSafari
    };
  });

  // Refs for cleanup
  const visibilityCleanup = useRef<(() => void) | null>(null);
  const orientationCleanup = useRef<(() => void) | null>(null);
  const keyboardCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const wasPlayingBeforeBackground = useRef<boolean>(false);

  // Initialize voice hooks
  const tts = useTextToSpeech({
    ...ttsOptions,
    // Mobile-specific TTS optimizations
    rate: mobileState.mobileInfo.isIOS ? Math.min(ttsOptions.rate || 1.0, 2.0) : ttsOptions.rate,
    volume: mobileState.mobileInfo.isAndroid ? Math.max(ttsOptions.volume || 0.8, 0.3) : ttsOptions.volume
  });

  const voiceInput = useVoiceInput(
    useCallback((result: VoiceInputResult) => {
      // Handle mobile-specific result processing
      if (mobileState.keyboardOpen && result.isFinal) {
        // Give keyboard time to close before processing
        setTimeout(() => {
          onVoiceResult?.(result);
        }, 300);
      } else {
        onVoiceResult?.(result);
      }
    }, [mobileState.keyboardOpen, onVoiceResult]),
    
    useCallback((error: string) => {
      // Handle mobile-specific errors
      if (error.includes('not-allowed') && mobileState.mobileInfo.isIOS) {
        onVoiceError?.('Microphone permission required. Please allow access in Safari settings.');
      } else if (error.includes('network') && mobileState.mobileInfo.isAndroid) {
        onVoiceError?.('Network error. Please check your internet connection and try again.');
      } else {
        onVoiceError?.(error);
      }
    }, [mobileState.mobileInfo, onVoiceError]),
    
    {
      ...voiceInputOptions,
      // Mobile-specific voice input optimizations
      continuous: mobileState.mobileInfo.isAndroid ? false : voiceInputOptions.continuous, // Android works better with non-continuous
      interimResults: voiceInputOptions.interimResults !== false // Default to true for better UX
    }
  );

  // Handle audio context unlock for iOS
  const unlockAudio = useCallback(async (): Promise<boolean> => {
    if (mobileState.audioUnlocked || !unlockAudioOnInteraction) return true;
    if (!mobileState.mobileInfo.isIOS) return true;

    try {
      const unlocked = await unlockAudioContextIOS();
      setMobileState(prev => ({ ...prev, audioUnlocked: unlocked }));
      logger.debug('Mobile Voice: Audio context unlocked:', unlocked);
      return unlocked;
    } catch (error) {
      logger.error('Mobile Voice: Failed to unlock audio context:', error);
      return false;
    }
  }, [mobileState.audioUnlocked, mobileState.mobileInfo.isIOS, unlockAudioOnInteraction]);

  // Mobile-optimized speak function
  const speak = useCallback(async (text: string, options?: TextToSpeechOptions) => {
    if (!mobileState.ttsSupported) return;

    // Unlock audio context if needed
    if (mobileState.mobileInfo.isIOS && !mobileState.audioUnlocked) {
      const unlocked = await unlockAudio();
      if (!unlocked) {
        logger.warn('Mobile Voice: Cannot speak - audio context not unlocked');
        return;
      }
    }

    // Don't speak if app is in background (unless explicitly allowed)
    if (mobileState.isInBackground && pauseOnBackground) {
      logger.debug('Mobile Voice: Skipping TTS - app in background');
      return;
    }

    // Handle virtual keyboard
    if (mobileState.keyboardOpen) {
      // Wait for keyboard to close
      setTimeout(() => {
        tts.speak(text, options);
      }, 300);
    } else {
      tts.speak(text, options);
    }
  }, [mobileState, tts.speak, unlockAudio, pauseOnBackground]);

  // Mobile-optimized voice input start
  const startListening = useCallback(async () => {
    if (!mobileState.voiceInputSupported) return false;

    // Unlock audio context if needed (iOS requires this for microphone access)
    if (mobileState.mobileInfo.isIOS && !mobileState.audioUnlocked) {
      await unlockAudio();
    }

    // Don't start listening if keyboard is open
    if (mobileState.keyboardOpen) {
      logger.debug('Mobile Voice: Cannot start listening - keyboard open');
      return false;
    }

    // Stop any current TTS before starting voice input
    if (tts.isSpeaking) {
      tts.stopSpeaking();
    }

    return await voiceInput.startListening();
  }, [mobileState, voiceInput.startListening, unlockAudio, tts]);

  // Handle visibility changes (background/foreground)
  useEffect(() => {
    if (!mobileState.mobileInfo.isMobile) return;

    const cleanup = addVisibilityChangeListener((isVisible) => {
      setMobileState(prev => ({ ...prev, isInBackground: !isVisible }));

      if (!isVisible && pauseOnBackground) {
        // App went to background
        wasPlayingBeforeBackground.current = tts.isSpeaking;
        if (tts.isSpeaking) {
          tts.stopSpeaking();
          logger.debug('Mobile Voice: Paused TTS - app backgrounded');
        }
        if (voiceInput.isListening) {
          voiceInput.stopListening();
          logger.debug('Mobile Voice: Stopped voice input - app backgrounded');
        }
      } else if (isVisible && resumeOnForeground) {
        // App came to foreground
        logger.debug('Mobile Voice: App foregrounded');
        // Note: We don't auto-resume TTS as the context may have changed
      }
    });

    visibilityCleanup.current = cleanup;
    return cleanup;
  }, [mobileState.mobileInfo.isMobile, pauseOnBackground, resumeOnForeground, tts, voiceInput]);

  // Handle orientation changes
  useEffect(() => {
    if (!mobileState.mobileInfo.isMobile || !handleOrientationChange) return;

    const cleanup = addOrientationChangeListener((isPortrait) => {
      setMobileState(prev => ({ ...prev, isPortrait }));
      logger.debug('Mobile Voice: Orientation changed to', isPortrait ? 'portrait' : 'landscape');

      // Stop voice input on orientation change to avoid issues
      if (voiceInput.isListening) {
        voiceInput.stopListening();
        logger.debug('Mobile Voice: Stopped voice input due to orientation change');
      }
    });

    orientationCleanup.current = cleanup;
    return cleanup;
  }, [mobileState.mobileInfo.isMobile, handleOrientationChange, voiceInput]);

  // Monitor virtual keyboard state
  useEffect(() => {
    if (!mobileState.mobileInfo.isMobile) return;

    const checkKeyboard = () => {
      const keyboardOpen = isVirtualKeyboardOpen();
      setMobileState(prev => {
        if (prev.keyboardOpen !== keyboardOpen) {
          logger.debug('Mobile Voice: Keyboard state changed:', keyboardOpen ? 'open' : 'closed');
          
          // Stop voice input when keyboard opens
          if (keyboardOpen && voiceInput.isListening) {
            voiceInput.stopListening();
          }
          
          return { ...prev, keyboardOpen };
        }
        return prev;
      });
    };

    // Check keyboard state periodically
    keyboardCheckInterval.current = setInterval(checkKeyboard, 500);
    
    return () => {
      if (keyboardCheckInterval.current) {
        clearInterval(keyboardCheckInterval.current);
      }
    };
  }, [mobileState.mobileInfo.isMobile, voiceInput]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      visibilityCleanup.current?.();
      orientationCleanup.current?.();
      if (keyboardCheckInterval.current) {
        clearInterval(keyboardCheckInterval.current);
      }
    };
  }, []);

  return {
    // Mobile state
    ...mobileState,
    
    // TTS functionality (mobile-optimized)
    speak,
    stopSpeaking: tts.stopSpeaking,
    pauseSpeaking: tts.pauseSpeaking,
    resumeSpeaking: tts.resumeSpeaking,
    isSpeaking: tts.isSpeaking,
    isPaused: tts.isPaused,
    
    // Voice input functionality (mobile-optimized)
    startListening,
    stopListening: voiceInput.stopListening,
    abortListening: voiceInput.abortListening,
    isListening: voiceInput.isListening,
    isProcessing: voiceInput.isProcessing,
    transcript: voiceInput.transcript,
    interimTranscript: voiceInput.interimTranscript,
    confidence: voiceInput.confidence,
    error: voiceInput.error,
    
    // Mobile-specific methods
    unlockAudio,
    
    // Computed states
    canSpeak: mobileState.ttsSupported && !mobileState.isInBackground && !tts.isSpeaking,
    canListen: mobileState.voiceInputSupported && !mobileState.keyboardOpen && !voiceInput.isListening && mobileState.audioUnlocked,
    shouldShowKeyboardHint: mobileState.keyboardOpen && voiceInput.isListening,
    shouldShowOrientationHint: !mobileState.isPortrait && voiceInput.isListening,
    
    // Original hook instances for advanced usage
    tts,
    voiceInput
  };
}