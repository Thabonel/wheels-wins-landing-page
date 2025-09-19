/**
 * PAM WebSocket Comprehensive Tester
 * Day 2 - Hour 1: Connection Stability Testing with Real WebSocket Instances
 *
 * Real tests with actual usePamWebSocketCore instances:
 * - Multiple concurrent connections
 * - Message delivery reliability
 * - Connection persistence
 * - Error handling and recovery
 * - Performance metrics
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePamWebSocketUnified, type ConnectionStatus, type PamMessage } from '@/hooks/pam/usePamWebSocketUnified';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConnectionInstance {
  id: number;
  hook: ReturnType<typeof usePamWebSocketCore>;
  startTime: number;
  messagesSent: number;
  messagesReceived: number;
  lastMessageTime?: number;
  responseTime?: number;
  errors: string[];
}

interface TestMetrics {
  duration: number;
  totalConnections: number;
  activeConnections: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  averageResponseTime: number;
  successRate: number;
  memoryUsage: number;
  reconnectionEvents: number;
}

// Individual connection component
const ConnectionTester: React.FC<{
  id: number;
  userId: string;
  token: string;
  onMessage: (connectionId: number, message: PamMessage) => void;
  onStatusChange: (connectionId: number, status: ConnectionStatus) => void;
  onError: (connectionId: number, error: string) => void;
}> = ({ id, userId, token, onMessage, onStatusChange, onError }) => {
  const websocket = usePamWebSocketUnified({
    userId: userId,
    token: token,
    onMessage: (message) => onMessage(id, message),
    onStatusChange: (status) => onStatusChange(id, status),
    autoReconnect: true,
    heartbeatInterval: 15000, // 15 seconds for testing
    deduplicationWindow: 3000
  });

  const [messageCount, setMessageCount] = useState(0);
  const lastPingRef = useRef<number>(0);

  // Send periodic test messages
  useEffect(() => {
    if (!websocket.isConnected) return;

    const interval = setInterval(() => {
      lastPingRef.current = Date.now();
      const success = websocket.sendMessage({
        type: 'message',
        message: `Test message ${messageCount + 1} from connection ${id}`,
        metadata: { testId: id, timestamp: Date.now() }
      });

      if (success) {
        setMessageCount(prev => prev + 1);
      }
    }, 8000); // Send message every 8 seconds

    return () => clearInterval(interval);
  }, [websocket.isConnected, websocket.sendMessage, id, messageCount]);

  return null; // This component doesn't render anything
};

const PAMWebSocketTester: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [connectionCount, setConnectionCount] = useState(5);
  const [connections, setConnections] = useState<Map<number, ConnectionInstance>>(new Map());
  const [metrics, setMetrics] = useState<TestMetrics>({
    duration: 0,
    totalConnections: 0,
    activeConnections: 0,
    totalMessagesSent: 0,
    totalMessagesReceived: 0,
    averageResponseTime: 0,
    successRate: 0,
    memoryUsage: 0,
    reconnectionEvents: 0
  });
  const [testLogs, setTestLogs] = useState<string[]>([]);

  const startTimeRef = useRef<number>(0);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const testMessageRef = useRef<number>(0);

  // Add log entry
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLogs(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]);
  }, []);

  // Handle message from any connection
  const handleMessage = useCallback((connectionId: number, message: PamMessage) => {
    setConnections(prev => {
      const newConnections = new Map(prev);
      const connection = newConnections.get(connectionId);
      if (connection) {
        connection.messagesReceived++;
        connection.lastMessageTime = Date.now();

        // Calculate response time if this is a response to our test message
        if (message.metadata?.testId === connectionId) {
          const responseTime = Date.now() - (message.metadata.timestamp || 0);
          connection.responseTime = responseTime;
        }

        newConnections.set(connectionId, connection);
      }
      return newConnections;
    });

    addLog(`📥 Connection ${connectionId}: ${message.type} - ${message.message?.substring(0, 50) || 'No content'}`);
  }, [addLog]);

  // Handle status change from any connection
  const handleStatusChange = useCallback((connectionId: number, status: ConnectionStatus) => {
    setConnections(prev => {
      const newConnections = new Map(prev);
      const connection = newConnections.get(connectionId);
      if (connection) {
        // Track reconnection events
        if (status === 'reconnecting') {
          setMetrics(m => ({ ...m, reconnectionEvents: m.reconnectionEvents + 1 }));
        }
        newConnections.set(connectionId, connection);
      }
      return newConnections;
    });

    addLog(`🔌 Connection ${connectionId}: Status changed to ${status}`);
  }, [addLog]);

  // Handle error from any connection
  const handleError = useCallback((connectionId: number, error: string) => {
    setConnections(prev => {
      const newConnections = new Map(prev);
      const connection = newConnections.get(connectionId);
      if (connection) {
        connection.errors.push(error);
        newConnections.set(connectionId, connection);
      }
      return newConnections;
    });

    addLog(`❌ Connection ${connectionId}: Error - ${error}`);
  }, [addLog]);

  // Update metrics
  const updateMetrics = useCallback(() => {
    const connectionsArray = Array.from(connections.values());
    const activeCount = connectionsArray.filter(c => c.hook.isConnected).length;
    const totalSent = connectionsArray.reduce((sum, c) => sum + c.messagesSent, 0);
    const totalReceived = connectionsArray.reduce((sum, c) => sum + c.messagesReceived, 0);

    const responseTimes = connectionsArray
      .filter(c => c.responseTime)
      .map(c => c.responseTime!);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const successRate = totalSent > 0 ? (totalReceived / totalSent) * 100 : 0;
    const memoryUsage = performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0;
    const duration = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;

    setMetrics({
      duration,
      totalConnections: connections.size,
      activeConnections: activeCount,
      totalMessagesSent: totalSent,
      totalMessagesReceived: totalReceived,
      averageResponseTime: Math.round(avgResponseTime),
      successRate: Math.round(successRate * 100) / 100,
      memoryUsage: Math.round(memoryUsage * 100) / 100,
      reconnectionEvents: metrics.reconnectionEvents
    });
  }, [connections, metrics.reconnectionEvents]);

  // Start test
  const startTest = useCallback(() => {
    if (!user?.id || !accessToken) {
      addLog('❌ User not authenticated');
      return;
    }

    setIsTestRunning(true);
    startTimeRef.current = Date.now();
    setConnections(new Map());
    setTestLogs([]);
    testMessageRef.current = 0;

    addLog(`🚀 Starting WebSocket test with ${connectionCount} connections`);

    // Start metrics update interval
    metricsIntervalRef.current = setInterval(updateMetrics, 1000);
  }, [user?.id, accessToken, connectionCount, addLog, updateMetrics]);

  // Stop test
  const stopTest = useCallback(() => {
    setIsTestRunning(false);

    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
      metricsIntervalRef.current = null;
    }

    // Disconnect all connections
    connections.forEach(connection => {
      connection.hook.disconnect();
    });

    addLog('🛑 Test stopped - All connections disconnected');
    updateMetrics();
  }, [connections, addLog, updateMetrics]);

  // Send test message to all connections
  const sendTestMessage = useCallback(() => {
    testMessageRef.current++;
    let sentCount = 0;

    connections.forEach((connection, id) => {
      if (connection.hook.isConnected) {
        const success = connection.hook.sendMessage({
          type: 'message',
          message: `Broadcast test message ${testMessageRef.current}`,
          metadata: { broadcast: true, timestamp: Date.now() }
        });

        if (success) {
          connection.messagesSent++;
          sentCount++;
        }
      }
    });

    addLog(`📤 Broadcast message ${testMessageRef.current} sent to ${sentCount} connections`);
  }, [connections, addLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, []);

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'reconnecting': return 'text-orange-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            PAM WebSocket Stability Tester
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Connections:</span>
              <select
                value={connectionCount}
                onChange={(e) => setConnectionCount(Number(e.target.value))}
                disabled={isTestRunning}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
              <Button
                onClick={startTest}
                disabled={isTestRunning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Start Test
              </Button>
              <Button
                onClick={stopTest}
                disabled={!isTestRunning}
                variant="outline"
              >
                Stop Test
              </Button>
              <Button
                onClick={sendTestMessage}
                disabled={!isTestRunning}
                variant="outline"
              >
                Send Broadcast
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.activeConnections}/{metrics.totalConnections}</div>
              <div className="text-sm text-gray-600">Active Connections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.successRate}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.averageResponseTime}ms</div>
              <div className="text-sm text-gray-600">Avg Response</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{metrics.memoryUsage}MB</div>
              <div className="text-sm text-gray-600">Memory Usage</div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Test Duration: {Math.floor(metrics.duration / 60)}m {metrics.duration % 60}s</span>
              <span>Messages: {metrics.totalMessagesReceived}/{metrics.totalMessagesSent}</span>
              <span>Reconnections: {metrics.reconnectionEvents}</span>
            </div>
            <Progress
              value={(metrics.activeConnections / Math.max(metrics.totalConnections, 1)) * 100}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Render connection testers when test is running */}
      {isTestRunning && user?.id && accessToken && (
        <div style={{ display: 'none' }}>
          {Array.from({ length: connectionCount }, (_, i) => (
            <ConnectionTester
              key={i}
              id={i + 1}
              userId={user.id}
              token={accessToken}
              onMessage={handleMessage}
              onStatusChange={handleStatusChange}
              onError={handleError}
            />
          ))}
        </div>
      )}

      {/* Connection Details */}
      {connections.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(connections.entries()).map(([id, connection]) => (
                <div key={id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Connection {id}</span>
                    <Badge
                      variant={connection.hook.isConnected ? 'default' : 'secondary'}
                      className={getStatusColor(connection.hook.connectionStatus)}
                    >
                      {connection.hook.connectionStatus}
                    </Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Sent:</span>
                      <span>{connection.messagesSent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Received:</span>
                      <span>{connection.messagesReceived}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reconnects:</span>
                      <span>{connection.hook.reconnectAttempts}</span>
                    </div>
                    {connection.responseTime && (
                      <div className="flex justify-between">
                        <span>Response:</span>
                        <span>{connection.responseTime}ms</span>
                      </div>
                    )}
                    {connection.errors.length > 0 && (
                      <div className="text-red-600 text-xs">
                        {connection.errors.length} errors
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Test Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 w-full border rounded p-3">
            <div className="space-y-1">
              {testLogs.map((log, index) => (
                <div key={index} className="text-sm font-mono">
                  {log}
                </div>
              ))}
              {testLogs.length === 0 && (
                <div className="text-sm text-gray-500 italic">
                  Start a test to see connection logs...
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default PAMWebSocketTester;