import React, { useState, useEffect, useCallback } from "react";
import { X, Send, Mic, MicOff, VolumeX, Volume2, AlertTriangle, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useVoice } from "@/hooks/useVoice";
import { useVoiceErrorRecovery } from "@/hooks/useVoiceErrorRecovery";
import { AudioPlayer } from "./AudioPlayer";
import { VoiceStatusMonitor } from "./VoiceStatusMonitor";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/**
 * New PAM component using production-grade voice architecture
 * 
 * Features:
 * - Centralized voice state management with Zustand
 * - Settings-dependent initialization 
 * - Sequential audio playbook (fixes double greeting)
 * - Multi-provider TTS fallback
 * - Proper error handling and recovery
 */

interface PamVoiceProps {
  mode?: "floating" | "sidebar" | "modal";
  className?: string;
  showErrorRecovery?: boolean;
}

interface PamMessage {
  id: string;
  content: string;
  sender: "user" | "pam";
  timestamp: string;
}

export const PamVoice: React.FC<PamVoiceProps> = ({ 
  mode = "floating",
  className = "",
  showErrorRecovery = true
}) => {
  const { user } = useAuth();
  const { settings: userSettings } = useUserSettings();
  
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<PamMessage[]>([]);
  const [showStatusMonitor, setShowStatusMonitor] = useState(false);
  
  // Mock chat implementation (AI SDK not configured yet)
  const chat = {
    messages,
    input: inputMessage,
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value),
    handleSubmit: (e?: React.FormEvent) => {
      e?.preventDefault();
      if (inputMessage.trim()) {
        // Add user message
        const userMsg: PamMessage = {
          id: `user_${Date.now()}`,
          content: inputMessage,
          sender: "user",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsg]);
        
        // Mock PAM response
        setTimeout(() => {
          const response = "I'm PAM, your travel assistant. The full AI integration is coming soon!";
          setMessages(prev => [...prev, {
            id: `pam_${Date.now()}`,
            content: response,
            sender: "pam",
            timestamp: new Date().toISOString()
          }]);
          
          if (voiceSystem.isInitialized) {
            try {
              voiceSystem.speak(response, { 
                priority: 'normal',
                fallbackToText: true 
              });
            } catch (error) {
              console.error('Voice synthesis error:', error);
              voiceRecovery.handleVoiceError(error as Error, 'pam_response', response);
            }
          }
        }, 1000);
        
        setInputMessage("");
      }
    },
    isLoading: false
  };

  // Voice system integration
  const voiceSystem = useVoice();
  const voiceRecovery = useVoiceErrorRecovery();
  
  // Handle opening/closing and voice initialization
  const handleToggleOpen = useCallback(() => {
    if (!isOpen) {
      console.log('🎙️ PAM opening, voice system status:', {
        initialized: voiceSystem.isInitialized,
        connected: voiceSystem.isConnected,
        settings: voiceSystem.settingsLoaded
      });
      
      // Speak greeting when opening (only if not already playing something)
      if (voiceSystem.isInitialized && !voiceSystem.isPlaying) {
        const greetingMessage = getPersonalizedGreeting();
        try {
          voiceSystem.speak(greetingMessage, { 
            priority: 'high',
            fallbackToText: false 
          });
        } catch (error) {
          console.error('Greeting synthesis error:', error);
          voiceRecovery.handleVoiceError(error as Error, 'greeting', greetingMessage);
        }
        
        // Add greeting to chat history
        setMessages(prev => [...prev, {
          id: `greeting_${Date.now()}`,
          content: greetingMessage,
          sender: "pam",
          timestamp: new Date().toISOString()
        }]);
      }
    }
    
    setIsOpen(!isOpen);
  }, [isOpen, voiceSystem, voiceRecovery]);

  // Generate personalized greeting
  const getPersonalizedGreeting = useCallback((): string => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const name = user?.user_metadata?.full_name || 'there';
    
    const greetings = [
      `Good ${timeOfDay}, ${name}! I'm PAM, your travel assistant. How can I help you plan your next adventure?`,
      `Hello ${name}! Ready to explore some amazing destinations? I'm here to help!`,
      `Hi ${name}! Whether you're planning a quick getaway or a grand adventure, I'm here to assist.`
    ];
    
    return greetings[Math.floor(Math.random() * greetings.length)];
  }, [user]);

  // Handle text message sending
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage: PamMessage = {
      id: `user_${Date.now()}`,
      content: inputMessage.trim(),
      sender: "user",
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Send message using mock chat
    chat.handleSubmit();
    
    setInputMessage("");
  }, [inputMessage, chat.handleSubmit]);

  // Handle voice recording (placeholder for future WebRTC integration)
  const handleVoiceToggle = useCallback(() => {
    if (voiceSystem.isInitialized) {
      // This will be implemented with WebRTC and VAD in Phase 2
      console.log('🎤 Voice recording toggle (placeholder)');
    } else {
      console.warn('⚠️ Voice system not ready');
    }
  }, [voiceSystem.isInitialized]);

  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    voiceSystem.mute();
  }, [voiceSystem]);

  // Handle interruption (barge-in)
  const handleInterrupt = useCallback(() => {
    voiceSystem.interrupt();
  }, [voiceSystem]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      // Enter to send message
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
      
      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      
      // Space for voice (when input is empty)
      if (e.code === 'Space' && !inputMessage.trim() && e.target === document.body) {
        e.preventDefault();
        handleVoiceToggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inputMessage, handleSendMessage, handleVoiceToggle]);

  // Render voice status indicator
  const renderVoiceStatus = () => {
    // Show recovery status first if system is recovering
    if (voiceRecovery.isRecovering) {
      return (
        <div className="flex items-center text-xs text-blue-600">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2" />
          Recovering voice...
        </div>
      );
    }

    // Show fallback mode if active
    if (voiceRecovery.fallbackMode !== 'none') {
      const fallbackText = voiceRecovery.fallbackMode === 'text-only' ? 'Text mode' : 'Silent mode';
      const fallbackColor = voiceRecovery.fallbackMode === 'text-only' ? 'text-yellow-600' : 'text-red-600';
      return (
        <div className={`flex items-center text-xs ${fallbackColor}`}>
          <AlertTriangle className="w-3 h-3 mr-1" />
          {fallbackText}
        </div>
      );
    }
    
    if (!voiceSystem.isInitialized) {
      return <div className="text-xs text-gray-500">Voice initializing...</div>;
    }
    
    if (voiceSystem.error || voiceRecovery.recentErrors.length > 0) {
      const errorCount = voiceRecovery.recentErrors.length;
      return (
        <div className="flex items-center text-xs text-red-500">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {errorCount > 1 ? `${errorCount} errors` : 'Voice error'}
        </div>
      );
    }
    
    if (voiceSystem.isPlaying) {
      return (
        <div className="flex items-center text-xs text-blue-600">
          <Volume2 className="w-3 h-3 mr-1" />
          Speaking...
          <button 
            onClick={handleInterrupt}
            className="ml-2 text-red-500 hover:text-red-700"
            title="Stop speaking"
          >
            Stop
          </button>
        </div>
      );
    }
    
    if (voiceSystem.queueSize > 0) {
      return (
        <div className="text-xs text-gray-600">
          {voiceSystem.queueSize} message{voiceSystem.queueSize !== 1 ? 's' : ''} queued
        </div>
      );
    }
    
    // Show recovery status
    const statusColor = voiceRecovery.status === 'healthy' ? 'text-green-600' : 
                       voiceRecovery.status === 'degraded' ? 'text-yellow-600' : 'text-red-600';
    const statusText = voiceRecovery.status === 'healthy' ? 'Voice ready' :
                      voiceRecovery.status === 'degraded' ? 'Voice degraded' : 'Voice failed';
    
    return <div className={`text-xs ${statusColor}`}>{statusText}</div>;
  };

  if (!isOpen) {
    return (
      <>
        {/* Floating button */}
        <button
          onClick={handleToggleOpen}
          className={`
            ${mode === "floating" ? "fixed bottom-4 right-4" : ""}
            ${className}
            bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700
            text-white p-4 rounded-full shadow-lg hover:shadow-xl
            transition-all duration-200 transform hover:scale-105
            z-50
          `}
          title="Open PAM - Your Travel Assistant"
        >
          <div className="w-6 h-6 flex items-center justify-center">
            🧳
          </div>
        </button>
      </>
    );
  }

  return (
    <>
      {/* Main PAM interface */}
      <div className={`
        ${mode === "floating" ? "fixed bottom-4 right-4 w-96 h-[500px]" : "w-full h-full"}
        bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col
        ${className}
        z-50
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 flex items-center justify-center">
              🧳
            </div>
            <div>
              <h3 className="font-semibold">PAM</h3>
              <div className="text-xs opacity-90">Your Travel Assistant</div>
            </div>
          </div>
          
          {/* Voice controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleMuteToggle}
              className={`
                p-1.5 rounded-full transition-colors
                ${voiceSystem.isMuted 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-white/20 hover:bg-white/30'
                }
              `}
              title={voiceSystem.isMuted ? "Unmute" : "Mute"}
            >
              {voiceSystem.isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {showErrorRecovery && (
              <button
                onClick={() => setShowStatusMonitor(!showStatusMonitor)}
                className={`
                  p-1.5 rounded-full transition-colors
                  ${showStatusMonitor 
                    ? 'bg-white/30' 
                    : 'bg-white/20 hover:bg-white/30'
                  }
                  ${voiceRecovery.recentErrors.length > 0 ? 'ring-2 ring-red-400' : ''}
                `}
                title="Voice Status & Recovery"
              >
                <Settings className="w-4 h-4" />
                {voiceRecovery.recentErrors.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">
                      {voiceRecovery.recentErrors.length}
                    </span>
                  </div>
                )}
              </button>
            )}
            
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
              title="Close PAM"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Voice status */}
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
          {renderVoiceStatus()}
        </div>

        {/* Voice Status Monitor (collapsible) */}
        {showErrorRecovery && showStatusMonitor && (
          <div className="border-b border-gray-100">
            <VoiceStatusMonitor 
              compact={mode === "floating"}
              showAdvanced={false}
            />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`
                flex ${message.sender === "user" ? "justify-end" : "justify-start"}
              `}
            >
              <div
                className={`
                  max-w-[80%] p-3 rounded-2xl
                  ${message.sender === "user"
                    ? "bg-purple-500 text-white"
                    : "bg-gray-100 text-gray-800"
                  }
                `}
              >
                <div className="text-sm">{message.content}</div>
                <div className={`
                  text-xs mt-1 opacity-70
                  ${message.sender === "user" ? "text-purple-100" : "text-gray-500"}
                `}>
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading indicator for AI responses */}
          {chat.isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-3 rounded-2xl">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me about travel plans, destinations, or anything..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={chat.isLoading}
            />
            
            <button
              onClick={handleVoiceToggle}
              className={`
                p-2 rounded-full transition-colors
                ${voiceSystem.isInitialized 
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }
              `}
              disabled={!voiceSystem.isInitialized}
              title="Voice input (coming soon)"
            >
              <Mic className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || chat.isLoading}
              className="p-2 rounded-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white transition-colors"
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* AudioPlayer component - handles all voice playback */}
      <AudioPlayer />
    </>
  );
};

export default PamVoice;