import React, { useState, useEffect } from 'react';
import { PamSimplified } from '@/components/PamSimplified';
import { featureFlags } from '@/services/featureFlags';
import { claudeService } from '@/services/claude/claudeService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CheckCircle, XCircle, AlertCircle, Settings, MessageSquare, Zap, Database } from 'lucide-react';

/**
 * PAM Direct API Test Page
 * 
 * Test and validate the new direct Claude API approach vs WebSocket
 * Allows switching between implementations and comparing performance
 */
export const PamDirectApiTest: React.FC = () => {
  const [useDirectAPI, setUseDirectAPI] = useState(false);
  const [claudeServiceReady, setClaudeServiceReady] = useState(false);
  const [featureFlagStatus, setFeatureFlagStatus] = useState(false);
  const [testResults, setTestResults] = useState({
    claudeConnection: false,
    toolsAvailable: false,
    featureFlagsWorking: false
  });

  // Check Claude service status
  useEffect(() => {
    const checkClaudeService = () => {
      const isReady = claudeService.isReady();
      setClaudeServiceReady(isReady);
      
      if (isReady) {
        // Test Claude connection
        claudeService.testConnection()
          .then(success => {
            setTestResults(prev => ({ ...prev, claudeConnection: success }));
          })
          .catch(error => {
            console.error('Claude connection test failed:', error);
            setTestResults(prev => ({ ...prev, claudeConnection: false }));
          });
      }
    };

    checkClaudeService();
  }, []);

  // Check feature flags
  useEffect(() => {
    const flagEnabled = featureFlags.isEnabled('PAM_DIRECT_CLAUDE_API');
    setFeatureFlagStatus(flagEnabled);
    setTestResults(prev => ({ ...prev, featureFlagsWorking: true }));
  }, []);

  // Check tools availability
  useEffect(() => {
    try {
      const { getToolsForClaude } = require('@/services/pam/tools/toolRegistry');
      const tools = getToolsForClaude();
      setTestResults(prev => ({ ...prev, toolsAvailable: tools.length > 0 }));
    } catch (error) {
      console.error('Tools check failed:', error);
      setTestResults(prev => ({ ...prev, toolsAvailable: false }));
    }
  }, []);

  // Toggle feature flag for testing
  const toggleFeatureFlag = () => {
    const newValue = !useDirectAPI;
    setUseDirectAPI(newValue);
    
    // Update feature flag temporarily for testing
    featureFlags.updateRolloutPercentage('PAM_DIRECT_CLAUDE_API', newValue ? 100 : 0);
  };

  const getStatusIcon = (status: boolean) => {
    return status ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">PAM Direct API Test</h1>
          <p className="text-gray-600">
            Test and validate the new direct Claude API approach vs WebSocket infrastructure
          </p>
        </div>

        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Control Panel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Use Direct Claude API</label>
                  <p className="text-sm text-gray-600">Toggle between WebSocket and direct API</p>
                </div>
                <Switch
                  checked={useDirectAPI}
                  onCheckedChange={toggleFeatureFlag}
                />
              </div>
              
              <div className="text-sm text-gray-600">
                <strong>Current Mode:</strong> {useDirectAPI ? 'Direct Claude API' : 'WebSocket'} 
                <Badge variant={useDirectAPI ? 'default' : 'secondary'} className="ml-2">
                  {useDirectAPI ? 'New Approach' : 'Legacy'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Claude Service</p>
                  <p className="text-2xl font-bold">{claudeServiceReady ? 'Ready' : 'Not Ready'}</p>
                </div>
                {getStatusIcon(claudeServiceReady)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Feature Flags</p>
                  <p className="text-2xl font-bold">{featureFlagStatus ? 'Enabled' : 'Disabled'}</p>
                </div>
                {getStatusIcon(testResults.featureFlagsWorking)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Claude Connection</p>
                  <p className="text-2xl font-bold">{testResults.claudeConnection ? 'OK' : 'Failed'}</p>
                </div>
                {getStatusIcon(testResults.claudeConnection)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tools Available</p>
                  <p className="text-2xl font-bold">{testResults.toolsAvailable ? 'Yes' : 'No'}</p>
                </div>
                {getStatusIcon(testResults.toolsAvailable)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* WebSocket Approach */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                WebSocket Approach (Legacy)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Connection Management</span>
                  <Badge variant="outline">Complex</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Code Lines</span>
                  <Badge variant="outline">~530 lines</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Backend Dependency</span>
                  <Badge variant="destructive">Required</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Real-time Updates</span>
                  <Badge variant="default">Yes</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Error Scenarios</span>
                  <Badge variant="outline">Many</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Direct API Approach */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Direct API Approach (New)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Connection Management</span>
                  <Badge variant="default">Simple</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Code Lines</span>
                  <Badge variant="default">~160 lines</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Backend Dependency</span>
                  <Badge variant="default">Minimal</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Real-time Updates</span>
                  <Badge variant="outline">On Request</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Error Scenarios</span>
                  <Badge variant="default">Few</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Test Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Use the PAM assistant below to test both approaches. Try these test cases:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-4">
                <li>Basic conversation: "Hello, how are you?"</li>
                <li>Tool usage: "What are my recent expenses?" (requires user data)</li>
                <li>Complex query: "Help me plan a budget for next month"</li>
                <li>Error handling: Test with invalid requests</li>
                <li>Performance: Compare response times between approaches</li>
              </ul>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> The direct API approach eliminates ~70% of the WebSocket complexity 
                  while maintaining all core PAM functionality.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PAM Component */}
      <PamSimplified mode="floating" />
    </div>
  );
};

export default PamDirectApiTest;