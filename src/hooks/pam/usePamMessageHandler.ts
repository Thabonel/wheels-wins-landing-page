
import { useState, useCallback } from 'react';
import { usePamUIActions } from './usePamUIActions';

interface WebSocketMessage {
  type: string;
  message?: string;
  actions?: any[];
  user_id?: string;
  context?: any;
  [key: string]: any;
}

export function usePamMessageHandler() {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const { executeUIActions } = usePamUIActions();

  const handleMessage = useCallback(async (message: WebSocketMessage) => {
    setMessages(prev => [...prev, message]);

    switch (message.type) {
      case 'chat_response':
        console.log('💬 Chat response from PAM backend:', message.message);
        break;
        
      case 'ui_actions':
        console.log('🎯 Executing UI actions:', message.actions);
        await executeUIActions(message.actions || []);
        break;
        
      case 'action_response':
        if (message.status === 'completed') {
          console.log('✅ PAM action completed:', message);
        }
        break;
        
      case 'error':
        console.error('❌ PAM backend error:', message.message);
        break;
        
      case 'connection':
        console.log('🔗 PAM connection status:', message.message);
        break;

      case 'wins_update':
        console.log('🏆 WINS data updated:', message);
        break;
    }
  }, [executeUIActions]);

  return {
    messages,
    handleMessage
  };
}
