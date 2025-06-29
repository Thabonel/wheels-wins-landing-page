export function getMapboxToken(): string | null {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  if (!token) {
    console.error('[Mapbox] VITE_MAPBOX_TOKEN is not set.');
    return null;
  }
  if (!token.startsWith('pk.')) {
    console.error('[Mapbox] VITE_MAPBOX_TOKEN should start with "pk."');
    return null;
  }
  return token;
}
