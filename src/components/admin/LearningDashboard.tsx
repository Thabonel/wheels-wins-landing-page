
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, Users, ShoppingCart, AlertCircle, CheckCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { adaptiveShopEngine, AdaptiveLearningMetrics } from '@/lib/adaptiveShopEngine';

interface LearningInsight {
  id: string;
  type: 'user_preference' | 'inventory_performance' | 'algorithm_effectiveness';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  actionable: boolean;
}

interface InventoryRotationSuggestion {
  productId: string;
  productName: string;
  action: 'promote' | 'demote' | 'remove';
  reason: string;
  confidence: number;
  expectedImpact: string;
}

const LearningDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<AdaptiveLearningMetrics | null>(null);
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [rotationSuggestions, setRotationSuggestions] = useState<InventoryRotationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load learning metrics
      const learningMetrics = await adaptiveShopEngine.getLearningMetrics();
      setMetrics(learningMetrics);
      
      // Generate insights
      const generatedInsights = generateInsights(learningMetrics);
      setInsights(generatedInsights);
      
      // Get inventory rotation suggestions
      const rotations = await adaptiveShopEngine.rotateInventory();
      const suggestions = rotations.map(rotation => ({
        productId: rotation.productId,
        productName: `Product ${rotation.productId}`, // Would be fetched from product data
        action: rotation.action,
        reason: rotation.reason,
        confidence: rotation.confidence,
        expectedImpact: getExpectedImpact(rotation.action)
      }));
      setRotationSuggestions(suggestions);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateInsights = (metrics: AdaptiveLearningMetrics): LearningInsight[] => {
    const insights: LearningInsight[] = [];

    if (metrics.userEngagement < 0.6) {
      insights.push({
        id: 'low-engagement',
        type: 'user_preference',
        title: 'Low User Engagement Detected',
        description: 'User engagement is below optimal levels. Consider adjusting recommendation algorithms.',
        impact: 'high',
        confidence: 0.85,
        actionable: true
      });
    }

    if (metrics.preferenceAccuracy > 0.8) {
      insights.push({
        id: 'high-accuracy',
        type: 'algorithm_effectiveness',
        title: 'High Preference Accuracy',
        description: 'Learning algorithms are performing well with high accuracy in user preferences.',
        impact: 'medium',
        confidence: 0.92,
        actionable: false
      });
    }

    if (metrics.inventoryTurnover < 0.7) {
      insights.push({
        id: 'slow-inventory',
        type: 'inventory_performance',
        title: 'Slow Inventory Turnover',
        description: 'Some products are not moving quickly. Consider rotation or promotion strategies.',
        impact: 'medium',
        confidence: 0.78,
        actionable: true
      });
    }

    return insights;
  };

  const getExpectedImpact = (action: string): string => {
    switch (action) {
      case 'promote': return '+15% visibility';
      case 'demote': return '-30% visibility';
      case 'remove': return 'Free up inventory space';
      default: return 'Unknown impact';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  // Mock data for charts
  const engagementData = [
    { day: 'Mon', engagement: 65, conversion: 12 },
    { day: 'Tue', engagement: 72, conversion: 15 },
    { day: 'Wed', engagement: 68, conversion: 13 },
    { day: 'Thu', engagement: 75, conversion: 18 },
    { day: 'Fri', engagement: 80, conversion: 22 },
    { day: 'Sat', engagement: 78, conversion: 20 },
    { day: 'Sun', engagement: 70, conversion: 16 }
  ];

  const categoryData = [
    { name: 'Outdoor Gear', value: 35, color: '#8884d8' },
    { name: 'Digital Products', value: 25, color: '#82ca9d' },
    { name: 'Travel Accessories', value: 20, color: '#ffc658' },
    { name: 'Electronics', value: 15, color: '#ff7300' },
    { name: 'Other', value: 5, color: '#888888' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Brain className="w-8 h-8 animate-pulse mx-auto mb-2" />
          <p>Loading learning insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Learning Dashboard</h1>
          <p className="text-gray-600">AI-powered insights and adaptive shop performance</p>
        </div>
        <Button onClick={loadDashboardData} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Engagement</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((metrics?.userEngagement || 0) * 100).toFixed(1)}%</div>
            <Progress value={(metrics?.userEngagement || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((metrics?.conversionRate || 0) * 100).toFixed(1)}%</div>
            <Progress value={(metrics?.conversionRate || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preference Accuracy</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((metrics?.preferenceAccuracy || 0) * 100).toFixed(1)}%</div>
            <Progress value={(metrics?.preferenceAccuracy || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Turnover</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((metrics?.inventoryTurnover || 0) * 100).toFixed(1)}%</div>
            <Progress value={(metrics?.inventoryTurnover || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Insights</CardTitle>
              <CardDescription>
                Actionable insights from learning algorithm analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.map((insight) => (
                  <div key={insight.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{insight.title}</h3>
                          <Badge variant={getImpactColor(insight.impact)}>
                            {insight.impact} impact
                          </Badge>
                          {insight.actionable && (
                            <Badge variant="outline">Actionable</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{insight.description}</p>
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">
                            Confidence: {(insight.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      {insight.actionable ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement & Conversion Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={engagementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="engagement" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="conversion" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Rotation Suggestions</CardTitle>
              <CardDescription>
                AI-recommended actions to optimize inventory performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rotationSuggestions.map((suggestion) => (
                  <div key={suggestion.productId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{suggestion.productName}</h3>
                        <p className="text-sm text-gray-600 mt-1">{suggestion.reason}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant={
                            suggestion.action === 'promote' ? 'default' :
                            suggestion.action === 'demote' ? 'secondary' : 'destructive'
                          }>
                            {suggestion.action}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                          </span>
                          <span className="text-xs text-green-600">
                            {suggestion.expectedImpact}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Apply
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Algorithm Recommendations</CardTitle>
              <CardDescription>
                Suggested improvements to learning algorithms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium">Increase Behavioral Weight</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    User behavior patterns show strong predictive power. Consider increasing 
                    behavioral signals weight from 60% to 75%.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="default">Algorithm Tuning</Badge>
                    <span className="text-xs text-gray-500">Expected +12% accuracy</span>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-medium">Implement Collaborative Filtering</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Add collaborative filtering to complement behavioral analysis for better recommendations.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="default">Feature Addition</Badge>
                    <span className="text-xs text-gray-500">Expected +8% engagement</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LearningDashboard;
