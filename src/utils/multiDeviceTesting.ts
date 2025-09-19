/**
 * Multi-Device Testing Utilities
 * Helps validate authentication and session behavior across different devices and scenarios
 */

import { supabase } from '@/integrations/supabase/client';

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  isMobile: boolean;
  isTablet: boolean;
  browser: string;
  screenSize: string;
  connectionType?: string;
  sessionId?: string;
}

export interface SessionTestResult {
  deviceInfo: DeviceInfo;
  testType: string;
  passed: boolean;
  details: string;
  timestamp: string;
  duration: number;
}

export class MultiDeviceTestValidator {
  private testResults: SessionTestResult[] = [];

  /**
   * Get current device information
   */
  getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android.*(?=.*\btablet\b)|Android.*(?=.*\bpad\b)/i.test(userAgent);

    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    const connectionType = (navigator as any).connection?.effectiveType || 'unknown';

    return {
      userAgent,
      platform,
      isMobile,
      isTablet,
      browser,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      connectionType,
    };
  }

  /**
   * Test session persistence after browser refresh simulation
   */
  async testSessionPersistence(): Promise<SessionTestResult> {
    const startTime = Date.now();
    const deviceInfo = this.getDeviceInfo();

    try {
      // Get current session
      const { data: { session: initialSession }, error: initialError } = await supabase.auth.getSession();

      if (initialError || !initialSession) {
        return this.createTestResult(deviceInfo, 'Session Persistence', false, 'No initial session found', startTime);
      }

      // Simulate session retrieval after refresh
      await new Promise(resolve => setTimeout(resolve, 100));

      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.getSession();

      if (refreshError || !refreshedSession) {
        return this.createTestResult(deviceInfo, 'Session Persistence', false, 'Session lost after refresh simulation', startTime);
      }

      const sessionMatches = initialSession.access_token === refreshedSession.access_token;

      return this.createTestResult(
        deviceInfo,
        'Session Persistence',
        sessionMatches,
        sessionMatches ? 'Session persisted successfully' : 'Session token changed unexpectedly',
        startTime
      );
    } catch (error) {
      return this.createTestResult(deviceInfo, 'Session Persistence', false, `Error: ${error}`, startTime);
    }
  }

  /**
   * Test session validity and token refresh
   */
  async testSessionRefresh(): Promise<SessionTestResult> {
    const startTime = Date.now();
    const deviceInfo = this.getDeviceInfo();

    try {
      const { data: { session: initialSession }, error: initialError } = await supabase.auth.getSession();

      if (initialError || !initialSession) {
        return this.createTestResult(deviceInfo, 'Session Refresh', false, 'No session to refresh', startTime);
      }

      // Try to refresh the session
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        return this.createTestResult(deviceInfo, 'Session Refresh', false, `Refresh failed: ${refreshError.message}`, startTime);
      }

      if (!refreshedSession) {
        return this.createTestResult(deviceInfo, 'Session Refresh', false, 'No refreshed session returned', startTime);
      }

      return this.createTestResult(deviceInfo, 'Session Refresh', true, 'Session refreshed successfully', startTime);
    } catch (error) {
      return this.createTestResult(deviceInfo, 'Session Refresh', false, `Error: ${error}`, startTime);
    }
  }

  /**
   * Test concurrent session behavior (multiple tabs simulation)
   */
  async testConcurrentSessions(): Promise<SessionTestResult> {
    const startTime = Date.now();
    const deviceInfo = this.getDeviceInfo();

    try {
      // Get session multiple times quickly (simulating multiple tabs)
      const sessionPromises = Array.from({ length: 3 }, () => supabase.auth.getSession());
      const sessionResults = await Promise.all(sessionPromises);

      const allSuccessful = sessionResults.every(result => !result.error && result.data.session);
      const allTokensMatch = sessionResults.every(result =>
        result.data.session?.access_token === sessionResults[0].data.session?.access_token
      );

      if (!allSuccessful) {
        return this.createTestResult(deviceInfo, 'Concurrent Sessions', false, 'Some session requests failed', startTime);
      }

      if (!allTokensMatch) {
        return this.createTestResult(deviceInfo, 'Concurrent Sessions', false, 'Session tokens inconsistent', startTime);
      }

      return this.createTestResult(deviceInfo, 'Concurrent Sessions', true, 'Concurrent sessions consistent', startTime);
    } catch (error) {
      return this.createTestResult(deviceInfo, 'Concurrent Sessions', false, `Error: ${error}`, startTime);
    }
  }

  /**
   * Test network disconnection/reconnection scenario
   */
  async testNetworkResilience(): Promise<SessionTestResult> {
    const startTime = Date.now();
    const deviceInfo = this.getDeviceInfo();

    try {
      // Test session before network test
      const { data: { session: beforeSession }, error: beforeError } = await supabase.auth.getSession();

      if (beforeError || !beforeSession) {
        return this.createTestResult(deviceInfo, 'Network Resilience', false, 'No session before network test', startTime);
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test session after simulated delay
      const { data: { session: afterSession }, error: afterError } = await supabase.auth.getSession();

      if (afterError) {
        return this.createTestResult(deviceInfo, 'Network Resilience', false, `Session check failed after delay: ${afterError.message}`, startTime);
      }

      if (!afterSession) {
        return this.createTestResult(deviceInfo, 'Network Resilience', false, 'Session lost after network delay', startTime);
      }

      return this.createTestResult(deviceInfo, 'Network Resilience', true, 'Session survived network simulation', startTime);
    } catch (error) {
      return this.createTestResult(deviceInfo, 'Network Resilience', false, `Error: ${error}`, startTime);
    }
  }

  /**
   * Run all multi-device tests
   */
  async runAllTests(): Promise<SessionTestResult[]> {
    console.log('🧪 Running multi-device authentication tests...');

    const tests = [
      () => this.testSessionPersistence(),
      () => this.testSessionRefresh(),
      () => this.testConcurrentSessions(),
      () => this.testNetworkResilience(),
    ];

    const results: SessionTestResult[] = [];

    for (const test of tests) {
      try {
        const result = await test();
        results.push(result);
        this.testResults.push(result);

        console.log(`${result.passed ? '✅' : '❌'} ${result.testType}: ${result.details}`);
      } catch (error) {
        console.error(`❌ Test failed with exception:`, error);
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }

  /**
   * Get test results summary
   */
  getTestSummary() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      passRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      results: this.testResults,
    };
  }

  /**
   * Export test results for debugging
   */
  exportResults(): string {
    return JSON.stringify({
      deviceInfo: this.getDeviceInfo(),
      summary: this.getTestSummary(),
      timestamp: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.testResults = [];
  }

  private createTestResult(
    deviceInfo: DeviceInfo,
    testType: string,
    passed: boolean,
    details: string,
    startTime: number
  ): SessionTestResult {
    return {
      deviceInfo,
      testType,
      passed,
      details,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  }
}

// Export a singleton instance
export const multiDeviceTestValidator = new MultiDeviceTestValidator();

// Utility functions for quick testing
export const testAuthOnCurrentDevice = () => multiDeviceTestValidator.runAllTests();
export const getDeviceInfo = () => multiDeviceTestValidator.getDeviceInfo();
export const exportAuthTestResults = () => multiDeviceTestValidator.exportResults();