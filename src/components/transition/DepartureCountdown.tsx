import React from 'react';
import { MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TransitionPhase } from '@/types/transition.types';

interface DepartureCountdownProps {
  departureDate: string; // ISO date string
  currentPhase: TransitionPhase;
  daysUntilDeparture: number;
}

/**
 * Departure Countdown Component
 *
 * Shows a visual countdown to the user's departure date with phase indicator
 */
export function DepartureCountdown({
  departureDate,
  currentPhase,
  daysUntilDeparture,
}: DepartureCountdownProps) {
  // Format departure date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get phase-specific messaging
  const getPhaseMessage = (phase: TransitionPhase, days: number) => {
    if (days < 0) {
      return {
        title: 'You\'re on the road!',
        subtitle: 'Living your RV dream',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      };
    }

    switch (phase) {
      case 'launching':
        return {
          title: `${days} days until departure`,
          subtitle: 'Final preparations underway',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
        };
      case 'preparing':
        return {
          title: `${days} days until departure`,
          subtitle: 'Active preparation phase',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
        };
      case 'planning':
      default:
        return {
          title: `${days} days until departure`,
          subtitle: 'Planning your transition',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
        };
    }
  };

  const phaseInfo = getPhaseMessage(currentPhase, daysUntilDeparture);

  return (
    <Card className={phaseInfo.bgColor}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Departure Countdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-4">
          {/* Large countdown number */}
          <div className={`text-6xl font-bold ${phaseInfo.color}`}>
            {daysUntilDeparture < 0 ? '✓' : Math.abs(daysUntilDeparture)}
          </div>

          {/* Title and subtitle */}
          <div className="space-y-1">
            <p className={`text-xl font-semibold ${phaseInfo.color}`}>
              {phaseInfo.title}
            </p>
            <p className="text-sm text-gray-600">{phaseInfo.subtitle}</p>
          </div>

          {/* Departure date */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium">
                {daysUntilDeparture < 0 ? 'Departed on:' : 'Departing:'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {formatDate(departureDate)}
            </p>
          </div>

          {/* Phase indicator */}
          <div className="pt-3">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/50 border border-gray-200">
              <span className="text-xs font-medium text-gray-700">
                Phase: <span className="capitalize">{currentPhase.replace('_', ' ')}</span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
