/**
 * Advanced Waypoint Manager Hook
 * Sophisticated waypoint management with real-time route calculation and magnetic snapping
 * Ported from UnimogCommunityHub for Wheels & Wins RV trip planning
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { mapboxDirectionsAdvanced, DirectionsWaypoint, ProcessedDirections } from '@/services/mapboxDirectionsAdvanced';
import { openRouteService, OpenRouteWaypoint, ProcessedRoute } from '@/services/openRouteService';
import { toast } from 'sonner';

export interface AdvancedWaypoint extends DirectionsWaypoint {
  id: string;
  type: 'start' | 'waypoint' | 'end';
  confidence?: number;
  snapDistance?: number;
  isDragging?: boolean;
  isOptimized?: boolean;
}

export interface RouteCalculationOptions {
  provider: 'mapbox' | 'openroute' | 'auto';
  enableAlternatives: boolean;
  enableMagneticSnapping: boolean;
  snapRadius: number;
  rvOptimizations: boolean;
  realTimeUpdates: boolean;
  debounceMs: number;
}

export interface AdvancedRoute {
  id: string;
  provider: 'mapbox' | 'openroute';
  isMain: boolean;
  distance: number; // kilometers
  duration: number; // hours
  geometry: [number, number][];
  instructions: string[];
  rvSuitability: number;
  confidence: number;
  difficulty?: 'easy' | 'moderate' | 'hard' | 'extreme';
  elevationProfile?: [number, number, number][];
}

export interface WaypointManagerState {
  waypoints: AdvancedWaypoint[];
  routes: AdvancedRoute[];
  isCalculating: boolean;
  lastCalculation: number | null;
  error: string | null;
  statistics: {
    totalCalculations: number;
    averageCalculationTime: number;
    providerUsage: Record<string, number>;
  };
}

const DEFAULT_OPTIONS: RouteCalculationOptions = {
  provider: 'auto',
  enableAlternatives: true,
  enableMagneticSnapping: true,
  snapRadius: 100,
  rvOptimizations: true,
  realTimeUpdates: true,
  debounceMs: 300
};

export function useAdvancedWaypointManager(options: Partial<RouteCalculationOptions> = {}) {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };
  
  const [state, setState] = useState<WaypointManagerState>({
    waypoints: [],
    routes: [],
    isCalculating: false,
    lastCalculation: null,
    error: null,
    statistics: {
      totalCalculations: 0,
      averageCalculationTime: 0,
      providerUsage: {}
    }
  });

  // Refs for debouncing and caching
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const calculationCacheRef = useRef<Map<string, AdvancedRoute[]>>(new Map());
  const calculationTimesRef = useRef<number[]>([]);

  /**
   * Generate cache key for route calculation
   */
  const generateCacheKey = useCallback((waypoints: AdvancedWaypoint[]): string => {
    const waypointKey = waypoints
      .map(wp => `${wp.lng.toFixed(6)},${wp.lat.toFixed(6)}`)
      .join('|');
    return `${finalOptions.provider}-${waypointKey}-${finalOptions.snapRadius}`;
  }, [finalOptions.provider, finalOptions.snapRadius]);

  /**
   * Add waypoint with automatic ID generation
   */
  const addWaypoint = useCallback((waypoint: Omit<AdvancedWaypoint, 'id' | 'type'>) => {
    setState(prev => {
      const newWaypoints = [...prev.waypoints];
      const id = `waypoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      let type: 'start' | 'waypoint' | 'end';
      if (newWaypoints.length === 0) {
        type = 'start';
      } else {
        // Convert previous end waypoint to regular waypoint
        const lastIndex = newWaypoints.length - 1;
        if (newWaypoints[lastIndex].type === 'end') {
          newWaypoints[lastIndex] = { ...newWaypoints[lastIndex], type: 'waypoint' };
        }
        type = 'end';
      }

      const newWaypoint: AdvancedWaypoint = {
        ...waypoint,
        id,
        type
      };

      newWaypoints.push(newWaypoint);

      return {
        ...prev,
        waypoints: newWaypoints,
        error: null
      };
    });
  }, []);

  /**
   * Update waypoint by ID
   */
  const updateWaypoint = useCallback((id: string, updates: Partial<AdvancedWaypoint>) => {
    setState(prev => ({
      ...prev,
      waypoints: prev.waypoints.map(wp => 
        wp.id === id ? { ...wp, ...updates } : wp
      ),
      error: null
    }));
  }, []);

  /**
   * Remove waypoint by ID
   */
  const removeWaypoint = useCallback((id: string) => {
    setState(prev => {
      const newWaypoints = prev.waypoints.filter(wp => wp.id !== id);
      
      // Ensure we have proper start/end types
      if (newWaypoints.length > 0) {
        newWaypoints[0] = { ...newWaypoints[0], type: 'start' };
        if (newWaypoints.length > 1) {
          const lastIndex = newWaypoints.length - 1;
          newWaypoints[lastIndex] = { ...newWaypoints[lastIndex], type: 'end' };
          
          // Set middle waypoints
          for (let i = 1; i < lastIndex; i++) {
            newWaypoints[i] = { ...newWaypoints[i], type: 'waypoint' };
          }
        }
      }

      return {
        ...prev,
        waypoints: newWaypoints,
        error: null
      };
    });
  }, []);

  /**
   * Move waypoint to new position
   */
  const moveWaypoint = useCallback((id: string, newPosition: { lat: number; lng: number }) => {
    updateWaypoint(id, { ...newPosition, isDragging: false });
  }, [updateWaypoint]);

  /**
   * Clear all waypoints
   */
  const clearWaypoints = useCallback(() => {
    setState(prev => ({
      ...prev,
      waypoints: [],
      routes: [],
      error: null
    }));
    
    // Clear cache
    calculationCacheRef.current.clear();
  }, []);

  /**
   * Reorder waypoints
   */
  const reorderWaypoints = useCallback((fromIndex: number, toIndex: number) => {
    setState(prev => {
      const newWaypoints = [...prev.waypoints];
      const [moved] = newWaypoints.splice(fromIndex, 1);
      newWaypoints.splice(toIndex, 0, moved);

      // Update types
      if (newWaypoints.length > 0) {
        newWaypoints.forEach((wp, index) => {
          if (index === 0) wp.type = 'start';
          else if (index === newWaypoints.length - 1) wp.type = 'end';
          else wp.type = 'waypoint';
        });
      }

      return {
        ...prev,
        waypoints: newWaypoints,
        error: null
      };
    });
  }, []);

  /**
   * Calculate routes using selected provider
   */
  const calculateRoutes = useCallback(async (waypoints: AdvancedWaypoint[]): Promise<AdvancedRoute[]> => {
    if (waypoints.length < 2) {
      return [];
    }

    const startTime = performance.now();
    const routes: AdvancedRoute[] = [];

    try {
      // Determine which provider to use
      const provider = finalOptions.provider === 'auto' 
        ? (waypoints.length > 10 || waypoints.some(wp => wp.bearing) ? 'mapbox' : 'openroute')
        : finalOptions.provider;

      console.log(`🧭 Calculating routes using ${provider} for ${waypoints.length} waypoints`);

      if (provider === 'mapbox') {
        // Use enhanced Mapbox Directions
        const result = await mapboxDirectionsAdvanced.calculateEnhancedRoute(
          waypoints.map(wp => ({
            lng: wp.lng,
            lat: wp.lat,
            name: wp.name,
            bearing: wp.bearing,
            snapRadius: wp.snapRadius || finalOptions.snapRadius
          })),
          {
            enableMagneticRouting: finalOptions.enableMagneticSnapping,
            defaultSnapRadius: finalOptions.snapRadius,
            alternatives: finalOptions.enableAlternatives
          }
        );

        if (result) {
          // Add main route
          routes.push({
            id: `mapbox-main-${Date.now()}`,
            provider: 'mapbox',
            isMain: true,
            distance: result.mainRoute.distance,
            duration: result.mainRoute.duration,
            geometry: result.mainRoute.geometry,
            instructions: result.mainRoute.instructions.map(inst => inst.text),
            rvSuitability: result.mainRoute.rvSuitability,
            confidence: result.mainRoute.confidence
          });

          // Add alternative routes
          result.alternatives.forEach((alt, index) => {
            routes.push({
              id: `mapbox-alt-${index}-${Date.now()}`,
              provider: 'mapbox',
              isMain: false,
              distance: alt.distance,
              duration: alt.duration,
              geometry: alt.geometry,
              instructions: alt.instructions.map(inst => inst.text),
              rvSuitability: alt.rvSuitability,
              confidence: alt.confidence
            });
          });
        }
      } else {
        // Use OpenRoute Service for advanced RV routing
        const result = await openRouteService.calculateAdvancedRoute(
          waypoints.map(wp => ({
            lat: wp.lat,
            lng: wp.lng,
            name: wp.name
          })),
          {
            profile: 'driving-hgv',
            alternatives: finalOptions.enableAlternatives ? 2 : 0,
            restrictions: {
              height: 4.0,
              width: 2.5,
              length: 12.0,
              weight: 7.5
            }
          }
        );

        if (result) {
          // Add main route
          routes.push({
            id: `openroute-main-${Date.now()}`,
            provider: 'openroute',
            isMain: true,
            distance: result.distance,
            duration: result.duration,
            geometry: result.geometry.map(coord => [coord[0], coord[1]]),
            instructions: result.instructions,
            rvSuitability: result.rvSuitability,
            confidence: 0.9, // OpenRoute generally high confidence
            difficulty: result.difficulty,
            elevationProfile: result.elevation.data
          });

          // Add alternative routes
          result.alternatives?.forEach((alt, index) => {
            routes.push({
              id: `openroute-alt-${index}-${Date.now()}`,
              provider: 'openroute',
              isMain: false,
              distance: alt.distance,
              duration: alt.duration,
              geometry: alt.geometry.map(coord => [coord[0], coord[1]]),
              instructions: alt.instructions,
              rvSuitability: alt.rvSuitability,
              confidence: 0.9,
              difficulty: alt.difficulty,
              elevationProfile: alt.elevation.data
            });
          });
        }
      }

      // Update statistics
      const calculationTime = performance.now() - startTime;
      calculationTimesRef.current.push(calculationTime);
      if (calculationTimesRef.current.length > 50) {
        calculationTimesRef.current = calculationTimesRef.current.slice(-50); // Keep last 50
      }

      setState(prev => ({
        ...prev,
        statistics: {
          ...prev.statistics,
          totalCalculations: prev.statistics.totalCalculations + 1,
          averageCalculationTime: calculationTimesRef.current.reduce((a, b) => a + b, 0) / calculationTimesRef.current.length,
          providerUsage: {
            ...prev.statistics.providerUsage,
            [provider]: (prev.statistics.providerUsage[provider] || 0) + 1
          }
        }
      }));

      console.log(`✅ Route calculation completed in ${calculationTime.toFixed(0)}ms using ${provider}:`, {
        routes: routes.length,
        mainDistance: routes[0] ? `${routes[0].distance.toFixed(1)}km` : 'N/A',
        alternatives: routes.length - 1
      });

      return routes;

    } catch (error) {
      console.error('Route calculation failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Route calculation failed'
      }));
      return [];
    }
  }, [finalOptions]);

  /**
   * Debounced route calculation
   */
  const debouncedCalculateRoutes = useCallback(() => {
    if (state.waypoints.length < 2) return;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Check cache first
    const cacheKey = generateCacheKey(state.waypoints);
    const cachedRoutes = calculationCacheRef.current.get(cacheKey);
    
    if (cachedRoutes) {
      console.log('📦 Using cached routes');
      setState(prev => ({
        ...prev,
        routes: cachedRoutes,
        lastCalculation: Date.now()
      }));
      return;
    }

    // Set calculating state
    setState(prev => ({ ...prev, isCalculating: true, error: null }));

    // Debounce the calculation
    debounceTimeoutRef.current = setTimeout(async () => {
      const routes = await calculateRoutes(state.waypoints);
      
      // Cache the result
      if (routes.length > 0) {
        calculationCacheRef.current.set(cacheKey, routes);
        
        // Limit cache size
        if (calculationCacheRef.current.size > 20) {
          const firstKey = calculationCacheRef.current.keys().next().value;
          calculationCacheRef.current.delete(firstKey);
        }
      }

      setState(prev => ({
        ...prev,
        routes,
        isCalculating: false,
        lastCalculation: Date.now()
      }));

    }, finalOptions.debounceMs);
  }, [state.waypoints, calculateRoutes, generateCacheKey, finalOptions.debounceMs]);

  /**
   * Manual route recalculation
   */
  const recalculateRoutes = useCallback(() => {
    calculationCacheRef.current.clear();
    debouncedCalculateRoutes();
  }, [debouncedCalculateRoutes]);

  /**
   * Get main route
   */
  const getMainRoute = useCallback((): AdvancedRoute | null => {
    return state.routes.find(route => route.isMain) || null;
  }, [state.routes]);

  /**
   * Get alternative routes
   */
  const getAlternativeRoutes = useCallback((): AdvancedRoute[] => {
    return state.routes.filter(route => !route.isMain);
  }, [state.routes]);

  // Effect for real-time updates
  useEffect(() => {
    if (finalOptions.realTimeUpdates && state.waypoints.length >= 2) {
      debouncedCalculateRoutes();
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [state.waypoints, finalOptions.realTimeUpdates, debouncedCalculateRoutes]);

  return {
    // State
    waypoints: state.waypoints,
    routes: state.routes,
    isCalculating: state.isCalculating,
    error: state.error,
    statistics: state.statistics,
    
    // Waypoint management
    addWaypoint,
    updateWaypoint,
    removeWaypoint,
    moveWaypoint,
    clearWaypoints,
    reorderWaypoints,
    
    // Route management
    recalculateRoutes,
    getMainRoute,
    getAlternativeRoutes,
    
    // Utilities
    hasRoutes: state.routes.length > 0,
    hasError: !!state.error,
    lastCalculation: state.lastCalculation
  };
}