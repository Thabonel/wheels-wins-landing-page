
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsDashboard {
  overview: {
    total_requests_24h: number;
    error_rate_24h: number;
    unique_users_24h: number;
    avg_response_time: number;
    voice_usage_rate: number;
    system_status: 'healthy' | 'warning' | 'critical';
    trends: {
      requests_trend: number;
      users_trend: number;
      response_time_trend: number;
    };
  };
  intent_analysis: {
    top_intents: Array<{intent: string, count: number, percentage: string}>;
    distribution: Array<{name: string, value: number, color: string}>;
    confidence_levels: {
      high: number;
      medium: number;
      low: number;
    };
  };
  performance_metrics: {
    response_times: Array<{timestamp: string, value: number}>;
    hourly_usage: Array<{hour: string, requests: number}>;
    p95_response_time: number;
  };
  error_analysis: {
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
  user_engagement: {
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
}

export const useAnalyticsData = (dateRange: string) => {
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const emptyData: AnalyticsDashboard = {
    overview: {
      total_requests_24h: 0,
      error_rate_24h: 0,
      unique_users_24h: 0,
      avg_response_time: 0,
      voice_usage_rate: 0,
      system_status: 'healthy',
      trends: {
        requests_trend: 0,
        users_trend: 0,
        response_time_trend: 0
      }
    },
    intent_analysis: {
      top_intents: [],
      distribution: [],
      confidence_levels: {
        high: 0,
        medium: 0,
        low: 0
      }
    },
    performance_metrics: {
      response_times: [],
      hourly_usage: [],
      p95_response_time: 0
    },
    error_analysis: {
      recent_errors: [],
      error_types: [],
      error_by_intent: []
    },
    user_engagement: {
      session_lengths: {
        short: 0,
        medium: 0,
        long: 0
      },
      daily_active_users: [],
      activity_heatmap: [],
      voice_vs_text: {
        voice: 0,
        text: 0
      }
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get real data from agent_logs table
      const { data: agentLogs, error } = await supabase
        .from('agent_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Calculate real metrics from agent logs
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentLogs = agentLogs?.filter(log => 
        new Date(log.created_at) >= oneDayAgo
      ) || [];

      const uniqueUsers = [...new Set(recentLogs.map(log => log.user_id))].length;
      const totalRequests = recentLogs.length;

      // Count intents from recent logs
      const intentCounts = recentLogs.reduce((acc, log) => {
        const intent = log.intent || 'unknown';
        acc[intent] = (acc[intent] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topIntents = Object.entries(intentCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 6)
        .map(([intent, count]) => ({
          intent,
          count,
          percentage: `${((count / totalRequests) * 100).toFixed(1)}%`
        }));

      // Build real analytics data
      const realData: AnalyticsDashboard = {
        overview: {
          total_requests_24h: totalRequests,
          error_rate_24h: 0, // We don't track errors separately yet
          unique_users_24h: uniqueUsers,
          avg_response_time: 850, // Default for now
          voice_usage_rate: 0, // We don't track voice usage yet
          system_status: 'healthy' as const,
          trends: {
            requests_trend: 0, // Would need historical data
            users_trend: 0,
            response_time_trend: 0
          }
        },
        intent_analysis: {
          top_intents: topIntents,
          distribution: topIntents.map((item, i) => ({
            name: item.intent,
            value: (item.count / totalRequests) * 100,
            color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'][i] || '#6b7280'
          })),
          confidence_levels: emptyData.intent_analysis.confidence_levels
        },
        performance_metrics: emptyData.performance_metrics,
        error_analysis: emptyData.error_analysis,
        user_engagement: {
          ...emptyData.user_engagement,
          daily_active_users: Array.from({ length: 7 }, (_, i) => {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dayLogs = agentLogs?.filter(log => {
              const logDate = new Date(log.created_at);
              return logDate.toDateString() === date.toDateString();
            }) || [];
            return {
              date: date.toLocaleDateString(),
              users: [...new Set(dayLogs.map(log => log.user_id))].length
            };
          }).reverse()
        }
      };

      setData(realData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching analytics data:', err);
      // Fallback to an empty data structure on error
      setData(emptyData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [dateRange]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  };
};
