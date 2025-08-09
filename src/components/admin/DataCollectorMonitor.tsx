import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { RefreshCw, Database, TrendingUp, Calendar, CheckCircle, AlertCircle, Clock, Target } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface CollectorStats {
  totalTemplates: number;
  recentTemplates: number;
  targetProgress: number;
  monthlyGrowth: Array<{ name: string, templates: number }>;
  sourceBreakdown: Array<{ name: string, count: number, color: string }>;
  collectionHistory: Array<{ date: string, added: number }>;
  nextCollection: string;
  daysUntilNext: number;
  healthStatus: 'healthy' | 'warning' | 'error';
  lastCollection: string;
}

const DataCollectorMonitor = () => {
  const [stats, setStats] = useState<CollectorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const sourceColors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', 
    '#8dd1e1', '#d084d0', '#87d068', '#ffa940'
  ];

  const fetchCollectorStats = async () => {
    setLoading(true);
    try {
      // Get total templates count
      const { count: totalTemplates } = await supabase
        .from('trip_templates')
        .select('*', { count: 'exact', head: true });

      // Get recent templates (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: recentTemplates } = await supabase
        .from('trip_templates')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Calculate target progress (5000 is the goal)
      const targetProgress = Math.min((totalTemplates || 0) / 5000 * 100, 100);

      // Get monthly growth data (last 6 months)
      const monthlyGrowth = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const { count: monthCount } = await supabase
          .from('trip_templates')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString())
          .lt('created_at', endOfMonth.toISOString());

        monthlyGrowth.push({ name: monthName, templates: monthCount || 0 });
      }

      // Get data source breakdown
      const { data: templatesWithSource } = await supabase
        .from('trip_templates')
        .select('template_data')
        .not('template_data', 'is', null);

      const sourceCounts: Record<string, number> = {};
      templatesWithSource?.forEach(template => {
        const source = template.template_data?.source || 'unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      const sourceBreakdown = Object.entries(sourceCounts)
        .map(([name, count], index) => ({
          name: name === 'unknown' ? 'Manual/Legacy' : name,
          count,
          color: sourceColors[index % sourceColors.length]
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8); // Top 8 sources

      // Get collection history (last 30 days, daily)
      const collectionHistory = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

        const { count: dayCount } = await supabase
          .from('trip_templates')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dayStart.toISOString())
          .lt('created_at', dayEnd.toISOString());

        if (dayCount && dayCount > 0) {
          collectionHistory.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            added: dayCount
          });
        }
      }

      // Calculate next collection date (1st of next month at 2 AM UTC)
      const now = new Date();
      const nextMonth = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
      const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
      const nextCollection = new Date(nextYear, nextMonth, 1, 2, 0, 0);
      
      const daysUntilNext = Math.ceil((nextCollection.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Determine health status
      let healthStatus: 'healthy' | 'warning' | 'error' = 'healthy';
      let lastCollection = 'Unknown';

      if (recentTemplates === 0 && totalTemplates && totalTemplates > 0) {
        healthStatus = 'warning'; // No recent activity
      } else if (totalTemplates === 0) {
        healthStatus = 'error'; // No data at all
      }

      // Find last collection date
      const { data: latestTemplate } = await supabase
        .from('trip_templates')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      if (latestTemplate && latestTemplate[0]) {
        lastCollection = new Date(latestTemplate[0].created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }

      setStats({
        totalTemplates: totalTemplates || 0,
        recentTemplates: recentTemplates || 0,
        targetProgress,
        monthlyGrowth,
        sourceBreakdown,
        collectionHistory: collectionHistory.slice(-10), // Last 10 days with activity
        nextCollection: nextCollection.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }),
        daysUntilNext,
        healthStatus,
        lastCollection
      });
      
      setLastRefresh(new Date());

    } catch (error) {
      console.error('Error fetching collector stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectorStats();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchCollectorStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Warning</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading collector data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Data Collector Monitor</h1>
          <p className="text-gray-600">Autonomous travel data collection system</p>
        </div>
        <div className="flex items-center gap-4">
          {getHealthBadge(stats.healthStatus)}
          <button
            onClick={fetchCollectorStats}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTemplates.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.recentTemplates} added in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.targetProgress.toFixed(1)}%</div>
            <Progress value={stats.targetProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {5000 - stats.totalTemplates} locations to reach 5,000 goal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Collection</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.daysUntilNext} days</div>
            <p className="text-xs text-muted-foreground">
              {stats.nextCollection}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Collection</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{stats.lastCollection}</div>
            <p className="text-xs text-muted-foreground">
              Most recent data added
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Collection Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.monthlyGrowth}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="templates"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ fill: '#8884d8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height="200">
                  <PieChart>
                    <Pie
                      data={stats.sourceBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="count"
                    >
                      {stats.sourceBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2">
                {stats.sourceBreakdown.map((source, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: source.color }}
                    />
                    <span className="text-sm">{source.name}</span>
                    <span className="text-sm font-semibold ml-auto">{source.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collection Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Collection Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.collectionHistory}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="added" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {lastRefresh.toLocaleTimeString()} • 
        Auto-refreshes every 5 minutes • 
        Data from Supabase trip_templates table
      </div>
    </div>
  );
};

export default DataCollectorMonitor;