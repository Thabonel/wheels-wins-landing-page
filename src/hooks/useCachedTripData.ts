
import { useState, useEffect } from 'react';
import { Suggestion, Waypoint } from '@/components/wheels/trip-planner/types';

interface CachedTripData {
  id: string;
  originName: string;
  destName: string;
  origin: [number, number];
  destination: [number, number];
  waypoints: Waypoint[];
  suggestions: Suggestion[];
  routeProfile: string;
  mode: string;
  timestamp: Date;
}

export function useCachedTripData() {
  const [cachedTrip, setCachedTrip] = useState<CachedTripData | null>(() => {
    const saved = localStorage.getItem('cached-trip-data');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (cachedTrip) {
      localStorage.setItem('cached-trip-data', JSON.stringify(cachedTrip));
    }
  }, [cachedTrip]);

  const saveTripData = (
    originName: string,
    destName: string,
    origin: [number, number],
    destination: [number, number],
    waypoints: Waypoint[],
    suggestions: Suggestion[],
    routeProfile: string,
    mode: string
  ) => {
    const tripData: CachedTripData = {
      id: Date.now().toString(),
      originName,
      destName,
      origin,
      destination,
      waypoints,
      suggestions,
      routeProfile,
      mode,
      timestamp: new Date()
    };
    setCachedTrip(tripData);
  };

  const clearTripData = () => {
    setCachedTrip(null);
    localStorage.removeItem('cached-trip-data');
  };

  return {
    cachedTrip,
    saveTripData,
    clearTripData
  };
}
