
import { supabase } from "@/integrations/supabase";
import { TripPayload, Waypoint, Suggestion } from "./types";

export class TripService {
  private static TRIP_WEBHOOK_URL = import.meta.env.VITE_N8N_TRIP_WEBHOOK;

  static async submitTripPlan(payload: TripPayload): Promise<void> {
    console.log('🚀 Sending trip to PAM webhook:', this.TRIP_WEBHOOK_URL);
    console.log('📦 Trip payload:', payload);
    
    if (!this.TRIP_WEBHOOK_URL) {
      console.error('❌ PAM webhook URL not configured! Add VITE_N8N_TRIP_WEBHOOK to .env file');
      throw new Error('PAM webhook URL not configured');
    }
    
    try {
      const response = await fetch(this.TRIP_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        console.log('✅ Trip successfully sent to PAM!');
      } else {
        console.error('❌ PAM webhook responded with error:', response.status, response.statusText);
      }
    } catch (err) {
      console.error("❌ Trip webhook failed:", err);
      throw err; // Re-throw so calling code can handle the error
    }
  }

  static async fetchTripSuggestions(
    origin: { coordinates: [number, number]; name: string },
    destination: { coordinates: [number, number]; name: string },
    waypoints: Waypoint[],
    profile: string,
    mode: string
  ): Promise<Suggestion[]> {
    try {
      const payload = {
        origin,
        destination,
        waypoints: waypoints.map(wp => ({ coordinates: wp.coords, name: wp.name })),
        profile,
        mode,
      };
      
      const res = await fetch(this.TRIP_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const json = await res.json();
      return json.suggestions || [];
    } catch (error) {
      console.error("Error fetching trip suggestions:", error);
      return [];
    }
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
      .from("group_trips")
      .insert({
        created_by: userId,
        trip_name: `${originName} to ${destName}`,
        description: `Trip from ${originName} to ${destName}`,
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        route_data: JSON.stringify({ origin, dest, routingProfile, suggestions, waypoints }),
        status: 'active'
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
    await supabase
      .from('group_trips')
      .update({
        route_data: JSON.stringify({ origin, dest, routingProfile, suggestions, waypoints, mode }),
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId);
  }
}
