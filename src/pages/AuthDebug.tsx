import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthDebugPanel } from '@/components/debug/AuthDebugPanel';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { testRealJWTTransmission } from '@/utils/authJWTTest';
import { runQuickDiagnosis } from '@/utils/authQuickTest';

const AuthDebug: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  const handleQuickTest = async () => {
    console.log('🧪 Running Quick Auth Test...');
    await runQuickDiagnosis();
  };

  const handleJWTTest = async () => {
    console.log('🔍 Running JWT Transmission Test...');
    const result = await testRealJWTTransmission();
    console.log('JWT Test Result:', result);

    if (result.success) {
      alert('✅ JWT Authentication is working correctly!');
    } else {
      alert(`❌ JWT Issues Found:\n${result.recommendations.join('\n')}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🔧 Authentication Debug Center</h1>
        <p className="text-gray-600">
          Comprehensive authentication testing and debugging tools
        </p>
      </div>

      {/* Current Auth Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Current Authentication Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}
            </div>
            <div>
              <strong>User ID:</strong> {user?.id ? `${user.id.substring(0, 8)}...` : 'None'}
            </div>
            <div>
              <strong>Email:</strong> {user?.email || 'None'}
            </div>
            <div>
              <strong>Environment:</strong> {import.meta.env.MODE}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚀 Quick Authentication Tests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleJWTTest}
              className="h-12"
              variant="default"
            >
              🧪 JWT Real Test
              <span className="block text-xs mt-1 opacity-75">
                Test JWT transmission to database
              </span>
            </Button>

            <Button
              onClick={handleQuickTest}
              className="h-12"
              variant="outline"
            >
              🔍 Quick Diagnosis
              <span className="block text-xs mt-1 opacity-75">
                Run comprehensive auth checks
              </span>
            </Button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 <strong>Instructions:</strong>
            </p>
            <ol className="text-sm text-blue-600 mt-2 list-decimal list-inside space-y-1">
              <li>Make sure you're signed in first</li>
              <li>Click "JWT Real Test" to test auth.uid() functionality</li>
              <li>Check browser console for detailed results</li>
              <li>If issues found, auto-fix will be attempted</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Full Debug Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🛠️ Advanced Debug Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Remove the fixed positioning from the debug panel when embedded */}
            <style>
              {`
                .auth-debug-panel-embedded {
                  position: relative !important;
                  bottom: auto !important;
                  right: auto !important;
                  width: 100% !important;
                  max-height: none !important;
                  z-index: auto !important;
                  box-shadow: none !important;
                  border: 1px solid #e5e7eb !important;
                }
              `}
            </style>
            <div className="auth-debug-panel-embedded">
              <AuthDebugPanel />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Console Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📟 Console Commands
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            You can also run these commands directly in the browser console:
          </p>
          <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm space-y-2">
            <div><code>// Test JWT transmission</code></div>
            <div><code>import('{window.location.origin}/src/utils/authJWTTest.js').then(m => m.testRealJWTTransmission())</code></div>
            <br />
            <div><code>// Quick diagnosis</code></div>
            <div><code>import('{window.location.origin}/src/utils/authQuickTest.js').then(m => m.runQuickDiagnosis())</code></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthDebug;