/**
 * Voice Integration Hook for AI SDK
 * Tests compatibility between existing voice pipeline and AI SDK streaming
 */

import { useState, useRef, useCallback } from 'react';
import { useChat } from 'ai/react';
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
   * Start voice recognition
   */
  const startListening = useCallback(async () => {
    try {
      setVoiceError(null);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create MediaRecorder for audio capture
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        // Convert speech to text (mock implementation for POC)
        await transcribeAudio(audioBlob);
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      options.onVoiceStart?.();

      // Auto-stop after 10 seconds for POC
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopListening();
        }
      }, 10000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Voice recognition failed';
      setVoiceError(errorMessage);
      options.onError?.(error as Error);
      Sentry.captureException(error);
    }
  }, [options]);

  /**
   * Stop voice recognition
   */
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
    options.onVoiceEnd?.();
  }, [options]);

  /**
   * Transcribe audio to text (mock implementation for POC)
   */
  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    try {
      // Mock transcription for POC - in real implementation:
      // 1. Send audioBlob to speech-to-text API (Whisper, etc.)
      // 2. Get transcribed text back
      // 3. Process with AI SDK
      
      const mockTranscriptions = [
        "What's the weather like in San Francisco?",
        "Help me plan a trip to Yellowstone",
        "Search for RV parks near me",
        "How much did I spend on gas this month?",
        "What are the best camping spots in Colorado?",
      ];
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const transcription = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
      
      options.onTranscription?.(transcription);
      
      // Send to AI SDK for processing
      setIsThinking(true);
      await append({
        role: 'user',
        content: transcription,
      });

      Sentry.addBreadcrumb({
        message: 'Voice transcription processed',
        data: { transcription, source: 'voice' },
        level: 'info',
      });

    } catch (error) {
      setVoiceError('Transcription failed');
      options.onError?.(error as Error);
      Sentry.captureException(error);
    }
  }, [append, options]);

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