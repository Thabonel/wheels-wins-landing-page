import { useState, useEffect, useCallback } from 'react';

export interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
  city?: string;
  state?: string;
  country?: string;
}

export interface UseGeolocationResult {
  location: LocationData | null;
  error: string | null;
  loading: boolean;
  getLocation: () => void;
  clearLocation: () => void;
  formatLocation: () => string;
}

export const useGeolocation = (): UseGeolocationResult => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reverse geocoding to get city/state info
  const reverseGeocode = async (lat: number, lng: number): Promise<Partial<LocationData>> => {
    try {
      // Using a free geocoding service
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );

      if (!response.ok) {
        return {};
      }

      const data = await response.json();
      return {
        city: data.city || data.locality,
        state: data.principalSubdivision,
        country: data.countryName
      };
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return {};
    }
  };

  const getLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const baseLocationData: LocationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };

        // Get city/state info
        const geoData = await reverseGeocode(baseLocationData.lat, baseLocationData.lng);

        const locationData: LocationData = {
          ...baseLocationData,
          ...geoData
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
  }, []);

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

  // Clear stored location
  const clearLocation = useCallback(() => {
    setLocation(null);
    localStorage.removeItem('lastKnownLocation');
  }, []);

  // Format location for display
  const formatLocation = useCallback(() => {
    if (!location) return 'Unknown Location';

    if (location.city && location.state) {
      return `${location.city}, ${location.state}`;
    } else if (location.city) {
      return location.city;
    } else {
      return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    }
  }, [location]);

  return {
    location,
    error,
    loading,
    getLocation,
    clearLocation,
    formatLocation
  };
};