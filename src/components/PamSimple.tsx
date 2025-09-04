import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePamWebSocketCore } from "@/hooks/pam/usePamWebSocketCore";
import { logger } from '@/lib/logger';

interface PamMessage {
  id: string;
  content: string;
  sender: "user" | "pam";
  timestamp: string;
}

interface PamProps {
  mode?: "floating" | "sidebar" | "modal";
}

/**
 * Simplified PAM Component - Text Chat Only
 * Based on successful patterns from OpenAI and Vercel AI SDK
 */
const PamSimple: React.FC<PamProps> = ({ mode = "floating" }) => {
  const { user, session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<PamMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get JWT token from session
  const jwtToken = session?.access_token;

  // WebSocket connection using unified hook with authentication
  const { 
    sendMessage, 
    connectionStatus,
    connect,
    disconnect 
  } = usePamWebSocketCore(user?.id || null, jwtToken || null, {
    autoReconnect: true,
    reconnectDelays: [1000, 2000, 4000, 8000, 16000],
    onMessage: (message) => {
      logger.debug('PAM received message:', message);
      handleIncomingMessage(message);
    },
    onStatusChange: (status) => {
      logger.info(`PAM connection status: ${status}`);
    }
  });

  // Handle incoming messages from WebSocket
  const handleIncomingMessage = useCallback((wsMessage: any) => {
    if (wsMessage.type === 'response' || wsMessage.type === 'message') {
      const pamMessage: PamMessage = {
        id: wsMessage.id || Date.now().toString(),
        content: wsMessage.content || wsMessage.message || '',
        sender: 'pam',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, pamMessage]);
      setIsTyping(false);
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Connect/disconnect based on component mount, user, and authentication
  useEffect(() => {
    if (user?.id && jwtToken && isOpen) {
      setAuthError(null);
      connect();
    } else if (isOpen && (!user?.id || !jwtToken)) {
      setAuthError('Authentication required. Please log in.');
    }
    
    return () => {
      if (connectionStatus === 'connected') {
        disconnect();
      }
    };
  }, [user?.id, jwtToken, isOpen, connect, disconnect, connectionStatus]);

  // Send message handler
  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim() || connectionStatus !== 'connected' || authError) {
      return;
    }

    // Add user message to chat
    const userMessage: PamMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Send via WebSocket
    sendMessage({
      type: 'message',
      content: inputMessage,
      timestamp: Date.now()
    });

    // Clear input
    setInputMessage("");
    inputRef.current?.focus();
  }, [inputMessage, connectionStatus, sendMessage]);

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Connection status indicator
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'reconnecting': return 'bg-orange-500';
      default: return 'bg-red-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'reconnecting': return 'Reconnecting...';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Connection Error';
      default: return 'Unknown';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      {/* Floating PAM Button */}
      {mode === "floating" && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50"
          aria-label="Open PAM Assistant"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed ${mode === 'floating' ? 'bottom-6 right-6 w-96 h-[600px]' : 'inset-0'} bg-white rounded-lg shadow-2xl flex flex-col z-50`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">PAM</span>
              </div>
              <div>
                <h3 className="font-semibold">PAM Assistant</h3>
                <div className="flex items-center space-x-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                  <span>{getStatusText()}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Close PAM"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {authError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-600 font-medium">Authentication Error</p>
                <p className="text-red-500 text-sm mt-1">{authError}</p>
              </div>
            )}
            
            {!authError && messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-lg font-medium mb-2">Hi! I'm PAM 👋</p>
                <p className="text-sm">How can I help you today?</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={connectionStatus === 'connected' ? "Type your message..." : "Waiting for connection..."}
                disabled={connectionStatus !== 'connected'}
                className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || connectionStatus !== 'connected'}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            {connectionStatus !== 'connected' && (
              <p className="text-xs text-red-500 mt-2">
                {connectionStatus === 'connecting' ? 'Connecting to PAM...' : 'Connection lost. Retrying...'}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PamSimple;