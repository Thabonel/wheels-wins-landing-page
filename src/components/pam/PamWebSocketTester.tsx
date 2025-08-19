import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  test: string;
  status: 'pending' | 'running' | 'success' | 'failure' | 'warning';
  message: string;
  details?: any;
}

export default function PamWebSocketTester() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const updateTestResult = (test: string, status: TestResult['status'], message: string, details?: any) => {
    setTestResults(prev => {
      const existing = prev.findIndex(r => r.test === test);
      const result = { test, status, message, details };
      
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = result;
        return updated;
      }
      return [...prev, result];
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: Authentication
    updateTestResult('Authentication', 'running', 'Checking authentication...');
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      updateTestResult('Authentication', 'failure', 'Not authenticated', authError);
      setIsRunning(false);
      return;
    }
    
    updateTestResult('Authentication', 'success', 'Authenticated successfully', {
      userId: user?.id,
      hasToken: !!session.access_token
    });

    // Test 2: Backend URL Configuration
    updateTestResult('Backend URL', 'running', 'Checking backend configuration...');
    
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://wheels-wins-backend-staging.onrender.com';
    const wsUrl = backendUrl.replace(/^http/, 'ws');
    
    updateTestResult('Backend URL', 'success', `Backend: ${backendUrl}`, {
      httpUrl: backendUrl,
      wsUrl: wsUrl
    });

    // Test 3: HTTP Backend Health
    updateTestResult('Backend Health', 'running', 'Checking backend health...');
    
    try {
      const healthResponse = await fetch(`${backendUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        updateTestResult('Backend Health', 'success', 'Backend is healthy', healthData);
      } else {
        updateTestResult('Backend Health', 'failure', `Backend returned ${healthResponse.status}`, {
          status: healthResponse.status,
          statusText: healthResponse.statusText
        });
      }
    } catch (error) {
      updateTestResult('Backend Health', 'failure', 'Cannot reach backend', error);
    }

    // Test 4: WebSocket URL Construction
    updateTestResult('WebSocket URL', 'running', 'Constructing WebSocket URL...');
    
    const finalWsUrl = `${wsUrl}/api/v1/pam/ws/${user?.id}?token=${encodeURIComponent(session.access_token)}`;
    
    updateTestResult('WebSocket URL', 'success', 'WebSocket URL constructed', {
      url: finalWsUrl.replace(session.access_token, '[TOKEN]'),
      hasUserId: !!user?.id,
      hasToken: !!session.access_token
    });

    // Test 5: WebSocket Connection
    updateTestResult('WebSocket Connection', 'running', 'Attempting WebSocket connection...');
    
    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      wsRef.current = new WebSocket(finalWsUrl);
      
      const connectionTimeout = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CONNECTING) {
          updateTestResult('WebSocket Connection', 'failure', 'Connection timeout', {
            readyState: wsRef.current.readyState,
            timeout: '5 seconds'
          });
          wsRef.current.close();
        }
      }, 5000);

      wsRef.current.onopen = () => {
        clearTimeout(connectionTimeout);
        updateTestResult('WebSocket Connection', 'success', 'Connected successfully', {
          readyState: 'OPEN',
          url: wsRef.current?.url?.replace(session.access_token, '[TOKEN]')
        });

        // Test 6: Send Test Message
        updateTestResult('Send Message', 'running', 'Sending test message...');
        
        const testMessage = {
          type: 'test',
          message: 'WebSocket connection test',
          timestamp: new Date().toISOString()
        };
        
        try {
          wsRef.current?.send(JSON.stringify(testMessage));
          updateTestResult('Send Message', 'success', 'Message sent successfully', testMessage);
        } catch (error) {
          updateTestResult('Send Message', 'failure', 'Failed to send message', error);
        }
      };

      wsRef.current.onmessage = (event) => {
        updateTestResult('Receive Message', 'success', 'Received message from server', {
          data: event.data,
          timestamp: new Date().toISOString()
        });
      };

      wsRef.current.onerror = (event) => {
        clearTimeout(connectionTimeout);
        updateTestResult('WebSocket Connection', 'failure', 'WebSocket error occurred', {
          type: 'error',
          readyState: wsRef.current?.readyState
        });
      };

      wsRef.current.onclose = (event) => {
        clearTimeout(connectionTimeout);
        
        const closeReasons: { [key: number]: string } = {
          1000: 'Normal closure',
          1001: 'Going away',
          1002: 'Protocol error',
          1003: 'Unsupported data',
          1006: 'Abnormal closure (no close frame)',
          1009: 'Message too big',
          1011: 'Internal server error',
          4000: 'Authentication failed',
          4001: 'Token expired',
          4002: 'Invalid user ID'
        };
        
        const isNormalClose = event.code === 1000 || event.code === 1001;
        
        updateTestResult('WebSocket Close', isNormalClose ? 'warning' : 'failure', 
          `Connection closed: ${closeReasons[event.code] || 'Unknown reason'}`, {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean
        });
      };

    } catch (error) {
      updateTestResult('WebSocket Connection', 'failure', 'Failed to create WebSocket', error);
    }

    // Test 7: CORS Headers (via HTTP)
    updateTestResult('CORS Configuration', 'running', 'Checking CORS headers...');
    
    try {
      const corsResponse = await fetch(`${backendUrl}/api/cors/debug`, {
        headers: {
          'Origin': window.location.origin
        }
      });
      
      const corsHeaders = {
        'access-control-allow-origin': corsResponse.headers.get('access-control-allow-origin'),
        'access-control-allow-credentials': corsResponse.headers.get('access-control-allow-credentials')
      };
      
      if (corsHeaders['access-control-allow-origin']) {
        updateTestResult('CORS Configuration', 'success', 'CORS properly configured', corsHeaders);
      } else {
        updateTestResult('CORS Configuration', 'warning', 'CORS headers not present', corsHeaders);
      }
    } catch (error) {
      updateTestResult('CORS Configuration', 'warning', 'Could not verify CORS', error);
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failure':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      success: 'default',
      failure: 'destructive',
      warning: 'secondary',
      running: 'outline'
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const overallStatus = testResults.every(r => r.status === 'success') ? 'success' :
                       testResults.some(r => r.status === 'failure') ? 'failure' :
                       testResults.some(r => r.status === 'warning') ? 'warning' : 'pending';

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {overallStatus === 'success' ? <Wifi className="h-6 w-6 text-green-500" /> :
             overallStatus === 'failure' ? <WifiOff className="h-6 w-6 text-red-500" /> :
             <Wifi className="h-6 w-6 text-gray-400" />}
            PAM WebSocket Connection Tester
          </div>
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Tests
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!user ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to test PAM WebSocket connection.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {testResults.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Click "Run Tests" to verify PAM WebSocket connectivity
              </p>
            ) : (
              <>
                {testResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="font-semibold">{result.test}</span>
                      </div>
                      {getStatusBadge(result.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                          View Details
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
                
                {overallStatus === 'success' && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      All tests passed! PAM WebSocket connection is working properly.
                    </AlertDescription>
                  </Alert>
                )}
                
                {overallStatus === 'failure' && (
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      Some tests failed. Please check the details above to identify the issue.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}