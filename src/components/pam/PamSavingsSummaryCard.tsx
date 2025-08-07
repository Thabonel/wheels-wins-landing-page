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
  const { data: guaranteeStatus, isLoading } = useQuery({
    queryKey: ['guarantee-status'],
    queryFn: () => pamSavingsApi.getGuaranteeStatus(),
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch recent savings events
  const { data: recentEvents } = useQuery({
    queryKey: ['recent-savings'],
    queryFn: () => pamSavingsApi.getRecentSavingsEvents(5),
    refetchInterval: 300000 // Refresh every 5 minutes
  });

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

  if (!guaranteeStatus) {
    return null;
  }

  const savingsProgress = Math.min(
    (guaranteeStatus.total_savings / guaranteeStatus.subscription_cost) * 100, 
    100
  );

  const guaranteeMet = guaranteeStatus.guarantee_met;
  const streak = recentEvents?.length || 0;

  return (
    <Card className="w-full bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border-2 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <CardTitle>PAM Savings This Month</CardTitle>
          </div>
          {guaranteeMet && (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              <Shield className="h-3 w-3 mr-1" />
              Guaranteed
            </Badge>
          )}
        </div>
        <CardDescription>
          Your AI assistant is saving you money automatically
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Savings Amount */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(guaranteeStatus.total_savings)}
            </p>
            <p className="text-sm text-muted-foreground">
              of {formatCurrency(guaranteeStatus.subscription_cost)} needed
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {guaranteeStatus.savings_events_count} saves
            </p>
            {streak > 0 && (
              <p className="text-xs text-muted-foreground">
                {streak} recent wins
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Guarantee Progress</span>
            <span className="font-medium">{Math.round(savingsProgress)}%</span>
          </div>
          <Progress 
            value={savingsProgress} 
            className={`h-2 ${guaranteeMet ? '[&>*]:bg-green-500' : '[&>*]:bg-blue-500'}`}
          />
        </div>

        {/* Status Message */}
        <div className="text-sm">
          {guaranteeMet ? (
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <Shield className="h-4 w-4" />
              <span className="font-medium">Your subscription is guaranteed this month!</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
              <TrendingUp className="h-4 w-4" />
              <span>
                {formatCurrency(guaranteeStatus.savings_shortfall)} more to guarantee
              </span>
            </div>
          )}
        </div>

        {/* Recent Savings Highlights */}
        {recentEvents && recentEvents.length > 0 && (
          <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
            <p className="text-xs text-muted-foreground mb-2">Latest PAM saves:</p>
            <div className="space-y-1">
              {recentEvents.slice(0, 3).map((event) => (
                <div key={event.id} className="flex justify-between text-xs">
                  <span className="truncate mr-2 text-gray-600 dark:text-gray-400">
                    {event.savings_description.length > 30 
                      ? event.savings_description.substring(0, 30) + '...'
                      : event.savings_description}
                  </span>
                  <span className="text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                    +{formatCurrency(event.actual_savings)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Details Link */}
        <div className="pt-2">
          <a 
            href="/wins" 
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
          >
            View detailed savings in Wins
            <DollarSign className="h-3 w-3 ml-1" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
};