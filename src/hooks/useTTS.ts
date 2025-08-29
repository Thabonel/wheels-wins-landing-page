/**
 * Phase 5A: TTS Audio Playback Hook
 * Handles Text-to-Speech audio playback from PAM responses
 */

import { useCallback, useRef, useState } from 'react';

interface TTSAudio {
  audio_data: string;
  format: string;
  duration?: number;
  voice_used?: string;
  engine_used?: string;
}

interface TTSState {
  isPlaying: boolean;
  currentAudio: TTSAudio | null;
  error: string | null;
}

export const useTTS = () => {
  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    currentAudio: null,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playTTS = useCallback(async (ttsData: TTSAudio) => {
    try {
      setState(prev => ({ ...prev, error: null, currentAudio: ttsData }));

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Create audio blob from base64 data
      const audioBytes = Uint8Array.from(atob(ttsData.audio_data), c => c.charCodeAt(0));
      const mimeType = ttsData.format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
      const audioBlob = new Blob([audioBytes], { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Set up event listeners
      audio.addEventListener('loadstart', () => {
        setState(prev => ({ ...prev, isPlaying: true }));
      });

      audio.addEventListener('ended', () => {
        setState(prev => ({ ...prev, isPlaying: false, currentAudio: null }));
        URL.revokeObjectURL(audioUrl);
      });

      audio.addEventListener('error', (e) => {
        console.error('TTS Audio playback error:', e);
        setState(prev => ({ 
          ...prev, 
          isPlaying: false, 
          error: 'Failed to play TTS audio',
          currentAudio: null
        }));
        URL.revokeObjectURL(audioUrl);
      });

      // Play the audio
      await audio.play();
      console.log(`🎵 Playing TTS audio: ${ttsData.engine_used} (${ttsData.voice_used})`);

    } catch (error) {
      console.error('TTS playback failed:', error);
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        error: error instanceof Error ? error.message : 'TTS playback failed',
        currentAudio: null
      }));
    }
  }, []);

  const stopTTS = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState(prev => ({ ...prev, isPlaying: false, currentAudio: null }));
    }
  }, []);

  const toggleTTS = useCallback((ttsData?: TTSAudio) => {
    if (state.isPlaying) {
      stopTTS();
    } else if (ttsData) {
      playTTS(ttsData);
    } else if (state.currentAudio) {
      playTTS(state.currentAudio);
    }
  }, [state.isPlaying, state.currentAudio, playTTS, stopTTS]);

  return {
    ...state,
    playTTS,
    stopTTS,
    toggleTTS,
  };
};

export default useTTS;