import { supabase } from '@/integrations/supabase/client';

export interface TripData {
  trip_name: string;
  description?: string;
  route_data: {
    waypoints: any[];
    route?: any;
    profile?: string;
    distance?: number;
    duration?: number;
  };
  status?: string;
}

export const tripService = {
  // Save a new trip
  async saveTrip(userId: string, tripData: TripData) {
    try {
      const { data, error } = await supabase
        .from('group_trips')
        .insert({
          created_by: userId,
          trip_name: tripData.trip_name,
          description: tripData.description,
          route_data: tripData.route_data,
          status: tripData.status || 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
      const { data, error } = await supabase
        .from('group_trips')
        .update({
          ...tripData,
          updated_at: new Date().toISOString()
        })
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
        .from('group_trips')
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
        .from('group_trips')
        .select('*')
        .eq('created_by', userId)
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
        .from('group_trips')
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