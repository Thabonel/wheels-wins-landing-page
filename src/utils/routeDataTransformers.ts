/**
 * Route data transformation utilities for converting between different route formats
 * and ensuring compatibility with map rendering requirements.
 */

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][]; // [lng, lat] pairs
}

export interface RouteWaypoint {
  lat: number;
  lng: number;
  name?: string;
}

/**
 * Validates if an object is a valid GeoJSON LineString
 */
export function isValidGeoJSONLineString(geometry: any): geometry is GeoJSONLineString {
  return (
    geometry &&
    typeof geometry === 'object' &&
    geometry.type === 'LineString' &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.length >= 2 &&
    geometry.coordinates.every((coord: any) =>
      Array.isArray(coord) &&
      coord.length === 2 &&
      typeof coord[0] === 'number' &&
      typeof coord[1] === 'number'
    )
  );
}

/**
 * Transforms various route data formats to GeoJSON LineString
 */
export function transformToGeoJSONLineString(routeData: any): GeoJSONLineString | null {
  // If already valid GeoJSON LineString, return as is
  if (isValidGeoJSONLineString(routeData)) {
    return routeData;
  }

  try {
    // Handle Mapbox Directions API response format
    if (routeData && routeData.geometry) {
      if (isValidGeoJSONLineString(routeData.geometry)) {
        return routeData.geometry;
      }

      // Handle encoded polyline in geometry
      if (typeof routeData.geometry === 'string') {
        const decoded = decodePolyline(routeData.geometry);
        return {
          type: 'LineString',
          coordinates: decoded
        };
      }
    }

    // Handle direct encoded polyline string
    if (typeof routeData === 'string' && routeData.length > 10) {
      // Basic validation for polyline format (should be base64-like characters)
      if (/^[A-Za-z0-9_@\-\\`]+$/.test(routeData)) {
        const decoded = decodePolyline(routeData);
        if (decoded && decoded.length >= 2) {
          return {
            type: 'LineString',
            coordinates: decoded
          };
        }
      }
    }

    // Handle coordinate arrays directly - check this BEFORE array of routes
    if (Array.isArray(routeData) && routeData.length >= 2) {
      const firstItem = routeData[0];
      if (Array.isArray(firstItem) && firstItem.length === 2 &&
          typeof firstItem[0] === 'number' && typeof firstItem[1] === 'number') {
        return {
          type: 'LineString',
          coordinates: routeData
        };
      }
    }

    // Handle array of routes (take first route)
    if (Array.isArray(routeData) && routeData.length > 0) {
      return transformToGeoJSONLineString(routeData[0]);
    }

    // Handle nested route structure
    if (routeData && routeData.routes && Array.isArray(routeData.routes) && routeData.routes.length > 0) {
      return transformToGeoJSONLineString(routeData.routes[0]);
    }

    console.warn('Unable to transform route data to GeoJSON LineString:', routeData);
    return null;
  } catch (error) {
    console.error('Error transforming route data:', error);
    return null;
  }
}

/**
 * Creates a fallback straight-line route between waypoints
 */
export function createFallbackGeometry(waypoints: RouteWaypoint[]): GeoJSONLineString | null {
  if (!waypoints || waypoints.length < 2) {
    return null;
  }

  const coordinates: [number, number][] = waypoints
    .filter(wp => wp && typeof wp.lat === 'number' && typeof wp.lng === 'number')
    .map(wp => [wp.lng, wp.lat]);

  if (coordinates.length < 2) {
    return null;
  }

  return {
    type: 'LineString',
    coordinates
  };
}

/**
 * Basic polyline decoder (simplified version)
 * For more robust decoding, consider using a library like @mapbox/polyline
 */
function decodePolyline(encoded: string): [number, number][] {
  try {
    const coordinates: [number, number][] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b: number, shift = 0, result = 0;
      do {
        if (index >= encoded.length) break;
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        if (index >= encoded.length) break;
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      coordinates.push([lng / 1e5, lat / 1e5]);
    }

    return coordinates;
  } catch (error) {
    console.error('Error decoding polyline:', error);
    return [];
  }
}

/**
 * Extracts waypoints from trip data
 */
export function extractWaypoints(tripData: any): RouteWaypoint[] {
  const waypoints: RouteWaypoint[] = [];

  try {
    // Handle various waypoint data structures
    if (tripData?.waypoints && Array.isArray(tripData.waypoints)) {
      tripData.waypoints.forEach((wp: any) => {
        if (wp && typeof wp.lat === 'number' && typeof wp.lng === 'number') {
          waypoints.push({
            lat: wp.lat,
            lng: wp.lng,
            name: wp.name || wp.address || wp.title
          });
        }
      });
    }

    // Handle metadata waypoints
    if (tripData?.metadata?.waypoints && Array.isArray(tripData.metadata.waypoints)) {
      tripData.metadata.waypoints.forEach((wp: any) => {
        if (wp && typeof wp.lat === 'number' && typeof wp.lng === 'number') {
          waypoints.push({
            lat: wp.lat,
            lng: wp.lng,
            name: wp.name || wp.address || wp.title
          });
        }
      });
    }

    // Handle start/end locations
    if (tripData?.start_location && tripData?.end_location) {
      const start = tripData.start_location;
      const end = tripData.end_location;

      if (start.lat && start.lng) {
        waypoints.push({
          lat: start.lat,
          lng: start.lng,
          name: 'Start'
        });
      }

      if (end.lat && end.lng) {
        waypoints.push({
          lat: end.lat,
          lng: end.lng,
          name: 'End'
        });
      }
    }

  } catch (error) {
    console.error('Error extracting waypoints:', error);
  }

  return waypoints;
}