/**
 * PAM Analytics Dashboard Component
 * 
 * Comprehensive dashboard for visualizing PAM usage analytics including:
 * - Tool usage frequency and performance
 * - Response time metrics and trends
 * - Error rates and types
 * - User satisfaction scores
 * - Token usage and cost monitoring
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Clock,
  DollarSign,
  Heart,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  Target,
  ThumbsUp,
  ThumbsDown,
  RefreshCw
} from 'lucide-react';
import { useAnalytics } from '@/services/pam/analytics/usageAnalytics';
import type { AnalyticsMetrics } from '@/services/pam/analytics/usageAnalytics';
import { formatCurrency, formatNumber, formatDuration } from '@/lib/utils';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface DashboardProps {
  userId: string;
  className?: string;
  compact?: boolean;
  timeRange?: '1h' | '24h' | '7d' | '30d';
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'number' | 'currency' | 'percentage' | 'duration';
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

const formatMetricValue = (value: number, format: MetricCardProps['format']): string => {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'duration':
      return formatDuration(value);
    case 'number':
    default:
      return formatNumber(value);
  }
};

const getChangeColor = (change: number): string => {
  if (change > 0) return 'text-green-600';
  if (change < 0) return 'text-red-600';
  return 'text-gray-600';
};

const getTrendIcon = (trend: MetricCardProps['trend']) => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    default:
      return null;
  }
};

// =====================================================
// METRIC CARD COMPONENT
// =====================================================

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  description, 
  trend,
  format = 'number'
}) => {
  const formattedValue = typeof value === 'number' ? formatMetricValue(value, format) : value;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {change !== undefined && (
          <div className={`flex items-center text-xs mt-1 ${getChangeColor(change)}`}>
            {getTrendIcon(trend)}
            <span className="ml-1">
              {change > 0 ? '+' : ''}{change.toFixed(1)}% from last period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// =====================================================
// CHART COMPONENTS
// =====================================================

const ToolUsageChart: React.FC<{ data: AnalyticsMetrics['usage']['mostUsedTools'] }> = ({ data }) => {
  const chartData = data.map(item => ({
    name: item.tool.replace('-', ' ').toUpperCase(),
    count: item.count,
    percentage: item.percentage
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
        <YAxis />
        <Tooltip 
          formatter={(value, name) => [
            name === 'count' ? `${value} uses` : `${value.toFixed(1)}%`,
            name === 'count' ? 'Usage Count' : 'Percentage'
          ]}
        />
        <Bar dataKey="count" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const PerformanceChart: React.FC<{ 
  averageResponseTime: number; 
  p95ResponseTime: number;
  cacheHitRate: number;
}> = ({ averageResponseTime, p95ResponseTime, cacheHitRate }) => {
  const data = [
    { metric: 'Avg Response', value: averageResponseTime, target: 2000 },
    { metric: 'P95 Response', value: p95ResponseTime, target: 5000 },
    { metric: 'Cache Hit Rate', value: cacheHitRate * 100, target: 70 }
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="metric" />
        <YAxis />
        <Tooltip 
          formatter={(value, name) => [
            name === 'value' ? `${value.toFixed(0)}${value > 100 ? 'ms' : '%'}` : `${value}`,
            name === 'value' ? 'Current' : 'Target'
          ]}
        />
        <Bar dataKey="value" fill="#82ca9d" />
        <Bar dataKey="target" fill="#ffc658" opacity={0.6} />
      </BarChart>
    </ResponsiveContainer>
  );
};

const SatisfactionChart: React.FC<{ 
  thumbsUpRate: number; 
  averageRating: number;
  npsScore: number;
}> = ({ thumbsUpRate, averageRating, npsScore }) => {
  const data = [
    { name: 'Positive Feedback', value: thumbsUpRate * 100, color: '#4ade80' },
    { name: 'Negative Feedback', value: (1 - thumbsUpRate) * 100, color: '#ef4444' }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-green-600">{(thumbsUpRate * 100).toFixed(1)}%</div>
          <div className="text-sm text-gray-600">Thumbs Up Rate</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-600">{averageRating.toFixed(1)}/5</div>
          <div className="text-sm text-gray-600">Average Rating</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-purple-600">{npsScore.toFixed(0)}</div>
          <div className="text-sm text-gray-600">NPS Score</div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const CostAnalysisChart: React.FC<{ 
  totalCost: number;
  costPerSession: number;
  tokenEfficiency: number;
  optimizationSavings: number;
}> = ({ totalCost, costPerSession, tokenEfficiency, optimizationSavings }) => {
  const data = [
    { 
      name: 'Cost Metrics', 
      totalCost: totalCost * 1000, // Convert to cents for better visualization
      costPerSession: costPerSession * 1000,
      savings: optimizationSavings * 1000
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(optimizationSavings)}
          </div>
          <div className="text-sm text-gray-600">Optimization Savings</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {(tokenEfficiency * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Token Efficiency</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Total Cost</span>
          <span className="font-medium">{formatCurrency(totalCost)}</span>
        </div>
        <Progress value={(totalCost / 1.0) * 100} className="h-2" />
        
        <div className="flex justify-between text-sm">
          <span>Cost per Session</span>
          <span className="font-medium">{formatCurrency(costPerSession)}</span>
        </div>
        <Progress value={(costPerSession / 0.1) * 100} className="h-2" />
      </div>
    </div>
  );
};

// =====================================================
// MAIN DASHBOARD COMPONENT
// =====================================================

const AnalyticsDashboard: React.FC<DashboardProps> = ({ 
  userId, 
  className = '', 
  compact = false,
  timeRange = '24h'
}) => {
  const { metrics, isLoading, loadMetrics } = useAnalytics(userId);
  const [selectedTimeRange, setSelectedTimeRange] = useState<typeof timeRange>(timeRange);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadMetrics(selectedTimeRange);
    setLastRefresh(new Date());
  }, [selectedTimeRange, loadMetrics]);

  const handleRefresh = async () => {
    await loadMetrics(selectedTimeRange);
    setLastRefresh(new Date());
  };

  const handleTimeRangeChange = (newRange: typeof timeRange) => {
    setSelectedTimeRange(newRange);
  };

  if (isLoading || !metrics) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  const overviewMetrics = [
    {
      title: 'Total Sessions',
      value: metrics.usage.totalSessions,
      icon: <Users className="h-4 w-4" />,
      description: `${metrics.usage.totalEvents} total events`,
      trend: 'up' as const
    },
    {
      title: 'Avg Response Time',
      value: metrics.performance.averageResponseTime,
      icon: <Clock className="h-4 w-4" />,
      description: 'Milliseconds',
      format: 'duration' as const,
      trend: metrics.performance.averageResponseTime < 2000 ? 'up' : 'down'
    },
    {
      title: 'Error Rate',
      value: metrics.performance.errorRate,
      icon: <AlertTriangle className="h-4 w-4" />,
      description: 'System reliability',
      format: 'percentage' as const,
      trend: metrics.performance.errorRate < 0.05 ? 'up' : 'down'
    },
    {
      title: 'User Satisfaction',
      value: metrics.satisfaction.thumbsUpRate,
      icon: <Heart className="h-4 w-4" />,
      description: `${metrics.satisfaction.averageRating.toFixed(1)}/5 avg rating`,
      format: 'percentage' as const,
      trend: metrics.satisfaction.thumbsUpRate > 0.7 ? 'up' : 'down'
    },
    {
      title: 'Cache Hit Rate',
      value: metrics.performance.cacheHitRate,
      icon: <Zap className="h-4 w-4" />,
      description: 'Performance optimization',
      format: 'percentage' as const,
      trend: metrics.performance.cacheHitRate > 0.3 ? 'up' : 'down'
    },
    {
      title: 'Total Cost',
      value: metrics.costs.estimatedCost,
      icon: <DollarSign className="h-4 w-4" />,
      description: `${formatCurrency(metrics.costs.costPerSession)} per session`,
      format: 'currency' as const,
      trend: 'neutral' as const
    }
  ];

  if (compact) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">PAM Analytics</h3>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {overviewMetrics.slice(0, 6).map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">PAM Analytics Dashboard</h2>
          <p className="text-gray-600">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['1h', '24h', '7d', '30d'] as const).map((range) => (
              <Button
                key={range}
                variant={selectedTimeRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTimeRangeChange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
          
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {overviewMetrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Target Achievement Banner */}
      <Card className={`border-l-4 ${
        metrics.performance.cacheHitRate >= 0.3 && metrics.satisfaction.thumbsUpRate >= 0.7
          ? 'border-l-green-500 bg-green-50' 
          : 'border-l-yellow-500 bg-yellow-50'
      }`}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <div className="flex-1">
              <h3 className="font-semibold">Performance Targets</h3>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <Badge variant={metrics.performance.cacheHitRate >= 0.3 ? "default" : "secondary"}>
                    Cache Hit Rate: {(metrics.performance.cacheHitRate * 100).toFixed(1)}%
                  </Badge>
                  <span className="text-sm text-gray-600">Target: 30%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={metrics.satisfaction.thumbsUpRate >= 0.7 ? "default" : "secondary"}>
                    Satisfaction: {(metrics.satisfaction.thumbsUpRate * 100).toFixed(1)}%
                  </Badge>
                  <span className="text-sm text-gray-600">Target: 70%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="usage">Tool Usage</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tool Usage Frequency</CardTitle>
              <CardDescription>
                Most frequently used PAM tools and features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ToolUsageChart data={metrics.usage.mostUsedTools} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Response times, cache performance, and system reliability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceChart 
                averageResponseTime={metrics.performance.averageResponseTime}
                p95ResponseTime={metrics.performance.p95ResponseTime}
                cacheHitRate={metrics.performance.cacheHitRate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="satisfaction" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Satisfaction</CardTitle>
              <CardDescription>
                Feedback scores, ratings, and user sentiment analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SatisfactionChart 
                thumbsUpRate={metrics.satisfaction.thumbsUpRate}
                averageRating={metrics.satisfaction.averageRating}
                npsScore={metrics.satisfaction.npsScore}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis</CardTitle>
              <CardDescription>
                Token usage, API costs, and optimization savings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CostAnalysisChart 
                totalCost={metrics.costs.estimatedCost}
                costPerSession={metrics.costs.costPerSession}
                tokenEfficiency={metrics.costs.tokenEfficiency}
                optimizationSavings={metrics.costs.optimizationSavings}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-gray-600">
            <p>
              Analytics dashboard tracking {metrics.usage.totalEvents} events 
              across {metrics.usage.totalSessions} sessions. 
              {metrics.performance.cacheHitRate >= 0.3 && metrics.satisfaction.thumbsUpRate >= 0.7 
                ? ' All performance targets achieved! 🎯' 
                : ' Working towards performance targets.'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;