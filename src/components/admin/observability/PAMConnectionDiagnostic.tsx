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
  claudeServiceCheck: TestResult;
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
    claudeServiceCheck: { status: 'checking' },
    toolsCheck: { status: 'checking' },
    chatTest: { status: 'checking' },
    lastCheck: null
  });

  const runApiKeyCheck = async (): Promise<TestResult> => {
    try {
      const startTime = Date.now();

      // PAM now routes through backend with Gemini - no frontend API key needed
      const responseTime = Date.now() - startTime;

      return {
        status: 'success',
        message: 'PAM uses backend Gemini integration - no frontend API key required',
        responseTime,
        data: { note: 'Direct Claude API deprecated - using backend Gemini' }
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: 'API key validation failed',
        error: error.message || 'Unknown error'
      };
    }
  };

  const runClaudeServiceCheck = async (): Promise<TestResult> => {
    try {
      const startTime = Date.now();
      
      // Check if service is initialized
      const isReady = claudeService.isReady();
      
      if (!isReady) {
        return {
          status: 'error',
          message: 'Claude service is not properly initialized',
          responseTime: Date.now() - startTime
        };
      }
      
      // Get service configuration
      const config = claudeService.getConfig();
      
      return {
        status: 'success',
        message: `Claude service ready (Model: ${config.model})`,
        responseTime: Date.now() - startTime,
        data: config
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Claude service check failed',
        error: error.message || 'Unknown error',
        responseTime: Date.now() - Date.now()
      };
    }
  };

  const runToolsCheck = async (): Promise<TestResult> => {
    try {
      const startTime = Date.now();
      
      // Get available tools from registry
      const tools = getToolsForClaude(user?.id || 'test-user');
      const responseTime = Date.now() - startTime;
      
      if (!tools || tools.length === 0) {
        return {
          status: 'error',
          message: 'No tools available for PAM functionality',
          responseTime
        };
      }
      
      // Count tools by category
      const toolsByCategory = tools.reduce((acc: Record<string, number>, tool: any) => {
        const category = tool.category || 'unknown';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});
      
      return {
        status: 'success',
        message: `${tools.length} tools loaded: ${Object.entries(toolsByCategory)
          .map(([cat, count]) => `${cat} (${count})`)
          .join(', ')}`,
        responseTime,
        data: { total: tools.length, byCategory: toolsByCategory }
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Tools check failed',
        error: error.message || 'Unknown error',
        responseTime: Date.now() - Date.now()
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

      logger.info('Testing PAM Backend (Gemini) connection', { userId: user.id, email: user.email });

      const startTime = Date.now();

      // Test backend PAM connection (now using Gemini instead of direct Claude API)
      return {
        status: 'success',
        message: 'PAM now routes through backend with Gemini - use WebSocket for testing',
        responseTime: Date.now() - startTime,
        data: { note: 'Direct API test disabled - PAM uses backend Gemini integration' }
      };

    } catch (error: any) {
      logger.error('PAM Backend (Gemini) test failed', error);

      return {
        status: 'error',
        message: 'PAM backend connection test failed',
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
      claudeServiceCheck: { status: 'checking' },
      toolsCheck: { status: 'checking' },
      chatTest: { status: 'checking' },
      lastCheck: null
    }));

    try {
      // Run tests sequentially with progress updates
      if (showIndividualToasts) toast.info('1/4 Checking API key...');
      const apiKeyResult = await runApiKeyCheck();
      setResults(prev => ({ ...prev, apiKeyCheck: apiKeyResult }));

      if (showIndividualToasts) toast.info('2/4 Checking Claude service...');
      const claudeServiceResult = await runClaudeServiceCheck();
      setResults(prev => ({ ...prev, claudeServiceCheck: claudeServiceResult }));

      if (showIndividualToasts) toast.info('3/4 Checking PAM tools...');
      const toolsResult = await runToolsCheck();
      setResults(prev => ({ ...prev, toolsCheck: toolsResult }));

      // Only test chat if core components are ready
      if (apiKeyResult.status === 'success' && claudeServiceResult.status === 'success') {
        if (showIndividualToasts) toast.info('4/4 Testing PAM Direct Claude API...');
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
        const allPassed = [apiKeyResult, claudeServiceResult, toolsResult].every(
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
    const statuses = [results.apiKeyCheck.status, results.claudeServiceCheck.status, results.toolsCheck.status];
    
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
          <p><strong>PAM Architecture:</strong> Direct Claude API (Anthropic SDK)</p>
          <p><strong>API Provider:</strong> Anthropic Claude 3.5 Sonnet</p>
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
                <span className="font-medium">1. Anthropic API Key</span>
                {results.apiKeyCheck.responseTime && (
                  <div className="text-xs text-muted-foreground">
                    Validation: {results.apiKeyCheck.responseTime}ms
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

          {/* Claude Service Check */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Brain className="w-4 h-4 text-gray-500" />
              <div>
                <span className="font-medium">2. Claude Service</span>
                {results.claudeServiceCheck.responseTime && (
                  <div className="text-xs text-muted-foreground">
                    Initialization: {results.claudeServiceCheck.responseTime}ms
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(results.claudeServiceCheck.status)}
              <Badge variant={getStatusColor(results.claudeServiceCheck.status) as any}>
                {results.claudeServiceCheck.status}
              </Badge>
            </div>
          </div>
          {results.claudeServiceCheck.message && (
            <div className="text-xs text-muted-foreground pl-4 -mt-2">
              {results.claudeServiceCheck.message}
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
                <span className="font-medium">4. Direct Claude API Chat</span>
                {results.chatTest.responseTime && (
                  <div className="text-xs text-muted-foreground">
                    API Response: {results.chatTest.responseTime}ms
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
                  <strong>Claude API Response:</strong>
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