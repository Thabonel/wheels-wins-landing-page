/**
 * WebSocket Diagnostic Component
 * Visual indicator for PAM WebSocket connection status
 * Used for Phase 1 testing and debugging
 */

import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle, XCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePamWebSocket } from '@/hooks/usePamWebSocket';
import { useAuth } from '@/hooks/useAuth';

interface DiagnosticInfo {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  latency: number | null;
  messageCount: number;
  reconnectAttempts: number;
  lastError: string | null;
  userId: string | null;
  wsUrl: string | null;
}

export const WebSocketDiagnostic: React.FC<{ className?: string }> = ({ className }) => {
  const { user } = useAuth();
  const { isConnected, messages, sendMessage } = usePamWebSocket(user?.id || '', user?.access_token || '');
  
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo>({
    status: 'disconnected',
    latency: null,
    messageCount: 0,
    reconnectAttempts: 0,
    lastError: null,
    userId: null,
    wsUrl: null,
  });

  const [pingStartTime, setPingStartTime] = useState<number | null>(null);

  // Update connection status
  useEffect(() => {
    setDiagnosticInfo(prev => ({
      ...prev,
      status: isConnected ? 'connected' : 'disconnected',
      userId: user?.id || null,
      messageCount: messages.length,
    }));
  }, [isConnected, user, messages]);

  // Ping test for latency
  const testLatency = () => {
    if (!isConnected) return;
    
    setPingStartTime(Date.now());
    sendMessage({ type: 'ping', timestamp: Date.now() });
  };

  // Handle pong response
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.type === 'pong' && pingStartTime) {
      const latency = Date.now() - pingStartTime;
      setDiagnosticInfo(prev => ({ ...prev, latency }));
      setPingStartTime(null);
    }
  }, [messages, pingStartTime]);

  const getStatusIcon = () => {
    switch (diagnosticInfo.status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'connecting':
        return <Activity className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <WifiOff className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (diagnosticInfo.status) {
      case 'connected':
        return 'bg-green-50 border-green-200';
      case 'connecting':
        return 'bg-yellow-50 border-yellow-200';
      case 'disconnected':
        return 'bg-red-50 border-red-200';
      case 'error':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Only show in development mode
  if (import.meta.env.PROD) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 p-4 rounded-lg border-2 shadow-lg backdrop-blur-sm z-50',
        'transition-all duration-300',
        getStatusColor(),
        className
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <h3 className="font-semibold text-sm">PAM WebSocket</h3>
          </div>
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-600" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-600" />
          )}
        </div>

        {/* Status Details */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-mono font-semibold">
                {diagnosticInfo.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">User ID:</span>
              <span className="font-mono truncate max-w-[100px]">
                {diagnosticInfo.userId || 'none'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Messages:</span>
              <span className="font-mono">{diagnosticInfo.messageCount}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Latency:</span>
              <span className="font-mono">
                {diagnosticInfo.latency ? `${diagnosticInfo.latency}ms` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Retries:</span>
              <span className="font-mono">{diagnosticInfo.reconnectAttempts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Voice:</span>
              <span className="font-mono text-gray-400">Disabled</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {diagnosticInfo.lastError && (
          <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
            {diagnosticInfo.lastError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={testLatency}
            disabled={!isConnected}
            className={cn(
              'px-3 py-1 text-xs rounded font-medium transition-colors',
              isConnected
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            Test Latency
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 text-xs rounded font-medium bg-gray-500 text-white hover:bg-gray-600 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Connection URL (truncated) */}
        <div className="text-xs text-gray-500 truncate" title={diagnosticInfo.wsUrl || ''}>
          {diagnosticInfo.wsUrl ? `URL: ${diagnosticInfo.wsUrl}` : 'Not connected'}
        </div>
      </div>
    </div>
  );
};

export default WebSocketDiagnostic;