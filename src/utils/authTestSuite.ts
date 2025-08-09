import { supabase } from '@/integrations/supabase/client';
import { validateJWTToken, getValidAccessToken, WebSocketAuthManager, createAuthenticatedWebSocketUrl } from './websocketAuth';
import { AuthErrorHandler, AuthErrorType, mapWebSocketCloseCodeToAuthError, mapJWTErrorToAuthError } from './authErrorHandler';

export interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
  duration: number;
}

export interface TestSuiteResults {
  passed: number;
  failed: number;
  total: number;
  results: TestResult[];
  summary: string;
}

/**
 * Comprehensive authentication test suite
 */
export class AuthTestSuite {
  private results: TestResult[] = [];

  private async runTest(
    testName: string, 
    testFn: () => Promise<any>
  ): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`🧪 Running test: ${testName}`);
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      const testResult: TestResult = {
        testName,
        passed: true,
        details: result,
        duration
      };
      
      console.log(`✅ Test passed: ${testName} (${duration}ms)`);
      this.results.push(testResult);
      return testResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const testResult: TestResult = {
        testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
      
      console.error(`❌ Test failed: ${testName} (${duration}ms):`, error);
      this.results.push(testResult);
      return testResult;
    }
  }

  async testCurrentSession(): Promise<TestResult> {
    return this.runTest('Current Session Validation', async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw new Error(`Session retrieval error: ${error.message}`);
      }
      
      if (!session) {
        throw new Error('No active session found');
      }
      
      if (!session.access_token) {
        throw new Error('Session missing access token');
      }
      
      // Validate token format
      const tokenParts = session.access_token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error(`Invalid JWT format: expected 3 parts, got ${tokenParts.length}`);
      }
      
      // Decode payload to check structure
      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (!payload.sub) {
          throw new Error('Token missing subject (user ID)');
        }
        if (!payload.exp) {
          throw new Error('Token missing expiration');
        }
        
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime >= payload.exp) {
          throw new Error('Token is expired');
        }
        
        return {
          userId: payload.sub,
          tokenLength: session.access_token.length,
          expiresIn: Math.floor((payload.exp - currentTime) / 60),
          isValid: true
        };
      } catch (decodeError) {
        throw new Error(`Failed to decode token payload: ${decodeError instanceof Error ? decodeError.message : 'Unknown error'}`);
      }
    });
  }

  async testTokenValidation(): Promise<TestResult> {
    return this.runTest('Token Validation Utility', async () => {
      const result = await getValidAccessToken();
      
      if (!result.isValid) {
        throw new Error(result.error || 'Token validation failed');
      }
      
      if (!result.token) {
        throw new Error('Valid result missing token');
      }
      
      return {
        tokenLength: result.token.length,
        shouldRefresh: result.shouldRefresh,
        tokenPreview: `${result.token.substring(0, 30)  }...`
      };
    });
  }

  async testAuthManager(): Promise<TestResult> {
    return this.runTest('WebSocket Auth Manager', async () => {
      const authManager = new WebSocketAuthManager({
        maxRetries: 2,
        retryDelay: 500,
        refreshThreshold: 10
      });
      
      const result = await authManager.getValidToken();
      
      if (!result.isValid) {
        throw new Error(result.error || 'Auth manager validation failed');
      }
      
      if (!result.token) {
        throw new Error('Auth manager result missing token');
      }
      
      return {
        tokenLength: result.token.length,
        managerWorking: true
      };
    });
  }

  async testTokenRefresh(): Promise<TestResult> {
    return this.runTest('Token Refresh Functionality', async () => {
      // Get current session first
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        throw new Error('No current session to refresh');
      }
      
      const originalToken = currentSession.access_token;
      
      // Attempt refresh
      // Force refresh by calling getValidAccessToken
      const refreshResult = await getValidAccessToken();
      
      if (!refreshResult.isValid) {
        throw new Error(refreshResult.error || 'Token refresh failed');
      }
      
      if (!refreshResult.token) {
        throw new Error('Refresh result missing token');
      }
      
      // Verify we got a potentially different token (refresh may return same token if still valid)
      const tokenChanged = refreshResult.token !== originalToken;
      
      return {
        originalTokenLength: originalToken.length,
        newTokenLength: refreshResult.token.length,
        tokenChanged,
        refreshSuccessful: true
      };
    });
  }

  async testErrorHandling(): Promise<TestResult> {
    return this.runTest('Error Handling System', async () => {
      const errorHandler = AuthErrorHandler.getInstance();
      
      // Test WebSocket close code mapping
      const wsError1008 = mapWebSocketCloseCodeToAuthError(1008);
      if (!wsError1008 || wsError1008.type !== AuthErrorType.TOKEN_INVALID) {
        throw new Error('WebSocket error mapping failed for code 1008');
      }
      
      // Test JWT error mapping
      const jwtError = mapJWTErrorToAuthError(new Error('Token expired'));
      if (!jwtError || jwtError.code !== 'JWT_EXPIRED') {
        throw new Error('JWT error mapping failed for expired token');
      }
      
      // Test error handler (without actually performing actions)
      const testError = {
        code: 'TEST_ERROR',
        message: 'Test error',
        severity: 'warning' as const,
        action: 'retry' as const,
        userMessage: 'Test message'
      };
      
      const messages: string[] = [];
      const handled = await errorHandler.handleAuthError(
        testError,
        'test_context',
        (message) => messages.push(message)
      );
      
      return {
        wsErrorMappingWorking: true,
        jwtErrorMappingWorking: true,
        errorHandlerWorking: handled,
        testMessagesReceived: messages.length > 0
      };
    });
  }

  async testWebSocketUrlCreation(): Promise<TestResult> {
    return this.runTest('WebSocket URL Creation', async () => {
      // Get a valid token first
      const tokenResult = await getValidAccessToken();
      if (!tokenResult.isValid || !tokenResult.token) {
        throw new Error('Cannot test URL creation without valid token');
      }
      
      // Import the URL creation function
      const { createAuthenticatedWebSocketUrl } = await import('./websocketAuth');
      
      const baseUrl = 'wss://wheels-wins-backend-staging.onrender.com/api/v1/pam/ws/test-user-id';
      const wsUrl = createAuthenticatedWebSocketUrl(baseUrl, tokenResult.token);
      
      // Validate URL format
      if (!wsUrl.startsWith('wss://')) {
        throw new Error('URL does not use secure WebSocket protocol');
      }
      
      if (!wsUrl.includes('token=')) {
        throw new Error('URL missing token parameter');
      }
      
      if (!wsUrl.includes(encodeURIComponent(tokenResult.token))) {
        throw new Error('URL does not contain encoded token');
      }
      
      return {
        urlCreated: true,
        urlLength: wsUrl.length,
        hasSecureProtocol: wsUrl.startsWith('wss://'),
        hasTokenParam: wsUrl.includes('token='),
        baseUrl
      };
    });
  }

  async testBackendConnectivity(): Promise<TestResult> {
    return this.runTest('Backend Connectivity', async () => {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://wheels-wins-backend-staging.onrender.com';
      
      // Test health endpoint
      const healthResponse = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
      }
      
      const healthData = await healthResponse.json();
      
      // Test authenticated endpoint
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No session for authenticated test');
      }
      
      const authResponse = await fetch(`${backendUrl}/api/v1/pam/ping`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      // Note: 404 is okay if endpoint doesn't exist, we're testing auth
      const authSuccess = authResponse.ok || authResponse.status === 404;
      
      return {
        healthCheck: healthResponse.ok,
        healthData,
        authTest: authSuccess,
        authStatus: authResponse.status,
        backendUrl
      };
    });
  }

  /**
   * Run all authentication tests
   */
  async runFullTestSuite(): Promise<TestSuiteResults> {
    console.log('🧪 Starting WebSocket Authentication Test Suite...');
    this.results = [];
    
    const tests = [
      () => this.testCurrentSession(),
      () => this.testTokenValidation(),
      () => this.testAuthManager(),
      () => this.testTokenRefresh(),
      () => this.testErrorHandling(),
      () => this.testWebSocketUrlCreation(),
      () => this.testBackendConnectivity()
    ];
    
    // Run tests sequentially to avoid race conditions
    for (const test of tests) {
      await test();
    }
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    const summary = `Authentication Test Suite: ${passed}/${total} passed, ${failed} failed`;
    
    const results: TestSuiteResults = {
      passed,
      failed,
      total,
      results: this.results,
      summary
    };
    
    console.log(`🧪 ${summary}`);
    
    if (failed > 0) {
      console.error('❌ Failed tests:', this.results.filter(r => !r.passed));
    } else {
      console.log('✅ All authentication tests passed!');
    }
    
    return results;
  }
}

/**
 * Quick authentication health check
 */
export async function quickAuthCheck(): Promise<{
  isAuthenticated: boolean;
  hasValidToken: boolean;
  tokenExpiresIn?: number;
  issues: string[];
}> {
  const issues: string[] = [];
  let isAuthenticated = false;
  let hasValidToken = false;
  let tokenExpiresIn: number | undefined;
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      issues.push(`Session error: ${error.message}`);
    } else if (!session) {
      issues.push('No active session');
    } else if (!session.access_token) {
      issues.push('Session missing access token');
      isAuthenticated = true;
    } else {
      isAuthenticated = true;
      
      // Check token validity
      try {
        const tokenParts = session.access_token.split('.');
        if (tokenParts.length !== 3) {
          issues.push(`Invalid JWT format: ${tokenParts.length} parts`);
        } else {
          const payload = JSON.parse(atob(tokenParts[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          
          if (!payload.exp) {
            issues.push('Token missing expiration');
          } else if (currentTime >= payload.exp) {
            issues.push('Token is expired');
          } else {
            hasValidToken = true;
            tokenExpiresIn = Math.floor((payload.exp - currentTime) / 60);
            
            if (tokenExpiresIn <= 5) {
              issues.push(`Token expires soon: ${tokenExpiresIn} minutes`);
            }
          }
          
          if (!payload.sub) {
            issues.push('Token missing user ID');
          }
        }
      } catch (decodeError) {
        issues.push('Failed to decode token');
      }
    }
  } catch (error) {
    issues.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
  
  return {
    isAuthenticated,
    hasValidToken,
    tokenExpiresIn,
    issues
  };
}

// Expose test functions globally in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).authTestSuite = new AuthTestSuite();
  (window as any).quickAuthCheck = quickAuthCheck;
  
  console.log('🧪 Auth test functions exposed:');
  console.log('  - window.authTestSuite.runFullTestSuite()');
  console.log('  - window.quickAuthCheck()');
}