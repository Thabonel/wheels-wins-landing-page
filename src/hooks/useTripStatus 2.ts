import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, format, addDays } from 'date-fns';
import { useCachedTripData } from './useCachedTripData';

interface TripStop {
  name: string;
  coordinates: [number, number];
  arrivalDate?: Date;
  distance?: number;
}

interface TripStatus {
  nextStop: TripStop | null;
  daysUntilNextStop: number | null;
  distanceRemaining: number | null;
  estimatedArrival: string | null;
  weatherAtDestination: {
    condition: string;
    temperature: number;
  } | null;
  isActive: boolean;
  origin: string | null;
  destination: string | null;
  totalDistance: number | null;
  completedDistance: number | null;
  percentageComplete: number;
}

export function useTripStatus() {
  const { user } = useAuth();
  const { cachedTrip } = useCachedTripData();
  const [tripStatus, setTripStatus] = useState<TripStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch weather data for a location
  const fetchWeatherData = async (coordinates: [number, number]) => {
    try {
      // Using OpenWeatherMap API - you'll need to add your API key to env
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
      if (!apiKey) {
        // Return mock data if no API key
        return {
          condition: 'Sunny',
          temperature: 28
        };
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${coordinates[1]}&lon=${coordinates[0]}&units=metric&appid=${apiKey}`
      );
      
      if (!response.ok) throw new Error('Weather fetch failed');
      
      const data = await response.json();
      return {
        condition: data.weather[0].main,
        temperature: Math.round(data.main.temp)
      };
    } catch (error) {
      console.error('Error fetching weather:', error);
      // Return default weather on error
      return {
        condition: 'Clear',
        temperature: 25
      };
    }
  };

  // Calculate trip status from cached trip data
  const calculateTripStatus = async () => {
    if (!cachedTrip) {
      return null;
    }

    try {
      // For now, we'll use the cached trip data to show status
      // In a real app, this would sync with backend trip progress
      
      const waypoints = cachedTrip.waypoints || [];
      const allStops: TripStop[] = [
        { name: cachedTrip.originName, coordinates: cachedTrip.origin },
        ...waypoints.map(wp => ({ 
          name: wp.name || 'Waypoint', 
          coordinates: wp.coords 
        })),
        { name: cachedTrip.destName, coordinates: cachedTrip.destination }
      ];

      // For demo purposes, assume we're at the first stop
      // In real app, this would be tracked in database
      const currentStopIndex = 0;
      const nextStop = allStops[currentStopIndex + 1] || null;

      let weatherData = null;
      if (nextStop) {
        weatherData = await fetchWeatherData(nextStop.coordinates);
      }

      // Calculate distances (simplified - in real app use routing service)
      const totalDistance = allStops.length * 200; // Mock: 200km between each stop
      const completedDistance = currentStopIndex * 200;
      const distanceRemaining = totalDistance - completedDistance;

      // Calculate arrival (mock data)
      const daysUntilNextStop = nextStop ? 3 : null;
      const estimatedArrival = nextStop 
        ? format(addDays(new Date(), daysUntilNextStop || 0), 'MMMM d, h:mm a')
        : null;

      return {
        nextStop,
        daysUntilNextStop,
        distanceRemaining,
        estimatedArrival,
        weatherAtDestination: weatherData,
        isActive: true,
        origin: cachedTrip.originName,
        destination: cachedTrip.destName,
        totalDistance,
        completedDistance,
        percentageComplete: Math.round((completedDistance / totalDistance) * 100)
      };
    } catch (error) {
      console.error('Error calculating trip status:', error);
      throw error;
    }
  };

  // Load trip status
  useEffect(() => {
    const loadTripStatus = async () => {
      if (!user) {
        setTripStatus(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Calculate status from cached trip data
        const status = await calculateTripStatus();
        setTripStatus(status);
      } catch (err) {
        console.error('Error loading trip status:', err);
        setError(err instanceof Error ? err.message : 'Failed to load trip status');
        setTripStatus(null);
      } finally {
        setLoading(false);
      }
    };

    loadTripStatus();
  }, [user, cachedTrip]);

  // Refresh trip status
  const refreshTripStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const status = await calculateTripStatus();
      setTripStatus(status);
    } catch (err) {
      console.error('Error refreshing trip status:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh trip status');
    } finally {
      setLoading(false);
    }
  };

  return {
    tripStatus,
    loading,
    error,
    refreshTripStatus,
    hasActiveTrip: !!tripStatus?.isActive
  };
}