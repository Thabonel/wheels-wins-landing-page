import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Send, Activity, Brain, MessageSquare, Settings, Cloud } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
// Claude service removed - PAM now uses backend Gemini integration
import { logger } from '@/lib/logger';

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
  apiKeyCheck: TestResult;
  backendServiceCheck: TestResult;
  toolsCheck: TestResult;
  chatTest: TestResult;
  lastCheck: Date | null;
}

export function PAMConnectionDiagnostic() {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [results, setResults] = useState<DiagnosticResults>({
    apiKeyCheck: { status: 'checking' },
    backendServiceCheck: { status: 'checking' },
    toolsCheck: { status: 'checking' },
    chatTest: { status: 'checking' },
    lastCheck: null
  });

  // Environment detection - determines which PAM backend to test
  const getEnvironment = (): 'production' | 'staging' => {
    if (typeof window !== 'undefined') {
      return window.location.hostname === 'wheelsandwins.com' ? 'production' : 'staging';
    }
    return 'staging';
  };

  // Get PAM backend URLs based on environment
  const getPamEndpoints = () => {
    const env = getEnvironment();
    const usePam2 = import.meta.env.VITE_USE_PAM_2 === 'true';

    if (usePam2) {
      // PAM 2.0 endpoints
      return {
        production: {
          health: 'https://pam-backend.onrender.com/api/v1/pam-2/health',
          chat: 'https://pam-backend.onrender.com/api/v1/pam-2/chat'
        },
        staging: {
          health: 'https://wheels-wins-backend-staging.onrender.com/api/v1/pam-2/health',
          chat: 'https://wheels-wins-backend-staging.onrender.com/api/v1/pam-2/chat'
        }
      }[env];
    } else {
      // PAM 1.0 endpoints (legacy)
      return {
        production: {
          health: 'https://pam-backend.onrender.com/api/health',
          chat: 'https://pam-backend.onrender.com/api/v1/pam/chat'
        },
        staging: {
          health: 'https://wheels-wins-backend-staging.onrender.com/api/health',
          chat: 'https://wheels-wins-backend-staging.onrender.com/api/v1/pam/chat'
        }
      }[env];
    }
  };

  const runApiKeyCheck = async (): Promise<TestResult> => {
    try {
      const startTime = Date.now();
      const usePam2 = import.meta.env.VITE_USE_PAM_2 === 'true';

      // Since PAM routes through backend, we test environment configuration
      const env = getEnvironment();
      const responseTime = Date.now() - startTime;

      return {
        status: 'success',
        message: `${usePam2 ? 'PAM 2.0' : 'PAM 1.0'} configured for ${env} environment`,
        responseTime,
        data: {
          environment: env,
          pamVersion: usePam2 ? '2.0' : '1.0',
          note: 'Backend handles API key authentication'
        }
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Configuration check failed',
        error: error.message || 'Unknown error'
      };
    }
  };

  const runBackendServiceCheck = async (): Promise<TestResult> => {
    try {
      const startTime = Date.now();
      const endpoints = getPamEndpoints();
      const env = getEnvironment();
      const usePam2 = import.meta.env.VITE_USE_PAM_2 === 'true';

      if (!endpoints) {
        return {
          status: 'error',
          message: 'No PAM endpoints configured for current environment',
          responseTime: Date.now() - startTime
        };
      }

      logger.info(`Testing ${usePam2 ? 'PAM 2.0' : 'PAM 1.0'} health endpoint for ${env}:`, endpoints.health);

      // Real health check to current environment's PAM backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(endpoints.health, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          status: 'success',
          message: `${usePam2 ? 'PAM 2.0' : 'PAM 1.0'} backend healthy on ${env}`,
          responseTime,
          endpoint: endpoints.health,
          statusCode: response.status,
          data: {
            service: data.service || 'PAM',
            version: data.version || (usePam2 ? '2.0.0' : '1.0.0'),
            environment: env,
            modules: data.modules || {},
            status: data.status || 'ok'
          }
        };
      } else {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        return {
          status: 'error',
          message: `PAM backend health check failed (${response.status})`,
          responseTime,
          endpoint: endpoints.health,
          statusCode: response.status,
          error: errorText
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      if (error.name === 'AbortError') {
        return {
          status: 'timeout',
          message: 'PAM backend health check timed out (>10s)',
          responseTime,
          endpoint: getPamEndpoints()?.health,
          error: 'Request timeout'
        };
      }

      return {
        status: 'error',
        message: 'PAM backend health check failed',
        responseTime,
        endpoint: getPamEndpoints()?.health,
        error: error.message || 'Network error'
      };
    }
  };

  const runToolsCheck = async (): Promise<TestResult> => {
    try {
      const startTime = Date.now();
      const endpoints = getPamEndpoints();
      const env = getEnvironment();
      const usePam2 = import.meta.env.VITE_USE_PAM_2 === 'true';

      if (!endpoints) {
        return {
          status: 'error',
          message: 'No PAM endpoints available for tools check',
          responseTime: Date.now() - startTime
        };
      }

      // For PAM 2.0, tools are integrated into the health endpoint response
      // For PAM 1.0, we check if the service is responsive
      logger.info(`Checking ${usePam2 ? 'PAM 2.0' : 'PAM 1.0'} tools availability for ${env}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch(endpoints.health, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();

        if (usePam2) {
          // PAM 2.0 returns modules status
          const modules = data.modules || {};
          const moduleCount = Object.keys(modules).length;
          const readyModules = Object.values(modules).filter(status => status === 'ready').length;

          return {
            status: readyModules === moduleCount ? 'success' : 'degraded',
            message: `${readyModules}/${moduleCount} PAM 2.0 modules ready`,
            responseTime,
            endpoint: endpoints.health,
            data: {
              modules,
              environment: env,
              totalModules: moduleCount,
              readyModules,
              provider: 'Gemini'
            }
          };
        } else {
          // PAM 1.0 basic tools availability
          return {
            status: 'success',
            message: 'PAM 1.0 tools available via backend',
            responseTime,
            endpoint: endpoints.health,
            data: {
              note: 'Tools integrated in backend service',
              provider: 'Backend-integrated',
              environment: env
            }
          };
        }
      } else {
        return {
          status: 'error',
          message: `Tools check failed - backend unreachable (${response.status})`,
          responseTime,
          endpoint: endpoints.health,
          statusCode: response.status
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      if (error.name === 'AbortError') {
        return {
          status: 'timeout',
          message: 'Tools check timed out',
          responseTime,
          error: 'Request timeout'
        };
      }

      return {
        status: 'error',
        message: 'Tools check failed',
        responseTime,
        error: error.message || 'Network error'
      };
    }
  };

  const runChatTest = async (): Promise<TestResult> => {
    try {
      // Check if user is authenticated
      if (!user) {
        return {
          status: 'error',
          message: 'No user logged in. Please log in to test PAM chat.'
        };
      }

      const startTime = Date.now();
      const endpoints = getPamEndpoints();
      const env = getEnvironment();
      const usePam2 = import.meta.env.VITE_USE_PAM_2 === 'true';

      if (!endpoints) {
        return {
          status: 'error',
          message: 'No PAM chat endpoints configured',
          responseTime: Date.now() - startTime
        };
      }

      logger.info(`Testing ${usePam2 ? 'PAM 2.0' : 'PAM 1.0'} chat for ${env}`, {
        userId: user.id,
        email: user.email,
        endpoint: endpoints.chat
      });

      // Prepare test message
      const testMessage = {
        user_id: user.id,
        message: "PAM diagnostic test - please respond with 'OK'",
        context: {
          region: 'admin-diagnostic',
          current_page: 'admin-diagnostics',
          test: true
        }
      };

      // Add session_id for PAM 2.0
      if (usePam2) {
        testMessage['session_id'] = `diagnostic-${Date.now()}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(endpoints.chat, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage)
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();

        // Check if we got a valid response
        const hasResponse = data.response || data.message;

        return {
          status: hasResponse ? 'success' : 'degraded',
          message: hasResponse
            ? `${usePam2 ? 'PAM 2.0' : 'PAM 1.0'} chat test successful on ${env}`
            : 'PAM responded but without message content',
          responseTime,
          endpoint: endpoints.chat,
          statusCode: response.status,
          data: {
            response: hasResponse,
            environment: env,
            pamVersion: usePam2 ? '2.0' : '1.0',
            metadata: data.metadata || null,
            fullResponse: data
          }
        };
      } else {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        return {
          status: 'error',
          message: `PAM chat test failed (${response.status})`,
          responseTime,
          endpoint: endpoints.chat,
          statusCode: response.status,
          error: errorText
        };
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      if (error.name === 'AbortError') {
        return {
          status: 'timeout',
          message: 'PAM chat test timed out (>15s)',
          responseTime,
          endpoint: getPamEndpoints()?.chat,
          error: 'Request timeout'
        };
      }

      logger.error(`${import.meta.env.VITE_USE_PAM_2 === 'true' ? 'PAM 2.0' : 'PAM 1.0'} chat test failed`, error);

      return {
        status: 'error',
        message: 'PAM chat test failed',
        responseTime,
        endpoint: getPamEndpoints()?.chat,
        error: { message: error.message || 'Unknown error', stack: error.stack }
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
      apiKeyCheck: { status: 'checking' },
      backendServiceCheck: { status: 'checking' },
      toolsCheck: { status: 'checking' },
      chatTest: { status: 'checking' },
      lastCheck: null
    }));

    try {
      // Run tests sequentially with progress updates
      if (showIndividualToasts) toast.info('1/4 Checking API key...');
      const apiKeyResult = await runApiKeyCheck();
      setResults(prev => ({ ...prev, apiKeyCheck: apiKeyResult }));

      if (showIndividualToasts) toast.info('2/4 Checking backend service...');
      const backendServiceResult = await runBackendServiceCheck();
      setResults(prev => ({ ...prev, backendServiceCheck: backendServiceResult }));

      if (showIndividualToasts) toast.info('3/4 Checking PAM tools...');
      const toolsResult = await runToolsCheck();
      setResults(prev => ({ ...prev, toolsCheck: toolsResult }));

      // Only test chat if core components are ready
      if (apiKeyResult.status === 'success' && backendServiceResult.status === 'success') {
        if (showIndividualToasts) toast.info('4/4 Testing PAM Backend Integration...');
        const chatResult = await runChatTest();
        setResults(prev => ({ 
          ...prev, 
          chatTest: chatResult,
          lastCheck: new Date()
        }));
      } else {
        setResults(prev => ({ 
          ...prev, 
          chatTest: { status: 'error', message: 'Skipped due to API key or service initialization issues' },
          lastCheck: new Date()
        }));
      }

      if (showIndividualToasts) {
        const allPassed = [apiKeyResult, backendServiceResult, toolsResult].every(
          r => ['success', 'operational'].includes(r.status)
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
    const statuses = [results.apiKeyCheck.status, results.backendServiceCheck.status, results.toolsCheck.status];
    
    if (statuses.includes('checking')) return 'checking';
    if (statuses.every(s => ['success', 'operational'].includes(s))) return 'success';
    if (statuses.some(s => ['error', 'offline'].includes(s))) return 'error';
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
          <p><strong>Environment:</strong> {getEnvironment().toUpperCase()}</p>
          <p><strong>PAM Version:</strong> {import.meta.env.VITE_USE_PAM_2 === 'true' ? '2.0 (Gemini)' : '1.0 (Legacy)'}</p>
          <p><strong>Backend URL:</strong> {getPamEndpoints()?.health || 'Not configured'}</p>
          <p><strong>User:</strong> {user?.email || 'Not logged in'}</p>
          {results.lastCheck && (
            <p><strong>Last checked:</strong> {results.lastCheck.toLocaleTimeString()}</p>
          )}
        </div>

        {/* Test Results */}
        <div className="space-y-3">
          {/* API Key Check */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Cloud className="w-4 h-4 text-gray-500" />
              <div>
                <span className="font-medium">1. Environment Configuration</span>
                {results.apiKeyCheck.responseTime && (
                  <div className="text-xs text-muted-foreground">
                    Check: {results.apiKeyCheck.responseTime}ms
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(results.apiKeyCheck.status)}
              <Badge variant={getStatusColor(results.apiKeyCheck.status) as any}>
                {results.apiKeyCheck.status}
              </Badge>
            </div>
          </div>
          {results.apiKeyCheck.message && (
            <div className="text-xs text-muted-foreground pl-4 -mt-2">
              {results.apiKeyCheck.message}
              {results.apiKeyCheck.error && ` | Error: ${results.apiKeyCheck.error}`}
            </div>
          )}

          {/* Backend Service Check */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Cloud className="w-4 h-4 text-gray-500" />
              <div>
                <span className="font-medium">2. Backend Service</span>
                {results.backendServiceCheck.responseTime && (
                  <div className="text-xs text-muted-foreground">
                    Response: {results.backendServiceCheck.responseTime}ms
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(results.backendServiceCheck.status)}
              <Badge variant={getStatusColor(results.backendServiceCheck.status) as any}>
                {results.backendServiceCheck.status}
              </Badge>
            </div>
          </div>
          {results.backendServiceCheck.message && (
            <div className="text-xs text-muted-foreground pl-4 -mt-2">
              {results.backendServiceCheck.message}
            </div>
          )}

          {/* Tools Check */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-gray-500" />
              <div>
                <span className="font-medium">3. PAM Tools Registry</span>
                {results.toolsCheck.responseTime && (
                  <div className="text-xs text-muted-foreground">
                    Loading: {results.toolsCheck.responseTime}ms
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(results.toolsCheck.status)}
              <Badge variant={getStatusColor(results.toolsCheck.status) as any}>
                {results.toolsCheck.status}
              </Badge>
            </div>
          </div>
          {results.toolsCheck.message && (
            <div className="text-xs text-muted-foreground pl-4 -mt-2">
              {results.toolsCheck.message}
            </div>
          )}

          {/* Chat Test */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <div>
                <span className="font-medium">4. PAM Chat Test</span>
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
                <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-xs overflow-auto max-h-40">
                  <strong>Backend Response:</strong>
                  <div className="mt-1 whitespace-pre-wrap break-words">
                    {typeof results.chatTest.data.response === 'string' 
                      ? results.chatTest.data.response
                      : JSON.stringify(results.chatTest.data, null, 2)}
                  </div>
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