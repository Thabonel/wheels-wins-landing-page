/**
 * Upgrade Prompt - Contextual upgrade suggestions based on trial usage
 * Shows different prompts based on milestones, limits, and trial progress
 */

import React from 'react';
import { useTrial } from '@/context/TrialContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Crown, 
  Infinity, 
  Shield, 
  Users, 
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpgradePromptProps {
  context?: 'limits' | 'milestones' | 'expiry' | 'generic';
  onUpgrade?: () => void;
  className?: string;
  compact?: boolean;
}

const upgradeFeatures = [
  {
    icon: <Infinity className="h-4 w-4" />,
    title: 'Unlimited Everything',
    description: 'No limits on routes, storage, or devices'
  },
  {
    icon: <Shield className="h-4 w-4" />,
    title: 'Advanced Security',
    description: 'Encrypted backups and data protection'
  },
  {
    icon: <Users className="h-4 w-4" />,
    title: 'Family Sharing',
    description: 'Share routes and plans with family'
  },
  {
    icon: <Star className="h-4 w-4" />,
    title: 'Premium Support',
    description: 'Priority help and exclusive features'
  }
];

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  context = 'generic',
  onUpgrade,
  className,
  compact = false
}) => {
  const { trialInfo, logEvent } = useTrial();

  if (!trialInfo) return null;

  const { dayNumber, daysLeft, completedMilestones, isActive, isExpired } = trialInfo;

  const handleUpgradeClick = async () => {
    await logEvent('cta_click', { 
      context,
      day: dayNumber,
      source: 'upgrade_prompt'
    });
    
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.location.href = '/upgrade';
    }
  };

  const getContextualMessage = () => {
    switch (context) {
      case 'limits':
        return {
          title: "You're hitting your limits",
          message: "Unlock unlimited usage and keep building",
          badge: "Near Limit",
          urgency: "high"
        };
      
      case 'milestones':
        const progress = (completedMilestones / 5) * 100;
        return {
          title: `${progress}% of habits built!`,
          message: "Keep the momentum going with unlimited features",
          badge: `${completedMilestones}/5 Complete`,
          urgency: "medium"
        };
      
      case 'expiry':
        return {
          title: isExpired ? "Trial ended - Keep your data" : `${daysLeft} days left`,
          message: isExpired 
            ? "Your progress is safe. Upgrade to continue where you left off"
            : "Don't lose your progress and data",
          badge: isExpired ? "Expired" : `${daysLeft} days`,
          urgency: "critical"
        };
      
      default:
        return {
          title: "Ready for unlimited?",
          message: "Unlock all features and remove restrictions",
          badge: "Upgrade",
          urgency: "low"
        };
    }
  };

  const contextMessage = getContextualMessage();

  if (compact) {
    return (
      <Card className={cn(
        "border-2",
        contextMessage.urgency === 'critical' && "border-red-200 bg-red-50",
        contextMessage.urgency === 'high' && "border-amber-200 bg-amber-50",
        contextMessage.urgency === 'medium' && "border-blue-200 bg-blue-50",
        contextMessage.urgency === 'low' && "border-gray-200 bg-gray-50",
        className
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className={cn(
                "h-5 w-5",
                contextMessage.urgency === 'critical' && "text-red-600",
                contextMessage.urgency === 'high' && "text-amber-600",
                contextMessage.urgency === 'medium' && "text-blue-600",
                contextMessage.urgency === 'low' && "text-gray-600"
              )} />
              <div>
                <h3 className="font-medium text-sm">{contextMessage.title}</h3>
                <p className="text-xs text-gray-600">{contextMessage.message}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {contextMessage.badge}
              </Badge>
              <Button
                size="sm"
                onClick={handleUpgradeClick}
                className={cn(
                  contextMessage.urgency === 'critical' && "bg-red-600 hover:bg-red-700",
                  contextMessage.urgency === 'high' && "bg-amber-600 hover:bg-amber-700",
                  contextMessage.urgency === 'medium' && "bg-blue-600 hover:bg-blue-700",
                  contextMessage.urgency === 'low' && "bg-gray-600 hover:bg-gray-700"
                )}
              >
                Upgrade
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-2 overflow-hidden",
      contextMessage.urgency === 'critical' && "border-red-200",
      contextMessage.urgency === 'high' && "border-amber-200",
      contextMessage.urgency === 'medium' && "border-blue-200",
      contextMessage.urgency === 'low' && "border-gray-200",
      className
    )}>
      <div className={cn(
        "h-1",
        contextMessage.urgency === 'critical' && "bg-gradient-to-r from-red-500 to-red-600",
        contextMessage.urgency === 'high' && "bg-gradient-to-r from-amber-500 to-amber-600",
        contextMessage.urgency === 'medium' && "bg-gradient-to-r from-blue-500 to-blue-600",
        contextMessage.urgency === 'low' && "bg-gradient-to-r from-gray-500 to-gray-600"
      )} />
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "p-2 rounded-full",
              contextMessage.urgency === 'critical' && "bg-red-100",
              contextMessage.urgency === 'high' && "bg-amber-100",
              contextMessage.urgency === 'medium' && "bg-blue-100",
              contextMessage.urgency === 'low' && "bg-gray-100"
            )}>
              <Crown className={cn(
                "h-6 w-6",
                contextMessage.urgency === 'critical' && "text-red-600",
                contextMessage.urgency === 'high' && "text-amber-600",
                contextMessage.urgency === 'medium' && "text-blue-600",
                contextMessage.urgency === 'low' && "text-gray-600"
              )} />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold">{contextMessage.title}</h3>
              <p className="text-gray-600 text-sm mt-1">{contextMessage.message}</p>
            </div>
          </div>
          
          <Badge 
            variant="outline" 
            className={cn(
              contextMessage.urgency === 'critical' && "border-red-300 text-red-700",
              contextMessage.urgency === 'high' && "border-amber-300 text-amber-700",
              contextMessage.urgency === 'medium' && "border-blue-300 text-blue-700"
            )}
          >
            {contextMessage.badge}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {upgradeFeatures.map((feature, index) => (
            <div key={index} className="flex items-start space-x-2 p-2">
              <div className="mt-0.5">
                {feature.icon}
              </div>
              <div>
                <h4 className="text-sm font-medium">{feature.title}</h4>
                <p className="text-xs text-gray-600">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            <span className="font-medium">$9.99/month</span> • Cancel anytime
          </div>
          
          <Button
            onClick={handleUpgradeClick}
            className={cn(
              "flex items-center space-x-2",
              contextMessage.urgency === 'critical' && "bg-red-600 hover:bg-red-700",
              contextMessage.urgency === 'high' && "bg-amber-600 hover:bg-amber-700",
              contextMessage.urgency === 'medium' && "bg-blue-600 hover:bg-blue-700",
              contextMessage.urgency === 'low' && "bg-gray-600 hover:bg-gray-700"
            )}
          >
            <Zap className="h-4 w-4" />
            <span>Upgrade Now</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};