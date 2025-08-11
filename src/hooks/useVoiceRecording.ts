/**
 * Voice Recording Hook
 * Provides voice recording functionality with Web Audio API
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export interface VoiceRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  error: string | null;
  isSupported: boolean;
}

export interface VoiceRecordingOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  onDataAvailable?: (blob: Blob) => void;
  onStop?: (blob: Blob) => void;
  onError?: (error: Error) => void;
}

export const useVoiceRecording = (options: VoiceRecordingOptions = {}) => {
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    error: null,
    isSupported: false,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support
  useEffect(() => {
    const isSupported = !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    );
    setState(prev => ({ ...prev, isSupported }));
  }, []);

  // Update duration while recording
  useEffect(() => {
    if (state.isRecording && !state.isPaused) {
      durationIntervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          duration: Date.now() - startTimeRef.current,
        }));
      }, 100);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [state.isRecording, state.isPaused]);

  const startRecording = useCallback(async () => {
    if (!state.isSupported) {
      const error = 'Voice recording is not supported in this browser';
      setState(prev => ({ ...prev, error }));
      options.onError?.(new Error(error));
      return;
    }

    try {
      // Reset state
      audioChunksRef.current = [];
      setState(prev => ({
        ...prev,
        error: null,
        audioBlob: null,
        duration: 0,
      }));

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: options.echoCancellation ?? true,
          noiseSuppression: options.noiseSuppression ?? true,
          autoGainControl: options.autoGainControl ?? true,
        },
      });

      streamRef.current = stream;

      // Determine supported mime type
      const mimeType = options.mimeType || 
        (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
         MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' :
         'audio/wav');

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: options.audioBitsPerSecond || 128000,
      });

      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          options.onDataAvailable?.(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setState(prev => ({
          ...prev,
          audioBlob,
          isRecording: false,
          isPaused: false,
        }));
        options.onStop?.(audioBlob);

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // Handle errors
      mediaRecorder.onerror = (event: Event) => {
        const error = `Recording error: ${(event as any).error}`;
        setState(prev => ({
          ...prev,
          error,
          isRecording: false,
          isPaused: false,
        }));
        options.onError?.(new Error(error));

        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();
      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isRecording: false,
      }));
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [state.isSupported, options]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, [state.isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, [state.isRecording, state.isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false }));
      startTimeRef.current = Date.now() - state.duration;
    }
  }, [state.isRecording, state.isPaused, state.duration]);

  const getAudioURL = useCallback(() => {
    if (state.audioBlob) {
      return URL.createObjectURL(state.audioBlob);
    }
    return null;
  }, [state.audioBlob]);

  const clearRecording = useCallback(() => {
    setState(prev => ({
      ...prev,
      audioBlob: null,
      duration: 0,
      error: null,
    }));
    audioChunksRef.current = [];
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && state.isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [state.isRecording]);

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    getAudioURL,
  };
};