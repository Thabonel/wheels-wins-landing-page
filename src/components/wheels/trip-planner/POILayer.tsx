import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { POI } from './types';

interface POILayerProps {
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  filters: Record<string, boolean>;
}

export default function POILayer({ map, filters }: POILayerProps) {
  const [pois, setPois] = useState<POI[]>([]);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    fetch('/data/poi/pois.json')
      .then(res => res.json())
      .then(setPois)
      .catch(err => console.error('Failed to load POIs', err));
  }, []);

  useEffect(() => {
    if (!map.current) return;

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
        .addTo(map.current!);

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class="p-2 text-sm"><div class="font-semibold mb-1">${poi.name}</div><div>${poi.description}</div></div>`
      );
      marker.getElement().addEventListener('click', () => popup.addTo(map.current!));

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
