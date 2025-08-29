
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface PerformanceMetricsProps {
  data?: {
    response_times: Array<{timestamp: string, value: number}>;
    hourly_usage: Array<{hour: string, requests: number}>;
    p95_response_time: number;
  };
  isLoading: boolean;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formatTime = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
  };

  const getPerformanceStatus = (p95: number) => {
    if (p95 < 1000) return { status: 'excellent', color: 'bg-green-100 text-green-800' };
    if (p95 < 2000) return { status: 'good', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'needs attention', color: 'bg-red-100 text-red-800' };
  };

  const performanceStatus = getPerformanceStatus(data.p95_response_time);

  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Performance Summary
            <Badge className={performanceStatus.color}>
              P95: {formatTime(data.p95_response_time)} - {performanceStatus.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(Math.min(...data.response_times.map(r => r.value)))}
              </div>
              <p className="text-sm text-gray-600">Fastest Response</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatTime(data.response_times.reduce((acc, r) => acc + r.value, 0) / data.response_times.length)}
              </div>
              <p className="text-sm text-gray-600">Average Response</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatTime(data.p95_response_time)}
              </div>
              <p className="text-sm text-gray-600">95th Percentile</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Response Time Trend (Last 24 Hours)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.response_times} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis tickFormatter={formatTime} />
                <Tooltip formatter={(value) => [formatTime(value as number), 'Response Time']} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hourly Usage Pattern */}
        <Card>
          <CardHeader>
            <CardTitle>Hourly Usage Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.hourly_usage} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="requests" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Peak Hours</h4>
              <div className="space-y-2">
                {data.hourly_usage
                  .sort((a, b) => b.requests - a.requests)
                  .slice(0, 3)
                  .map((hour, index) => (
                    <div key={hour.hour} className="flex justify-between items-center">
                      <span className="text-sm">{hour.hour}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(hour.requests / Math.max(...data.hourly_usage.map(h => h.requests))) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">{hour.requests}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Response Time Distribution</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Under 500ms</span>
                  <span className="text-sm font-medium text-green-600">
                    {Math.round((data.response_times.filter(r => r.value < 500).length / data.response_times.length) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">500ms - 1s</span>
                  <span className="text-sm font-medium text-yellow-600">
                    {Math.round((data.response_times.filter(r => r.value >= 500 && r.value < 1000).length / data.response_times.length) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Over 1s</span>
                  <span className="text-sm font-medium text-red-600">
                    {Math.round((data.response_times.filter(r => r.value >= 1000).length / data.response_times.length) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMetrics;
