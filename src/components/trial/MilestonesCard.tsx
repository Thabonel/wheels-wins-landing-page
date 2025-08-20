/**
 * Milestones Card - Tracks habit-building progress during trial
 * Shows completed and pending milestones with encouragement
 */

import React from 'react';
import { useTrial } from '@/context/TrialContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Circle, 
  Upload, 
  Route, 
  DollarSign, 
  Fuel, 
  Bell,
  Trophy,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MilestoneType } from '@/services/trialService';

interface MilestoneConfig {
  type: MilestoneType;
  title: string;
  description: string;
  icon: React.ReactNode;
  difficulty: 'easy' | 'medium' | 'advanced';
  estimatedTime: string;
  reward: string;
}

const milestoneConfigs: MilestoneConfig[] = [
  {
    type: 'import_expenses',
    title: 'Import Your First Expenses',
    description: 'Upload receipts or connect your bank to track spending',
    icon: <Upload className="h-4 w-4" />,
    difficulty: 'easy',
    estimatedTime: '2 min',
    reward: 'Spending insights unlocked'
  },
  {
    type: 'save_route',
    title: 'Save Your First Route',
    description: 'Plan and save a route to build your trip library',
    icon: <Route className="h-4 w-4" />,
    difficulty: 'easy',
    estimatedTime: '3 min',
    reward: 'Route templates enabled'
  },
  {
    type: 'set_budget',
    title: 'Set Monthly Budget',
    description: 'Define spending limits to track progress',
    icon: <DollarSign className="h-4 w-4" />,
    difficulty: 'medium',
    estimatedTime: '5 min',
    reward: 'Budget alerts & projections'
  },
  {
    type: 'link_fuel',
    title: 'Connect Fuel Data',
    description: 'Link fuel purchases for accurate trip costs',
    icon: <Fuel className="h-4 w-4" />,
    difficulty: 'medium',
    estimatedTime: '5 min',
    reward: 'Real-time fuel optimization'
  },
  {
    type: 'enable_reminders',
    title: 'Enable Smart Reminders',
    description: 'Get personalized tips and maintenance alerts',
    icon: <Bell className="h-4 w-4" />,
    difficulty: 'advanced',
    estimatedTime: '2 min',
    reward: 'Proactive vehicle care'
  }
];

interface MilestonesCardProps {
  onMilestoneAction?: (milestone: MilestoneType) => void;
  className?: string;
}

export const MilestonesCard: React.FC<MilestonesCardProps> = ({
  onMilestoneAction,
  className
}) => {
  const { trialInfo, completeMilestone, logEvent } = useTrial();

  if (!trialInfo?.isActive) return null;

  const { milestones, completedMilestones, dayNumber } = trialInfo;
  const totalMilestones = milestoneConfigs.length;
  const progressPercent = (completedMilestones / totalMilestones) * 100;

  const handleMilestoneClick = async (milestone: MilestoneConfig) => {
    await logEvent('cta_click', { 
      milestone: milestone.type, 
      day: dayNumber 
    });

    if (onMilestoneAction) {
      onMilestoneAction(milestone.type);
    }
  };

  const isCompleted = (type: MilestoneType) => {
    return milestones.some(m => m.milestone_type === type && m.completed_at);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={cn("border-blue-200", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span>Build Your Habits</span>
          <Badge variant="outline" className="ml-auto">
            {completedMilestones}/{totalMilestones}
          </Badge>
        </CardTitle>
        
        <div className="space-y-2">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-sm text-gray-600">
            Complete milestones to unlock features and build lasting habits
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {milestoneConfigs.map((milestone) => {
          const completed = isCompleted(milestone.type);
          
          return (
            <div
              key={milestone.type}
              className={cn(
                "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                completed 
                  ? "bg-green-50 border-green-200" 
                  : "bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200 cursor-pointer"
              )}
              onClick={completed ? undefined : () => handleMilestoneClick(milestone)}
            >
              <div className="flex-shrink-0 mt-0.5">
                {completed ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {milestone.icon}
                    <h4 className={cn(
                      "text-sm font-medium",
                      completed ? "text-green-800" : "text-gray-900"
                    )}>
                      {milestone.title}
                    </h4>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", getDifficultyColor(milestone.difficulty))}
                    >
                      {milestone.difficulty}
                    </Badge>
                    {!completed && (
                      <span className="text-xs text-gray-500">
                        {milestone.estimatedTime}
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="text-xs text-gray-600 mt-1">
                  {milestone.description}
                </p>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span className="text-xs text-gray-600">
                      {milestone.reward}
                    </span>
                  </div>
                  
                  {!completed && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-6 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMilestoneClick(milestone);
                      }}
                    >
                      Start
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {completedMilestones === totalMilestones && (
          <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <h3 className="font-semibold text-yellow-800">All Milestones Complete!</h3>
            <p className="text-sm text-yellow-700 mt-1">
              You've built great habits. Keep them going with a subscription!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};