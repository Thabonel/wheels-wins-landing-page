import { useEffect } from 'react';
import { usePamWebSocket } from './usePamWebSocket';

interface PamWebSocketAdapterProps {
  userId: string;
  token: string;
  onMessage?: (message: any) => void;
  onStatusChange?: (status: boolean) => void;
}

/**
 * Adapter hook to provide backward compatibility for components
 * expecting the object-based interface
 */
export const usePamWebSocketAdapter = ({
  userId,
  token,
  onMessage,
  onStatusChange
}: PamWebSocketAdapterProps) => {
  // Use the actual hook with correct parameters
  const { isConnected, messages, sendMessage, connect } = usePamWebSocket(
    userId || '',
    token || ''
  );

  // Handle message callbacks
  useEffect(() => {
    if (onMessage && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      onMessage(lastMessage);
    }
  }, [messages, onMessage]);

  // Handle status change callbacks
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(isConnected);
    }
  }, [isConnected, onStatusChange]);

  return {
    isConnected,
    sendMessage,
    connect,
    messages
  };
};

// Export with the name that components are using
export const usePamWebSocketConnection = usePamWebSocketAdapter;