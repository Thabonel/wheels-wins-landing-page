export function getMapboxToken(): string | null {
  return import.meta.env.VITE_MAPBOX_TOKEN || null;
}
