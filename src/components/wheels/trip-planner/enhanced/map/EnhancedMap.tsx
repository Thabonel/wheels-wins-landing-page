import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { toast } from 'sonner';

interface EnhancedMapProps {
  startLocation?: string;
  endLocation?: string;
  waypoints?: string[];
  onMapClick?: () => void;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  currentRoute?: any;
  className?: string;
}

const EnhancedMap: React.FC<EnhancedMapProps> = ({
  startLocation,
  endLocation,
  waypoints = [],
  onMapClick,
  userLocation,
  currentRoute,
  className = "h-96 w-full rounded-lg"
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // WebGL Support Check
    const checkWebGLSupport = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!(gl && gl instanceof WebGLRenderingContext);
      } catch (error) {
        console.warn('WebGL detection failed:', error);
        return false;
      }
    };

    if (!checkWebGLSupport()) {
      console.error('WebGL not supported in EnhancedMap');
      return;
    }

    // Get Mapbox token with fallback
    const token = import.meta.env.VITE_MAPBOX_TOKEN || 
                  import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

    if (!token || token.includes('your_mapbox_token') || token.includes('your_actual')) {
      console.error('❌ EnhancedMap: Valid Mapbox token not found');
      return;
    }

    console.log('🗺️ EnhancedMap: Initializing with token:', token.substring(0, 20) + '...');
    mapboxgl.accessToken = token;

    try {
      // Initialize map with safe defaults
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: userLocation ? 
          [userLocation.longitude, userLocation.latitude] : 
          [-98.5795, 39.8283], // Center of US
        zoom: userLocation ? 10 : 4,
        preserveDrawingBuffer: true,
        antialias: true
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add geolocate control
      if (userLocation) {
        map.current.addControl(new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true,
          showUserHeading: true
        }), 'top-right');
      }

      map.current.on('load', () => {
        console.log('✅ EnhancedMap loaded successfully');
        setMapLoaded(true);
      });

      map.current.on('error', (error) => {
        console.error('❌ EnhancedMap error:', error);
        toast({
          title: "Map Error",
          description: "Map encountered an error. Please refresh to try again.",
          variant: "destructive"
        });
      });

      if (onMapClick) {
        map.current.on('click', onMapClick);
      }

    } catch (error) {
      console.error('❌ Failed to initialize EnhancedMap:', error);
      toast({
        title: "Map Initialization Failed", 
        description: `Could not initialize map: ${error.message}`,
        variant: "destructive"
      });
    }

    return () => {
      if (map.current) {
        console.log('🧹 EnhancedMap cleanup');
        map.current.remove();
        map.current = null;
        setMapLoaded(false);
      }
    };
  }, []);

  // Handle start location
  useEffect(() => {
    if (map.current && mapLoaded && startLocation) {
      console.log('📍 EnhancedMap: Adding start location marker');
      // Add logic to geocode and add marker for start location
    }
  }, [startLocation, mapLoaded]);

  // Handle end location  
  useEffect(() => {
    if (map.current && mapLoaded && endLocation) {
      console.log('🎯 EnhancedMap: Adding end location marker');
      // Add logic to geocode and add marker for end location
    }
  }, [endLocation, mapLoaded]);

  // Handle waypoints
  useEffect(() => {
    if (map.current && mapLoaded && waypoints.length > 0) {
      console.log('🗺️ EnhancedMap: Adding waypoints:', waypoints.length);
      // Add logic to add waypoint markers
    }
  }, [waypoints, mapLoaded]);

  return (
    <div className={className}>
      <div 
        ref={mapContainer} 
        className="h-full w-full"
        style={{ minHeight: '300px' }}
      />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMap;