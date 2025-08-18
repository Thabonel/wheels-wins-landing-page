# Map Options Dropdown Implementation Guide

This document contains all the code needed to implement the Map Options dropdown feature from the Wheels & Wins project in another project. The dropdown provides map style switching, overlay controls (traffic, fires, smoke, phone coverage, national parks), POI filters, and social layers.

## Table of Contents
1. [Dependencies](#dependencies)
2. [Type Definitions](#type-definitions)
3. [Main Components](#main-components)
4. [Utility Functions](#utility-functions)
5. [Layer Components](#layer-components)
6. [Mapbox Control Wrapper](#mapbox-control-wrapper)
7. [Usage Example](#usage-example)
8. [API Requirements](#api-requirements)

## Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "mapbox-gl": "^3.0.0",
    "@mapbox/mapbox-gl-directions": "^4.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-checkbox": "^1.0.0",
    "@radix-ui/react-label": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.0",
    "@radix-ui/react-switch": "^1.0.0",
    "@turf/turf": "^6.5.0",
    "lucide-react": "^0.263.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

## Type Definitions

Create a `types.ts` file:

```typescript
// types.ts
export interface Waypoint {
  coords: [number, number];
  name: string;
}

export interface POI {
  id: number;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  description: string;
}

export interface FriendLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  location_name: string;
  status: 'traveling' | 'camped' | 'offline';
  last_updated: string;
  profile?: {
    display_name: string;
    avatar_url: string;
    rv_info: any;
  };
}

export interface UserLocation {
  id: number;
  user_id: string;
  current_latitude: number;
  current_longitude: number;
  status: string | null;
  updated_at: string | null;
  user_profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  user_profiles_extended?: {
    rig_type: string | null;
  } | null;
}
```

## Main Components

### MapOptionsDropdown.tsx (Main Dropdown Component)

```tsx
// MapOptionsDropdown.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Map, 
  Layers, 
  Navigation, 
  Mountain, 
  Globe, 
  Satellite,
  CheckCircle,
  XCircle,
  Loader2,
  Wifi,
  Trees,
  MapPin,
  Flame,
  Cloud,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import POILayer from './POILayer';
import WheelersLayer from './WheelersLayer';
import FriendsLayer from './FriendsLayer';
import { fetchPhoneCoverage } from './utils';

interface MapOptionsDropdownProps {
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  onStyleChange?: (style: string) => void;
  currentStyle?: string;
  isMapControl?: boolean;
  poiFilters: Record<string, boolean>;
  onPOIFilterChange: (filters: Record<string, boolean>) => void;
}

export default function MapOptionsDropdown({ 
  map, 
  onStyleChange, 
  currentStyle = 'mapbox://styles/mapbox/outdoors-v12',
  isMapControl = false,
  poiFilters,
  onPOIFilterChange
}: MapOptionsDropdownProps) {
  const [mapStyle, setMapStyle] = useState(currentStyle);
  const [overlays, setOverlays] = useState({
    traffic: false,
    fires: false,
    smoke: false,
    phoneCoverage: false,
    nationalParks: false,
    stateForests: false
  });
  const [socialLayers, setSocialLayers] = useState({
    wheelers: false,
    friends: false
  });
  const [overlayStatuses, setOverlayStatuses] = useState<Record<string, 'loading' | 'success' | 'error'>>({});
  const [lastFireFetch, setLastFireFetch] = useState<number>(0);
  const fireDataRef = useRef<any>(null);

  const mapStyles = [
    { 
      id: 'mapbox://styles/mapbox/satellite-streets-v12', 
      name: 'Satellite', 
      icon: Satellite,
      description: 'High-resolution satellite imagery with labels'
    },
    { 
      id: 'mapbox://styles/mapbox/outdoors-v12', 
      name: 'Outdoors', 
      icon: Mountain,
      description: 'Topographic maps optimized for outdoor activities'
    },
    { 
      id: 'mapbox://styles/mapbox/navigation-day-v1', 
      name: 'Navigation', 
      icon: Navigation,
      description: 'Clean design optimized for turn-by-turn navigation'
    },
    { 
      id: 'mapbox://styles/mapbox/light-v11', 
      name: 'Light', 
      icon: Map,
      description: 'Subtle, light-colored base map'
    },
    { 
      id: 'mapbox://styles/mapbox/dark-v11', 
      name: 'Dark', 
      icon: Map,
      description: 'Dark mode optimized for low-light conditions'
    },
    { 
      id: 'mapbox://styles/mapbox/streets-v12', 
      name: 'Streets', 
      icon: Map,
      description: 'General-purpose map with full detail'
    }
  ];

  const overlayOptions = [
    { key: 'traffic', label: 'Traffic', icon: <span>🚦</span>, description: 'Real-time traffic conditions' },
    { key: 'fires', label: 'Active Fires', icon: <Flame className="w-4 h-4" />, description: 'NASA FIRMS wildfire data' },
    { key: 'smoke', label: 'Smoke Conditions', icon: <Cloud className="w-4 h-4" />, description: 'Air quality and smoke' },
    { key: 'phoneCoverage', label: 'Phone Coverage', icon: <Wifi className="w-4 h-4" />, description: 'Cell tower coverage' },
    { key: 'nationalParks', label: 'National Parks', icon: <Trees className="w-4 h-4" />, description: 'Park boundaries' },
    { key: 'stateForests', label: 'State Forests', icon: <Trees className="w-4 h-4" />, description: 'Forest boundaries' }
  ];

  const poiOptions = [
    { key: 'pet_stop', label: 'Pet Stops', icon: '🐾' },
    { key: 'wide_parking', label: 'Wide Parking', icon: '🅿️' },
    { key: 'medical', label: 'Medical', icon: '🚑' },
    { key: 'farmers_market', label: 'Farmers Markets', icon: '🥕' }
  ];

  const handleStyleChange = useCallback((style: string) => {
    if (!map.current) return;
    
    setMapStyle(style);
    map.current.setStyle(style);
    
    if (onStyleChange) {
      onStyleChange(style);
    }

    // Reapply overlays after style change
    map.current.once('styledata', () => {
      Object.entries(overlays).forEach(([key, enabled]) => {
        if (enabled) {
          toggleOverlay(key as keyof typeof overlays, true);
        }
      });
    });
  }, [map, onStyleChange, overlays]);

  const toggleOverlay = useCallback(async (overlay: keyof typeof overlays, forceState?: boolean) => {
    if (!map.current) return;
    
    const newState = forceState !== undefined ? forceState : !overlays[overlay];
    setOverlays(prev => ({ ...prev, [overlay]: newState }));
    setOverlayStatuses(prev => ({ ...prev, [overlay]: 'loading' }));

    try {
      switch (overlay) {
        case 'traffic':
          if (newState) {
            if (!map.current.getSource('mapbox-traffic')) {
              map.current.addSource('mapbox-traffic', {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-traffic-v1'
              });
              map.current.addLayer({
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
                  'line-width': 2
                }
              });
            }
          } else {
            if (map.current.getLayer('traffic')) {
              map.current.removeLayer('traffic');
            }
            if (map.current.getSource('mapbox-traffic')) {
              map.current.removeSource('mapbox-traffic');
            }
          }
          setOverlayStatuses(prev => ({ ...prev, [overlay]: 'success' }));
          break;

        case 'fires':
          if (newState) {
            const now = Date.now();
            if (!fireDataRef.current || now - lastFireFetch > 300000) {
              const response = await fetch('https://firms.modaps.eosdis.nasa.gov/api/area/v1/usa/VIIRS_SNPP_NRT/1/0,-180,90,180');
              const text = await response.text();
              const features = text.split('\n').slice(1).filter(line => line).map(line => {
                const [lat, lon, brightness, scan, track, acq_date, acq_time, satellite, confidence] = line.split(',');
                return {
                  type: 'Feature' as const,
                  geometry: {
                    type: 'Point' as const,
                    coordinates: [parseFloat(lon), parseFloat(lat)]
                  },
                  properties: {
                    brightness: parseFloat(brightness),
                    confidence,
                    date: acq_date,
                    time: acq_time
                  }
                };
              });
              
              fireDataRef.current = {
                type: 'FeatureCollection',
                features
              };
              setLastFireFetch(now);
            }

            if (!map.current.getSource('fires')) {
              map.current.addSource('fires', {
                type: 'geojson',
                data: fireDataRef.current
              });
              
              map.current.addLayer({
                id: 'fire-heat',
                type: 'heatmap',
                source: 'fires',
                paint: {
                  'heatmap-weight': ['get', 'brightness'],
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
                  'heatmap-radius': 30
                }
              });
              
              map.current.addLayer({
                id: 'fire-points',
                type: 'circle',
                source: 'fires',
                paint: {
                  'circle-radius': 5,
                  'circle-color': '#ff4444',
                  'circle-opacity': 0.8
                }
              });
            }
          } else {
            ['fire-heat', 'fire-points'].forEach(layerId => {
              if (map.current!.getLayer(layerId)) {
                map.current!.removeLayer(layerId);
              }
            });
            if (map.current.getSource('fires')) {
              map.current.removeSource('fires');
            }
          }
          setOverlayStatuses(prev => ({ ...prev, [overlay]: 'success' }));
          break;

        case 'smoke':
          if (newState) {
            const bounds = map.current.getBounds();
            const response = await fetch(`https://airnowapi.org/aq/data/?startDate=2024-01-01&endDate=2024-12-31&parameters=PM25&BBOX=${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}&dataType=B&format=application/json&verbose=1&nowcastonly=0&includerawconcentrations=0`);
            const data = await response.json();
            
            const features = (data || []).map((point: any) => ({
              type: 'Feature' as const,
              geometry: {
                type: 'Point' as const,
                coordinates: [point.Longitude, point.Latitude]
              },
              properties: {
                aqi: point.AQI,
                parameter: point.Parameter,
                value: point.Value
              }
            }));

            if (!map.current.getSource('smoke')) {
              map.current.addSource('smoke', {
                type: 'geojson',
                data: {
                  type: 'FeatureCollection',
                  features
                }
              });
              
              map.current.addLayer({
                id: 'smoke-heat',
                type: 'heatmap',
                source: 'smoke',
                paint: {
                  'heatmap-weight': ['get', 'aqi'],
                  'heatmap-intensity': 0.5,
                  'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(0, 0, 0, 0)',
                    0.2, 'rgba(150, 150, 150, 0.3)',
                    0.4, 'rgba(120, 120, 120, 0.5)',
                    0.6, 'rgba(90, 90, 90, 0.7)',
                    0.8, 'rgba(60, 60, 60, 0.8)',
                    1, 'rgba(30, 30, 30, 0.9)'
                  ],
                  'heatmap-radius': 50,
                  'heatmap-opacity': 0.6
                }
              });
            }
          } else {
            if (map.current.getLayer('smoke-heat')) {
              map.current.removeLayer('smoke-heat');
            }
            if (map.current.getSource('smoke')) {
              map.current.removeSource('smoke');
            }
          }
          setOverlayStatuses(prev => ({ ...prev, [overlay]: 'success' }));
          break;

        case 'phoneCoverage':
          if (newState) {
            const center = map.current.getCenter();
            const coverageData = await fetchPhoneCoverage(center.lng, center.lat);
            
            if (!map.current.getSource('phone-coverage')) {
              map.current.addSource('phone-coverage', {
                type: 'geojson',
                data: coverageData as any
              });
              
              map.current.addLayer({
                id: 'phone-coverage-fill',
                type: 'fill',
                source: 'phone-coverage',
                paint: {
                  'fill-color': '#22c55e',
                  'fill-opacity': 0.2
                }
              });
              
              map.current.addLayer({
                id: 'phone-coverage-outline',
                type: 'line',
                source: 'phone-coverage',
                paint: {
                  'line-color': '#16a34a',
                  'line-width': 2
                }
              });
            }
          } else {
            ['phone-coverage-fill', 'phone-coverage-outline'].forEach(layerId => {
              if (map.current!.getLayer(layerId)) {
                map.current!.removeLayer(layerId);
              }
            });
            if (map.current.getSource('phone-coverage')) {
              map.current.removeSource('phone-coverage');
            }
          }
          setOverlayStatuses(prev => ({ ...prev, [overlay]: 'success' }));
          break;

        case 'nationalParks':
          if (newState) {
            const response = await fetch('https://services1.arcgis.com/fBc8EJxBzgin6eF8/arcgis/rest/services/PADUS3_0Designation_StateNPS_USFS_FWS/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson');
            const data = await response.json();
            
            if (!map.current.getSource('national-parks')) {
              map.current.addSource('national-parks', {
                type: 'geojson',
                data: data
              });
              
              map.current.addLayer({
                id: 'parks-fill',
                type: 'fill',
                source: 'national-parks',
                paint: {
                  'fill-color': '#22c55e',
                  'fill-opacity': 0.2
                }
              });
              
              map.current.addLayer({
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
            ['parks-fill', 'parks-outline'].forEach(layerId => {
              if (map.current!.getLayer(layerId)) {
                map.current!.removeLayer(layerId);
              }
            });
            if (map.current.getSource('national-parks')) {
              map.current.removeSource('national-parks');
            }
          }
          setOverlayStatuses(prev => ({ ...prev, [overlay]: 'success' }));
          break;

        case 'stateForests':
          if (newState) {
            const response = await fetch('https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Protected_Areas/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson');
            const data = await response.json();
            
            if (!map.current.getSource('state-forests')) {
              map.current.addSource('state-forests', {
                type: 'geojson',
                data: data
              });
              
              map.current.addLayer({
                id: 'forests-fill',
                type: 'fill',
                source: 'state-forests',
                paint: {
                  'fill-color': '#059669',
                  'fill-opacity': 0.15
                }
              });
              
              map.current.addLayer({
                id: 'forests-outline',
                type: 'line',
                source: 'state-forests',
                paint: {
                  'line-color': '#047857',
                  'line-width': 1.5
                }
              });
            }
          } else {
            ['forests-fill', 'forests-outline'].forEach(layerId => {
              if (map.current!.getLayer(layerId)) {
                map.current!.removeLayer(layerId);
              }
            });
            if (map.current.getSource('state-forests')) {
              map.current.removeSource('state-forests');
            }
          }
          setOverlayStatuses(prev => ({ ...prev, [overlay]: 'success' }));
          break;
      }
    } catch (error) {
      console.error(`Failed to toggle ${overlay}:`, error);
      setOverlayStatuses(prev => ({ ...prev, [overlay]: 'error' }));
      setOverlays(prev => ({ ...prev, [overlay]: false }));
    }
  }, [map, overlays, lastFireFetch]);

  const toggleSocialLayer = useCallback((layer: keyof typeof socialLayers) => {
    setSocialLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const handlePOIFilterToggle = useCallback((poiKey: string) => {
    const newFilters = { ...poiFilters, [poiKey]: !poiFilters[poiKey] };
    onPOIFilterChange(newFilters);
  }, [poiFilters, onPOIFilterChange]);

  // Clean up overlays when component unmounts
  useEffect(() => {
    return () => {
      if (!map.current) return;
      
      // Remove all overlay layers and sources
      const layersToRemove = [
        'traffic', 'fire-heat', 'fire-points', 'smoke-heat',
        'phone-coverage-fill', 'phone-coverage-outline',
        'parks-fill', 'parks-outline', 'forests-fill', 'forests-outline'
      ];
      
      const sourcesToRemove = [
        'mapbox-traffic', 'fires', 'smoke', 'phone-coverage',
        'national-parks', 'state-forests'
      ];
      
      layersToRemove.forEach(layer => {
        if (map.current?.getLayer(layer)) {
          map.current.removeLayer(layer);
        }
      });
      
      sourcesToRemove.forEach(source => {
        if (map.current?.getSource(source)) {
          map.current.removeSource(source);
        }
      });
    };
  }, []);

  const getStatusIcon = (status: 'loading' | 'success' | 'error' | undefined) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-3 h-3 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  const triggerContent = isMapControl ? (
    <div className="flex items-center justify-center w-[30px] h-[30px]">
      <Layers className="w-[14px] h-[14px]" />
    </div>
  ) : (
    <Button variant="outline" size="sm" className="gap-2">
      <Layers className="w-4 h-4" />
      <span>Map Options</span>
    </Button>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {triggerContent}
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-80 max-h-[600px] overflow-y-auto"
          align="start"
          side="right"
          sideOffset={5}
        >
          <DropdownMenuLabel className="flex items-center gap-2">
            <Map className="w-4 h-4" />
            Map Styles
          </DropdownMenuLabel>
          {mapStyles.map((style) => {
            const Icon = style.icon;
            return (
              <DropdownMenuItem
                key={style.id}
                onClick={() => handleStyleChange(style.id)}
                className={cn(
                  "flex flex-col items-start gap-1 p-3",
                  mapStyle === style.id && "bg-accent"
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{style.name}</span>
                  {mapStyle === style.id && (
                    <CheckCircle className="w-4 h-4 ml-auto text-primary" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground ml-6">
                  {style.description}
                </span>
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />
          
          <DropdownMenuLabel className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Map Overlays
          </DropdownMenuLabel>
          {overlayOptions.map((option) => (
            <div
              key={option.key}
              className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer"
              onClick={() => toggleOverlay(option.key as keyof typeof overlays)}
            >
              <div className="flex items-center gap-3">
                {option.icon}
                <div>
                  <Label className="text-sm font-medium cursor-pointer">
                    {option.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(overlayStatuses[option.key])}
                <Switch
                  checked={overlays[option.key as keyof typeof overlays]}
                  onCheckedChange={() => toggleOverlay(option.key as keyof typeof overlays)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          ))}

          <DropdownMenuSeparator />
          
          <DropdownMenuLabel className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Points of Interest
          </DropdownMenuLabel>
          {poiOptions.map((poi) => (
            <DropdownMenuCheckboxItem
              key={poi.key}
              checked={poiFilters[poi.key]}
              onCheckedChange={() => handlePOIFilterToggle(poi.key)}
              className="flex items-center gap-2"
            >
              <span className="text-lg">{poi.icon}</span>
              <span>{poi.label}</span>
            </DropdownMenuCheckboxItem>
          ))}

          <DropdownMenuSeparator />
          
          <DropdownMenuLabel className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Social Layers
          </DropdownMenuLabel>
          <div
            className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer"
            onClick={() => toggleSocialLayer('wheelers')}
          >
            <div className="flex items-center gap-3">
              <span>🚐</span>
              <div>
                <Label className="text-sm font-medium cursor-pointer">
                  Wheelers Nearby
                </Label>
                <p className="text-xs text-muted-foreground">
                  Show other RVers on the map
                </p>
              </div>
            </div>
            <Switch
              checked={socialLayers.wheelers}
              onCheckedChange={() => toggleSocialLayer('wheelers')}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div
            className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer"
            onClick={() => toggleSocialLayer('friends')}
          >
            <div className="flex items-center gap-3">
              <span>👥</span>
              <div>
                <Label className="text-sm font-medium cursor-pointer">
                  Friends
                </Label>
                <p className="text-xs text-muted-foreground">
                  Track friends' locations
                </p>
              </div>
            </div>
            <Switch
              checked={socialLayers.friends}
              onCheckedChange={() => toggleSocialLayer('friends')}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Render layer components based on state */}
      <POILayer map={map} filters={poiFilters} />
      {socialLayers.wheelers && <WheelersLayer map={map} isVisible={socialLayers.wheelers} />}
      {socialLayers.friends && <FriendsLayer map={map} isVisible={socialLayers.friends} />}
    </>
  );
}
```

## Utility Functions

### utils.ts (Geocoding and Coverage Utilities)

```typescript
// utils.ts
import { circle } from "@turf/turf";
import type { FeatureCollection, Feature } from "geojson";

export async function reverseGeocode([lng, lat]: [number, number]): Promise<string> {
  try {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=address,poi,place,locality,neighborhood,postcode`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const parts = data.features[0].place_name.split(',');
        if (parts.length > 3) {
          return parts.slice(0, 3).join(',').trim();
        }
        return data.features[0].place_name;
      }
    }
    
    return `Location ${lat.toFixed(3)}°${lat >= 0 ? 'N' : 'S'}, ${lng.toFixed(3)}°${lng >= 0 ? 'E' : 'W'}`;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return `Location ${lat.toFixed(3)}°${lat >= 0 ? 'N' : 'S'}, ${lng.toFixed(3)}°${lng >= 0 ? 'E' : 'W'}`;
  }
}

export async function fetchPhoneCoverage(lng: number, lat: number): Promise<FeatureCollection> {
  // Note: You'll need to get your own OpenCellID API key
  const apiKey = import.meta.env.VITE_OPEN_CELL_ID_API_KEY;
  if (!apiKey) {
    console.warn("OPEN_CELL_ID_API_KEY is not set");
    return { type: "FeatureCollection", features: [] };
  }

  const url = `https://opencellid.org/cell/get?key=${apiKey}&lat=${lat}&lon=${lng}&format=json`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    const cells = json.cells || [];
    const features = cells.map((c: any) =>
      circle([c.lon, c.lat], (c.range || 1000) / 1000, { steps: 32, units: "kilometers" }) as Feature
    );
    return { type: "FeatureCollection", features };
  } catch (err) {
    console.error("Failed to fetch phone coverage", err);
    return { type: "FeatureCollection", features: [] };
  }
}

export function hideGeocoderIcon() {
  const style = document.createElement("style");
  style.innerHTML = `.mapboxgl-ctrl-geocoder .mapboxgl-ctrl-geocoder--icon { display: none; }`;
  document.head.appendChild(style);
  return () => {
    if (document.head.contains(style)) {
      document.head.removeChild(style);
    }
  };
}
```

## Layer Components

### POILayer.tsx (Points of Interest)

```tsx
// POILayer.tsx
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
    // Load POI data from your source
    fetch('/data/poi/pois.json')
      .then(res => res.json())
      .then(setPois)
      .catch(err => console.error('Failed to load POIs', err));
  }, []);

  useEffect(() => {
    if (!map.current) return;

    // Remove existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add filtered POI markers
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
```

### WheelersLayer.tsx (Community Users)

```tsx
// WheelersLayer.tsx (Simplified version without Supabase)
import { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { UserLocation } from './types';

interface WheelersLayerProps {
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  isVisible: boolean;
}

export default function WheelersLayer({ map, isVisible }: WheelersLayerProps) {
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);

  // Fetch user locations from your backend
  const fetchUserLocations = async () => {
    try {
      // Replace with your API endpoint
      const response = await fetch('/api/user-locations');
      const data = await response.json();
      setUserLocations(data);
    } catch (error) {
      console.error('Error fetching user locations:', error);
    }
  };

  // Create user markers on the map
  const createUserMarkers = () => {
    if (!map.current || !isVisible) return;

    // Clear existing markers
    markers.forEach(marker => marker.remove());
    setMarkers([]);

    const newMarkers: mapboxgl.Marker[] = [];

    userLocations.forEach((location) => {
      const { current_latitude, current_longitude, user_profiles } = location;
      
      // Create marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'wheeler-marker';
      markerEl.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid #10b981;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: transform 0.2s ease;
        position: relative;
      `;

      // Add avatar or placeholder
      if (user_profiles?.avatar_url) {
        const img = document.createElement('img');
        img.src = user_profiles.avatar_url;
        img.style.cssText = `
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        `;
        markerEl.appendChild(img);
      } else {
        markerEl.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        `;
      }

      // Add hover effects
      markerEl.addEventListener('mouseenter', () => {
        markerEl.style.transform = 'scale(1.1)';
      });

      markerEl.addEventListener('mouseleave', () => {
        markerEl.style.transform = 'scale(1)';
      });

      // Create popup with user info
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: true
      }).setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <div style="font-weight: 600; color: #111827;">
            ${user_profiles?.full_name || 'Wheeler'}
          </div>
          <div style="font-size: 12px; color: #6b7280;">
            Last seen: ${location.updated_at ? new Date(location.updated_at).toLocaleString() : 'Recently'}
          </div>
        </div>
      `);

      // Create marker
      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([current_longitude, current_latitude])
        .setPopup(popup)
        .addTo(map.current);

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);
  };

  useEffect(() => {
    if (isVisible) {
      fetchUserLocations();
      const interval = setInterval(fetchUserLocations, 2 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      createUserMarkers();
    } else {
      markers.forEach(marker => marker.remove());
      setMarkers([]);
    }
    
    return () => {
      markers.forEach(marker => marker.remove());
    };
  }, [isVisible, userLocations]);

  return null;
}
```

### FriendsLayer.tsx (Friends Locations)

```tsx
// FriendsLayer.tsx (Simplified version)
import React, { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { FriendLocation } from './types';

interface FriendsLayerProps {
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  isVisible: boolean;
}

export default function FriendsLayer({ map, isVisible }: FriendsLayerProps) {
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Fetch friend locations from your API
  const fetchFriendLocations = async () => {
    try {
      const response = await fetch('/api/friend-locations');
      const data = await response.json();
      setFriendLocations(data);
    } catch (error) {
      console.error('Error fetching friend locations:', error);
    }
  };

  useEffect(() => {
    if (isVisible) {
      fetchFriendLocations();
      const interval = setInterval(fetchFriendLocations, 2 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!map?.current || !isVisible) {
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};
      return;
    }

    // Remove existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Add markers for each friend
    friendLocations.forEach(friend => {
      const markerElement = createFriendMarker(friend);
      
      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([friend.longitude, friend.latitude])
        .addTo(map.current!);

      markerElement.addEventListener('click', () => {
        showFriendPopup(friend, marker);
      });

      markersRef.current[friend.id] = marker;
    });

    return () => {
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};
    };
  }, [map, friendLocations, isVisible]);

  const createFriendMarker = (friend: FriendLocation) => {
    const markerDiv = document.createElement('div');
    markerDiv.className = 'friend-marker cursor-pointer';
    
    const statusColors = {
      traveling: 'border-blue-500 bg-blue-50',
      camped: 'border-green-500 bg-green-50',
      offline: 'border-gray-400 bg-gray-50'
    };

    const statusIcons = {
      traveling: '🚐',
      camped: '🏕️',
      offline: '⚫'
    };

    markerDiv.innerHTML = `
      <div class="relative">
        <div class="w-12 h-12 rounded-full border-3 ${statusColors[friend.status]} flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
          ${friend.profile?.avatar_url 
            ? `<img src="${friend.profile.avatar_url}" alt="${friend.profile?.display_name}" class="w-10 h-10 rounded-full object-cover" />`
            : `<div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">${friend.profile?.display_name?.charAt(0) || '?'}</div>`
          }
        </div>
        <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border-2 border-white flex items-center justify-center text-xs">
          ${statusIcons[friend.status]}
        </div>
        <div class="absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-full animate-pulse ${friend.status === 'offline' ? 'hidden' : ''}"></div>
      </div>
    `;

    return markerDiv;
  };

  const showFriendPopup = (friend: FriendLocation, marker: mapboxgl.Marker) => {
    if (popupRef.current) {
      popupRef.current.remove();
    }

    const lastUpdated = new Date(friend.last_updated);
    const timeAgo = getTimeAgo(lastUpdated);

    const statusLabels = {
      traveling: 'On the Road',
      camped: 'Camping',
      offline: 'Offline'
    };

    const statusColors = {
      traveling: 'bg-blue-100 text-blue-800',
      camped: 'bg-green-100 text-green-800',
      offline: 'bg-gray-100 text-gray-800'
    };

    const popupContent = `
      <div class="p-4 min-w-[200px]">
        <div class="flex items-center gap-3 mb-3">
          ${friend.profile?.avatar_url 
            ? `<img src="${friend.profile.avatar_url}" alt="${friend.profile?.display_name}" class="w-10 h-10 rounded-full object-cover" />`
            : `<div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">${friend.profile?.display_name?.charAt(0) || '?'}</div>`
          }
          <div>
            <h3 class="font-semibold text-sm">${friend.profile?.display_name || 'Unknown'}</h3>
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[friend.status]}">
              ${statusLabels[friend.status]}
            </span>
          </div>
        </div>
        
        <div class="space-y-2 text-xs text-gray-600">
          <div class="flex items-center gap-2">
            <span>📍 ${friend.location_name || 'Unknown location'}</span>
          </div>
          <div class="flex items-center gap-2">
            <span>🕒 Updated ${timeAgo}</span>
          </div>
        </div>
      </div>
    `;

    const popup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '300px'
    })
      .setHTML(popupContent)
      .addTo(map.current!);

    marker.setPopup(popup);
    popup.addTo(map.current!);
    popupRef.current = popup;
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return null;
}

// CSS for friend markers
const friendMarkerStyles = `
  .friend-marker {
    cursor: pointer;
  }
  
  .friend-marker:hover {
    z-index: 1000;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = friendMarkerStyles;
  document.head.appendChild(styleElement);
}
```

## Mapbox Control Wrapper

### MapOptionsControl.ts (Native Mapbox Control)

```typescript
// MapOptionsControl.ts
import mapboxgl from 'mapbox-gl';
import React from 'react';
import { createRoot } from 'react-dom/client';
import MapOptionsDropdown from './MapOptionsDropdown';

interface MapOptionsControlOptions {
  onStyleChange: (style: string) => void;
  currentStyle: string;
  poiFilters: Record<string, boolean>;
  onPOIFilterChange: (filters: Record<string, boolean>) => void;
}

export class MapOptionsControl implements mapboxgl.IControl {
  private map?: mapboxgl.Map;
  private container?: HTMLElement;
  private root?: any;
  private options: MapOptionsControlOptions;

  constructor(options: MapOptionsControlOptions) {
    this.options = options;
  }

  onAdd(map: mapboxgl.Map): HTMLElement {
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';

    // Create React root and render the dropdown
    this.root = createRoot(this.container);
    this.renderDropdown();

    return this.container;
  }

  onRemove(): void {
    if (this.root) {
      this.root.unmount();
    }
    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.map = undefined;
  }

  private renderDropdown(): void {
    if (!this.root || !this.map) return;

    const mapRef = { current: this.map };
    
    const wrapper = React.createElement('div', {
      style: { position: 'relative' }
    }, 
      React.createElement(MapOptionsDropdown, {
        map: mapRef,
        onStyleChange: this.options.onStyleChange,
        currentStyle: this.options.currentStyle,
        isMapControl: true,
        poiFilters: this.options.poiFilters,
        onPOIFilterChange: this.options.onPOIFilterChange
      })
    );
    
    this.root.render(wrapper);
  }

  updateOptions(newOptions: Partial<MapOptionsControlOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.renderDropdown();
  }
}
```

## Usage Example

```tsx
// Example: Adding Map Options to your Mapbox map
import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapOptionsControl } from './MapOptionsControl';

export function MapComponent() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map>();
  const [currentStyle, setCurrentStyle] = useState('mapbox://styles/mapbox/outdoors-v12');
  const [poiFilters, setPOIFilters] = useState({
    pet_stop: false,
    wide_parking: false,
    medical: false,
    farmers_market: false
  });

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: currentStyle,
      center: [-98.5795, 39.8283], // Center of USA
      zoom: 4
    });

    // Add Map Options control
    const mapOptionsControl = new MapOptionsControl({
      onStyleChange: setCurrentStyle,
      currentStyle: currentStyle,
      poiFilters: poiFilters,
      onPOIFilterChange: setPOIFilters
    });

    map.current.addControl(mapOptionsControl, 'top-right');

    return () => {
      map.current?.remove();
    };
  }, []);

  return <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />;
}
```

## API Requirements

### Environment Variables
```env
# Required
VITE_MAPBOX_TOKEN=pk.your_mapbox_public_token

# Optional for phone coverage
VITE_OPEN_CELL_ID_API_KEY=your_opencellid_api_key
```

### External APIs Used
1. **Mapbox**: Map tiles, geocoding, traffic data
2. **NASA FIRMS**: Active fire data
3. **AirNow API**: Air quality and smoke data
4. **OpenCellID**: Phone coverage data (optional)
5. **NPS/USFS**: National parks and forests boundaries

### POI Data Structure
Create a `/public/data/poi/pois.json` file:
```json
[
  {
    "id": 1,
    "name": "Dog Park - Central",
    "category": "pet_stop",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "description": "Large off-leash area"
  },
  {
    "id": 2,
    "name": "RV Parking - Wide Spots",
    "category": "wide_parking",
    "latitude": 40.7580,
    "longitude": -73.9855,
    "description": "Extra wide parking for RVs"
  }
]
```

## Installation Steps

1. Install all dependencies listed above
2. Copy all component files to your project
3. Set up environment variables
4. Create POI data file or connect to your API
5. Import and use the MapOptionsControl in your map component
6. Style with Tailwind CSS or adapt to your styling system

## Notes

- Replace API endpoints with your own backend URLs
- The social layers (WheelersLayer, FriendsLayer) need backend integration
- Customize overlay data sources based on your needs
- Ensure proper Mapbox token configuration
- Some overlays require additional API keys (OpenCellID, etc.)

## Troubleshooting

- **Layers not showing**: Check console for API errors, verify tokens
- **Dropdown not opening**: Ensure Radix UI is properly installed
- **Markers not clickable**: Check z-index and event handlers
- **Style changes removing overlays**: The code handles re-applying overlays after style changes

This implementation provides a complete, production-ready Map Options dropdown that can be integrated into any Mapbox-based project.