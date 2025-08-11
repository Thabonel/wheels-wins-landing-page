import { create } from 'zustand';

// Type definitions for voice agent state machine
export type AgentStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'interrupted' | 'error';

export type VoiceActivationMode = 'manual' | 'push_to_talk' | 'continuous' | 'wake_word';

export interface AudioQueueItem {
  id: string;
  audioData: ArrayBuffer | string; // ArrayBuffer for binary, string for blob URL
  text?: string; // Optional text content for debugging/fallback
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: number;
  chunkId?: string; // For tracking server-side chunks
}

export interface VoiceSettings {
  enabled: boolean;
  voice: string;
  rate: number;
  volume: number;
  autoPlay: boolean;
  vadThreshold: number;
  endpointingSilenceDuration: number; // ms
  enableEchoCancellation: boolean;
  enableNoiseSuppression: boolean;
  enableWebRTC?: boolean; // Optional WebRTC support
}

export interface ConnectionMetrics {
  latency: number; // ms
  packetsLost: number;
  jitterBufferSize: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
}

interface VoiceState {
  // Core state
  agentStatus: AgentStatus;
  activationMode: VoiceActivationMode;
  isMuted: boolean;
  isVoiceEnabled: boolean;
  
  // Audio queue management
  audioQueue: AudioQueueItem[];
  activePlaybackId: string | null;
  
  // Connection and performance
  connectionId: string | null;
  metrics: ConnectionMetrics | null;
  
  // Error handling
  error: string | null;
  lastError: Error | null;
  reconnectAttempts: number;
  
  // VAD state
  isUserSpeaking: boolean;
  speechStartTime: number | null;
  speechEndTime: number | null;
  
  // Settings
  settings: VoiceSettings;
  settingsLoaded: boolean;

  // Actions for state management
  setAgentStatus: (status: AgentStatus) => void;
  setActivationMode: (mode: VoiceActivationMode) => void;
  toggleMute: () => void;
  setVoiceEnabled: (isEnabled: boolean) => void;
  
  // Audio queue actions
  enqueueAudio: (item: Omit<AudioQueueItem, 'timestamp'>) => void;
  dequeueAudio: () => AudioQueueItem | null;
  clearAudioQueue: () => void;
  setActivePlaybackId: (id: string | null) => void;
  
  // Connection management
  setConnectionId: (id: string | null) => void;
  updateMetrics: (metrics: Partial<ConnectionMetrics>) => void;
  
  // Error handling
  setError: (error: string | null) => void;
  setLastError: (error: Error | null) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  
  // VAD actions
  setUserSpeaking: (speaking: boolean) => void;
  setSpeechTimes: (startTime: number | null, endTime?: number | null) => void;
  
  // Settings management
  updateSettings: (settings: Partial<VoiceSettings>) => void;
  setSettingsLoaded: (loaded: boolean) => void;
  
  // Interrupt handling
  handleInterrupt: () => void;
  
  // Utility actions
  reset: () => void;
}

// Default settings following research best practices
const DEFAULT_SETTINGS: VoiceSettings = {
  enabled: true,
  voice: 'alloy',
  rate: 1.0,
  volume: 0.8,
  autoPlay: true,
  vadThreshold: 0.6, // Silero VAD threshold
  endpointingSilenceDuration: 800, // ms - optimized for natural conversation
  enableEchoCancellation: true,
  enableNoiseSuppression: true,
};

export const useVoiceStore = create<VoiceState>((set, get) => ({
  // Initial state
  agentStatus: 'idle',
  activationMode: 'manual',
  isMuted: false,
  isVoiceEnabled: false, // Will be set based on loaded settings
  
  audioQueue: [],
  activePlaybackId: null,
  
  connectionId: null,
  metrics: null,
  
  error: null,
  lastError: null,
  reconnectAttempts: 0,
  
  isUserSpeaking: false,
  speechStartTime: null,
  speechEndTime: null,
  
  settings: DEFAULT_SETTINGS,
  settingsLoaded: false,

  // Actions implementation
  setAgentStatus: (status) => {
    console.log(`🎙️ Agent status change: ${get().agentStatus} → ${status}`);
    set({ agentStatus: status });
    
    // Clear errors when successfully connecting
    if (status === 'connected') {
      set({ error: null, lastError: null });
      get().resetReconnectAttempts();
    }
  },

  setActivationMode: (mode) => {
    console.log(`🎯 Activation mode change: ${get().activationMode} → ${mode}`);
    set({ activationMode: mode });
  },

  toggleMute: () => {
    const newMuted = !get().isMuted;
    console.log(`🔇 Mute toggled: ${newMuted}`);
    set({ isMuted: newMuted });
  },

  setVoiceEnabled: (isEnabled) => {
    console.log(`🎵 Voice enabled changed: ${get().isVoiceEnabled} → ${isEnabled}`);
    set({ 
      isVoiceEnabled: isEnabled,
      settings: { ...get().settings, enabled: isEnabled }
    });
    
    // Reset to idle if disabling voice
    if (!isEnabled) {
      set({ agentStatus: 'idle' });
      get().clearAudioQueue();
    }
  },

  enqueueAudio: (item) => {
    const queueItem: AudioQueueItem = {
      ...item,
      timestamp: Date.now(),
    };
    
    console.log(`🎵 Audio enqueued: ${queueItem.id} (priority: ${queueItem.priority || 'normal'})`);
    
    set((state) => {
      // Sort by priority: urgent > high > normal > low
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      const newQueue = [...state.audioQueue, queueItem].sort((a, b) => {
        const aPriority = priorityOrder[a.priority || 'normal'];
        const bPriority = priorityOrder[b.priority || 'normal'];
        return aPriority - bPriority;
      });
      
      return { audioQueue: newQueue };
    });
  },

  dequeueAudio: () => {
    const state = get();
    if (state.audioQueue.length === 0) return null;
    
    const [nextItem, ...remainingQueue] = state.audioQueue;
    console.log(`🎵 Audio dequeued: ${nextItem.id}`);
    
    set({ audioQueue: remainingQueue });
    return nextItem;
  },

  clearAudioQueue: () => {
    const queueSize = get().audioQueue.length;
    if (queueSize > 0) {
      console.log(`🗑️ Audio queue cleared: ${queueSize} items removed`);
    }
    set({ 
      audioQueue: [], 
      activePlaybackId: null,
      agentStatus: get().agentStatus === 'speaking' ? 'listening' : get().agentStatus
    });
  },

  setActivePlaybackId: (id) => {
    const current = get().activePlaybackId;
    if (current !== id) {
      console.log(`🎵 Active playback changed: ${current} → ${id}`);
      set({ activePlaybackId: id });
      
      // Update agent status based on playback state
      if (id && get().agentStatus !== 'speaking') {
        set({ agentStatus: 'speaking' });
      } else if (!id && get().agentStatus === 'speaking') {
        set({ agentStatus: 'connected' });
      }
    }
  },

  setConnectionId: (id) => {
    console.log(`🔗 Connection ID changed: ${get().connectionId} → ${id}`);
    set({ connectionId: id });
  },

  updateMetrics: (metrics) => {
    set((state) => ({
      metrics: { ...state.metrics, ...metrics } as ConnectionMetrics
    }));
  },

  setError: (error) => {
    if (error !== get().error) {
      console.error(`❌ Voice error: ${error}`);
      set({ 
        error, 
        agentStatus: error ? 'error' : get().agentStatus 
      });
    }
  },

  setLastError: (error) => {
    set({ lastError: error });
    if (error) {
      console.error('❌ Voice system error:', error);
    }
  },

  incrementReconnectAttempts: () => {
    const attempts = get().reconnectAttempts + 1;
    console.log(`🔄 Reconnect attempt: ${attempts}`);
    set({ reconnectAttempts: attempts });
  },

  resetReconnectAttempts: () => {
    if (get().reconnectAttempts > 0) {
      console.log('✅ Reconnection attempts reset');
      set({ reconnectAttempts: 0 });
    }
  },

  setUserSpeaking: (speaking) => {
    if (speaking !== get().isUserSpeaking) {
      console.log(`🗣️ User speaking: ${speaking}`);
      set({ isUserSpeaking: speaking });
    }
  },

  setSpeechTimes: (startTime, endTime = null) => {
    set({ 
      speechStartTime: startTime,
      speechEndTime: endTime
    });
  },

  updateSettings: (newSettings) => {
    const currentSettings = get().settings;
    const updatedSettings = { ...currentSettings, ...newSettings };
    
    console.log('⚙️ Voice settings updated:', newSettings);
    set({ settings: updatedSettings });
    
    // Update voice enabled state if settings change it
    if ('enabled' in newSettings) {
      set({ isVoiceEnabled: newSettings.enabled! });
    }
  },

  setSettingsLoaded: (loaded) => {
    console.log(`⚙️ Settings loaded: ${loaded}`);
    set({ settingsLoaded: loaded });
  },

  handleInterrupt: () => {
    const state = get();
    console.log('⚠️ Voice interrupt triggered');
    
    // Immediate actions for natural interruption
    get().clearAudioQueue();
    set({ 
      agentStatus: 'listening',
      isUserSpeaking: true,
      speechStartTime: Date.now()
    });
  },

  reset: () => {
    console.log('🔄 Voice store reset');
    set({
      agentStatus: 'idle',
      activationMode: 'manual',
      isMuted: false,
      audioQueue: [],
      activePlaybackId: null,
      connectionId: null,
      metrics: null,
      error: null,
      lastError: null,
      reconnectAttempts: 0,
      isUserSpeaking: false,
      speechStartTime: null,
      speechEndTime: null,
      // Keep settings and settingsLoaded as they persist across resets
    });
  },
}));

// Selectors for optimized component subscriptions
export const useVoiceStatus = () => useVoiceStore((state) => state.agentStatus);
export const useVoiceQueue = () => useVoiceStore((state) => ({
  queue: state.audioQueue,
  activePlaybackId: state.activePlaybackId,
  enqueueAudio: state.enqueueAudio,
  clearQueue: state.clearAudioQueue,
}));
export const useVoiceSettings = () => useVoiceStore((state) => ({
  settings: state.settings,
  settingsLoaded: state.settingsLoaded,
  updateSettings: state.updateSettings,
}));
export const useVoiceConnection = () => useVoiceStore((state) => ({
  status: state.agentStatus,
  connectionId: state.connectionId,
  metrics: state.metrics,
  error: state.error,
}));