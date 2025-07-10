/**
 * MundiLayer Component
 * Displays Mundi AI geospatial results on the Mapbox map
 */

import { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface MundiData {
  timestamp: number;
  query_id: string;
  features: any[];
  geometry?: any;
  locations: any[];
  routes: any[];
  pois: any[];
  metadata: {
    source: string;
    user_id?: string;
    query: string;
  };
}

interface MundiLayerProps {
  map: mapboxgl.Map | null;
  isVisible: boolean;
}

export const MundiLayer: React.FC<MundiLayerProps> = ({ map, isVisible }) => {
  const [mundiData, setMundiData] = useState<MundiData | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const layersAddedRef = useRef<Set<string>>(new Set());

  // Clean up function to remove all Mundi layers and markers
  const cleanup = () => {
    if (!map) return;

    // Remove all markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Remove all Mundi layers and sources
    layersAddedRef.current.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      const sourceId = layerId.replace('-layer', '-source');
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });
    layersAddedRef.current.clear();
  };

  // Add GeoJSON data to map
  const addGeoJSONLayer = (data: any, layerId: string, color: string = '#3b82f6') => {
    if (!map || !data) return;

    const sourceId = `${layerId}-source`;
    
    // Add source if it doesn't exist
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: data
      });
    }

    // Add layer if it doesn't exist
    if (!map.getLayer(layerId)) {
      // Determine layer type based on geometry
      const geometry = data.features?.[0]?.geometry?.type || data.geometry?.type;
      
      if (geometry === 'Point' || geometry === 'MultiPoint') {
        map.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 8,
            'circle-color': color,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
      } else if (geometry === 'LineString' || geometry === 'MultiLineString') {
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': color,
            'line-width': 3,
            'line-opacity': 0.8
          }
        });
      } else if (geometry === 'Polygon' || geometry === 'MultiPolygon') {
        map.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': color,
            'fill-opacity': 0.3,
            'fill-outline-color': color
          }
        });
      }
      
      layersAddedRef.current.add(layerId);
    }

    // Set layer visibility
    map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
  };

  // Add markers for point locations
  const addMarkers = (locations: any[]) => {
    if (!map || !locations.length) return;

    locations.forEach((location, index) => {
      const { longitude, latitude, lng, lat, coordinates } = location;
      
      // Extract coordinates from various formats
      let lngLat: [number, number] | null = null;
      if (longitude && latitude) {
        lngLat = [longitude, latitude];
      } else if (lng && lat) {
        lngLat = [lng, lat];
      } else if (coordinates && Array.isArray(coordinates) && coordinates.length >= 2) {
        lngLat = [coordinates[0], coordinates[1]];
      }

      if (!lngLat) return;

      // Create custom marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'mundi-marker';
      markerEl.style.cssText = `
        width: 32px;
        height: 32px;
        background: linear-gradient(45deg, #3b82f6, #1d4ed8);
        border: 2px solid white;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: transform 0.2s ease;
      `;
      markerEl.innerHTML = '🗺️';
      
      // Add hover effect
      markerEl.addEventListener('mouseenter', () => {
        markerEl.style.transform = 'scale(1.2)';
      });
      markerEl.addEventListener('mouseleave', () => {
        markerEl.style.transform = 'scale(1)';
      });

      // Create popup content
      const popupContent = `
        <div class="mundi-popup">
          <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
            ${location.name || location.title || `Mundi Result ${index + 1}`}
          </h3>
          ${location.description ? `<p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">${location.description}</p>` : ''}
          ${location.type ? `<p style="margin: 0 0 4px 0; color: #3b82f6; font-size: 11px; font-weight: 500;">Type: ${location.type}</p>` : ''}
          ${location.address ? `<p style="margin: 0; color: #6b7280; font-size: 11px;">${location.address}</p>` : ''}
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <small style="color: #9ca3af; font-size: 10px;">📍 Mundi AI Result</small>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 25,
        className: 'mundi-popup-container'
      }).setHTML(popupContent);

      // Create and add marker
      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat(lngLat)
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  };

  // Fit map bounds to show all Mundi data
  const fitMapBounds = (data: MundiData) => {
    if (!map) return;

    const bounds = new mapboxgl.LngLatBounds();
    let hasPoints = false;

    // Add points from locations
    data.locations.forEach(location => {
      const { longitude, latitude, lng, lat, coordinates } = location;
      if (longitude && latitude) {
        bounds.extend([longitude, latitude]);
        hasPoints = true;
      } else if (lng && lat) {
        bounds.extend([lng, lat]);
        hasPoints = true;
      } else if (coordinates && Array.isArray(coordinates) && coordinates.length >= 2) {
        bounds.extend([coordinates[0], coordinates[1]]);
        hasPoints = true;
      }
    });

    // Add points from GeoJSON features
    data.features.forEach(feature => {
      if (feature.geometry) {
        if (feature.geometry.type === 'Point') {
          bounds.extend(feature.geometry.coordinates);
          hasPoints = true;
        } else if (feature.geometry.type === 'LineString') {
          feature.geometry.coordinates.forEach((coord: number[]) => {
            bounds.extend(coord);
            hasPoints = true;
          });
        } else if (feature.geometry.type === 'Polygon') {
          feature.geometry.coordinates[0].forEach((coord: number[]) => {
            bounds.extend(coord);
            hasPoints = true;
          });
        }
      }
    });

    // Fit bounds if we have points
    if (hasPoints) {
      map.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 15
      });
    }
  };

  // Process and display Mundi data
  const displayMundiData = (data: MundiData) => {
    if (!map || !isVisible) return;

    console.log('🗺️ Displaying Mundi data on map:', data);

    // Clean up previous data
    cleanup();

    // Add GeoJSON features as layers
    if (data.features && data.features.length > 0) {
      const featureCollection = {
        type: 'FeatureCollection',
        features: data.features
      };
      addGeoJSONLayer(featureCollection, 'mundi-features-layer', '#3b82f6');
    }

    // Add individual geometry
    if (data.geometry) {
      const geometryCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: data.geometry,
          properties: { source: 'mundi' }
        }]
      };
      addGeoJSONLayer(geometryCollection, 'mundi-geometry-layer', '#10b981');
    }

    // Add routes as line layers
    if (data.routes && data.routes.length > 0) {
      data.routes.forEach((route, index) => {
        if (route.geometry || route.coordinates) {
          const routeFeature = {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: route.geometry || {
                type: 'LineString',
                coordinates: route.coordinates
              },
              properties: { route_index: index }
            }]
          };
          addGeoJSONLayer(routeFeature, `mundi-route-${index}-layer`, '#ef4444');
        }
      });
    }

    // Add location markers
    if (data.locations && data.locations.length > 0) {
      addMarkers(data.locations);
    }

    // Add POI markers
    if (data.pois && data.pois.length > 0) {
      addMarkers(data.pois);
    }

    // Fit map to show all data
    fitMapBounds(data);
  };

  // Listen for Mundi data events
  useEffect(() => {
    const handleMundiData = (event: CustomEvent<MundiData>) => {
      setMundiData(event.detail);
      displayMundiData(event.detail);
    };

    window.addEventListener('mundi-data-available', handleMundiData as EventListener);

    // Check for existing data in session storage
    const existingData = sessionStorage.getItem('mundi_map_data');
    if (existingData) {
      try {
        const data = JSON.parse(existingData);
        setMundiData(data);
        if (isVisible) {
          displayMundiData(data);
        }
      } catch (error) {
        console.warn('Failed to parse existing Mundi data:', error);
      }
    }

    return () => {
      window.removeEventListener('mundi-data-available', handleMundiData as EventListener);
    };
  }, []);

  // Handle visibility changes
  useEffect(() => {
    if (!map) return;

    // Show/hide existing layers
    layersAddedRef.current.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
      }
    });

    // Show/hide markers
    markersRef.current.forEach(marker => {
      const element = marker.getElement();
      if (element) {
        element.style.display = isVisible ? 'block' : 'none';
      }
    });

    // If becoming visible and we have data, display it
    if (isVisible && mundiData) {
      displayMundiData(mundiData);
    }
  }, [isVisible, map]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return null; // This component doesn't render anything directly
};

export default MundiLayer;