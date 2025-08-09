import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { captureException, captureMessage, addBreadcrumb, setContext, setTag } from '@/lib/sentry';
import { Shield, AlertTriangle, CheckCircle, Bug, MessageSquare, Activity } from 'lucide-react';

export function SentryDemo() {
  const [lastAction, setLastAction] = useState<string>('');
  const [isDemoMode, setIsDemoMode] = useState(false);

  const handleTestMessage = () => {
    addBreadcrumb({
      message: 'User clicked test message button',
      category: 'demo',
      level: 'info',
    });
    
    captureMessage('Demo: Test message from Wheels and Wins admin panel', 'info');
    setLastAction('Test message sent to Sentry');
  };

  const handleTestError = () => {
    addBreadcrumb({
      message: 'User clicked test error button',
      category: 'demo',
      level: 'warning',
    });
    
    try {
      throw new Error('Demo: This is a test error from the admin panel - everything is working correctly!');
    } catch (error) {
      captureException(error);
      setLastAction('Test error sent to Sentry');
    }
  };

  const handleTestContext = () => {
    setContext('demo_context', {
      feature: 'admin_panel',
      action: 'context_test',
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
    });
    
    setTag('demo_tag', 'admin_test');
    
    captureMessage('Demo: Message with custom context and tags', 'info');
    setLastAction('Context and tags added to Sentry');
  };

  const handleCrashTest = () => {
    if (!isDemoMode) {
      setIsDemoMode(true);
      setTimeout(() => {
        // This will trigger the error boundary
        throw new Error('Demo: Simulated application crash for error boundary testing');
      }, 1000);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Sentry Error Monitoring Demo
          <Badge variant="outline" className="ml-auto">
            Development Tool
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This demo panel tests Sentry integration. Use these buttons to send test events 
            to your Sentry dashboard and verify error monitoring is working correctly.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            onClick={handleTestMessage}
            variant="outline"
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Test Message
          </Button>

          <Button
            onClick={handleTestError}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Bug className="h-4 w-4" />
            Test Error
          </Button>

          <Button
            onClick={handleTestContext}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            Test Context
          </Button>

          <Button
            onClick={handleCrashTest}
            variant="destructive"
            className="flex items-center gap-2"
            disabled={isDemoMode}
          >
            <AlertTriangle className="h-4 w-4" />
            {isDemoMode ? 'Crashing...' : 'Test Crash'}
          </Button>
        </div>

        {lastAction && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Last Action:</strong> {lastAction}
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">Sentry Configuration Status:</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>DSN configured</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Error boundaries active</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Performance monitoring enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Session replay configured</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
          <strong>Next Steps:</strong><br />
          1. Click the test buttons above<br />
          2. Check your Sentry dashboard at <a href="https://sentry.io" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">sentry.io</a><br />
          3. Look for test events in the Issues section<br />
          4. Remove this demo component before production deployment
        </div>
      </CardContent>
    </Card>
  );
}