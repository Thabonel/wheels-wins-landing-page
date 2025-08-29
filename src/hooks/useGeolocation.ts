import { useState, useEffect } from 'react';

interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

interface UseGeolocationResult {
  location: LocationData | null;
  error: string | null;
  loading: boolean;
  getLocation: () => void;
}

export const useGeolocation = (): UseGeolocationResult => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        
        setLocation(locationData);
        setLoading(false);
        
        // Store in localStorage for next session
        localStorage.setItem('lastKnownLocation', JSON.stringify(locationData));
      },
      (error) => {
        setError(error.message);
        setLoading(false);
        
        // Try to use last known location from localStorage
        const lastKnown = localStorage.getItem('lastKnownLocation');
        if (lastKnown) {
          try {
            setLocation(JSON.parse(lastKnown));
          } catch (e) {
            console.error('Failed to parse last known location');
          }
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Get location from localStorage on mount
  useEffect(() => {
    const lastKnown = localStorage.getItem('lastKnownLocation');
    if (lastKnown) {
      try {
        setLocation(JSON.parse(lastKnown));
      } catch (e) {
        console.error('Failed to parse last known location');
      }
    }
  }, []);

  return { location, error, loading, getLocation };
};