import { supabase } from '@/integrations/supabase/client';

export interface TripData {
  title: string;
  description?: string;
  route_data: {
    waypoints: any[];
    route?: any;
    profile?: string;
    distance?: number;
    duration?: number;
  };
  status?: string;
  privacy_level?: string;
}

export const tripService = {
  // Save a new trip
  async saveTrip(userId: string, tripData: TripData) {
    try {
      const { data, error } = await supabase
        .from('user_trips')
        .insert({
          user_id: userId,
          title: tripData.title,
          description: tripData.description,
          status: tripData.status || 'draft',
          privacy_level: tripData.privacy_level || 'private',
          // Store route data in metadata since route_data column may not exist
          metadata: {
            route_data: tripData.route_data,
            distance: tripData.route_data.distance,
            duration: tripData.route_data.duration,
            profile: tripData.route_data.profile,
            waypoint_count: tripData.route_data.waypoints.length
          }
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving trip:', error);
      return { success: false, error };
    }
  },

  // Update an existing trip
  async updateTrip(tripId: string, tripData: Partial<TripData>) {
    try {
      const updateData: any = {};
      
      if (tripData.title) updateData.title = tripData.title;
      if (tripData.description !== undefined) updateData.description = tripData.description;
      if (tripData.status) updateData.status = tripData.status;
      if (tripData.privacy_level) updateData.privacy_level = tripData.privacy_level;
      if (tripData.route_data) {
        updateData.metadata = {
          route_data: tripData.route_data,
          distance: tripData.route_data.distance,
          duration: tripData.route_data.duration,
          profile: tripData.route_data.profile,
          waypoint_count: tripData.route_data.waypoints.length
        };
      }

      const { data, error } = await supabase
        .from('user_trips')
        .update(updateData)
        .eq('id', tripId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating trip:', error);
      return { success: false, error };
    }
  },

  // Load a trip by ID
  async loadTrip(tripId: string) {
    try {
      const { data, error } = await supabase
        .from('user_trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error loading trip:', error);
      return { success: false, error };
    }
  },

  // Get all trips for a user
  async getUserTrips(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_trips')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error loading user trips:', error);
      return { success: false, error, data: [] };
    }
  },

  // Delete a trip
  async deleteTrip(tripId: string) {
    try {
      const { error } = await supabase
        .from('user_trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting trip:', error);
      return { success: false, error };
    }
  }
};