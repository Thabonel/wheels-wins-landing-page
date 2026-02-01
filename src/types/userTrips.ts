/**
 * Type definitions for user_trips table and related PAM trip functionality
 */

export interface UserTripMetadata {
  // PAM-specific fields
  created_by?: 'pam_ai' | 'user';
  source?: 'pam' | 'manual';

  // Trip planning data
  origin?: string;
  destination?: string;
  stops?: string[];

  // Route data (enhanced with our new transformer utilities)
  route_data?: {
    waypoints: Array<{
      name: string;
      coordinates: [number, number]; // [lng, lat]
      address?: string;
      type?: 'origin' | 'destination' | 'waypoint';
    }>;
    route?: {
      type: 'LineString';
      coordinates: [number, number][]; // [lng, lat] pairs
    };
    distance?: number; // in meters
    duration?: number; // in seconds
    profile?: string;
  };

  // Cost estimates
  distance_miles?: number;
  duration_hours?: number;
  fuel_gallons?: number;
  estimated_cost?: number;

  // PAM tool metadata
  route_source?: 'mapbox_navigator' | 'estimated';
  sourceTool?: string;

  // Additional metadata
  [key: string]: any;
}

export interface UserTrip {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  total_budget?: number;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  trip_type?: string;
  privacy_level: 'private' | 'shared' | 'public';
  metadata: UserTripMetadata | null;
  created_at: string;
  updated_at: string;
}

// Alias for compatibility with existing code
export type SavedTrip = UserTrip;

// PAM Trip Action types (for bridge communication)
export interface PAMTripAction {
  type: 'REPLACE_ROUTE' | 'ADD_STOP' | 'ADD_WAYPOINTS' | 'OPTIMIZE' | 'CLEAR_ROUTE';
  waypoints: Array<{
    name: string;
    coordinates: [number, number];
    type: 'origin' | 'destination' | 'waypoint';
    description?: string;
  }>;
  metadata?: {
    totalDistance?: number;
    totalDuration?: number;
    estimatedFuelCost?: number;
    sourceTool?: string;
  };
  requiresConfirmation?: boolean;
  actionId?: string;
}

// Trip service response types
export interface TripServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

// Enhanced trip data for frontend use
export interface TripPlannerData {
  waypoints: Array<{
    name: string;
    coordinates: [number, number];
    type: 'origin' | 'destination' | 'waypoint';
  }>;
  route?: {
    distance?: number;
    duration?: number;
    geometry?: {
      type: 'LineString';
      coordinates: [number, number][];
    };
  };
  profile?: string;
}

// Database table names (for type-safe queries)
export const DATABASE_TABLES = {
  USER_TRIPS: 'user_trips',
  PROFILES: 'profiles',
  // Add other tables as needed
} as const;