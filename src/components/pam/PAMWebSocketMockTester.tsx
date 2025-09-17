/**
 * PAM WebSocket Mock Tester - For Local Development
 * Day 2 - Hour 1: WebSocket Testing Without Supabase Dependencies
 *
 * This version simulates WebSocket connections for testing the infrastructure
 * without requiring full Supabase authentication setup
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MockConnection {
  id: number;
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
  messagesSent: number;
  messagesReceived: number;
  lastActivity: string;
  responseTime?: number;
  errors: string[];
  startTime: number;
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

const PAMWebSocketMockTester: React.FC = () => {
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [connectionCount, setConnectionCount] = useState(5);
  const [connections, setConnections] = useState<MockConnection[]>([]);
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
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);

  // Add log entry
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLogs(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]);
  }, []);

  // Simulate connection behavior
  const simulateConnection = useCallback((connectionId: number) => {
    // Initial connection simulation
    setTimeout(() => {
      setConnections(prev => prev.map(conn =>
        conn.id === connectionId
          ? { ...conn, status: 'connected' as const, lastActivity: new Date().toLocaleTimeString() }
          : conn
      ));
      addLog(`🔌 Connection ${connectionId}: Connected successfully`);
    }, Math.random() * 2000 + 500); // 0.5-2.5 seconds

    // Simulate periodic messages
    const messageInterval = setInterval(() => {
      if (!isTestRunning) {
        clearInterval(messageInterval);
        return;
      }

      setConnections(prev => prev.map(conn => {
        if (conn.id === connectionId && conn.status === 'connected') {
          const responseTime = Math.random() * 200 + 50; // 50-250ms

          // Simulate occasional network issues
          if (Math.random() < 0.05) { // 5% chance
            addLog(`⚠️ Connection ${connectionId}: Network hiccup, reconnecting...`);
            setTimeout(() => {
              setConnections(p => p.map(c =>
                c.id === connectionId
                  ? { ...c, status: 'connected' as const, lastActivity: new Date().toLocaleTimeString() }
                  : c
              ));
              addLog(`✅ Connection ${connectionId}: Reconnected`);
            }, 1000);

            return {
              ...conn,
              status: 'reconnecting' as const,
              lastActivity: new Date().toLocaleTimeString()
            };
          }

          return {
            ...conn,
            messagesSent: conn.messagesSent + 1,
            messagesReceived: conn.messagesReceived + (Math.random() < 0.95 ? 1 : 0), // 95% success rate
            responseTime,
            lastActivity: new Date().toLocaleTimeString()
          };
        }
        return conn;
      }));
    }, 5000 + Math.random() * 3000); // 5-8 seconds

    intervalsRef.current.push(messageInterval);
  }, [isTestRunning, addLog]);

  // Update metrics
  const updateMetrics = useCallback(() => {
    const activeCount = connections.filter(c => c.status === 'connected').length;
    const totalSent = connections.reduce((sum, c) => sum + c.messagesSent, 0);
    const totalReceived = connections.reduce((sum, c) => sum + c.messagesReceived, 0);

    const responseTimes = connections
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
      totalConnections: connections.length,
      activeConnections: activeCount,
      totalMessagesSent: totalSent,
      totalMessagesReceived: totalReceived,
      averageResponseTime: Math.round(avgResponseTime),
      successRate: Math.round(successRate * 100) / 100,
      memoryUsage: Math.round(memoryUsage * 100) / 100,
      reconnectionEvents: connections.reduce((sum, c) => sum + (c.status === 'reconnecting' ? 1 : 0), 0)
    });
  }, [connections]);

  // Start test
  const startTest = useCallback(() => {
    setIsTestRunning(true);
    startTimeRef.current = Date.now();
    setTestLogs([]);

    // Create mock connections
    const newConnections: MockConnection[] = Array.from({ length: connectionCount }, (_, i) => ({
      id: i + 1,
      status: 'connecting',
      messagesSent: 0,
      messagesReceived: 0,
      lastActivity: new Date().toLocaleTimeString(),
      errors: [],
      startTime: Date.now()
    }));

    setConnections(newConnections);
    addLog(`🚀 Starting mock WebSocket test with ${connectionCount} connections`);

    // Start simulating each connection
    newConnections.forEach(conn => {
      simulateConnection(conn.id);
    });
  }, [connectionCount, addLog, simulateConnection]);

  // Stop test
  const stopTest = useCallback(() => {
    setIsTestRunning(false);

    // Clear all intervals
    intervalsRef.current.forEach(interval => clearInterval(interval));
    intervalsRef.current = [];

    // Mark all connections as disconnected
    setConnections(prev => prev.map(conn => ({
      ...conn,
      status: 'disconnected' as const,
      lastActivity: new Date().toLocaleTimeString()
    })));

    addLog('🛑 Test stopped - All connections disconnected');
  }, [addLog]);

  // Send broadcast message
  const sendBroadcast = useCallback(() => {
    const connectedCount = connections.filter(c => c.status === 'connected').length;

    setConnections(prev => prev.map(conn =>
      conn.status === 'connected'
        ? { ...conn, messagesSent: conn.messagesSent + 1, lastActivity: new Date().toLocaleTimeString() }
        : conn
    ));

    addLog(`📤 Broadcast message sent to ${connectedCount} connections`);
  }, [connections, addLog]);

  // Simulate network interruption
  const simulateNetworkIssue = useCallback(() => {
    addLog('🌐 Simulating network interruption...');

    setConnections(prev => prev.map(conn =>
      conn.status === 'connected'
        ? { ...conn, status: 'reconnecting' as const, lastActivity: new Date().toLocaleTimeString() }
        : conn
    ));

    // Restore connections after 3 seconds
    setTimeout(() => {
      setConnections(prev => prev.map(conn =>
        conn.status === 'reconnecting'
          ? { ...conn, status: 'connected' as const, lastActivity: new Date().toLocaleTimeString() }
          : conn
      ));
      addLog('✅ Network restored - All connections recovered');
    }, 3000);
  }, [addLog]);

  // Update metrics periodically
  useEffect(() => {
    if (isTestRunning) {
      const interval = setInterval(updateMetrics, 1000);
      return () => clearInterval(interval);
    }
  }, [isTestRunning, updateMetrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach(interval => clearInterval(interval));
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'reconnecting': return 'text-orange-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'connected': return 'default';
      case 'connecting': return 'secondary';
      case 'reconnecting': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            PAM WebSocket Mock Tester (Local Development)
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
                Start Mock Test
              </Button>
              <Button
                onClick={stopTest}
                disabled={!isTestRunning}
                variant="outline"
              >
                Stop Test
              </Button>
              <Button
                onClick={sendBroadcast}
                disabled={!isTestRunning}
                variant="outline"
              >
                Send Broadcast
              </Button>
              <Button
                onClick={simulateNetworkIssue}
                disabled={!isTestRunning}
                variant="outline"
              >
                Network Issue
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-700 text-sm">
              <strong>Mock Testing Mode:</strong> This simulates WebSocket behavior for testing the infrastructure
              without requiring Supabase authentication. Real WebSocket testing available after environment setup.
            </p>
          </div>

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

      {/* Connection Details */}
      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.map((connection) => (
                <div key={connection.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Connection {connection.id}</span>
                    <Badge
                      variant={getStatusVariant(connection.status)}
                      className={getStatusColor(connection.status)}
                    >
                      {connection.status}
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
                    {connection.responseTime && (
                      <div className="flex justify-between">
                        <span>Response:</span>
                        <span>{connection.responseTime}ms</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Last:</span>
                      <span className="text-xs">{connection.lastActivity}</span>
                    </div>
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

export default PAMWebSocketMockTester;