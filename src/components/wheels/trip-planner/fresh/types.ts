export interface Waypoint {
  id: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  address?: string;
  type: 'origin' | 'destination' | 'waypoint';
  arrivalTime?: Date;
  notes?: string;
}

export interface Route {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: any; // GeoJSON geometry
  legs: RouteLeg[];
}

export interface RouteLeg {
  distance: number;
  duration: number;
  steps: RouteStep[];
}

export interface RouteStep {
  distance: number;
  duration: number;
  instruction: string;
  maneuver: any;
}