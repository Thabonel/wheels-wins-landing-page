import { useState, useCallback, useEffect } from 'react';
import { useAdvancedWaypointManager, AdvancedWaypoint, AdvancedRoute } from '@/hooks/useAdvancedWaypointManager';
import { mapboxProxy } from '@/services/mapboxProxy';
import { toast } from 'sonner';

export type Difficulty = 'easy' | 'moderate' | 'challenging' | 'expert';

export type TerrainType = 'highways' | 'backroads' | 'scenic_routes' | 'mountain_roads' | 'coastal' | 'desert' | string;

export interface TripPlan {
  id: string;
  title: string;
  startLocation: string;
  endLocation: string;
  waypoints: AdvancedWaypoint[];
  routes: AdvancedRoute[];
  distance: number;
  duration: number;
  difficulty: Difficulty;
  terrainTypes: TerrainType[];
  poiTypes: string[];
  rvSuitability: number;
  confidence: number;
  elevationProfile?: [number, number, number][];
  instructions: string[];
}

export function useTripPlanning() {
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('moderate');
  const [selectedTerrainTypes, setSelectedTerrainTypes] = useState<TerrainType[]>([]);
  const [selectedPois, setSelectedPois] = useState<string[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);

  // Initialize advanced waypoint manager
  const waypointManager = useAdvancedWaypointManager({
    provider: 'auto',
    enableAlternatives: true,
    enableMagneticSnapping: true,
    snapRadius: 150, // Larger radius for RV-friendly roads
    rvOptimizations: true,
    realTimeUpdates: false, // Manual control for better UX
    debounceMs: 500
  });
  
  const generateTripId = () => {
    return `trip-${Math.floor(Math.random() * 10000)}-${Date.now()}`;
  };
  
  /**
   * Geocode location string to coordinates
   */
  const geocodeLocation = useCallback(async (location: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await mapboxProxy.geocoding.forward(location, {
        limit: 1,
        types: ['place', 'locality', 'neighborhood', 'address']
      });

      if (response?.features && response.features.length > 0) {
        const [lng, lat] = response.features[0].center;
        return { lat, lng };
      }
      return null;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return null;
    }
  }, []);

  /**
   * Convert terrain preferences to routing options
   */
  const getRoutingOptionsFromPreferences = useCallback(() => {
    const avoidFeatures: string[] = [];
    
    // Convert terrain preferences to routing constraints
    if (!selectedTerrainTypes.includes('highways')) {
      // Don't avoid highways by default for RV travel
    }
    
    if (selectedTerrainTypes.includes('scenic_routes')) {
      // Prefer scenic routes - this would be handled by the routing service
    }
    
    if (selectedTerrainTypes.includes('mountain_roads') && difficulty === 'easy') {
      // For easy difficulty, avoid mountain roads
      avoidFeatures.push('steep_roads');
    }

    return {
      avoidFeatures,
      difficulty,
      terrainTypes: selectedTerrainTypes,
      poiTypes: selectedPois
    };
  }, [selectedTerrainTypes, selectedPois, difficulty]);

  /**
   * Plan trip with advanced routing
   */
  const planTrip = async () => {
    if (!startLocation || !endLocation) {
      toast.error('Please enter both start and end locations');
      return null;
    }
    
    setIsPlanning(true);
    
    try {
      console.log('🗺️ Planning advanced trip:', { startLocation, endLocation });

      // Clear existing waypoints
      waypointManager.clearWaypoints();

      // Geocode start and end locations
      const [startCoords, endCoords] = await Promise.all([
        geocodeLocation(startLocation),
        geocodeLocation(endLocation)
      ]);

      if (!startCoords) {
        toast.error(`Could not find location: ${startLocation}`);
        setIsPlanning(false);
        return null;
      }

      if (!endCoords) {
        toast.error(`Could not find location: ${endLocation}`);
        setIsPlanning(false);
        return null;
      }

      // Add waypoints to the manager
      waypointManager.addWaypoint({
        lat: startCoords.lat,
        lng: startCoords.lng,
        name: startLocation,
        snapRadius: 150 // RV-friendly snap radius
      });

      waypointManager.addWaypoint({
        lat: endCoords.lat,
        lng: endCoords.lng,
        name: endLocation,
        snapRadius: 150
      });

      // Trigger route calculation
      waypointManager.recalculateRoutes();

      // Wait for route calculation to complete
      await new Promise(resolve => {
        const checkRoutes = () => {
          if (!waypointManager.isCalculating && waypointManager.hasRoutes) {
            resolve(true);
          } else if (!waypointManager.isCalculating && waypointManager.hasError) {
            resolve(false);
          } else {
            setTimeout(checkRoutes, 100);
          }
        };
        checkRoutes();
      });

      if (waypointManager.hasError) {
        toast.error('Failed to calculate route');
        setIsPlanning(false);
        return null;
      }

      if (!waypointManager.hasRoutes) {
        toast.error('No route found between locations');
        setIsPlanning(false);
        return null;
      }

      const mainRoute = waypointManager.getMainRoute();
      if (!mainRoute) {
        toast.error('No main route available');
        setIsPlanning(false);
        return null;
      }

      // Create enhanced trip plan
      const enhancedTripPlan: TripPlan = {
        id: generateTripId(),
        title: `${startLocation} to ${endLocation}`,
        startLocation,
        endLocation,
        waypoints: waypointManager.waypoints,
        routes: waypointManager.routes,
        distance: mainRoute.distance,
        duration: mainRoute.duration,
        difficulty,
        terrainTypes: selectedTerrainTypes.length > 0 ? selectedTerrainTypes : ['highways', 'scenic_routes'],
        poiTypes: selectedPois,
        rvSuitability: mainRoute.rvSuitability,
        confidence: mainRoute.confidence,
        elevationProfile: mainRoute.elevationProfile,
        instructions: mainRoute.instructions
      };
      
      setTripPlan(enhancedTripPlan);
      setIsPlanning(false);

      toast.success(`Route planned successfully! ${mainRoute.distance.toFixed(1)}km, ${mainRoute.duration.toFixed(1)}h estimated`);
      
      return enhancedTripPlan;

    } catch (error) {
      console.error("Failed to plan trip:", error);
      toast.error('Trip planning failed. Please try again.');
      setIsPlanning(false);
      return null;
    }
  };
  
  const clearPlan = useCallback(() => {
    setTripPlan(null);
    waypointManager.clearWaypoints();
  }, [waypointManager]);

  /**
   * Add intermediate waypoint
   */
  const addWaypoint = useCallback(async (location: string) => {
    const coords = await geocodeLocation(location);
    if (coords) {
      waypointManager.addWaypoint({
        lat: coords.lat,
        lng: coords.lng,
        name: location,
        snapRadius: 150
      });
      
      // Auto-recalculate if we have a complete route
      if (waypointManager.waypoints.length >= 2) {
        waypointManager.recalculateRoutes();
      }
    } else {
      toast.error(`Could not find location: ${location}`);
    }
  }, [geocodeLocation, waypointManager]);

  /**
   * Remove waypoint by ID
   */
  const removeWaypoint = useCallback((waypointId: string) => {
    waypointManager.removeWaypoint(waypointId);
    
    // Auto-recalculate remaining route
    if (waypointManager.waypoints.length >= 2) {
      waypointManager.recalculateRoutes();
    }
  }, [waypointManager]);

  /**
   * Get alternative routes
   */
  const getAlternativeRoutes = useCallback(() => {
    return waypointManager.getAlternativeRoutes();
  }, [waypointManager]);

  /**
   * Switch to alternative route
   */
  const switchToAlternativeRoute = useCallback((routeId: string) => {
    const alternativeRoute = waypointManager.routes.find(r => r.id === routeId);
    if (alternativeRoute && tripPlan) {
      // Update trip plan with the selected alternative route
      const updatedPlan: TripPlan = {
        ...tripPlan,
        distance: alternativeRoute.distance,
        duration: alternativeRoute.duration,
        rvSuitability: alternativeRoute.rvSuitability,
        confidence: alternativeRoute.confidence,
        elevationProfile: alternativeRoute.elevationProfile,
        instructions: alternativeRoute.instructions
      };
      setTripPlan(updatedPlan);
      toast.success('Switched to alternative route');
    }
  }, [tripPlan, waypointManager.routes]);

  // Sync trip planner state changes with waypoint manager
  useEffect(() => {
    if (tripPlan && waypointManager.waypoints.length !== tripPlan.waypoints.length) {
      // Update trip plan when waypoints change
      const mainRoute = waypointManager.getMainRoute();
      if (mainRoute) {
        setTripPlan(prev => prev ? {
          ...prev,
          waypoints: waypointManager.waypoints,
          routes: waypointManager.routes,
          distance: mainRoute.distance,
          duration: mainRoute.duration,
          rvSuitability: mainRoute.rvSuitability,
          confidence: mainRoute.confidence,
          elevationProfile: mainRoute.elevationProfile,
          instructions: mainRoute.instructions
        } : null);
      }
    }
  }, [waypointManager.waypoints.length, waypointManager.routes, tripPlan]);
  
  return {
    // Basic trip planning
    startLocation,
    setStartLocation,
    endLocation,
    setEndLocation,
    difficulty,
    setDifficulty,
    selectedTerrainTypes,
    setSelectedTerrainTypes,
    selectedPois,
    setSelectedPois,
    isPlanning,
    tripPlan,
    planTrip,
    clearPlan,
    
    // Advanced waypoint management
    waypoints: waypointManager.waypoints,
    routes: waypointManager.routes,
    addWaypoint,
    removeWaypoint,
    getAlternativeRoutes,
    switchToAlternativeRoute,
    isCalculatingRoute: waypointManager.isCalculating,
    routeError: waypointManager.error,
    routeStatistics: waypointManager.statistics,
    
    // Route utilities
    hasRoutes: waypointManager.hasRoutes,
    mainRoute: waypointManager.getMainRoute(),
    alternativeRoutes: waypointManager.getAlternativeRoutes()
  };
}