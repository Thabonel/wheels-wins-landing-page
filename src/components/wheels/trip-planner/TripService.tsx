
import { supabase } from "@/integrations/supabase";
import { TripPayload, Waypoint, Suggestion } from "./types";

export class TripService {
  private static TRIP_WEBHOOK_URL = import.meta.env.VITE_N8N_TRIP_WEBHOOK;

  static async submitTripPlan(payload: TripPayload): Promise<void> {
    try {
      await fetch(this.TRIP_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Trip webhook failed", err);
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
  ): Promise<void> {
    await supabase.from("trips").insert({
      user_id: userId,
      start_location: JSON.stringify({ name: originName, coords: origin }),
      end_location: JSON.stringify({ name: destName, coords: dest }),
      start_date: new Date(),
      arrival_date: new Date(),
      route: { origin, dest, routingProfile },
      trip_pois: suggestions,
      route_preferences: { mode, requiredWaypoints: waypoints.map(w => w.coords) },
    });
  }
}
