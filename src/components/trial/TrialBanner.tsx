/**
 * Trial Banner - Shows trial status and progress to users
 * Displays days remaining, milestones, and conversion prompts
 */

import React from 'react';
import { useTrial } from '@/context/TrialContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, Star, Zap, CreditCard, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrialBannerProps {
  variant?: 'compact' | 'full' | 'modal';
  onClose?: () => void;
  onUpgrade?: () => void;
  className?: string;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({
  variant = 'compact',
  onClose,
  onUpgrade,
  className
}) => {
  const { trialInfo, logEvent, convertToPaid } = useTrial();

  if (!trialInfo) return null;

  const { daysLeft, dayNumber, completedMilestones, isActive, isExpired } = trialInfo;
  const totalMilestones = 5;
  const progressPercent = (completedMilestones / totalMilestones) * 100;

  const handleUpgradeClick = async () => {
    await logEvent('cta_click', { 
      day: dayNumber, 
      cta: 'upgrade_banner',
      variant
    });
    
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Default upgrade flow
      window.location.href = '/upgrade';
    }
  };

  const handleCloseClick = async () => {
    await logEvent('cta_click', { 
      day: dayNumber, 
      cta: 'close_banner',
      variant
    });
    onClose?.();
  };

  if (variant === 'compact') {
    return (
      <Card className={cn(
        "border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50",
        isExpired && "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50",
        className
      )}>
        <CardContent className="flex items-center justify-between p-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {isActive ? (
                <Clock className="h-4 w-4 text-blue-600" />
              ) : (
                <CreditCard className="h-4 w-4 text-amber-600" />
              )}
              <span className="text-sm font-medium">
                {isActive ? (
                  <>Trial: <strong>{daysLeft} days left</strong></>
                ) : (
                  <span className="text-amber-700">Trial expired - Keep your data</span>
                )}
              </span>
            </div>
            
            {isActive && (
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-gray-600">
                  {completedMilestones}/{totalMilestones} milestones
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              onClick={handleUpgradeClick}
              className={cn(
                "text-xs",
                isActive ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-600 hover:bg-amber-700"
              )}
            >
              {isExpired ? "Keep Data" : "Upgrade"}
            </Button>
            
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseClick}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'full') {
    return (
      <Card className={cn(
        "border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50",
        isExpired && "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50",
        className
      )}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Zap className={cn(
                  "h-5 w-5",
                  isActive ? "text-blue-600" : "text-amber-600"
                )} />
                <span>
                  {isActive ? "Free Trial Active" : "Trial Ended"}
                </span>
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {isActive ? (
                  <>Day {dayNumber} of 28 • {daysLeft} days remaining</>
                ) : (
                  <>Your data is safe and ready when you upgrade</>
                )}
              </p>
            </div>
            
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseClick}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isActive && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-gray-600">
                  {completedMilestones}/{totalMilestones} milestones
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {isActive ? (
                "Complete milestones to build habits and maximize value"
              ) : (
                "All your routes, expenses, and preferences are preserved"
              )}
            </div>
            
            <Button
              onClick={handleUpgradeClick}
              className={cn(
                isActive ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-600 hover:bg-amber-700"
              )}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {isExpired ? "Keep Your Data" : "Upgrade Now"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Modal variant would be handled by a separate modal component
  return null;
};