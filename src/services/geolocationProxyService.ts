/**
 * Geolocation Proxy Service
 * Phase 2: Essential Connectivity Fixes - CORS-friendly geolocation
 *
 * Uses backend proxy instead of direct API calls to avoid CORS issues.
 * This fixes the 10+ ipapi.co CORS errors blocking location features.
 */

export interface GeolocationData {
  country_code: string;
  country_name: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  provider?: string;  // Which API provided the data (ip-api.com, ipapi.co, or fallback)
}

// Country data for browser-based detection fallback
const COUNTRY_DATA: Record<string, { name: string; lat: number; lng: number }> = {
  'AU': { name: 'Australia', lat: -25.2744, lng: 133.7751 },
  'NZ': { name: 'New Zealand', lat: -40.9006, lng: 174.886 },
  'US': { name: 'United States', lat: 39.8283, lng: -98.5795 },
  'CA': { name: 'Canada', lat: 56.1304, lng: -106.3468 },
  'GB': { name: 'United Kingdom', lat: 55.3781, lng: -3.436 },
  'UK': { name: 'United Kingdom', lat: 55.3781, lng: -3.436 },
};

/**
 * Detect country from browser settings (language + timezone)
 * Used as fallback when backend geolocation fails
 */
function detectCountryFromBrowser(): string | null {
  // Check browser language (e.g., 'en-AU' -> 'AU')
  const language = navigator.language || (navigator as any).userLanguage;

  if (language) {
    const parts = language.split('-');
    if (parts.length > 1) {
      const countryCode = parts[1].toUpperCase();
      if (COUNTRY_DATA[countryCode]) {
        return countryCode;
      }
    }
  }

  // Check timezone for additional hints
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (timezone) {
      if (timezone.includes('Sydney') || timezone.includes('Melbourne') ||
          timezone.includes('Brisbane') || timezone.includes('Perth') ||
          timezone.includes('Australia')) {
        return 'AU';
      }
      if (timezone.includes('Auckland') || timezone.includes('Wellington') ||
          timezone.includes('Pacific/Auckland')) {
        return 'NZ';
      }
      if (timezone.includes('America/') && !timezone.includes('Toronto') &&
          !timezone.includes('Vancouver')) {
        return 'US';
      }
      if (timezone.includes('Toronto') || timezone.includes('Vancouver') ||
          timezone.includes('Canada')) {
        return 'CA';
      }
      if (timezone.includes('London') || timezone.includes('Europe/London')) {
        return 'GB';
      }
    }
  } catch {
    // Timezone detection failed, continue without it
  }

  return null;
}

/**
 * Get browser-based fallback geolocation data
 */
function getBrowserFallbackGeolocation(): GeolocationData {
  const detectedCountry = detectCountryFromBrowser();

  if (detectedCountry && COUNTRY_DATA[detectedCountry]) {
    const country = COUNTRY_DATA[detectedCountry];
    return {
      country_code: detectedCountry,
      country_name: country.name,
      city: 'Unknown',
      region: 'Unknown',
      latitude: country.lat,
      longitude: country.lng,
      provider: 'browser-fallback'
    };
  }

  // Ultimate fallback: Rest of World (use a neutral central location)
  return {
    country_code: 'XX',
    country_name: 'Unknown',
    city: 'Unknown',
    region: 'Unknown',
    latitude: 0,
    longitude: 0,
    provider: 'default-fallback'
  };
}

/**
 * Get user's geolocation using backend proxy
 * Avoids CORS by routing through our FastAPI backend
 *
 * @returns Geolocation data with country, city, lat/lng
 * @throws Error if geolocation cannot be determined
 */
export async function getGeolocation(): Promise<GeolocationData> {
  try {
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'https://pam-backend.onrender.com';
    const response = await fetch(`${backendUrl}/api/v1/utils/geolocation`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(8000), // 8 second timeout (backend tries 2 services)
    });

    if (!response.ok) {
      throw new Error(`Geolocation request failed: ${response.status}`);
    }

    const data: GeolocationData = await response.json();
    return data;
  } catch (error) {
    console.error('Geolocation proxy error:', error);

    // Use browser-based detection (timezone + language) instead of hardcoding US
    const fallback = getBrowserFallbackGeolocation();
    console.log(`Using browser-based fallback: ${fallback.country_code} (${fallback.country_name})`);
    return fallback;
  }
}

/**
 * Get user's country code only (lighter weight)
 * Useful when you only need country detection
 *
 * @returns Two-letter country code (e.g., "US", "CA", "MX")
 */
export async function getCountryCode(): Promise<string> {
  const data = await getGeolocation();
  return data.country_code;
}

/**
 * Check if user is in a specific country
 *
 * @param countryCodes Array of country codes to check (e.g., ["US", "CA", "MX"])
 * @returns True if user is in one of the specified countries
 */
export async function isInCountries(countryCodes: string[]): Promise<boolean> {
  const userCountry = await getCountryCode();
  return countryCodes.includes(userCountry);
}

/**
 * Get user's coordinates only
 * Useful for map centering or distance calculations
 *
 * @returns { lat, lng } coordinates
 */
export async function getCoordinates(): Promise<{ lat: number; lng: number }> {
  const data = await getGeolocation();
  return {
    lat: data.latitude,
    lng: data.longitude
  };
}
