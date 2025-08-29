
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Brain, TrendingUp, Users, ShoppingCart, RefreshCw } from "lucide-react";
import { adaptiveShopEngine, type AdaptiveLearningMetrics } from '@/lib/adaptiveShopEngine';

const LearningDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<AdaptiveLearningMetrics>({
    totalInteractions: 0,
    learningAccuracy: 0,
    adaptationRate: 0,
    conversionImprovement: 0,
    conversionRate: 0,
    averageSessionTime: 0,
    topCategories: [],
    behaviorTrends: {}
  });
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for charts
  const learningProgressData = [
    { name: "Week 1", accuracy: 65, adaptationRate: 45 },
    { name: "Week 2", accuracy: 72, adaptationRate: 58 },
    { name: "Week 3", accuracy: 78, adaptationRate: 65 },
    { name: "Week 4", accuracy: 85, adaptationRate: 72 },
  ];

  const userEngagementData = [
    { name: "Mon", engagement: 420 },
    { name: "Tue", engagement: 380 },
    { name: "Wed", engagement: 520 },
    { name: "Thu", engagement: 460 },
    { name: "Fri", engagement: 600 },
    { name: "Sat", engagement: 380 },
    { name: "Sun", engagement: 320 },
  ];

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const currentMetrics = adaptiveShopEngine.getLearningMetrics();
      setMetrics(currentMetrics);
    } catch (error) {
      console.error('Error loading learning metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRotateInventory = async () => {
    setIsLoading(true);
    try {
      // Mock inventory rotation
      console.log('Rotating inventory...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    } catch (error) {
      console.error('Error rotating inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Learning Dashboard</h2>
        <div className="flex gap-2">
          <Button onClick={loadMetrics} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleRotateInventory} disabled={isLoading} variant="outline">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Rotate Inventory
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalInteractions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Accuracy</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.learningAccuracy * 100).toFixed(1)}%</div>
            <Progress value={metrics.learningAccuracy * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adaptation Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.adaptationRate * 100).toFixed(1)}%</div>
            <Progress value={metrics.adaptationRate * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Improvement</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{(metrics.conversionImprovement * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              vs baseline
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Learning Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={learningProgressData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Accuracy %"
                  />
                  <Line
                    type="monotone"
                    dataKey="adaptationRate"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Adaptation Rate %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userEngagementData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="engagement" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">High engagement in Electronics category</p>
                <p className="text-sm text-muted-foreground">Users spend 40% more time browsing electronics</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Personalization improving conversion</p>
                <p className="text-sm text-muted-foreground">15% increase in conversion rate with adaptive recommendations</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Opportunity in Fashion category</p>
                <p className="text-sm text-muted-foreground">Low engagement suggests need for better product curation</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LearningDashboard;
