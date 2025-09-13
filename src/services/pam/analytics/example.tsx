/**
 * PAM Analytics System - Usage Examples
 * 
 * Demonstrates how to integrate and use the complete analytics system
 * in real PAM scenarios.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  pamAnalytics, 
  usePAMAnalytics, 
  AnalyticsDashboard 
} from './index';

// =====================================================
// EXAMPLE 1: BASIC INTEGRATION
// =====================================================

export function BasicAnalyticsExample() {
  const userId = 'demo-user-123';
  const analytics = usePAMAnalytics(userId);

  const handleToolUsage = () => {
    analytics.trackTool('expense-tracker', {
      responseTime: 1200,
      parameters: ['amount', 'category'],
      success: true,
      contextLength: 10
    });
  };

  const handleAPICall = async () => {
    const startTime = Date.now();
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const responseTime = Date.now() - startTime;
      analytics.trackPerformance('claude-api-call', responseTime, {
        tokenCount: 150,
        cacheHit: false
      });
      
      analytics.trackTokens('conversation', {
        input: 100,
        output: 50,
        total: 150
      });
      
    } catch (error) {
      analytics.trackError(error as Error, {
        operation: 'api-call',
        recoveryAttempted: true
      });
    }
  };

  const handleUserFeedback = (type: 'thumbs_up' | 'thumbs_down') => {
    analytics.trackFeedback('msg-123', type, undefined, 'Test feedback');
  };

  const handleCacheEvent = (hit: boolean) => {
    analytics.trackCache('data-fetch', hit, {
      timeSaved: hit ? 800 : undefined
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Basic Analytics Integration</CardTitle>
        <CardDescription>
          Test the core analytics functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {analytics.isInitialized ? (
          <Badge variant="default">Analytics Active</Badge>
        ) : (
          <Badge variant="secondary">Initializing...</Badge>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleToolUsage} size="sm">
            Track Tool Usage
          </Button>
          <Button onClick={handleAPICall} size="sm">
            Track API Call
          </Button>
          <Button onClick={() => handleUserFeedback('thumbs_up')} size="sm">
            👍 Feedback
          </Button>
          <Button onClick={() => handleUserFeedback('thumbs_down')} size="sm">
            👎 Feedback
          </Button>
          <Button onClick={() => handleCacheEvent(true)} size="sm">
            Cache Hit
          </Button>
          <Button onClick={() => handleCacheEvent(false)} size="sm">
            Cache Miss
          </Button>
        </div>

        {analytics.metrics && (
          <div className="text-sm text-gray-600">
            <p>Sessions: {analytics.metrics.usage.totalSessions}</p>
            <p>Events: {analytics.metrics.usage.totalEvents}</p>
            <p>Cache Hit Rate: {(analytics.metrics.performance.cacheHitRate * 100).toFixed(1)}%</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// EXAMPLE 2: PAM CONVERSATION WITH ANALYTICS
// =====================================================

export function PAMConversationExample() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string; id: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const analytics = usePAMAnalytics('conversation-user-456');

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const messageId = `msg-${Date.now()}`;
    const userMessage = { role: 'user', content: input, id: messageId };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Track user action
    analytics.trackAction('message_sent', {
      message_length: input.length,
      conversation_length: messages.length + 1
    });

    try {
      const startTime = Date.now();
      
      // Simulate PAM processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const responseTime = Date.now() - startTime;
      const response = `PAM: I understand you want to ${input.toLowerCase()}. Let me help you with that.`;
      
      // Track performance
      analytics.trackPerformance('pam-response', responseTime, {
        tokenCount: 120,
        cacheHit: Math.random() > 0.5 // Random cache hit
      });

      // Track token usage
      analytics.trackTokens('conversation', {
        input: input.length,
        output: response.length,
        total: input.length + response.length
      }, {
        conversationLength: messages.length + 1,
        optimized: messages.length > 5
      });

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response, 
        id: `response-${Date.now()}` 
      }]);

    } catch (error) {
      analytics.trackError(error as Error, {
        operation: 'pam-conversation',
        userInput: input,
        recoveryAttempted: true
      });
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.', 
        id: `error-${Date.now()}` 
      }]);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  const provideFeedback = (messageId: string, type: 'thumbs_up' | 'thumbs_down') => {
    analytics.trackFeedback(messageId, type);
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>PAM Conversation with Analytics</CardTitle>
        <CardDescription>
          Full conversation tracking with performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-64 overflow-y-auto border rounded p-4 space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                {msg.role === 'assistant' && (
                  <div className="flex gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => provideFeedback(msg.id, 'thumbs_up')}
                    >
                      👍
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => provideFeedback(msg.id, 'thumbs_down')}
                    >
                      👎
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 px-3 py-2 rounded-lg">
                <p className="text-sm">PAM is thinking...</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </div>

        <div className="text-xs text-gray-500">
          Messages: {messages.length} | Analytics: {analytics.isInitialized ? 'Active' : 'Inactive'}
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// EXAMPLE 3: ANALYTICS DASHBOARD INTEGRATION
// =====================================================

export function AnalyticsDashboardExample() {
  const userId = 'dashboard-user-789';
  const analytics = usePAMAnalytics(userId);
  const [report, setReport] = useState<string>('');
  const [showDashboard, setShowDashboard] = useState(false);

  const generateSampleData = async () => {
    // Generate sample analytics data
    const tools = ['expense-tracker', 'budget-planner', 'trip-planner', 'income-tracker'];
    const operations = ['api-call', 'data-fetch', 'calculation', 'save-data'];

    for (let i = 0; i < 20; i++) {
      // Tool usage
      analytics.trackTool(tools[Math.floor(Math.random() * tools.length)], {
        responseTime: Math.random() * 3000 + 500,
        success: Math.random() > 0.1,
        contextLength: Math.floor(Math.random() * 20) + 5
      });

      // Performance data
      analytics.trackPerformance(
        operations[Math.floor(Math.random() * operations.length)],
        Math.random() * 4000 + 200,
        {
          tokenCount: Math.floor(Math.random() * 200) + 50,
          cacheHit: Math.random() > 0.7
        }
      );

      // Token usage
      const totalTokens = Math.floor(Math.random() * 300) + 100;
      analytics.trackTokens('operation', {
        input: Math.floor(totalTokens * 0.7),
        output: Math.floor(totalTokens * 0.3),
        total: totalTokens
      });

      // User feedback
      if (Math.random() > 0.7) {
        analytics.trackFeedback(
          `msg-${i}`,
          Math.random() > 0.3 ? 'thumbs_up' : 'thumbs_down'
        );
      }

      // Cache events
      analytics.trackCache('operation', Math.random() > 0.3);
    }

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newReport = await analytics.generateReport();
    setReport(newReport);
  };

  const loadMetrics = async () => {
    await analytics.loadMetrics('24h');
  };

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard Example</CardTitle>
          <CardDescription>
            Generate sample data and view analytics dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={generateSampleData}>
              Generate Sample Data
            </Button>
            <Button onClick={loadMetrics} variant="outline">
              Load Metrics
            </Button>
            <Button 
              onClick={() => setShowDashboard(!showDashboard)}
              variant="outline"
            >
              {showDashboard ? 'Hide' : 'Show'} Dashboard
            </Button>
          </div>

          {report && (
            <Alert>
              <AlertDescription>
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                  {report}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {showDashboard && analytics.isInitialized && (
        <AnalyticsDashboard 
          userId={userId}
          timeRange="24h"
          className="animate-in slide-in-from-top-2 duration-200"
        />
      )}
    </div>
  );
}

// =====================================================
// EXAMPLE 4: ERROR HANDLING AND RECOVERY
// =====================================================

export function ErrorHandlingExample() {
  const analytics = usePAMAnalytics('error-demo-user');
  const [errors, setErrors] = useState<string[]>([]);

  const simulateErrors = () => {
    const errorTypes = [
      () => {
        const error = new Error('Network connection failed');
        analytics.trackError(error, {
          operation: 'api-call',
          recoveryAttempted: true,
          recoverySuccessful: false
        });
        return 'Network Error';
      },
      () => {
        const error = new Error('Invalid user input: amount must be positive');
        analytics.trackError(error, {
          operation: 'expense-validation',
          userInput: '-100',
          recoveryAttempted: true,
          recoverySuccessful: true
        });
        return 'Validation Error';
      },
      () => {
        const error = new Error('API rate limit exceeded');
        analytics.trackError(error, {
          operation: 'claude-api-call',
          recoveryAttempted: true,
          recoverySuccessful: false
        });
        return 'API Error';
      },
      () => {
        const error = new Error('Unexpected system crash');
        analytics.trackError(error, {
          operation: 'system-critical',
          recoveryAttempted: false
        });
        return 'System Error';
      }
    ];

    const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    const errorName = errorType();
    
    setErrors(prev => [...prev, `${new Date().toLocaleTimeString()}: ${errorName}`]);
  };

  const clearErrors = () => {
    setErrors([]);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Error Handling Example</CardTitle>
        <CardDescription>
          Demonstrate error tracking and recovery scenarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={simulateErrors}>
            Simulate Random Error
          </Button>
          <Button onClick={clearErrors} variant="outline">
            Clear Log
          </Button>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <h4 className="text-sm font-semibold text-red-800 mb-2">Error Log:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {errors.map((error, index) => (
                <p key={index} className="text-xs text-red-700">{error}</p>
              ))}
            </div>
          </div>
        )}

        <Alert>
          <AlertDescription>
            All errors are automatically tracked with context, severity classification, 
            and recovery status for comprehensive error analysis.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// =====================================================
// MAIN DEMO COMPONENT
// =====================================================

export default function AnalyticsExamples() {
  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">PAM Analytics System Demo</h1>
        <p className="text-gray-600">
          Comprehensive examples of analytics integration and usage
        </p>
      </div>

      <div className="grid gap-8">
        <BasicAnalyticsExample />
        <PAMConversationExample />
        <ErrorHandlingExample />
        <AnalyticsDashboardExample />
      </div>

      <div className="text-center text-sm text-gray-500">
        <p>
          All analytics data is tracked in real-time and stored in Supabase.
          Check the browser console for detailed logging information.
        </p>
      </div>
    </div>
  );
}