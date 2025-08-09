
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface IntentAnalysisProps {
  data?: {
    top_intents: Array<{intent: string, count: number, percentage: string}>;
    distribution: Array<{name: string, value: number, color: string}>;
    confidence_levels: {
      high: number;
      medium: number;
      low: number;
    };
  };
  isLoading: boolean;
}

const IntentAnalysis: React.FC<IntentAnalysisProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
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
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Top Intents Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Intents</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.top_intents} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="intent" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Intent Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Intent Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.distribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Confidence Levels */}
      <Card>
        <CardHeader>
          <CardTitle>Intent Confidence Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-green-700">High Confidence</span>
                <span className="text-sm text-gray-600">{data.confidence_levels.high}%</span>
              </div>
              <Progress value={data.confidence_levels.high} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-yellow-700">Medium Confidence</span>
                <span className="text-sm text-gray-600">{data.confidence_levels.medium}%</span>
              </div>
              <Progress value={data.confidence_levels.medium} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-red-700">Low Confidence</span>
                <span className="text-sm text-gray-600">{data.confidence_levels.low}%</span>
              </div>
              <Progress value={data.confidence_levels.low} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Intent Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Intent Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Intent</th>
                  <th className="text-right py-2">Count</th>
                  <th className="text-right py-2">Percentage</th>
                  <th className="text-right py-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.top_intents.map((intent, index) => (
                  <tr key={intent.intent} className="border-b">
                    <td className="py-2 font-medium">{intent.intent.replace('_', ' ')}</td>
                    <td className="py-2 text-right">{intent.count.toLocaleString()}</td>
                    <td className="py-2 text-right">{intent.percentage}</td>
                    <td className="py-2 text-right">
                      <span className="text-green-600">↗ {Math.floor(Math.random() * 10)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntentAnalysis;
