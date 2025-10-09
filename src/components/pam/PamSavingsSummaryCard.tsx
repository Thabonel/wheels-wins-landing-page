import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Sparkles, DollarSign, TrendingUp, Shield, Share2, Copy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { pamSavingsApi } from '@/services/pamSavingsService';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export const PamSavingsSummaryCard = () => {
  const [celebrationShown, setCelebrationShown] = useState(false);

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

  // Confetti celebration when guarantee met
  useEffect(() => {
    if (!guaranteeStatus || celebrationShown) return;

    const { guarantee_met, total_savings, billing_period_start } = guaranteeStatus;

    // Check if we've already celebrated for this billing period
    const celebrationKey = `pam-celebration-${billing_period_start}`;
    const alreadyCelebrated = localStorage.getItem(celebrationKey);

    if (guarantee_met && total_savings >= 10 && !alreadyCelebrated) {
      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10b981', '#3b82f6', '#8b5cf6']
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10b981', '#3b82f6', '#8b5cf6']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();

      // Show toast notification
      toast.success(`🎉 PAM saved you ${formatCurrency(total_savings)} this month!`, {
        description: "Your AI assistant is paying for herself!",
        duration: 5000,
      });

      // Mark celebration as shown for this billing period
      localStorage.setItem(celebrationKey, 'true');
      setCelebrationShown(true);
    }
  }, [guaranteeStatus, celebrationShown]);

  // Share functionality
  const handleShare = async () => {
    if (!displayData) return;

    const shareText = `I saved ${formatCurrency(displayData.total_savings)} with PAM this month! 🎉 My AI assistant is helping me manage my RV finances automatically.`;
    const shareUrl = 'https://wheelsandwins.com';

    try {
      // Try Web Share API first (works on mobile)
      if (navigator.share) {
        await navigator.share({
          title: 'PAM Savings',
          text: shareText,
          url: shareUrl,
        });
        toast.success('Shared successfully!');
      } else {
        // Fallback to clipboard copy
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        toast.success('Copied to clipboard!', {
          description: 'Share your PAM savings with your friends',
        });
      }
    } catch (error) {
      // User cancelled share or clipboard failed
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Failed to share', {
          description: 'Please try again',
        });
      }
    }
  };

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
        <div className="flex items-center space-x-3">
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
          {displayData.total_savings >= 10 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-8 w-8"
              title="Share your savings"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};