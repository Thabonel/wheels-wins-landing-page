import React from 'react';
import { Navigation, Clock, Route, Fuel } from 'lucide-react';

interface RouteInfo {
  distance: number; // in meters
  duration: number; // in seconds
}

interface FreshStatusBarProps {
  route: RouteInfo | null;
  isNavigating: boolean;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  estimatedFuelCost?: number;
}

const FreshStatusBar: React.FC<FreshStatusBarProps> = ({
  route,
  isNavigating,
  onStartNavigation,
  onStopNavigation,
  estimatedFuelCost
}) => {
  if (!route) return null;

  const formatDistance = (meters: number) => {
    const km = meters / 1000;
    return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 max-w-4xl mx-auto">
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Route Information */}
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                <Route className="w-4 h-4" />
                <span>Route Information</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Route className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Distance</p>
                    <p className="text-sm font-semibold">{formatDistance(route.distance)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Duration</p>
                    <p className="text-sm font-semibold">{formatDuration(route.duration)}</p>
                  </div>
                </div>
                {estimatedFuelCost !== undefined && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Fuel className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Est. Fuel</p>
                      <p className="text-sm font-semibold">${estimatedFuelCost.toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Button */}
            <div className="flex-shrink-0">
              <button
                onClick={isNavigating ? onStopNavigation : onStartNavigation}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all transform hover:scale-105 ${
                  isNavigating
                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                }`}
              >
                <Navigation className="w-4 h-4" />
                {isNavigating ? 'Stop Navigation' : 'Start Navigation'}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Progress Bar (shown when navigating) */}
        {isNavigating && (
          <div className="h-1 bg-gray-200">
            <div className="h-full bg-blue-600 animate-pulse" style={{ width: '30%' }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default FreshStatusBar;