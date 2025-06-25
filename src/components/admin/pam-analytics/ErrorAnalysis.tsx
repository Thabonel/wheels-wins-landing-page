
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ErrorAnalysisProps {
  data?: {
    recent_errors: Array<{
      timestamp: string;
      error_type: string;
      error_message: string;
      intent?: string;
      user_id?: string;
    }>;
    error_types: Array<{name: string, count: number, percentage: number}>;
    error_by_intent: Array<{intent: string, error_count: number, total_count: number}>;
  };
  isLoading: boolean;
}

const ErrorAnalysis: React.FC<ErrorAnalysisProps> = ({ data, isLoading }) => {
  const [expandedError, setExpandedError] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'timestamp' | 'type'>('timestamp');

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

  const getErrorSeverity = (errorType: string) => {
    const critical = ['INTERNAL_ERROR', 'API_TIMEOUT'];
    const warning = ['RATE_LIMIT_EXCEEDED', 'INTENT_NOT_RECOGNIZED'];
    
    if (critical.includes(errorType)) return 'critical';
    if (warning.includes(errorType)) return 'warning';
    return 'info';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const errorTypeColors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

  const sortedErrors = [...data.recent_errors].sort((a, b) => {
    if (sortBy === 'timestamp') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    return a.error_type.localeCompare(b.error_type);
  });

  return (
    <div className="space-y-6">
      {/* Error Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Errors (24h)</p>
                <p className="text-2xl font-bold text-red-600">
                  {data.error_types.reduce((acc, err) => acc + err.count, 0)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold text-yellow-600">2.3%</p>
              </div>
              <div className="text-sm text-gray-500">
                vs 1.8% yesterday
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Most Common</p>
                <p className="text-lg font-bold text-gray-900">
                  {data.error_types[0]?.name || 'N/A'}
                </p>
              </div>
              <Badge variant="outline">
                {data.error_types[0]?.percentage.toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Types and Error by Intent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Types Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Error Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.error_types}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.error_types.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={errorTypeColors[index % errorTypeColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Error Rate by Intent */}
        <Card>
          <CardHeader>
            <CardTitle>Error Rate by Intent</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.error_by_intent.map(item => ({
                ...item,
                error_rate: ((item.error_count / item.total_count) * 100).toFixed(2)
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="intent" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, 'Error Rate']} />
                <Bar dataKey="error_rate" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent Errors
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'timestamp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('timestamp')}
              >
                Sort by Time
              </Button>
              <Button
                variant={sortBy === 'type' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('type')}
              >
                Sort by Type
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Error Type</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedErrors.map((error, index) => (
                  <React.Fragment key={index}>
                    <TableRow>
                      <TableCell className="text-sm">
                        {new Date(error.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(getErrorSeverity(error.error_type))}>
                          {error.error_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {error.intent || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {error.user_id || 'Anonymous'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedError(expandedError === index ? null : index)}
                        >
                          {expandedError === index ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedError === index && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-gray-50">
                          <div className="p-3">
                            <p className="text-sm font-medium mb-2">Error Message:</p>
                            <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                              {error.error_message}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Error Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Error Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 text-gray-900">Top Error Sources</h4>
              <div className="space-y-3">
                {data.error_types.slice(0, 3).map((errorType, index) => (
                  <div key={errorType.name} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{errorType.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{errorType.count} errors</span>
                      <Badge variant="outline">{errorType.percentage.toFixed(1)}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3 text-gray-900">Recommendations</h4>
              <div className="space-y-2">
                <div className="p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                  <p className="text-sm">
                    <strong>API Timeouts:</strong> Consider increasing timeout values or implementing retry logic.
                  </p>
                </div>
                <div className="p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                  <p className="text-sm">
                    <strong>Intent Recognition:</strong> Review and update training data for better accuracy.
                  </p>
                </div>
                <div className="p-2 bg-green-50 rounded border-l-4 border-green-400">
                  <p className="text-sm">
                    <strong>Rate Limiting:</strong> Implement user-based rate limiting to prevent abuse.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorAnalysis;
