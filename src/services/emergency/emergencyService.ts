/**
 * Emergency Services Location Detection
 * Provides location-aware emergency numbers for worldwide RV travelers
 */

// Comprehensive emergency numbers database
export const EMERGENCY_DATABASE = {
  // North America
  US: { 
    number: '911', 
    name: 'United States',
    medical: '911',
    police: '911',
    fire: '911',
    notes: 'Single number for all emergencies'
  },
  CA: { 
    number: '911', 
    name: 'Canada',
    medical: '911',
    police: '911',
    fire: '911',
    notes: 'Single number for all emergencies'
  },
  MX: { 
    number: '911', 
    name: 'Mexico',
    medical: '065',
    police: '060',
    fire: '068',
    notes: '911 works in most areas, specific numbers also available'
  },

  // Europe (EU uses 112 universally)
  EU: { 
    number: '112', 
    name: 'European Union',
    medical: '112',
    police: '112',
    fire: '112',
    notes: 'Universal EU emergency number'
  },
  GB: { 
    number: '999', 
    name: 'United Kingdom',
    medical: '999',
    police: '999',
    fire: '999',
    notes: '112 also works'
  },
  IE: { 
    number: '112', 
    name: 'Ireland',
    medical: '112',
    police: '112',
    fire: '112',
    notes: '999 also works'
  },
  FR: { 
    number: '112', 
    name: 'France',
    medical: '15',
    police: '17',
    fire: '18',
    notes: '112 for general emergencies'
  },
  DE: { 
    number: '112', 
    name: 'Germany',
    medical: '112',
    police: '110',
    fire: '112',
    notes: 'Universal EU number'
  },
  ES: { 
    number: '112', 
    name: 'Spain',
    medical: '061',
    police: '091',
    fire: '080',
    notes: '112 for all emergencies'
  },
  IT: { 
    number: '112', 
    name: 'Italy',
    medical: '118',
    police: '113',
    fire: '115',
    notes: '112 being implemented nationwide'
  },

  // Asia Pacific
  AU: { 
    number: '000', 
    name: 'Australia',
    medical: '000',
    police: '000',
    fire: '000',
    notes: '112 works from mobile phones'
  },
  NZ: { 
    number: '111', 
    name: 'New Zealand',
    medical: '111',
    police: '111',
    fire: '111',
    notes: 'Single number for all emergencies'
  },
  JP: { 
    number: '119', 
    name: 'Japan',
    medical: '119',
    police: '110',
    fire: '119',
    notes: 'Medical and fire share 119'
  },
  CN: { 
    number: '120', 
    name: 'China',
    medical: '120',
    police: '110',
    fire: '119',
    notes: 'Different numbers for each service'
  },
  KR: { 
    number: '119', 
    name: 'South Korea',
    medical: '119',
    police: '112',
    fire: '119',
    notes: 'Medical and fire share 119'
  },
  IN: { 
    number: '112', 
    name: 'India',
    medical: '108',
    police: '100',
    fire: '101',
    notes: '112 is universal emergency number'
  },
  SG: { 
    number: '995', 
    name: 'Singapore',
    medical: '995',
    police: '999',
    fire: '995',
    notes: 'Medical and fire share 995'
  },

  // South America
  BR: { 
    number: '192', 
    name: 'Brazil',
    medical: '192',
    police: '190',
    fire: '193',
    notes: 'SAMU for medical emergencies'
  },
  AR: { 
    number: '911', 
    name: 'Argentina',
    medical: '107',
    police: '911',
    fire: '100',
    notes: '911 in Buenos Aires area'
  },
  CL: { 
    number: '131', 
    name: 'Chile',
    medical: '131',
    police: '133',
    fire: '132',
    notes: 'Different numbers for each service'
  },

  // Africa
  ZA: { 
    number: '10111', 
    name: 'South Africa',
    medical: '10177',
    police: '10111',
    fire: '10111',
    notes: '112 works from mobile phones'
  },
  EG: { 
    number: '123', 
    name: 'Egypt',
    medical: '123',
    police: '122',
    fire: '180',
    notes: 'Different numbers for each service'
  },

  // Middle East
  AE: { 
    number: '999', 
    name: 'UAE',
    medical: '998',
    police: '999',
    fire: '997',
    notes: 'Different numbers for each service'
  },
  IL: { 
    number: '101', 
    name: 'Israel',
    medical: '101',
    police: '100',
    fire: '102',
    notes: 'Different numbers for each service'
  },

  // Default/International
  DEFAULT: { 
    number: '112', 
    name: 'International',
    medical: '112',
    police: '112',
    fire: '112',
    notes: 'Works in most GSM countries'
  }
};

// Country code mapping from timezone
const TIMEZONE_TO_COUNTRY: { [key: string]: string } = {
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Anchorage': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Mexico_City': 'MX',
  'America/Cancun': 'MX',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Pacific/Auckland': 'NZ',
  'Asia/Tokyo': 'JP',
  'Asia/Shanghai': 'CN',
  'Asia/Seoul': 'KR',
  'Asia/Kolkata': 'IN',
  'Asia/Singapore': 'SG',
  'America/Sao_Paulo': 'BR',
  'America/Buenos_Aires': 'AR',
  'America/Santiago': 'CL',
  'Africa/Johannesburg': 'ZA',
  'Africa/Cairo': 'EG',
  'Asia/Dubai': 'AE',
  'Asia/Jerusalem': 'IL'
};

export interface EmergencyInfo {
  number: string;
  name: string;
  medical: string;
  police: string;
  fire: string;
  notes: string;
  detected: boolean;
}

/**
 * Detect user's country from various sources
 */
export async function detectUserCountry(): Promise<string> {
  // 1. Check localStorage cache
  const cached = localStorage.getItem('user_country');
  const cacheTime = localStorage.getItem('user_country_time');
  
  if (cached && cacheTime) {
    const hoursSinceCache = (Date.now() - parseInt(cacheTime)) / (1000 * 60 * 60);
    if (hoursSinceCache < 24) {
      return cached;
    }
  }

  // 2. Try browser geolocation API
  if ('geolocation' in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false
        });
      });

      // Would need reverse geocoding API here
      // For now, we'll use timezone as fallback
    } catch (error) {
      console.log('Geolocation not available or denied');
    }
  }

  // 3. Use timezone detection with enhanced Australian detection
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('Detected timezone:', timezone);
    
    // Check exact timezone mapping first
    const country = TIMEZONE_TO_COUNTRY[timezone];
    
    if (country) {
      localStorage.setItem('user_country', country);
      localStorage.setItem('user_country_time', Date.now().toString());
      return country;
    }

    // Enhanced detection for Australia - check all Australian timezones
    const australianTimezones = [
      'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane',
      'Australia/Perth', 'Australia/Adelaide', 'Australia/Hobart',
      'Australia/Darwin', 'Australia/Canberra', 'Australia/ACT',
      'Australia/NSW', 'Australia/Queensland', 'Australia/South',
      'Australia/Tasmania', 'Australia/Victoria', 'Australia/West',
      'Australia/North', 'Australia/Eucla', 'Australia/LHI',
      'Australia/Lord_Howe', 'Australia/Lindeman', 'Australia/Currie',
      'Australia/Broken_Hill', 'Australia/Yancowinna'
    ];
    
    if (australianTimezones.some(tz => timezone.includes(tz))) {
      console.log('Detected Australian timezone:', timezone);
      localStorage.setItem('user_country', 'AU');
      localStorage.setItem('user_country_time', Date.now().toString());
      return 'AU';
    }

    // Fallback to region detection
    if (timezone.includes('Australia')) {
      localStorage.setItem('user_country', 'AU');
      localStorage.setItem('user_country_time', Date.now().toString());
      return 'AU';
    } else if (timezone.includes('America')) {
      if (timezone.includes('Mexico')) return 'MX';
      if (timezone.includes('Canada')) return 'CA';
      return 'US';
    } else if (timezone.includes('Europe')) {
      return 'EU';
    } else if (timezone.includes('Asia')) {
      if (timezone.includes('Tokyo')) return 'JP';
      if (timezone.includes('Shanghai') || timezone.includes('Beijing')) return 'CN';
      if (timezone.includes('Seoul')) return 'KR';
      if (timezone.includes('Kolkata') || timezone.includes('Delhi')) return 'IN';
      if (timezone.includes('Singapore')) return 'SG';
      if (timezone.includes('Dubai')) return 'AE';
      if (timezone.includes('Jerusalem')) return 'IL';
      return 'CN'; // Default Asia
    } else if (timezone.includes('Africa')) {
      if (timezone.includes('Cairo')) return 'EG';
      return 'ZA';
    } else if (timezone.includes('Pacific')) {
      if (timezone.includes('Auckland')) return 'NZ';
      return 'AU'; // Pacific islands often use Australian services
    }
  } catch (error) {
    console.error('Timezone detection error:', error);
  }

  // 4. Try IP-based geolocation (would need API key)
  try {
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.country_code) {
        const country = data.country_code.toUpperCase();
        localStorage.setItem('user_country', country);
        localStorage.setItem('user_country_time', Date.now().toString());
        return country;
      }
    }
  } catch (error) {
    console.log('IP geolocation failed:', error);
  }

  // 5. Default to US (most users)
  return 'US';
}

/**
 * Get emergency information for a country
 */
export function getEmergencyInfo(countryCode?: string): EmergencyInfo {
  const country = countryCode?.toUpperCase() || 'DEFAULT';
  const info = EMERGENCY_DATABASE[country as keyof typeof EMERGENCY_DATABASE] || EMERGENCY_DATABASE.DEFAULT;
  
  return {
    ...info,
    detected: country !== 'DEFAULT'
  };
}

/**
 * Get emergency information with auto-detection
 */
export async function getLocalEmergencyInfo(): Promise<EmergencyInfo> {
  const country = await detectUserCountry();
  return getEmergencyInfo(country);
}

/**
 * Format emergency numbers for display
 */
export function formatEmergencyDisplay(info: EmergencyInfo): string {
  if (info.medical === info.police && info.police === info.fire) {
    return `${info.number} (All emergencies)`;
  }
  
  return `Medical: ${info.medical} | Police: ${info.police} | Fire: ${info.fire}`;
}

/**
 * Get nearby countries (for RV travelers crossing borders)
 */
export function getNearbyCountries(countryCode: string): EmergencyInfo[] {
  const nearby: { [key: string]: string[] } = {
    US: ['CA', 'MX'],
    CA: ['US'],
    MX: ['US'],
    FR: ['ES', 'IT', 'DE', 'GB'],
    DE: ['FR', 'IT', 'AT', 'NL'],
    ES: ['FR', 'PT'],
    IT: ['FR', 'AT', 'CH'],
    GB: ['IE', 'FR'],
    AU: ['NZ'],
    NZ: ['AU']
  };

  const nearbyCodes = nearby[countryCode] || [];
  return nearbyCodes.map(code => ({
    ...getEmergencyInfo(code),
    detected: false
  }));
}

/**
 * Store user's manual country selection
 */
export function setUserCountry(countryCode: string): void {
  localStorage.setItem('user_country', countryCode);
  localStorage.setItem('user_country_time', Date.now().toString());
  localStorage.setItem('user_country_manual', 'true');
}