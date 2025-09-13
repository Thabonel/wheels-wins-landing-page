/**
 * OpenRoute Service - Advanced RV Routing with Off-Road Capabilities
 * Ported from UnimogCommunityHub for Wheels & Wins RV trip planning
 * 
 * Features:
 * - Off-road routing for RV-accessible trails and roads
 * - Elevation profile integration for mountain passes
 * - Alternative route calculation with RV restrictions
 * - Detailed turn-by-turn instructions
 */

import { authenticatedFetch } from './api';

const BACKEND_URL = 
  import.meta.env.VITE_API_URL || 
  import.meta.env.VITE_BACKEND_URL || 
  'https://pam-backend.onrender.com';

export interface OpenRouteCoordinate {
  lat: number;
  lng: number;
  elevation?: number;
}

export interface OpenRouteWaypoint extends OpenRouteCoordinate {
  name?: string;
  type?: 'start' | 'via' | 'end';
  avoidRadius?: number; // Radius in meters to avoid around this point
}

export interface OpenRouteOptions {
  profile?: 'driving-car' | 'driving-hgv' | 'foot-hiking' | 'cycling-regular';
  avoid_features?: string[]; // ['highways', 'tollways', 'ferries', 'unpaved']
  avoid_borders?: 'all' | 'controlled' | 'none';
  vehicle_type?: 'hgv' | 'bus' | 'agricultural' | 'delivery' | 'forestry' | 'goods';
  preference?: 'fastest' | 'shortest' | 'recommended';
  alternatives?: number; // 0-3 alternative routes
  continue_straight?: boolean;
  bearings?: number[][]; // Direction constraints [bearing, range] in degrees
  radiuses?: number[]; // Snap radiuses for each coordinate in meters
  skip_segments?: number[]; // Skip specific route segments
  maximum_speed?: number; // km/h
  weightings?: {
    steepness_difficulty?: number; // -3 to 3 (avoid/prefer steep roads)
    green?: number; // -1 to 1 (avoid/prefer environmentally friendly)
    quiet?: number; // -1 to 1 (avoid/prefer quiet roads)
  };
  restrictions?: {
    length?: number; // Vehicle length in meters
    width?: number; // Vehicle width in meters  
    height?: number; // Vehicle height in meters
    weight?: number; // Vehicle weight in tons
  };
  extra_info?: string[]; // ['steepness', 'suitability', 'surface', 'waycategory', 'waytype', 'tollways', 'traildifficulty']
  elevation?: boolean;
  instructions?: boolean;
  instructions_format?: 'text' | 'html';
  language?: 'en' | 'de' | 'es' | 'fr' | 'it' | 'nl' | 'pt' | 'ru' | 'zh';
  geometry?: boolean;
  geometry_format?: 'geojson' | 'polyline' | 'encodedpolyline';
  geometry_simplify?: boolean;
}

export interface OpenRouteSegment {
  distance: number;
  duration: number;
  steps: OpenRouteStep[];
}

export interface OpenRouteStep {
  distance: number;
  duration: number;
  type: number;
  instruction: string;
  name: string;
  way_points: [number, number];
  maneuver: {
    bearing_before?: number;
    bearing_after?: number;
    location: [number, number];
  };
}

export interface OpenRouteElevation {
  ascent: number; // Total elevation gain in meters
  descent: number; // Total elevation loss in meters
  data: [number, number, number][]; // [distance_km, elevation_m, grade_%]
}

export interface OpenRouteExtraInfo {
  steepness?: number[][];
  suitability?: number[][];
  surface?: number[][];
  waycategory?: number[][];
  waytype?: number[][];
  tollways?: number[][];
  traildifficulty?: number[][];
}

export interface OpenRouteResponse {
  type: 'FeatureCollection';
  features: Array<{
    bbox: [number, number, number, number];
    type: 'Feature';
    properties: {
      ascent?: number;
      descent?: number;
      segments: OpenRouteSegment[];
      summary: {
        distance: number; // meters
        duration: number; // seconds
      };
      way_points: number[];
      extras?: OpenRouteExtraInfo;
    };
    geometry: {
      coordinates: [number, number, number?][];
      type: 'LineString';
    };
  }>;
  bbox: [number, number, number, number];
  metadata: {
    attribution: string;
    service: string;
    timestamp: number;
    query: {
      coordinates: [number, number][];
      profile: string;
      format: string;
    };
    engine: {
      version: string;
      build_date: string;
      graph_date: string;
    };
  };
}

export interface ProcessedRoute {
  distance: number; // kilometers
  duration: number; // hours
  elevation: {
    ascent: number;
    descent: number;
    data: [number, number, number][];
  };
  geometry: [number, number, number?][];
  instructions: string[];
  summary: string;
  difficulty: 'easy' | 'moderate' | 'hard' | 'extreme';
  rvSuitability: number; // 0-100 score
  waypoints: OpenRouteWaypoint[];
  alternatives?: ProcessedRoute[];
}

/**
 * Make OpenRoute Service request through backend proxy
 */
async function openRouteRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
  const url = new URL(`${BACKEND_URL}/api/v1/openroute/${endpoint}`);
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  });

  try {
    console.log('🛣️ OpenRoute Service request:', {
      endpoint,
      url: url.toString()
    });

    const response = await authenticatedFetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRoute Service error:', response.status, errorText);
      throw new Error(`OpenRoute Service error: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('OpenRoute Service request failed:', error);
    throw error;
  }
}

/**
 * Calculate route with advanced RV-specific options
 */
export async function calculateAdvancedRoute(
  waypoints: OpenRouteWaypoint[],
  options: OpenRouteOptions = {}
): Promise<ProcessedRoute | null> {
  if (waypoints.length < 2) {
    throw new Error('At least 2 waypoints required for routing');
  }

  if (waypoints.length > 50) {
    throw new Error('Maximum 50 waypoints allowed');
  }

  // Set RV-friendly defaults
  const defaultOptions: OpenRouteOptions = {
    profile: 'driving-hgv', // Heavy vehicle profile for RVs
    preference: 'recommended',
    alternatives: 2, // Get alternative routes
    extra_info: ['steepness', 'surface', 'waytype', 'tollways'],
    elevation: true,
    instructions: true,
    instructions_format: 'text',
    language: 'en',
    geometry: true,
    geometry_format: 'geojson',
    vehicle_type: 'goods', // Appropriate for RVs
    restrictions: {
      height: 4.0, // 4m height limit for RVs
      width: 2.5,  // 2.5m width limit
      length: 12.0, // 12m length limit
      weight: 7.5   // 7.5 tons weight limit
    },
    weightings: {
      steepness_difficulty: -1, // Avoid steep roads for RVs
      green: 0.5, // Prefer scenic routes
      quiet: 0.3  // Slightly prefer quieter roads
    },
    avoid_features: ['ferries'], // Avoid ferries by default
    ...options
  };

  // Prepare coordinates array
  const coordinates = waypoints.map(wp => [wp.lng, wp.lat]);

  // Prepare bearings if specified
  const bearings = options.bearings || waypoints
    .map(wp => wp.avoidRadius ? [0, wp.avoidRadius] : undefined)
    .filter(Boolean);

  // Prepare radiuses for waypoint snapping
  const radiuses = options.radiuses || waypoints.map(() => 200); // 200m snap radius

  const requestParams = {
    coordinates: JSON.stringify(coordinates),
    profile: defaultOptions.profile,
    preference: defaultOptions.preference,
    alternatives: defaultOptions.alternatives,
    extra_info: defaultOptions.extra_info?.join(','),
    elevation: defaultOptions.elevation,
    instructions: defaultOptions.instructions,
    instructions_format: defaultOptions.instructions_format,
    language: defaultOptions.language,
    geometry: defaultOptions.geometry,
    geometry_format: defaultOptions.geometry_format,
    avoid_features: defaultOptions.avoid_features?.join(','),
    vehicle_type: defaultOptions.vehicle_type,
    restrictions: JSON.stringify(defaultOptions.restrictions),
    weightings: JSON.stringify(defaultOptions.weightings)
  };

  if (bearings.length > 0) {
    requestParams.bearings = JSON.stringify(bearings);
  }

  if (radiuses.length > 0) {
    requestParams.radiuses = JSON.stringify(radiuses);
  }

  try {
    const response: OpenRouteResponse = await openRouteRequest('directions', requestParams);
    
    if (!response.features || response.features.length === 0) {
      console.error('No route found in OpenRoute response');
      return null;
    }

    // Process the main route
    const mainFeature = response.features[0];
    const processed = processRouteFeature(mainFeature, waypoints);

    // Process alternative routes if available
    if (response.features.length > 1) {
      processed.alternatives = response.features.slice(1).map(feature => 
        processRouteFeature(feature, waypoints)
      );
    }

    console.log('🗺️ Advanced route calculated:', {
      distance: `${processed.distance.toFixed(1)}km`,
      duration: `${processed.duration.toFixed(1)}h`,
      difficulty: processed.difficulty,
      rvSuitability: `${processed.rvSuitability}%`,
      alternatives: processed.alternatives?.length || 0
    });

    return processed;

  } catch (error) {
    console.error('Failed to calculate advanced route:', error);
    return null;
  }
}

/**
 * Process OpenRoute response feature into simplified format
 */
function processRouteFeature(feature: any, waypoints: OpenRouteWaypoint[]): ProcessedRoute {
  const properties = feature.properties;
  const geometry = feature.geometry;
  
  // Extract basic metrics
  const distance = properties.summary.distance / 1000; // Convert to km
  const duration = properties.summary.duration / 3600; // Convert to hours
  
  // Extract elevation data
  const elevation = {
    ascent: properties.ascent || 0,
    descent: properties.descent || 0,
    data: geometry.coordinates.map((coord: [number, number, number?], index: number) => [
      index * distance / geometry.coordinates.length, // Distance along route
      coord[2] || 0, // Elevation
      0 // Grade (would need calculation)
    ]) as [number, number, number][]
  };

  // Extract instructions
  const instructions: string[] = [];
  properties.segments.forEach((segment: OpenRouteSegment) => {
    segment.steps.forEach(step => {
      if (step.instruction && step.instruction.trim()) {
        instructions.push(step.instruction);
      }
    });
  });

  // Calculate difficulty based on distance, elevation gain, and steepness
  const difficulty = calculateRouteDifficulty(distance, elevation.ascent, properties.extras);
  
  // Calculate RV suitability score
  const rvSuitability = calculateRVSuitability(properties.extras, elevation);

  // Generate summary
  const summary = `${distance.toFixed(1)}km route with ${elevation.ascent.toFixed(0)}m elevation gain. Estimated ${duration.toFixed(1)} hours driving time.`;

  return {
    distance,
    duration,
    elevation,
    geometry: geometry.coordinates,
    instructions,
    summary,
    difficulty,
    rvSuitability,
    waypoints
  };
}

/**
 * Calculate route difficulty based on various factors
 */
function calculateRouteDifficulty(
  distance: number, 
  elevationGain: number, 
  extras?: OpenRouteExtraInfo
): 'easy' | 'moderate' | 'hard' | 'extreme' {
  let score = 0;
  
  // Distance factor (longer routes are more challenging)
  score += Math.min(distance / 100, 2); // Max 2 points for distance
  
  // Elevation factor
  score += Math.min(elevationGain / 1000, 3); // Max 3 points for elevation
  
  // Steepness factor
  if (extras?.steepness) {
    const steepSegments = extras.steepness.filter(([start, end, value]) => value > 2);
    score += Math.min(steepSegments.length / 10, 2); // Max 2 points for steepness
  }
  
  // Surface quality factor
  if (extras?.surface) {
    const roughSurfaces = extras.surface.filter(([start, end, value]) => value > 3);
    score += Math.min(roughSurfaces.length / 20, 1); // Max 1 point for surface
  }

  if (score <= 2) return 'easy';
  if (score <= 4) return 'moderate';
  if (score <= 6) return 'hard';
  return 'extreme';
}

/**
 * Calculate RV suitability score (0-100)
 */
function calculateRVSuitability(extras?: OpenRouteExtraInfo, elevation?: any): number {
  let score = 100;
  
  // Penalize steep sections
  if (extras?.steepness) {
    const steepCount = extras.steepness.filter(([start, end, value]) => value > 2).length;
    score -= Math.min(steepCount * 5, 30);
  }
  
  // Penalize poor surfaces
  if (extras?.surface) {
    const roughCount = extras.surface.filter(([start, end, value]) => value > 3).length;
    score -= Math.min(roughCount * 3, 20);
  }
  
  // Penalize trails and unpaved roads
  if (extras?.waytype) {
    const trailCount = extras.waytype.filter(([start, end, value]) => value > 5).length;
    score -= Math.min(trailCount * 8, 40);
  }
  
  // Penalize excessive elevation gain
  if (elevation?.ascent > 1500) {
    score -= Math.min((elevation.ascent - 1500) / 100, 20);
  }
  
  return Math.max(score, 0);
}

/**
 * Get elevation profile for a route
 */
export async function getElevationProfile(
  coordinates: [number, number][]
): Promise<[number, number, number][] | null> {
  if (coordinates.length === 0) return null;

  try {
    const params = {
      coordinates: JSON.stringify(coordinates),
      format_in: 'geojson',
      format_out: 'geojson'
    };

    const response = await openRouteRequest('elevation/line', params);
    
    if (!response.geometry?.coordinates) {
      return null;
    }

    // Convert to distance, elevation, grade format
    const profile: [number, number, number][] = [];
    const coords = response.geometry.coordinates;
    
    for (let i = 0; i < coords.length; i++) {
      const [lng, lat, elevation] = coords[i];
      const distance = i === 0 ? 0 : calculateDistance(
        coords[0][1], coords[0][0], lat, lng
      );
      
      // Calculate grade
      let grade = 0;
      if (i > 0) {
        const prevElev = coords[i - 1][2];
        const distanceDiff = calculateDistance(
          coords[i - 1][1], coords[i - 1][0], lat, lng
        ) * 1000; // Convert to meters
        
        if (distanceDiff > 0) {
          grade = ((elevation - prevElev) / distanceDiff) * 100;
        }
      }
      
      profile.push([distance, elevation, grade]);
    }
    
    return profile;

  } catch (error) {
    console.error('Failed to get elevation profile:', error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Main OpenRoute Service export
 */
export const openRouteService = {
  calculateAdvancedRoute,
  getElevationProfile,
  utils: {
    calculateDistance,
    calculateRouteDifficulty,
    calculateRVSuitability
  }
};

export default openRouteService;