import React, { useState, useCallback, useMemo, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Layers, 
  Navigation, 
  Mountain, 
  Globe, 
  Satellite,
  Map,
  CheckCircle,
  Flame,
  Cloud,
  Wifi,
  Trees,
  MapPin,
  Users,
  Car,
  X
} from 'lucide-react';

interface MapOverlaysDropdownProps {
  map: mapboxgl.Map | null;
  currentMapStyle: string;
  onStyleChange: (style: string) => void;
}

export default function MapOverlaysDropdown({ 
  map, 
  currentMapStyle,
  onStyleChange
}: MapOverlaysDropdownProps) {
  // State for overlays
  const [overlays, setOverlays] = useState({
    traffic: false,
    fires: false,
    phoneCoverage: false,
    nationalParks: false,
    stateForests: false
  });

  // State for POI filters
  const [poiFilters, setPoiFilters] = useState({
    rv_parking: false,
    pet_stops: false,
    dump_stations: false,
    gas_stations: false
  });

  // State for social layers
  const [socialLayers, setSocialLayers] = useState({
    friends: false,
    community: false
  });

  // Map styles configuration
  const mapStyles = [
    { 
      id: 'mapbox://styles/mapbox/satellite-streets-v12', 
      name: 'Satellite', 
      icon: Satellite,
      description: 'Satellite imagery with labels'
    },
    { 
      id: 'mapbox://styles/mapbox/outdoors-v12', 
      name: 'Outdoors', 
      icon: Mountain,
      description: 'Topographic for off-road'
    },
    { 
      id: 'mapbox://styles/mapbox/navigation-day-v1', 
      name: 'Navigation', 
      icon: Navigation,
      description: 'Turn-by-turn optimized'
    },
    { 
      id: 'mapbox://styles/mapbox/streets-v12', 
      name: 'Streets', 
      icon: Map,
      description: 'General purpose map'
    }
  ];

  // Handle style change
  const handleStyleChange = useCallback((styleId: string) => {
    if (!map) return;
    
    // Store current states
    const currentOverlays = { ...overlays };
    const currentPOIs = { ...poiFilters };
    const currentSocial = { ...socialLayers };
    
    // Change the style
    onStyleChange(styleId);
    
    // Reapply all active layers after style loads
    map.once('styledata', () => {
      // Reapply active overlays
      Object.entries(currentOverlays).forEach(([key, enabled]) => {
        if (enabled) {
          toggleOverlay(key as keyof typeof overlays, true);
        }
      });
      
      // Reapply active POI filters
      Object.entries(currentPOIs).forEach(([key, enabled]) => {
        if (enabled) {
          togglePOIFilter(key as keyof typeof poiFilters);
        }
      });
      
      // Reapply active social layers
      Object.entries(currentSocial).forEach(([key, enabled]) => {
        if (enabled) {
          toggleSocialLayer(key as keyof typeof socialLayers);
        }
      });
    });
  }, [map, onStyleChange, overlays, poiFilters, socialLayers]);

  // Toggle overlay function
  const toggleOverlay = useCallback(async (
    overlayKey: keyof typeof overlays, 
    forceState?: boolean
  ) => {
    if (!map) return;
    
    const newState = forceState !== undefined ? forceState : !overlays[overlayKey];
    setOverlays(prev => ({ ...prev, [overlayKey]: newState }));

    try {
      switch (overlayKey) {
        case 'traffic':
          if (newState) {
            // Add traffic layer
            if (!map.getSource('mapbox-traffic')) {
              map.addSource('mapbox-traffic', {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-traffic-v1'
              });
              
              map.addLayer({
                id: 'traffic',
                type: 'line',
                source: 'mapbox-traffic',
                'source-layer': 'traffic',
                paint: {
                  'line-color': [
                    'case',
                    ['==', ['get', 'congestion'], 'low'], '#22c55e',
                    ['==', ['get', 'congestion'], 'moderate'], '#eab308',
                    ['==', ['get', 'congestion'], 'heavy'], '#f97316',
                    ['==', ['get', 'congestion'], 'severe'], '#ef4444',
                    '#6b7280'
                  ],
                  'line-width': 2,
                  'line-opacity': 0.7
                }
              });
            }
          } else {
            // Remove traffic layer
            if (map.getLayer('traffic')) {
              map.removeLayer('traffic');
            }
            if (map.getSource('mapbox-traffic')) {
              map.removeSource('mapbox-traffic');
            }
          }
          break;

        case 'fires':
          if (newState) {
            // Mock fire data for demo - in production would use NASA FIRMS API
            const mockFireData = {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [-120.5, 38.5]
                  },
                  properties: {
                    brightness: 320,
                    confidence: 'high',
                    date: new Date().toISOString()
                  }
                }
              ]
            };

            if (!map.getSource('fires')) {
              map.addSource('fires', {
                type: 'geojson',
                data: mockFireData as any
              });

              // Add heatmap layer for fire intensity
              map.addLayer({
                id: 'fire-heat',
                type: 'heatmap',
                source: 'fires',
                paint: {
                  'heatmap-weight': [
                    'interpolate',
                    ['linear'],
                    ['get', 'brightness'],
                    0, 0,
                    400, 1
                  ],
                  'heatmap-intensity': 1,
                  'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(255, 255, 0, 0)',
                    0.2, 'rgba(255, 200, 0, 0.5)',
                    0.4, 'rgba(255, 150, 0, 0.6)',
                    0.6, 'rgba(255, 100, 0, 0.7)',
                    0.8, 'rgba(255, 50, 0, 0.8)',
                    1, 'rgba(255, 0, 0, 1)'
                  ],
                  'heatmap-radius': 30,
                  'heatmap-opacity': 0.7
                }
              });

              // Add point markers for individual fires
              map.addLayer({
                id: 'fire-points',
                type: 'circle',
                source: 'fires',
                paint: {
                  'circle-radius': 6,
                  'circle-color': '#ff4444',
                  'circle-stroke-color': '#ffffff',
                  'circle-stroke-width': 2,
                  'circle-opacity': 0.8
                }
              });
            }
          } else {
            // Remove fire layers
            ['fire-heat', 'fire-points'].forEach(layerId => {
              if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
              }
            });
            if (map.getSource('fires')) {
              map.removeSource('fires');
            }
          }
          break;

        case 'nationalParks':
          if (newState) {
            // Mock national parks data - in production would use NPS API
            const mockParksData = {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'Polygon',
                    coordinates: [[
                      [-119.5, 37.5],
                      [-119.5, 38.0],
                      [-119.0, 38.0],
                      [-119.0, 37.5],
                      [-119.5, 37.5]
                    ]]
                  },
                  properties: {
                    name: 'Yosemite National Park',
                    type: 'National Park'
                  }
                }
              ]
            };

            if (!map.getSource('national-parks')) {
              map.addSource('national-parks', {
                type: 'geojson',
                data: mockParksData as any
              });

              // Fill layer for park areas
              map.addLayer({
                id: 'parks-fill',
                type: 'fill',
                source: 'national-parks',
                paint: {
                  'fill-color': '#22c55e',
                  'fill-opacity': 0.15
                }
              });

              // Outline layer for park boundaries
              map.addLayer({
                id: 'parks-outline',
                type: 'line',
                source: 'national-parks',
                paint: {
                  'line-color': '#16a34a',
                  'line-width': 2
                }
              });
            }
          } else {
            // Remove park layers
            ['parks-fill', 'parks-outline'].forEach(layerId => {
              if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
              }
            });
            if (map.getSource('national-parks')) {
              map.removeSource('national-parks');
            }
          }
          break;

        // Other overlay implementations would go here
        default:
          console.log(`Overlay ${overlayKey} will be implemented in next phase`);
      }
    } catch (error) {
      console.error(`Error toggling ${overlayKey}:`, error);
      setOverlays(prev => ({ ...prev, [overlayKey]: false }));
    }
  }, [map, overlays]);

  // Toggle POI filter
  const togglePOIFilter = useCallback(async (poiKey: keyof typeof poiFilters) => {
    if (!map) return;
    
    const newState = !poiFilters[poiKey];
    setPoiFilters(prev => ({ ...prev, [poiKey]: newState }));
    
    try {
      const sourceId = `poi-${poiKey}`;
      const layerId = `poi-${poiKey}-markers`;
      
      if (newState) {
        // Add POI markers based on type
        let poiData: any = null;
        
        switch (poiKey) {
          case 'rv_parking':
            // Mock data for RV parking spots
            poiData = {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [-122.4194, 37.7749]
                  },
                  properties: {
                    name: 'Golden Gate RV Park',
                    description: 'Full hookups available',
                    type: 'rv_parking'
                  }
                }
              ]
            };
            break;
            
          case 'pet_stops':
            // Mock data for pet-friendly stops
            poiData = {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [-122.3321, 37.5753]
                  },
                  properties: {
                    name: 'Dog Park Rest Area',
                    description: 'Off-leash area available',
                    type: 'pet_stops'
                  }
                }
              ]
            };
            break;
            
          case 'dump_stations':
            // Mock data for dump stations
            poiData = {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [-122.4304, 37.7749]
                  },
                  properties: {
                    name: 'RV Dump Station',
                    description: 'Free with water fill',
                    type: 'dump_stations'
                  }
                }
              ]
            };
            break;
            
          case 'gas_stations':
            // Mock data for gas stations with diesel
            poiData = {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [-122.4194, 37.7749]
                  },
                  properties: {
                    name: 'Truck Stop Gas',
                    description: 'Diesel available',
                    type: 'gas_stations'
                  }
                }
              ]
            };
            break;
        }
        
        if (poiData) {
          // Add source if it doesn't exist
          if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
              type: 'geojson',
              data: poiData
            });
          }
          
          // Add marker layer if it doesn't exist
          if (!map.getLayer(layerId)) {
            // Define icon and color based on POI type
            const poiStyles: Record<string, { icon: string; color: string }> = {
              rv_parking: { icon: '🚐', color: '#3b82f6' },
              pet_stops: { icon: '🐾', color: '#10b981' },
              dump_stations: { icon: '🚽', color: '#f59e0b' },
              gas_stations: { icon: '⛽', color: '#ef4444' }
            };
            
            const style = poiStyles[poiKey];
            
            // Add circle marker layer
            map.addLayer({
              id: layerId,
              type: 'circle',
              source: sourceId,
              paint: {
                'circle-radius': 8,
                'circle-color': style.color,
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2,
                'circle-opacity': 0.9
              }
            });
            
            // Add text label layer
            map.addLayer({
              id: `${layerId}-labels`,
              type: 'symbol',
              source: sourceId,
              layout: {
                'text-field': style.icon,
                'text-size': 16,
                'text-anchor': 'center',
                'text-allow-overlap': true
              }
            });
            
            // Add click handler for popups
            map.on('click', layerId, (e) => {
              if (!e.features || e.features.length === 0) return;
              
              const feature = e.features[0];
              const coordinates = (feature.geometry as any).coordinates.slice();
              const properties = feature.properties;
              
              // Create popup content
              const popupContent = `
                <div style="padding: 8px;">
                  <h3 style="margin: 0 0 4px 0; font-weight: bold;">${properties.name}</h3>
                  <p style="margin: 0; color: #666; font-size: 14px;">${properties.description}</p>
                </div>
              `;
              
              // Create and show popup
              new mapboxgl.Popup()
                .setLngLat(coordinates)
                .setHTML(popupContent)
                .addTo(map);
            });
            
            // Change cursor on hover
            map.on('mouseenter', layerId, () => {
              map.getCanvas().style.cursor = 'pointer';
            });
            
            map.on('mouseleave', layerId, () => {
              map.getCanvas().style.cursor = '';
            });
          }
        }
      } else {
        // Remove POI layers
        const layersToRemove = [layerId, `${layerId}-labels`];
        
        layersToRemove.forEach(id => {
          if (map.getLayer(id)) {
            // Remove click handlers
            map.off('click', id);
            map.off('mouseenter', id);
            map.off('mouseleave', id);
            // Remove layer
            map.removeLayer(id);
          }
        });
        
        // Remove source
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      }
    } catch (error) {
      console.error(`Error toggling POI ${poiKey}:`, error);
      setPoiFilters(prev => ({ ...prev, [poiKey]: false }));
    }
  }, [map, poiFilters]);

  // Toggle social layer
  const toggleSocialLayer = useCallback(async (layerKey: keyof typeof socialLayers) => {
    if (!map) return;
    
    const newState = !socialLayers[layerKey];
    setSocialLayers(prev => ({ ...prev, [layerKey]: newState }));
    
    // Social layer implementation would go here
    console.log(`Social layer ${layerKey} toggled to ${newState}`);
  }, [map, socialLayers]);

  // Clear all overlays function
  const clearAllOverlays = useCallback(() => {
    // Clear all overlays
    Object.keys(overlays).forEach(key => {
      if (overlays[key as keyof typeof overlays]) {
        toggleOverlay(key as keyof typeof overlays, false);
      }
    });
    
    // Clear all POI filters
    Object.keys(poiFilters).forEach(key => {
      if (poiFilters[key as keyof typeof poiFilters]) {
        togglePOIFilter(key as keyof typeof poiFilters);
      }
    });
    
    // Clear all social layers
    Object.keys(socialLayers).forEach(key => {
      if (socialLayers[key as keyof typeof socialLayers]) {
        toggleSocialLayer(key as keyof typeof socialLayers);
      }
    });
    
    // Reset states
    setOverlays({
      traffic: false,
      fires: false,
      phoneCoverage: false,
      nationalParks: false,
      stateForests: false
    });
    
    setPoiFilters({
      rv_parking: false,
      pet_stops: false,
      dump_stations: false,
      gas_stations: false
    });
    
    setSocialLayers({
      friends: false,
      community: false
    });
  }, [overlays, poiFilters, socialLayers, toggleOverlay, togglePOIFilter, toggleSocialLayer]);
  
  // Count active layers
  const activeLayerCount = useMemo(() => {
    const overlayCount = Object.values(overlays).filter(Boolean).length;
    const poiCount = Object.values(poiFilters).filter(Boolean).length;
    const socialCount = Object.values(socialLayers).filter(Boolean).length;
    return overlayCount + poiCount + socialCount;
  }, [overlays, poiFilters, socialLayers]);

  // Save preferences to localStorage
  useEffect(() => {
    const preferences = {
      overlays,
      poiFilters,
      socialLayers
    };
    localStorage.setItem('mapOptionsPreferences', JSON.stringify(preferences));
  }, [overlays, poiFilters, socialLayers]);

  // Load preferences on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('mapOptionsPreferences');
    if (savedPreferences) {
      try {
        const prefs = JSON.parse(savedPreferences);
        if (prefs.overlays) setOverlays(prefs.overlays);
        if (prefs.poiFilters) setPoiFilters(prefs.poiFilters);
        if (prefs.socialLayers) setSocialLayers(prefs.socialLayers);
      } catch (error) {
        console.error('Error loading map preferences:', error);
      }
    }
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <Layers className="w-4 h-4" />
          <span className="hidden sm:inline">Map Options</span>
          {activeLayerCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeLayerCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-80 max-h-[600px] overflow-y-auto"
        align="end"
        sideOffset={5}
      >
        {/* Clear All Button - only show if layers are active */}
        {activeLayerCount > 0 && (
          <>
            <div className="px-2 py-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                onClick={clearAllOverlays}
              >
                <X className="w-4 h-4" />
                Clear All Layers ({activeLayerCount})
              </Button>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Map Styles Section */}
        <DropdownMenuLabel className="flex items-center gap-2">
          <Map className="w-4 h-4" />
          Map Styles
        </DropdownMenuLabel>
        {mapStyles.map((style) => {
          const Icon = style.icon;
          const isActive = currentMapStyle === style.id;
          return (
            <DropdownMenuItem
              key={style.id}
              onClick={() => handleStyleChange(style.id)}
              className={`flex items-start gap-3 p-3 cursor-pointer ${
                isActive ? 'bg-accent' : ''
              }`}
            >
              <Icon className="w-4 h-4 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{style.name}</span>
                  {isActive && (
                    <CheckCircle className="w-4 h-4 text-primary" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {style.description}
                </span>
              </div>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        {/* Map Overlays Section */}
        <DropdownMenuLabel className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Map Overlays
        </DropdownMenuLabel>
        
        {/* Traffic */}
        <div
          className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer rounded"
          onClick={() => toggleOverlay('traffic')}
        >
          <div className="flex items-center gap-3">
            <Car className="w-4 h-4" />
            <div>
              <Label className="text-sm font-medium cursor-pointer">
                Traffic
              </Label>
              <p className="text-xs text-muted-foreground">
                Real-time traffic conditions
              </p>
            </div>
          </div>
          <Switch
            checked={overlays.traffic}
            onCheckedChange={() => toggleOverlay('traffic')}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Active Fires */}
        <div
          className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer rounded"
          onClick={() => toggleOverlay('fires')}
        >
          <div className="flex items-center gap-3">
            <Flame className="w-4 h-4 text-orange-500" />
            <div>
              <Label className="text-sm font-medium cursor-pointer">
                Active Fires
              </Label>
              <p className="text-xs text-muted-foreground">
                Wildfire hotspots
              </p>
            </div>
          </div>
          <Switch
            checked={overlays.fires}
            onCheckedChange={() => toggleOverlay('fires')}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* National Parks */}
        <div
          className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer rounded"
          onClick={() => toggleOverlay('nationalParks')}
        >
          <div className="flex items-center gap-3">
            <Trees className="w-4 h-4 text-green-700" />
            <div>
              <Label className="text-sm font-medium cursor-pointer">
                National Parks
              </Label>
              <p className="text-xs text-muted-foreground">
                Park boundaries
              </p>
            </div>
          </div>
          <Switch
            checked={overlays.nationalParks}
            onCheckedChange={() => toggleOverlay('nationalParks')}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <DropdownMenuSeparator />

        {/* Points of Interest Section */}
        <DropdownMenuLabel className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          RV Points of Interest
        </DropdownMenuLabel>
        
        <DropdownMenuCheckboxItem
          checked={poiFilters.rv_parking}
          onCheckedChange={() => togglePOIFilter('rv_parking')}
        >
          <span className="text-lg mr-2">🚐</span>
          RV Parks & Camping
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={poiFilters.pet_stops}
          onCheckedChange={() => togglePOIFilter('pet_stops')}
        >
          <span className="text-lg mr-2">🐾</span>
          Pet-Friendly Stops
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={poiFilters.dump_stations}
          onCheckedChange={() => togglePOIFilter('dump_stations')}
        >
          <span className="text-lg mr-2">🚽</span>
          Dump Stations
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={poiFilters.gas_stations}
          onCheckedChange={() => togglePOIFilter('gas_stations')}
        >
          <span className="text-lg mr-2">⛽</span>
          Gas Stations (Diesel)
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        {/* Social Layers Section */}
        <DropdownMenuLabel className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Social Layers
        </DropdownMenuLabel>
        
        <div
          className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer rounded"
          onClick={() => toggleSocialLayer('friends')}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">👥</span>
            <div>
              <Label className="text-sm font-medium cursor-pointer">
                Friends
              </Label>
              <p className="text-xs text-muted-foreground">
                Track friends on trips
              </p>
            </div>
          </div>
          <Switch
            checked={socialLayers.friends}
            onCheckedChange={() => toggleSocialLayer('friends')}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        
        <div
          className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer rounded"
          onClick={() => toggleSocialLayer('community')}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🏕️</span>
            <div>
              <Label className="text-sm font-medium cursor-pointer">
                Community
              </Label>
              <p className="text-xs text-muted-foreground">
                Events & meetups
              </p>
            </div>
          </div>
          <Switch
            checked={socialLayers.community}
            onCheckedChange={() => toggleSocialLayer('community')}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}