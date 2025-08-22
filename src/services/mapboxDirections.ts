/**
 * Mapbox Directions service utilities
 */

export interface DirectionsRoute {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: {
    type: 'LineString';
    coordinates: number[][];
  };
  legs: any[];
  weight: number;
  weight_name: string;
}

/**
 * Format distance in meters to a human-readable string
 * @param meters Distance in meters
 * @returns Formatted distance string (e.g., "5.2 mi" or "8.4 km")
 */
export function formatDistance(meters: number): string {
  // Convert to miles for US users
  const miles = meters * 0.000621371;
  
  if (miles < 0.1) {
    // Show in feet for very short distances
    const feet = meters * 3.28084;
    return `${Math.round(feet)} ft`;
  } else if (miles < 10) {
    // Show one decimal place for short distances
    return `${miles.toFixed(1)} mi`;
  } else {
    // Round to nearest mile for longer distances
    return `${Math.round(miles)} mi`;
  }
}

/**
 * Format duration in seconds to a human-readable string
 * @param seconds Duration in seconds
 * @returns Formatted duration string (e.g., "2h 15m" or "45m")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Calculate estimated fuel cost for a trip
 * @param distanceMeters Distance in meters
 * @param mpg Miles per gallon (default 8 for RV)
 * @param gasPrice Price per gallon (default $3.50)
 * @returns Estimated fuel cost
 */
export function calculateFuelCost(
  distanceMeters: number,
  mpg: number = 8,
  gasPrice: number = 3.50
): number {
  const miles = distanceMeters * 0.000621371;
  const gallons = miles / mpg;
  return gallons * gasPrice;
}

/**
 * Format coordinates for display
 * @param lng Longitude
 * @param lat Latitude
 * @returns Formatted coordinate string
 */
export function formatCoordinates(lng: number, lat: number): string {
  return `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
}

/**
 * Build Mapbox Directions API URL
 * @param coordinates Array of [lng, lat] coordinates
 * @param profile Routing profile (driving, walking, cycling)
 * @param token Mapbox access token
 * @returns Mapbox Directions API URL
 */
export function buildDirectionsUrl(
  coordinates: [number, number][],
  profile: 'driving' | 'walking' | 'cycling' | 'driving-traffic' = 'driving',
  token: string
): string {
  const coordinatesString = coordinates
    .map(coord => `${coord[0]},${coord[1]}`)
    .join(';');
  
  return `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinatesString}?` +
    `geometries=geojson&overview=full&access_token=${token}`;
}

/**
 * Parse Mapbox Directions API response
 * @param response API response
 * @returns Parsed route or null if no routes found
 */
export function parseDirectionsResponse(response: any): DirectionsRoute | null {
  if (!response.routes || response.routes.length === 0) {
    return null;
  }
  
  return response.routes[0] as DirectionsRoute;
}

/**
 * Optimize waypoint order for shortest route (TSP approximation)
 * @param waypoints Array of waypoints with coordinates
 * @returns Reordered waypoints for optimal route
 */
export function optimizeWaypointOrder<T extends { coordinates: [number, number] }>(
  waypoints: T[]
): T[] {
  if (waypoints.length <= 2) return waypoints;
  
  // Keep first and last waypoint fixed (start and end points)
  const start = waypoints[0];
  const end = waypoints[waypoints.length - 1];
  const middle = waypoints.slice(1, -1);
  
  // Simple nearest neighbor algorithm for middle waypoints
  const optimized: T[] = [start];
  const remaining = [...middle];
  let current = start;
  
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    
    remaining.forEach((point, index) => {
      const distance = calculateDistance(
        current.coordinates,
        point.coordinates
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    
    current = remaining[nearestIndex];
    optimized.push(current);
    remaining.splice(nearestIndex, 1);
  }
  
  optimized.push(end);
  return optimized;
}

/**
 * Calculate Haversine distance between two coordinates
 * @param coord1 First coordinate [lng, lat]
 * @param coord2 Second coordinate [lng, lat]
 * @returns Distance in meters
 */
function calculateDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = coord1[1] * Math.PI / 180;
  const lat2 = coord2[1] * Math.PI / 180;
  const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
  const deltaLng = (coord2[0] - coord1[0]) * Math.PI / 180;
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}