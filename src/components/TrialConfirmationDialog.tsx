/**
 * Trial Confirmation Dialog - Shows how the free trial works
 * No payment required - just start the trial directly
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Zap, 
  Calendar,
  Shield,
  Rocket,
  Info
} from 'lucide-react';
import { trialService } from '@/services/trialService';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/use-toast';

interface TrialConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TrialConfirmationDialog: React.FC<TrialConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  const handleStartFreeTrial = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to start a free trial",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsStartingTrial(true);
      
      // Create the free trial directly - no payment needed!
      const trial = await trialService.createTrial(user.id, 'wheels');
      
      if (trial) {
        toast({
          title: "🎉 Free Trial Started!",
          description: "Your 28-day adventure begins now. No credit card required!",
        });
        
        if (onSuccess) {
          onSuccess();
        } else {
          // Redirect to dashboard or refresh
          window.location.href = '/profile';
        }
        
        onClose();
      } else {
        throw new Error('Failed to create trial');
      }
    } catch (error) {
      console.error('Error starting trial:', error);
      toast({
        title: "Could not start trial",
        description: "Please try again or contact support if the issue persists",
        variant: "destructive"
      });
    } finally {
      setIsStartingTrial(false);
    }
  };

  const features = [
    { icon: <Calendar className="h-4 w-4" />, text: "28 days free access" },
    { icon: <Shield className="h-4 w-4" />, text: "No credit card required" },
    { icon: <Zap className="h-4 w-4" />, text: "All features included" },
    { icon: <CheckCircle className="h-4 w-4" />, text: "Cancel anytime" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Rocket className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Start Your Free 28-Day Trial
          </DialogTitle>
          <DialogDescription className="text-center">
            Experience all features with no commitment. Build better travel habits!
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center">
              <Info className="h-4 w-4 mr-2 text-blue-600" />
              How It Works
            </h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="font-semibold mr-2">1.</span>
                <span>Click "Start Free Trial" below - no payment needed</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">2.</span>
                <span>Complete 5 milestones to build lasting habits</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">3.</span>
                <span>Get gentle reminders on days 3, 12, 21, and 26</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">4.</span>
                <span>Upgrade anytime or let it expire - your data is always safe</span>
              </li>
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="text-green-600">{feature.icon}</div>
                <span className="text-sm">{feature.text}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Badge variant="outline" className="text-blue-600 border-blue-300">
              For adventurers 55+ who value simplicity
            </Badge>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isStartingTrial}
            className="w-full sm:w-auto order-2 sm:order-1 text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            Learn More
          </Button>
          <Button
            onClick={handleStartFreeTrial}
            disabled={isStartingTrial}
            className="w-full sm:w-auto order-1 sm:order-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isStartingTrial ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Starting...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                Start Free Trial
              </>
            )}
          </Button>
        </DialogFooter>

        <div className="text-center text-xs text-gray-500 mt-2">
          No credit card • No hidden fees • No surprises
        </div>
      </DialogContent>
    </Dialog>
  );
};