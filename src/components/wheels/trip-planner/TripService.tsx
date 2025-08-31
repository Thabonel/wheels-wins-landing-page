
import { supabase } from "@/integrations/supabase";
import { TripPayload, Waypoint, Suggestion } from "./types";

export class TripService {
  // n8n integration discontinued - webhook functionality removed

  static async submitTripPlan(payload: TripPayload): Promise<void> {
    console.log('📦 Trip payload saved locally (n8n webhook discontinued):', payload);
    
    // Note: n8n webhook integration has been discontinued
    // Trip data is now saved directly to Supabase database
    console.log('✅ Trip data processed locally - webhook integration removed');
  }

  static async fetchTripSuggestions(
    origin: { coordinates: [number, number]; name: string },
    destination: { coordinates: [number, number]; name: string },
    waypoints: Waypoint[],
    profile: string,
    mode: string
  ): Promise<Suggestion[]> {
    // n8n webhook discontinued - return empty suggestions for now
    // This functionality can be implemented directly in backend if needed
    console.log('Trip suggestions: n8n integration discontinued, returning empty array');
    return [];
  }

  static async saveTrip(
    userId: string,
    originName: string,
    destName: string,
    origin: [number, number],
    dest: [number, number],
    routingProfile: string,
    suggestions: Suggestion[],
    mode: string,
    waypoints: Waypoint[]
  ): Promise<string | null> {
    // Save to saved_trips table (user's personal trips)
    const { data, error } = await supabase
      .from("saved_trips")
      .insert({
        user_id: userId,
        name: `${originName} to ${destName}`,
        description: `Trip from ${originName} to ${destName}`,
        start_location: originName,
        end_location: destName,
        waypoints: waypoints,
        route_data: { origin, dest, routingProfile, suggestions, waypoints, mode },
        difficulty: 'moderate', // Default difficulty
        is_public: false, // Private by default
        tags: [mode, routingProfile],
        estimated_days: 1, // Default to 1 day trip
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving trip:', error);
      return null;
    }
    return data?.id ?? null;
  }

  static async updateTripRoute(
    tripId: string,
    origin: [number, number],
    dest: [number, number],
    routingProfile: string,
    suggestions: Suggestion[],
    mode: string,
    waypoints: Waypoint[]
  ): Promise<void> {
    const { error } = await supabase
      .from('saved_trips')
      .update({
        route_data: { origin, dest, routingProfile, suggestions, waypoints, mode },
        waypoints: waypoints,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId);
    
    if (error) {
      console.error('Error updating trip route:', error);
    }
  }
}
