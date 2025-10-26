import React from 'react';
import { Flag, CheckCircle2, Circle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { TransitionTimeline as TimelineEvent, MilestoneType } from '@/types/transition.types';

interface TransitionTimelineProps {
  milestones: TimelineEvent[];
  onCompleteMilestone: (milestoneId: string) => void;
  onAddMilestone: () => void;
}

/**
 * Transition Timeline Component
 *
 * Visual timeline of major milestones in the transition journey
 */
export function TransitionTimeline({
  milestones,
  onCompleteMilestone,
  onAddMilestone,
}: TransitionTimelineProps) {
  // Sort milestones by date
  const sortedMilestones = [...milestones].sort((a, b) => {
    return new Date(a.milestone_date).getTime() - new Date(b.milestone_date).getTime();
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate days until milestone
  const daysUntil = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Milestone type icons
  const milestoneIcons: Record<MilestoneType, string> = {
    planning_start: '🎯',
    three_months: '📅',
    one_month: '⏰',
    one_week: '⚡',
    departure: '🚀',
    first_night: '🌙',
    one_month_road: '🎉',
    custom: '📌',
  };

  // Determine milestone status
  const getMilestoneStatus = (milestone: TimelineEvent, index: number) => {
    if (milestone.is_completed) {
      return {
        icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
        color: 'bg-green-600',
        textColor: 'text-green-600',
        bgColor: 'bg-green-50',
      };
    }

    const days = daysUntil(milestone.milestone_date);
    const isPast = days < 0;
    const isToday = days === 0;

    if (isPast || isToday) {
      return {
        icon: <Circle className="h-5 w-5 text-orange-600" />,
        color: 'bg-orange-600',
        textColor: 'text-orange-600',
        bgColor: 'bg-orange-50',
      };
    }

    return {
      icon: <Circle className="h-5 w-5 text-gray-400" />,
      color: 'bg-gray-400',
      textColor: 'text-gray-600',
      bgColor: 'bg-gray-50',
    };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Milestone Timeline
          </CardTitle>
          <Button onClick={onAddMilestone} size="sm" variant="outline">
            Add Milestone
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedMilestones.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">No milestones yet</p>
            <Button onClick={onAddMilestone} size="sm" variant="outline">
              Add Your First Milestone
            </Button>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Milestones */}
            <div className="space-y-6">
              {sortedMilestones.map((milestone, index) => {
                const status = getMilestoneStatus(milestone, index);
                const days = daysUntil(milestone.milestone_date);
                const isPast = days < 0;
                const isToday = days === 0;

                return (
                  <div key={milestone.id} className="relative flex items-start gap-4">
                    {/* Timeline Dot */}
                    <div className={`relative z-10 flex-shrink-0 mt-1 rounded-full ${status.color} p-1`}>
                      {status.icon}
                    </div>

                    {/* Milestone Content */}
                    <div className={`flex-1 rounded-lg border ${status.bgColor} p-4`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {/* Icon and Name */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">
                              {milestoneIcons[milestone.milestone_type]}
                            </span>
                            <h3 className={`font-semibold ${status.textColor}`}>
                              {milestone.milestone_name}
                            </h3>
                            {!milestone.is_system_milestone && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                                Custom
                              </span>
                            )}
                          </div>

                          {/* Date */}
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(milestone.milestone_date)}</span>
                            {isToday && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                                TODAY
                              </span>
                            )}
                            {!milestone.is_completed && !isPast && !isToday && (
                              <span className="text-xs text-gray-500">
                                ({days} days {days < 0 ? 'ago' : 'from now'})
                              </span>
                            )}
                          </div>

                          {/* Celebration Message */}
                          {milestone.celebration_message && (
                            <p className="text-sm text-gray-700 mb-2">
                              {milestone.celebration_message}
                            </p>
                          )}

                          {/* Tasks Associated */}
                          {milestone.tasks_associated_count > 0 && (
                            <p className="text-xs text-gray-500">
                              {milestone.tasks_associated_count} {milestone.tasks_associated_count === 1 ? 'task' : 'tasks'} associated
                            </p>
                          )}
                        </div>

                        {/* Complete Button */}
                        {!milestone.is_completed && (isPast || isToday) && (
                          <Button
                            onClick={() => onCompleteMilestone(milestone.id)}
                            size="sm"
                            variant="outline"
                            className="flex-shrink-0"
                          >
                            Mark Complete
                          </Button>
                        )}
                      </div>

                      {/* Completion Info */}
                      {milestone.is_completed && milestone.completed_at && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="text-sm text-green-700 font-medium">
                            ✓ Completed on {formatDate(milestone.completed_at)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
