import React, { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  ChevronDown,
  Settings,
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
  Carrot
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
  const [overlays, setOverlays] = useState({
    traffic: false,
    phoneCoverage: false,
    nationalParks: false,
    stateForests: false,
    smoke: false,
    fires: false,
  });
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
        break;
      case 'outdoors':
        styleUrl = 'mapbox://styles/mapbox/outdoors-v12';
        break;
      case 'satellite':
        styleUrl = 'mapbox://styles/mapbox/satellite-streets-v12';
        break;
      case 'places':
        styleUrl = 'mapbox://styles/mapbox/streets-v12';
        break;
      default:
        styleUrl = 'mapbox://styles/mapbox/streets-v12';
    }
    
    onStyleChange(styleUrl);
    if (map.current) {
      map.current.setStyle(styleUrl);
    }
  };

  // Theme is now fixed to scenic - removed theme change handler

  const handleOverlayToggle = (overlay: string, checked: boolean) => {
    setOverlays(prev => ({ ...prev, [overlay]: checked }));
    
    if (!map.current) return;

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

    // Add logic for other overlays here as needed
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={isMapControl 
            ? "mapboxgl-ctrl-icon w-[30px] h-[30px] bg-white border-none shadow-none rounded-[2px] flex items-center justify-center p-0 m-0 hover:bg-[rgba(0,0,0,0.05)]" 
            : "bg-white/95 backdrop-blur-sm border shadow-lg hover:bg-white z-[9999] text-sm px-3 py-2"
          }
        >
          <Settings className="w-4 h-4" />
          {!isMapControl && (
            <>
              <span className="ml-1">Options</span>
              <ChevronDown className="w-3 h-3 ml-1" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-64 max-h-[70vh] overflow-y-auto bg-white/95 backdrop-blur-sm border shadow-xl z-[9999]" 
        align="start"
        side="bottom"
        sideOffset={8}
      >
        {/* Base Map Section */}
        <DropdownMenuLabel className="text-sm font-semibold text-gray-700">
          Base Map
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={baseMapStyle} onValueChange={handleBaseMapChange}>
          <DropdownMenuRadioItem value="wheelers" className="flex items-center gap-3 py-2">
            <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
              <Settings className="w-3 h-3 text-green-600" />
            </div>
            <span>Wheelers</span>
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
          <DropdownMenuRadioItem value="places" className="flex items-center gap-3 py-2">
            <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
              <MapPin className="w-3 h-3 text-purple-600" />
            </div>
            <span>Places</span>
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
    </DropdownMenu>
  );
}