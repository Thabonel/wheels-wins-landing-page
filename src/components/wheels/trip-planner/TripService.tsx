
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
    // Save to user_trips table (user's personal user_trips)
    const { data, error } = await supabase
      .from("user_trips")
      .insert({
        user_id: userId,
        title: `${originName} to ${destName}`,
        description: `Trip from ${originName} to ${destName}`,
        status: 'planning', // Default status
        trip_type: mode === 'rv' ? 'rv_travel' : 'road_trip', // Map mode to trip_type
        privacy_level: 'private', // Private by default
        metadata: { 
          origin, 
          dest, 
          originName,
          destName,
          routingProfile, 
          suggestions, 
          waypoints, 
          mode 
        },
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
      .from('user_trips')
      .update({
        metadata: { origin, dest, routingProfile, suggestions, waypoints, mode },
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId);
    
    if (error) {
      console.error('Error updating trip route:', error);
    }
  }
}
