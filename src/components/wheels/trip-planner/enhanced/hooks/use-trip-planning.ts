import { useState } from 'react';
import { geocodeLocation, fetchRoute, formatRouteInfo } from '../map/utils/mapRouteUtils';

export type Difficulty = 'easy' | 'moderate' | 'challenging' | 'expert';

export type TerrainType = 'highways' | 'backroads' | 'scenic_routes' | 'mountain_roads' | 'coastal' | 'desert' | string;

export interface TripPlan {
  id: string;
  title: string;
  startLocation: string;
  endLocation: string;
  waypoints: string[];
  distance: number;
  duration: number;
  difficulty: Difficulty;
  terrainTypes: TerrainType[];
  poiTypes: string[];
  route?: any; // Store the actual route data from Mapbox
}

export function useTripPlanning() {
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('moderate');
  const [selectedTerrainTypes, setSelectedTerrainTypes] = useState<TerrainType[]>([]);
  const [selectedPois, setSelectedPois] = useState<string[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  
  const generateTripId = () => {
    return `trip-${Math.floor(Math.random() * 10000)}-${Date.now()}`;
  };
  
  const planTrip = async () => {
    if (!startLocation || !endLocation) {
      return null;
    }
    
    setIsPlanning(true);
    
    try {
      // Check if Mapbox token is available
      const token = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
      
      if (!token) {
        // Fall back to mock data if no token
        console.warn('No Mapbox token available, using mock data');
        const mockTripPlan: TripPlan = {
          id: generateTripId(),
          title: `${startLocation} to ${endLocation}`,
          startLocation,
          endLocation,
          waypoints: [],
          distance: Math.floor(Math.random() * 500) + 50,
          duration: Math.floor(Math.random() * 10) + 1,
          difficulty,
          terrainTypes: selectedTerrainTypes.length > 0 ? selectedTerrainTypes : ['highways', 'scenic_routes'],
          poiTypes: selectedPois
        };
        
        await new Promise(resolve => setTimeout(resolve, 500));
        setTripPlan(mockTripPlan);
        setIsPlanning(false);
        return mockTripPlan;
      }
      
      // Geocode locations
      const [startCoords, endCoords] = await Promise.all([
        geocodeLocation(startLocation),
        geocodeLocation(endLocation)
      ]);
      
      if (!startCoords || !endCoords) {
        throw new Error('Could not geocode locations');
      }
      
      // Fetch actual route from Mapbox
      const route = await fetchRoute(startCoords, endCoords, {
        profile: difficulty === 'easy' ? 'driving' : 'driving-traffic',
        alternatives: true
      });
      
      if (!route) {
        throw new Error('Could not calculate route');
      }
      
      // Format route info
      const routeInfo = formatRouteInfo(route);
      
      // Create trip plan with real data
      const tripPlan: TripPlan = {
        id: generateTripId(),
        title: `${startLocation} to ${endLocation}`,
        startLocation,
        endLocation,
        waypoints: [],
        distance: routeInfo.distanceValue,
        duration: Math.ceil(routeInfo.durationValue / (8 * 60)), // Convert minutes to days (assuming 8 hours driving per day)
        difficulty,
        terrainTypes: selectedTerrainTypes.length > 0 ? selectedTerrainTypes : ['highways', 'scenic_routes'],
        poiTypes: selectedPois,
        route: route // Store the actual route data
      };
      
      setTripPlan(tripPlan);
      setIsPlanning(false);
      return tripPlan;
    } catch (error) {
      console.error("Failed to plan trip:", error);
      
      // Fall back to mock data on error
      const mockTripPlan: TripPlan = {
        id: generateTripId(),
        title: `${startLocation} to ${endLocation}`,
        startLocation,
        endLocation,
        waypoints: [],
        distance: Math.floor(Math.random() * 500) + 50,
        duration: Math.floor(Math.random() * 10) + 1,
        difficulty,
        terrainTypes: selectedTerrainTypes.length > 0 ? selectedTerrainTypes : ['highways', 'scenic_routes'],
        poiTypes: selectedPois
      };
      
      setTripPlan(mockTripPlan);
      setIsPlanning(false);
      return mockTripPlan;
    }
  };
  
  const clearPlan = () => {
    setTripPlan(null);
  };
  
  return {
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
    clearPlan
  };
}