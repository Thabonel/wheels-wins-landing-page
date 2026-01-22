
import { supabase } from "@/integrations/supabase";
import { Waypoint, Suggestion } from "./types";

export class TripService {
  // Trip planning now handled by PAM's plan_trip tool via WebSocket
  // Frontend TripService only handles direct Supabase operations

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
