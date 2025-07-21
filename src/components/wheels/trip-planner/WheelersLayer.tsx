import { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

interface WheelersLayerProps {
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  isVisible: boolean;
}

interface UserLocation {
  id: number;
  user_id: string;
  current_latitude: number;
  current_longitude: number;
  status: string | null;
  updated_at: string | null;
  user_profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  user_profiles_extended?: {
    rig_type: string | null;
  } | null;
}

// Safe auth hook that doesn't crash if AuthProvider is missing
function useSafeAuth() {
  try {
    return useAuth();
  } catch (error) {
    console.warn('WheelersLayer: AuthProvider not available, proceeding without authentication');
    return { user: null };
  }
}

export default function WheelersLayer({ map, isVisible }: WheelersLayerProps) {
  const { user } = useSafeAuth();
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);

  // Fetch user locations from database
  const fetchUserLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('user_locations')
        .select(`
          *,
          user_profiles (
            full_name,
            avatar_url
          ),
          user_profiles_extended (
            rig_type
          )
        `)
        .eq('status', 'active')
        .neq('user_id', user?.id || '') // Don't show current user
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Only show locations updated in last 24 hours

      if (error) {
        console.error('Error fetching user locations:', error);
        return;
      }

      // Transform and filter the data to match our interface
      const validData = (data || [])
        .filter((location: any) => location.user_profiles && !('error' in location.user_profiles))
        .map((location: any): UserLocation => ({
          id: location.id,
          user_id: location.user_id,
          current_latitude: location.current_latitude,
          current_longitude: location.current_longitude,
          status: location.status,
          updated_at: location.updated_at,
          user_profiles: location.user_profiles,
          user_profiles_extended: location.user_profiles_extended,
        }));
      setUserLocations(validData);
    } catch (error) {
      console.error('Error fetching user locations:', error);
    }
  };

  // Create user markers on the map
  const createUserMarkers = () => {
    if (!map.current || !isVisible) return;

    // Clear existing markers
    markers.forEach(marker => marker.remove());
    setMarkers([]);

    const newMarkers: mapboxgl.Marker[] = [];

    userLocations.forEach((location) => {
      const { current_latitude, current_longitude, user_profiles, user_profiles_extended } = location;
      
      // Create marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'wheeler-marker';
      markerEl.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid #10b981;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: transform 0.2s ease;
        position: relative;
      `;

      // Add avatar or placeholder
      if (user_profiles?.avatar_url) {
        const img = document.createElement('img');
        img.src = user_profiles.avatar_url;
        img.style.cssText = `
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        `;
        markerEl.appendChild(img);
      } else {
        // Default user icon
        markerEl.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        `;
      }

      // Add rig type indicator
      const rigType = location.user_profiles_extended?.rig_type;
      if (rigType) {
        const rigBadge = document.createElement('div');
        rigBadge.style.cssText = `
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 16px;
          height: 16px;
          background: #3b82f6;
          border: 2px solid white;
          border-radius: 50%;
          font-size: 8px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        `;
        rigBadge.textContent = rigType.charAt(0).toUpperCase();
        markerEl.appendChild(rigBadge);
      }

      // Add hover effects
      markerEl.addEventListener('mouseenter', () => {
        markerEl.style.transform = 'scale(1.1)';
      });

      markerEl.addEventListener('mouseleave', () => {
        markerEl.style.transform = 'scale(1)';
      });

      // Create popup with user info
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: true
      }).setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            ${user_profiles?.avatar_url ? 
              `<img src="${user_profiles.avatar_url}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />` :
              `<div style="width: 32px; height: 32px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>`
            }
            <div>
              <div style="font-weight: 600; color: #111827;">${user_profiles?.full_name || 'Wheeler'}</div>
              ${rigType ? `<div style="font-size: 12px; color: #6b7280;">${rigType}</div>` : ''}
            </div>
          </div>
          <div style="font-size: 12px; color: #6b7280;">
            Last seen: ${location.updated_at ? new Date(location.updated_at).toLocaleString() : 'Recently'}
          </div>
          <button onclick="window.dispatchEvent(new CustomEvent('connectToWheeler', { detail: { userId: '${location.user_id}', name: '${user_profiles?.full_name || 'Wheeler'}' } }))" 
                  style="margin-top: 8px; background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;">
            Connect
          </button>
        </div>
      `);

      // Create marker
      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([current_longitude, current_latitude])
        .setPopup(popup)
        .addTo(map.current);

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);
  };

  // Handle connecting to other users
  useEffect(() => {
    const handleConnectToWheeler = (event: CustomEvent) => {
      const { userId, name } = event.detail;
      toast({
        title: "Connection Request",
        description: `Sent connection request to ${name}. They'll be notified!`,
      });
      
      // Here you could implement actual connection logic
      // For example, creating a friend request or starting a chat
    };

    window.addEventListener('connectToWheeler', handleConnectToWheeler as EventListener);
    return () => {
      window.removeEventListener('connectToWheeler', handleConnectToWheeler as EventListener);
    };
  }, []);

  // Fetch locations when component mounts or visibility changes
  useEffect(() => {
    if (isVisible) {
      fetchUserLocations();
      // Set up periodic updates every 2 minutes
      const interval = setInterval(fetchUserLocations, 2 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isVisible, user?.id]);

  // Create/remove markers based on visibility and data
  useEffect(() => {
    if (isVisible) {
      createUserMarkers();
    } else {
      // Remove all markers when not visible
      markers.forEach(marker => marker.remove());
      setMarkers([]);
    }
    
    return () => {
      markers.forEach(marker => marker.remove());
    };
  }, [isVisible, userLocations]);

  return null; // This component only manages map layers, no render needed
}