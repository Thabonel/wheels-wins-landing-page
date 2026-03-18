/**
 * Trip Viewer Stats Strip
 * PRD Requirement: "Grey Nomads evaluate trips on concrete data, not prose descriptions"
 */

import { UserTrip } from '@/types/userTrips';
import { Route, Clock, DollarSign, Fuel, MapPin } from 'lucide-react';

interface TripViewerStatsProps {
  trip: UserTrip;
}

export function TripViewerStats({ trip }: TripViewerStatsProps) {
  const stats = [];

  // Distance
  if (trip.metadata?.distance_miles) {
    stats.push({
      icon: Route,
      label: 'Distance',
      value: `${Math.round(trip.metadata.distance_miles)} mi`,
      subtext: trip.metadata.route_data?.distance ?
        `${Math.round((trip.metadata.route_data.distance || 0) / 1000)} km` :
        undefined
    });
  }

  // Duration
  if (trip.metadata?.duration_hours) {
    const hours = Math.floor(trip.metadata.duration_hours);
    const minutes = Math.round((trip.metadata.duration_hours - hours) * 60);
    stats.push({
      icon: Clock,
      label: 'Duration',
      value: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
      subtext: `${Math.round(trip.metadata.duration_hours * 60)} mins total`
    });
  }

  // Fuel Cost
  if (trip.metadata?.fuel_gallons && trip.metadata?.estimated_cost) {
    stats.push({
      icon: Fuel,
      label: 'Fuel',
      value: `${Math.round(trip.metadata.fuel_gallons)} gal`,
      subtext: `~$${Math.round(trip.metadata.estimated_cost)} est.`
    });
  }

  // Budget
  if (trip.total_budget) {
    stats.push({
      icon: DollarSign,
      label: 'Budget',
      value: `$${trip.total_budget.toLocaleString()}`,
      subtext: (trip as any).spent_budget !== null && (trip as any).spent_budget !== undefined ?
        `$${(trip as any).spent_budget.toLocaleString()} spent` :
        'Planned'
    });
  }

  // Waypoints/Stops
  if (trip.metadata?.route_data?.waypoints) {
    const stopCount = Math.max(0, trip.metadata.route_data.waypoints.length - 2); // Exclude origin/destination
    stats.push({
      icon: MapPin,
      label: 'Stops',
      value: `${stopCount}`,
      subtext: stopCount === 1 ? 'stop' : 'stops'
    });
  }

  if (stats.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        <p className="text-sm">No trip statistics available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div key={index} className="text-center">
            <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 bg-blue-100 rounded-full">
              <IconComponent className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {stat.value}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {stat.label}
            </div>
            {stat.subtext && (
              <div className="text-xs text-gray-400">
                {stat.subtext}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact version for smaller spaces
 */
export function TripViewerStatsCompact({ trip }: TripViewerStatsProps) {
  const stats = [];

  if (trip.metadata?.distance_miles) {
    stats.push(`${Math.round(trip.metadata.distance_miles)} mi`);
  }

  if (trip.metadata?.duration_hours) {
    const hours = Math.floor(trip.metadata.duration_hours);
    const minutes = Math.round((trip.metadata.duration_hours - hours) * 60);
    stats.push(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
  }

  if (trip.total_budget) {
    stats.push(`$${trip.total_budget.toLocaleString()}`);
  }

  if (stats.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 text-xs text-gray-600">
      {stats.map((stat, index) => (
        <span key={index} className="flex items-center gap-1">
          {stat}
          {index < stats.length - 1 && <span className="text-gray-300">•</span>}
        </span>
      ))}
    </div>
  );
}