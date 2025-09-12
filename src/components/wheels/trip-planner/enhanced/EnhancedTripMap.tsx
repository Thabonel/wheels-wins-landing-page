/**
 * Enhanced Trip Map Component
 * Advanced map visualization with alternative routes, waypoints, and RV-specific features
 */

import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Route as RouteIcon, MapPin, Navigation, TrendingUp } from 'lucide-react';
import { AdvancedWaypoint, AdvancedRoute } from '@/hooks/useAdvancedWaypointManager';
import { cn } from '@/lib/utils';

interface EnhancedTripMapProps {
  waypoints?: AdvancedWaypoint[];
  routes?: AdvancedRoute[];
  mainRoute?: AdvancedRoute | null;
  alternativeRoutes?: AdvancedRoute[];
  isCalculating?: boolean;
  onWaypointAdd?: (coordinates: { lat: number; lng: number }) => void;
  onWaypointMove?: (waypointId: string, coordinates: { lat: number; lng: number }) => void;
  onWaypointRemove?: (waypointId: string) => void;
  onRouteSelect?: (routeId: string) => void;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  enableInteractiveMode?: boolean;
  showRouteDetails?: boolean;
  showElevationProfile?: boolean;
  className?: string;
}

const EnhancedTripMap = memo(({ 
  waypoints = [],
  routes = [],
  mainRoute,
  alternativeRoutes = [],
  isCalculating = false,
  onWaypointAdd,
  onWaypointMove,
  onWaypointRemove,
  onRouteSelect,
  userLocation,
  enableInteractiveMode = false,
  showRouteDetails = true,
  showElevationProfile = false,
  className
}: EnhancedTripMapProps) => {
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Get Mapbox token from environment
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      setMapError('Mapbox token not found');
      return;
    }

    mapboxgl.accessToken = token;

    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: userLocation 
          ? [userLocation.longitude, userLocation.latitude] 
          : [-98.5795, 39.8283], // Center of US
        zoom: 4,
        attributionControl: false
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.addControl(new mapboxgl.AttributionControl({
        compact: true
      }), 'bottom-right');

      map.on('load', () => {
        setIsMapLoaded(true);
        console.log('🗺️ Enhanced trip map loaded');
      });

      // Add click handler for waypoint creation
      if (enableInteractiveMode && onWaypointAdd) {
        map.on('click', (e) => {
          onWaypointAdd({
            lat: e.lngLat.lat,
            lng: e.lngLat.lng
          });
        });
      }

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
        setIsMapLoaded(false);
      };
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapError('Failed to initialize map');
    }
  }, [userLocation, enableInteractiveMode, onWaypointAdd]);

  // Update waypoint markers
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    waypoints.forEach((waypoint, index) => {
      const el = document.createElement('div');
      el.className = cn(
        'enhanced-waypoint-marker',
        waypoint.type === 'start' && 'start-marker',
        waypoint.type === 'end' && 'end-marker',
        waypoint.type === 'waypoint' && 'waypoint-marker'
      );
      
      // Style the marker based on type
      if (waypoint.type === 'start') {
        el.innerHTML = '🏁';
        el.style.fontSize = '24px';
      } else if (waypoint.type === 'end') {
        el.innerHTML = '🏁';
        el.style.fontSize = '24px';
      } else {
        el.innerHTML = `${index}`;
        el.className += ' bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold';
      }

      const marker = new mapboxgl.Marker({ element: el, draggable: enableInteractiveMode })
        .setLngLat([waypoint.lng, waypoint.lat])
        .addTo(mapRef.current!);

      // Add popup with waypoint details
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div class="p-2">
            <div class="font-semibold">${waypoint.name || `Waypoint ${index + 1}`}</div>
            <div class="text-sm text-gray-600">
              ${waypoint.lat.toFixed(6)}, ${waypoint.lng.toFixed(6)}
            </div>
            ${waypoint.confidence !== undefined ? `
              <div class="text-xs mt-1">
                <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                  waypoint.confidence > 0.8 ? 'bg-green-100 text-green-800' : 
                  waypoint.confidence > 0.6 ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }">
                  ${Math.round(waypoint.confidence * 100)}% confidence
                </span>
              </div>
            ` : ''}
            ${enableInteractiveMode && onWaypointRemove ? `
              <button onclick="window.removeWaypoint?.('${waypoint.id}')" 
                      class="mt-2 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">
                Remove
              </button>
            ` : ''}
          </div>
        `);

      marker.setPopup(popup);

      // Handle marker drag events
      if (enableInteractiveMode && onWaypointMove) {
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          onWaypointMove(waypoint.id, { lat: lngLat.lat, lng: lngLat.lng });
        });
      }

      markersRef.current.push(marker);
    });

    // Expose remove function to global scope for popup buttons
    if (enableInteractiveMode && onWaypointRemove) {
      (window as any).removeWaypoint = onWaypointRemove;
    }

  }, [waypoints, isMapLoaded, enableInteractiveMode, onWaypointMove, onWaypointRemove]);

  // Update route visualization
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    const map = mapRef.current;

    // Remove existing route layers
    ['main-route', 'alternative-routes'].forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(layerId)) {
        map.removeSource(layerId);
      }
    });

    // Add alternative routes first (so main route renders on top)
    if (alternativeRoutes.length > 0) {
      const alternativeFeatures = alternativeRoutes.map(route => ({
        type: 'Feature',
        properties: {
          routeId: route.id,
          provider: route.provider,
          distance: route.distance,
          duration: route.duration,
          rvSuitability: route.rvSuitability
        },
        geometry: {
          type: 'LineString',
          coordinates: route.geometry
        }
      }));

      map.addSource('alternative-routes', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: alternativeFeatures
        }
      });

      map.addLayer({
        id: 'alternative-routes',
        type: 'line',
        source: 'alternative-routes',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'provider'], 'openroute'], '#9333ea', // Purple for OpenRoute
            '#6366f1' // Indigo for Mapbox
          ],
          'line-width': 4,
          'line-opacity': 0.6
        }
      });

      // Add click handler for alternative routes
      map.on('click', 'alternative-routes', (e) => {
        if (e.features && e.features[0]) {
          const routeId = e.features[0].properties?.routeId;
          if (routeId && onRouteSelect) {
            setSelectedRouteId(routeId);
            onRouteSelect(routeId);
          }
        }
      });

      // Change cursor on hover
      map.on('mouseenter', 'alternative-routes', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'alternative-routes', () => {
        map.getCanvas().style.cursor = '';
      });
    }

    // Add main route
    if (mainRoute) {
      map.addSource('main-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {
            routeId: mainRoute.id,
            provider: mainRoute.provider,
            distance: mainRoute.distance,
            duration: mainRoute.duration,
            rvSuitability: mainRoute.rvSuitability
          },
          geometry: {
            type: 'LineString',
            coordinates: mainRoute.geometry
          }
        }
      });

      map.addLayer({
        id: 'main-route',
        type: 'line',
        source: 'main-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#059669', // Green for main route
          'line-width': 6,
          'line-opacity': 0.9
        }
      });
    }

    // Fit map to show all routes
    if ((mainRoute || alternativeRoutes.length > 0) && waypoints.length > 0) {
      const coordinates = waypoints.map(wp => [wp.lng, wp.lat] as [number, number]);
      
      if (coordinates.length > 0) {
        const bounds = coordinates.reduce((bounds, coord) => {
          return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        map.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 12
        });
      }
    }

  }, [routes, mainRoute, alternativeRoutes, isMapLoaded, waypoints, onRouteSelect]);

  const formatDuration = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}min`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const getRVSuitabilityColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    if (score >= 40) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  if (mapError) {
    return (
      <div className={cn("w-full h-[400px] bg-muted rounded-lg flex items-center justify-center border", className)}>
        <div className="text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <div className="text-lg font-medium">Map Error</div>
          <div className="text-sm text-muted-foreground">{mapError}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-[400px] rounded-lg overflow-hidden border", className)}>
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Loading overlay */}
      {isCalculating && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg p-4 flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Calculating routes...</span>
          </div>
        </div>
      )}

      {/* Route details overlay */}
      {showRouteDetails && (mainRoute || alternativeRoutes.length > 0) && (
        <Card className="absolute top-4 left-4 w-72 shadow-lg z-10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <RouteIcon className="w-4 h-4" />
              Route Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mainRoute && (
              <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-green-800">Main Route</span>
                  <Badge variant="secondary" className="text-xs">
                    {mainRoute.provider}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
                  <div>{mainRoute.distance.toFixed(1)} km</div>
                  <div>{formatDuration(mainRoute.duration)}</div>
                </div>
                <div className="mt-1">
                  <Badge 
                    className={cn("text-xs", getRVSuitabilityColor(mainRoute.rvSuitability))}
                  >
                    RV Suitable: {mainRoute.rvSuitability}%
                  </Badge>
                </div>
              </div>
            )}

            {alternativeRoutes.map((route, index) => (
              <div 
                key={route.id}
                className={cn(
                  "p-2 rounded-lg border cursor-pointer transition-colors",
                  selectedRouteId === route.id 
                    ? "bg-primary/10 border-primary" 
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                )}
                onClick={() => {
                  setSelectedRouteId(route.id);
                  onRouteSelect?.(route.id);
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Alternative {index + 1}</span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      route.provider === 'openroute' ? "border-purple-300 text-purple-700" : "border-indigo-300 text-indigo-700"
                    )}
                  >
                    {route.provider}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>{route.distance.toFixed(1)} km</div>
                  <div>{formatDuration(route.duration)}</div>
                </div>
                <div className="mt-1">
                  <Badge 
                    className={cn("text-xs", getRVSuitabilityColor(route.rvSuitability))}
                  >
                    RV: {route.rvSuitability}%
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Interactive mode indicator */}
      {enableInteractiveMode && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg p-2 shadow-lg z-10">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-primary" />
            Click map to add waypoints
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg p-2 shadow-lg z-10">
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-green-600 rounded"></div>
            <span>Main Route</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-purple-500 rounded opacity-60"></div>
            <span>OpenRoute</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-indigo-500 rounded opacity-60"></div>
            <span>Mapbox</span>
          </div>
        </div>
      </div>
    </div>
  );
});

EnhancedTripMap.displayName = 'EnhancedTripMap';

export default EnhancedTripMap;