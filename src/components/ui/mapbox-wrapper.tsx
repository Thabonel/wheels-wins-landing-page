import React, { useRef, useEffect, useState } from 'react';
import { getMapboxPublicToken } from '@/utils/mapboxConfig';
import type mapboxgl from 'mapbox-gl';

// Import CSS only when needed
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxWrapperProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  center?: [number, number];
  zoom?: number;
  style?: string;
  markers?: Array<{
    lng: number;
    lat: number;
    popup?: string;
  }>;
}

const MapboxWrapper: React.FC<MapboxWrapperProps> = ({
  width = '100%',
  height = 400,
  className = '',
  center = [133.7751, -25.2744], // Australia center (lng, lat)
  zoom = 4,
  style = 'mapbox://styles/mapbox/outdoors-v12',
  markers = []
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = getMapboxPublicToken();
    if (!token) {
      console.warn('Mapbox token not found. Map will not load.');
      return;
    }

    // Phase 4: Dynamic import to reduce initial bundle size by ~1.6MB
    let cancelled = false;

    import('mapbox-gl').then((mapboxglModule) => {
      if (cancelled || !mapContainer.current) return;

      const mapboxgl = mapboxglModule.default;
      mapboxgl.accessToken = token;

      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style,
        center,
        zoom,
        attributionControl: false, // Reduce clutter
      });

      map.current.on('load', () => {
        setMapLoaded(true);
      });

      // Add markers
      markers.forEach((marker) => {
        if (map.current) {
          const mapMarker = new mapboxgl.Marker()
            .setLngLat([marker.lng, marker.lat]);

          if (marker.popup) {
            mapMarker.setPopup(new mapboxgl.Popup().setHTML(marker.popup));
          }

          mapMarker.addTo(map.current);
        }
      });
    }).catch((error) => {
      console.error('Failed to load mapbox-gl:', error);
    });

    // Cleanup
    return () => {
      cancelled = true;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom, style, markers]);

  return (
    <div
      ref={mapContainer}
      className={`mapbox-map ${className}`}
      style={{
        width,
        height,
        borderRadius: '0.5rem',
        overflow: 'hidden'
      }}
    />
  );
};

export default MapboxWrapper;