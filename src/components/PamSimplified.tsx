import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Mic, MicOff, VolumeX, Volume2, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { featureFlags } from "@/services/featureFlags";
import { usePamClaudeChat } from "@/hooks/pam/usePamClaudeChat";
// Import existing WebSocket hook for fallback
import { usePamWebSocketCore } from "@/hooks/pam/usePamWebSocketCore";
import { pamVoiceService } from "@/lib/voiceService";
import { useUserSettings } from "@/hooks/useUserSettings";
import { logger } from '../lib/logger';

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface PamMessage {
  id: string;
  content: string;
  sender: "user" | "pam";
  timestamp: Date;
  feedback?: 1 | -1;
  error?: string;
}

interface PamSimplifiedProps {
  mode?: "floating" | "sidebar" | "modal";
}

export const PamSimplified: React.FC<PamSimplifiedProps> = ({ mode = "floating" }) => {
  const { user, session } = useAuth();
  const { settings } = useUserSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Feature flag check - use direct Claude API if enabled
  const useDirectAPI = featureFlags.isEnabled('PAM_DIRECT_CLAUDE_API');

  // Claude Direct API Hook
  const claudeChat = usePamClaudeChat({
    enableTools: true,
    onError: (error) => {
      logger.error('PAM Direct API Error:', error);
    },
    onMessageUpdate: (messages) => {
      // Optional: sync with any external state
    }
  });

  // WebSocket Hook (fallback)
  const websocketChat = usePamWebSocketCore(
    user?.id || null,
    session?.access_token || null,
    {
      autoReconnect: true,
      onStatusChange: (status) => {
        logger.debug('WebSocket Status:', status);
      },
      onMessage: (message) => {
        logger.debug('WebSocket Message:', message);
      }
    }
  );

  // Choose which implementation to use based on feature flag
  const activeChat = useDirectAPI ? claudeChat : websocketChat;
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognition = useRef<any>(null);

  // Voice recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognition.current = new SpeechRecognition();
        recognition.current.continuous = false;
        recognition.current.interimResults = false;
        recognition.current.lang = 'en-US';

        recognition.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage(transcript);
          setIsListening(false);
        };

        recognition.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  // Auto scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (activeChat.messages?.length) {
      scrollToBottom();
    }
  }, [activeChat.messages, scrollToBottom]);

  // Send message handler
  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || activeChat.isLoading) return;

    const messageText = inputMessage.trim();
    setInputMessage("");

    try {
      if (useDirectAPI) {
        // Use Claude Direct API
        await claudeChat.sendMessage(messageText);
      } else {
        // Use WebSocket
        websocketChat.sendMessage(messageText);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [inputMessage, activeChat.isLoading, useDirectAPI, claudeChat, websocketChat]);

  // Voice input handler
  const toggleVoiceInput = useCallback(() => {
    if (!recognition.current) {
      alert('Speech recognition is not supported in this browser');
      return;
    }

    if (isListening) {
      recognition.current.stop();
      setIsListening(false);
    } else {
      recognition.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Message feedback
  const handleFeedback = useCallback((messageId: string, feedback: 1 | -1) => {
    // This would typically sync with backend for analytics
    logger.info('Message feedback:', { messageId, feedback });
  }, []);

  // Format messages for display
  const displayMessages = activeChat.messages || [];

  // Connection status for debugging
  const connectionStatus = useDirectAPI 
    ? (claudeChat.isReady ? 'connected' : 'disconnected')
    : websocketChat.connectionStatus;

  const isLoading = useDirectAPI ? claudeChat.isLoading : false;
  const hasError = useDirectAPI ? !!claudeChat.error : !!websocketChat.error;

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Open PAM Assistant"
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-sm font-bold">PAM</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4`}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">PAM</span>
            </div>
            <div>
              <h2 className="font-semibold">Personal Assistant Manager</h2>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>Mode: {useDirectAPI ? 'Direct API' : 'WebSocket'}</span>
                <span>•</span>
                <span className={`${connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                  {connectionStatus}
                </span>
                {hasError && <span className="text-red-600">• Error</span>}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {displayMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 text-xl font-bold">PAM</span>
              </div>
              <p className="text-lg font-medium mb-2">Hello! I'm PAM, your Personal Assistant Manager</p>
              <p className="text-sm">I can help you with finances, trip planning, and more. How can I assist you today?</p>
            </div>
          ) : (
            displayMessages.map((message, index) => (
              <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  message.sender === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.error && (
                    <p className="text-red-400 text-sm mt-1">Error: {message.error}</p>
                  )}
                  {message.sender === 'pam' && (
                    <div className="flex items-center space-x-2 mt-2">
                      <button
                        onClick={() => handleFeedback(message.id, 1)}
                        className="text-gray-400 hover:text-green-500 transition-colors"
                        title="Helpful"
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleFeedback(message.id, -1)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Not helpful"
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 p-3 rounded-lg flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>PAM is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask PAM anything..."
              className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={isLoading}
            />
            <button
              onClick={toggleVoiceInput}
              className={`p-2 rounded-lg transition-colors ${
                isListening
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PamSimplified;