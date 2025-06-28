import React, { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Users, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FriendLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  location_name: string;
  status: 'traveling' | 'camped' | 'offline';
  last_updated: string;
  profile?: {
    display_name: string;
    avatar_url: string;
    rv_info: any;
  };
}

interface FriendsLayerProps {
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  isVisible: boolean;
}

export default function FriendsLayer({ map, isVisible }: FriendsLayerProps) {
  const { user } = useAuth();
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendLocation | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Fetch friend locations
  useEffect(() => {
    if (!user || !isVisible) return;

    const fetchFriendLocations = async () => {
      try {
        const { data: friends } = await supabase
          .from('user_friends')
          .select(`
            friend_id
          `)
          .eq('user_id', user.id)
          .eq('status', 'accepted');

        if (!friends) return;

        const friendIds = friends.map(f => f.friend_id);
        
        const { data: locations } = await supabase
          .from('friend_locations')
          .select('*')
          .in('user_id', friendIds)
          .eq('is_public', true)
          .order('last_updated', { ascending: false });

        const { data: profiles } = await supabase
          .from('user_social_profiles')
          .select('*')
          .in('user_id', friendIds);

        if (locations) {
          const locationsWithProfiles = locations.map(location => {
            const profile = profiles?.find(p => p.user_id === location.user_id);
            return {
              ...location,
              status: location.status as 'traveling' | 'camped' | 'offline',
              profile: profile ? {
                display_name: profile.display_name || 'Unknown',
                avatar_url: profile.avatar_url || '',
                rv_info: profile.rv_info
              } : undefined
            };
          });
          
          setFriendLocations(locationsWithProfiles);
        }
      } catch (error) {
        console.error('Error fetching friend locations:', error);
      }
    };

    fetchFriendLocations();

    // Set up real-time subscription
    const subscription = supabase
      .channel('friend-locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_locations'
        },
        () => {
          fetchFriendLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, isVisible]);

  // Create and update friend markers on map
  useEffect(() => {
    if (!map.current || !isVisible) {
      // Remove all markers if not visible
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};
      return;
    }

    // Remove existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Add markers for each friend
    friendLocations.forEach(friend => {
      const markerElement = createFriendMarker(friend);
      
      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([friend.longitude, friend.latitude])
        .addTo(map.current!);

      // Add click handler
      markerElement.addEventListener('click', () => {
        setSelectedFriend(friend);
        showFriendPopup(friend, marker);
      });

      markersRef.current[friend.id] = marker;
    });

    return () => {
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};
    };
  }, [map, friendLocations, isVisible]);

  const createFriendMarker = (friend: FriendLocation) => {
    const markerDiv = document.createElement('div');
    markerDiv.className = 'friend-marker cursor-pointer';
    
    const statusColors = {
      traveling: 'border-blue-500 bg-blue-50',
      camped: 'border-green-500 bg-green-50',
      offline: 'border-gray-400 bg-gray-50'
    };

    const statusIcons = {
      traveling: '🚐',
      camped: '🏕️',
      offline: '⚫'
    };

    markerDiv.innerHTML = `
      <div class="relative">
        <div class="w-12 h-12 rounded-full border-3 ${statusColors[friend.status]} flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
          ${friend.profile?.avatar_url 
            ? `<img src="${friend.profile.avatar_url}" alt="${friend.profile?.display_name}" class="w-10 h-10 rounded-full object-cover" />`
            : `<div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">${friend.profile?.display_name?.charAt(0) || '?'}</div>`
          }
        </div>
        <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border-2 border-white flex items-center justify-center text-xs">
          ${statusIcons[friend.status]}
        </div>
        <div class="absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-full animate-pulse ${friend.status === 'offline' ? 'hidden' : ''}"></div>
      </div>
    `;

    return markerDiv;
  };

  const showFriendPopup = (friend: FriendLocation, marker: mapboxgl.Marker) => {
    if (popupRef.current) {
      popupRef.current.remove();
    }

    const lastUpdated = new Date(friend.last_updated);
    const timeAgo = getTimeAgo(lastUpdated);

    const statusLabels = {
      traveling: 'On the Road',
      camped: 'Camping',
      offline: 'Offline'
    };

    const statusColors = {
      traveling: 'bg-blue-100 text-blue-800',
      camped: 'bg-green-100 text-green-800',
      offline: 'bg-gray-100 text-gray-800'
    };

    const popupContent = `
      <div class="p-4 min-w-[200px]">
        <div class="flex items-center gap-3 mb-3">
          ${friend.profile?.avatar_url 
            ? `<img src="${friend.profile.avatar_url}" alt="${friend.profile?.display_name}" class="w-10 h-10 rounded-full object-cover" />`
            : `<div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">${friend.profile?.display_name?.charAt(0) || '?'}</div>`
          }
          <div>
            <h3 class="font-semibold text-sm">${friend.profile?.display_name || 'Unknown'}</h3>
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[friend.status]}">
              ${statusLabels[friend.status]}
            </span>
          </div>
        </div>
        
        <div class="space-y-2 text-xs text-gray-600">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 flex items-center justify-center">📍</div>
            <span>${friend.location_name || 'Unknown location'}</span>
          </div>
          
          ${friend.profile?.rv_info ? `
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 flex items-center justify-center">🚐</div>
              <span>${friend.profile.rv_info.type || 'RV'} - ${friend.profile.rv_info.make || ''} ${friend.profile.rv_info.model || ''}</span>
            </div>
          ` : ''}
          
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 flex items-center justify-center">🕒</div>
            <span>Updated ${timeAgo}</span>
          </div>
        </div>
        
        <div class="mt-3 pt-3 border-t border-gray-200">
          <button class="w-full bg-primary text-white text-xs py-2 px-3 rounded hover:bg-primary/90 transition-colors">
            Suggest Meetup
          </button>
        </div>
      </div>
    `;

    const popup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '300px'
    })
      .setHTML(popupContent)
      .addTo(map.current!);

    marker.setPopup(popup);
    popup.addTo(map.current!);
    popupRef.current = popup;
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Component doesn't render any UI - it just manages map markers
  return null;
}

// CSS for friend markers (you might want to add this to your global CSS)
const friendMarkerStyles = `
  .friend-marker {
    cursor: pointer;
  }
  
  .friend-marker:hover {
    z-index: 1000;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = friendMarkerStyles;
  document.head.appendChild(styleElement);
}