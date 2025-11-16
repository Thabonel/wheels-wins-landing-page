/**
 * Mapbox Configuration - Industry Standard Security Implementation
 * 
 * This follows Mapbox's official security recommendations for production applications.
 * 
 * Architecture:
 * - Public Token: Frontend map rendering (URL-restricted, read-only scopes)
 * - Secret Token: Backend API operations (server-only, full permissions)
 * - Graceful fallback: Legacy token support during transition
 */

/**
 * Get the appropriate Mapbox token for frontend use
 * Priority: MAIN_TOKEN -> PUBLIC_TOKEN -> LEGACY_TOKEN -> null
 */
export function getMapboxPublicToken(): string | null {
  // Read and normalize env values (trim whitespace/newlines)
  const rawMain = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN_MAIN as string | undefined;
  const rawPublic = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined;
  const rawLegacy = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  const mainToken = rawMain?.trim();
  const publicToken = rawPublic?.trim();
  const legacyToken = rawLegacy?.trim();

  const valid = (t?: string | null) => Boolean(t && t.startsWith('pk.') && !t.includes('your_'));

  console.log('🗺️ Mapbox Token Debug:', {
    environment: import.meta.env.MODE,
    hasMainToken: Boolean(mainToken),
    hasPublicToken: Boolean(publicToken),
    hasLegacyToken: Boolean(legacyToken),
    mainTokenPrefix: mainToken ? mainToken.substring(0, 10) : 'none',
    publicTokenPrefix: publicToken ? publicToken.substring(0, 10) : 'none',
    legacyTokenPrefix: legacyToken ? legacyToken.substring(0, 10) : 'none',
    mainTokenValid: valid(mainToken),
    publicTokenValid: valid(publicToken),
    legacyTokenValid: valid(legacyToken),
  });

  // Priority: MAIN → PUBLIC → LEGACY. Accept any valid pk.* token.
  if (valid(mainToken)) {
    console.log('✅ Using VITE_MAPBOX_PUBLIC_TOKEN_MAIN');
    return mainToken!;
  }
  if (valid(publicToken)) {
    console.log('✅ Using VITE_MAPBOX_PUBLIC_TOKEN');
    return publicToken!;
  }
  if (valid(legacyToken)) {
    console.warn('🔄 Using legacy VITE_MAPBOX_TOKEN. Consider migrating to VITE_MAPBOX_PUBLIC_TOKEN_MAIN.');
    return legacyToken!;
  }

  console.error('❌ No valid Mapbox token found (pk.*). Set VITE_MAPBOX_PUBLIC_TOKEN_MAIN or VITE_MAPBOX_PUBLIC_TOKEN.');
  return null;
}

/**
 * Check if map functionality should be available
 */
export function isMapAvailable(isOffline = false): boolean {
  return !isOffline && getMapboxPublicToken() !== null;
}

/**
 * Get map unavailable reason for debugging
 */
export function getMapUnavailableReason(isOffline = false): string {
  if (isOffline) {
    return 'Application is in offline mode';
  }
  
  const token = getMapboxPublicToken();
  if (!token) {
    return 'No valid Mapbox token configured';
  }
  
  return 'Map should be available';
}

/**
 * Initialize Mapbox GL with proper token
 * Call this before creating any map instances
 */
export async function initializeMapbox(): Promise<boolean> {
  const token = getMapboxPublicToken();
  
  if (!token) {
    console.error('❌ Cannot initialize Mapbox: No valid token available');
    return false;
  }
  
  try {
    // Use dynamic import but await it to ensure token is set before proceeding
    const mapboxgl = await import('mapbox-gl');
    mapboxgl.default.accessToken = token;
    console.log('✅ Mapbox initialized with public token:', `${token.substring(0, 20)  }...`);
    return true;
  } catch (error) {
    console.error('❌ Failed to load mapbox-gl:', error);
    return false;
  }
}

/**
 * Synchronous version for immediate token setting
 * Use this when mapbox-gl is already imported
 */
export function setMapboxToken(): boolean {
  const token = getMapboxPublicToken();
  
  if (!token) {
    console.error('❌ Cannot set Mapbox token: No valid token available');
    return false;
  }
  
  // This assumes mapbox-gl is already imported in the calling component
  try {
    // Use a global check to see if mapboxgl is available
    if (typeof window !== 'undefined' && (window as any).mapboxgl) {
      (window as any).mapboxgl.accessToken = token;
      console.log('✅ Mapbox token set via global:', `${token.substring(0, 20)  }...`);
      return true;
    }
    
    // Direct import attempt (synchronous)
    const mapboxgl = require('mapbox-gl');
    mapboxgl.accessToken = token;
    console.log('✅ Mapbox token set via require:', `${token.substring(0, 20)  }...`);
    return true;
  } catch (error) {
    console.warn('⚠️ Could not set token synchronously, may need async initialization');
    return false;
  }
}

/**
 * Configuration for different environments
 */
export const MAPBOX_CONFIG = {
  // Recommended scopes for public tokens
  PUBLIC_SCOPES: ['styles:read', 'fonts:read'],
  
  // Security recommendations
  SECURITY: {
    enableUrlRestrictions: true,
    rotateTokensRegularly: true,
    useMinimalScopes: true,
    separateTokensPerEnvironment: true,
  },
  
  // Environment-specific settings
  ENVIRONMENTS: {
    development: {
      urlRestrictions: ['http://localhost:*', 'https://localhost:*'],
    },
    staging: {
      urlRestrictions: ['https://*.staging.yourdomain.com'],
    },
    production: {
      urlRestrictions: ['https://yourdomain.com', 'https://www.yourdomain.com'],
    },
  },
} as const;

/**
 * Debug information for troubleshooting
 */
export function getMapboxDebugInfo() {
  const mainToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN_MAIN;
  const publicToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
  const legacyToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const currentToken = getMapboxPublicToken();

  return {
    hasMainToken: Boolean(mainToken),
    hasPublicToken: Boolean(publicToken),
    hasLegacyToken: Boolean(legacyToken),
    currentToken: currentToken ? `${currentToken.substring(0, 10)}...` : null,
    tokenSource: mainToken ? 'main' : publicToken ? 'public' : legacyToken ? 'legacy' : 'none',
    environment: import.meta.env.MODE,
    recommendations: {
      createPublicToken: !mainToken && !publicToken,
      enableUrlRestrictions: true,
      migrateFromLegacy: Boolean(legacyToken && !mainToken && !publicToken),
    },
  };
}
