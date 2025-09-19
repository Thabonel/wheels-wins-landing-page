/**
 * PAM Testing Page - Day 2 Load and Stability Testing
 * Comprehensive testing suite for PAM WebSocket connections
 */

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import PAMWebSocketTester from '@/dev/PAMWebSocketTester';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const PAMTestingPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Please sign in to access the PAM testing suite.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PAM Testing Suite</h1>
              <p className="text-gray-600 mt-2">Day 2: WebSocket Connection Stability & Load Testing</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Day 2</Badge>
              <Badge variant="default">Testing Phase</Badge>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Environment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">User ID:</span>
                  <span className="ml-2 font-mono">{user?.id?.substring(0, 8)}...</span>
                </div>
                <div>
                  <span className="text-gray-600">Environment:</span>
                  <span className="ml-2">Development</span>
                </div>
                <div>
                  <span className="text-gray-600">Backend:</span>
                  <span className="ml-2">http://localhost:8080</span>
                </div>
                <div>
                  <span className="text-gray-600">WebSocket:</span>
                  <span className="ml-2">ws://localhost:8080/api/v1/pam/ws</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Connection Stability Tests</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Load test with 3-15 concurrent connections</li>
                    <li>• Test connection persistence over 30+ minutes</li>
                    <li>• Monitor message delivery reliability</li>
                    <li>• Track memory usage and resource consumption</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recovery Tests</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Test automatic reconnection logic</li>
                    <li>• Simulate network interruptions</li>
                    <li>• Verify exponential backoff behavior</li>
                    <li>• Test error handling and recovery</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-700 text-sm">
                  <strong>Note:</strong> This testing suite creates actual WebSocket connections to your backend.
                  Monitor the browser's Network tab and Console for detailed connection information.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Main Testing Component */}
          <PAMWebSocketTester />

          {/* Performance Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Expectations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">✅ Good Performance</h4>
                  <ul className="space-y-1 text-green-700">
                    <li>• Connection success rate &gt; 95%</li>
                    <li>• Average response time &lt; 200ms</li>
                    <li>• Memory usage stable over time</li>
                    <li>• Automatic reconnection working</li>
                  </ul>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-900 mb-2">⚠️ Warning Signs</h4>
                  <ul className="space-y-1 text-yellow-700">
                    <li>• Connection success rate &lt; 90%</li>
                    <li>• Response time &gt; 500ms</li>
                    <li>• Memory usage increasing over time</li>
                    <li>• Multiple reconnection attempts</li>
                  </ul>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-900 mb-2">❌ Critical Issues</h4>
                  <ul className="space-y-1 text-red-700">
                    <li>• Connection success rate &lt; 80%</li>
                    <li>• Response time &gt; 1000ms</li>
                    <li>• Memory leaks detected</li>
                    <li>• Connections failing to reconnect</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PAMTestingPage;