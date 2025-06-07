
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OverviewCards from './pam-analytics/OverviewCards';
import IntentAnalysis from './pam-analytics/IntentAnalysis';
import PerformanceMetrics from './pam-analytics/PerformanceMetrics';
import ErrorAnalysis from './pam-analytics/ErrorAnalysis';
import UserEngagement from './pam-analytics/UserEngagement';
import AlertsFeed from './pam-analytics/AlertsFeed';
import { Button } from '@/components/ui/button';
import { RefreshCw, Calendar, Download } from 'lucide-react';
import { useAnalyticsData } from './pam-analytics/hooks/useAnalyticsData';
import { useRealTimeAlerts } from './pam-analytics/hooks/useRealTimeAlerts';

const PAMAnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const { data: analyticsData, isLoading, error, refetch } = useAnalyticsData(dateRange);
  const { alerts } = useRealTimeAlerts();

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    // TODO: Implement export functionality
    console.log(`Exporting data as ${format}`);
  };

  if (error) {
    return (
      <div className="w-full">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Analytics</h3>
              <p className="text-red-600 mb-4">Failed to load PAM analytics data. Please try again.</p>
              <Button onClick={handleRefresh} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PAM Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time insights into PAM AI Assistant performance and usage</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          
          <Button onClick={() => handleExport('pdf')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <OverviewCards data={analyticsData?.overview} isLoading={isLoading} />

      {/* Alerts Feed */}
      {alerts && alerts.length > 0 && (
        <AlertsFeed alerts={alerts} />
      )}

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="intent" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="intent">Intent Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="engagement">User Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="intent" className="space-y-4">
          <IntentAnalysis data={analyticsData?.intent_analysis} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceMetrics data={analyticsData?.performance_metrics} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <ErrorAnalysis data={analyticsData?.error_analysis} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <UserEngagement data={analyticsData?.user_engagement} isLoading={isLoading} />
        </TabsContent>
      </Tabs>

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <div className="fixed bottom-4 left-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
          Auto-refreshing every 30s
        </div>
      )}
    </div>
  );
};

export default PAMAnalyticsDashboard;
