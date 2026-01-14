import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useSubscription } from '@/hooks/useSubscription';
import { useRegion } from '@/context/RegionContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SubscriptionSettings() {
  const { subscription, loading, daysRemaining, fetchSubscription } = useSubscription();
  const { regionConfig } = useRegion();
  const [cancelling, setCancelling] = useState(false);

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription');

      if (error) {
        throw error;
      }

      toast.success('Subscription cancelled successfully');

      // Refresh subscription data
      await fetchSubscription();
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      toast.error(error.message || 'Failed to cancel subscription. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading subscription details...</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (!subscription) return null;

    switch (subscription.subscription_status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'trial':
        return <Badge className="bg-blue-500">Free Trial</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{subscription.subscription_status}</Badge>;
    }
  };

  const getPlanName = () => {
    if (!subscription) return 'No subscription';

    switch (subscription.plan_type) {
      case 'free_trial':
        return 'Free Trial';
      case 'monthly':
        return `Monthly (${regionConfig.currencySymbol}9.99/month)`;
      case 'annual':
        return `Annual (${regionConfig.currencySymbol}99/year)`;
      default:
        return subscription.plan_type;
    }
  };

  const canCancel = subscription &&
    subscription.subscription_status !== 'cancelled' &&
    subscription.subscription_status !== 'expired';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Manage your subscription and billing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="font-medium">Current Plan</p>
            <p className="text-sm text-muted-foreground">{getPlanName()}</p>
          </div>
          {getStatusBadge()}
        </div>

        {/* Trial Info */}
        {subscription?.plan_type === 'free_trial' && daysRemaining !== null && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              {daysRemaining > 0
                ? `${daysRemaining} days remaining in your free trial`
                : 'Your free trial has ended'}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {daysRemaining > 0
                ? 'Upgrade anytime to keep all your data and features.'
                : 'Upgrade now to continue using all features.'}
            </p>
          </div>
        )}

        {/* Subscription End Date */}
        {subscription?.subscription_ends_at && subscription.subscription_status === 'cancelled' && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="font-medium text-amber-900 dark:text-amber-100">
              Access until {new Date(subscription.subscription_ends_at).toLocaleDateString()}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Your subscription has been cancelled but you have access until this date.
            </p>
          </div>
        )}

        {/* Video Course Access */}
        {subscription?.video_course_access && (
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Video Course Access</p>
              <p className="text-sm text-muted-foreground">Included with your annual plan</p>
            </div>
            <Badge className="bg-green-500">Included</Badge>
          </div>
        )}

        {/* Cancel Button */}
        {canCancel && (
          <div className="pt-4 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  Cancel Subscription
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      {subscription?.plan_type === 'free_trial'
                        ? "Are you sure you want to cancel your free trial? You'll lose access to all features immediately."
                        : "Your subscription will be cancelled at the end of your current billing period. You'll continue to have access until then."}
                    </p>
                    <p>You can resubscribe at any time.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground mt-2">
              One-click cancellation. No emails, no waiting periods.
            </p>
          </div>
        )}

        {/* Resubscribe Option for Cancelled Users */}
        {subscription?.subscription_status === 'cancelled' && (
          <div className="pt-4 border-t">
            <Button onClick={() => window.location.href = '/#pricing'}>
              Resubscribe
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
