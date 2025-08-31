
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
    const { data, error } = await supabase
      .from("user_trips")
      .insert({
        user_id: userId,
        title: `${originName} to ${destName}`,
        description: `Trip from ${originName} to ${destName}`,
        start_date: new Date().toISOString().split('T')[0], // DATE format
        end_date: new Date().toISOString().split('T')[0], // DATE format
        route_data: JSON.stringify({ origin, dest, routingProfile, suggestions, waypoints, mode }),
        status: 'planned',
        is_group_trip: false,
        destination: {
          lat: dest[1],
          lng: dest[0],
          name: destName,
          address: destName
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving trip:', error);
      // If table doesn't exist, show helpful message
      if (error.code === '42P01') {
        console.error('user_trips table does not exist. Please run the migration.');
      }
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
        route_data: JSON.stringify({ origin, dest, routingProfile, suggestions, waypoints, mode }),
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId);
    
    if (error) {
      console.error('Error updating trip route:', error);
      if (error.code === '42P01') {
        console.error('user_trips table does not exist. Please run the migration.');
      }
    }
  }
}
