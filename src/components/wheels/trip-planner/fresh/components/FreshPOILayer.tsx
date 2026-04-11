import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

interface POI {
  id: string;
  name: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
}

interface FreshPOILayerProps {
  map: mapboxgl.Map | null;
  filters: Record<string, boolean>;
}

const SOURCE_ID = 'pois-source';
const CLUSTER_LAYER = 'pois-clusters';
const CLUSTER_COUNT_LAYER = 'pois-cluster-count';
const UNCLUSTERED_LAYER = 'pois-unclustered';

const CATEGORY_COLORS: Record<string, string> = {
  pet_stop: '#8b5cf6',
  wide_parking: '#3b82f6',
  medical: '#ef4444',
  farmers_market: '#22c55e',
  fuel: '#f97316',
  camping: '#10b981',
  dump_station: '#6b7280',
  water: '#06b6d4',
};

const CATEGORY_LABELS: Record<string, string> = {
  pet_stop: 'Pet Stop',
  wide_parking: 'RV Parking',
  medical: 'Medical',
  farmers_market: 'Market',
  fuel: 'Fuel',
  camping: 'Camping',
  dump_station: 'Dump Station',
  water: 'Water',
};

function buildFeatureCollection(pois: POI[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pois.map(poi => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [poi.longitude, poi.latitude],
      },
      properties: {
        id: poi.id,
        name: poi.name,
        category: poi.category,
        description: poi.description,
        color: CATEGORY_COLORS[poi.category] || '#6b7280',
        label: CATEGORY_LABELS[poi.category] || poi.category,
      },
    })),
  };
}

function getActiveCategories(filters: Record<string, boolean>): string[] {
  return Object.entries(filters)
    .filter(([, enabled]) => enabled)
    .map(([category]) => category);
}

export default function FreshPOILayer({ map, filters }: FreshPOILayerProps) {
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const setupDoneRef = useRef(false);

  // Sample POI data - in production this comes from a database/API
  const pois: POI[] = [
    { id: '1', name: 'Dog Park Sydney', category: 'pet_stop', description: 'Off-leash area with water stations', latitude: -33.8688, longitude: 151.2093 },
    { id: '2', name: 'RV Parking Melbourne', category: 'wide_parking', description: 'Wide spaces for RVs and caravans', latitude: -37.8136, longitude: 144.9631 },
    { id: '3', name: 'Brisbane Emergency', category: 'medical', description: '24/7 Emergency Services', latitude: -27.4698, longitude: 153.0251 },
    { id: '4', name: 'Adelaide Central Market', category: 'farmers_market', description: 'Fresh local produce daily', latitude: -34.9285, longitude: 138.6007 },
    { id: '5', name: 'Canberra Fuel Stop', category: 'fuel', description: 'Diesel and LPG available', latitude: -35.2809, longitude: 149.1300 },
    { id: '6', name: 'Barossa Valley Camping', category: 'camping', description: 'Powered sites with amenities', latitude: -34.5609, longitude: 138.9500 },
    { id: '7', name: 'Wollongong Dump Point', category: 'dump_station', description: 'Free dump station near beach', latitude: -34.4278, longitude: 150.8931 },
    { id: '8', name: 'Blue Mountains Water', category: 'water', description: 'Potable water fill station', latitude: -33.7315, longitude: 150.3120 },
  ];

  const setupLayers = useCallback(() => {
    if (!map) return;

    const activeCategories = getActiveCategories(filters);
    const activePois = pois.filter(p => activeCategories.includes(p.category));
    const data = buildFeatureCollection(activePois);

    const existingSource = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
    if (existingSource) {
      existingSource.setData(data);
      return;
    }

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    map.addLayer({
      id: CLUSTER_LAYER,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step', ['get', 'point_count'],
          '#51bbd6', 5,
          '#f1f075', 15,
          '#f28cb1',
        ],
        'circle-radius': [
          'step', ['get', 'point_count'],
          18, 5, 24, 15, 30,
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    map.addLayer({
      id: CLUSTER_COUNT_LAYER,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 13,
      },
    });

    map.addLayer({
      id: UNCLUSTERED_LAYER,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 8,
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    map.on('click', UNCLUSTERED_LAYER, (e) => {
      if (!e.features?.[0]) return;
      const feature = e.features[0];
      const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
      const props = feature.properties!;

      popupRef.current?.remove();

      const popupEl = document.createElement('div');
      popupEl.style.padding = '8px';

      const nameEl = document.createElement('div');
      Object.assign(nameEl.style, { fontWeight: '600', marginBottom: '4px', color: '#1a1a1a' });
      nameEl.textContent = props.name;
      popupEl.appendChild(nameEl);

      const labelEl = document.createElement('div');
      Object.assign(labelEl.style, { fontSize: '12px', color: props.color, marginBottom: '4px', fontWeight: '500' });
      labelEl.textContent = props.label;
      popupEl.appendChild(labelEl);

      const descEl = document.createElement('div');
      Object.assign(descEl.style, { fontSize: '13px', color: '#4a4a4a' });
      descEl.textContent = props.description;
      popupEl.appendChild(descEl);

      popupRef.current = new mapboxgl.Popup({ offset: 12, maxWidth: '240px' })
        .setLngLat(coords)
        .setDOMContent(popupEl)
        .addTo(map);
    });

    map.on('click', CLUSTER_LAYER, (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] });
      if (!features[0]) return;
      const clusterId = features[0].properties?.cluster_id;
      const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;

      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom === undefined || zoom === null) return;
        map.easeTo({
          center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
          zoom,
        });
      });
    });

    map.on('mouseenter', UNCLUSTERED_LAYER, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', UNCLUSTERED_LAYER, () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', CLUSTER_LAYER, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', CLUSTER_LAYER, () => {
      map.getCanvas().style.cursor = '';
    });

    setupDoneRef.current = true;
  }, [map, filters]);

  useEffect(() => {
    if (!map) return;

    const onStyleLoad = () => {
      setupDoneRef.current = false;
      setupLayers();
    };

    if (map.isStyleLoaded()) {
      setupLayers();
    }

    map.on('style.load', onStyleLoad);

    return () => {
      map.off('style.load', onStyleLoad);
      popupRef.current?.remove();
      if (!map.getStyle()) return;
      if (map.getLayer(CLUSTER_COUNT_LAYER)) map.removeLayer(CLUSTER_COUNT_LAYER);
      if (map.getLayer(CLUSTER_LAYER)) map.removeLayer(CLUSTER_LAYER);
      if (map.getLayer(UNCLUSTERED_LAYER)) map.removeLayer(UNCLUSTERED_LAYER);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map, setupLayers]);

  // Update data when filters change (separate from initial setup)
  useEffect(() => {
    if (!map || !setupDoneRef.current) return;

    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
    if (!source) return;

    const activeCategories = getActiveCategories(filters);
    const activePois = pois.filter(p => activeCategories.includes(p.category));
    source.setData(buildFeatureCollection(activePois));
  }, [filters, map]);

  return null;
}
