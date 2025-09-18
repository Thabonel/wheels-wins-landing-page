/**
 * PAM Fallback Interface - Day 3 Complete Integration
 * Comprehensive fallback UI that integrates all Day 3 improvements
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Bot,
  Send,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Wifi,
  WifiOff,
  List,
  Zap
} from 'lucide-react';

import PAMUnavailableState from './PAMUnavailableState';
import usePamGracefulDegradation from '@/hooks/pam/usePamGracefulDegradation';

interface PAMFallbackInterfaceProps {
  isConnected: boolean;
  connectionError: string | null;
  userId: string;
  onRetryConnection?: () => void;
  onSendMessage?: (content: string) => Promise<void>;
}

const PAMFallbackInterface: React.FC<PAMFallbackInterfaceProps> = ({
  isConnected,
  connectionError,
  userId,
  onRetryConnection,
  onSendMessage
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQueueDetails, setShowQueueDetails] = useState(false);

  const {
    degradationState,
    connectionHealth,
    sendMessage,
    getStatusMessage,
    getAvailableActions,
    getFallbackSuggestions,
    offlineQueue
  } = usePamGracefulDegradation(isConnected, connectionError);

  // Auto-refresh queue stats
  const [queueStats, setQueueStats] = useState({ pending: 0, sent: 0, failed: 0 });

  useEffect(() => {
    const updateStats = () => {
      if (offlineQueue) {
        const stats = offlineQueue.getStats();
        setQueueStats({
          pending: stats.pendingMessages,
          sent: stats.sentMessages,
          failed: stats.failedMessages
        });
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, [offlineQueue]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (degradationState.mode === 'online' && onSendMessage) {
        await onSendMessage(messageInput);
      } else {
        await sendMessage(messageInput, userId, {
          priority: 'normal',
          type: 'chat'
        });
      }
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConnectionIcon = () => {
    switch (degradationState.mode) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'degraded':
        return <Zap className="h-4 w-4 text-yellow-600" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Bot className="h-4 w-4 text-gray-600" />;
    }
  };

  const getModeColor = () => {
    switch (degradationState.mode) {
      case 'online': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'offline': return 'text-red-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getModeBadgeVariant = () => {
    switch (degradationState.mode) {
      case 'online': return 'default';
      case 'degraded': return 'secondary';
      case 'offline': return 'destructive';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  // If completely unavailable, show full unavailable state
  if (!degradationState.isAvailable && degradationState.mode !== 'degraded') {
    const reason = degradationState.degradationReason?.includes('DNS') ? 'configuration' :
                   degradationState.mode === 'offline' ? 'offline' : 'error';

    return (
      <PAMUnavailableState
        reason={reason}
        lastActive={degradationState.lastSuccessfulConnection
          ? new Date(degradationState.lastSuccessfulConnection).toLocaleTimeString()
          : undefined}
        retryAvailable={true}
        onRetry={onRetryConnection}
        estimatedRecovery="Unknown"
        alternativeActions={true}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Status Header */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {getConnectionIcon()}
                <CardTitle className="text-lg">PAM Assistant</CardTitle>
              </div>
              <Badge variant={getModeBadgeVariant()} className={getModeColor()}>
                {degradationState.mode.toUpperCase()}
              </Badge>
            </div>

            {degradationState.queuedMessageCount > 0 && (
              <button
                onClick={() => setShowQueueDetails(!showQueueDetails)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
              >
                <List className="h-4 w-4" />
                {degradationState.queuedMessageCount} queued
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status Message */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-blue-800 font-medium">{getStatusMessage()}</p>
              {degradationState.mode !== 'online' && (
                <div className="mt-2 space-y-1">
                  {getFallbackSuggestions().map((suggestion, index) => (
                    <p key={index} className="text-blue-700 text-sm">• {suggestion}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Connection Health (when degraded) */}
          {degradationState.mode === 'degraded' && (
            <div className="grid grid-cols-3 gap-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-800">{connectionHealth.latency}ms</div>
                <div className="text-xs text-yellow-600">Latency</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-800">{connectionHealth.successRate}%</div>
                <div className="text-xs text-yellow-600">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-800">{connectionHealth.connectionQuality}</div>
                <div className="text-xs text-yellow-600">Quality</div>
              </div>
            </div>
          )}

          {/* Queue Details (expandable) */}
          {showQueueDetails && degradationState.queuedMessageCount > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-3">Message Queue Status</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-600">{queueStats.pending}</div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{queueStats.sent}</div>
                  <div className="text-xs text-gray-600">Sent</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">{queueStats.failed}</div>
                  <div className="text-xs text-gray-600">Failed</div>
                </div>
              </div>

              {queueStats.pending > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Queue Progress</span>
                    <span>{queueStats.sent} / {queueStats.pending + queueStats.sent} sent</span>
                  </div>
                  <Progress
                    value={(queueStats.sent / (queueStats.pending + queueStats.sent || 1)) * 100}
                    className="h-2"
                  />
                </div>
              )}
            </div>
          )}

          {/* Message Input */}
          {degradationState.canSendMessages && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <Textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={
                    degradationState.mode === 'online'
                      ? "Message PAM..."
                      : degradationState.mode === 'degraded'
                      ? "Message PAM (may be delayed)..."
                      : "Message PAM (will be queued)..."
                  }
                  className="flex-1 min-h-[80px]"
                  disabled={isSubmitting}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isSubmitting}
                  className="px-6"
                >
                  {isSubmitting ? (
                    <Clock className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Send Mode Indicator */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {degradationState.mode === 'online' ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Messages will be sent immediately
                  </>
                ) : degradationState.mode === 'degraded' ? (
                  <>
                    <Clock className="h-4 w-4 text-yellow-600" />
                    Messages may be delayed due to connection issues
                  </>
                ) : (
                  <>
                    <List className="h-4 w-4 text-blue-600" />
                    Messages will be queued and sent when connection is restored
                  </>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t">
            {getAvailableActions().includes('retry_connection') && (
              <Button
                onClick={onRetryConnection}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Wifi className="h-4 w-4" />
                Retry Connection
              </Button>
            )}

            <Button
              onClick={() => window.location.href = '/pam-dev-test'}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Bot className="h-4 w-4" />
              Demo Mode
            </Button>

            {degradationState.mode !== 'online' && (
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4" />
                Refresh Page
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      {degradationState.mode !== 'online' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Available Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">✅ Still Available</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Browse app features</li>
                  <li>• View saved data</li>
                  <li>• Use offline features</li>
                  {degradationState.canSendMessages && <li>• Send messages (queued)</li>}
                </ul>
              </div>

              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">❌ Temporarily Limited</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Real-time PAM responses</li>
                  <li>• Live conversation</li>
                  <li>• Voice features</li>
                  <li>• Real-time data sync</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PAMFallbackInterface;