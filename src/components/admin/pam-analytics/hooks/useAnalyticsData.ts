
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

  // Mock data for development - replace with actual API calls
  const mockData: AnalyticsDashboard = {
    overview: {
      total_requests_24h: 15420,
      error_rate_24h: 2.3,
      unique_users_24h: 3250,
      avg_response_time: 850,
      voice_usage_rate: 23.5,
      system_status: 'healthy',
      trends: {
        requests_trend: 12.5,
        users_trend: 8.3,
        response_time_trend: -5.2
      }
    },
    intent_analysis: {
      top_intents: [
        { intent: 'travel_advice', count: 4520, percentage: '29.3%' },
        { intent: 'budget_help', count: 3890, percentage: '25.2%' },
        { intent: 'local_recommendations', count: 2750, percentage: '17.8%' },
        { intent: 'safety_tips', count: 2140, percentage: '13.9%' },
        { intent: 'transport_info', count: 1320, percentage: '8.6%' },
        { intent: 'other', count: 800, percentage: '5.2%' }
      ],
      distribution: [
        { name: 'Travel Advice', value: 29.3, color: '#3b82f6' },
        { name: 'Budget Help', value: 25.2, color: '#10b981' },
        { name: 'Recommendations', value: 17.8, color: '#f59e0b' },
        { name: 'Safety', value: 13.9, color: '#ef4444' },
        { name: 'Transport', value: 8.6, color: '#8b5cf6' },
        { name: 'Other', value: 5.2, color: '#6b7280' }
      ],
      confidence_levels: {
        high: 78.2,
        medium: 18.5,
        low: 3.3
      }
    },
    performance_metrics: {
      response_times: Array.from({ length: 24 }, (_, i) => ({
        timestamp: `${i}:00`,
        value: Math.floor(Math.random() * 500) + 600
      })),
      hourly_usage: Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        requests: Math.floor(Math.random() * 800) + 200
      })),
      p95_response_time: 1250
    },
    error_analysis: {
      recent_errors: [
        {
          timestamp: new Date().toISOString(),
          error_type: 'API_TIMEOUT',
          error_message: 'Request timeout after 30 seconds',
          intent: 'travel_advice',
          user_id: 'user_123'
        },
        {
          timestamp: new Date(Date.now() - 300000).toISOString(),
          error_type: 'INTENT_NOT_RECOGNIZED',
          error_message: 'Unable to classify user intent',
          user_id: 'user_456'
        }
      ],
      error_types: [
        { name: 'API_TIMEOUT', count: 45, percentage: 38.5 },
        { name: 'INTENT_NOT_RECOGNIZED', count: 32, percentage: 27.4 },
        { name: 'RATE_LIMIT_EXCEEDED', count: 25, percentage: 21.4 },
        { name: 'INTERNAL_ERROR', count: 15, percentage: 12.8 }
      ],
      error_by_intent: [
        { intent: 'travel_advice', error_count: 12, total_count: 4520 },
        { intent: 'budget_help', error_count: 8, total_count: 3890 },
        { intent: 'local_recommendations', error_count: 6, total_count: 2750 }
      ]
    },
    user_engagement: {
      session_lengths: {
        short: 45.2,
        medium: 35.8,
        long: 19.0
      },
      daily_active_users: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString(),
        users: Math.floor(Math.random() * 1000) + 2000
      })),
      activity_heatmap: Array.from({ length: 168 }, (_, i) => ({
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][Math.floor(i / 24)],
        hour: i % 24,
        activity: Math.floor(Math.random() * 100)
      })),
      voice_vs_text: {
        voice: 23.5,
        text: 76.5
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
          top_intents: topIntents.length > 0 ? topIntents : mockData.intent_analysis.top_intents,
          distribution: topIntents.length > 0 ? topIntents.map((item, i) => ({
            name: item.intent,
            value: (item.count / totalRequests) * 100,
            color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'][i] || '#6b7280'
          })) : mockData.intent_analysis.distribution,
          confidence_levels: mockData.intent_analysis.confidence_levels // Use mock for now
        },
        performance_metrics: mockData.performance_metrics, // Use mock for now
        error_analysis: mockData.error_analysis, // Use mock for now
        user_engagement: {
          ...mockData.user_engagement,
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
      // Fallback to mock data on error
      setData(mockData);
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
