import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  Smartphone,
  Monitor,
  Tablet,
  Wifi,
  WifiOff,
  RefreshCw,
  Download,
  Clock
} from 'lucide-react';
import { multiDeviceTestValidator, DeviceInfo, SessionTestResult } from '@/utils/multiDeviceTesting';
import { useAuth } from '@/context/AuthContext';
import AuthErrorDisplay from '@/components/auth/AuthErrorDisplay';

export function AuthTestingPanel() {
  const { user, session, lastError, clearError, refreshSession } = useAuth();
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<SessionTestResult[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  // Get device info on mount
  React.useEffect(() => {
    setDeviceInfo(multiDeviceTestValidator.getDeviceInfo());
  }, []);

  const runAuthTests = async () => {
    if (!user || !session) {
      alert('Please log in first to run authentication tests');
      return;
    }

    setIsRunningTests(true);
    clearError();

    try {
      const results = await multiDeviceTestValidator.runAllTests();
      setTestResults(results);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const downloadResults = () => {
    const results = multiDeviceTestValidator.exportResults();
    const blob = new Blob([results], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auth-test-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getDeviceIcon = () => {
    if (!deviceInfo) return <Monitor className="h-4 w-4" />;
    if (deviceInfo.isMobile && !deviceInfo.isTablet) return <Smartphone className="h-4 w-4" />;
    if (deviceInfo.isTablet) return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Authentication Testing Panel</h2>
          <p className="text-gray-600">Validate authentication flows across different scenarios</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runAuthTests}
            disabled={isRunningTests || !user}
            variant="default"
          >
            {isRunningTests ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4 mr-2" />
            )}
            {isRunningTests ? 'Running Tests...' : 'Run Tests'}
          </Button>

          {testResults.length > 0 && (
            <Button onClick={downloadResults} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </Button>
          )}
        </div>
      </div>

      {/* Authentication Error Display */}
      {lastError && (
        <AuthErrorDisplay
          error={lastError}
          onRetry={refreshSession}
          onDismiss={clearError}
        />
      )}

      {/* Current Session Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Authentication Status</CardTitle>
            {user ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user ? 'Authenticated' : 'Not Logged In'}</div>
            <p className="text-xs text-muted-foreground">
              {user ? `User: ${user.email}` : 'Please log in to run tests'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Device Type</CardTitle>
            {getDeviceIcon()}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deviceInfo?.isMobile ? 'Mobile' : deviceInfo?.isTablet ? 'Tablet' : 'Desktop'}
            </div>
            <p className="text-xs text-muted-foreground">
              {deviceInfo?.browser} on {deviceInfo?.platform}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Session Status</CardTitle>
            {session ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session ? 'Active' : 'None'}</div>
            <p className="text-xs text-muted-foreground">
              {session ? `Expires: ${new Date(session.expires_at! * 1000).toLocaleTimeString()}` : 'No active session'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection</CardTitle>
            {navigator.onLine ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{navigator.onLine ? 'Online' : 'Offline'}</div>
            <p className="text-xs text-muted-foreground">
              {deviceInfo?.connectionType || 'Unknown'} connection
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Test Results Summary */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TestTube className="w-5 h-5 mr-2" />
              Test Results Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Pass Rate</span>
                <span className="text-2xl font-bold text-green-600">{passRate.toFixed(1)}%</span>
              </div>
              <Progress value={passRate} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{passedTests} passed</span>
                <span>{totalTests - passedTests} failed</span>
                <span>{totalTests} total</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {result.passed ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">{result.testType}</div>
                      <div className="text-sm text-muted-foreground">{result.details}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {result.duration}ms
                    </div>
                    <Badge variant={result.passed ? "default" : "destructive"}>
                      {result.passed ? "PASS" : "FAIL"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshSession}
              disabled={!session}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh Session
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Test Page Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newTab = window.open(window.location.href, '_blank');
                if (newTab) {
                  setTimeout(() => {
                    newTab.close();
                  }, 5000);
                }
              }}
            >
              <TestTube className="h-3 w-3 mr-1" />
              Test New Tab
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AuthTestingPanel;