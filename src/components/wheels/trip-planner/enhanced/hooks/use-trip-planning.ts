import { useState } from 'react';

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
      // For now, create a mock trip plan - this will be connected to real API
      const mockTripPlan: TripPlan = {
        id: generateTripId(),
        title: `${startLocation} to ${endLocation}`,
        startLocation,
        endLocation,
        waypoints: [],
        distance: Math.floor(Math.random() * 500) + 50, // Random distance between 50-550 miles
        duration: Math.floor(Math.random() * 10) + 1, // Random duration between 1-10 days
        difficulty,
        terrainTypes: selectedTerrainTypes.length > 0 ? selectedTerrainTypes : ['highways', 'scenic_routes'],
        poiTypes: selectedPois
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setTripPlan(mockTripPlan);
      setIsPlanning(false);
      return mockTripPlan;
    } catch (error) {
      console.error("Failed to plan trip:", error);
      setIsPlanning(false);
      return null;
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