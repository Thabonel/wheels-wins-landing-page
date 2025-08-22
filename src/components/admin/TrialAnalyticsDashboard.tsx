/**
 * Trial Analytics Dashboard - Admin view of trial metrics and performance
 * Shows conversion rates, milestone completion, and user engagement
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  TrendingUp, 
  Target, 
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TrialMetrics {
  total_trials: number;
  active_trials: number;
  expired_trials: number;
  converted_trials: number;
  conversion_rate: number;
  avg_milestones_completed: number;
  milestones_breakdown: {
    import_expenses: number;
    save_route: number;
    set_budget: number;
    link_fuel: number;
    enable_reminders: number;
  };
  daily_signups: { date: string; count: number }[];
  trial_events_today: number;
  revenue_from_trials: number;
}

export const TrialAnalyticsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<TrialMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch trial overview
      const { data: trials, error: trialsError } = await supabase
        .from('trials')
        .select('id, status, started_at, conversion_at, created_at');

      if (trialsError) throw trialsError;

      // Fetch milestones data
      const { data: milestones, error: milestonesError } = await supabase
        .from('trial_milestones')
        .select('milestone_type, completed_at');

      if (milestonesError) throw milestonesError;

      // Fetch events from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayEvents, error: eventsError } = await supabase
        .from('trial_events')
        .select('id')
        .gte('created_at', today.toISOString());

      if (eventsError) throw eventsError;

      // Calculate metrics
      const totalTrials = trials?.length || 0;
      const activeTrials = trials?.filter(t => t.status === 'active').length || 0;
      const expiredTrials = trials?.filter(t => t.status === 'expired').length || 0;
      const convertedTrials = trials?.filter(t => t.status === 'converted').length || 0;
      
      const conversionRate = totalTrials > 0 ? (convertedTrials / totalTrials) * 100 : 0;
      
      const completedMilestones = milestones?.filter(m => m.completed_at) || [];
      const avgMilestonesCompleted = totalTrials > 0 
        ? completedMilestones.length / totalTrials 
        : 0;

      // Milestone breakdown
      const milestonesBreakdown = {
        import_expenses: completedMilestones.filter(m => m.milestone_type === 'import_expenses').length,
        save_route: completedMilestones.filter(m => m.milestone_type === 'save_route').length,
        set_budget: completedMilestones.filter(m => m.milestone_type === 'set_budget').length,
        link_fuel: completedMilestones.filter(m => m.milestone_type === 'link_fuel').length,
        enable_reminders: completedMilestones.filter(m => m.milestone_type === 'enable_reminders').length,
      };

      // Daily signups for last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const dailySignups = last7Days.map(date => {
        const count = trials?.filter(t => 
          t.created_at.split('T')[0] === date
        ).length || 0;
        return { date, count };
      });

      setMetrics({
        total_trials: totalTrials,
        active_trials: activeTrials,
        expired_trials: expiredTrials,
        converted_trials: convertedTrials,
        conversion_rate: conversionRate,
        avg_milestones_completed: avgMilestonesCompleted,
        milestones_breakdown: milestonesBreakdown,
        daily_signups: dailySignups,
        trial_events_today: todayEvents?.length || 0,
        revenue_from_trials: convertedTrials * 99.99 // Assuming annual pricing
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      console.error('Error fetching trial analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          <span>Loading trial analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Error: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const milestoneLabels = {
    import_expenses: 'Import Expenses',
    save_route: 'Save Route',
    set_budget: 'Set Budget',
    link_fuel: 'Link Fuel',
    enable_reminders: 'Enable Reminders'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Trial Analytics</h2>
        <Badge variant="outline" className="text-blue-600 border-blue-200">
          <Clock className="h-3 w-3 mr-1" />
          Last updated: {new Date().toLocaleTimeString()}
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trials</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_trials}</div>
            <p className="text-xs text-gray-600">
              {metrics.active_trials} active, {metrics.expired_trials} expired
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversion_rate.toFixed(1)}%</div>
            <p className="text-xs text-gray-600">
              {metrics.converted_trials} conversions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Milestones</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avg_milestones_completed.toFixed(1)}</div>
            <p className="text-xs text-gray-600">
              out of 5 per user
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.revenue_from_trials.toLocaleString()}</div>
            <p className="text-xs text-gray-600">
              From converted trials
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Completion Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Milestone Completion Rates</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(metrics.milestones_breakdown).map(([key, count]) => {
            const percentage = metrics.total_trials > 0 
              ? (count / metrics.total_trials) * 100 
              : 0;
            
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {milestoneLabels[key as keyof typeof milestoneLabels]}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{count}</span>
                    <Badge variant="outline" className="text-xs">
                      {percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Daily Signups Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>Daily Trial Signups (Last 7 Days)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.daily_signups.map(({ date, count }) => (
              <div key={date} className="flex items-center justify-between">
                <span className="text-sm">
                  {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ 
                        width: `${Math.max(count / Math.max(...metrics.daily_signups.map(d => d.count)) * 100, 5)}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{metrics.trial_events_today}</div>
              <div className="text-sm text-blue-800">Trial Events</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{metrics.active_trials}</div>
              <div className="text-sm text-green-800">Active Trials</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};