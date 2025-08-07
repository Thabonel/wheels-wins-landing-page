import { useEffect, useRef, useCallback, useState } from 'react';
import { useVoiceStore, useVoiceSettings } from '@/stores/useVoiceStore';
import { useUserSettings } from '@/hooks/useUserSettings';
import { voiceOrchestrator } from '@/services/VoiceOrchestrator';
import { createNariLabsProvider } from '@/services/tts/NariLabsProvider';
import { createBrowserTTSProvider } from '@/services/tts/BrowserTTSProvider';
import type { UseChat } from 'ai/react';

/**
 * Main voice hook that orchestrates the entire voice system
 * 
 * Implements settings-dependent initialization to fix race conditions
 * Manages connection lifecycle and integrates with Vercel AI SDK
 */
export const useVoice = (chat?: UseChat) => {
  const voiceStore = useVoiceStore();
  const { settings: voiceSettings, settingsLoaded: voiceSettingsLoaded, updateSettings: updateVoiceSettings } = useVoiceSettings();
  const { settings: userSettings, loading: userSettingsLoading } = useUserSettings();
  
  // Refs for persistent objects (prevents re-initialization on re-renders)
  const connectionRef = useRef<WebRTC​Connection | null>(null);
  const vadRef = useRef<VADService | null>(null);
  const initializationPromise = useRef<Promise<void> | null>(null);
  
  // Local state for initialization tracking
  const [initializationStatus, setInitializationStatus] = useState<
    'idle' | 'initializing' | 'initialized' | 'failed'
  >('idle');

  // Settings synchronization effect
  useEffect(() => {
    if (!userSettingsLoading && userSettings?.pam_preferences && !voiceSettingsLoaded) {
      console.log('⚙️ Synchronizing voice settings from user preferences');
      
      const pamPrefs = userSettings.pam_preferences;
      updateVoiceSettings({
        enabled: pamPrefs.voice_enabled ?? true, // Default to enabled as fallback
        voice: pamPrefs.voice_preference || 'alloy',
        rate: pamPrefs.speech_rate || 1.0,
        volume: pamPrefs.volume || 0.8,
        autoPlay: pamPrefs.auto_play ?? true,
      });
      
      voiceStore.setSettingsLoaded(true);
    }
  }, [userSettings, userSettingsLoading, voiceSettingsLoaded, updateVoiceSettings, voiceStore]);

  // Main initialization effect - waits for settings to be loaded
  useEffect(() => {
    const initializeVoiceSystem = async (): Promise<void> => {
      try {
        console.log('🎙️ Starting voice system initialization...');
        setInitializationStatus('initializing');
        voiceStore.setAgentStatus('connecting');

        // Step 1: Initialize TTS providers with fallback chain
        const providers = [
          createNariLabsProvider(), // Primary
          createBrowserTTSProvider(), // Fallback
        ];
        
        await voiceOrchestrator.initialize(providers);
        console.log('✅ Voice orchestrator initialized');

        // Step 2: Initialize WebRTC connection (placeholder for now)
        // connectionRef.current = await initializeWebRTCConnection();
        
        // Step 3: Initialize VAD service (placeholder for now)  
        // vadRef.current = await initializeVADService();

        // Step 4: Mark as initialized
        voiceStore.setConnectionId(`voice_${Date.now()}`);
        voiceStore.setAgentStatus('connected');
        setInitializationStatus('initialized');
        
        console.log('✅ Voice system initialization completed');

      } catch (error) {
        console.error('❌ Voice system initialization failed:', error);
        voiceStore.setError(`Voice initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        voiceStore.setLastError(error instanceof Error ? error : new Error(String(error)));
        setInitializationStatus('failed');
      }
    };

    // Only initialize when:
    // 1. Settings are loaded
    // 2. Voice is enabled
    // 3. Not already initialized or initializing
    const shouldInitialize = 
      voiceSettingsLoaded && 
      voiceSettings.enabled && 
      voiceStore.isVoiceEnabled &&
      initializationStatus === 'idle' &&
      !initializationPromise.current;

    if (shouldInitialize) {
      console.log('🚀 Voice initialization conditions met, starting initialization...');
      initializationPromise.current = initializeVoiceSystem();
    }

    // Cleanup when voice is disabled
    if (voiceSettingsLoaded && (!voiceSettings.enabled || !voiceStore.isVoiceEnabled)) {
      if (initializationStatus === 'initialized') {
        console.log('🔇 Voice disabled, cleaning up...');
        cleanup();
        setInitializationStatus('idle');
        initializationPromise.current = null;
      }
    }

  }, [
    voiceSettingsLoaded, 
    voiceSettings.enabled, 
    voiceStore.isVoiceEnabled, 
    initializationStatus,
    voiceStore
  ]);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up voice system...');
    
    // Cancel any ongoing speech
    voiceOrchestrator.cancelSpeech();
    
    // Clean up connections
    if (connectionRef.current) {
      connectionRef.current.disconnect();
      connectionRef.current = null;
    }
    
    if (vadRef.current) {
      vadRef.current.stop();
      vadRef.current = null;
    }
    
    // Reset store state
    voiceStore.reset();
    
  }, [voiceStore]);

  // Cleanup effect
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Main speak function - integrates with Vercel AI SDK
  const speak = useCallback(async (
    text: string, 
    options: {
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      chunkId?: string;
      fallbackToText?: boolean;
    } = {}
  ) => {
    if (initializationStatus !== 'initialized') {
      console.warn('⚠️ Voice system not initialized, cannot speak');
      return;
    }

    try {
      await voiceOrchestrator.speak(text, {
        ...options,
        fallbackToText: options.fallbackToText ?? true,
      });
    } catch (error) {
      console.error('❌ Speak failed:', error);
      voiceStore.setError(`Speech failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [initializationStatus, voiceStore]);

  // Interrupt function for barge-in
  const interrupt = useCallback(() => {
    console.log('⚠️ Voice interrupt requested');
    voiceOrchestrator.interrupt();
  }, []);

  // Mute/unmute functions
  const mute = useCallback(() => {
    voiceStore.toggleMute();
  }, [voiceStore]);

  const unmute = useCallback(() => {
    if (voiceStore.isMuted) {
      voiceStore.toggleMute();
    }
  }, [voiceStore]);

  // Connection status checker
  const isConnected = voiceStore.agentStatus === 'connected' || 
                     voiceStore.agentStatus === 'listening' || 
                     voiceStore.agentStatus === 'speaking';

  // Integration with Vercel AI SDK chat
  useEffect(() => {
    if (!chat || initializationStatus !== 'initialized') return;

    // Listen for new assistant messages from the chat
    const handleNewMessage = (message: any) => {
      if (message.role === 'assistant' && message.content && voiceSettings.autoPlay) {
        console.log('🤖 New assistant message, speaking response');
        speak(message.content, { priority: 'normal' });
      }
    };

    // This would need to be implemented based on the specific chat hook used
    // For now, it's a placeholder for the integration point
    
  }, [chat, initializationStatus, speak, voiceSettings.autoPlay]);

  // Return hook interface
  return {
    // Status
    status: voiceStore.agentStatus,
    isConnected,
    isInitialized: initializationStatus === 'initialized',
    isInitializing: initializationStatus === 'initializing',
    error: voiceStore.error,
    
    // Settings
    settings: voiceSettings,
    settingsLoaded: voiceSettingsLoaded,
    updateSettings: updateVoiceSettings,
    
    // Controls
    speak,
    interrupt,
    mute,
    unmute,
    isMuted: voiceStore.isMuted,
    
    // Queue info
    queueSize: voiceStore.audioQueue.length,
    isPlaying: voiceStore.activePlaybackId !== null,
    
    // Connection info
    connectionId: voiceStore.connectionId,
    metrics: voiceStore.metrics,
    
    // Advanced controls
    cancel: voiceOrchestrator.cancelSpeech.bind(voiceOrchestrator),
    reset: cleanup,
  };
};

// Type definitions (placeholders for future WebRTC/VAD implementation)
interface WebRTC​Connection {
  disconnect(): void;
}

interface VADService {
  stop(): void;
}