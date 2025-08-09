/**
 * PAM Interface - Simple, Elegant AI Assistant
 * Apple-inspired design: minimal, intuitive, powerful
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pamAgenticService } from '@/services/pamAgenticService';
import { pamVoiceService } from '@/lib/voiceService';
import { useUserSettings } from '@/hooks/useUserSettings';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
}

interface PamInterfaceProps {
  className?: string;
  onClose?: () => void;
}

export const PamInterface: React.FC<PamInterfaceProps> = ({ className, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { settings, updateSettings } = useUserSettings();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle sending messages
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Use agentic service for intelligent responses
      const result = await pamAgenticService.planAndExecute(userMessage.content, {
        conversation_history: messages.slice(-5), // Last 5 messages for context
        user_preferences: settings
      });
      
      if (result.execution.success && result.execution.execution_result) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: result.execution.execution_result.response,
          role: 'assistant',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Auto-speak if voice is enabled
        if (voiceEnabled && settings?.pam_preferences?.voice_enabled !== false) {
          handleSpeak(assistantMessage.content);
        }
      }
    } catch (error) {
      console.error('PAM response error:', error);
      // Graceful fallback to simple response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm having trouble processing that right now. Could you try rephrasing?",
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle voice input
  const handleVoiceToggle = () => {
    if (isListening) {
      // Stop listening
      setIsListening(false);
    } else {
      // Start listening
      setIsListening(true);
      // Voice input implementation would go here
      setTimeout(() => setIsListening(false), 3000); // Mock timeout
    }
  };

  // Handle text-to-speech
  const handleSpeak = async (text: string) => {
    if (isSpeaking) return;
    
    try {
      setIsSpeaking(true);
      await pamVoiceService.generateVoice({
        text,
        emotion: 'helpful',
        context: 'general'
      });
    } catch (error) {
      console.error('Voice generation error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  // Toggle voice output
  const toggleVoiceOutput = () => {
    const newVoiceEnabled = !voiceEnabled;
    setVoiceEnabled(newVoiceEnabled);
    
    // Update user settings
    updateSettings({
      pam_preferences: {
        ...settings?.pam_preferences,
        voice_enabled: newVoiceEnabled
      }
    });
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl",
      "border border-gray-200 dark:border-gray-700",
      "overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">P</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">PAM</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Your AI Assistant</p>
          </div>
        </div>
        
        {/* Voice toggle */}
        <button
          onClick={toggleVoiceOutput}
          className={cn(
            "p-2 rounded-full transition-colors",
            voiceEnabled
              ? "bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-400"
              : "bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-600"
          )}
        >
          {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-white text-xl font-bold">P</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Hi! I'm PAM
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Your personal travel assistant. I can help with trip planning, expenses, recommendations, and more.
            </p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] px-4 py-3 rounded-2xl",
                message.role === 'user'
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
                message.role === 'assistant' && isSpeaking && "ring-2 ring-blue-300 animate-pulse"
              )}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
              {message.role === 'assistant' && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {voiceEnabled && (
                    <button
                      onClick={() => handleSpeak(message.content)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
                      disabled={isSpeaking}
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl max-w-[80%]">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                <span className="text-sm text-gray-500">PAM is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          {/* Voice input */}
          <button
            onClick={handleVoiceToggle}
            className={cn(
              "p-3 rounded-full transition-colors",
              isListening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            )}
            disabled={isLoading}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          
          {/* Text input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask PAM anything..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-full border-0 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              disabled={isLoading}
            />
          </div>
          
          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={cn(
              "p-3 rounded-full transition-colors",
              input.trim() && !isLoading
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed"
            )}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};