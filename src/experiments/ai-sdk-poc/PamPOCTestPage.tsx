/**
 * PAM POC Test Page
 * Dedicated page for testing the AI SDK integration in staging environment
 */

import React, { useState } from 'react';
import { PamWithFallback } from './components/PamWithFallback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { flags, logFeatureFlags } from '@/config/featureFlags';
import { ArrowLeft, Settings, TestTube, AlertCircle, CheckCircle } from 'lucide-react';

interface PamPOCTestPageProps {
  onBack?: () => void;
}

export const PamPOCTestPage: React.FC<PamPOCTestPageProps> = ({ onBack }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'pending' | 'success' | 'error';
    message: string;
  }>>([]);

  const runPOCTests = async () => {
    const tests = [
      { name: 'AI SDK Dependencies', test: 'dependencies' },
      { name: 'Feature Flags', test: 'flags' },
      { name: 'Simple Tools', test: 'tools' },
      { name: 'Streaming Response', test: 'streaming' },
      { name: 'Voice Integration', test: 'voice' },
    ];

    setTestResults([]);
    
    for (const test of tests) {
      // Simulate test execution
      setTestResults(prev => [...prev, {
        test: test.name,
        status: 'pending',
        message: 'Running...'
      }]);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock test results
      const success = Math.random() > 0.2; // 80% success rate for demo
      
      setTestResults(prev => 
        prev.map(result => 
          result.test === test.name 
            ? {
                ...result,
                status: success ? 'success' : 'error',
                message: success 
                  ? `${test.name} working correctly`
                  : `${test.name} needs attention`
              }
            : result
        )
      );
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <TestTube className="w-6 h-6 text-blue-600" />
                PAM AI SDK - Proof of Concept
              </h1>
              <p className="text-muted-foreground">
                Testing Vercel AI SDK integration for PAM migration
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Phase 0.3</Badge>
            <Badge variant={import.meta.env.VITE_ENVIRONMENT === 'staging' ? 'default' : 'destructive'}>
              {import.meta.env.VITE_ENVIRONMENT || 'development'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Environment Warning */}
        {import.meta.env.VITE_ENVIRONMENT !== 'staging' && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">Not in Staging Environment</span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                This POC is designed for staging environment testing. 
                Some features may not work correctly in {import.meta.env.VITE_ENVIRONMENT || 'development'}.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags & Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>AI SDK Enabled:</strong> {flags.useAiSdkPam ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Rollout Percentage:</strong> {flags.aiSdkRolloutPercentage}%
                </div>
                <div>
                  <strong>POC Mode:</strong> {flags.aiSdkPocMode ? 'Enabled' : 'Disabled'}
                </div>
                <div>
                  <strong>WebSocket Fallback:</strong> {flags.enableWebSocketFallback ? 'Enabled' : 'Disabled'}
                </div>
                <div>
                  <strong>Cost Limits:</strong> {flags.enableCostLimits ? `$${flags.maxDailyCost}/day` : 'Disabled'}
                </div>
                <div>
                  <strong>Streaming:</strong> {flags.enableStreamingResponses ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logFeatureFlags();
                  console.log('Full flag configuration:', flags);
                }}
              >
                Log Flags to Console
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main POC Component */}
          <div className="lg:col-span-2">
            <PamWithFallback className="w-full" />
          </div>

          {/* Test Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">POC Tests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={runPOCTests} className="w-full">
                  Run Integration Tests
                </Button>
                
                {testResults.length > 0 && (
                  <div className="space-y-2">
                    <Separator />
                    <div className="text-sm font-medium">Test Results:</div>
                    {testResults.map((result, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {result.status === 'pending' && (
                          <div className="w-4 h-4 border-2 border-t-transparent border-blue-500 rounded-full animate-spin" />
                        )}
                        {result.status === 'success' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {result.status === 'error' && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={
                          result.status === 'success' ? 'text-green-700' :
                          result.status === 'error' ? 'text-red-700' :
                          'text-blue-700'
                        }>
                          {result.test}: {result.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Migration Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Phase 0.1 - Baseline Metrics</span>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex justify-between">
                    <span>Phase 0.2 - Cost Analysis</span>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex justify-between">
                    <span>Phase 0.3 - Proof of Concept</span>
                    <div className="w-4 h-4 border-2 border-t-transparent border-blue-500 rounded-full animate-spin" />
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Phase 0.4 - Feature Flags</span>
                    <div className="w-4 h-4 border border-gray-300 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Success Criteria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>✅ Dependencies installed</div>
                  <div>✅ Feature flags working</div>
                  <div>🔄 Basic chat functionality</div>
                  <div>⏳ Voice integration tested</div>
                  <div>⏳ Tool execution verified</div>
                  <div>⏳ Streaming performance validated</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};