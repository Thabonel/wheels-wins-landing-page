import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useVoiceStore, type AudioQueueItem } from '@/stores/useVoiceStore';

/**
 * Centralized AudioPlayer component that manages sequential, non-overlapping audio playback
 * This is the ONLY component that should directly play audio to prevent double voice greeting
 * 
 * Based on research patterns from production voice agents
 */
export const AudioPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Selectors for optimized re-renders
  const { 
    audioQueue, 
    activePlaybackId, 
    settings,
    agentStatus,
    dequeueAudio, 
    setActivePlaybackId,
    setError,
    setAgentStatus
  } = useVoiceStore((state) => ({
    audioQueue: state.audioQueue,
    activePlaybackId: state.activePlaybackId,
    settings: state.settings,
    agentStatus: state.agentStatus,
    dequeueAudio: state.dequeueAudio,
    setActivePlaybackId: state.setActivePlaybackId,
    setError: state.setError,
    setAgentStatus: state.setAgentStatus
  }));

  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Cleanup function for blob URLs to prevent memory leaks
  const cleanupBlobUrl = useCallback(() => {
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }
  }, []);

  // Clear any pending timeouts
  const clearPlaybackTimeout = useCallback(() => {
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
  }, []);

  // Convert audio data to playable format
  const prepareAudioForPlayback = useCallback(async (item: AudioQueueItem): Promise<string> => {
    try {
      if (typeof item.audioData === 'string') {
        // Already a blob URL or data URL
        return item.audioData;
      }
      
      if (item.audioData instanceof ArrayBuffer) {
        // Convert ArrayBuffer to blob URL
        const audioBlob = new Blob([item.audioData], { 
          type: 'audio/mp3' // Adjust MIME type based on actual audio format
        });
        const blobUrl = URL.createObjectURL(audioBlob);
        currentBlobUrlRef.current = blobUrl;
        return blobUrl;
      }
      
      throw new Error('Unsupported audio data format');
    } catch (error) {
      console.error('❌ Failed to prepare audio for playback:', error);
      throw error;
    }
  }, []);

  // Attempt to play audio with retry logic
  const attemptPlayback = useCallback(async (audioUrl: string): Promise<void> => {
    if (!audioRef.current) {
      throw new Error('Audio element not available');
    }

    const audio = audioRef.current;
    
    try {
      // Configure audio element
      audio.src = audioUrl;
      audio.volume = settings.volume;
      audio.playbackRate = settings.rate;
      
      // Ensure audio context is resumed (handles autoplay policies)
      if (audio.audioContext && audio.audioContext.state === 'suspended') {
        await audio.audioContext.resume();
      }
      
      // Attempt playback
      const playPromise = audio.play();
      
      // Handle browsers that return a promise from play()
      if (playPromise !== undefined) {
        await playPromise;
      }
      
      console.log('🎵 Audio playback started successfully');
      setRetryCount(0); // Reset retry count on success
      
    } catch (error) {
      console.error('❌ Audio playback failed:', error);
      throw error;
    }
  }, [settings.volume, settings.rate]);

  // Main playback function with error handling and retry logic
  const playAudioItem = useCallback(async (item: AudioQueueItem) => {
    try {
      console.log(`🎵 Playing audio item: ${item.id} (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      const audioUrl = await prepareAudioForPlayback(item);
      await attemptPlayback(audioUrl);
      
    } catch (error) {
      console.error(`❌ Playback error for item ${item.id}:`, error);
      
      if (retryCount < maxRetries) {
        // Exponential backoff retry
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        console.log(`🔄 Retrying playback in ${retryDelay}ms...`);
        
        setRetryCount(prev => prev + 1);
        
        playbackTimeoutRef.current = setTimeout(() => {
          playAudioItem(item);
        }, retryDelay);
        
        return;
      }
      
      // Max retries reached - handle graceful failure
      console.error(`❌ Max retries reached for audio item ${item.id}, skipping`);
      setError(`Audio playback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Move to next item in queue
      handlePlaybackComplete();
    }
  }, [retryCount, maxRetries, prepareAudioForPlayback, attemptPlayback, setError]);

  // Handle playback completion (success or failure)
  const handlePlaybackComplete = useCallback(() => {
    console.log(`🎵 Audio playback completed: ${activePlaybackId}`);
    
    // Cleanup
    cleanupBlobUrl();
    clearPlaybackTimeout();
    setRetryCount(0);
    
    // Update state to signal completion
    setActivePlaybackId(null);
    
    // Update agent status if transitioning from speaking
    if (agentStatus === 'speaking') {
      setAgentStatus('connected');
    }
    
    // The useEffect will automatically handle playing the next item
  }, [activePlaybackId, agentStatus, cleanupBlobUrl, clearPlaybackTimeout, setActivePlaybackId, setAgentStatus]);

  // Handle playback errors
  const handlePlaybackError = useCallback((error: Event) => {
    const audio = audioRef.current;
    const errorMessage = audio?.error ? 
      `Audio error: ${audio.error.code} - ${audio.error.message}` : 
      'Unknown audio error';
    
    console.error('❌ HTML5 Audio error:', errorMessage);
    
    // Trigger retry logic
    if (activePlaybackId && retryCount < maxRetries) {
      const currentItem = audioQueue.find(item => item.id === activePlaybackId);
      if (currentItem) {
        playAudioItem(currentItem);
      }
    } else {
      handlePlaybackComplete();
    }
  }, [activePlaybackId, audioQueue, retryCount, maxRetries, playAudioItem, handlePlaybackComplete]);

  // Main effect: manages the audio queue processing
  useEffect(() => {
    // Only process queue if nothing is currently playing and queue has items
    if (!activePlaybackId && audioQueue.length > 0 && settings.enabled) {
      const nextItem = dequeueAudio();
      
      if (nextItem) {
        console.log(`🎵 Starting playback of next item: ${nextItem.id}`);
        setActivePlaybackId(nextItem.id);
        
        // Small delay to ensure state is updated before playback
        setTimeout(() => {
          playAudioItem(nextItem);
        }, 10);
      }
    }
  }, [audioQueue.length, activePlaybackId, settings.enabled, dequeueAudio, setActivePlaybackId, playAudioItem]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      cleanupBlobUrl();
      clearPlaybackTimeout();
    };
  }, [cleanupBlobUrl, clearPlaybackTimeout]);

  // Audio element event handlers
  const handleLoadStart = useCallback(() => {
    console.log('🎵 Audio loading started');
  }, []);

  const handleCanPlay = useCallback(() => {
    console.log('🎵 Audio can start playing');
  }, []);

  const handlePlay = useCallback(() => {
    console.log('🎵 Audio playback began');
  }, []);

  const handlePause = useCallback(() => {
    console.log('🎵 Audio playback paused');
  }, []);

  const handleEnded = useCallback(() => {
    console.log('🎵 Audio playback ended naturally');
    handlePlaybackComplete();
  }, [handlePlaybackComplete]);

  const handleStalled = useCallback(() => {
    console.warn('⚠️ Audio playback stalled');
  }, []);

  const handleAbort = useCallback(() => {
    console.log('🎵 Audio playback aborted');
    handlePlaybackComplete();
  }, [handlePlaybackComplete]);

  return (
    <audio
      ref={audioRef}
      onLoadStart={handleLoadStart}
      onCanPlay={handleCanPlay}
      onPlay={handlePlay}
      onPause={handlePause}
      onEnded={handleEnded}
      onError={handlePlaybackError}
      onStalled={handleStalled}
      onAbort={handleAbort}
      preload="none" // Only load when needed to save bandwidth
      style={{ display: 'none' }} // Hidden audio element
      // Security and performance attributes
      crossOrigin="anonymous" // For CORS if needed
      controlsList="nodownload nofullscreen noremoteplayback"
    />
  );
};

export default AudioPlayer;