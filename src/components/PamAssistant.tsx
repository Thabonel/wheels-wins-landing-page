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
import { usePamSession } from '@/hooks/usePamSession';
import { IntentClassifier } from '@/utils/intentClassifier';
import PamVoice from '@/components/voice/PamVoice';

const PamAssistant = () => {
  const { region } = useRegion();
  const { isOffline } = useOffline();
  const { user } = useAuth();
  const { sessionData, updateSession } = usePamSession(user?.id);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = {
      type: "user",
      content: input.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      if (isConnected) {
        sendWebSocketMessage({
          type: 'chat',
          message: input.trim(),
          user_id: user?.id,
          context: {
            region,
            session_data: sessionData
          }
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setInput('');
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp?.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-3 py-2 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
      </div>
      
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isLoading || isOffline}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={isLoading || isOffline || !input.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <PamVoice text={input} />
        </div>
      </div>
    </Card>
  );
};

export default PamAssistant;
