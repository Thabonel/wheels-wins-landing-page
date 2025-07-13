import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Send, Activity, Wifi, MessageSquare, Database } from 'lucide-react';
import { pamHealthCheck } from '@/services/pamHealthCheck';
import { PamApiService } from '@/services/pamApiService';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/services/api';

interface TestResult {
  status: 'checking' | 'success' | 'error' | 'timeout' | 'online' | 'offline' | 'connected' | 'disconnected' | 'operational' | 'degraded';
  message?: string;
  error?: any;
  data?: any;
  responseTime?: number;
  endpoint?: string;
  statusCode?: number;
}

interface DiagnosticResults {
  healthCheck: TestResult;
  websocketTest: TestResult;
  apiTest: TestResult;
  chatTest: TestResult;
  lastCheck: Date | null;
}

export function PAMConnectionDiagnostic() {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [results, setResults] = useState<DiagnosticResults>({
    healthCheck: { status: 'checking' },
    websocketTest: { status: 'checking' },
    apiTest: { status: 'checking' },
    chatTest: { status: 'checking' },
    lastCheck: null
  });

  const runHealthCheck = async (): Promise<TestResult> => {
    try {
      const startTime = Date.now();
      const result = await pamHealthCheck.checkHealth();
      const responseTime = Date.now() - startTime;
      
      if (result.status === 'online') {
        return {
          status: 'online',
          message: 'Backend is healthy and responding',
          responseTime,
          endpoint: result.endpoint,
          data: result
        };
      } else {
        return {
          status: 'offline',
          message: result.error || 'Backend health check failed',
          responseTime,
          endpoint: result.endpoint
        };
      }
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Health check failed',
        error: error.message || 'Unknown error'
      };
    }
  };

  const runWebSocketTest = async (): Promise<TestResult> => {
    return new Promise((resolve) => {
      try {
        const wsUrl = `${API_BASE_URL.replace(/^http/, 'ws')}/api/v1/pam/ws?token=test-connection`;
        const ws = new WebSocket(wsUrl);
        const startTime = Date.now();
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve({ 
            status: 'timeout', 
            message: 'WebSocket connection timed out after 8 seconds',
            responseTime: Date.now() - startTime
          });
        }, 8000);

        ws.onopen = () => {
          // Send a ping to ensure full connectivity
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            clearTimeout(timeout);
            ws.close();
            resolve({ 
              status: 'connected', 
              message: 'WebSocket connection successful',
              responseTime: Date.now() - startTime,
              data
            });
          } catch (error) {
            clearTimeout(timeout);
            ws.close();
            resolve({ 
              status: 'error', 
              message: 'WebSocket message parse error',
              error
            });
          }
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          resolve({ 
            status: 'error', 
            message: 'WebSocket connection failed',
            error,
            responseTime: Date.now() - startTime
          });
        };

        ws.onclose = (event) => {
          clearTimeout(timeout);
          if (event.code === 1000) {
            // Normal closure - connection was successful
            resolve({ 
              status: 'connected', 
              message: 'WebSocket connection successful (normal closure)',
              responseTime: Date.now() - startTime
            });
          } else {
            resolve({ 
              status: 'disconnected', 
              message: `WebSocket closed unexpectedly (code: ${event.code})`,
              responseTime: Date.now() - startTime
            });
          }
        };
      } catch (error) {
        resolve({ 
          status: 'error', 
          message: 'WebSocket test setup failed',
          error
        });
      }
    });
  };

  const runAPITest = async (): Promise<TestResult> => {
    try {
      const startTime = Date.now();
      
      // First try the PAM health endpoint
      try {
        const healthResponse = await fetch(`${API_BASE_URL}/api/v1/pam/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        
        const responseTime = Date.now() - startTime;
        
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          return {
            status: healthData.status === 'healthy' ? 'operational' : 'degraded',
            message: `PAM API responding (${healthData.status})`,
            responseTime,
            data: healthData
          };
        }
      } catch (error) {
        // Fall through to OPTIONS test
      }
      
      // Fallback to OPTIONS check on chat endpoint
      const response = await fetch(`${API_BASE_URL}/api/v1/pam/chat`, {
        method: 'OPTIONS',
        signal: AbortSignal.timeout(5000)
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok || response.status === 200 || response.status === 204) {
        return {
          status: 'operational',
          message: 'PAM API endpoints accessible',
          responseTime,
          statusCode: response.status
        };
      } else if (response.status >= 500) {
        return {
          status: 'offline',
          message: `API server error (${response.status})`,
          responseTime,
          statusCode: response.status
        };
      } else {
        return {
          status: 'degraded',
          message: `API partially accessible (${response.status})`,
          responseTime,
          statusCode: response.status
        };
      }
    } catch (error: any) {
      return {
        status: 'offline',
        message: 'API test failed',
        error: error.message || 'Unknown error'
      };
    }
  };

  const runChatTest = async (): Promise<TestResult> => {
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { 
          status: 'error', 
          message: 'No authentication token available. Please log in.' 
        };
      }

      const startTime = Date.now();
      const pamService = PamApiService.getInstance();
      const result = await pamService.sendMessage({
        message: 'Hello PAM! This is a connection test from the observability dashboard.',
        user_id: user?.id || 'test-user'
      }, session.access_token);
      
      const responseTime = Date.now() - startTime;
      
      if (result.response || result.message || result.content) {
        return { 
          status: 'success', 
          message: 'PAM chat is working! Received response from AI.',
          responseTime,
          data: result 
        };
      } else {
        return { 
          status: 'error', 
          message: 'No response from PAM chat',
          responseTime,
          data: result 
        };
      }
    } catch (error: any) {
      // Check if it's an authentication or authorization error
      const errorMessage = error.message || 'Unknown error';
      
      if (errorMessage.includes('All PAM HTTP endpoints failed')) {
        return { 
          status: 'error', 
          message: 'PAM chat requires valid authentication. Backend is operational but chat needs login.',
          error 
        };
      }
      
      if (errorMessage.includes('credentials') || errorMessage.includes('authentication')) {
        return { 
          status: 'error', 
          message: 'Authentication required for PAM chat. Please ensure you are logged in.',
          error 
        };
      }
      
      return { 
        status: 'error', 
        message: `Chat test failed: ${errorMessage}`,
        error 
      };
    }
  };

  const runComprehensiveTest = async (showIndividualToasts = false) => {
    setTesting(true);
    
    if (showIndividualToasts) {
      toast.info('Running comprehensive PAM diagnostics...');
    }

    // Initialize all tests as checking
    setResults(prev => ({
      healthCheck: { status: 'checking' },
      websocketTest: { status: 'checking' },
      apiTest: { status: 'checking' },
      chatTest: { status: 'checking' },
      lastCheck: null
    }));

    try {
      // Run tests sequentially with progress updates
      if (showIndividualToasts) toast.info('1/4 Testing backend health...');
      const healthResult = await runHealthCheck();
      setResults(prev => ({ ...prev, healthCheck: healthResult }));

      if (showIndividualToasts) toast.info('2/4 Testing WebSocket connection...');
      const websocketResult = await runWebSocketTest();
      setResults(prev => ({ ...prev, websocketTest: websocketResult }));

      if (showIndividualToasts) toast.info('3/4 Testing PAM API...');
      const apiResult = await runAPITest();
      setResults(prev => ({ ...prev, apiTest: apiResult }));

      // Only test chat if backend is healthy
      if (healthResult.status === 'online' || healthResult.status === 'success') {
        if (showIndividualToasts) toast.info('4/4 Testing PAM chat...');
        const chatResult = await runChatTest();
        setResults(prev => ({ 
          ...prev, 
          chatTest: chatResult,
          lastCheck: new Date()
        }));
      } else {
        setResults(prev => ({ 
          ...prev, 
          chatTest: { status: 'error', message: 'Skipped due to backend health issues' },
          lastCheck: new Date()
        }));
      }

      if (showIndividualToasts) {
        const allPassed = [healthResult, websocketResult, apiResult].every(
          r => ['online', 'success', 'connected', 'operational'].includes(r.status)
        );
        
        if (allPassed) {
          toast.success('✅ All PAM diagnostics passed!');
        } else {
          toast.warning('⚠️ Some PAM diagnostics failed. Check details below.');
        }
      }
    } catch (error) {
      console.error('Comprehensive test failed:', error);
      if (showIndividualToasts) {
        toast.error('❌ PAM diagnostics failed');
      }
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    runComprehensiveTest(false);
    
    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => runComprehensiveTest(false), 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'connected':
      case 'operational':
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline':
      case 'disconnected':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'checking':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case 'timeout':
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'connected':
      case 'operational':
      case 'success':
        return 'default';
      case 'offline':
      case 'disconnected':
      case 'error':
        return 'destructive';
      case 'checking':
        return 'secondary';
      case 'timeout':
      case 'degraded':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getOverallStatus = () => {
    const statuses = [results.healthCheck.status, results.websocketTest.status, results.apiTest.status];
    
    if (statuses.includes('checking')) return 'checking';
    if (statuses.every(s => ['online', 'success', 'connected', 'operational'].includes(s))) return 'success';
    if (statuses.some(s => ['offline', 'error', 'disconnected'].includes(s))) return 'error';
    return 'warning';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            PAM Connection Diagnostic
            <Badge variant={getStatusColor(getOverallStatus())} className="ml-2">
              {testing ? 'Testing...' : getOverallStatus()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => runComprehensiveTest(false)}
              disabled={testing}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${testing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={() => runComprehensiveTest(true)} 
              disabled={testing}
              size="sm"
            >
              {testing ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              Run Full Test
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Details */}
        <div className="text-sm text-muted-foreground space-y-1 pb-2 border-b">
          <p><strong>Backend URL:</strong> {API_BASE_URL}</p>
          <p><strong>WebSocket URL:</strong> {API_BASE_URL.replace(/^http/, 'ws')}/api/v1/pam/ws</p>
          <p><strong>User:</strong> {user?.email || 'Not logged in'}</p>
          {results.lastCheck && (
            <p><strong>Last checked:</strong> {results.lastCheck.toLocaleTimeString()}</p>
          )}
        </div>

        {/* Test Results */}
        <div className="space-y-3">
          {/* Health Check */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-gray-500" />
              <div>
                <span className="font-medium">1. Backend Health</span>
                {results.healthCheck.responseTime && (
                  <div className="text-xs text-muted-foreground">
                    Response: {results.healthCheck.responseTime}ms
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(results.healthCheck.status)}
              <Badge variant={getStatusColor(results.healthCheck.status) as any}>
                {results.healthCheck.status}
              </Badge>
            </div>
          </div>
          {results.healthCheck.message && (
            <div className="text-xs text-muted-foreground pl-4 -mt-2">
              {results.healthCheck.message}
              {results.healthCheck.error && ` | Error: ${results.healthCheck.error}`}
            </div>
          )}

          {/* WebSocket Test */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Wifi className="w-4 h-4 text-gray-500" />
              <div>
                <span className="font-medium">2. WebSocket Connection</span>
                {results.websocketTest.responseTime && (
                  <div className="text-xs text-muted-foreground">
                    Connection: {results.websocketTest.responseTime}ms
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(results.websocketTest.status)}
              <Badge variant={getStatusColor(results.websocketTest.status) as any}>
                {results.websocketTest.status}
              </Badge>
            </div>
          </div>
          {results.websocketTest.message && (
            <div className="text-xs text-muted-foreground pl-4 -mt-2">
              {results.websocketTest.message}
            </div>
          )}

          {/* API Test */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-gray-500" />
              <div>
                <span className="font-medium">3. PAM API Endpoints</span>
                {results.apiTest.responseTime && (
                  <div className="text-xs text-muted-foreground">
                    Response: {results.apiTest.responseTime}ms
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(results.apiTest.status)}
              <Badge variant={getStatusColor(results.apiTest.status) as any}>
                {results.apiTest.status}
              </Badge>
            </div>
          </div>
          {results.apiTest.message && (
            <div className="text-xs text-muted-foreground pl-4 -mt-2">
              {results.apiTest.message}
              {results.apiTest.statusCode && ` (${results.apiTest.statusCode})`}
            </div>
          )}

          {/* Chat Test */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <div>
                <span className="font-medium">4. PAM Chat Functionality</span>
                {results.chatTest.responseTime && (
                  <div className="text-xs text-muted-foreground">
                    Response: {results.chatTest.responseTime}ms
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(results.chatTest.status)}
              <Badge variant={getStatusColor(results.chatTest.status) as any}>
                {results.chatTest.status}
              </Badge>
            </div>
          </div>
          {results.chatTest.message && (
            <div className="text-xs text-muted-foreground pl-4 -mt-2">
              {results.chatTest.message}
              {results.chatTest.data && results.chatTest.status === 'success' && (
                <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-xs">
                  <strong>AI Response Preview:</strong> {
                    typeof results.chatTest.data.response === 'string' 
                      ? results.chatTest.data.response.substring(0, 100) + '...'
                      : JSON.stringify(results.chatTest.data).substring(0, 100) + '...'
                  }
                </div>
              )}
              {results.chatTest.error && (
                <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                  <strong>Error:</strong> {typeof results.chatTest.error === 'object' 
                    ? JSON.stringify(results.chatTest.error) 
                    : results.chatTest.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Overall Status Summary */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Status:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(getOverallStatus())}
              <Badge variant={getStatusColor(getOverallStatus()) as any} className="capitalize">
                {testing ? 'Testing in progress...' : 
                 getOverallStatus() === 'success' ? 'All systems operational' :
                 getOverallStatus() === 'error' ? 'Issues detected' :
                 getOverallStatus() === 'warning' ? 'Partial functionality' :
                 'System check in progress'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}