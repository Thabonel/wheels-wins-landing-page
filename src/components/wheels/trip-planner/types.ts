
export interface Waypoint {
  coords: [number, number];
  name: string;
}

export interface TripPayload {
  user_id: string;
  origin: { name: string; coords: [number, number] };
  destination: { name: string; coords: [number, number] };
  stops: Waypoint[];
  routeMode: string;
  travelMode: string;
}

export interface Suggestion {
  name: string;
  tags?: string[];
  type?: string;
  link?: string;
}

export interface RouteState {
  originName: string;
  destName: string;
  waypoints: Waypoint[];
  suggestions?: Suggestion[];
  totalDistance?: number;
  estimatedTime?: number;
}

export interface ItineraryStop {
  name: string;
  coordinates: [number, number];
  address?: string;
  interest?: string;
}

export interface ItineraryDay {
  day: number;
  stops: ItineraryStop[];
}

export interface Itinerary {
  start: string;
  end: string;
  days: ItineraryDay[];
}
