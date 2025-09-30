/**
 * PAM Hybrid Test Page
 *
 * Testing page for the new hybrid PAM system:
 * - GPT-4o-mini for simple queries (95%)
 * - Claude Agent SDK for complex tasks (5%)
 *
 * Expected cost reduction: 77-90%
 */

import React, { useState } from 'react';
import { HybridPAM } from '@/components/pam/HybridPAM';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Zap, DollarSign, ArrowRight, Check } from 'lucide-react';
import { pamHybridService } from '@/services/pamHybridService';
import { useAuth } from '@/context/AuthContext';

export default function PamHybridTest() {
  const { session } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const checkHealth = async () => {
    setLoadingHealth(true);
    try {
      const result = await pamHybridService.getHealth();
      setHealth(result);
    } catch (error) {
      console.error('Health check failed:', error);
      setHealth({ error: String(error) });
    } finally {
      setLoadingHealth(false);
    }
  };

  const checkMetrics = async () => {
    if (!session?.access_token) return;

    setLoadingMetrics(true);
    try {
      const result = await pamHybridService.getMetrics(session.access_token);
      setMetrics(result);
    } catch (error) {
      console.error('Metrics check failed:', error);
      setMetrics({ error: String(error) });
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Example queries for testing
  const simpleQueries = [
    "What's my current balance?",
    "Show me my recent trips",
    "Hello, how are you today?",
    "Navigate to my dashboard",
    "What's the weather like?"
  ];

  const complexQueries = [
    "Plan a 2-week RV trip from San Francisco to Seattle under $2000",
    "Analyze my spending patterns and suggest budget optimizations",
    "Compare my expenses from last month to this month and identify savings opportunities",
    "Create an itinerary with RV-friendly campgrounds along Route 66",
    "Predict my expenses for next month based on my travel plans"
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">PAM Hybrid System Test</h1>
        <p className="text-gray-600">
          Cost-optimized AI assistant with intelligent routing
        </p>
      </div>

      {/* Cost Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Optimization</CardTitle>
          <CardDescription>
            Hybrid system reduces AI costs by 77-90% compared to GPT-5
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-sm text-red-600 font-medium mb-1">Current (GPT-5)</div>
              <div className="text-2xl font-bold text-red-700">$0.00213</div>
              <div className="text-xs text-red-600">per query</div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 font-medium mb-1">Hybrid System</div>
              <div className="text-2xl font-bold text-green-700">$0.00028</div>
              <div className="text-xs text-green-600">per query (87% savings)</div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-sm text-purple-600 font-medium mb-1">Monthly Savings</div>
              <div className="text-2xl font-bold text-purple-700">$185</div>
              <div className="text-xs text-purple-600">for 100K queries</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm text-blue-900 font-medium mb-2">How it works:</p>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-600" />
                    <span><strong>95% of queries</strong> use GPT-4o-mini ($0.075/1M tokens)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <span><strong>5% of queries</strong> use Claude Agent SDK ($3/1M tokens)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-blue-600" />
                    <span>Intelligent routing based on query complexity</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Health Check</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={checkHealth} disabled={loadingHealth}>
              {loadingHealth ? 'Checking...' : 'Check Health'}
            </Button>

            {health && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(health, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={checkMetrics} disabled={loadingMetrics || !session}>
              {loadingMetrics ? 'Loading...' : 'Load Metrics'}
            </Button>

            {metrics && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(metrics, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Chat Interface */}
      <Tabs defaultValue="chat" className="w-full">
        <TabsList>
          <TabsTrigger value="chat">Live Chat</TabsTrigger>
          <TabsTrigger value="examples">Example Queries</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <HybridPAM />
        </TabsContent>

        <TabsContent value="examples" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Simple Queries */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Simple Queries</CardTitle>
                  <Badge className="bg-green-100 text-green-800">
                    <Zap className="w-3 h-3 mr-1" />
                    GPT-4o-mini
                  </Badge>
                </div>
                <CardDescription>
                  These will be handled by GPT-4o-mini (fast & cheap)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {simpleQueries.map((query, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{query}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Complex Queries */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Complex Tasks</CardTitle>
                  <Badge className="bg-purple-100 text-purple-800">
                    <Brain className="w-3 h-3 mr-1" />
                    Claude Agents
                  </Badge>
                </div>
                <CardDescription>
                  These will be routed to specialized Claude agents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {complexQueries.map((query, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Brain className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <span>{query}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Agent Domains */}
      <Card>
        <CardHeader>
          <CardTitle>5 Specialized Claude Agents</CardTitle>
          <CardDescription>
            Each agent is an expert in their domain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="font-medium text-sm mb-1">Dashboard Agent</div>
              <div className="text-xs text-gray-600">Overview, status, quick actions</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium text-sm mb-1">Budget Agent</div>
              <div className="text-xs text-gray-600">Financial analysis, optimization</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium text-sm mb-1">Trip Agent</div>
              <div className="text-xs text-gray-600">Route planning, RV parks</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium text-sm mb-1">Community Agent</div>
              <div className="text-xs text-gray-600">Social, connections, posts</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium text-sm mb-1">Shop Agent</div>
              <div className="text-xs text-gray-600">Products, recommendations</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}