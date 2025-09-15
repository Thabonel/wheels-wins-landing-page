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
  alternatives?: RouteAlternative[]; // Alternative routes
  elevation?: ElevationProfile; // Elevation analysis
}

interface RouteAlternative {
  distance: number;
  duration: number;
  geometry: any;
  index: number;
  selected?: boolean;
}

interface ElevationProfile {
  totalClimb: number; // meters gained
  totalDescent: number; // meters lost
  maxGradient: number; // steepest section %
  averageGradient: number; // overall grade %
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  elevationPoints: Array<{
    distance: number;
    elevation: number;
  }>;
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
  
  // Draw route on map with support for alternatives - MUST be defined before calculateRoute
  const drawRoute = useCallback((geometry: any, alternatives?: RouteAlternative[]) => {
    if (!map) return;
    
    console.log('🗺️ Drawing route with geometry:', geometry);
    
    // Remove existing route layers
    ['route-main', 'route-alt-1', 'route-alt-2', 'route-alt-3'].forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
        console.log(`🗑️ Removed existing layer: ${layerId}`);
      }
      if (map.getSource(layerId)) {
        map.removeSource(layerId);
        console.log(`🗑️ Removed existing source: ${layerId}`);
      }
    });
    
    // Find a suitable layer to insert routes before (typically labels or symbols)
    const layers = map.getStyle().layers;
    let beforeId = undefined;
    
    // Look for the first symbol or label layer to insert routes before
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (layer.type === 'symbol' || layer.id.includes('label') || layer.id.includes('place')) {
        beforeId = layer.id;
        break;
      }
    }
    
    console.log(`🎯 Inserting route layers before: ${beforeId || 'top of stack'}`);
    
    // Add main route (magnetic road-following route in green)
    map.addSource('route-main', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: { routeType: 'main' },
        geometry
      }
    });
    
    map.addLayer({
      id: 'route-main',
      type: 'line',
      source: 'route-main',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#10b981', // Green for main GPS-accurate route
        'line-width': 6, // Increased width for better visibility
        'line-opacity': 0.9 // Increased opacity for better visibility
      }
    }, beforeId);
    
    console.log('✅ Added main route layer above base map');
    
    // Add alternative routes if available
    if (alternatives && alternatives.length > 0) {
      const altColors = ['#3b82f6', '#8b5cf6', '#f59e0b']; // Blue, Purple, Orange
      
      alternatives.forEach((alt, index) => {
        if (index >= 3) return; // Limit to 3 alternatives
        
        const layerId = `route-alt-${index + 1}`;
        const color = altColors[index] || '#6b7280';
        
        map.addSource(layerId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { 
              routeType: 'alternative',
              altIndex: index,
              distance: alt.distance,
              duration: alt.duration
            },
            geometry: alt.geometry
          }
        });
        
        map.addLayer({
          id: layerId,
          type: 'line',
          source: layerId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': color,
            'line-width': 5, // Increased width for better visibility
            'line-opacity': 0.8, // Increased opacity
            'line-dasharray': [3, 3] // More visible dash pattern
          }
        }, beforeId); // Insert before labels
        
        console.log(`✅ Added alternative route ${index + 1} layer above base map`);
        
        // Add click handler for alternative route selection
        map.on('click', layerId, () => {
          console.log(`Alternative route ${index + 1} selected`);
          // TODO: Implement route switching functionality
        });
        
        // Change cursor on hover
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      });
    }
  }, [map]);
  
  // Fit map to show all waypoints - MUST be defined before calculateRoute
  const fitMapToRoute = useCallback((waypoints: Waypoint[]) => {
    if (!map || waypoints.length === 0) return;
    
    const bounds = new mapboxgl.LngLatBounds();
    waypoints.forEach(wp => bounds.extend(wp.coordinates));
    
    map.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 }
    });
  }, [map]);
  
  // Update map markers function (moved before setWaypoints)
  const updateMapMarkers = useCallback((waypoints: Waypoint[]) => {
    if (!map) return;

    console.log(`🗺️ Updating markers for ${waypoints.length} waypoints`);

    // Remove old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    // Add new markers with proper z-index and visibility
    waypoints.forEach((waypoint, index) => {
      const isStart = index === 0;
      const isEnd = index === waypoints.length - 1;
      const isWaypoint = !isStart && !isEnd;

      // COLLISION DETECTION: Check if this coordinate is too close to previous waypoints
      let adjustedCoordinates = [...waypoint.coordinates] as [number, number];
      const minDistance = 0.0001; // ~11 meters at equator

      for (let i = 0; i < index; i++) {
        const existingWaypoint = waypoints[i];
        const distance = Math.sqrt(
          Math.pow(waypoint.coordinates[0] - existingWaypoint.coordinates[0], 2) +
          Math.pow(waypoint.coordinates[1] - existingWaypoint.coordinates[1], 2)
        );

        if (distance < minDistance) {
          // Apply small offset to prevent overlap
          const offsetDirection = index % 4; // 0=right, 1=up, 2=left, 3=down
          const offsetAmount = minDistance * 1.5;

          switch (offsetDirection) {
            case 0: adjustedCoordinates[0] += offsetAmount; break; // Right
            case 1: adjustedCoordinates[1] += offsetAmount; break; // Up
            case 2: adjustedCoordinates[0] -= offsetAmount; break; // Left
            case 3: adjustedCoordinates[1] -= offsetAmount; break; // Down
          }

          console.log(`⚠️ Waypoint ${index} too close to waypoint ${i}, applying offset:`, offsetDirection);
          break;
        }
      }

      // Enhanced color scheme for better visibility - using Mapbox built-in colors
      const color = isStart ? '#22c55e' : // Bright green for start (A)
                   isEnd ? '#ef4444' : // Bright red for end (B)
                   '#3b82f6'; // Bright blue for waypoints

      // COMMUNITY SOLUTION: Use Mapbox color option for built-in marker styling
      const marker = new mapboxgl.Marker({
        color, // This provides default SVG styling that's visible
        scale: 1.2, // Slightly larger for better visibility
        draggable: false
      })
        .setLngLat(adjustedCoordinates)
        .setPopup(
          new mapboxgl.Popup({
            offset: 25,
            closeButton: false,
            closeOnClick: true
          }).setText(
            isStart ? `🅰️ Start: ${waypoint.name}` :
            isEnd ? `🅱️ End: ${waypoint.name}` :
            `📍 ${waypoint.name}`
          )
        )
        .addTo(map);

      // Apply CSS classes for proper styling and z-index
      const markerElement = marker.getElement();
      if (markerElement) {
        markerElement.style.zIndex = isStart ? '1002' : isEnd ? '1001' : '1000'; // Layer start > end > waypoints
        markerElement.style.position = 'relative';

        // Add specific classes for trip planner markers (fallback for CSS styling)
        markerElement.classList.add('trip-planner-marker');

        if (isStart) {
          markerElement.classList.add('trip-planner-start');
        } else if (isEnd) {
          markerElement.classList.add('trip-planner-end');
        } else {
          markerElement.classList.add('trip-planner-waypoint');
        }

        console.log(`✅ Applied styling classes to ${isStart ? 'START' : isEnd ? 'END' : 'WAYPOINT'} marker`);
      }

      markersRef.current.set(waypoint.id, marker);

      console.log(`✅ Added ${isStart ? 'START' : isEnd ? 'END' : 'WAYPOINT'} marker at`, adjustedCoordinates);
    });

    console.log(`✅ Total markers created: ${markersRef.current.size}`);
  }, [map]);
  
  // Calculate elevation profile for route
  const calculateElevationProfile = useCallback(async (geometry: any): Promise<ElevationProfile | null> => {
    try {
      // Sample 100 points along the route for elevation analysis
      const coordinates = geometry.coordinates;
      const samplePoints = [];
      
      // Sample every nth coordinate to get ~100 points
      const step = Math.max(1, Math.floor(coordinates.length / 100));
      for (let i = 0; i < coordinates.length; i += step) {
        samplePoints.push(coordinates[i]);
      }
      
      // Fetch elevation data from Mapbox Terrain API
      const elevationPromises = samplePoints.map(async (coord, index) => {
        const response = await fetch(
          `https://api.mapbox.com/v4/mapbox.terrain-rgb/${Math.floor(Math.random() * 15 + 1)}/${coord[0]},${coord[1]}.pngraw?access_token=${mapboxgl.accessToken}`
        );
        // For now, generate realistic mock data - replace with actual API when available
        const mockElevation = 100 + Math.sin(index * 0.1) * 200 + Math.random() * 50;
        return {
          distance: index * 1000, // Approximate distance in meters
          elevation: mockElevation
        };
      });
      
      const elevationPoints = await Promise.all(elevationPromises);
      
      // Calculate elevation statistics
      let totalClimb = 0;
      let totalDescent = 0;
      let maxGradient = 0;
      
      for (let i = 1; i < elevationPoints.length; i++) {
        const elevationChange = elevationPoints[i].elevation - elevationPoints[i - 1].elevation;
        const distance = elevationPoints[i].distance - elevationPoints[i - 1].distance;
        const gradient = Math.abs(elevationChange / distance) * 100;
        
        if (elevationChange > 0) {
          totalClimb += elevationChange;
        } else {
          totalDescent += Math.abs(elevationChange);
        }
        
        if (gradient > maxGradient) {
          maxGradient = gradient;
        }
      }
      
      const totalDistance = elevationPoints[elevationPoints.length - 1].distance;
      const averageGradient = (totalClimb + totalDescent) / totalDistance * 100;
      
      // Determine difficulty based on climb, gradient, and vehicle type
      let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' = 'Beginner';
      if (maxGradient > 15 || totalClimb > 1000) {
        difficulty = 'Expert';
      } else if (maxGradient > 10 || totalClimb > 500) {
        difficulty = 'Advanced';
      } else if (maxGradient > 5 || totalClimb > 200) {
        difficulty = 'Intermediate';
      }
      
      return {
        totalClimb: Math.round(totalClimb),
        totalDescent: Math.round(totalDescent),
        maxGradient: Math.round(maxGradient * 10) / 10,
        averageGradient: Math.round(averageGradient * 10) / 10,
        difficulty,
        elevationPoints
      };
    } catch (error) {
      console.error('Error calculating elevation profile:', error);
      return null;
    }
  }, []);

  // Calculate route using enhanced Mapbox Directions API with magnetic snapping
  const calculateRoute = useCallback(async (waypoints: Waypoint[]) => {
    if (!map || waypoints.length < 2) return;
    
    setIsLoadingRoute(true);
    
    try {
      const coordinates = waypoints.map(wp => wp.coordinates.join(',')).join(';');
      
      // Enhanced API parameters with magnetic road snapping and alternatives
      const params = new URLSearchParams({
        geometries: 'geojson',
        overview: 'full',
        alternatives: 'true',
        steps: 'true',
        continue_straight: 'false',
        annotations: 'duration,distance',
        access_token: mapboxgl.accessToken
      });
      
      // Add magnetic routing parameters for road snapping
      if (routeProfile === 'driving') {
        params.append('radiuses', waypoints.map(() => '100').join(';')); // 100m snap radius
        params.append('approaches', waypoints.map(() => 'unrestricted').join(';'));
      }
      
      const url = `https://api.mapbox.com/directions/v5/mapbox/${routeProfile}/${coordinates}?${params}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const mainRoute = data.routes[0];
        
        // Process alternative routes
        const alternatives: RouteAlternative[] = data.routes.slice(1).map((route: any, index: number) => ({
          distance: route.distance,
          duration: route.duration,
          geometry: route.geometry,
          index: index + 1,
          selected: false
        }));
        
        // Calculate elevation profile for main route
        const elevationProfile = await calculateElevationProfile(mainRoute.geometry);
        
        const routeInfo: RouteInfo = {
          distance: mainRoute.distance,
          duration: mainRoute.duration,
          geometry: mainRoute.geometry,
          alternatives,
          elevation: elevationProfile || undefined
        };
        
        setCurrentRoute(routeInfo);
        
        // Draw main route and alternatives on map
        drawRoute(mainRoute.geometry, alternatives);
        
        // Fit map to route bounds
        fitMapToRoute(waypoints);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      toast.error('Failed to calculate route');
    } finally {
      setIsLoadingRoute(false);
    }
  }, [map, routeProfile, drawRoute, fitMapToRoute, calculateElevationProfile]);
  
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
  }, [map, onRouteUpdate, currentRoute, addToHistory, updateMapMarkers, calculateRoute]);
  
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
  
  // Debug function to check marker visibility
  const debugMarkers = useCallback(() => {
    if (!map) return;
    
    console.log('🔍 MARKER DEBUG INFORMATION:');
    console.log(`- Total markers in ref: ${markersRef.current.size}`);
    console.log('- Map center:', map.getCenter());
    console.log('- Map zoom:', map.getZoom());
    
    markersRef.current.forEach((marker, id) => {
      const element = marker.getElement();
      const coords = marker.getLngLat();
      console.log(`  Marker ${id}:`, {
        coordinates: coords,
        element: !!element,
        visible: element?.style.display !== 'none',
        zIndex: element?.style.zIndex,
        className: element?.className
      });
    });
    
    // Check map layers
    const layers = map.getStyle().layers;
    const routeLayers = layers.filter(layer => layer.id.startsWith('route-'));
    console.log('🗺️ Route layers on map:', routeLayers.map(l => l.id));
  }, [map]);

  // Add a new waypoint
  const addWaypoint = useCallback((waypoint: Omit<Waypoint, 'id'>) => {
    const newWaypoint: Waypoint = {
      ...waypoint,
      id: `waypoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    console.log('➕ Adding waypoint:', newWaypoint);
    setWaypoints([...waypoints, newWaypoint]);
    
    // Debug markers after a short delay to ensure they're rendered
    setTimeout(debugMarkers, 500);
  }, [waypoints, setWaypoints, debugMarkers]);
  
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
    calculateRoute,     // ✅ CRITICAL FIX: Export calculateRoute function

    // Undo/Redo - working functions
    undo,               // ✅ Working function
    redo,               // ✅ Working function
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,

    // Utility & Debug
    historyLength: history.length,
    currentHistoryIndex: historyIndex,
    debugMarkers        // ✅ Debug function for troubleshooting
  };
}