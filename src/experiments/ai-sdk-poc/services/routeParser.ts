/**
 * Route Parser Service
 * Extracts structured route information from natural language
 */

export interface RouteInfo {
  origin?: {
    name: string;
    coordinates?: [number, number];
  };
  destination?: {
    name: string;
    coordinates?: [number, number];
  };
  waypoints?: Array<{
    name: string;
    coordinates?: [number, number];
  }>;
  preferences?: {
    avoidHighways?: boolean;
    preferDirtRoads?: boolean;
    scenic?: boolean;
    fastest?: boolean;
  };
  estimatedDistance?: string;
  estimatedDuration?: string;
}

export function parseRoute(text: string): RouteInfo | null {
  const route: RouteInfo = {
    preferences: {}
  };

  // Parse origin and destination
  const fromToPattern = /from\s+(.+?)\s+to\s+(.+?)(?:\s|$|\.)/i;
  const fromToMatch = text.match(fromToPattern);
  
  if (fromToMatch) {
    route.origin = { name: fromToMatch[1].trim() };
    route.destination = { name: fromToMatch[2].trim() };
  }

  // Parse waypoints/stops
  const viaPattern = /(?:via|through|stopping at)\s+(.+?)(?:\.|$)/i;
  const viaMatch = text.match(viaPattern);
  
  if (viaMatch) {
    const stops = viaMatch[1].split(/,|and/).map(s => s.trim()).filter(s => s);
    route.waypoints = stops.map(name => ({ name }));
  }

  // Parse preferences
  if (/dirt road|off-?road|unpaved|gravel/i.test(text)) {
    route.preferences!.preferDirtRoads = true;
  }
  
  if (/avoid highway|no highway|back road/i.test(text)) {
    route.preferences!.avoidHighways = true;
  }
  
  if (/scenic|beautiful|tourist/i.test(text)) {
    route.preferences!.scenic = true;
  }
  
  if (/fastest|quickest|direct/i.test(text)) {
    route.preferences!.fastest = true;
  }

  // Parse distance if mentioned
  const distancePattern = /(\d+(?:\.\d+)?)\s*(?:km|kilometers|kilometres|miles|mi)/i;
  const distanceMatch = text.match(distancePattern);
  
  if (distanceMatch) {
    route.estimatedDistance = distanceMatch[0];
  }

  // Parse duration if mentioned
  const durationPattern = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|days?)/i;
  const durationMatch = text.match(durationPattern);
  
  if (durationMatch) {
    route.estimatedDuration = durationMatch[0];
  }

  // Return null if no route information found
  if (!route.origin && !route.destination) {
    return null;
  }

  return route;
}

/**
 * Extract structured trip plan from PAM's response
 */
export function extractTripPlan(response: string): RouteInfo | null {
  const lines = response.split('\n');
  const route: RouteInfo = {
    waypoints: [],
    preferences: {}
  };

  let currentDay = null;
  
  for (const line of lines) {
    // Look for day markers
    const dayMatch = line.match(/Day\s+\d+:\s+(.+?)\s+to\s+(.+)/i);
    if (dayMatch) {
      if (!route.origin) {
        route.origin = { name: dayMatch[1].trim() };
      }
      route.destination = { name: dayMatch[2].trim() };
      
      // Add intermediate stop as waypoint
      if (currentDay && currentDay !== dayMatch[1]) {
        route.waypoints?.push({ name: dayMatch[1].trim() });
      }
      currentDay = dayMatch[2];
    }

    // Look for distance
    const distMatch = line.match(/Distance:\s*(.+)/i);
    if (distMatch && !route.estimatedDistance) {
      route.estimatedDistance = distMatch[1].trim();
    }

    // Look for specific stops or campgrounds
    const stayMatch = line.match(/Stay:\s*(.+)/i);
    if (stayMatch) {
      const location = stayMatch[1].trim();
      // Extract just the location name, not the full description
      const locationName = location.split(/at|in/)[0].trim();
      if (locationName && !route.waypoints?.some(w => w.name === locationName)) {
        route.waypoints?.push({ name: locationName });
      }
    }
  }

  if (!route.origin && !route.destination) {
    return null;
  }

  return route;
}