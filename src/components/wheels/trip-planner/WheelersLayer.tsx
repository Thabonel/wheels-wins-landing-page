import { useEffect, useState, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

function useSafeAuth() {
  try {
    return useAuth();
  } catch {
    return { user: null };
  }
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

interface WheelersLayerProps {
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  isVisible: boolean;
}

const SOURCE_ID = 'wheelers-source';
const CLUSTER_LAYER = 'wheelers-clusters';
const CLUSTER_COUNT_LAYER = 'wheelers-cluster-count';
const POINTS_LAYER = 'wheelers-points';
const LABELS_LAYER = 'wheelers-labels';

function buildFeatureCollection(locations: UserLocation[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: locations.map(loc => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [loc.current_longitude, loc.current_latitude],
      },
      properties: {
        id: String(loc.id),
        userId: loc.user_id,
        name: loc.user_profiles?.full_name || 'Wheeler',
        initial: (loc.user_profiles?.full_name || 'W').charAt(0).toUpperCase(),
        rigType: loc.user_profiles_extended?.rig_type || '',
        updatedAt: loc.updated_at || '',
      },
    })),
  };
}

export default function WheelersLayer({ map, isVisible }: WheelersLayerProps) {
  const { user } = useSafeAuth();
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const layersAddedRef = useRef(false);

  useEffect(() => {
    if (!isVisible || !user?.id) return;

    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('user_locations')
          .select(`*, user_profiles (full_name, avatar_url), user_profiles_extended (rig_type)`)
          .eq('status', 'active')
          .neq('user_id', user.id)
          .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (error) {
          console.error('Error fetching wheeler locations:', error);
          return;
        }

        const valid = (data || [])
          .filter((loc: any) => loc.user_profiles && !('error' in loc.user_profiles))
          .map((loc: any): UserLocation => ({
            id: loc.id,
            user_id: loc.user_id,
            current_latitude: loc.current_latitude,
            current_longitude: loc.current_longitude,
            status: loc.status,
            updated_at: loc.updated_at,
            user_profiles: loc.user_profiles,
            user_profiles_extended: loc.user_profiles_extended,
          }));

        setUserLocations(valid);
      } catch (error) {
        console.error('Error fetching wheeler locations:', error);
      }
    };

    fetchLocations();
    const interval = setInterval(fetchLocations, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isVisible, user?.id]);

  const removeLayers = useCallback((m: mapboxgl.Map) => {
    if (!m.getStyle()) { layersAddedRef.current = false; return; }
    [LABELS_LAYER, POINTS_LAYER, CLUSTER_COUNT_LAYER, CLUSTER_LAYER].forEach(id => {
      if (m.getLayer(id)) m.removeLayer(id);
    });
    if (m.getSource(SOURCE_ID)) m.removeSource(SOURCE_ID);
    layersAddedRef.current = false;
  }, []);

  const setupLayers = useCallback((m: mapboxgl.Map, data: GeoJSON.FeatureCollection) => {
    if (layersAddedRef.current) {
      const source = m.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      if (source) { source.setData(data); return; }
    }

    removeLayers(m);

    m.addSource(SOURCE_ID, {
      type: 'geojson',
      data,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    m.addLayer({
      id: CLUSTER_LAYER,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#10b981',
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
        'circle-color': '#10b981',
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

      const updatedStr = props.updatedAt
        ? `Last seen: ${new Date(props.updatedAt).toLocaleString()}`
        : 'Recently active';

      const popupEl = document.createElement('div');
      popupEl.style.padding = '10px';

      const nameEl = document.createElement('div');
      Object.assign(nameEl.style, { fontWeight: '600', fontSize: '14px', marginBottom: '4px' });
      nameEl.textContent = props.name;
      popupEl.appendChild(nameEl);

      if (props.rigType) {
        const rigEl = document.createElement('div');
        Object.assign(rigEl.style, { fontSize: '12px', color: '#10b981', marginBottom: '4px' });
        rigEl.textContent = props.rigType;
        popupEl.appendChild(rigEl);
      }

      const timeEl = document.createElement('div');
      Object.assign(timeEl.style, { fontSize: '12px', color: '#6b7280', marginBottom: '8px' });
      timeEl.textContent = updatedStr;
      popupEl.appendChild(timeEl);

      const btn = document.createElement('button');
      btn.textContent = 'Connect';
      Object.assign(btn.style, { background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', width: '100%' });
      btn.addEventListener('click', () => {
        toast({
          title: 'Connection Request',
          description: `Sent connection request to ${props.name}. They'll be notified!`,
        });
      });
      popupEl.appendChild(btn);

      popupRef.current = new mapboxgl.Popup({ offset: 14, maxWidth: '240px' })
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

    const data = buildFeatureCollection(isVisible ? userLocations : []);

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
  }, [map, userLocations, isVisible, setupLayers, removeLayers]);

  return null;
}
