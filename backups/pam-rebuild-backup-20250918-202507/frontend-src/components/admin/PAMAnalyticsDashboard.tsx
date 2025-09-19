
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
import { useIsMobile } from '@/hooks/use-mobile';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { toast } from 'sonner';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const PAMAnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const isMobile = useIsMobile();
  
  const { data: analyticsData, isLoading, error, refetch } = useAnalyticsData(dateRange);
  const { alerts } = useRealTimeAlerts();

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!analyticsData) {
      toast.error('No analytics data available for export');
      return;
    }

    try {
      const date = new Date().toISOString().split('T')[0];

      if (format === 'csv') {
        const rows = [
          'Metric,Value',
          `Total Requests 24h,${analyticsData.overview.total_requests_24h}`,
          `Error Rate 24h,${analyticsData.overview.error_rate_24h}`,
          `Unique Users 24h,${analyticsData.overview.unique_users_24h}`,
          `Avg Response Time,${analyticsData.overview.avg_response_time}`,
          `Voice Usage Rate,${analyticsData.overview.voice_usage_rate}`,
          `System Status,${analyticsData.overview.system_status}`
        ];

        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        downloadBlob(blob, `pam-analytics-${date}.csv`);
      } else {
        const doc = await PDFDocument.create();
        const page = doc.addPage([612, 792]);
        const font = await doc.embedFont(StandardFonts.Helvetica);

        let y = 760;
        page.drawText('PAM Analytics Summary', { x: 50, y, size: 16, font });
        y -= 30;

        const lines = [
          `Total Requests (24h): ${analyticsData.overview.total_requests_24h}`,
          `Error Rate (24h): ${analyticsData.overview.error_rate_24h}%`,
          `Unique Users (24h): ${analyticsData.overview.unique_users_24h}`,
          `Avg Response Time: ${analyticsData.overview.avg_response_time} ms`,
          `Voice Usage Rate: ${analyticsData.overview.voice_usage_rate}%`,
          `System Status: ${analyticsData.overview.system_status}`
        ];

        lines.forEach(line => {
          page.drawText(line, { x: 50, y, size: 12, font });
          y -= 15;
        });

        const pdfBytes = await doc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        downloadBlob(blob, `pam-analytics-${date}.pdf`);
      }

      toast.success(`Analytics exported as ${format.toUpperCase()}`);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export analytics');
    }
  };

  if (error) {
    return (
      <div className="w-full">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 md:p-6">
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
    <div className="w-full space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">PAM Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">Real-time insights into PAM AI Assistant performance and usage</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading} className="flex-1 sm:flex-none">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isMobile ? 'Refresh' : 'Refresh'}
            </Button>
            
            {!isMobile && (
              <>
                <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                
                <Button onClick={() => handleExport('pdf')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </>
            )}
          </div>
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
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} max-w-full`}>
          <TabsTrigger value="intent" className="text-xs md:text-sm">Intent</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs md:text-sm">Performance</TabsTrigger>
          {!isMobile && <TabsTrigger value="errors" className="text-xs md:text-sm">Errors</TabsTrigger>}
          {!isMobile && <TabsTrigger value="engagement" className="text-xs md:text-sm">Engagement</TabsTrigger>}
        </TabsList>

        <TabsContent value="intent" className="space-y-4">
          <IntentAnalysis data={analyticsData?.intent_analysis} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceMetrics data={analyticsData?.performance_metrics} isLoading={isLoading} />
        </TabsContent>

        {!isMobile && (
          <>
            <TabsContent value="errors" className="space-y-4">
              <ErrorAnalysis data={analyticsData?.error_analysis} isLoading={isLoading} />
            </TabsContent>

            <TabsContent value="engagement" className="space-y-4">
              <UserEngagement data={analyticsData?.user_engagement} isLoading={isLoading} />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Mobile additional tabs */}
      {isMobile && (
        <Tabs defaultValue="errors" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="errors" className="text-xs">Errors</TabsTrigger>
            <TabsTrigger value="engagement" className="text-xs">Engagement</TabsTrigger>
          </TabsList>

          <TabsContent value="errors" className="space-y-4">
            <ErrorAnalysis data={analyticsData?.error_analysis} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            <UserEngagement data={analyticsData?.user_engagement} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      )}

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <div className="fixed bottom-4 left-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs md:text-sm z-10">
          Auto-refreshing every 30s
        </div>
      )}
    </div>
  );
};

export default PAMAnalyticsDashboard;
