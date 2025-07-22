/**
 * Get Mapbox token with proper fallback logic
 * Matches the pattern from mapboxConfig.ts for consistency
 */
export function getMapboxToken(): string | null {
  // Priority: PUBLIC_TOKEN -> LEGACY_TOKEN -> null
  const publicToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
  if (publicToken && publicToken.startsWith('pk.') && !publicToken.includes('your_')) {
    return publicToken;
  }
  
  const legacyToken = import.meta.env.VITE_MAPBOX_TOKEN;
  if (legacyToken && legacyToken.startsWith('pk.') && !legacyToken.includes('your_')) {
    return legacyToken;
  }
  
  return null;
}
