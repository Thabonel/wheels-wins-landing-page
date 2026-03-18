/**
 * Trip Viewer Map Component - Read-only map display
 * PRD Phase 2: Map display without editing controls
 */

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { UserTrip } from '@/types/userTrips';
import { getMapboxToken } from '@/utils/mapboxToken';
import { transformToGeoJSONLineString, extractWaypoints } from '@/utils/routeDataTransformers';

interface TripViewerMapProps {
  trip: UserTrip;
  onLoad?: () => void;
}

export function TripViewerMap({ trip, onLoad }: TripViewerMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const token = getMapboxToken();
    if (!token) {
      console.warn('No Mapbox token available for trip viewer map');
      return;
    }

    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = token;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [151.2093, -33.8688], // Default to Sydney
      zoom: 6,
      attributionControl: false
    });

    // Add navigation controls (read-only)
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapReady(true);
      if (onLoad) onLoad();
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onLoad]);

  // Render route when map is ready
  useEffect(() => {
    if (!mapReady || !map.current || !trip.metadata?.route_data) return;

    try {
      const routeGeometry = transformToGeoJSONLineString(trip.metadata.route_data);
      const waypoints = extractWaypoints(trip.metadata);

      // Clear existing route data
      if (map.current.getSource('trip-route')) {
        map.current.removeLayer('trip-route-layer');
        map.current.removeSource('trip-route');
      }

      // Remove existing waypoint markers
      const existingMarkers = mapContainer.current?.querySelectorAll('.mapboxgl-marker');
      existingMarkers?.forEach(marker => marker.remove());

      if (routeGeometry) {
        // Add route source and layer
        map.current.addSource('trip-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: routeGeometry,
            properties: {}
          }
        });

        map.current.addLayer({
          id: 'trip-route-layer',
          type: 'line',
          source: 'trip-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#2563eb',
            'line-width': 3,
            'line-opacity': 0.8
          }
        });

        // Fit map to route bounds
        const coordinates = routeGeometry.coordinates as [number, number][];
        if (coordinates.length > 1) {
          const bounds = new mapboxgl.LngLatBounds();
          coordinates.forEach(coord => bounds.extend(coord));

          map.current.fitBounds(bounds, {
            padding: 40,
            maxZoom: 12
          });
        }
      }

      // Add waypoint markers
      if (waypoints.length > 0) {
        waypoints.forEach((waypoint, index) => {
          const isStart = index === 0;
          const isEnd = index === waypoints.length - 1;

          // Create marker element
          const el = document.createElement('div');
          el.className = 'trip-viewer-marker';
          el.style.cssText = `
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            background-color: ${isStart ? '#22c55e' : isEnd ? '#ef4444' : '#3b82f6'};
            cursor: pointer;
          `;

          // Create popup
          const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: false
          }).setHTML(`
            <div class="text-sm">
              <div class="font-medium">${waypoint.name || 'Waypoint'}</div>
            </div>
          `);

          // Add marker to map
          new mapboxgl.Marker(el)
            .setLngLat([waypoint.lng, waypoint.lat])
            .setPopup(popup)
            .addTo(map.current!);
        });

        // If no route geometry but have waypoints, fit to waypoint bounds
        if (!routeGeometry && waypoints.length > 1) {
          const bounds = new mapboxgl.LngLatBounds();
          waypoints.forEach(waypoint => bounds.extend([waypoint.lng, waypoint.lat]));

          map.current.fitBounds(bounds, {
            padding: 40,
            maxZoom: 12
          });
        } else if (waypoints.length === 1) {
          // Single waypoint - center on it
          map.current.setCenter([waypoints[0].lng, waypoints[0].lat]);
          map.current.setZoom(10);
        }
      }
    } catch (error) {
      console.error('Error rendering trip route:', error);
    }
  }, [mapReady, trip]);

  if (!trip.metadata?.route_data) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-sm">No route data available</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      className="w-full h-full"
      style={{ minHeight: '240px' }}
    />
  );
}