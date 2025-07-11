import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { pamHealthCheck } from '@/services/pamHealthCheck';
import { API_BASE_URL } from '@/services/api';

export function PamConnectionDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<{
    backendHealth: 'checking' | 'online' | 'offline' | 'error';
    websocketStatus: 'checking' | 'connected' | 'disconnected' | 'error';
    apiStatus: 'checking' | 'operational' | 'degraded' | 'offline';
    lastCheck: Date | null;
    error?: string;
  }>({
    backendHealth: 'checking',
    websocketStatus: 'checking',
    apiStatus: 'checking',
    lastCheck: null
  });

  const checkBackendHealth = async () => {
    try {
      const result = await pamHealthCheck.checkHealth();
      return result.status === 'online' ? 'online' : 'offline';
    } catch (error) {
      console.error('Health check error:', error);
      return 'error';
    }
  };

  const checkWebSocketConnection = async (): Promise<'connected' | 'disconnected' | 'error'> => {
    return new Promise((resolve) => {
      try {
        const wsUrl = `${API_BASE_URL.replace(/^http/, 'ws')}/api/v1/pam/ws?token=test-connection`;
        const ws = new WebSocket(wsUrl);
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve('disconnected');
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve('connected');
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve('error');
        };
      } catch (error) {
        resolve('error');
      }
    });
  };

  const checkAPIStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/pam/chat`, {
        method: 'OPTIONS',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok || response.status === 200 || response.status === 204) {
        return 'operational';
      } else if (response.status >= 500) {
        return 'offline';
      } else {
        return 'degraded';
      }
    } catch (error) {
      return 'offline';
    }
  };

  const runDiagnostics = async () => {
    setDiagnostics(prev => ({
      ...prev,
      backendHealth: 'checking',
      websocketStatus: 'checking',
      apiStatus: 'checking'
    }));

    const [backendHealth, websocketStatus, apiStatus] = await Promise.all([
      checkBackendHealth(),
      checkWebSocketConnection(),
      checkAPIStatus()
    ]);

    setDiagnostics({
      backendHealth: backendHealth as any,
      websocketStatus: websocketStatus as any,
      apiStatus: apiStatus as any,
      lastCheck: new Date()
    });
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'connected':
      case 'operational':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline':
      case 'disconnected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'checking':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'connected':
      case 'operational':
        return 'success';
      case 'offline':
      case 'disconnected':
        return 'destructive';
      case 'checking':
        return 'secondary';
      default:
        return 'warning';
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          PAM Connection Diagnostic
          <Button size="sm" variant="outline" onClick={runDiagnostics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Backend Health</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnostics.backendHealth)}
              <Badge variant={getStatusColor(diagnostics.backendHealth) as any}>
                {diagnostics.backendHealth}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">WebSocket Status</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnostics.websocketStatus)}
              <Badge variant={getStatusColor(diagnostics.websocketStatus) as any}>
                {diagnostics.websocketStatus}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">API Status</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnostics.apiStatus)}
              <Badge variant={getStatusColor(diagnostics.apiStatus) as any}>
                {diagnostics.apiStatus}
              </Badge>
            </div>
          </div>
        </div>
        
        {diagnostics.lastCheck && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Last checked: {diagnostics.lastCheck.toLocaleTimeString()}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Backend URL: {API_BASE_URL}</p>
          <p>WebSocket URL: {API_BASE_URL.replace(/^http/, 'ws')}/api/v1/pam/ws</p>
        </div>
      </CardContent>
    </Card>
  );
}