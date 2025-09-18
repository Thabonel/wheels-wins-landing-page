import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, DollarSign, TrendingUp, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { pamSavingsApi } from '@/services/pamSavingsService';
import { formatCurrency } from '@/lib/utils';

export const PamSavingsSummaryCard = () => {
  // Fetch guarantee status
  const { data: guaranteeStatus, isLoading, error } = useQuery({
    queryKey: ['guarantee-status'],
    queryFn: () => pamSavingsApi.getGuaranteeStatus(),
    refetchInterval: 60000, // Refresh every minute
    retry: 2,
    onError: (error) => {
      console.warn('PAM Savings API unavailable, using fallback data:', error);
    }
  });

  // Fetch recent savings events
  const { data: recentEvents } = useQuery({
    queryKey: ['recent-savings'],
    queryFn: () => pamSavingsApi.getRecentSavingsEvents(5),
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  // Mock data for when API is unavailable (staging environment)
  const mockSavingsData = {
    guarantee_met: true,
    total_savings: 18.50,
    subscription_cost: 14.00,
    savings_shortfall: 0,
    savings_events_count: 3,
    percentage_achieved: 132,
    billing_period_start: new Date().toISOString().split('T')[0],
    billing_period_end: new Date().toISOString().split('T')[0]
  };

  // Use mock data if API fails or in development
  const displayData = guaranteeStatus || (error ? mockSavingsData : null);
  const isUsingMockData = !guaranteeStatus && error;

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-blue-500 animate-pulse" />
            <CardTitle>PAM Savings This Month</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!displayData) {
    return null;
  }

  const savingsProgress = Math.min(
    (displayData.total_savings / displayData.subscription_cost) * 100,
    100
  );

  const guaranteeMet = displayData.guarantee_met;
  const streak = recentEvents?.length || 0;

  return (
    <Card className="w-full h-[72px] bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800">
      <CardContent className="flex items-center justify-between p-4 h-full">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <Sparkles className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-sm truncate">PAM Savings This Month</h3>
              {isUsingMockData && (
                <span className="text-xs text-muted-foreground">(demo)</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {isUsingMockData ? (
                "PAM will try her best to save you money!"
              ) : (
                "Your AI assistant is saving you money automatically"
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(displayData.total_savings)}
            </div>
            <div className="text-xs text-muted-foreground">
              of {formatCurrency(displayData.subscription_cost)} needed
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">{displayData.savings_events_count} saves</div>
            <div className="text-xs text-muted-foreground">{Math.round(savingsProgress)}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};