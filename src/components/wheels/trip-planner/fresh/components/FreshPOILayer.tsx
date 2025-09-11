import { useEffect, useRef, useState } from 'react';
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

export default function FreshPOILayer({ map, filters }: FreshPOILayerProps) {
  const [pois, setPois] = useState<POI[]>([]);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    // For now, use sample POI data. In production, this would come from a database
    const samplePOIs: POI[] = [
      { id: '1', name: 'Dog Park Sydney', category: 'pet_stop', description: 'Off-leash area', latitude: -33.8688, longitude: 151.2093 },
      { id: '2', name: 'RV Parking Melbourne', category: 'wide_parking', description: 'Wide spaces for RVs', latitude: -37.8136, longitude: 144.9631 },
      { id: '3', name: 'Brisbane Emergency', category: 'medical', description: '24/7 Emergency Services', latitude: -27.4698, longitude: 153.0251 },
      { id: '4', name: 'Adelaide Markets', category: 'farmers_market', description: 'Fresh local produce', latitude: -34.9285, longitude: 138.6007 },
    ];
    setPois(samplePOIs);
  }, []);

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    pois.forEach(poi => {
      if (!filters[poi.category]) return;

      const el = document.createElement('div');
      el.className = 'poi-marker';
      el.style.fontSize = '20px';
      el.textContent = getIcon(poi.category);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([poi.longitude, poi.latitude])
        .addTo(map);

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class="p-2 text-sm"><div class="font-semibold mb-1">${poi.name}</div><div>${poi.description}</div></div>`
      );
      
      marker.getElement().addEventListener('click', () => {
        marker.setPopup(popup);
        popup.addTo(map);
      });

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [map, pois, filters]);

  return null;
}

function getIcon(category: string): string {
  switch (category) {
    case 'pet_stop':
      return '🐾';
    case 'wide_parking':
      return '🅿️';
    case 'medical':
      return '🚑';
    case 'farmers_market':
      return '🥕';
    default:
      return '📍';
  }
}
