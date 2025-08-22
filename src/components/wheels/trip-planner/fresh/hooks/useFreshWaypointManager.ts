import { useState, useCallback, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { toast } from 'sonner';

export interface Waypoint {
  id: string;
  name: string;
  coordinates: [number, number];
  address?: string;
  type?: 'origin' | 'destination' | 'waypoint';
  marker?: mapboxgl.Marker;
}

interface RouteInfo {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: any; // GeoJSON geometry
}

interface UseFreshWaypointManagerProps {
  map?: mapboxgl.Map | null;
  onRouteUpdate?: (waypoints: Waypoint[], route: RouteInfo | null) => void;
}

export function useFreshWaypointManager({ 
  map, 
  onRouteUpdate 
}: UseFreshWaypointManagerProps = {}) {
  // Core state
  const [waypoints, setWaypointsInternal] = useState<Waypoint[]>([]);
  const [currentRoute, setCurrentRoute] = useState<RouteInfo | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeProfile, setRouteProfile] = useState<'driving' | 'walking' | 'cycling'>('driving');
  
  // History for undo/redo
  const [history, setHistory] = useState<Waypoint[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Map markers
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  
  // Add waypoint to history
  const addToHistory = useCallback((newWaypoints: Waypoint[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...newWaypoints]);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);
  
  // Main setWaypoints function - properly exposed
  const setWaypoints = useCallback((newWaypoints: Waypoint[]) => {
    setWaypointsInternal(newWaypoints);
    addToHistory(newWaypoints);
    
    // Update map markers
    if (map) {
      updateMapMarkers(newWaypoints);
    }
    
    // Calculate route if we have enough waypoints
    if (newWaypoints.length >= 2) {
      calculateRoute(newWaypoints);
    } else {
      setCurrentRoute(null);
    }
    
    // Notify parent
    if (onRouteUpdate) {
      onRouteUpdate(newWaypoints, currentRoute);
    }
  }, [map, onRouteUpdate, currentRoute, addToHistory]);
  
  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousWaypoints = history[newIndex];
      setHistoryIndex(newIndex);
      setWaypointsInternal(previousWaypoints);
      
      if (map) {
        updateMapMarkers(previousWaypoints);
      }
      
      if (previousWaypoints.length >= 2) {
        calculateRoute(previousWaypoints);
      } else {
        setCurrentRoute(null);
      }
      
      toast.info('Action undone');
    }
  }, [history, historyIndex, map]);
  
  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextWaypoints = history[newIndex];
      setHistoryIndex(newIndex);
      setWaypointsInternal(nextWaypoints);
      
      if (map) {
        updateMapMarkers(nextWaypoints);
      }
      
      if (nextWaypoints.length >= 2) {
        calculateRoute(nextWaypoints);
      } else {
        setCurrentRoute(null);
      }
      
      toast.info('Action redone');
    }
  }, [history, historyIndex, map]);
  
  // Add a new waypoint
  const addWaypoint = useCallback((waypoint: Omit<Waypoint, 'id'>) => {
    const newWaypoint: Waypoint = {
      ...waypoint,
      id: `waypoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    setWaypoints([...waypoints, newWaypoint]);
  }, [waypoints, setWaypoints]);
  
  // Remove a waypoint
  const removeWaypoint = useCallback((id: string) => {
    const newWaypoints = waypoints.filter(wp => wp.id !== id);
    setWaypoints(newWaypoints);
    
    // Remove marker from map
    const marker = markersRef.current.get(id);
    if (marker) {
      marker.remove();
      markersRef.current.delete(id);
    }
  }, [waypoints, setWaypoints]);
  
  // Reorder waypoints
  const reorderWaypoints = useCallback((startIndex: number, endIndex: number) => {
    const result = Array.from(waypoints);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    
    // Update types based on position
    result.forEach((wp, index) => {
      if (index === 0) wp.type = 'origin';
      else if (index === result.length - 1) wp.type = 'destination';
      else wp.type = 'waypoint';
    });
    
    setWaypoints(result);
  }, [waypoints, setWaypoints]);
  
  // Clear all waypoints
  const clearWaypoints = useCallback(() => {
    // Remove all markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();
    
    // Clear waypoints
    setWaypoints([]);
    setCurrentRoute(null);
  }, [setWaypoints]);
  
  // Update map markers
  const updateMapMarkers = (waypoints: Waypoint[]) => {
    if (!map) return;
    
    // Remove old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();
    
    // Add new markers
    waypoints.forEach((waypoint, index) => {
      const color = index === 0 ? '#00ff00' : // Green for start
                   index === waypoints.length - 1 ? '#ff0000' : // Red for end
                   '#0080ff'; // Blue for waypoints
      
      const marker = new mapboxgl.Marker({ color })
        .setLngLat(waypoint.coordinates)
        .setPopup(new mapboxgl.Popup().setText(waypoint.name))
        .addTo(map);
      
      markersRef.current.set(waypoint.id, marker);
    });
  };
  
  // Calculate route using Mapbox Directions API
  const calculateRoute = async (waypoints: Waypoint[]) => {
    if (!map || waypoints.length < 2) return;
    
    setIsLoadingRoute(true);
    
    try {
      const coordinates = waypoints.map(wp => wp.coordinates.join(',')).join(';');
      const url = `https://api.mapbox.com/directions/v5/mapbox/${routeProfile}/${coordinates}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        setCurrentRoute({
          distance: route.distance,
          duration: route.duration,
          geometry: route.geometry
        });
        
        // Draw route on map
        drawRoute(route.geometry);
        
        // Fit map to route bounds
        fitMapToRoute(waypoints);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      toast.error('Failed to calculate route');
    } finally {
      setIsLoadingRoute(false);
    }
  };
  
  // Draw route on map
  const drawRoute = (geometry: any) => {
    if (!map) return;
    
    // Remove existing route layer if it exists
    if (map.getLayer('route')) {
      map.removeLayer('route');
    }
    if (map.getSource('route')) {
      map.removeSource('route');
    }
    
    // Add new route
    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: geometry
      }
    });
    
    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 5,
        'line-opacity': 0.8
      }
    });
  };
  
  // Fit map to show all waypoints
  const fitMapToRoute = (waypoints: Waypoint[]) => {
    if (!map || waypoints.length === 0) return;
    
    const bounds = new mapboxgl.LngLatBounds();
    waypoints.forEach(wp => bounds.extend(wp.coordinates));
    
    map.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 }
    });
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current.clear();
    };
  }, []);
  
  return {
    // State
    waypoints,
    currentRoute,
    isLoadingRoute,
    routeProfile,
    
    // Main functions - all properly exposed
    setWaypoints,       // ✅ Exposed for external use
    addWaypoint,
    removeWaypoint,
    reorderWaypoints,
    clearWaypoints,
    setRouteProfile,
    
    // Undo/Redo - working functions
    undo,               // ✅ Working function
    redo,               // ✅ Working function
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    
    // Utility
    historyLength: history.length,
    currentHistoryIndex: historyIndex
  };
}