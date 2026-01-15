/**
 * PAM Trip Action Types
 *
 * Defines the contract between PAM's trip planning tools and the map interface.
 * When PAM plans a trip, it dispatches these actions to render routes on the map.
 */

/**
 * Types of trip actions PAM can dispatch
 */
export type PAMTripActionType =
  | 'REPLACE_ROUTE'   // Replace entire route with new waypoints
  | 'ADD_WAYPOINTS'   // Add waypoints to existing route
  | 'ADD_STOP'        // Add single stop to route
  | 'OPTIMIZE'        // Optimize existing route
  | 'CLEAR_ROUTE';    // Clear current route

/**
 * Waypoint type classification
 */
export type WaypointType = 'origin' | 'destination' | 'waypoint';

/**
 * Point of Interest categories for waypoints
 */
export type POIType =
  | 'rv_park'
  | 'campground'
  | 'fuel'
  | 'restaurant'
  | 'rest_area'
  | 'attraction'
  | 'hotel'
  | 'grocery'
  | 'medical'
  | 'pet_stop'
  | 'scenic_viewpoint'
  | 'other';

/**
 * A single waypoint in a trip action
 */
export interface PAMWaypoint {
  /** Display name of the location */
  name: string;

  /** Coordinates as [longitude, latitude] - Mapbox format */
  coordinates: [number, number];

  /** Role of this waypoint in the route */
  type: WaypointType;

  /** Optional description or notes */
  description?: string;

  /** Category of POI if applicable */
  poiType?: POIType;

  /** Full address if available */
  address?: string;

  /** Rating (1-5) if applicable */
  rating?: number;

  /** Amenities list for RV parks/campgrounds */
  amenities?: string[];

  /** Price info if available */
  price?: {
    amount: number;
    currency: string;
    period?: 'night' | 'hour' | 'day';
  };
}

/**
 * Metadata about the planned route
 */
export interface PAMRouteMetadata {
  /** Total distance in meters */
  totalDistance?: number;

  /** Total duration in seconds */
  totalDuration?: number;

  /** Estimated fuel cost */
  estimatedFuelCost?: number;

  /** Currency for cost estimates */
  currency?: string;

  /** List of suggested stops along route */
  suggestedStops?: string[];

  /** Route profile used (driving, walking, etc) */
  routeProfile?: 'driving' | 'driving-traffic' | 'walking' | 'cycling';

  /** Whether route avoids highways */
  avoidsHighways?: boolean;

  /** Whether route avoids tolls */
  avoidsTolls?: boolean;

  /** RV-specific considerations */
  rvConsiderations?: {
    heightRestrictions?: boolean;
    weightRestrictions?: boolean;
    propaneAllowed?: boolean;
  };

  /** Source tool that generated this action */
  sourceTool?: string;
}

/**
 * Main action interface dispatched from PAM to map
 */
export interface PAMTripAction {
  /** Type of action to perform */
  type: PAMTripActionType;

  /** Waypoints to add/replace */
  waypoints: PAMWaypoint[];

  /** Route metadata */
  metadata?: PAMRouteMetadata;

  /** Whether to show confirmation dialog before applying */
  requiresConfirmation: boolean;

  /** Unique ID for this action (for tracking/undo) */
  actionId?: string;

  /** Timestamp when action was created */
  timestamp?: number;

  /** Human-readable summary of the action */
  summary?: string;
}

/**
 * Result of applying a trip action
 */
export interface PAMTripActionResult {
  /** Whether action was applied successfully */
  success: boolean;

  /** Action ID that was processed */
  actionId?: string;

  /** Error message if failed */
  error?: string;

  /** Final waypoint count after action */
  waypointCount?: number;

  /** Calculated route distance */
  routeDistance?: number;

  /** Calculated route duration */
  routeDuration?: number;
}

/**
 * Type guard to check if an object is a valid PAMTripAction
 */
export function isPAMTripAction(obj: unknown): obj is PAMTripAction {
  if (!obj || typeof obj !== 'object') return false;

  const action = obj as PAMTripAction;

  return (
    typeof action.type === 'string' &&
    ['REPLACE_ROUTE', 'ADD_WAYPOINTS', 'ADD_STOP', 'OPTIMIZE', 'CLEAR_ROUTE'].includes(action.type) &&
    Array.isArray(action.waypoints) &&
    typeof action.requiresConfirmation === 'boolean'
  );
}

/**
 * Type guard to check if an object is a valid PAMWaypoint
 */
export function isPAMWaypoint(obj: unknown): obj is PAMWaypoint {
  if (!obj || typeof obj !== 'object') return false;

  const waypoint = obj as PAMWaypoint;

  return (
    typeof waypoint.name === 'string' &&
    Array.isArray(waypoint.coordinates) &&
    waypoint.coordinates.length === 2 &&
    typeof waypoint.coordinates[0] === 'number' &&
    typeof waypoint.coordinates[1] === 'number' &&
    ['origin', 'destination', 'waypoint'].includes(waypoint.type)
  );
}

/**
 * Create a PAMTripAction with defaults
 */
export function createPAMTripAction(
  type: PAMTripActionType,
  waypoints: PAMWaypoint[],
  options?: Partial<Omit<PAMTripAction, 'type' | 'waypoints'>>
): PAMTripAction {
  return {
    type,
    waypoints,
    requiresConfirmation: options?.requiresConfirmation ?? (type === 'REPLACE_ROUTE' || waypoints.length > 1),
    actionId: options?.actionId ?? `pam-trip-${Date.now()}`,
    timestamp: options?.timestamp ?? Date.now(),
    metadata: options?.metadata,
    summary: options?.summary,
  };
}

/**
 * Determine if an action should require confirmation based on type and waypoints
 */
export function shouldRequireConfirmation(type: PAMTripActionType, waypointCount: number): boolean {
  switch (type) {
    case 'REPLACE_ROUTE':
      return true; // Always confirm replacing entire route
    case 'ADD_STOP':
      return waypointCount > 1; // Single stop auto-applies
    case 'ADD_WAYPOINTS':
      return waypointCount > 1; // Multiple waypoints need confirmation
    case 'OPTIMIZE':
      return true; // Always confirm optimization changes
    case 'CLEAR_ROUTE':
      return true; // Always confirm clearing
    default:
      return true;
  }
}
