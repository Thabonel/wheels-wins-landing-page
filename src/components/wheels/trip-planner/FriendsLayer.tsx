import { useEffect, useState, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

function useSafeAuth() {
  try {
    return useAuth();
  } catch {
    return { user: null };
  }
}

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

const SOURCE_ID = 'friends-source';
const CLUSTER_LAYER = 'friends-clusters';
const CLUSTER_COUNT_LAYER = 'friends-cluster-count';
const POINTS_LAYER = 'friends-points';
const LABELS_LAYER = 'friends-labels';

const STATUS_COLORS: Record<string, string> = {
  traveling: '#3b82f6',
  camped: '#22c55e',
  offline: '#9ca3af',
};

const STATUS_LABELS: Record<string, string> = {
  traveling: 'On the Road',
  camped: 'Camping',
  offline: 'Offline',
};

function buildFeatureCollection(friends: FriendLocation[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: friends.map(f => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [f.longitude, f.latitude],
      },
      properties: {
        id: f.id,
        name: f.profile?.display_name || 'Unknown',
        status: f.status,
        color: STATUS_COLORS[f.status] || '#6b7280',
        statusLabel: STATUS_LABELS[f.status] || f.status,
        locationName: f.location_name || 'Unknown location',
        lastUpdated: f.last_updated,
        initial: (f.profile?.display_name || '?').charAt(0).toUpperCase(),
        avatarUrl: f.profile?.avatar_url || '',
        rvInfo: f.profile?.rv_info ? JSON.stringify(f.profile.rv_info) : '',
      },
    })),
  };
}

function getTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function FriendsLayer({ map, isVisible }: FriendsLayerProps) {
  const { user } = useSafeAuth();
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const layersAddedRef = useRef(false);

  useEffect(() => {
    if (!user || !isVisible) return;

    const fetchFriendLocations = async () => {
      try {
        const { data: friends } = await supabase
          .from('user_friends')
          .select('friend_id')
          .eq('user_id', user.id)
          .eq('status', 'accepted');

        if (!friends?.length) return;

        const friendIds = friends.map(f => f.friend_id);

        const [{ data: locations }, { data: profiles }] = await Promise.all([
          supabase
            .from('friend_locations')
            .select('*')
            .in('user_id', friendIds)
            .eq('is_public', true)
            .order('last_updated', { ascending: false }),
          supabase
            .from('user_social_profiles')
            .select('*')
            .in('user_id', friendIds),
        ]);

        if (locations) {
          setFriendLocations(locations.map(loc => {
            const profile = profiles?.find(p => p.user_id === loc.user_id);
            return {
              ...loc,
              status: loc.status as FriendLocation['status'],
              profile: profile ? {
                display_name: profile.display_name || 'Unknown',
                avatar_url: profile.avatar_url || '',
                rv_info: profile.rv_info,
              } : undefined,
            };
          }));
        }
      } catch (error) {
        console.error('Error fetching friend locations:', error);
      }
    };

    fetchFriendLocations();

    const subscription = supabase
      .channel('friend-locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_locations' }, fetchFriendLocations)
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [user, isVisible]);

  const removeLayers = useCallback((m: mapboxgl.Map) => {
    [LABELS_LAYER, POINTS_LAYER, CLUSTER_COUNT_LAYER, CLUSTER_LAYER].forEach(id => {
      if (m.getLayer(id)) m.removeLayer(id);
    });
    if (m.getSource(SOURCE_ID)) m.removeSource(SOURCE_ID);
    layersAddedRef.current = false;
  }, []);

  const setupLayers = useCallback((m: mapboxgl.Map, data: GeoJSON.FeatureCollection) => {
    if (layersAddedRef.current) {
      const source = m.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(data);
        return;
      }
    }

    removeLayers(m);

    m.addSource(SOURCE_ID, {
      type: 'geojson',
      data,
      cluster: true,
      clusterMaxZoom: 12,
      clusterRadius: 40,
    });

    m.addLayer({
      id: CLUSTER_LAYER,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#3b82f6',
        'circle-radius': ['step', ['get', 'point_count'], 16, 5, 22, 10, 28],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    });

    m.addLayer({
      id: CLUSTER_COUNT_LAYER,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: { 'text-color': '#ffffff' },
    });

    m.addLayer({
      id: POINTS_LAYER,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 10,
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    });

    m.addLayer({
      id: LABELS_LAYER,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      layout: {
        'text-field': ['get', 'initial'],
        'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
        'text-size': 11,
        'text-allow-overlap': true,
      },
      paint: { 'text-color': '#ffffff' },
    });

    m.on('click', POINTS_LAYER, (e) => {
      if (!e.features?.[0]) return;
      const props = e.features[0].properties!;
      const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];

      popupRef.current?.remove();

      const popupEl = document.createElement('div');
      popupEl.style.padding = '10px';

      const headerRow = document.createElement('div');
      Object.assign(headerRow.style, { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' });

      const avatar = document.createElement('div');
      Object.assign(avatar.style, { width: '32px', height: '32px', borderRadius: '50%', background: props.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '14px' });
      avatar.textContent = props.initial;
      headerRow.appendChild(avatar);

      const headerText = document.createElement('div');
      const nameEl = document.createElement('div');
      Object.assign(nameEl.style, { fontWeight: '600', fontSize: '14px' });
      nameEl.textContent = props.name;
      headerText.appendChild(nameEl);
      const statusEl = document.createElement('div');
      Object.assign(statusEl.style, { fontSize: '11px', color: props.color, fontWeight: '500' });
      statusEl.textContent = props.statusLabel;
      headerText.appendChild(statusEl);
      headerRow.appendChild(headerText);
      popupEl.appendChild(headerRow);

      const details = document.createElement('div');
      Object.assign(details.style, { fontSize: '12px', color: '#666', display: 'flex', flexDirection: 'column', gap: '4px' });

      const locEl = document.createElement('div');
      locEl.textContent = props.locationName;
      details.appendChild(locEl);

      if (props.rvInfo) {
        try {
          const rv = JSON.parse(props.rvInfo);
          if (rv.type || rv.make) {
            const rvEl = document.createElement('div');
            Object.assign(rvEl.style, { display: 'flex', alignItems: 'center', gap: '6px' });
            rvEl.textContent = `Vehicle: ${[rv.type, rv.make, rv.model].filter(Boolean).join(' ')}`;
            details.appendChild(rvEl);
          }
        } catch { /* malformed rv_info JSON */ }
      }

      const timeEl = document.createElement('div');
      timeEl.textContent = `Updated ${getTimeAgo(props.lastUpdated)}`;
      details.appendChild(timeEl);
      popupEl.appendChild(details);

      popupRef.current = new mapboxgl.Popup({ offset: 14, maxWidth: '260px' })
        .setLngLat(coords)
        .setDOMContent(popupEl)
        .addTo(m);
    });

    m.on('click', CLUSTER_LAYER, (e) => {
      const features = m.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] });
      if (!features[0]) return;
      const source = m.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(features[0].properties?.cluster_id, (err, zoom) => {
        if (err || zoom == null) return;
        m.easeTo({ center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number], zoom });
      });
    });

    m.on('mouseenter', POINTS_LAYER, () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', POINTS_LAYER, () => { m.getCanvas().style.cursor = ''; });
    m.on('mouseenter', CLUSTER_LAYER, () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', CLUSTER_LAYER, () => { m.getCanvas().style.cursor = ''; });

    layersAddedRef.current = true;
  }, [removeLayers]);

  useEffect(() => {
    const m = map?.current;
    if (!m) return;

    const data = buildFeatureCollection(isVisible ? friendLocations : []);

    const onStyleLoad = () => {
      layersAddedRef.current = false;
      setupLayers(m, data);
    };

    if (m.isStyleLoaded()) setupLayers(m, data);
    m.on('style.load', onStyleLoad);

    return () => {
      m.off('style.load', onStyleLoad);
      popupRef.current?.remove();
      removeLayers(m);
    };
  }, [map, friendLocations, isVisible, setupLayers, removeLayers]);

  return null;
}
