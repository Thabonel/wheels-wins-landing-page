/**
 * PAM Route Confirmation Dialog
 *
 * Displays a confirmation dialog when PAM suggests a route.
 * Shows route summary and quick-action buttons similar to Tesla Grok.
 */

import React from 'react';
import { X, MapPin, Clock, Ruler, Check, Edit2, Trash2 } from 'lucide-react';
import { PAMTripAction, PAMWaypoint } from '@/types/pamTripAction';

interface PAMRouteConfirmDialogProps {
  action: PAMTripAction;
  onConfirm: () => void;
  onModify: () => void;
  onCancel: () => void;
  isApplying?: boolean;
}

/**
 * Format distance for display
 */
function formatDistance(meters?: number): string {
  if (!meters) return 'Unknown';
  const km = meters / 1000;
  if (km >= 100) {
    return `${Math.round(km)} km`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Format duration for display
 */
function formatDuration(seconds?: number): string {
  if (!seconds) return 'Unknown';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${minutes} min`;
}

/**
 * Get icon color based on waypoint type
 */
function getWaypointColor(type: PAMWaypoint['type']): string {
  switch (type) {
    case 'origin':
      return 'text-green-500';
    case 'destination':
      return 'text-red-500';
    default:
      return 'text-blue-500';
  }
}

/**
 * Get label for waypoint type
 */
function getWaypointLabel(type: PAMWaypoint['type'], index: number, total: number): string {
  switch (type) {
    case 'origin':
      return 'Start';
    case 'destination':
      return 'End';
    default:
      return `Stop ${index}`;
  }
}

const PAMRouteConfirmDialog: React.FC<PAMRouteConfirmDialogProps> = ({
  action,
  onConfirm,
  onModify,
  onCancel,
  isApplying = false,
}) => {
  const { waypoints, metadata, summary, type } = action;

  // Count waypoint types
  const stopCount = waypoints.filter(w => w.type === 'waypoint').length;

  // Get action type label
  const actionLabel = type === 'REPLACE_ROUTE' ? 'New Route' :
                      type === 'ADD_WAYPOINTS' ? 'Add Stops' :
                      type === 'ADD_STOP' ? 'Add Stop' :
                      type === 'OPTIMIZE' ? 'Optimized Route' : 'Route Update';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider opacity-80">
                PAM Trip Planning
              </span>
              <h2 className="text-xl font-bold">{actionLabel}</h2>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Summary */}
          {summary && (
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {summary}
            </p>
          )}

          {/* Route Stats */}
          {metadata && (metadata.totalDistance || metadata.totalDuration) && (
            <div className="flex gap-4 py-3 border-y border-gray-200 dark:border-gray-700">
              {metadata.totalDistance && (
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">
                    {formatDistance(metadata.totalDistance)}
                  </span>
                </div>
              )}
              {metadata.totalDuration && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">
                    {formatDuration(metadata.totalDuration)}
                  </span>
                </div>
              )}
              {metadata.estimatedFuelCost && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-600">
                    ~${metadata.estimatedFuelCost.toFixed(0)} fuel
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Waypoints List */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {waypoints.map((waypoint, index) => {
              let stopIndex = 0;
              if (waypoint.type === 'waypoint') {
                stopIndex = waypoints.slice(0, index).filter(w => w.type === 'waypoint').length + 1;
              }

              return (
                <div
                  key={`${waypoint.name}-${index}`}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className={`mt-0.5 ${getWaypointColor(waypoint.type)}`}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400 uppercase">
                        {getWaypointLabel(waypoint.type, stopIndex, stopCount)}
                      </span>
                      {waypoint.poiType && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                          {waypoint.poiType.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {waypoint.name}
                    </p>
                    {waypoint.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {waypoint.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            disabled={isApplying}
          >
            <Trash2 className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={onModify}
            className="flex-1 px-4 py-2.5 border border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 rounded-xl font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2"
            disabled={isApplying}
          >
            <Edit2 className="w-4 h-4" />
            Modify
          </button>
          <button
            onClick={onConfirm}
            disabled={isApplying}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isApplying ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Apply Route
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PAMRouteConfirmDialog;
