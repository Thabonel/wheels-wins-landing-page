
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, Clock, Mic, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

interface OverviewData {
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
}

interface OverviewCardsProps {
  data?: OverviewData;
  isLoading: boolean;
}

const OverviewCards: React.FC<OverviewCardsProps> = ({ data, isLoading }) => {
  const isMobile = useIsMobile();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTime = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-500" />;
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getErrorRateColor = (rate: number) => {
    if (rate < 2) return 'text-green-600';
    if (rate < 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="min-h-[100px] md:min-h-[120px]">
            <CardHeader className="pb-2">
              <Skeleton className="h-3 md:h-4 w-16 md:w-24" />
            </CardHeader>
            <CardContent className="pt-0">
              <Skeleton className="h-6 md:h-8 w-12 md:w-16 mb-2" />
              <Skeleton className="h-2 md:h-3 w-14 md:w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
      {/* Total Requests */}
      <Card className="min-h-[100px] md:min-h-[120px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Total Requests</CardTitle>
          <Activity className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg md:text-2xl font-bold">{formatNumber(data.total_requests_24h)}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {getTrendIcon(data.trends.requests_trend)}
            <span className="ml-1">
              {Math.abs(data.trends.requests_trend)}% {isMobile ? '' : 'from yesterday'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Error Rate */}
      <Card className="min-h-[100px] md:min-h-[120px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Error Rate</CardTitle>
          <Badge variant="outline" className={`text-xs ${getErrorRateColor(data.error_rate_24h)}`}>
            {data.error_rate_24h < 2 ? 'Good' : data.error_rate_24h < 5 ? 'Warn' : 'Crit'}
          </Badge>
        </CardHeader>
        <CardContent className="pt-0">
          <div className={`text-lg md:text-2xl font-bold ${getErrorRateColor(data.error_rate_24h)}`}>
            {data.error_rate_24h.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">{isMobile ? '24h' : 'Last 24 hours'}</p>
        </CardContent>
      </Card>

      {/* Unique Users */}
      <Card className="min-h-[100px] md:min-h-[120px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Users</CardTitle>
          <Users className="h-3 w-3 md:h-5 md:w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg md:text-2xl font-bold">{formatNumber(data.unique_users_24h)}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {getTrendIcon(data.trends.users_trend)}
            <span className="ml-1">
              {Math.abs(data.trends.users_trend)}% {isMobile ? '' : 'from yesterday'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Average Response Time */}
      <Card className="min-h-[100px] md:min-h-[120px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Avg Response</CardTitle>
          <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg md:text-2xl font-bold">{formatTime(data.avg_response_time)}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {getTrendIcon(-data.trends.response_time_trend)}
            <span className="ml-1">
              {Math.abs(data.trends.response_time_trend)}% {isMobile ? '' : 'from yesterday'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Voice Usage Rate */}
      <Card className="min-h-[100px] md:min-h-[120px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Voice Usage</CardTitle>
          <Mic className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg md:text-2xl font-bold">{data.voice_usage_rate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-1">{isMobile ? 'Voice requests' : 'Voice-enabled requests'}</p>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="min-h-[100px] md:min-h-[120px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">System Status</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Badge className={getStatusColor(data.system_status)}>
            {data.system_status.charAt(0).toUpperCase() + data.system_status.slice(1)}
          </Badge>
          <p className="text-xs text-muted-foreground mt-2">{isMobile ? 'All systems OK' : 'All systems operational'}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewCards;
