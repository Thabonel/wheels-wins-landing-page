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
   * Plan trip with simplified debugging approach
   */
  const planTrip = async () => {
    if (!startLocation || !endLocation) {
      toast.error('Please enter both start and end locations');
      return null;
    }
    
    setIsPlanning(true);
    
    try {
      console.log('🗺️ Planning trip:', { startLocation, endLocation });

      // Test geocoding first
      console.log('📍 Testing geocoding...');
      const startCoords = await geocodeLocation(startLocation);
      console.log('📍 Start coordinates:', startCoords);
      
      if (!startCoords) {
        console.error('❌ Geocoding failed for start location:', startLocation);
        toast.error(`Could not find location: ${startLocation}`);
        setIsPlanning(false);
        return null;
      }

      const endCoords = await geocodeLocation(endLocation);
      console.log('📍 End coordinates:', endCoords);
      
      if (!endCoords) {
        console.error('❌ Geocoding failed for end location:', endLocation);
        toast.error(`Could not find location: ${endLocation}`);
        setIsPlanning(false);
        return null;
      }

      console.log('✅ Geocoding successful, creating waypoints...');

      // Clear existing waypoints
      waypointManager.clearWaypoints();

      // Add waypoints manually for debugging with proper types
      console.log('🎯 Adding start waypoint:', { lat: startCoords.lat, lng: startCoords.lng, name: startLocation });
      waypointManager.addWaypoint({
        lat: startCoords.lat,
        lng: startCoords.lng,
        name: startLocation,
        snapRadius: 150,
        type: 'start'
      });

      console.log('🎯 Adding end waypoint:', { lat: endCoords.lat, lng: endCoords.lng, name: endLocation });
      waypointManager.addWaypoint({
        lat: endCoords.lat,
        lng: endCoords.lng,
        name: endLocation,
        snapRadius: 150,
        type: 'end'
      });

      console.log('🗺️ Current waypoints after adding:', waypointManager.waypoints.length);
      console.log('🗺️ Waypoint details:', waypointManager.waypoints);

      // Trigger route calculation
      console.log('⚡ Triggering route calculation...');
      waypointManager.recalculateRoutes();

      // Give it some time and check status
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('📊 Route calculation status:', {
        isCalculating: waypointManager.isCalculating,
        hasRoutes: waypointManager.hasRoutes,
        hasError: waypointManager.hasError,
        error: waypointManager.error,
        routesCount: waypointManager.routes.length
      });

      if (waypointManager.hasError) {
        console.error('❌ Route calculation error:', waypointManager.error);
        toast.error(`Route calculation failed: ${waypointManager.error}`);
        setIsPlanning(false);
        return null;
      }

      // For now, create a simplified trip plan even if route calculation fails
      const simplifiedTripPlan: TripPlan = {
        id: generateTripId(),
        title: `${startLocation} to ${endLocation}`,
        startLocation,
        endLocation,
        waypoints: waypointManager.waypoints,
        routes: waypointManager.routes,
        distance: waypointManager.routes.length > 0 ? waypointManager.routes[0].distance : 100, // fallback
        duration: waypointManager.routes.length > 0 ? waypointManager.routes[0].duration : 2, // fallback
        difficulty,
        terrainTypes: selectedTerrainTypes.length > 0 ? selectedTerrainTypes : ['highways', 'scenic_routes'],
        poiTypes: selectedPois,
        rvSuitability: waypointManager.routes.length > 0 ? waypointManager.routes[0].rvSuitability : 75, // fallback
        confidence: waypointManager.routes.length > 0 ? waypointManager.routes[0].confidence : 0.8, // fallback
        elevationProfile: waypointManager.routes.length > 0 ? waypointManager.routes[0].elevationProfile : undefined,
        instructions: waypointManager.routes.length > 0 ? waypointManager.routes[0].instructions : [`Drive from ${startLocation} to ${endLocation}`]
      };
      
      setTripPlan(simplifiedTripPlan);
      setIsPlanning(false);

      console.log('✅ Trip plan created:', simplifiedTripPlan);
      
      if (waypointManager.routes.length > 0) {
        const mainRoute = waypointManager.routes[0];
        toast.success(`Route planned! ${mainRoute.distance.toFixed(1)}km, ${mainRoute.duration.toFixed(1)}h estimated`);
      } else {
        toast.success('Trip waypoints created. Route calculation may still be in progress.');
      }
      
      return simplifiedTripPlan;

    } catch (error) {
      console.error("❌ Failed to plan trip:", error);
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
        snapRadius: 150,
        type: 'waypoint'
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