
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

export default function TrialStatusBanner() {
  const { isTrialEndingSoon, daysRemaining, isTrialExpired } = useSubscription();

  if (!isTrialEndingSoon && !isTrialExpired) return null;

  const getAlertVariant = () => {
    if (isTrialExpired) return 'destructive';
    if (daysRemaining && daysRemaining <= 2) return 'destructive';
    return 'default';
  };

  const getAlertColor = () => {
    if (isTrialExpired) return 'bg-red-50 border-red-200';
    if (daysRemaining && daysRemaining <= 2) return 'bg-orange-50 border-orange-200';
    return 'bg-blue-50 border-blue-200';
  };

  const getMessage = () => {
    if (isTrialExpired) {
      return 'Your free trial has ended - Upgrade now to continue using PAM!';
    }
    return `Your free trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} - Upgrade now to keep full access!`;
  };

  const handleUpgrade = (plan: 'monthly' | 'annual') => {
    // This will be connected to Stripe checkout
    console.log(`Upgrading to ${plan} plan`);
    // Navigate to pricing or open checkout modal
    window.location.href = '/#pricing';
  };

  return (
    <Alert variant={getAlertVariant()} className={`mb-4 ${getAlertColor()}`}>
      <Clock className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span className="font-medium">{getMessage()}</span>
        <div className="flex gap-2 ml-4">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleUpgrade('monthly')}
            className="text-xs"
          >
            Monthly $18
          </Button>
          <Button 
            size="sm"
            onClick={() => handleUpgrade('annual')}
            className="text-xs"
          >
            Annual $216 <span className="ml-1 text-xs opacity-90">(Save 33%)</span>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
