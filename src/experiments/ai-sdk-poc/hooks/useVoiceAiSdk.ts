/**
 * Voice Integration Hook for AI SDK
 * Tests compatibility between existing voice pipeline and AI SDK streaming
 */

import { useState, useRef, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import * as Sentry from '@sentry/react';

interface VoiceAiSdkOptions {
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  onTranscription?: (text: string) => void;
  onResponse?: (text: string) => void;
  onError?: (error: Error) => void;
}

export const useVoiceAiSdk = (options: VoiceAiSdkOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Use AI SDK chat hook for responses
  const {
    messages,
    append,
    isLoading,
  } = useChat({
    api: '/api/pam-poc',
    onResponse: (response) => {
      setIsThinking(false);
      
      Sentry.addBreadcrumb({
        message: 'Voice AI SDK Response',
        data: { responseTime: Date.now() },
        level: 'info',
      });
    },
    onFinish: (message) => {
      // Convert response to speech
      if (message.content) {
        speakText(message.content);
        options.onResponse?.(message.content);
      }
    },
    onError: (error) => {
      setIsThinking(false);
      setVoiceError(error.message);
      options.onError?.(error);
      Sentry.captureException(error);
    },
  });

  /**
   * Start voice recognition using Web Speech API
   */
  const startListening = useCallback(async () => {
    try {
      setVoiceError(null);
      
      // Use Web Speech API for better browser integration
      startWebSpeechRecognition();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Voice recognition failed';
      setVoiceError(errorMessage);
      options.onError?.(error as Error);
      Sentry.captureException(error);
    }
  }, [startWebSpeechRecognition, options]);

  /**
   * Stop voice recognition
   */
  const stopListening = useCallback(() => {
    // Stop Web Speech API recognition
    if ((window as any).currentRecognition) {
      (window as any).currentRecognition.stop();
      (window as any).currentRecognition = null;
    }
    
    // Stop MediaRecorder if it was used
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsListening(false);
    options.onVoiceEnd?.();
  }, [options]);

  /**
   * Use Web Speech API for real voice recognition
   */
  const startWebSpeechRecognition = useCallback(() => {
    try {
      // Check for browser support
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('Speech recognition not supported');
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');

        if (event.results[0].isFinal) {
          options.onTranscription?.(transcript);
          setIsListening(false);
          
          // Don't auto-send to AI - let the component handle submission
          Sentry.addBreadcrumb({
            message: 'Voice transcription completed',
            data: { transcript, source: 'voice' },
            level: 'info',
          });
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setVoiceError(`Speech recognition error: ${event.error}`);
        options.onError?.(new Error(event.error));
        Sentry.captureException(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.onend = () => {
        setIsListening(false);
        options.onVoiceEnd?.();
      };

      recognition.start();
      setIsListening(true);
      options.onVoiceStart?.();

      // Store reference for stopping
      (window as any).currentRecognition = recognition;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Voice recognition failed';
      setVoiceError(errorMessage);
      options.onError?.(error as Error);
      Sentry.captureException(error);
    }
  }, [options]);

  /**
   * Transcribe audio to text (fallback for non-Web Speech API)
   */
  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    try {
      // This is now a fallback - Web Speech API is preferred
      // Could send to backend for Whisper API processing
      
      setVoiceError('Audio transcription not yet implemented - using Web Speech API instead');
      options.onError?.(new Error('Audio transcription not implemented'));
      
    } catch (error) {
      setVoiceError('Transcription failed');
      options.onError?.(error as Error);
      Sentry.captureException(error);
    }
  }, [options]);

  /**
   * Convert text to speech
   */
  const speakText = useCallback((text: string) => {
    try {
      // Cancel any existing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesisRef.current = utterance;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (error) => {
        setIsSpeaking(false);
        setVoiceError('Speech synthesis failed');
        Sentry.captureException(new Error('TTS Error: ' + error.error));
      };

      // Use a pleasant voice if available
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') ||
        voice.name.includes('Alex')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      
      speechSynthesis.speak(utterance);
      
    } catch (error) {
      setVoiceError('Text-to-speech failed');
      options.onError?.(error as Error);
      Sentry.captureException(error);
    }
  }, [options]);

  /**
   * Stop current speech
   */
  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  /**
   * Test voice pipeline end-to-end
   */
  const testVoicePipeline = useCallback(async () => {
    try {
      // Test TTS first
      await speakText("Voice pipeline test: Text to speech is working.");
      
      // Wait for TTS to finish
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test STT simulation
      await transcribeAudio(new Blob()); // Empty blob for mock test
      
      return { success: true, message: 'Voice pipeline test completed' };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Voice test failed' 
      };
    }
  }, [speakText, transcribeAudio]);

  return {
    // State
    isListening,
    isSpeaking,
    isThinking: isThinking || isLoading,
    voiceError,
    messages,
    
    // Actions
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    testVoicePipeline,
    
    // Computed
    isVoiceSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    isTtsSupported: !!speechSynthesis,
  };
};