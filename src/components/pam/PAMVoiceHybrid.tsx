/**
 * PAM Hybrid Voice Assistant Component
 *
 * Uses OpenAI Realtime for voice I/O + Claude for reasoning
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  PAMVoiceHybridService,
  createVoiceService,
  destroyVoiceService,
  type VoiceStatus
} from '@/services/pamVoiceHybridService';
import { useAuth } from '@/context/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

// Auto-timeout: Voice returns to wake word mode after this many seconds of inactivity
const VOICE_INACTIVITY_TIMEOUT_MS = 30000; // 30 seconds - then fall back to wake word

export function PAMVoiceHybrid() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>({
    isConnected: false,
    isListening: false,
    isSpeaking: false
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');

  const voiceServiceRef = useRef<PAMVoiceHybridService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyVoiceService();
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, []);

  // =====================================================
  // INACTIVITY TIMEOUT MANAGEMENT
  // =====================================================

  // Reset the inactivity timer - called when user speaks or PAM responds
  const resetInactivityTimeout = useCallback(() => {
    // Clear existing timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  // Start the inactivity timer - will stop voice after timeout
  const startInactivityTimeout = useCallback(() => {
    // Clear any existing timeout first
    resetInactivityTimeout();

    // Set new timeout
    inactivityTimeoutRef.current = setTimeout(() => {
      // Don't auto-stop if PAM is currently speaking
      if (status.isSpeaking) {
        // Restart timer to check again later
        startInactivityTimeout();
        return;
      }

      // Auto-stop due to inactivity - switch to wake word mode
      if (voiceServiceRef.current && isActive) {
        console.log('[PAMVoiceHybrid] Auto-stopping due to inactivity - returning to wake word mode');
        voiceServiceRef.current.stop().then(() => {
          voiceServiceRef.current = null;
          destroyVoiceService();
          setIsActive(false);
          setStatus({ isConnected: false, isListening: false, isSpeaking: false });
          setCurrentTranscript('');

          // Notify that voice should return to wake word mode (not fully stop)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('pam-voice:return-to-wake-word'));
            window.dispatchEvent(new CustomEvent('pam-voice:stop-all'));
          }

          toast({
            title: 'Listening for "Hey PAM"',
            description: 'Voice mode paused - say "Hey PAM" to continue'
          });
        });
      }
    }, VOICE_INACTIVITY_TIMEOUT_MS);
  }, [resetInactivityTimeout, status.isSpeaking, isActive, toast]);

  // Clear timeout when voice session ends
  const clearInactivityTimeout = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  // =====================================================
  // VOICE SESSION CONTROL
  // =====================================================

  const startVoiceSession = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to use voice assistant',
        variant: 'destructive'
      });
      return;
    }

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://pam-backend.onrender.com';
      const authToken = await user.getIdToken(); // Get fresh JWT

      const service = createVoiceService({
        userId: user.uid,
        apiBaseUrl,
        authToken,
        voice: 'marin', // Natural expressive voice
        onTranscript: (text) => {
          setCurrentTranscript(text);
          addMessage('user', text);
          // Reset inactivity timer - user is speaking
          startInactivityTimeout();
        },
        onResponse: (text) => {
          addMessage('assistant', text);
          // Reset inactivity timer - PAM responded, wait for next user input
          startInactivityTimeout();
        },
        onStatusChange: (newStatus) => {
          setStatus(newStatus);
        }
      });

      await service.start();
      voiceServiceRef.current = service;
      setIsActive(true);

      // Start the inactivity timer
      startInactivityTimeout();

      toast({
        title: 'Voice activated',
        description: 'PAM is listening... (auto-off after 60s of inactivity)'
      });

    } catch (error) {
      console.error('Failed to start voice session:', error);
      toast({
        title: 'Voice session failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      setIsActive(false);
    }
  }, [user, toast, startInactivityTimeout]);

  const stopVoiceSession = useCallback(async () => {
    // Clear inactivity timer
    clearInactivityTimeout();

    if (voiceServiceRef.current) {
      await voiceServiceRef.current.stop();
      voiceServiceRef.current = null;
    }
    destroyVoiceService();
    setIsActive(false);
    // Hard reset local status to ensure UI reflects stopped state immediately
    setStatus({ isConnected: false, isListening: false, isSpeaking: false });
    setCurrentTranscript('');

    // Notify any other voice components (e.g., search bar mic) to stop
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pam-voice:stop-all'));
    }

    toast({
      title: 'Voice deactivated',
      description: 'PAM stopped listening'
    });
  }, [toast, clearInactivityTimeout]);

  const toggleVoiceSession = useCallback(() => {
    if (isActive) {
      stopVoiceSession();
    } else {
      startVoiceSession();
    }
  }, [isActive, startVoiceSession, stopVoiceSession]);

  // =====================================================
  // INTERRUPTION
  // =====================================================

  const interruptPAM = useCallback(() => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.interrupt();
      toast({
        title: 'Interrupted',
        description: 'PAM stopped speaking'
      });
    }
  }, [toast]);

  // =====================================================
  // MESSAGE MANAGEMENT
  // =====================================================

  const addMessage = useCallback((role: 'user' | 'assistant', text: string) => {
    const message: Message = {
      id: `${Date.now()}-${Math.random()}`,
      role,
      text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, message]);
    setCurrentTranscript('');
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">PAM Voice Assistant</h2>
          <p className="text-sm text-muted-foreground">
            Hybrid: OpenAI voice + Claude reasoning
          </p>
        </div>

        {/* Status Badges */}
        <div className="flex gap-2">
          {status.isConnected && (
            <Badge variant="default" className="gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Connected
            </Badge>
          )}
          {status.isListening && (
            <Badge variant="secondary" className="gap-1">
              <Mic className="w-3 h-3" />
              Listening
            </Badge>
          )}
          {status.isSpeaking && (
            <Badge variant="secondary" className="gap-1">
              <Volume2 className="w-3 h-3 animate-pulse" />
              Speaking
            </Badge>
          )}
        </div>
      </div>

      {/* Conversation Area */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isActive && (
            <div className="h-full flex items-center justify-center text-center text-muted-foreground">
              <div>
                <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Start voice session</p>
                <p className="text-sm">
                  Click the microphone button to talk to PAM
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {/* Current transcript (while user is speaking) */}
          {currentTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-lg px-4 py-2 bg-primary/50 text-primary-foreground">
                <p className="text-sm italic">{currentTranscript}...</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </Card>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Main mic toggle */}
        <Button
          size="lg"
          variant={isActive ? 'default' : 'outline'}
          onClick={toggleVoiceSession}
          className="flex-1"
          disabled={!user}
        >
          {isActive ? (
            <>
              <Mic className="w-5 h-5 mr-2" />
              Stop Voice Session
            </>
          ) : (
            <>
              <Mic className="w-5 h-5 mr-2" />
              Start Voice Session
            </>
          )}
        </Button>

        {/* Interrupt button (only when PAM is speaking) */}
        {status.isSpeaking && (
          <Button
            size="lg"
            variant="outline"
            onClick={interruptPAM}
          >
            <VolumeX className="w-5 h-5 mr-2" />
            Interrupt
          </Button>
        )}

        {/* Clear chat */}
        {messages.length > 0 && (
          <Button
            size="lg"
            variant="ghost"
            onClick={clearMessages}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Instructions */}
      {!user && (
        <Card className="p-4 bg-muted">
          <p className="text-sm text-muted-foreground">
            ⚠️ Please sign in to use the voice assistant
          </p>
        </Card>
      )}

      {isActive && (
        <Card className="p-4 bg-muted">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Tips:</strong> Speak naturally. PAM can help you track expenses,
            plan trips, find campgrounds, and more. Interrupt anytime by clicking the button.
          </p>
        </Card>
      )}
    </div>
  );
}
