
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
  const { region } = useRegion();
  const { isOffline } = useOffline();
  const { sessionData, updateSession } = usePamSession(user?.id);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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


