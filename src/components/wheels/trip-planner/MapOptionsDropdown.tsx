import React, { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { ChevronDown, Settings, Satellite, Mountain, MapPin, Zap, Phone, TreePine, Shield, Cloud, Flame } from 'lucide-react';
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

interface MapOptionsDropdownProps {
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  onStyleChange: (style: string) => void;
  currentStyle: string;
  isMapControl?: boolean; // New prop to indicate if this is a native map control
}

export default function MapOptionsDropdown({ map, onStyleChange, currentStyle, isMapControl = false }: MapOptionsDropdownProps) {
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

    // Add logic for other overlays here as needed
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
            ? "bg-white border shadow hover:bg-gray-50 text-sm px-2 py-1 h-7 rounded-sm" 
            : "bg-white/95 backdrop-blur-sm border shadow-lg hover:bg-white z-[9999] text-sm px-3 py-2"
          }
        >
          <Settings className="w-4 h-4 mr-1" />
          Options
          <ChevronDown className="w-3 h-3 ml-1" />
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
        <DropdownMenuLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          Map Overlays
          <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">PREMIUM</span>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}