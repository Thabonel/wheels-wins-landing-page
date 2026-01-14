/**
 * Smart Location Context Hook
 * Automatically manages user location without asking for permission
 * Provides intelligent fallbacks and caching
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getGeolocation } from '@/services/geolocationProxyService';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  country?: string;
  timestamp: number;
}

interface UseLocationContextReturn {
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  refreshLocation: () => Promise<void>;
  getLocationForQuery: (query: string) => LocationData | null;
}

// Location-requiring query patterns
const LOCATION_REQUIRED_PATTERNS = [
  'weather', 'forecast', 'rain', 'temperature', 'sunny', 'cloudy', 'snow',
  'nearby', 'around me', 'close to me', 'near me',
  'directions', 'route', 'navigate', 'drive', 'trip',
  'local', 'restaurant', 'hotel', 'gas station', 'rv park', 'campground',
  'traffic', 'road conditions'
];

// Cache duration in milliseconds
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const LOCATION_TIMEOUT = 2000; // 2 seconds max wait

export function useLocationContext(): UseLocationContextReturn {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locationCache = useRef<LocationData | null>(null);
  const lastFetchTime = useRef<number>(0);

  // Get cached location from session storage
  const getCachedLocation = useCallback((): LocationData | null => {
    try {
      const cached = sessionStorage.getItem('pam_user_location');
      if (cached) {
        const data = JSON.parse(cached) as LocationData;
        const age = Date.now() - data.timestamp;
        if (age < LOCATION_CACHE_DURATION) {
          return data;
        }
      }
    } catch (e) {
      console.error('Failed to get cached location:', e);
    }
    return null;
  }, []);

  // Save location to session storage
  const cacheLocation = useCallback((data: LocationData) => {
    try {
      sessionStorage.setItem('pam_user_location', JSON.stringify(data));
      locationCache.current = data;
      lastFetchTime.current = Date.now();
    } catch (e) {
      console.error('Failed to cache location:', e);
    }
  }, []);

  // Get location via browser API with timeout
  const getBrowserLocation = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('Location request timed out'));
      }, LOCATION_TIMEOUT);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          resolve(locationData);
        },
        (error) => {
          clearTimeout(timeoutId);
          // Don't reject, just resolve with null to allow fallback
          reject(error);
        },
        {
          enableHighAccuracy: false, // Faster but less accurate
          timeout: LOCATION_TIMEOUT,
          maximumAge: LOCATION_CACHE_DURATION
        }
      );
    });
  }, []);

  // Get location via IP-based service (fallback)
  // Phase 2: Now uses backend proxy to avoid CORS issues
  const getIPLocation = useCallback(async (): Promise<LocationData | null> => {
    try {
      const data = await getGeolocation();
      if (data.latitude && data.longitude) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city,
          country: data.country_name,
          timestamp: Date.now()
        };
      }
    } catch (e) {
      console.error('IP location fallback failed:', e);
    }
    return null;
  }, []);

  // Main location fetch function
  const fetchLocation = useCallback(async (force: boolean = false) => {
    // Check cache first
    if (!force) {
      const cached = getCachedLocation();
      if (cached) {
        setLocation(cached);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try browser location first
      const browserLocation = await getBrowserLocation();
      setLocation(browserLocation);
      cacheLocation(browserLocation);
    } catch (browserError) {
      console.log('Browser location failed, trying IP fallback:', browserError);
      
      // Try IP-based fallback
      const ipLocation = await getIPLocation();
      if (ipLocation) {
        setLocation(ipLocation);
        cacheLocation(ipLocation);
      } else {
        // Set a default location (US center) as last resort
        const defaultLocation: LocationData = {
          latitude: 39.8283, // Geographic center of USA
          longitude: -98.5795,
          city: 'United States',
          timestamp: Date.now()
        };
        setLocation(defaultLocation);
        cacheLocation(defaultLocation);
        setError('Using approximate location');
      }
    } finally {
      setIsLoading(false);
    }
  }, [getBrowserLocation, getIPLocation, getCachedLocation, cacheLocation]);

  // Check if a query requires location
  const queryNeedsLocation = useCallback((query: string): boolean => {
    const lowerQuery = query.toLowerCase();
    return LOCATION_REQUIRED_PATTERNS.some(pattern => lowerQuery.includes(pattern));
  }, []);

  // Get location only if query needs it
  const getLocationForQuery = useCallback((query: string): LocationData | null => {
    if (!queryNeedsLocation(query)) {
      return null; // Query doesn't need location
    }
    return location || locationCache.current;
  }, [location, queryNeedsLocation]);

  // Refresh location (force update)
  const refreshLocation = useCallback(async () => {
    await fetchLocation(true);
  }, [fetchLocation]);

  // Auto-fetch location on mount (silently, no permission prompt)
  useEffect(() => {
    // Only fetch if we don't have a cached location
    const cached = getCachedLocation();
    if (!cached) {
      fetchLocation(false);
    } else {
      setLocation(cached);
      locationCache.current = cached;
    }
  }, []); // Only run once on mount

  return {
    location,
    isLoading,
    error,
    refreshLocation,
    getLocationForQuery
  };
}