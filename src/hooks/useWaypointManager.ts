import { useState, useCallback, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { toast } from 'sonner';

interface Waypoint {
  id: string;
  coordinates: [number, number];
  name?: string;
  type?: string;
  address?: string;
}

interface Route {
  distance: number;
  duration: number;
  geometry?: any;
}

interface UseWaypointManagerProps {
  map: mapboxgl.Map | null;
  onRouteUpdate?: (waypoints: Waypoint[]) => void;
}

export function useWaypointManager({ map, onRouteUpdate }: UseWaypointManagerProps) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [routeProfile, setRouteProfile] = useState<'driving' | 'walking' | 'cycling'>('driving');
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isAddingMode, setIsAddingMode] = useState(false);
  
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const routeLayerRef = useRef<string>('route-layer');

  // Clear all markers from the map
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    setWaypoints([]);
    setCurrentRoute(null);
    
    // Remove route layer if it exists
    if (map) {
      if (map.getLayer(routeLayerRef.current)) {
        map.removeLayer(routeLayerRef.current);
      }
      if (map.getSource(routeLayerRef.current)) {
        map.removeSource(routeLayerRef.current);
      }
    }
  }, [map]);

  // Add waypoint at specific location
  const addWaypointAtLocation = useCallback((lngLat: [number, number]) => {
    if (!map) return;

    const newWaypoint: Waypoint = {
      id: `waypoint-${Date.now()}`,
      coordinates: lngLat,
      name: `Waypoint ${waypoints.length + 1}`
    };

    // Create marker
    const marker = new mapboxgl.Marker({
      draggable: true,
      color: waypoints.length === 0 ? '#00b55e' : waypoints.length === 1 ? '#ff0000' : '#0084ff'
    })
      .setLngLat(lngLat)
      .addTo(map);

    // Handle marker drag
    marker.on('dragend', () => {
      const markerLngLat = marker.getLngLat();
      const updatedWaypoints = waypoints.map(wp => 
        wp.id === newWaypoint.id 
          ? { ...wp, coordinates: [markerLngLat.lng, markerLngLat.lat] as [number, number] }
          : wp
      );
      setWaypoints(updatedWaypoints);
    });

    markersRef.current.push(marker);
    
    const updatedWaypoints = [...waypoints, newWaypoint];
    setWaypoints(updatedWaypoints);
    
    // Update route if we have at least 2 waypoints
    if (updatedWaypoints.length >= 2) {
      updateRoute(updatedWaypoints);
    }

    toast.success(`Waypoint ${waypoints.length + 1} added`);
  }, [map, waypoints]);

  // Update route based on waypoints
  const updateRoute = useCallback(async (waypointList: Waypoint[]) => {
    if (!map || waypointList.length < 2) return;

    setIsLoadingRoute(true);

    try {
      // Build coordinates string for Mapbox Directions API
      const coordinates = waypointList
        .map(wp => `${wp.coordinates[0]},${wp.coordinates[1]}`)
        .join(';');

      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${routeProfile}/${coordinates}?` +
        `geometries=geojson&overview=full&access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`
      );

      if (!response.ok) throw new Error('Failed to fetch route');

      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        setCurrentRoute({
          distance: route.distance,
          duration: route.duration,
          geometry: route.geometry
        });

        // Draw route on map
        const sourceId = routeLayerRef.current;
        
        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
            type: 'Feature',
            properties: {},
            geometry: route.geometry
          });
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route.geometry
            }
          });

          map.addLayer({
            id: sourceId,
            type: 'line',
            source: sourceId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#0084ff',
              'line-width': 4,
              'line-opacity': 0.75
            }
          });
        }
      }
    } catch (error) {
      console.error('Error updating route:', error);
      toast.error('Failed to calculate route');
    } finally {
      setIsLoadingRoute(false);
    }
  }, [map, routeProfile]);

  // Update route when waypoints change
  useEffect(() => {
    if (waypoints.length >= 2) {
      updateRoute(waypoints);
    }
    
    if (onRouteUpdate) {
      onRouteUpdate(waypoints);
    }
  }, [waypoints, updateRoute, onRouteUpdate]);

  // Set waypoints directly (for GPX import, etc.)
  const setWaypointsDirectly = useCallback((newWaypoints: Waypoint[]) => {
    // Clear existing markers
    clearMarkers();
    
    // Add new markers for each waypoint
    newWaypoints.forEach((waypoint, index) => {
      if (map) {
        const marker = new mapboxgl.Marker({
          draggable: true,
          color: index === 0 ? '#00b55e' : index === newWaypoints.length - 1 ? '#ff0000' : '#0084ff'
        })
          .setLngLat(waypoint.coordinates)
          .addTo(map);

        markersRef.current.push(marker);
      }
    });
    
    setWaypoints(newWaypoints);
  }, [map, clearMarkers]);

  // Handle map click to add waypoint
  useEffect(() => {
    if (!map || !isAddingMode) return;

    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      addWaypointAtLocation([e.lngLat.lng, e.lngLat.lat]);
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, isAddingMode, addWaypointAtLocation]);

  return {
    waypoints,
    currentRoute,
    routeProfile,
    isLoadingRoute,
    isAddingMode,
    setIsAddingMode,
    setRouteProfile,
    addWaypointAtLocation,
    clearMarkers,
    setWaypoints: setWaypointsDirectly
  };
}