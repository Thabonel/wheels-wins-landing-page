import React, { useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { ChevronDown, Map, Satellite, Mountain, MapPin, Zap, Signal, TreePine, Shield, Cloud } from 'lucide-react';
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
}

export default function MapOptionsDropdown({ map, onStyleChange, currentStyle }: MapOptionsDropdownProps) {
  const [baseMapStyle, setBaseMapStyle] = useState('satellite');
  const [baseMapTheme, setBaseMapTheme] = useState('scenic');
  const [overlays, setOverlays] = useState({
    traffic: false,
    places: false,
    att: false,
    tmobile: false,
    verizon: false,
    blm: false,
    nationalForests: false,
    nationalParks: false,
    smoke: false,
  });

  const handleBaseMapChange = (value: string) => {
    setBaseMapStyle(value);
    let styleUrl = '';
    
    switch (value) {
      case 'roadtrippers':
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

  const handleThemeChange = (value: string) => {
    setBaseMapTheme(value);
    let styleUrl = '';
    
    switch (value) {
      case 'scenic':
        styleUrl = 'mapbox://styles/mapbox/outdoors-v12';
        break;
      case 'light':
        styleUrl = 'mapbox://styles/mapbox/light-v11';
        break;
      case 'dark':
        styleUrl = 'mapbox://styles/mapbox/dark-v11';
        break;
      default:
        styleUrl = 'mapbox://styles/mapbox/outdoors-v12';
    }
    
    onStyleChange(styleUrl);
    if (map.current) {
      map.current.setStyle(styleUrl);
    }
  };

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-white/95 backdrop-blur-sm border shadow-lg hover:bg-white z-50"
        >
          <Map className="w-4 h-4 mr-2" />
          Map Options
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-80 bg-white/95 backdrop-blur-sm border shadow-xl z-[9999]" 
        align="start"
        side="bottom"
      >
        {/* Base Map Section */}
        <DropdownMenuLabel className="text-sm font-semibold text-gray-700">
          Base Map
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={baseMapStyle} onValueChange={handleBaseMapChange}>
          <DropdownMenuRadioItem value="roadtrippers" className="flex items-center gap-3 py-3">
            <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
              <Map className="w-4 h-4 text-green-600" />
            </div>
            <span>Roadtrippers</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="outdoors" className="flex items-center gap-3 py-3">
            <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
              <Mountain className="w-4 h-4 text-green-600" />
            </div>
            <span>Outdoors</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="satellite" className="flex items-center gap-3 py-3">
            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
              <Satellite className="w-4 h-4 text-blue-600" />
            </div>
            <span>Satellite</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="places" className="flex items-center gap-3 py-3">
            <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
              <MapPin className="w-4 h-4 text-purple-600" />
            </div>
            <span>Places</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        {/* Base Map Theme */}
        <DropdownMenuLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          Base Map Theme
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">BASIC</span>
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={baseMapTheme} onValueChange={handleThemeChange}>
          <DropdownMenuRadioItem value="scenic">
            <span>Scenic</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <span>Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <span>Dark</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        {/* Map Overlays */}
        <DropdownMenuLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          Map Overlays
          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">PREMIUM</span>
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={overlays.traffic}
          onCheckedChange={(checked) => handleOverlayToggle('traffic', checked)}
          className="flex items-center gap-3 py-3"
        >
          <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
            <Zap className="w-4 h-4 text-red-600" />
          </div>
          <span>Traffic</span>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        {/* Cell Coverage */}
        <DropdownMenuLabel className="text-sm font-semibold text-gray-700">
          Cell Coverage
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={overlays.att}
          onCheckedChange={(checked) => handleOverlayToggle('att', checked)}
          className="flex items-center gap-3 py-2"
        >
          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
            <Signal className="w-4 h-4 text-blue-600" />
          </div>
          <span>AT&T</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={overlays.tmobile}
          onCheckedChange={(checked) => handleOverlayToggle('tmobile', checked)}
          className="flex items-center gap-3 py-2"
        >
          <div className="w-8 h-8 bg-pink-100 rounded flex items-center justify-center">
            <Signal className="w-4 h-4 text-pink-600" />
          </div>
          <span>T-Mobile</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={overlays.verizon}
          onCheckedChange={(checked) => handleOverlayToggle('verizon', checked)}
          className="flex items-center gap-3 py-2"
        >
          <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
            <Signal className="w-4 h-4 text-red-600" />
          </div>
          <span>Verizon</span>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        {/* Public Lands */}
        <DropdownMenuLabel className="text-sm font-semibold text-gray-700">
          Public Lands
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={overlays.blm}
          onCheckedChange={(checked) => handleOverlayToggle('blm', checked)}
          className="flex items-center gap-3 py-2"
        >
          <div className="w-8 h-8 bg-yellow-100 rounded flex items-center justify-center">
            <Shield className="w-4 h-4 text-yellow-600" />
          </div>
          <span>BLM</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={overlays.nationalForests}
          onCheckedChange={(checked) => handleOverlayToggle('nationalForests', checked)}
          className="flex items-center gap-3 py-2"
        >
          <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
            <TreePine className="w-4 h-4 text-green-600" />
          </div>
          <span>National Forests</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={overlays.nationalParks}
          onCheckedChange={(checked) => handleOverlayToggle('nationalParks', checked)}
          className="flex items-center gap-3 py-2"
        >
          <div className="w-8 h-8 bg-emerald-100 rounded flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-600" />
          </div>
          <span>National Parks</span>
        </DropdownMenuCheckboxItem>

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
          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
            <Cloud className="w-4 h-4 text-gray-600" />
          </div>
          <span>Smoke</span>
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}