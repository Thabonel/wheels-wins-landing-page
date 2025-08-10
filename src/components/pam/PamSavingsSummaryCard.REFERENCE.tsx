/**
 * PAM Savings Summary Card
 * Displays real-time guarantee progress, recent savings events, and achievement badges
 * Auto-refreshes every minute for current progress
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Target,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { 
  pamSavingsApi, 
  formatSavingsAmount, 
  getSavingsTypeDisplayName, 
  getSavingsTypeIcon, 
  getGuaranteeProgressColor,
  type GuaranteeStatus,
  type PamSavingsEvent
} from '@/services/pamSavingsService';
import { formatCurrency } from '@/lib/utils';

interface PamSavingsSummaryCardProps {
  className?: string;
  showRecentEvents?: boolean;
  refreshInterval?: number;
}

export const PamSavingsSummaryCard: React.FC<PamSavingsSummaryCardProps> = ({
  className = '',
  showRecentEvents = true,
  refreshInterval = 60000 // 1 minute
}) => {
  // Main guarantee status query
  const { 
    data: guaranteeStatus, 
    isLoading: isLoadingStatus, 
    error: statusError,
    refetch: refetchStatus,
    isRefetching: isRefetchingStatus
  } = useQuery({
    queryKey: ['guarantee-status'],
    queryFn: () => pamSavingsApi.getGuaranteeStatus(),
    refetchInterval: statusError ? false : refreshInterval, // Disable refetch on error
    refetchIntervalInBackground: false, // Don't refetch in background if there's an error
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 2, // Limit retries to prevent infinite loops
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Recent savings events query
  const { 
    data: recentEvents, 
    isLoading: isLoadingEvents,
    error: eventsError
  } = useQuery({
    queryKey: ['recent-savings', 'summary-card'],
    queryFn: () => pamSavingsApi.getRecentSavingsEvents(5),
    refetchInterval: eventsError ? false : (refreshInterval * 5), // Disable refetch on error
    enabled: showRecentEvents && !statusError, // Don't fetch if status failed
    retry: 2, // Limit retries
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const handleRefresh = () => {
    refetchStatus();
  };

  if (isLoadingStatus) {
    return <PamSavingsSummaryCardSkeleton className={className} />;
  }

  if (statusError) {
    return (
      <Card className={`${className} border-red-200 dark:border-red-800`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              PAM Savings Error
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription className="text-red-600/80 dark:text-red-400/80">
            Unable to load savings data. Please try refreshing.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!guaranteeStatus) {
    return (
      <Card className={`${className} border-gray-200 dark:border-gray-800`}>
        <CardHeader>
          <CardTitle className="text-gray-600 dark:text-gray-400">
            PAM Savings Guarantee
          </CardTitle>
          <CardDescription>
            No savings data available yet. Start using PAM to track your savings!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const {
    guarantee_met,
    total_savings,
    subscription_cost,
    savings_shortfall,
    savings_events_count,
    percentage_achieved
  } = guaranteeStatus;

  const progressColor = getGuaranteeProgressColor(percentage_achieved);
  const isCloseToGoal = percentage_achieved >= 75 && !guarantee_met;

  return (
    <Card className={`${className} relative overflow-hidden`}>
      {/* Background gradient for achieved guarantee */}
      {guarantee_met && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20" />
      )}
      
      {/* Header */}
      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              {guarantee_met ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <Target className="w-5 h-5 text-blue-600" />
              )}
              PAM Savings Guarantee
            </CardTitle>
            {guarantee_met && (
              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Goal Met!
              </Badge>
            )}
            {isCloseToGoal && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                <Zap className="w-3 h-3 mr-1" />
                Almost There!
              </Badge>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefetchingStatus}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetchingStatus ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <CardDescription className="text-sm">
          {guarantee_met 
            ? 'Congratulations! PAM has saved you more than your subscription cost this month.'
            : `PAM needs to save you ${formatCurrency(savings_shortfall)} more to meet your guarantee.`
          }
        </CardDescription>
      </CardHeader>

      {/* Main Content */}
      <CardContent className="relative space-y-4">
        {/* Progress Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Progress to Guarantee</span>
            <span className={`font-semibold ${progressColor}`}>
              {Math.round(percentage_achieved)}%
            </span>
          </div>
          
          <Progress 
            value={Math.min(percentage_achieved, 100)} 
            className="h-3"
            indicatorClassName={
              guarantee_met 
                ? 'bg-green-500' 
                : percentage_achieved >= 75 
                  ? 'bg-yellow-500' 
                  : 'bg-blue-500'
            }
          />
          
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>$0</span>
            <span className="font-medium">{formatCurrency(subscription_cost)} Goal</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <DollarSign className="w-3 h-3" />
              <span>Total Saved</span>
            </div>
            <div className={`text-lg font-semibold ${total_savings > 0 ? 'text-green-600' : 'text-gray-500'}`}>
              {formatCurrency(total_savings)}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>Savings Events</span>
            </div>
            <div className="text-lg font-semibold text-blue-600">
              {savings_events_count}
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          {guarantee_met ? (
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium">
                You've saved {formatCurrency(total_savings - subscription_cost)} extra this month!
              </span>
            </div>
          ) : savings_shortfall <= 5 ? (
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 text-sm">
              <Zap className="w-4 h-4" />
              <span className="font-medium">
                So close! Just {formatCurrency(savings_shortfall)} more to reach your guarantee.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
              <Target className="w-4 h-4" />
              <span className="font-medium">
                Keep using PAM for recommendations to reach your {formatCurrency(subscription_cost)} guarantee!
              </span>
            </div>
          )}
        </div>

        {/* Recent Events Section */}
        {showRecentEvents && !isLoadingEvents && !eventsError && recentEvents && recentEvents.length > 0 && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Recent Savings
              </h4>
              {recentEvents.length >= 5 && (
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              {recentEvents.slice(0, 3).map((event) => (
                <RecentSavingsEventItem key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state for events */}
        {showRecentEvents && !isLoadingEvents && !eventsError && (!recentEvents || recentEvents.length === 0) && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="text-center py-2">
              <TrendingDown className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No savings events yet. Start chatting with PAM to track your savings!
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Recent Savings Event Item Component
const RecentSavingsEventItem: React.FC<{ event: PamSavingsEvent }> = ({ event }) => {
  const typeIcon = getSavingsTypeIcon(event.savings_type);
  const typeDisplay = getSavingsTypeDisplayName(event.savings_type);
  const savedDate = new Date(event.saved_date);
  const isRecent = Date.now() - savedDate.getTime() < 24 * 60 * 60 * 1000; // Within 24 hours

  return (
    <div className="flex items-center justify-between py-1 px-2 rounded-md bg-gray-50 dark:bg-gray-900/50">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm" title={typeDisplay}>
          {typeIcon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
            {event.savings_description || typeDisplay}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {savedDate.toLocaleDateString()}
            {isRecent && (
              <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">
                New
              </Badge>
            )}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-green-600">
          {formatCurrency(event.actual_savings)}
        </p>
        {event.confidence_score && (
          <p className="text-xs text-gray-500">
            {Math.round(event.confidence_score * 100)}% sure
          </p>
        )}
      </div>
    </div>
  );
};

// Loading skeleton component
const PamSavingsSummaryCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-8" />
        </div>
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-3 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-8" />
          </div>
        </div>
        <Skeleton className="h-6 w-full" />
      </CardContent>
    </Card>
  );
};

export default PamSavingsSummaryCard;