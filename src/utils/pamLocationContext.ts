/**
 * PAM Location Context Utility
 * Gathers location information from browser to enhance PAM's weather and location-based capabilities
 * This enables PAM with Claude to provide detailed weather and local information without asking for location
 */

import { supabase } from '@/integrations/supabase/client';

export interface LocationContext {
  latitude?: number;
  longitude?: number;
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  accuracy?: number;
  timestamp?: number;
  source?: 'gps' | 'ip' | 'browser' | 'cached';
}

/**
 * Profile location data from Supabase
 * Note: These columns exist in DB but may not be in generated types
 */
interface ProfileLocationData {
  current_latitude: number | null;
  current_longitude: number | null;
  region: string | null;
}

/**
 * Try to get location from user's profile in database
 * This is the most reliable source for logged-in users who have set their location
 */
async function tryGetProfileLocation(userId: string): Promise<Partial<LocationContext> | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('current_latitude, current_longitude, region')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.debug('Profile location not available:', error?.message);
      return null;
    }

    // Cast to known schema - these columns exist but may not be in generated types
    const profile = data as unknown as ProfileLocationData;

    if (profile.current_latitude && profile.current_longitude) {
      return {
        latitude: profile.current_latitude,
        longitude: profile.current_longitude,
        country: profile.region ?? undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }

    return null;
  } catch (error) {
    console.debug('Failed to get profile location:', error);
    return null;
  }
}

/**
 * Get comprehensive location context for PAM requests
 * Priority: Profile -> GPS -> Cached -> IP detection -> Browser
 */
export async function getPamLocationContext(userId?: string): Promise<LocationContext | null> {
  try {
    console.log('Gathering location context for PAM...');

    // Priority 1: For logged-in users, check profile location first
    if (userId) {
      const profileLocation = await tryGetProfileLocation(userId);
      if (profileLocation) {
        console.log('Using profile location for PAM context');
        return {
          ...profileLocation,
          source: 'gps', // Mark as 'gps' since it's user-specified precise coordinates
          timestamp: Date.now()
        };
      }
    }

    // Priority 2: Try to get precise GPS location (with user permission)
    const gpsLocation = await tryGetGPSLocation();
    if (gpsLocation) {
      console.log('Using GPS location for PAM context');
      return {
        ...gpsLocation,
        source: 'gps',
        timestamp: Date.now()
      };
    }

    // Priority 3: Try to get location from browser cache (localStorage)
    const cachedLocation = getCachedLocation();
    if (cachedLocation) {
      console.log('Using cached location for PAM context');
      return {
        ...cachedLocation,
        source: 'cached',
        timestamp: Date.now()
      };
    }

    // Priority 4: Try to get location from IP detection
    const ipLocation = await tryGetIPLocation();
    if (ipLocation) {
      console.log('Using IP-based location for PAM context');
      return {
        ...ipLocation,
        source: 'ip',
        timestamp: Date.now()
      };
    }

    // Priority 5: Fallback to browser-based location hints
    const browserLocation = getBrowserLocationHints();
    if (browserLocation) {
      console.log('Using browser hints for PAM context');
      return {
        ...browserLocation,
        source: 'browser',
        timestamp: Date.now()
      };
    }

    console.log('No location context available for PAM');
    return null;

  } catch (error) {
    console.error('Error getting PAM location context:', error);
    return null;
  }
}

/**
 * Try to get precise GPS location with user permission
 */
async function tryGetGPSLocation(): Promise<Partial<LocationContext> | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      resolve(null);
    }, 5000); // 5 second timeout

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const { latitude, longitude, accuracy } = position.coords;
        resolve({
          latitude,
          longitude,
          accuracy,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
      },
      (error) => {
        clearTimeout(timeoutId);
        console.debug('GPS location not available:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: false, // Faster response
        timeout: 4000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
}

/**
 * Get cached location from localStorage (from useGeolocation hook)
 */
function getCachedLocation(): Partial<LocationContext> | null {
  try {
    const cached = localStorage.getItem('lastKnownLocation');
    if (!cached) return null;

    const data = JSON.parse(cached);
    if (!data.location) return null;

    const { location } = data;
    const age = Date.now() - data.timestamp;

    // Use cached location if less than 1 hour old
    if (age < 60 * 60 * 1000) {
      return {
        latitude: location.lat,
        longitude: location.lng,
        city: location.city,
        region: location.state,
        country: location.country,
        accuracy: location.accuracy,
        timestamp: location.timestamp
      };
    }

    return null;
  } catch (error) {
    console.debug('Failed to get cached location:', error);
    return null;
  }
}

/**
 * Try to get approximate location from IP detection (simplified)
 */
async function tryGetIPLocation(): Promise<Partial<LocationContext> | null> {
  try {
    // Simple timezone-based fallback
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locationFromTimezone = inferLocationFromTimezone(timezone);

    return {
      ...locationFromTimezone,
      timezone
    };

  } catch (error) {
    console.debug('IP location detection failed:', error);
    return null;
  }
}

/**
 * Get browser-based location hints from timezone and language
 */
function getBrowserLocationHints(): Partial<LocationContext> | null {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;

    // Try to infer location from timezone
    const locationFromTimezone = inferLocationFromTimezone(timezone);

    return {
      timezone,
      ...locationFromTimezone,
      country: inferCountryFromLanguage(language)
    };
  } catch (error) {
    console.debug('Browser location hints failed:', error);
    return null;
  }
}

/**
 * Infer location from browser timezone
 */
function inferLocationFromTimezone(timezone: string): Partial<LocationContext> {
  const timezoneMap: Record<string, Partial<LocationContext>> = {
    // Australia
    'Australia/Sydney': { latitude: -33.8688, longitude: 151.2093, city: 'Sydney', country: 'Australia' },
    'Australia/Melbourne': { latitude: -37.8136, longitude: 144.9631, city: 'Melbourne', country: 'Australia' },
    'Australia/Brisbane': { latitude: -27.4698, longitude: 153.0251, city: 'Brisbane', country: 'Australia' },
    'Australia/Perth': { latitude: -31.9505, longitude: 115.8605, city: 'Perth', country: 'Australia' },

    // New Zealand
    'Pacific/Auckland': { latitude: -36.8485, longitude: 174.7633, city: 'Auckland', country: 'New Zealand' },

    // United States
    'America/New_York': { latitude: 40.7128, longitude: -74.0060, city: 'New York', country: 'United States' },
    'America/Los_Angeles': { latitude: 34.0522, longitude: -118.2437, city: 'Los Angeles', country: 'United States' },
    'America/Chicago': { latitude: 41.8781, longitude: -87.6298, city: 'Chicago', country: 'United States' },
    'America/Denver': { latitude: 39.7392, longitude: -104.9903, city: 'Denver', country: 'United States' },

    // Canada
    'America/Toronto': { latitude: 43.6532, longitude: -79.3832, city: 'Toronto', country: 'Canada' },
    'America/Vancouver': { latitude: 49.2827, longitude: -123.1207, city: 'Vancouver', country: 'Canada' },

    // United Kingdom
    'Europe/London': { latitude: 51.5074, longitude: -0.1278, city: 'London', country: 'United Kingdom' }
  };

  return timezoneMap[timezone] || {};
}

/**
 * Infer country from browser language
 */
function inferCountryFromLanguage(language: string): string | undefined {
  const languageMap: Record<string, string> = {
    'en-AU': 'Australia',
    'en-NZ': 'New Zealand',
    'en-US': 'United States',
    'en-CA': 'Canada',
    'en-GB': 'United Kingdom',
    'fr-CA': 'Canada'
  };

  return languageMap[language] || languageMap[language.split('-')[0]];
}

/**
 * Format location context for PAM backend
 *
 * CRITICAL: Backend expects 'user_location' NOT 'location'
 * Backend expects 'lat' and 'lng' NOT 'latitude' and 'longitude'
 * See docs/PAM_BACKEND_CONTEXT_REFERENCE.md Section 2
 */
export function formatLocationForPam(locationContext: LocationContext | null): Record<string, any> {
  if (!locationContext) {
    return {};
  }

  return {
    user_location: {  // ✅ Changed from 'location' to 'user_location'
      lat: locationContext.latitude,      // ✅ Backend expects 'lat' not 'latitude'
      lng: locationContext.longitude,     // ✅ Backend expects 'lng' not 'longitude'
      latitude: locationContext.latitude, // Keep for backward compatibility
      longitude: locationContext.longitude,
      city: locationContext.city,
      region: locationContext.region,
      country: locationContext.country,
      timezone: locationContext.timezone,
      accuracy: locationContext.accuracy,
      timestamp: locationContext.timestamp,
      source: locationContext.source
    }
  };
}