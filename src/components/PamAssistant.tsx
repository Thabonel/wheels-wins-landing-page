
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Mic, MicOff, Volume2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRegion } from '@/context/RegionContext';
import { useOffline } from '@/context/OfflineContext';
import { usePamWebSocket } from '@/hooks/usePamWebSocket';
import { usePamSession } from '@/hooks/usePamSession';
import { IntentClassifier } from '@/utils/intentClassifier';

// UPDATED: Now uses WebSocket instead of deprecated usePam hook

const PamAssistant = () => {
  const { user } = useAuth();
  const { region } = useRegion();
  const { isOffline } = useOffline();
  const { sessionData, updateSession } = usePamSession(user?.id);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use WebSocket connection instead of old HTTP-based usePam
  const { isConnected, sendMessage: sendWebSocketMessage, messages: wsMessages } = usePamWebSocket();

  // Handle WebSocket messages
  useEffect(() => {
    if (wsMessages.length > 0) {
      const latestMessage = wsMessages[wsMessages.length - 1];
      
      if (latestMessage.type === 'chat_response') {
        const pamMessage = {
          role: "assistant",
          content: latestMessage.message || "I'm processing your request...",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, pamMessage]);
        setIsLoading(false);
      }
    }
  }, [wsMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || isOffline || !isConnected) return;

    const userMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Classify intent and update session
    const intentResult = IntentClassifier.classifyIntent(input);
    updateSession(intentResult.type);

    // Send via WebSocket
    const messageSent = sendWebSocketMessage({
      type: 'chat',
      message: input.trim(),
      user_id: user?.id,
      context: {
        region,
        session_data: sessionData
      }
    });

    if (!messageSent) {
      setIsLoading(false);
      const errorMessage = {
        role: "assistant",
        content: "Connection failed. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isOffline) {
    return (
      <Card className="p-4 max-w-md mx-auto">
        <div className="text-center text-gray-500">
          <Avatar className="mx-auto mb-2">
            <img src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/Pam.webp" alt="Pam" />
          </Avatar>
          <p>PAM is offline. Check your connection.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto h-96 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        <Avatar>
          <img src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/Pam.webp" alt="Pam" />
        </Avatar>
        <div>
          <h3 className="font-semibold">PAM</h3>
          <p className="text-sm text-gray-500">
            {isConnected ? 'Connected via WebSocket' : 'Connecting...'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm">
            Ask me anything about your {region} travel plans!
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              PAM is thinking...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Ask PAM anything..." : "Connecting..."}
            disabled={isLoading || !isConnected}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || !isConnected}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default PamAssistant;
