import { supabase } from '@/integrations/supabase/client';

export interface UserLocationUpdate {
  user_id: string;
  current_latitude: number;
  current_longitude: number;
  destination_latitude?: number;
  destination_longitude?: number;
  status?: string;
  preferences?: any;
  travel_radius_miles?: number;
}

class LocationService {
  private watchId: number | null = null;
  private lastUpdate: Date | null = null;
  private updateInterval: number = 5 * 60 * 1000; // 5 minutes
  private minDistanceThreshold: number = 0.001; // Roughly 100 meters
  private lastPosition: { lat: number; lng: number } | null = null;

  /**
   * Start tracking user location and updating the database
   */
  async startLocationTracking(userId: string): Promise<void> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    // Check if user has granted location permission
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    if (permission.state === 'denied') {
      throw new Error('Location permission denied');
    }

    // Start watching position
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.handlePositionUpdate(userId, position);
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute
      }
    );
  }

  /**
   * Stop location tracking
   */
  stopLocationTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Handle position updates from geolocation API
   */
  private async handlePositionUpdate(userId: string, position: GeolocationPosition): Promise<void> {
    const { latitude, longitude } = position.coords;
    const now = new Date();

    // Check if enough time has passed since last update
    if (this.lastUpdate && (now.getTime() - this.lastUpdate.getTime()) < this.updateInterval) {
      return;
    }

    // Check if user has moved significantly
    if (this.lastPosition) {
      const distance = this.calculateDistance(
        this.lastPosition.lat,
        this.lastPosition.lng,
        latitude,
        longitude
      );
      
      if (distance < this.minDistanceThreshold) {
        return; // Haven't moved enough to warrant an update
      }
    }

    try {
      await this.updateUserLocation({
        user_id: userId,
        current_latitude: latitude,
        current_longitude: longitude,
        status: 'active'
      });

      this.lastUpdate = now;
      this.lastPosition = { lat: latitude, lng: longitude };
    } catch (error) {
      console.error('Failed to update user location:', error);
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degree: number): number {
    return degree * (Math.PI / 180);
  }

  /**
   * Update user location in the database
   */
  async updateUserLocation(locationData: UserLocationUpdate): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_locations')
        .upsert({
          ...locationData,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Failed to update location: ${error.message}`);
      }
    } catch (err) {
      console.error('Location update error:', err);
      throw new Error(`Failed to update location: ${err.message || 'Unknown error'}`);
    }
  }

  /**
   * Set user as offline/inactive
   */
  async setUserOffline(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_locations')
      .update({ 
        status: 'offline',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to set user offline: ${error.message}`);
    }
  }

  /**
   * Get current user location from database
   */
  async getUserLocation(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('user_locations')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`Failed to get user location: ${error.message}`);
    }

    return data;
  }

  /**
   * Update user destination (for trip planning)
   */
  async updateDestination(userId: string, latitude: number, longitude: number): Promise<void> {
    const { error } = await supabase
      .from('user_locations')
      .update({
        destination_latitude: latitude,
        destination_longitude: longitude,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update destination: ${error.message}`);
    }
  }

  /**
   * Check if user has location sharing enabled
   */
  async isLocationSharingEnabled(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_profiles_extended')
      .select('privacy_settings')
      .eq('user_id', userId)
      .single();

    if (error) {
      return false; // Default to disabled if can't fetch settings
    }

    const privacySettings = data?.privacy_settings as any;
    return privacySettings?.location_sharing_enabled || false;
  }
}

// Export singleton instance
export const locationService = new LocationService();