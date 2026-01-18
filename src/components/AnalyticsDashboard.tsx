import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Users, Activity, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  interactions: number;
  conversionRate: number;
  realtimeData: any[];
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData>({
    totalUsers: 0,
    activeUsers: 0,
    interactions: 0,
    conversionRate: 0,
    realtimeData: []
  });

  const [activeExperiments, setActiveExperiments] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);

  useEffect(() => {
    loadAnalyticsData();
    loadExperiments();
    loadPredictions();
    
    // Set up real-time subscriptions
    const interactionsChannel = supabase
      .channel('analytics-interactions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_interactions'
      }, (payload) => {
        updateRealtimeData(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(interactionsChannel);
    };
  }, []);

  const loadAnalyticsData = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get active users (last 24h)
      const { count: activeUsers } = await supabase
        .from('analytics_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('session_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Get interactions (last 24h)
      const { count: interactions } = await supabase
        .from('user_interactions')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Get recent interactions for real-time display
      const { data: realtimeData } = await supabase
        .from('user_interactions')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      setData({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        interactions: interactions || 0,
        conversionRate: 0, // Calculate based on your conversion logic
        realtimeData: realtimeData || []
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const loadExperiments = async () => {
    try {
      const { data } = await supabase
        .from('ab_test_experiments')
        .select('*')
        .eq('status', 'active');
      
      setActiveExperiments(data || []);
    } catch (error) {
      console.error('Failed to load experiments:', error);
    }
  };

  const loadPredictions = async () => {
    try {
      const { data } = await supabase
        .from('predictive_models')
        .select('*')
        .eq('status', 'active')
        .order('last_trained', { ascending: false });
      
      setPredictions(data || []);
    } catch (error) {
      console.error('Failed to load predictions:', error);
    }
  };

  const updateRealtimeData = (newInteraction: any) => {
    setData(prev => ({
      ...prev,
      interactions: prev.interactions + 1,
      realtimeData: [newInteraction, ...prev.realtimeData.slice(0, 19)]
    }));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <Button onClick={loadAnalyticsData}>
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interactions (24h)</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.interactions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Interactions */}
        <Card>
          <CardHeader>
            <CardTitle>Real-time Interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.realtimeData.map((interaction, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-secondary/20 rounded">
                  <div>
                    <span className="font-medium">{interaction.interaction_type}</span>
                    <p className="text-sm text-muted-foreground">{interaction.page_path}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(interaction.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* A/B Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Active A/B Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeExperiments.map((exp) => (
                <div key={exp.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{exp.name}</h4>
                    <p className="text-sm text-muted-foreground">{exp.description}</p>
                  </div>
                  <Badge variant="outline">{exp.status}</Badge>
                </div>
              ))}
              {activeExperiments.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No active experiments</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Predictive Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Predictive Models</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {predictions.map((model) => (
              <div key={model.id} className="p-4 border rounded-lg">
                <h4 className="font-medium">{model.model_name}</h4>
                <p className="text-sm text-muted-foreground mb-2">{model.model_type}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Accuracy:</span>
                  <Badge variant={model.accuracy_score > 0.8 ? "default" : "secondary"}>
                    {(model.accuracy_score * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}