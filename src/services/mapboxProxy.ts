/**
 * Mapbox Proxy Service
 * Secure service for making Mapbox API calls through backend proxy
 * This eliminates the need for frontend token exposure
 */

import { authenticatedFetch } from './api';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

/**
 * Base proxy request function
 */
async function proxyRequest(endpoint: string, params: Record<string, any> = {}) {
  const url = new URL(`${BACKEND_URL}/api/v1/mapbox/${endpoint}`);
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  });

  try {
    const response = await authenticatedFetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Mapbox proxy error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Mapbox proxy request failed:', error);
    throw error;
  }
}

/**
 * Geocoding Services
 */
export const geocoding = {
  /**
   * Forward geocoding - search for places
   */
  async forward(query: string, options: {
    proximity?: [number, number];
    bbox?: [number, number, number, number];
    country?: string[];
    limit?: number;
    types?: string[];
    autocomplete?: boolean;
  } = {}) {
    const params: Record<string, any> = { q: query };
    
    if (options.proximity) {
      params.proximity = options.proximity.join(',');
    }
    if (options.bbox) {
      params.bbox = options.bbox.join(',');
    }
    if (options.country) {
      params.country = options.country.join(',');
    }
    if (options.limit) {
      params.limit = options.limit;
    }
    if (options.types) {
      params.types = options.types.join(',');
    }
    if (options.autocomplete !== undefined) {
      params.autocomplete = options.autocomplete;
    }

    return proxyRequest('search/geocode/v6/forward', params);
  },

  /**
   * Reverse geocoding - get place from coordinates
   */
  async reverse(longitude: number, latitude: number, options: {
    types?: string[];
    language?: string;
  } = {}) {
    const params: Record<string, any> = { longitude, latitude };
    
    if (options.types) {
      params.types = options.types.join(',');
    }
    if (options.language) {
      params.language = options.language;
    }

    return proxyRequest('search/geocode/v6/reverse', params);
  }
};

/**
 * Directions Service
 */
export const directions = {
  /**
   * Get directions between coordinates
   */
  async get(
    profile: 'driving' | 'walking' | 'cycling' | 'driving-traffic',
    coordinates: [number, number][],
    options: {
      alternatives?: boolean;
      geometries?: 'geojson' | 'polyline' | 'polyline6';
      overview?: 'full' | 'simplified' | 'false';
      steps?: boolean;
      continue_straight?: boolean;
      waypoint_snapping?: string;
      annotations?: string[];
      language?: string;
      voice_instructions?: boolean;
      banner_instructions?: boolean;
      roundabout_exits?: boolean;
      exclude?: string[];
    } = {}
  ) {
    const coordinatesString = coordinates.map(coord => coord.join(',')).join(';');
    
    const params: Record<string, any> = {};
    
    if (options.alternatives !== undefined) params.alternatives = options.alternatives;
    if (options.geometries) params.geometries = options.geometries;
    if (options.overview) params.overview = options.overview;
    if (options.steps !== undefined) params.steps = options.steps;
    if (options.continue_straight !== undefined) params.continue_straight = options.continue_straight;
    if (options.waypoint_snapping) params.waypoint_snapping = options.waypoint_snapping;
    if (options.annotations) params.annotations = options.annotations.join(',');
    if (options.language) params.language = options.language;
    if (options.voice_instructions !== undefined) params.voice_instructions = options.voice_instructions;
    if (options.banner_instructions !== undefined) params.banner_instructions = options.banner_instructions;
    if (options.roundabout_exits !== undefined) params.roundabout_exits = options.roundabout_exits;
    if (options.exclude) params.exclude = options.exclude.join(',');

    return proxyRequest(`directions/v5/${profile}/${coordinatesString}`, params);
  }
};

/**
 * Isochrone Service
 */
export const isochrone = {
  /**
   * Get isochrone (reachable area) for a location
   */
  async get(
    profile: 'driving' | 'walking' | 'cycling',
    coordinates: [number, number],
    options: {
      contours_minutes?: number[];
      contours_meters?: number[];
      polygons?: boolean;
      denoise?: number;
      generalize?: number;
    } = {}
  ) {
    const params: Record<string, any> = {
      coordinates: coordinates.join(',')
    };
    
    if (options.contours_minutes) {
      params.contours_minutes = options.contours_minutes.join(',');
    }
    if (options.contours_meters) {
      params.contours_meters = options.contours_meters.join(',');
    }
    if (options.polygons !== undefined) {
      params.polygons = options.polygons;
    }
    if (options.denoise !== undefined) {
      params.denoise = options.denoise;
    }
    if (options.generalize !== undefined) {
      params.generalize = options.generalize;
    }

    return proxyRequest(`isochrone/v1/${profile}`, params);
  }
};

/**
 * Styles Service
 */
export const styles = {
  /**
   * Get map style
   */
  async get(username: string, styleId: string, options: { draft?: boolean } = {}) {
    const params: Record<string, any> = {};
    
    if (options.draft !== undefined) {
      params.draft = options.draft;
    }

    return proxyRequest(`styles/v1/${username}/${styleId}`, params);
  }
};

/**
 * Health check for Mapbox proxy
 */
export const health = {
  async check() {
    return proxyRequest('health');
  }
};

/**
 * Legacy geocoding support (for backwards compatibility)
 */
export const legacyGeocoding = {
  async forward(endpoint: string, options: Record<string, any> = {}) {
    return proxyRequest(`geocoding/v5/${endpoint}`, options);
  }
};

/**
 * Main export object with all services
 */
export const mapboxProxy = {
  geocoding,
  directions,
  isochrone,
  styles,
  health,
  legacyGeocoding
};

export default mapboxProxy;