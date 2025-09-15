import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Car, Bike, PersonStanding } from 'lucide-react';
import { Waypoint } from '../types';

interface FreshTrackPanelProps {
  isOpen: boolean;
  onClose: () => void;
  waypoints: Waypoint[];
  onRemoveWaypoint: (id: string) => void;
  routeProfile: 'driving' | 'walking' | 'cycling';
  onSetRouteProfile: (profile: 'driving' | 'walking' | 'cycling') => void;
  onRVServiceToggle: (service: string, enabled: boolean) => void;
  rvServices: { [key: string]: boolean };
}

const FreshTrackPanel: React.FC<FreshTrackPanelProps> = ({
  isOpen,
  onClose,
  waypoints,
  onRemoveWaypoint,
  routeProfile,
  onSetRouteProfile,
  onRVServiceToggle,
  rvServices = {}
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState('calc(100vh - 5rem)');

  useEffect(() => {
    const updatePanelHeight = () => {
      if (panelRef.current) {
        const viewportHeight = window.innerHeight;
        const topOffset = 64; // top-16 = 4rem = 64px
        const bottomMargin = 16; // 1rem = 16px for breathing room
        const availableHeight = viewportHeight - topOffset - bottomMargin;
        setPanelHeight(`${availableHeight}px`);
      }
    };

    // Update on mount and resize
    updatePanelHeight();
    window.addEventListener('resize', updatePanelHeight);

    return () => {
      window.removeEventListener('resize', updatePanelHeight);
    };
  }, []);

  return (
    <div
      ref={panelRef}
      className={`absolute top-16 right-4 w-80 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg transition-transform duration-300 z-[10001] ${
        isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)]'
      }`}
      style={{ height: panelHeight }}
    >
      <div className="h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-lg">Track Management</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Waypoints section */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-3">Waypoints ({waypoints.length})</h4>
            {waypoints.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No waypoints added yet</p>
                <p className="text-xs mt-1">Click the "+" button then click on the map</p>
              </div>
            ) : (
              <div className="space-y-2">
                {waypoints.map((waypoint, index) => (
                  <div 
                    key={waypoint.id} 
                    className="group flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{waypoint.name}</p>
                      {waypoint.address && (
                        <p className="text-xs text-gray-600 truncate mt-0.5">{waypoint.address}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveWaypoint(waypoint.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                      aria-label="Remove waypoint"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Route profile selector */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-3">Route Profile</h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onSetRouteProfile('driving')}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg text-sm font-medium transition-all ${
                  routeProfile === 'driving'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Car className="w-5 h-5" />
                <span>Drive</span>
              </button>
              <button
                onClick={() => onSetRouteProfile('cycling')}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg text-sm font-medium transition-all ${
                  routeProfile === 'cycling'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Bike className="w-5 h-5" />
                <span>Bike</span>
              </button>
              <button
                onClick={() => onSetRouteProfile('walking')}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg text-sm font-medium transition-all ${
                  routeProfile === 'walking'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <PersonStanding className="w-5 h-5" />
                <span>Walk</span>
              </button>
            </div>
          </div>

          {/* RV Services */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-3">RV Services</h4>
            <div className="space-y-2">
              {[
                { id: 'rvParks', label: 'RV Parks', icon: '🏕️' },
                { id: 'campgrounds', label: 'Campgrounds', icon: '⛺' },
                { id: 'dumpStations', label: 'Dump Stations', icon: '🚽' },
                { id: 'propane', label: 'Propane', icon: '🔥' },
                { id: 'waterFill', label: 'Water Fill', icon: '💧' },
                { id: 'rvRepair', label: 'RV Repair', icon: '🔧' }
              ].map(service => (
                <label 
                  key={service.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={rvServices[service.id] || false}
                    onChange={(e) => onRVServiceToggle(service.id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-lg">{service.icon}</span>
                  <span className="text-sm flex-1">{service.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreshTrackPanel;