/**
 * Trip Viewer Slide-Over Panel
 * PRD Phase 2: Primary viewing mode for trip inspection
 */

import { useState, useEffect } from 'react';
import { X, Edit3, Share2, ExternalLink, MapPin, Calendar, DollarSign, Clock, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { UserTrip } from '@/types/userTrips';
import { TripViewerMap } from './TripViewerMap';
import { TripViewerStats } from './TripViewerStats';
import { cn } from '@/lib/utils';

interface TripViewerProps {
  trip: UserTrip | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (trip: UserTrip) => void;
  onShare?: (trip: UserTrip) => void;
}

export function TripViewer({
  trip,
  isOpen,
  onClose,
  onEdit,
  onShare
}: TripViewerProps) {
  const [mapLoaded, setMapLoaded] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !trip) {
    return null;
  }

  const handleEditClick = () => {
    if (onEdit && trip) {
      onEdit(trip);
    }
  };

  const handleShareClick = () => {
    if (onShare && trip) {
      onShare(trip);
    }
  };

  const getTripStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'bg-green-100 text-green-800', label: 'Completed' };
      case 'active':
        return { color: 'bg-blue-100 text-blue-800', label: 'Active' };
      case 'planning':
        return { color: 'bg-yellow-100 text-yellow-800', label: 'Planning' };
      case 'cancelled':
        return { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: status };
    }
  };

  const statusInfo = getTripStatusInfo(trip.status);
  const isPAMTrip = trip.metadata?.created_by === 'pam_ai';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-50"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 px-4 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 truncate">
                  {trip.title}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={statusInfo.color}>
                    {statusInfo.label}
                  </Badge>
                  {isPAMTrip && (
                    <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                      PAM Enhanced
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Map */}
            <div className="relative h-64 bg-gray-100">
              <TripViewerMap
                trip={trip}
                onLoad={() => setMapLoaded(true)}
              />
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Route className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-pulse" />
                    <p className="text-sm text-gray-500">Loading map...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Trip Stats */}
            <div className="p-4 border-b border-gray-100">
              <TripViewerStats trip={trip} />
            </div>

            {/* Trip Details */}
            <div className="p-4 space-y-4">
              {trip.description && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-sm text-gray-600">{trip.description}</p>
                </div>
              )}

              {(trip.start_date || trip.end_date) && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Dates</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {trip.start_date && new Date(trip.start_date).toLocaleDateString()}
                      {trip.start_date && trip.end_date && ' - '}
                      {trip.end_date && new Date(trip.end_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              {trip.trip_type && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Trip Type</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span className="capitalize">{trip.trip_type.replace('_', ' ')}</span>
                  </div>
                </div>
              )}

              {(trip.total_budget || trip.spent_budget !== null) && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Budget</h3>
                  <div className="space-y-1">
                    {trip.total_budget && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        <span>Budget: ${trip.total_budget.toLocaleString()}</span>
                      </div>
                    )}
                    {trip.spent_budget !== null && trip.spent_budget !== undefined && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="ml-6">Spent: ${trip.spent_budget.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Waypoints */}
              {trip.metadata?.route_data?.waypoints && trip.metadata.route_data.waypoints.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Route</h3>
                  <div className="space-y-2">
                    {trip.metadata.route_data.waypoints.map((waypoint, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          index === 0 ? "bg-green-500" :
                          index === trip.metadata!.route_data!.waypoints!.length - 1 ? "bg-red-500" :
                          "bg-blue-500"
                        )} />
                        <span>{waypoint.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {trip.updated_at && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>Updated {new Date(trip.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <Button
                onClick={handleEditClick}
                className="flex-1"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Trip
              </Button>
              <Button
                variant="outline"
                onClick={handleShareClick}
                title="Share trip"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.open(`/wheels/trips/shared/${trip.id}`, '_blank');
                }}
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}