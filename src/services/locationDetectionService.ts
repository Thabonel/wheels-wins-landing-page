import { Region } from '@/context/RegionContext';
import { getCountryCode } from './geolocationProxyService';

interface GeolocationData {
  country_code: string;
  country_name: string;
  region: string;
  city: string;
}

/**
 * Map country codes to our Region types
 */
const COUNTRY_TO_REGION: Record<string, Region> = {
  // Australia
  'AU': 'Australia',
  
  // New Zealand
  'NZ': 'New Zealand',
  
  // United States
  'US': 'United States',
  
  // Canada
  'CA': 'Canada',
  
  // United Kingdom
  'GB': 'United Kingdom',
  'UK': 'United Kingdom',
  
  // Default for all others
  'DEFAULT': 'Rest of the World'
};

/**
 * Detect user's region based on their IP location
 */
export async function detectUserRegion(): Promise<Region> {
  try {
    // Try multiple geolocation services for reliability
    const region = await tryGeolocationServices();
    
    if (region) {
      console.log(`Auto-detected region: ${region}`);
      return region;
    }
    
    // Fallback to browser language/timezone detection
    const browserRegion = detectFromBrowser();
    if (browserRegion) {
      console.log(`Detected region from browser: ${browserRegion}`);
      return browserRegion;
    }
    
    console.log('Could not detect region, using default');
    return 'Rest of the World';
    
  } catch (error) {
    console.error('Error detecting user region:', error);
    return 'Rest of the World';
  }
}

/**
 * Try multiple geolocation services
 * Phase 2: Now uses backend proxy to avoid CORS issues
 */
async function tryGeolocationServices(): Promise<Region | null> {
  // Primary: Backend proxy (CORS-friendly, tries ip-api.com and ipapi.co)
  try {
    const countryCode = await getCountryCode();
    const region = COUNTRY_TO_REGION[countryCode] || COUNTRY_TO_REGION['DEFAULT'];
    return region;
  } catch (primaryError) {
    console.warn('Backend geolocation proxy failed, trying CloudFlare fallback');
  }

  // Fallback: CloudFlare trace (CORS-friendly)
  const services = [
    async () => {
      const response = await fetch('https://www.cloudflare.com/cdn-cgi/trace', {
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) throw new Error('CloudFlare trace failed');
      const text = await response.text();
      const match = text.match(/loc=([A-Z]{2})/);
      return match ? match[1] : null;
    }
  ];
  
  // Try each service until one succeeds
  for (const service of services) {
    try {
      const countryCode = await service();
      if (countryCode) {
        return COUNTRY_TO_REGION[countryCode] || COUNTRY_TO_REGION.DEFAULT;
      }
    } catch (error) {
      // Continue to next service
      continue;
    }
  }
  
  return null;
}

/**
 * Detect region from browser settings
 */
function detectFromBrowser(): Region | null {
  // Check browser language
  const language = navigator.language || (navigator as any).userLanguage;
  
  if (language) {
    // Extract country code from language (e.g., 'en-US' -> 'US')
    const parts = language.split('-');
    if (parts.length > 1) {
      const countryCode = parts[1].toUpperCase();
      const region = COUNTRY_TO_REGION[countryCode];
      if (region) return region;
    }
    
    // Check common language patterns
    if (language.startsWith('en-AU')) return 'Australia';
    if (language.startsWith('en-NZ')) return 'New Zealand';
    if (language.startsWith('en-US')) return 'United States';
    if (language.startsWith('en-CA')) return 'Canada';
    if (language.startsWith('en-GB')) return 'United Kingdom';
  }
  
  // Check timezone for additional hints
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  if (timezone) {
    if (timezone.includes('Sydney') || timezone.includes('Melbourne') || timezone.includes('Australia')) {
      return 'Australia';
    }
    if (timezone.includes('Auckland') || timezone.includes('New_Zealand')) {
      return 'New Zealand';
    }
    if (timezone.includes('New_York') || timezone.includes('Los_Angeles') || timezone.includes('Chicago') || timezone.includes('America/')) {
      return 'United States';
    }
    if (timezone.includes('Toronto') || timezone.includes('Vancouver') || timezone.includes('Canada')) {
      return 'Canada';
    }
    if (timezone.includes('London') || timezone.includes('Europe/London')) {
      return 'United Kingdom';
    }
  }
  
  return null;
}

/**
 * Store detected region in localStorage for persistence
 */
export function cacheDetectedRegion(region: Region): void {
  try {
    localStorage.setItem('detectedRegion', region);
    localStorage.setItem('detectedRegionTimestamp', Date.now().toString());
  } catch (error) {
    console.warn('Could not cache detected region:', error);
  }
}

/**
 * Get cached region if it's still fresh (24 hours)
 */
export function getCachedRegion(): Region | null {
  try {
    const cachedRegion = localStorage.getItem('detectedRegion') as Region;
    const timestamp = localStorage.getItem('detectedRegionTimestamp');
    
    if (cachedRegion && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      if (age < twentyFourHours) {
        return cachedRegion;
      }
    }
  } catch (error) {
    console.warn('Could not read cached region:', error);
  }
  
  return null;
}

/**
 * Get user's region with caching
 */
export async function getUserRegion(): Promise<Region> {
  // Check cache first
  const cached = getCachedRegion();
  if (cached) {
    console.log(`Using cached region: ${cached}`);
    return cached;
  }
  
  // Detect region
  const detected = await detectUserRegion();
  
  // Cache the result
  cacheDetectedRegion(detected);
  
  return detected;
}