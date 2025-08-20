import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import EnhancedMap from '@/components/wheels/trip-planner/enhanced/map/EnhancedMap';
import TripsList from '@/components/wheels/trip-planner/enhanced/TripsList';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useToast } from '@/hooks/use-toast';
import { Menu, X, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Trips() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { location: userLocation, error: locationError } = useGeolocation();
  
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [currentRoute, setCurrentRoute] = useState<any>(null);
  const [showSavedTrips, setShowSavedTrips] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access the trip planner.",
        variant: "destructive"
      });
      navigate('/login');
    }
  }, [user, navigate, toast]);

  // Handle route updates from the map
  const handleRouteUpdate = (route: any) => {
    setCurrentRoute(route);
  };

  // Handle adding waypoints
  const handleAddWaypoint = (waypoint: string) => {
    setWaypoints(prev => [...prev, waypoint]);
  };

  // Handle clearing waypoints
  const handleClearWaypoints = () => {
    setWaypoints([]);
    setStartLocation('');
    setEndLocation('');
    setCurrentRoute(null);
  };

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="fixed inset-0 bg-gray-100">
      {/* Remove any header/nav space - full screen map */}
      <div className="absolute inset-0">
        <EnhancedMap
          startLocation={selectedTrip?.start_location || startLocation}
          endLocation={selectedTrip?.end_location || endLocation}
          waypoints={selectedTrip?.waypoints || waypoints}
          onMapClick={() => {}}
          userLocation={userLocation ? {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude
          } : undefined}
          currentRoute={selectedTrip?.route_data || currentRoute}
        />
      </div>

      {/* Saved Trips Sidebar */}
      <div className={`absolute top-0 right-0 h-full bg-white shadow-xl transition-transform duration-300 z-30 ${
        showSavedTrips ? 'translate-x-0' : 'translate-x-full'
      }`} style={{ width: '400px' }}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold">Saved Trips</h2>
            <button
              onClick={() => setShowSavedTrips(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <TripsList 
              onSelectTrip={(trip) => {
                setSelectedTrip(trip);
                setShowSavedTrips(false);
              }}
            />
          </div>
        </div>
      </div>

      {/* Floating back button */}
      <button
        onClick={() => navigate('/wheels')}
        className="absolute top-4 left-4 z-20 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M10 19l-7-7m0 0l7-7m-7 7h18" 
          />
        </svg>
        <span className="font-medium">BACK</span>
      </button>

      {/* Page title */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <h1 className="text-2xl font-bold text-gray-800 bg-white/95 backdrop-blur-sm px-6 py-2 rounded-lg shadow-lg">
          RV Trip Planner
        </h1>
      </div>

      {/* Saved Trips Toggle Button */}
      <button
        onClick={() => setShowSavedTrips(!showSavedTrips)}
        className="absolute top-4 right-4 z-20 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
      >
        <List className="h-5 w-5" />
        <span className="font-medium">SAVED TRIPS</span>
      </button>
    </div>
  );
}