/**
 * Backend Service Health Check Utility
 * Monitors backend service availability and WebSocket connectivity
 */

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number;
  error?: string;
  timestamp: Date;
}

interface WebSocketTestResult {
  endpoint: string;
  status: 'connected' | 'failed' | 'timeout';
  closeCode?: number;
  error?: string;
  responseTime: number;
}

class BackendHealthMonitor {
  private healthResults: Map<string, HealthCheckResult> = new Map();
  private wsTestResults: Map<string, WebSocketTestResult> = new Map();

  /**
   * Check HTTP endpoint health
   */
  async checkHttpHealth(endpoint: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const result: HealthCheckResult = {
      service: endpoint,
      status: 'unknown',
      responseTime: 0,
      timestamp: new Date()
    };

    try {
      const response = await fetch(`${endpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      result.responseTime = Date.now() - startTime;
      result.status = response.ok ? 'healthy' : 'unhealthy';
      
      if (!response.ok) {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
      }

      console.log(`🏥 Health Check [${endpoint}]:`, result);
    } catch (error) {
      result.responseTime = Date.now() - startTime;
      result.status = 'unhealthy';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Health Check Failed [${endpoint}]:`, result);
    }

    this.healthResults.set(endpoint, result);
    return result;
  }

  /**
   * Test WebSocket connectivity
   */
  async testWebSocketConnection(wsUrl: string): Promise<WebSocketTestResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const result: WebSocketTestResult = {
        endpoint: wsUrl,
        status: 'timeout',
        responseTime: 0
      };

      try {
        const ws = new WebSocket(wsUrl);
        
        const timeout = setTimeout(() => {
          ws.close();
          result.responseTime = Date.now() - startTime;
          result.status = 'timeout';
          result.error = 'Connection timeout (10s)';
          console.warn(`⏰ WebSocket Test Timeout [${wsUrl}]:`, result);
          resolve(result);
        }, 10000);

        ws.onopen = () => {
          clearTimeout(timeout);
          result.responseTime = Date.now() - startTime;
          result.status = 'connected';
          console.log(`✅ WebSocket Test Success [${wsUrl}]:`, result);
          ws.close();
          resolve(result);
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          result.responseTime = Date.now() - startTime;
          result.status = 'failed';
          result.error = 'WebSocket error event';
          console.error(`❌ WebSocket Test Failed [${wsUrl}]:`, result);
        };

        ws.onclose = (event) => {
          if (result.status === 'timeout') return; // Already handled
          
          clearTimeout(timeout);
          result.responseTime = Date.now() - startTime;
          result.closeCode = event.code;
          
          if (result.status !== 'connected') {
            result.status = 'failed';
            result.error = `Connection closed: ${event.code} - ${event.reason || 'No reason provided'}`;
            console.error(`🔌 WebSocket Test Closed [${wsUrl}]:`, result);
            resolve(result);
          }
        };

      } catch (error) {
        result.responseTime = Date.now() - startTime;
        result.status = 'failed';
        result.error = error instanceof Error ? error.message : 'Unknown error';
        console.error(`💥 WebSocket Test Exception [${wsUrl}]:`, result);
        resolve(result);
      }

      this.wsTestResults.set(wsUrl, result);
    });
  }

  /**
   * Comprehensive backend diagnostic
   */
  async runFullDiagnostic(): Promise<{
    httpHealth: HealthCheckResult[];
    wsTests: WebSocketTestResult[];
    summary: {
      httpHealthy: number;
      httpTotal: number;
      wsWorking: number;
      wsTotal: number;
      overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    };
  }> {
    console.log('🔍 Starting comprehensive backend diagnostic...');

    // HTTP endpoints to test
    const httpEndpoints = [
      import.meta.env.VITE_API_BASE_URL || 'https://pam-backend.onrender.com',
      'https://pam-backend.onrender.com',
      'https://api.wheelsandwins.com'
    ].filter(Boolean);

    // WebSocket endpoints to test
    const wsEndpoints = [
      import.meta.env.VITE_PAM_WEBSOCKET_URL || 'wss://pam-backend.onrender.com/api/v1/pam/ws',
      'wss://pam-backend.onrender.com/api/v1/pam/ws',
      'wss://api.wheelsandwins.com/pam/ws'
    ].filter(Boolean);

    // Run HTTP health checks
    const httpHealthPromises = httpEndpoints.map(endpoint => this.checkHttpHealth(endpoint));
    const httpHealth = await Promise.all(httpHealthPromises);

    // Run WebSocket tests
    const wsTestPromises = wsEndpoints.map(endpoint => this.testWebSocketConnection(endpoint));
    const wsTests = await Promise.all(wsTestPromises);

    // Calculate summary
    const httpHealthy = httpHealth.filter(h => h.status === 'healthy').length;
    const wsWorking = wsTests.filter(w => w.status === 'connected').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (httpHealthy > 0 && wsWorking > 0) {
      overallStatus = 'healthy';
    } else if (httpHealthy > 0 || wsWorking > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    const summary = {
      httpHealthy,
      httpTotal: httpHealth.length,
      wsWorking,
      wsTotal: wsTests.length,
      overallStatus
    };

    console.log('📊 Backend Diagnostic Summary:', summary);

    return { httpHealth, wsTests, summary };
  }

  /**
   * Get latest health results
   */
  getHealthResults(): Map<string, HealthCheckResult> {
    return this.healthResults;
  }

  /**
   * Get latest WebSocket test results
   */
  getWebSocketResults(): Map<string, WebSocketTestResult> {
    return this.wsTestResults;
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.healthResults.clear();
    this.wsTestResults.clear();
  }
}

// Export singleton instance
export const backendHealthMonitor = new BackendHealthMonitor();

// Export types
export type { HealthCheckResult, WebSocketTestResult };