/**
 * Trip Planner Bridge Service
 * Connects PAM AI SDK responses to the Trip Planner functionality
 */

import { parseRoute } from './routeParser';

export interface TripPlannerAction {
  type: 'ADD_ROUTE' | 'ADD_WAYPOINT' | 'SET_BUDGET' | 'CLEAR_ROUTE';
  payload: any;
}

export interface ParsedRoute {
  origin: string;
  destination: string;
  waypoints?: string[];
  preferDirtRoads?: boolean;
  avoidHighways?: boolean;
}

export class TripPlannerBridge {
  private static instance: TripPlannerBridge;
  private callbacks: Map<string, (action: TripPlannerAction) => void> = new Map();

  private constructor() {}

  static getInstance(): TripPlannerBridge {
    if (!TripPlannerBridge.instance) {
      TripPlannerBridge.instance = new TripPlannerBridge();
    }
    return TripPlannerBridge.instance;
  }

  /**
   * Register a callback for trip planner actions
   */
  register(id: string, callback: (action: TripPlannerAction) => void) {
    this.callbacks.set(id, callback);
  }

  /**
   * Unregister a callback
   */
  unregister(id: string) {
    this.callbacks.delete(id);
  }

  /**
   * Parse PAM's response and extract trip planning intent
   */
  parsePAMResponse(message: string): ParsedRoute | null {
    // Look for trip planning keywords
    const tripKeywords = [
      'trip from', 'route from', 'drive from', 'travel from',
      'plan a trip', 'plan a route', 'directions to'
    ];

    const hasTripIntent = tripKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (!hasTripIntent) {
      return null;
    }

    // Extract locations using patterns
    const patterns = [
      // "from X to Y"
      /(?:from|starting from)\s+([^,\s]+(?:\s+[^,\s]+)*)\s+(?:to|heading to|going to)\s+([^,\.\n]+)/i,
      // "trip to Y from X"
      /trip\s+to\s+([^,\s]+(?:\s+[^,\s]+)*)\s+from\s+([^,\.\n]+)/i,
      // "X to Y"
      /^([^,\s]+(?:\s+[^,\s]+)*)\s+to\s+([^,\.\n]+)/i,
    ];

    let origin = '';
    let destination = '';
    let waypoints: string[] = [];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        if (pattern.source.includes('trip\\s+to')) {
          // Pattern 2: destination is first, origin is second
          destination = match[1].trim();
          origin = match[2].trim();
        } else {
          // Patterns 1 and 3: origin is first, destination is second
          origin = match[1].trim();
          destination = match[2].trim();
        }
        break;
      }
    }

    // Look for waypoints or stops
    const waypointMatch = message.match(/(?:via|through|stopping at|stop at)\s+([^,\.\n]+(?:,\s*[^,\.\n]+)*)/i);
    if (waypointMatch) {
      waypoints = waypointMatch[1].split(',').map(w => w.trim());
    }

    // Check for dirt road preference
    const preferDirtRoads = /dirt road|off-?road|unpaved|gravel/i.test(message);
    const avoidHighways = /avoid highway|no highway|back road|scenic route/i.test(message);

    if (origin && destination) {
      return {
        origin,
        destination,
        waypoints: waypoints.length > 0 ? waypoints : undefined,
        preferDirtRoads,
        avoidHighways
      };
    }

    return null;
  }

  /**
   * Send action to trip planner
   */
  sendToTripPlanner(action: TripPlannerAction) {
    this.callbacks.forEach(callback => {
      try {
        callback(action);
      } catch (error) {
        console.error('Error sending action to trip planner:', error);
      }
    });
  }

  /**
   * Process PAM message and create trip if applicable
   */
  processPAMMessage(message: string): boolean {
    const route = this.parsePAMResponse(message);
    
    if (!route) {
      return false;
    }

    // Send route to trip planner
    this.sendToTripPlanner({
      type: 'ADD_ROUTE',
      payload: route
    });

    return true;
  }

  /**
   * Manually add a route from PAM's structured response
   */
  addRoute(origin: string, destination: string, waypoints?: string[]) {
    this.sendToTripPlanner({
      type: 'ADD_ROUTE',
      payload: {
        origin,
        destination,
        waypoints
      }
    });
  }

  /**
   * Clear the current route
   */
  clearRoute() {
    this.sendToTripPlanner({
      type: 'CLEAR_ROUTE',
      payload: {}
    });
  }

  /**
   * Set trip budget
   */
  setBudget(totalBudget: number, dailyBudget?: number) {
    this.sendToTripPlanner({
      type: 'SET_BUDGET',
      payload: {
        totalBudget,
        dailyBudget: dailyBudget || Math.round(totalBudget / 7) // Default to 7-day trip
      }
    });
  }
}

// Export singleton instance
export const tripPlannerBridge = TripPlannerBridge.getInstance();