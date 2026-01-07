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

    // Return fallback US location if backend fails
    return {
      country_code: 'US',
      country_name: 'United States',
      city: 'Unknown',
      region: 'Unknown',
      latitude: 39.8283,  // Center of US
      longitude: -98.5795,
      provider: 'fallback'
    };
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
