/**
 * Unified Voice System Component
 * Integrates VAD, Noise Cancellation, Turn Detection, and Real-time Streaming
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, Settings, Activity, Wifi, WifiOff } from 'lucide-react';
import { RealtimeVoiceStreaming } from './RealtimeVoiceStreaming';
import { useAuth } from '@/context/AuthContext';
import { getWebSocketUrl } from '@/services/api';

interface VoiceSystemProps {
  onTranscription?: (text: string, isFinal: boolean) => void;
  onResponse?: (response: string) => void;
  onTurnDetected?: (userTurnEnded: boolean) => void;
  className?: string;
  mode?: 'button' | 'always-on' | 'push-to-talk';
}

interface VoiceStats {
  isConnected: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  noiseReductionActive: boolean;
  latency: { current: number; average: number; max: number };
  vadState: any;
}

export default function UnifiedVoiceSystem({
  onTranscription,
  onResponse,
  onTurnDetected,
  className = '',
  mode = 'button'
}: VoiceSystemProps) {
  const { user, session } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState<VoiceStats>({
    isConnected: false,
    isSpeaking: false,
    isListening: false,
    noiseReductionActive: false,
    latency: { current: 0, average: 0, max: 0 },
    vadState: null
  });
  
  const [transcription, setTranscription] = useState('');
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [volume, setVolume] = useState(1.0);
  
  const voiceSystemRef = useRef<RealtimeVoiceStreaming | null>(null);
  const statsUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize voice system
  useEffect(() => {
    if (user?.id && session?.access_token) {
      initializeVoiceSystem();
    }
    
    return () => {
      cleanup();
    };
  }, [user?.id, session?.access_token]);

  // Update stats periodically
  useEffect(() => {
    if (isActive) {
      statsUpdateInterval.current = setInterval(updateStats, 500);
    } else {
      if (statsUpdateInterval.current) {
        clearInterval(statsUpdateInterval.current);
      }
    }
    
    return () => {
      if (statsUpdateInterval.current) {
        clearInterval(statsUpdateInterval.current);
      }
    };
  }, [isActive]);

  const initializeVoiceSystem = useCallback(() => {
    console.log('🎙️ Initializing Unified Voice System...');
    
    const wsUrl = `${getWebSocketUrl('/api/v1/voice/stream')}?token=${session?.access_token}`;
    
    voiceSystemRef.current = new RealtimeVoiceStreaming(
      {
        sampleRate: 16000,
        enableVAD: true,
        enableNoiseReduction: true,
        maxLatency: 150
      },
      {
        onTranscription: (text, isFinal) => {
          setTranscription(text);
          onTranscription?.(text, isFinal);
          
          if (isFinal) {
            console.log('📝 Final transcription:', text);
          }
        },
        
        onResponse: (response, audioData) => {
          console.log('🤖 AI Response:', response);
          onResponse?.(response);
          
          // Automatically play TTS response
          if (audioData && !isMuted) {
            // Audio will be played by the streaming system
          }
        },
        
        onTurnDetected: (userTurnEnded) => {
          console.log(`🔄 Turn detection: User turn ${userTurnEnded ? 'ended' : 'started'}`);
          setIsUserTurn(!userTurnEnded);
          onTurnDetected?.(userTurnEnded);
        },
        
        onLatencyUpdate: (latency) => {
          setStats(prev => ({
            ...prev,
            latency: voiceSystemRef.current?.getLatencyStats() || prev.latency
          }));
        },
        
        onConnectionStatusChange: (status) => {
          setStats(prev => ({
            ...prev,
            isConnected: status === 'connected'
          }));
          
          if (status === 'error' || status === 'disconnected') {
            setIsActive(false);
          }
        },
        
        onError: (error) => {
          console.error('❌ Voice system error:', error);
          setIsActive(false);
        }
      }
    );
  }, [session?.access_token, onTranscription, onResponse, onTurnDetected, isMuted]);

  const updateStats = useCallback(() => {
    if (!voiceSystemRef.current) return;
    
    setStats(prev => ({
      ...prev,
      latency: voiceSystemRef.current!.getLatencyStats(),
      vadState: voiceSystemRef.current!.getVADState(),
      noiseReductionActive: voiceSystemRef.current!.isNoiseReductionActive(),
      isSpeaking: voiceSystemRef.current!.getVADState()?.isSpeaking || false,
      isListening: isActive && !isMuted
    }));
  }, [isActive, isMuted]);

  const startVoiceSystem = async () => {
    if (!voiceSystemRef.current) {
      console.error('❌ Voice system not initialized');
      return;
    }
    
    try {
      console.log('🚀 Starting voice system...');
      const wsUrl = `${getWebSocketUrl('/api/v1/voice/stream')}?token=${session?.access_token}`;
      await voiceSystemRef.current.start(wsUrl);
      setIsActive(true);
      setIsUserTurn(true);
      console.log('✅ Voice system started');
    } catch (error) {
      console.error('❌ Failed to start voice system:', error);
      setIsActive(false);
    }
  };

  const stopVoiceSystem = async () => {
    if (!voiceSystemRef.current) return;
    
    try {
      console.log('🛑 Stopping voice system...');
      await voiceSystemRef.current.stop();
      setIsActive(false);
      setTranscription('');
      console.log('✅ Voice system stopped');
    } catch (error) {
      console.error('❌ Failed to stop voice system:', error);
    }
  };

  const toggleMute = () => {
    if (!voiceSystemRef.current) return;
    
    if (isMuted) {
      voiceSystemRef.current.unmute();
      setIsMuted(false);
      console.log('🔊 Unmuted');
    } else {
      voiceSystemRef.current.mute();
      setIsMuted(true);
      console.log('🔇 Muted');
    }
  };

  const forceNoiseProfileUpdate = () => {
    if (voiceSystemRef.current) {
      voiceSystemRef.current.forceNoiseProfileUpdate();
      console.log('🔄 Updating noise profile...');
    }
  };

  const cleanup = () => {
    if (voiceSystemRef.current) {
      voiceSystemRef.current.stop();
      voiceSystemRef.current = null;
    }
    
    if (statsUpdateInterval.current) {
      clearInterval(statsUpdateInterval.current);
      statsUpdateInterval.current = null;
    }
  };

  const getStatusColor = () => {
    if (!stats.isConnected) return 'text-red-500';
    if (stats.isSpeaking) return 'text-green-500';
    if (stats.isListening) return 'text-blue-500';
    return 'text-gray-500';
  };

  const getStatusText = () => {
    if (!stats.isConnected) return 'Disconnected';
    if (stats.isSpeaking) return 'Speaking';
    if (stats.isListening) return 'Listening';
    return 'Ready';
  };

  return (
    <div className={`unified-voice-system ${className}`}>
      {/* Main Control Button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={isActive ? stopVoiceSystem : startVoiceSystem}
          variant={isActive ? "destructive" : "default"}
          size="lg"
          className={`transition-all duration-300 ${
            stats.isSpeaking ? 'animate-pulse bg-green-600 hover:bg-green-700' : ''
          }`}
          disabled={!user?.id}
        >
          {isActive ? <MicOff className="w-5 h-5 mr-2" /> : <Mic className="w-5 h-5 mr-2" />}
          {isActive ? 'Stop Voice' : 'Start Voice'}
        </Button>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            stats.isConnected ? 'bg-green-500' : 'bg-red-500'
          } ${stats.isSpeaking ? 'animate-pulse' : ''}`} />
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {/* Mute Toggle */}
        {isActive && (
          <Button
            onClick={toggleMute}
            variant="outline"
            size="sm"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        )}

        {/* Settings Toggle */}
        <Button
          onClick={() => setShowSettings(!showSettings)}
          variant="ghost"
          size="sm"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Live Transcription */}
      {isActive && transcription && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-700">Live Transcription</span>
          </div>
          <p className="text-sm text-blue-800">{transcription}</p>
        </div>
      )}

      {/* Turn Indicator */}
      {isActive && (
        <div className="mt-2 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isUserTurn ? 'bg-green-500' : 'bg-blue-500'
          }`} />
          <span className="text-xs text-gray-600">
            {isUserTurn ? 'Your turn to speak' : 'PAM is responding'}
          </span>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Voice System Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Connection</span>
              <div className="flex items-center gap-2">
                {stats.isConnected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs">
                  {stats.isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            {/* Latency Stats */}
            <div className="space-y-2">
              <span className="text-sm">Latency</span>
              <div className="text-xs space-y-1">
                <div>Current: {stats.latency.current.toFixed(0)}ms</div>
                <div>Average: {stats.latency.average.toFixed(0)}ms</div>
                <div>Max: {stats.latency.max.toFixed(0)}ms</div>
              </div>
            </div>

            {/* Voice Activity */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Voice Activity</span>
              <span className="text-xs">
                {stats.isSpeaking ? 'Detected' : 'None'}
              </span>
            </div>

            {/* Noise Reduction */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Noise Reduction</span>
              <div className="flex items-center gap-2">
                <span className="text-xs">
                  {stats.noiseReductionActive ? 'Active' : 'Calibrating...'}
                </span>
                <Button
                  onClick={forceNoiseProfileUpdate}
                  variant="outline"
                  size="sm"
                  className="text-xs px-2 py-1"
                >
                  Recalibrate
                </Button>
              </div>
            </div>

            {/* VAD State */}
            {stats.vadState && (
              <div className="space-y-2">
                <span className="text-sm">Voice Activity Detection</span>
                <div className="text-xs space-y-1">
                  <div>Speaking: {stats.vadState.isSpeaking ? 'Yes' : 'No'}</div>
                  <div>Noise Floor: {stats.vadState.noiseFloor?.toFixed(4) || 'N/A'}</div>
                  <div>Threshold: {stats.vadState.adaptiveThreshold?.toFixed(4) || 'N/A'}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}