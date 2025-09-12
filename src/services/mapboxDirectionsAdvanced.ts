/**
 * Enhanced Mapbox Directions API Service
 * Advanced routing with magnetic road snapping and RV-specific optimizations
 * Ported from UnimogCommunityHub for Wheels & Wins
 */

import { authenticatedFetch } from './api';

const BACKEND_URL = 
  import.meta.env.VITE_API_URL || 
  import.meta.env.VITE_BACKEND_URL || 
  'https://pam-backend.onrender.com';

export interface DirectionsWaypoint {
  lng: number;
  lat: number;
  name?: string;
  bearing?: number; // Bearing in degrees (0-360) for magnetic routing
  snapRadius?: number; // Maximum distance in meters for road snapping (default: 100m)
}

export interface DirectionsOptions {
  profile?: 'driving' | 'driving-traffic' | 'walking' | 'cycling';
  alternatives?: boolean;
  steps?: boolean;
  overview?: 'full' | 'simplified' | 'false';
  geometries?: 'geojson' | 'polyline' | 'polyline6';
  language?: string;
  enableMagneticRouting?: boolean; // Enable bearing and radius controls
  defaultSnapRadius?: number; // Default snap radius in meters (100-500)
  bearingTolerance?: number; // Tolerance for bearing in degrees (15-180)
  excludeTypes?: string[]; // 'toll', 'motorway', 'ferry', 'unpaved'
  annotations?: string[]; // 'duration', 'distance', 'speed'
  approaches?: ('unrestricted' | 'curb')[]; // Approach restrictions
  waypoint_snapping?: ('any' | 'closest')[]; // Waypoint snapping preference
  radiuses?: number[]; // Custom snap radius for each waypoint
  bearings?: [number, number][]; // [bearing, tolerance] pairs
}

export interface DirectionsRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry: any; // GeoJSON LineString or encoded polyline
  legs: DirectionsLeg[];
  weight: number;
  weight_name: string;
  confidence?: number; // Route confidence score (0-1)
  rvSuitability?: number; // RV suitability score (0-100)
}

export interface DirectionsLeg {
  distance: number;
  duration: number;
  steps: DirectionsStep[];
  summary: string;
  annotation?: {
    distance?: number[];
    duration?: number[];
    speed?: number[];
  };
}

export interface DirectionsStep {
  distance: number;
  duration: number;
  geometry: any;
  name: string;
  ref?: string; // Road reference number
  pronunciation?: string;
  destinations?: string;
  mode: 'driving' | 'ferry' | 'unaccessible' | 'walking' | 'cycling';
  maneuver: {
    type: string;
    instruction: string;
    bearing_before: number;
    bearing_after: number;
    location: [number, number];
    modifier?: string;
  };
  voiceInstructions?: Array<{
    distanceAlongGeometry: number;
    announcement: string;
    ssmlAnnouncement: string;
  }>;
  bannerInstructions?: Array<{
    distanceAlongGeometry: number;
    primary: {
      text: string;
      components: Array<{
        text: string;
        type: string;
      }>;
      type: string;
      modifier?: string;
    };
  }>;
  intersections?: Array<{
    location: [number, number];
    bearings: number[];
    entry: boolean[];
    in?: number;
    out?: number;
    lanes?: Array<{
      valid: boolean;
      active: boolean;
      indications: string[];
    }>;
  }>;
}

export interface DirectionsResponse {
  routes: DirectionsRoute[];
  waypoints: Array<{
    hint?: string;
    distance?: number;
    name: string;
    location: [number, number];
  }>;
  code: string;
  uuid?: string;
}

export interface ProcessedDirections {
  mainRoute: ProcessedRoute;
  alternatives: ProcessedRoute[];
  waypoints: ProcessedWaypoint[];
  metadata: {
    totalDistance: number;
    totalDuration: number;
    confidence: number;
    processingTime: number;
  };
}

export interface ProcessedRoute {
  distance: number; // kilometers
  duration: number; // hours
  geometry: [number, number][];
  instructions: RouteInstruction[];
  summary: string;
  rvSuitability: number;
  confidence: number;
  avoidances: string[];
  waypoints: ProcessedWaypoint[];
}

export interface ProcessedWaypoint {
  coordinates: [number, number];
  name: string;
  snapDistance?: number;
  confidence: number;
}

export interface RouteInstruction {
  text: string;
  distance: number;
  duration: number;
  location: [number, number];
  type: string;
  modifier?: string;
  roadName?: string;
  ref?: string;
}

/**
 * Make enhanced Mapbox Directions API request through backend proxy
 */
async function directionsRequest(
  waypoints: DirectionsWaypoint[],
  options: DirectionsOptions = {}
): Promise<DirectionsResponse | null> {
  
  // Validate inputs
  if (waypoints.length < 2) {
    throw new Error('At least 2 waypoints required for directions');
  }

  if (waypoints.length > 25) {
    throw new Error('Maximum 25 waypoints allowed by Mapbox API');
  }

  // Validate waypoint coordinates
  const invalidWaypoints = waypoints.filter(wp => 
    wp.lng === undefined || wp.lat === undefined || 
    isNaN(wp.lng) || isNaN(wp.lat) ||
    wp.lng < -180 || wp.lng > 180 ||
    wp.lat < -90 || wp.lat > 90
  );
  
  if (invalidWaypoints.length > 0) {
    console.error('Invalid waypoints detected:', invalidWaypoints);
    throw new Error('Invalid waypoint coordinates detected');
  }

  // Set enhanced defaults for RV routing
  const defaultOptions: DirectionsOptions = {
    profile: 'driving',
    alternatives: true,
    steps: true,
    overview: 'full',
    geometries: 'geojson',
    language: 'en',
    enableMagneticRouting: true,
    defaultSnapRadius: 100, // 100m default for better road adherence
    bearingTolerance: 45, // 45° tolerance
    annotations: ['duration', 'distance', 'speed'],
    waypoint_snapping: Array(waypoints.length).fill('closest'),
    ...options
  };

  // Build coordinates string (longitude,latitude pairs separated by semicolons)
  const coordinates = waypoints
    .map(wp => `${wp.lng.toFixed(6)},${wp.lat.toFixed(6)}`)
    .join(';');

  // Build waypoint indices for intermediate waypoints
  const waypointIndices = waypoints.length > 2 
    ? Array.from({ length: waypoints.length }, (_, i) => i).join(';')
    : undefined;

  // Build radiuses parameter for magnetic road snapping
  const radiuses = defaultOptions.enableMagneticRouting 
    ? waypoints.map(wp => {
        const radius = wp.snapRadius ?? defaultOptions.defaultSnapRadius ?? 100;
        return Math.max(10, Math.min(radius, 500)).toString(); // Clamp 10-500m
      }).join(';')
    : undefined;

  // Build bearings parameter for directional control
  const bearings = defaultOptions.enableMagneticRouting && waypoints.some(wp => wp.bearing !== undefined)
    ? waypoints.map(wp => {
        if (wp.bearing !== undefined) {
          const tolerance = defaultOptions.bearingTolerance ?? 45;
          const normalizedBearing = ((wp.bearing % 360) + 360) % 360; // Normalize 0-360
          return `${normalizedBearing.toFixed(0)},${tolerance}`;
        }
        return ''; // Empty string for waypoints without bearing constraint
      }).join(';')
    : undefined;

  // Build approaches parameter
  const approaches = defaultOptions.approaches && defaultOptions.approaches.length === waypoints.length
    ? defaultOptions.approaches.join(';')
    : undefined;

  // Prepare request parameters
  const params = {
    coordinates,
    profile: defaultOptions.profile,
    alternatives: defaultOptions.alternatives?.toString() || 'true',
    steps: defaultOptions.steps?.toString() || 'true',
    overview: defaultOptions.overview || 'full',
    geometries: defaultOptions.geometries || 'geojson',
    language: defaultOptions.language || 'en',
    annotations: defaultOptions.annotations?.join(','),
    exclude: defaultOptions.excludeTypes?.join(','),
    waypoint_snapping: defaultOptions.waypoint_snapping?.join(';')
  };

  // Add optional parameters
  if (waypointIndices) params.waypoints = waypointIndices;
  if (radiuses) params.radiuses = radiuses;
  if (bearings) params.bearings = bearings;
  if (approaches) params.approaches = approaches;

  const url = new URL(`${BACKEND_URL}/api/v1/mapbox/directions/advanced`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  });

  try {
    console.log('🧭 Enhanced Mapbox Directions request:', {
      waypoints: waypoints.length,
      profile: defaultOptions.profile,
      magneticRouting: defaultOptions.enableMagneticRouting,
      radiuses: radiuses?.split(';').length,
      bearings: bearings ? bearings.split(';').filter(b => b).length : 0
    });

    const response = await authenticatedFetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Enhanced Mapbox Directions error:', response.status, errorText);
      throw new Error(`Mapbox Directions API error: ${response.status} - ${errorText}`);
    }
    
    const data: DirectionsResponse = await response.json();
    
    if (data.code !== 'Ok') {
      console.error('Mapbox Directions API non-OK response:', data);
      throw new Error(`Mapbox Directions API returned: ${data.code}`);
    }

    // Log successful response
    console.log('✅ Enhanced directions calculated:', {
      routes: data.routes.length,
      mainDistance: `${(data.routes[0]?.distance / 1000).toFixed(1)}km`,
      mainDuration: `${(data.routes[0]?.duration / 3600).toFixed(1)}h`,
      alternatives: data.routes.length - 1
    });

    return data;

  } catch (error) {
    console.error('Enhanced Mapbox Directions request failed:', error);
    return null;
  }
}

/**
 * Calculate advanced route with magnetic snapping and RV optimizations
 */
export async function calculateEnhancedRoute(
  waypoints: DirectionsWaypoint[],
  options: DirectionsOptions = {}
): Promise<ProcessedDirections | null> {
  
  const startTime = performance.now();
  
  try {
    const response = await directionsRequest(waypoints, options);
    
    if (!response || !response.routes || response.routes.length === 0) {
      return null;
    }

    const processingTime = performance.now() - startTime;

    // Process main route
    const mainRoute = processRoute(response.routes[0], waypoints, true);
    
    // Process alternative routes
    const alternatives = response.routes.slice(1).map(route => 
      processRoute(route, waypoints, false)
    );

    // Process waypoints with snapping confidence
    const processedWaypoints: ProcessedWaypoint[] = response.waypoints.map((wp, index) => ({
      coordinates: wp.location,
      name: wp.name || waypoints[index]?.name || `Waypoint ${index + 1}`,
      snapDistance: wp.distance,
      confidence: wp.distance ? Math.max(0, 1 - (wp.distance / 100)) : 1
    }));

    // Calculate overall confidence
    const averageWaypointConfidence = processedWaypoints.reduce((sum, wp) => sum + wp.confidence, 0) / processedWaypoints.length;
    const routeConfidence = (mainRoute.confidence + averageWaypointConfidence) / 2;

    const result: ProcessedDirections = {
      mainRoute,
      alternatives,
      waypoints: processedWaypoints,
      metadata: {
        totalDistance: mainRoute.distance,
        totalDuration: mainRoute.duration,
        confidence: routeConfidence,
        processingTime: Math.round(processingTime)
      }
    };

    return result;

  } catch (error) {
    console.error('Failed to calculate enhanced route:', error);
    return null;
  }
}

/**
 * Process individual route from Mapbox response
 */
function processRoute(route: DirectionsRoute, originalWaypoints: DirectionsWaypoint[], isMainRoute: boolean): ProcessedRoute {
  
  // Extract geometry coordinates
  const geometry: [number, number][] = route.geometry.type === 'LineString' 
    ? route.geometry.coordinates.map(coord => [coord[0], coord[1]])
    : [];

  // Process turn-by-turn instructions
  const instructions: RouteInstruction[] = [];
  route.legs.forEach(leg => {
    leg.steps.forEach(step => {
      instructions.push({
        text: step.maneuver.instruction,
        distance: step.distance,
        duration: step.duration,
        location: step.maneuver.location,
        type: step.maneuver.type,
        modifier: step.maneuver.modifier,
        roadName: step.name,
        ref: step.ref
      });
    });
  });

  // Calculate RV suitability based on route characteristics
  const rvSuitability = calculateRVSuitability(route, instructions);
  
  // Calculate route confidence based on various factors
  const confidence = calculateRouteConfidence(route, instructions, originalWaypoints);

  // Identify route avoidances
  const avoidances = identifyRouteAvoidances(instructions);

  // Generate summary
  const distanceKm = route.distance / 1000;
  const durationHours = route.duration / 3600;
  const summary = `${distanceKm.toFixed(1)}km route, ${durationHours.toFixed(1)}h estimated driving time`;

  return {
    distance: distanceKm,
    duration: durationHours,
    geometry,
    instructions,
    summary,
    rvSuitability,
    confidence,
    avoidances,
    waypoints: originalWaypoints.map((wp, idx) => ({
      coordinates: [wp.lng, wp.lat],
      name: wp.name || `Waypoint ${idx + 1}`,
      confidence: 1
    }))
  };
}

/**
 * Calculate RV suitability score (0-100)
 */
function calculateRVSuitability(route: DirectionsRoute, instructions: RouteInstruction[]): number {
  let score = 100;
  
  // Check for problematic road types in instructions
  const problematicTerms = [
    'narrow', 'steep', 'winding', 'unpaved', 'trail', 'track',
    'ferry', 'tunnel', 'bridge', 'construction', 'restricted'
  ];
  
  instructions.forEach(instruction => {
    const text = instruction.text.toLowerCase();
    problematicTerms.forEach(term => {
      if (text.includes(term)) {
        score -= 5; // Penalty for each problematic feature
      }
    });
  });

  // Bonus for highways and major roads
  const goodTerms = ['highway', 'interstate', 'motorway', 'freeway'];
  instructions.forEach(instruction => {
    const text = instruction.text.toLowerCase();
    goodTerms.forEach(term => {
      if (text.includes(term)) {
        score += 2; // Small bonus for RV-friendly roads
      }
    });
  });

  // Distance-based adjustment (longer routes slightly less suitable)
  const distanceKm = route.distance / 1000;
  if (distanceKm > 500) {
    score -= Math.min((distanceKm - 500) / 100, 10);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate route confidence score (0-1)
 */
function calculateRouteConfidence(
  route: DirectionsRoute, 
  instructions: RouteInstruction[], 
  originalWaypoints: DirectionsWaypoint[]
): number {
  let confidence = 1.0;
  
  // Penalize routes with many unclear instructions
  const unclearCount = instructions.filter(inst => 
    inst.text.includes('unknown') || inst.text.includes('unnamed')
  ).length;
  confidence -= Math.min(unclearCount * 0.05, 0.3);
  
  // Bonus for routes with detailed road information
  const detailedCount = instructions.filter(inst => inst.ref || inst.roadName).length;
  const detailRatio = detailedCount / instructions.length;
  confidence += detailRatio * 0.1;
  
  // Consider route weight/confidence from Mapbox if available
  if (route.confidence !== undefined) {
    confidence = (confidence + route.confidence) / 2;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Identify route avoidances from instructions
 */
function identifyRouteAvoidances(instructions: RouteInstruction[]): string[] {
  const avoidances: string[] = [];
  
  instructions.forEach(instruction => {
    const text = instruction.text.toLowerCase();
    
    if (text.includes('toll') || text.includes('turnpike')) {
      if (!avoidances.includes('tolls')) avoidances.push('tolls');
    }
    
    if (text.includes('ferry')) {
      if (!avoidances.includes('ferries')) avoidances.push('ferries');
    }
    
    if (text.includes('highway') || text.includes('interstate')) {
      if (!avoidances.includes('highways')) avoidances.push('highways');
    }
  });
  
  return avoidances;
}

/**
 * Format route instructions for display
 */
export function formatInstructions(instructions: RouteInstruction[]): string[] {
  return instructions.map((instruction, index) => {
    const step = index + 1;
    const distance = instruction.distance < 1000 
      ? `${Math.round(instruction.distance)}m`
      : `${(instruction.distance / 1000).toFixed(1)}km`;
    
    return `${step}. ${instruction.text} (${distance})`;
  });
}

/**
 * Enhanced Mapbox Directions service
 */
export const mapboxDirectionsAdvanced = {
  calculateEnhancedRoute,
  formatInstructions,
  utils: {
    calculateRVSuitability,
    calculateRouteConfidence,
    identifyRouteAvoidances
  }
};

export default mapboxDirectionsAdvanced;