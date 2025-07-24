import React, { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  ChevronDown,
  Satellite,
  Mountain,
  MapPin,
  Zap,
  Phone,
  TreePine,
  Shield,
  Cloud,
  Flame,
  Bone,
  CircleParking,
  Ambulance,
  Carrot,
  Layers,
  Navigation,
  Map,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { fetchPhoneCoverage } from './utils';
import WheelersLayer from './WheelersLayer';
import FriendsLayer from './FriendsLayer';
import { AppErrorBoundary } from '@/components/common/ErrorBoundary';

interface MapOptionsDropdownProps {
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  onStyleChange: (style: string) => void;
  currentStyle: string;
  isMapControl?: boolean; // New prop to indicate if this is a native map control
  poiFilters?: Record<string, boolean>;
  onPOIFilterChange?: (filters: Record<string, boolean>) => void;
}

export default function MapOptionsDropdown({ map, onStyleChange, currentStyle, isMapControl = false, poiFilters, onPOIFilterChange }: MapOptionsDropdownProps) {
  const [baseMapStyle, setBaseMapStyle] = useState('satellite');
  // Fixed to scenic theme as requested
  const baseMapTheme = 'scenic';
  const [userCountry, setUserCountry] = useState('AU'); // Default to Australia based on route
  const [showWheelersLayer, setShowWheelersLayer] = useState(false);
  const [showFriendsLayer, setShowFriendsLayer] = useState(false);
  const [overlays, setOverlays] = useState({
    traffic: false,
    phoneCoverage: false,
    nationalParks: false,
    stateForests: false,
    smoke: false,
    fires: false,
  });
  
  // Debug logging
  useEffect(() => {
    console.log('MapOptionsDropdown mounted, map:', map, 'isMapControl:', isMapControl);
  }, []);
  const [poiState, setPoiState] = useState<Record<string, boolean>>(
    poiFilters || {
      pet_stop: true,
      wide_parking: true,
      medical: true,
      farmers_market: true
    }
  );

  useEffect(() => {
    if (poiFilters) {
      setPoiState(poiFilters);
    }
  }, [poiFilters]);

  // Detect user's country based on map center
  useEffect(() => {
    if (map.current) {
      const center = map.current.getCenter();
      // Simple country detection based on coordinates
      if (center.lng >= 113 && center.lng <= 154 && center.lat >= -44 && center.lat <= -10) {
        setUserCountry('AU'); // Australia
      } else if (center.lng >= -125 && center.lng <= -66 && center.lat >= 20 && center.lat <= 49) {
        setUserCountry('US'); // United States
      } else if (center.lng >= -10 && center.lng <= 32 && center.lat >= 35 && center.lat <= 71) {
        setUserCountry('EU'); // Europe
      }
    }
  }, [map]);

  const handleBaseMapChange = (value: string) => {
    setBaseMapStyle(value);
    let styleUrl = '';
    
    switch (value) {
      case 'wheelers':
        styleUrl = 'mapbox://styles/mapbox/streets-v12';
        setShowWheelersLayer(true); // Show community layer for Wheelers map
        break;
      case 'outdoors':
        styleUrl = 'mapbox://styles/mapbox/outdoors-v12';
        setShowWheelersLayer(false);
        break;
      case 'satellite':
        styleUrl = 'mapbox://styles/mapbox/satellite-streets-v12';
        setShowWheelersLayer(false);
        break;
      case 'navigation':
        styleUrl = 'mapbox://styles/mapbox/navigation-day-v1';
        setShowWheelersLayer(false);
        break;
      case 'terrain':
        styleUrl = 'mapbox://styles/mapbox/outdoors-v12'; // Uses outdoors for terrain features
        setShowWheelersLayer(false);
        break;
      default:
        styleUrl = 'mapbox://styles/mapbox/streets-v12';
        setShowWheelersLayer(false);
    }
    
    onStyleChange(styleUrl);
    if (map.current) {
      map.current.setStyle(styleUrl);
    }
  };

  // Theme is now fixed to scenic - removed theme change handler

  const handleOverlayToggle = (overlay: string, checked: boolean) => {
    console.log('handleOverlayToggle called:', overlay, checked, 'map:', map);
    setOverlays(prev => ({ ...prev, [overlay]: checked }));
    
    if (!map.current) {
      console.error('No map.current available!');
      return;
    }

    // Handle traffic overlay
    if (overlay === 'traffic') {
      if (checked) {
        if (!map.current.getSource('mapbox-traffic')) {
          map.current.addSource('mapbox-traffic', {
            type: 'vector',
            url: 'mapbox://mapbox.mapbox-traffic-v1'
          });
        }
        
        if (!map.current.getLayer('traffic')) {
          map.current.addLayer({
            id: 'traffic',
            type: 'line',
            source: 'mapbox-traffic',
            'source-layer': 'traffic',
            paint: {
              'line-width': 2,
              'line-color': [
                'case',
                ['==', ['get', 'congestion'], 'low'], '#00ff00',
                ['==', ['get', 'congestion'], 'moderate'], '#ffff00',
                ['==', ['get', 'congestion'], 'heavy'], '#ff6600',
                ['==', ['get', 'congestion'], 'severe'], '#ff0000',
                '#000000'
              ]
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
    }

    if (overlay === 'phoneCoverage') {
      if (checked) {
        const center = map.current.getCenter();
        fetchPhoneCoverage(center.lng, center.lat).then(data => {
          if (!map.current) return;
          if (map.current.getSource('phone-coverage')) {
            if (map.current.getLayer('phone-coverage-layer')) {
              map.current.removeLayer('phone-coverage-layer');
            }
            map.current.removeSource('phone-coverage');
          }
          map.current.addSource('phone-coverage', {
            type: 'geojson',
            data
          });
          map.current.addLayer({
            id: 'phone-coverage-layer',
            type: 'fill',
            source: 'phone-coverage',
            paint: {
              'fill-color': '#60a5fa',
              'fill-opacity': 0.25
            }
          });
        });
      } else {
        if (map.current.getLayer('phone-coverage-layer')) {
          map.current.removeLayer('phone-coverage-layer');
        }
        if (map.current.getSource('phone-coverage')) {
          map.current.removeSource('phone-coverage');
        }
      }
    }

    // Handle Environmental overlays
    if (overlay === 'fires') {
      if (checked) {
        // Add NASA FIRMS active fire data
        if (!map.current.getSource('fires')) {
          // NASA FIRMS active fire data - real-time global fire monitoring
          map.current.addSource('fires', {
            type: 'geojson',
            data: 'https://firms.modapis.eosdis.nasa.gov/data/active_fire/modis_c6_1/geojson/MODIS_C6_1_Global_24h.json'
          });
        }
        
        if (!map.current.getLayer('fires-layer')) {
          map.current.addLayer({
            id: 'fires-layer',
            type: 'circle',
            source: 'fires',
            paint: {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                5, 2,
                15, 8
              ],
              'circle-color': [
                'interpolate',
                ['linear'],
                ['get', 'confidence'],
                0, '#ffeda0',
                50, '#feb24c',
                80, '#f03b20',
                100, '#bd0026'
              ],
              'circle-opacity': 0.8,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff'
            }
          });
        }
      } else {
        if (map.current.getLayer('fires-layer')) {
          map.current.removeLayer('fires-layer');
        }
        if (map.current.getSource('fires')) {
          map.current.removeSource('fires');
        }
      }
    }

    if (overlay === 'smoke') {
      if (checked) {
        // NOAA/EPA AirNow API for real-time air quality and smoke data
        if (!map.current.getSource('smoke')) {
          // Get current air quality data from AirNow API
          fetch('https://www.airnowapi.org/aq/data/?startDate=2024-01-01&endDate=2024-12-31&parameters=PM25,OZONE&BBOX=-125,25,-65,50&dataType=B&format=application/json&verbose=1&monitorType=0&includerawconcentrations=1&API_KEY=guest')
            .then(response => response.json())
            .then(data => {
              if (!map.current || !Array.isArray(data)) return;
              
              // Convert air quality data to GeoJSON for smoke visualization
              const smokeFeatures = data
                .filter((station: any) => station.Parameter === 'PM2.5' && station.AQI > 100) // Unhealthy air quality indicates smoke
                .map((station: any) => ({
                  type: 'Feature' as const,
                  properties: {
                    aqi: station.AQI,
                    category: station.Category,
                    parameter: station.Parameter,
                    value: station.Value,
                    siteName: station.SiteName,
                    agencyName: station.AgencyName
                  },
                  geometry: {
                    type: 'Point' as const,
                    coordinates: [station.Longitude, station.Latitude]
                  }
                }));

              const smokeData = {
                type: 'FeatureCollection' as const,
                features: smokeFeatures
              };

              if (map.current.getSource('smoke')) {
                (map.current.getSource('smoke') as mapboxgl.GeoJSONSource).setData(smokeData);
              } else {
                map.current.addSource('smoke', {
                  type: 'geojson',
                  data: smokeData
                });
              }
            })
            .catch(error => {
              console.error('Error fetching air quality data:', error);
              // Fallback to basic smoke layer
              if (!map.current?.getSource('smoke')) {
                map.current?.addSource('smoke', {
                  type: 'geojson',
                  data: {
                    type: 'FeatureCollection',
                    features: []
                  }
                });
              }
            });
        }
        
        if (!map.current.getLayer('smoke-layer')) {
          map.current.addLayer({
            id: 'smoke-layer',
            type: 'circle',
            source: 'smoke',
            paint: {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                5, 4,
                15, 12
              ],
              'circle-color': [
                'interpolate',
                ['linear'],
                ['get', 'aqi'],
                101, '#ff9800',  // Unhealthy for Sensitive Groups
                151, '#f44336',  // Unhealthy
                201, '#9c27b0',  // Very Unhealthy
                300, '#7b1fa2'   // Hazardous
              ],
              'circle-opacity': 0.7,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff'
            }
          });
          
          // Add labels for high AQI areas
          map.current.addLayer({
            id: 'smoke-labels',
            type: 'symbol',
            source: 'smoke',
            filter: ['>=', ['get', 'aqi'], 150], // Only show labels for unhealthy+ air quality
            layout: {
              'text-field': ['concat', 'AQI: ', ['get', 'aqi']],
              'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
              'text-offset': [0, 1.5],
              'text-anchor': 'top',
              'text-size': 10
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': '#000000',
              'text-halo-width': 1
            },
            minzoom: 8
          });
        }
      } else {
        if (map.current.getLayer('smoke-labels')) {
          map.current.removeLayer('smoke-labels');
        }
        if (map.current.getLayer('smoke-layer')) {
          map.current.removeLayer('smoke-layer');
        }
        if (map.current.getSource('smoke')) {
          map.current.removeSource('smoke');
        }
      }
    }

    // Handle Public Lands overlays
    if (overlay === 'nationalParks') {
      if (checked) {
        // National Park Service API - real government data
        if (!map.current.getSource('national-parks')) {
          // Fetch real National Parks data from NPS API
          fetch('https://developer.nps.gov/api/v1/parks?limit=500&api_key=DEMO_KEY&fields=addresses,contacts,images,operatingHours,entranceFees')
            .then(response => response.json())
            .then(data => {
              if (!map.current) return;
              
              const parkFeatures = data.data.map((park: any) => ({
                type: 'Feature' as const,
                properties: {
                  name: park.fullName,
                  description: park.description,
                  designation: park.designation,
                  url: park.url,
                  parkCode: park.parkCode
                },
                geometry: {
                  type: 'Point' as const,
                  coordinates: [
                    parseFloat(park.longitude) || 0,
                    parseFloat(park.latitude) || 0
                  ]
                }
              })).filter((feature: any) => feature.geometry.coordinates[0] !== 0);

              const parksData = {
                type: 'FeatureCollection' as const,
                features: parkFeatures
              };

              if (map.current.getSource('national-parks')) {
                (map.current.getSource('national-parks') as mapboxgl.GeoJSONSource).setData(parksData);
              } else {
                map.current.addSource('national-parks', {
                  type: 'geojson',
                  data: parksData
                });
              }
            })
            .catch(error => {
              console.error('Error fetching National Parks data:', error);
              // Fallback to Mapbox boundaries tileset for parks
              if (!map.current?.getSource('national-parks')) {
                map.current?.addSource('national-parks', {
                  type: 'vector',
                  url: 'mapbox://mapbox.3o7ubwm8'
                });
              }
            });
        }
        
        if (!map.current.getLayer('national-parks-layer')) {
          map.current.addLayer({
            id: 'national-parks-layer',
            type: 'circle',
            source: 'national-parks',
            paint: {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                4, 4,
                8, 8,
                12, 12
              ],
              'circle-color': '#10b981',
              'circle-opacity': 0.8,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#047857'
            }
          });
          
          // Add labels for parks
          map.current.addLayer({
            id: 'national-parks-labels',
            type: 'symbol',
            source: 'national-parks',
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
              'text-offset': [0, 1.5],
              'text-anchor': 'top',
              'text-size': 12
            },
            paint: {
              'text-color': '#047857',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1
            },
            minzoom: 6
          });
        }
      } else {
        if (map.current.getLayer('national-parks-labels')) {
          map.current.removeLayer('national-parks-labels');
        }
        if (map.current.getLayer('national-parks-layer')) {
          map.current.removeLayer('national-parks-layer');
        }
        if (map.current.getSource('national-parks')) {
          map.current.removeSource('national-parks');
        }
      }
    }

    if (overlay === 'stateForests') {
      if (checked) {
        // USDA Forest Service data - real government forest boundaries
        if (!map.current.getSource('state-forests')) {
          // Use USDA Forest Service WMS/WFS service for forest boundaries
          fetch('https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundaries_01/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson&resultRecordCount=1000')
            .then(response => response.json())
            .then(data => {
              if (!map.current || !data.features) return;
              
              // Process the forest data
              const forestFeatures = data.features.map((feature: any) => ({
                type: 'Feature' as const,
                properties: {
                  name: feature.properties.FORESTNAME || feature.properties.NAME,
                  region: feature.properties.REGION,
                  area: feature.properties.GIS_ACRES,
                  type: 'National Forest'
                },
                geometry: feature.geometry
              }));

              const forestData = {
                type: 'FeatureCollection' as const,
                features: forestFeatures
              };

              if (map.current.getSource('state-forests')) {
                (map.current.getSource('state-forests') as mapboxgl.GeoJSONSource).setData(forestData);
              } else {
                map.current.addSource('state-forests', {
                  type: 'geojson',
                  data: forestData
                });
              }
            })
            .catch(error => {
              console.error('Error fetching Forest Service data:', error);
              // Fallback to basic forest layer
              if (!map.current?.getSource('state-forests')) {
                map.current?.addSource('state-forests', {
                  type: 'geojson',
                  data: {
                    type: 'FeatureCollection',
                    features: []
                  }
                });
              }
            });
        }
        
        if (!map.current.getLayer('state-forests-layer')) {
          map.current.addLayer({
            id: 'state-forests-layer',
            type: 'fill',
            source: 'state-forests',
            paint: {
              'fill-color': '#22c55e',
              'fill-opacity': 0.15,
              'fill-outline-color': '#15803d'
            }
          });
        }
      } else {
        if (map.current.getLayer('state-forests-layer')) {
          map.current.removeLayer('state-forests-layer');
        }
        if (map.current.getSource('state-forests')) {
          map.current.removeSource('state-forests');
        }
      }
    }
  };

  const handlePOIToggle = (key: string, checked: boolean) => {
    const updated = { ...poiState, [key]: checked };
    setPoiState(updated);
    if (onPOIFilterChange) onPOIFilterChange(updated);
  };

  const getPublicLandsForCountry = () => {
    switch (userCountry) {
      case 'AU':
        return [
          { key: 'nationalParks', label: 'National Parks', icon: Shield, color: 'emerald' },
          { key: 'stateForests', label: 'State Forests', icon: TreePine, color: 'green' },
        ];
      case 'US':
        return [
          { key: 'nationalParks', label: 'National Parks', icon: Shield, color: 'emerald' },
          { key: 'nationalForests', label: 'National Forests', icon: TreePine, color: 'green' },
          { key: 'blm', label: 'BLM Land', icon: Shield, color: 'yellow' },
        ];
      case 'EU':
        return [
          { key: 'nationalParks', label: 'National Parks', icon: Shield, color: 'emerald' },
          { key: 'protectedAreas', label: 'Protected Areas', icon: TreePine, color: 'green' },
        ];
      default:
        return [
          { key: 'nationalParks', label: 'National Parks', icon: Shield, color: 'emerald' },
          { key: 'stateForests', label: 'State Forests', icon: TreePine, color: 'green' },
        ];
    }
  };

  return (
    <>
      <style>{`
        /* NUCLEAR OPTION: Force dropdown downward with all possible selectors */
        [data-radix-popper-content-wrapper],
        [data-radix-popper-content-wrapper] > div,
        [data-side="top"],
        [data-side="top"] > div,
        .force-dropdown-down,
        .force-dropdown-down[data-radix-popper-content-wrapper],
        [data-radix-popper-content-wrapper] .force-dropdown-down,
        div[data-radix-dropdown-menu-content],
        div[data-radix-dropdown-menu-content][data-side="top"] {
          transform: translateY(10px) !important;
          top: calc(100% + 10px) !important;
          bottom: auto !important;
          position: fixed !important;
          z-index: 99999 !important;
        }
        
        /* Override all Radix positioning */
        [data-radix-popper-content-wrapper] {
          transform: translateY(10px) !important;
          top: auto !important;
          bottom: auto !important;
        }
        
        /* Force ALL dropdown menus to open downward */
        [role="menu"],
        [data-radix-dropdown-menu-content] {
          transform: translateY(10px) !important;
          top: calc(100% + 10px) !important;
          bottom: auto !important;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
        }
        
        /* ENHANCED: Force perfect icon centering in map control button */
        .mapboxgl-ctrl-icon.map-options-button,
        button.mapboxgl-ctrl-icon.map-options-button {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 30px !important;
          height: 30px !important;
          padding: 0 !important;
          margin: 0 !important;
          text-align: center !important;
          line-height: 30px !important;
        }
        
        .mapboxgl-ctrl-icon.map-options-button svg,
        button.mapboxgl-ctrl-icon.map-options-button svg {
          margin: 0 auto !important;
          display: block !important;
          flex-shrink: 0 !important;
          position: relative !important;
          left: 0 !important;
          right: 0 !important;
          top: 0 !important;
          bottom: 0 !important;
        }
        
        /* Additional button content centering */
        .mapboxgl-ctrl-icon.map-options-button * {
          margin-left: 0 !important;
          margin-right: 0 !important;
        }
      `}</style>
      <DropdownMenu modal={false} dir="ltr">
        <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={isMapControl 
            ? "mapboxgl-ctrl-icon map-options-button w-[30px] h-[30px] bg-white border-none shadow-none rounded-[2px] p-0 m-0 hover:bg-[rgba(0,0,0,0.05)]" 
            : "bg-white/95 backdrop-blur-sm border shadow-lg hover:bg-white z-[9999] text-sm px-3 py-2 flex items-center"
          }
          style={isMapControl ? {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px'
          } : undefined}
        >
          <Layers className={isMapControl ? "w-[18px] h-[18px]" : "w-4 h-4"} style={isMapControl ? { margin: '0' } : undefined} />
          {!isMapControl && (
            <>
              <span className="ml-1">Options</span>
              <ChevronDown className="w-3 h-3 ml-1" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-64 max-h-[50vh] overflow-y-auto bg-white/95 backdrop-blur-sm border shadow-xl z-[9999] force-dropdown-down" 
        align="start"
        side="bottom"
        sideOffset={15}
        avoidCollisions={false}
        sticky="always"
        hideWhenDetached={false}
        collisionPadding={0}
        arrowPadding={0}
        
      >
        {/* Base Map Section */}
        <DropdownMenuLabel className="text-sm font-semibold text-gray-700">
          Base Map
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={baseMapStyle} onValueChange={handleBaseMapChange}>
          <DropdownMenuRadioItem value="wheelers" className="flex items-center gap-3 py-2">
            <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
              <MapPin className="w-3 h-3 text-green-600" />
            </div>
            <div className="flex flex-col">
              <span>Wheelers</span>
              <span className="text-xs text-gray-500">Community users</span>
            </div>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="outdoors" className="flex items-center gap-3 py-2">
            <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
              <Mountain className="w-3 h-3 text-green-600" />
            </div>
            <span>Outdoors</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="satellite" className="flex items-center gap-3 py-2">
            <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
              <Satellite className="w-3 h-3 text-blue-600" />
            </div>
            <span>Satellite</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="navigation" className="flex items-center gap-3 py-2">
            <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
              <Navigation className="w-3 h-3 text-blue-600" />
            </div>
            <span>Navigation</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="terrain" className="flex items-center gap-3 py-2">
            <div className="w-6 h-6 bg-amber-100 rounded flex items-center justify-center">
              <Map className="w-3 h-3 text-amber-600" />
            </div>
            <span>Terrain</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        {/* Base Map Theme section removed - fixed to Scenic theme */}

        <DropdownMenuSeparator />

        {/* Map Overlays */}
        <DropdownMenuLabel className="text-sm font-semibold text-gray-700">
          Map Overlays
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={overlays.traffic}
          onCheckedChange={(checked) => handleOverlayToggle('traffic', checked)}
          className="flex items-center gap-3 py-2"
        >
          <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center">
            <Zap className="w-3 h-3 text-red-600" />
          </div>
          <span>Traffic</span>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        {/* Social */}
        <DropdownMenuLabel className="text-sm font-semibold text-gray-700">
          Social
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={showFriendsLayer}
          onCheckedChange={(checked) => setShowFriendsLayer(checked)}
          className="flex items-center gap-3 py-2"
        >
          <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
            <Users className="w-3 h-3 text-purple-600" />
          </div>
          <span>Friends</span>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        {/* Phone Coverage */}
        <DropdownMenuCheckboxItem
          checked={overlays.phoneCoverage}
          onCheckedChange={(checked) => handleOverlayToggle('phoneCoverage', checked)}
          className="flex items-center gap-3 py-2"
        >
          <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
            <Phone className="w-3 h-3 text-blue-600" />
          </div>
          <span>Phone Coverage</span>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        {/* Public Lands */}
        <DropdownMenuLabel className="text-sm font-semibold text-gray-700">
          Public Lands
        </DropdownMenuLabel>
        {getPublicLandsForCountry().map(({ key, label, icon: Icon, color }) => (
          <DropdownMenuCheckboxItem
            key={key}
            checked={overlays[key as keyof typeof overlays] || false}
            onCheckedChange={(checked) => handleOverlayToggle(key, checked)}
            className="flex items-center gap-3 py-2"
          >
            <div className={`w-6 h-6 bg-${color}-100 rounded flex items-center justify-center`}>
              <Icon className={`w-3 h-3 text-${color}-600`} />
            </div>
            <span>{label}</span>
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />

        {/* Environmental */}
        <DropdownMenuLabel className="text-sm font-semibold text-gray-700">
          Environmental
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={overlays.smoke}
          onCheckedChange={(checked) => handleOverlayToggle('smoke', checked)}
          className="flex items-center gap-3 py-2"
        >
          <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
            <Cloud className="w-3 h-3 text-gray-600" />
          </div>
          <span>Smoke</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={overlays.fires}
          onCheckedChange={(checked) => handleOverlayToggle('fires', checked)}
          className="flex items-center gap-3 py-2"
        >
          <div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center">
            <Flame className="w-3 h-3 text-orange-600" />
          </div>
          <span>Fires</span>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />


        {/* Points of Interest */}
        <DropdownMenuLabel className="text-sm font-semibold text-gray-700">
          Points of Interest
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={poiState.pet_stop}
          onCheckedChange={(checked) => handlePOIToggle('pet_stop', checked)}
          className="flex items-center gap-3 py-2"
        >
          <div className="w-6 h-6 bg-yellow-100 rounded flex items-center justify-center">
            <Bone className="w-3 h-3 text-yellow-600" />
          </div>
          <span>Pet Stops</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={poiState.wide_parking}
          onCheckedChange={(checked) => handlePOIToggle('wide_parking', checked)}
          className="flex items-center gap-3 py-2"
        >
          <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
            <CircleParking className="w-3 h-3 text-blue-600" />
          </div>
          <span>Wide Parking</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={poiState.medical}
          onCheckedChange={(checked) => handlePOIToggle('medical', checked)}
          className="flex items-center gap-3 py-2"
        >
          <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center">
            <Ambulance className="w-3 h-3 text-red-600" />
          </div>
          <span>Medical</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={poiState.farmers_market}
          onCheckedChange={(checked) => handlePOIToggle('farmers_market', checked)}
          className="flex items-center gap-3 py-2"
        >
          <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
            <Carrot className="w-3 h-3 text-green-600" />
          </div>
          <span>Farmers Markets</span>
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
      
        {/* WheelersLayer - shows community users when Wheelers map is selected */}
        <AppErrorBoundary>
          <WheelersLayer map={map} isVisible={showWheelersLayer} />
        </AppErrorBoundary>
        
        {/* FriendsLayer - shows friend locations when enabled */}
        <AppErrorBoundary>
          <FriendsLayer map={map} isVisible={showFriendsLayer} />
        </AppErrorBoundary>
      </DropdownMenu>
    </>
  );
}