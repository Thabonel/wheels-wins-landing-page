/**
 * PAM Location Context Utility
 * Gathers location information from browser to enhance PAM's weather and location-based capabilities
 * This enables PAM with Claude to provide detailed weather and local information without asking for location
 */

import { locationService } from '@/services/locationService';
import { getUserRegion } from '@/services/locationDetectionService';

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
 * Get comprehensive location context for PAM requests
 * Tries multiple sources: GPS -> Database -> IP detection -> Browser
 */
export async function getPamLocationContext(userId?: string): Promise<LocationContext | null> {
  try {
    console.log('🌍 Gathering location context for PAM...');

    // Try to get precise GPS location first (with user permission)
    const gpsLocation = await tryGetGPSLocation();
    if (gpsLocation) {
      console.log('📍 Using GPS location for PAM context');
      return {
        ...gpsLocation,
        source: 'gps',
        timestamp: Date.now()
      };
    }

    // Try to get location from database if user is logged in
    if (userId) {
      try {
        const dbLocation = await locationService.getUserLocation(userId);
        if (dbLocation?.current_latitude && dbLocation?.current_longitude) {
          console.log('🗄️ Using database location for PAM context');
          return {
            latitude: dbLocation.current_latitude,
            longitude: dbLocation.current_longitude,
            source: 'cached',
            timestamp: Date.now()
          };
        }
      } catch (error) {
        console.warn('⚠️ Could not get location from database:', error);
      }
    }

    // Try to get location from IP detection
    const ipLocation = await tryGetIPLocation();
    if (ipLocation) {
      console.log('🌐 Using IP-based location for PAM context');
      return {
        ...ipLocation,
        source: 'ip',
        timestamp: Date.now()
      };
    }

    // Fallback to browser-based location hints
    const browserLocation = getBrowserLocationHints();
    if (browserLocation) {
      console.log('🌏 Using browser hints for PAM context');
      return {
        ...browserLocation,
        source: 'browser',
        timestamp: Date.now()
      };
    }

    console.log('❌ No location context available for PAM');
    return null;

  } catch (error) {
    console.error('❌ Error getting PAM location context:', error);
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
 * Try to get approximate location from IP detection
 */
async function tryGetIPLocation(): Promise<Partial<LocationContext> | null> {
  try {
    const region = await getUserRegion();

    // Map regions to approximate coordinates and cities
    const regionData = getRegionLocationData(region);

    return {
      ...regionData,
      region,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
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
 * Get approximate location data for regions
 */
function getRegionLocationData(region: string): Partial<LocationContext> {
  const regionMap: Record<string, Partial<LocationContext>> = {
    'Australia': {
      latitude: -25.2744,
      longitude: 133.7751,
      city: 'Alice Springs',
      country: 'Australia'
    },
    'New Zealand': {
      latitude: -40.9006,
      longitude: 174.8860,
      city: 'Wellington',
      country: 'New Zealand'
    },
    'United States': {
      latitude: 39.8283,
      longitude: -98.5795,
      city: 'Lebanon',
      country: 'United States'
    },
    'Canada': {
      latitude: 56.1304,
      longitude: -106.3468,
      city: 'Saskatoon',
      country: 'Canada'
    },
    'United Kingdom': {
      latitude: 55.3781,
      longitude: -3.4360,
      city: 'Manchester',
      country: 'United Kingdom'
    }
  };

  return regionMap[region] || regionMap['United States'];
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
 */
export function formatLocationForPam(locationContext: LocationContext | null): Record<string, any> {
  if (!locationContext) {
    return {};
  }

  return {
    location: {
      latitude: locationContext.latitude,
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