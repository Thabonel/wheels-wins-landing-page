/**
 * Trip thumbnail generation using Mapbox Static Images API
 * PRD Requirement: Static map thumbnails for visual trip identification
 */

import { getMapboxToken } from './mapboxToken';
import { UserTrip, UserTripMetadata } from '@/types/userTrips';

export interface TripThumbnailOptions {
  width?: number;
  height?: number;
  retina?: boolean;
  style?: 'streets-v12' | 'outdoors-v12' | 'satellite-streets-v12';
}

const DEFAULT_OPTIONS: Required<TripThumbnailOptions> = {
  width: 300,
  height: 150,
  retina: true,
  style: 'streets-v12'
};

/**
 * Generate a static map thumbnail URL for a trip using Mapbox Static Images API
 * Format: /styles/v1/mapbox/streets-v12/static/geojson({routeGeoJSON})/auto/300x150@2x
 */
export function generateTripThumbnailUrl(
  trip: UserTrip,
  options: TripThumbnailOptions = {}
): string | null {
  try {
    const token = getMapboxToken();
    if (!token) {
      console.warn('No Mapbox token available for thumbnail generation');
      return null;
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };
    const retinaSuffix = opts.retina ? '@2x' : '';

    // Extract route geometry from trip metadata
    const routeData = trip.metadata?.route_data;
    if (!routeData?.route?.coordinates || routeData.route.coordinates.length === 0) {
      console.warn('No route geometry available for trip thumbnail:', trip.id);
      return null;
    }

    // Create GeoJSON for the route
    const routeGeoJSON = {
      type: 'Feature',
      properties: {
        'stroke': '#2563eb', // Blue color for route
        'stroke-width': 3,
        'stroke-opacity': 0.8
      },
      geometry: {
        type: 'LineString',
        coordinates: routeData.route.coordinates
      }
    };

    // URL encode the GeoJSON
    const encodedGeoJSON = encodeURIComponent(JSON.stringify(routeGeoJSON));

    // Construct the Mapbox Static Images URL
    const baseUrl = 'https://api.mapbox.com/styles/v1/mapbox';
    const url = `${baseUrl}/${opts.style}/static/geojson(${encodedGeoJSON})/auto/${opts.width}x${opts.height}${retinaSuffix}?access_token=${token}`;

    return url;
  } catch (error) {
    console.error('Error generating trip thumbnail URL:', error);
    return null;
  }
}

/**
 * Generate thumbnail URL with waypoint markers
 * Adds waypoint pins to the static map for better visual context
 */
export function generateTripThumbnailWithWaypoints(
  trip: UserTrip,
  options: TripThumbnailOptions = {}
): string | null {
  try {
    const token = getMapboxToken();
    if (!token) {
      return null;
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };
    const retinaSuffix = opts.retina ? '@2x' : '';

    const routeData = trip.metadata?.route_data;
    if (!routeData?.waypoints || routeData.waypoints.length === 0) {
      // Fallback to simple route if no waypoints
      return generateTripThumbnailUrl(trip, options);
    }

    // Build overlay string with waypoints and route
    const overlays = [];

    // Add waypoint markers
    routeData.waypoints.forEach((waypoint, index) => {
      const [lng, lat] = waypoint.coordinates;
      const color = index === 0 ? 'pin-s-a+22c55e' : // Green for start
                   index === routeData.waypoints!.length - 1 ? 'pin-s-b+ef4444' : // Red for end
                   'pin-s+3b82f6'; // Blue for waypoints

      overlays.push(`${color}(${lng},${lat})`);
    });

    // Add route if available
    if (routeData.route?.coordinates && routeData.route.coordinates.length > 0) {
      const routeGeoJSON = {
        type: 'Feature',
        properties: {
          'stroke': '#2563eb',
          'stroke-width': 3,
          'stroke-opacity': 0.6
        },
        geometry: {
          type: 'LineString',
          coordinates: routeData.route.coordinates
        }
      };
      overlays.push(`geojson(${encodeURIComponent(JSON.stringify(routeGeoJSON))})`);
    }

    const baseUrl = 'https://api.mapbox.com/styles/v1/mapbox';
    const overlayString = overlays.join(',');
    const url = `${baseUrl}/${opts.style}/static/${overlayString}/auto/${opts.width}x${opts.height}${retinaSuffix}?access_token=${token}`;

    return url;
  } catch (error) {
    console.error('Error generating trip thumbnail with waypoints:', error);
    return generateTripThumbnailUrl(trip, options); // Fallback
  }
}

/**
 * Get cached thumbnail URL from trip metadata or generate new one
 * PRD: "Thumbnail URL generated and cached in trip metadata on save — zero runtime cost after that"
 */
export function getTripThumbnailUrl(
  trip: UserTrip,
  options: TripThumbnailOptions = {}
): string | null {
  // Check for cached thumbnail in metadata
  const cachedUrl = trip.metadata?.thumbnail_url;
  if (cachedUrl) {
    return cachedUrl;
  }

  // Generate new thumbnail URL
  return generateTripThumbnailWithWaypoints(trip, options);
}

/**
 * Generate placeholder thumbnail URL for trips without route data
 * PRD: "Falls back to a placeholder illustration if route geometry is incomplete"
 */
export function getPlaceholderThumbnailUrl(
  options: TripThumbnailOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const retinaSuffix = opts.retina ? '@2x' : '';

  // Use a generic Australia-centered map with road overlay
  const token = getMapboxToken();
  const baseUrl = 'https://api.mapbox.com/styles/v1/mapbox';

  // Center on Australia with appropriate zoom
  const centerLng = 133.7751;
  const centerLat = -25.2744;
  const zoom = 4;

  return `${baseUrl}/outdoors-v12/static/${centerLng},${centerLat},${zoom}/${opts.width}x${opts.height}${retinaSuffix}?access_token=${token}`;
}

/**
 * Update trip metadata with thumbnail URL
 * Called when saving trips to cache the thumbnail URL
 */
export function addThumbnailToTripMetadata(
  metadata: UserTripMetadata | null,
  thumbnailUrl: string
): UserTripMetadata {
  return {
    ...(metadata || {}),
    thumbnail_url: thumbnailUrl,
    thumbnail_generated_at: new Date().toISOString()
  };
}

/**
 * Check if trip has valid route data for thumbnail generation
 */
export function tripHasValidRouteData(trip: UserTrip): boolean {
  const routeData = trip.metadata?.route_data;
  return !!(
    routeData?.route?.coordinates &&
    routeData.route.coordinates.length >= 2
  );
}