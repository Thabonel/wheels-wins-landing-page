/**
 * Trial Modal - Shows important trial nudges and milestone prompts
 * Used for critical moments in the trial journey (Day 3, 28, etc.)
 */

import React, { useState } from 'react';
import { useTrial } from '@/context/TrialContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Trophy, 
  Clock, 
  CreditCard, 
  CheckCircle,
  ArrowRight,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
  onMilestoneAction?: (milestone: string) => void;
}

export const TrialModal: React.FC<TrialModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  onMilestoneAction
}) => {
  const { trialInfo, currentNudge, logEvent } = useTrial();
  const [isUpgrading, setIsUpgrading] = useState(false);

  if (!trialInfo || !currentNudge || currentNudge.type !== 'modal') {
    return null;
  }

  const { dayNumber, daysLeft, completedMilestones, isExpired } = trialInfo;

  const handleUpgradeClick = async () => {
    setIsUpgrading(true);
    
    await logEvent('cta_click', { 
      day: dayNumber, 
      cta: 'upgrade_modal',
      nudge_type: 'modal'
    });

    try {
      if (onUpgrade) {
        await onUpgrade();
      } else {
        window.location.href = '/upgrade';
      }
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleMilestoneClick = async () => {
    await logEvent('cta_click', { 
      day: dayNumber, 
      cta: 'milestone_modal',
      nudge_type: 'modal'
    });

    if (onMilestoneAction) {
      onMilestoneAction('import_expenses');
    }
    onClose();
  };

  const handleDismiss = async () => {
    await logEvent('cta_click', { 
      day: dayNumber, 
      cta: 'dismiss_modal',
      nudge_type: 'modal'
    });
    onClose();
  };

  // Day 3 momentum modal
  if (dayNumber === 3) {
    return (
      <Dialog open={isOpen} onOpenChange={handleDismiss}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                Day {dayNumber}
              </Badge>
            </div>
            <DialogTitle className="text-left">
              {currentNudge.title}
            </DialogTitle>
            <DialogDescription className="text-left">
              {currentNudge.message}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="font-medium text-sm">Quick Wins Available</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-gray-400" />
                    <span>Import expenses</span>
                  </span>
                  <span className="text-xs text-blue-600">2 min</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-gray-400" />
                    <span>Save your first route</span>
                  </span>
                  <span className="text-xs text-blue-600">3 min</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col space-y-2 sm:space-y-2 sm:flex-col">
            <Button
              onClick={handleMilestoneClick}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {currentNudge.cta}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="w-full text-sm"
            >
              Maybe later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Trial end modal (Day 28)
  if (dayNumber >= 28 || isExpired) {
    const progressPercent = (completedMilestones / 5) * 100;
    
    return (
      <Dialog open={isOpen} onOpenChange={handleDismiss}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <Badge variant="outline" className="text-amber-600 border-amber-200">
                Trial Ended
              </Badge>
            </div>
            <DialogTitle className="text-left">
              {currentNudge.title}
            </DialogTitle>
            <DialogDescription className="text-left">
              {currentNudge.message}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-3 flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>Your Progress</span>
              </h4>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Milestones completed</span>
                  <span className="font-medium">{completedMilestones}/5</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
              
              <div className="mt-3 text-xs text-gray-600">
                All your data, routes, and preferences are safely preserved
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-gray-50 rounded p-3">
                <div className="font-semibold text-lg">12</div>
                <div className="text-xs text-gray-600">Routes Saved</div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="font-semibold text-lg">$347</div>
                <div className="text-xs text-gray-600">Expenses Tracked</div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col space-y-2 sm:space-y-2 sm:flex-col">
            <Button
              onClick={handleUpgradeClick}
              disabled={isUpgrading}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {isUpgrading ? 'Processing...' : currentNudge.cta}
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="w-full text-sm"
            >
              Download my data first
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Default modal for other days
  return (
    <Dialog open={isOpen} onOpenChange={handleDismiss}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{currentNudge.title}</DialogTitle>
          <DialogDescription>
            {currentNudge.message}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={handleDismiss}>
            Not now
          </Button>
          <Button onClick={handleUpgradeClick} disabled={isUpgrading}>
            {isUpgrading ? 'Processing...' : currentNudge.cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};