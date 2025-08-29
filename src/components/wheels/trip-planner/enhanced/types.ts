import { Difficulty, TerrainType } from './hooks/use-trip-planning';

export interface TripPlannerProps {
  onClose: () => void;
  templateData?: any;
  integratedState?: any;
  onRouteUpdate?: (route: any) => void;
  onBudgetUpdate?: (budget: any) => void;
}

export interface RouteFormProps {
  startLocation: string;
  setStartLocation: (value: string) => void;
  endLocation: string;
  setEndLocation: (value: string) => void;
  difficulty: Difficulty;
  setDifficulty: (value: Difficulty) => void;
}

export interface TerrainFormProps {
  selectedTerrainTypes: TerrainType[];
  handleTerrainChange: (terrain: string) => void;
}

export interface PoiFormProps {
  selectedPois: string[];
  handlePoiChange: (poi: string) => void;
}

export interface TripSummaryProps {
  title?: string;
  startLocation: string;
  endLocation: string;
  distance?: number;
  duration?: number;
  difficulty: Difficulty;
  terrainTypes: string[];
  elevationGain?: number;
}