import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { locationService } from '@/services/locationService';
import { toast } from '@/hooks/use-toast';

interface LocationTrackingState {
  isTracking: boolean;
  hasPermission: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export function useLocationTracking() {
  const { user } = useAuth();
  const [state, setState] = useState<LocationTrackingState>({
    isTracking: false,
    hasPermission: false,
    error: null,
    lastUpdate: null
  });

  /**
   * Check location permission status
   */
  const checkPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation not supported', hasPermission: false }));
      return false;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      const hasPermission = permission.state === 'granted';
      
      setState(prev => ({ 
        ...prev, 
        hasPermission,
        error: permission.state === 'denied' ? 'Location permission denied' : null
      }));
      
      return hasPermission;
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to check location permission', hasPermission: false }));
      return false;
    }
  }, []);

  /**
   * Request location permission and start tracking
   */
  const startTracking = useCallback(async () => {
    if (!user?.id) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }));
      return false;
    }

    // Check if location sharing is enabled for this user
    const isEnabled = await locationService.isLocationSharingEnabled(user.id);
    if (!isEnabled) {
      toast({
        title: "Location Sharing Disabled",
        description: "Enable location sharing in your privacy settings to show your location to other Wheelers.",
        variant: "default",
      });
      return false;
    }

    setState(prev => ({ ...prev, error: null }));

    try {
      await locationService.startLocationTracking(user.id);
      setState(prev => ({ 
        ...prev, 
        isTracking: true, 
        hasPermission: true,
        lastUpdate: new Date()
      }));
      
      toast({
        title: "Location Tracking Started",
        description: "Your location is now visible to other Wheelers on the community map.",
      });
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start location tracking';
      setState(prev => ({ ...prev, error: errorMessage, isTracking: false }));
      
      toast({
        title: "Location Tracking Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    }
  }, [user?.id]);

  /**
   * Stop location tracking
   */
  const stopTracking = useCallback(async () => {
    if (!user?.id) return;

    locationService.stopLocationTracking();
    
    try {
      await locationService.setUserOffline(user.id);
      setState(prev => ({ ...prev, isTracking: false }));
      
      toast({
        title: "Location Tracking Stopped",
        description: "You are no longer visible on the community map.",
      });
    } catch (error) {
      console.error('Failed to set user offline:', error);
    }
  }, [user?.id]);

  /**
   * Toggle location tracking on/off
   */
  const toggleTracking = useCallback(async () => {
    if (state.isTracking) {
      await stopTracking();
    } else {
      await startTracking();
    }
  }, [state.isTracking, startTracking, stopTracking]);

  /**
   * Update destination for trip planning
   */
  const updateDestination = useCallback(async (latitude: number, longitude: number) => {
    if (!user?.id) return false;

    try {
      await locationService.updateDestination(user.id, latitude, longitude);
      return true;
    } catch (error) {
      console.error('Failed to update destination:', error);
      return false;
    }
  }, [user?.id]);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Auto-start tracking when user logs in and has permission
  useEffect(() => {
    if (user?.id && state.hasPermission && !state.isTracking) {
      // Auto-start tracking for logged-in users (if they have location sharing enabled)
      locationService.isLocationSharingEnabled(user.id).then(isEnabled => {
        if (isEnabled) {
          startTracking();
        }
      });
    }
  }, [user?.id, state.hasPermission, state.isTracking, startTracking]);

  // Stop tracking when user logs out
  useEffect(() => {
    if (!user?.id && state.isTracking) {
      locationService.stopLocationTracking();
      setState(prev => ({ ...prev, isTracking: false }));
    }
  }, [user?.id, state.isTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      locationService.stopLocationTracking();
    };
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
    toggleTracking,
    updateDestination,
    checkPermission
  };
}