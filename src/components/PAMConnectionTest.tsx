import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Send } from 'lucide-react';
import { API_BASE_URL } from '@/services/api';
import { pamHealthCheck } from '@/services/pamHealthCheck';
import { PamApiService } from '@/services/pamApiService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export function PAMConnectionTest() {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    healthCheck?: any;
    websocketTest?: any;
    apiTest?: any;
    chatTest?: any;
  }>({});

  const runFullTest = async () => {
    setTesting(true);
    setResults({});

    try {
      // 1. Health Check
      toast.info('Testing PAM backend health...');
      const healthResult = await pamHealthCheck.checkHealth();
      setResults(prev => ({ ...prev, healthCheck: healthResult }));

      // 2. WebSocket Test
      toast.info('Testing WebSocket connection...');
      const wsResult = await testWebSocket();
      setResults(prev => ({ ...prev, websocketTest: wsResult }));

      // 3. API Test
      toast.info('Testing PAM API endpoints...');
      const apiResult = await testAPI();
      setResults(prev => ({ ...prev, apiTest: apiResult }));

      // 4. Chat Test (if other tests pass)
      if (healthResult.status === 'online') {
        toast.info('Testing PAM chat functionality...');
        const chatResult = await testChat();
        setResults(prev => ({ ...prev, chatTest: chatResult }));
      }

      toast.success('PAM connection test completed!');
    } catch (error) {
      console.error('Test failed:', error);
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const testWebSocket = async () => {
    return new Promise((resolve) => {
      try {
        const wsUrl = `${API_BASE_URL.replace(/^http/, 'ws')}/api/v1/pam/ws?token=test-connection`;
        const ws = new WebSocket(wsUrl);
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve({ status: 'timeout', message: 'WebSocket connection timed out' });
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve({ status: 'success', message: 'WebSocket connection successful' });
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          resolve({ status: 'error', message: 'WebSocket connection failed', error });
        };
      } catch (error) {
        resolve({ status: 'error', message: 'WebSocket test failed', error });
      }
    });
  };

  const testAPI = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/pam/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        return { status: 'success', message: 'PAM API responding', data };
      } else {
        return { status: 'error', message: `API returned ${response.status}`, statusCode: response.status };
      }
    } catch (error) {
      return { status: 'error', message: 'API test failed', error };
    }
  };

  const testChat = async () => {
    try {
      const pamService = PamApiService.getInstance();
      const result = await pamService.sendMessage({
        message: 'Hello PAM! This is a connection test.',
        user_id: user?.id || 'test-user'
      });
      
      if (result.response || result.message || result.content) {
        return { status: 'success', message: 'PAM chat is working!', response: result };
      } else {
        return { status: 'error', message: 'No response from PAM', result };
      }
    } catch (error) {
      return { status: 'error', message: 'Chat test failed', error };
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'timeout':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
      case 'online':
        return 'success';
      case 'error':
      case 'offline':
        return 'destructive';
      case 'timeout':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          PAM Connection Test
          <Button onClick={runFullTest} disabled={testing}>
            {testing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {testing ? 'Testing...' : 'Run Full Test'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          <p>Backend URL: {API_BASE_URL}</p>
          <p>User: {user?.email || 'Not logged in'}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded">
            <span className="font-medium">1. Health Check</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(results.healthCheck?.status)}
              <Badge variant={getStatusColor(results.healthCheck?.status) as any}>
                {results.healthCheck?.status || 'Not tested'}
              </Badge>
            </div>
          </div>
          {results.healthCheck && (
            <div className="text-xs text-muted-foreground pl-4">
              {results.healthCheck.endpoint && `Endpoint: ${results.healthCheck.endpoint}`}
              {results.healthCheck.responseTime && ` | Response time: ${results.healthCheck.responseTime}ms`}
              {results.healthCheck.error && ` | Error: ${results.healthCheck.error}`}
            </div>
          )}

          <div className="flex items-center justify-between p-3 border rounded">
            <span className="font-medium">2. WebSocket Connection</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(results.websocketTest?.status)}
              <Badge variant={getStatusColor(results.websocketTest?.status) as any}>
                {results.websocketTest?.status || 'Not tested'}
              </Badge>
            </div>
          </div>
          {results.websocketTest && (
            <div className="text-xs text-muted-foreground pl-4">
              {results.websocketTest.message}
            </div>
          )}

          <div className="flex items-center justify-between p-3 border rounded">
            <span className="font-medium">3. PAM API</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(results.apiTest?.status)}
              <Badge variant={getStatusColor(results.apiTest?.status) as any}>
                {results.apiTest?.status || 'Not tested'}
              </Badge>
            </div>
          </div>
          {results.apiTest && (
            <div className="text-xs text-muted-foreground pl-4">
              {results.apiTest.message}
              {results.apiTest.statusCode && ` (${results.apiTest.statusCode})`}
            </div>
          )}

          <div className="flex items-center justify-between p-3 border rounded">
            <span className="font-medium">4. PAM Chat</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(results.chatTest?.status)}
              <Badge variant={getStatusColor(results.chatTest?.status) as any}>
                {results.chatTest?.status || 'Not tested'}
              </Badge>
            </div>
          </div>
          {results.chatTest && (
            <div className="text-xs text-muted-foreground pl-4">
              {results.chatTest.message}
              {results.chatTest.response && (
                <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                  Response: {JSON.stringify(results.chatTest.response, null, 2)}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}