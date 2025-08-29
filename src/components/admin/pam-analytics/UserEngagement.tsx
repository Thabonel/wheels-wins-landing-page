
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface UserEngagementProps {
  data?: {
    session_lengths: {
      short: number;
      medium: number;
      long: number;
    };
    daily_active_users: Array<{date: string, users: number}>;
    activity_heatmap: Array<{day: string, hour: number, activity: number}>;
    voice_vs_text: {
      voice: number;
      text: number;
    };
  };
  isLoading: boolean;
}

const UserEngagement: React.FC<UserEngagementProps> = ({ data, isLoading }) => {
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

  const sessionLengthData = [
    { name: 'Short (< 2 min)', value: data.session_lengths.short, color: '#ef4444' },
    { name: 'Medium (2-10 min)', value: data.session_lengths.medium, color: '#f59e0b' },
    { name: 'Long (> 10 min)', value: data.session_lengths.long, color: '#10b981' }
  ];

  const communicationData = [
    { name: 'Text', value: data.voice_vs_text.text, color: '#3b82f6' },
    { name: 'Voice', value: data.voice_vs_text.voice, color: '#8b5cf6' }
  ];

  // Create heatmap data grouped by day
  const heatmapByDay = data.activity_heatmap.reduce((acc, item) => {
    if (!acc[item.day]) acc[item.day] = [];
    acc[item.day].push(item);
    return acc;
  }, {} as Record<string, Array<{day: string, hour: number, activity: number}>>);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-6">
      {/* Engagement Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Daily Active Users</p>
                <p className="text-2xl font-bold text-blue-600">
                  {data.daily_active_users[0]?.users.toLocaleString() || '0'}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Session Length</p>
                <p className="text-2xl font-bold text-green-600">4.2 min</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">+8% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Voice Usage</p>
                <p className="text-2xl font-bold text-purple-600">{data.voice_vs_text.voice}%</p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">of all interactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Active Users Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Active Users (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.daily_active_users.reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Session Length Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Session Length Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sessionLengthData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sessionLengthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Communication Methods and Session Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice vs Text Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Communication Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={communicationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {communicationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Session Quality Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Session Quality Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">User Satisfaction</span>
                  <span className="text-sm text-gray-600">87%</span>
                </div>
                <Progress value={87} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Query Resolution Rate</span>
                  <span className="text-sm text-gray-600">92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Follow-up Questions</span>
                  <span className="text-sm text-gray-600">34%</span>
                </div>
                <Progress value={34} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Return User Rate</span>
                  <span className="text-sm text-gray-600">68%</span>
                </div>
                <Progress value={68} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>User Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-25 gap-1 text-xs">
                {/* Hour headers */}
                <div></div>
                {hours.map(hour => (
                  <div key={hour} className="text-center p-1 text-gray-500">
                    {hour}
                  </div>
                ))}
                
                {/* Activity data */}
                {days.map(day => (
                  <React.Fragment key={day}>
                    <div className="text-right p-1 text-gray-500 font-medium">{day}</div>
                    {hours.map(hour => {
                      const activity = heatmapByDay[day]?.find(h => h.hour === hour)?.activity || 0;
                      const intensity = Math.min(activity / 100, 1);
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className="h-8 rounded"
                          style={{
                            backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                            border: '1px solid #e5e7eb'
                          }}
                          title={`${day} ${hour}:00 - ${activity}% activity`}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
              
              <div className="flex items-center justify-center mt-4 gap-4">
                <span className="text-xs text-gray-500">Less</span>
                <div className="flex gap-1">
                  {[0, 0.2, 0.4, 0.6, 0.8, 1].map(opacity => (
                    <div
                      key={opacity}
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: `rgba(59, 130, 246, ${opacity})` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">More</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Peak Activity Times</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Morning (8-12)</span>
                  <Badge variant="outline">High</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Afternoon (12-17)</span>
                  <Badge variant="outline">Medium</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Evening (17-22)</span>
                  <Badge variant="outline">High</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Night (22-8)</span>
                  <Badge variant="outline">Low</Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">User Behavior Patterns</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• 68% of users return within 24 hours</p>
                <p>• Voice usage peaks during commute hours</p>
                <p>• Weekend activity 23% lower than weekdays</p>
                <p>• Average 3.2 queries per session</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserEngagement;
