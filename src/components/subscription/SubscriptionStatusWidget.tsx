
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Play, Clock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

export default function SubscriptionStatusWidget() {
  const { 
    subscription, 
    loading, 
    daysRemaining, 
    isTrialUser, 
    isMonthlyUser, 
    isAnnualUser, 
    hasVideoAccess 
  } = useSubscription();

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) return null;

  const getStatusBadge = () => {
    if (isAnnualUser) {
      return <Badge variant="default" className="bg-purple-600"><Crown className="w-3 h-3 mr-1" />Annual Member</Badge>;
    }
    if (isMonthlyUser) {
      return <Badge variant="secondary">Monthly Member</Badge>;
    }
    return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Free Trial</Badge>;
  };

  const getStatusText = () => {
    if (isTrialUser && daysRemaining !== null) {
      return `${daysRemaining} days left`;
    }
    if (isAnnualUser && hasVideoAccess) {
      return 'Video Course Access ✓';
    }
    return 'Active';
  };

  const handleUpgrade = () => {
    window.location.href = '/#pricing';
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            {getStatusBadge()}
            <p className="text-sm text-muted-foreground mt-1">
              {getStatusText()}
            </p>
            {isAnnualUser && hasVideoAccess && (
              <div className="flex items-center gap-1 mt-2">
                <Play className="w-3 h-3 text-purple-600" />
                <span className="text-xs text-purple-600 font-medium">
                  Video Course Available
                </span>
              </div>
            )}
          </div>
          {isTrialUser && (
            <Button size="sm" onClick={handleUpgrade}>
              Upgrade
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
