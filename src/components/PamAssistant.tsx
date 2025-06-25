
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Mic, MicOff, Volume2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRegion } from '@/context/RegionContext';
import { useOffline } from '@/context/OfflineContext';
import { usePamWebSocketConnection } from '@/hooks/pam/usePamWebSocketConnection';
import { useAuth } from '@/context/AuthContext';
import { usePamSession } from '@/hooks/usePamSession';
import { IntentClassifier } from '@/utils/intentClassifier';
import PamVoice from '@/components/voice/PamVoice';

const PamAssistant = () => {
  const { user } = useAuth();
  const { region } = useRegion();
  const { isOffline } = useOffline();
  const { sessionData, updateSession } = usePamSession(user?.id);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { isConnected, sendMessage: sendWebSocketMessage } = usePamWebSocketConnection({
    userId: user?.id || "anonymous",
    onMessage: (message) => {
      setMessages(prev => [...prev, {
        type: "pam",
        content: message.message || message.content || "Processing...",
        timestamp: new Date()
      }]);
    },
    onStatusChange: (connected) => {
      console.log("PAM connection status:", connected);
    }
  });

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
    
    const intentResult = IntentClassifier.classifyIntent(input);
    updateSession(intentResult.type);

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

  const getMessageEmotion = (content: string, role: string) => {
    if (role !== 'assistant') return undefined;
    
    if (content.includes('deal') || content.includes('recommend')) return 'excited';
    if (content.includes('help') || content.includes('guide')) return 'helpful';
    if (content.includes('congratulat') || content.includes('achievement')) return 'celebrates';
    if (content.includes('safety') || content.includes('careful')) return 'calm';
    
    return 'helpful';
  };

  const getMessageContext = (content: string) => {
    if (content.includes('shop') || content.includes('buy') || content.includes('product')) return 'shopping';
    if (content.includes('trip') || content.includes('plan') || content.includes('route')) return 'planning';
    if (content.includes('achievement') || content.includes('milestone')) return 'achievement';
    if (content.includes('safety') || content.includes('warning')) return 'safety';
    
    return 'general';
  };

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
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  {message.content}
                </div>
                {message.role === 'assistant' && (
                  <PamVoice
                    text={message.content}
                    emotion={getMessageEmotion(message.content, message.role)}
                    context={getMessageContext(message.content)}
                    autoPlay={false}
                    className="ml-2"
                  />
                )}
              </div>
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
