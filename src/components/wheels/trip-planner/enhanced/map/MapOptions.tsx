import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Map,
  Satellite,
  Mountain,
  Navigation as NavigationIcon,
  Route,
  Layers,
  Flame,
  Phone,
  Trees,
  Mountain as Forest,
  Car
} from 'lucide-react';

interface MapOptionsProps {
  onStyleChange: (style: string) => void;
  onOverlayToggle: (overlay: string, enabled: boolean) => void;
  overlaysState: {
    traffic: boolean;
    fires: boolean;
    phone: boolean;
    parks: boolean;
    forests: boolean;
  };
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const MapOptions: React.FC<MapOptionsProps> = ({ 
  onStyleChange, 
  onOverlayToggle,
  overlaysState,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [currentStyle, setCurrentStyle] = useState('streets');
  const [isOpen, setIsOpen] = useState(!isCollapsed);

  const handleStyleChange = (style: string) => {
    setCurrentStyle(style);
    onStyleChange(style);
  };

  const togglePanel = () => {
    setIsOpen(!isOpen);
    onToggleCollapse?.();
  };

  return (
    <Card className="w-72 shadow-lg bg-white/95 backdrop-blur-sm">
      <Button
        variant="ghost"
        className="w-full justify-start px-4 py-3 font-medium hover:bg-gray-50"
        onClick={togglePanel}
      >
        <Map className="h-4 w-4 mr-2" />
        MAP OPTIONS
      </Button>
      
      {isOpen && (
        <CardContent className="p-0 border-t">
          {/* Map Styles Section */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Map className="h-4 w-4" />
              Map Styles
            </div>
            
            <div className="space-y-1">
              <button
                onClick={() => handleStyleChange('satellite')}
                className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors ${
                  currentStyle === 'satellite' ? 'bg-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Satellite className="h-4 w-4 text-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Satellite</div>
                    <div className="text-xs text-gray-500">Satellite imagery with labels</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleStyleChange('outdoors')}
                className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors ${
                  currentStyle === 'outdoors' ? 'bg-amber-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Mountain className="h-4 w-4 text-amber-600" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Outdoors</div>
                    <div className="text-xs text-gray-500">Topographic for off-road</div>
                  </div>
                  {currentStyle === 'outdoors' && (
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </div>
              </button>

              <button
                onClick={() => handleStyleChange('navigation')}
                className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors ${
                  currentStyle === 'navigation' ? 'bg-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <NavigationIcon className="h-4 w-4 text-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Navigation</div>
                    <div className="text-xs text-gray-500">Turn-by-turn optimized</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleStyleChange('streets')}
                className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors ${
                  currentStyle === 'streets' ? 'bg-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Route className="h-4 w-4 text-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Streets</div>
                    <div className="text-xs text-gray-500">General purpose map</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Map Overlays Section */}
          <div className="p-4 border-t space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Layers className="h-4 w-4" />
              Map Overlays
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="traffic" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Car className="h-4 w-4 text-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Traffic</div>
                    <div className="text-xs text-gray-500">Real-time traffic conditions</div>
                  </div>
                </label>
                <Switch
                  id="traffic"
                  checked={overlaysState.traffic}
                  onCheckedChange={(checked) => onOverlayToggle('traffic', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="fires" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Active Fires</div>
                    <div className="text-xs text-gray-500">Wildfire hotspots</div>
                  </div>
                </label>
                <Switch
                  id="fires"
                  checked={overlaysState.fires}
                  onCheckedChange={(checked) => onOverlayToggle('fires', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="phone" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Phone className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Phone Coverage</div>
                    <div className="text-xs text-gray-500">Cell signal areas</div>
                  </div>
                </label>
                <Switch
                  id="phone"
                  checked={overlaysState.phone}
                  onCheckedChange={(checked) => onOverlayToggle('phone', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="parks" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Trees className="h-4 w-4 text-green-700" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">National Parks</div>
                    <div className="text-xs text-gray-500">Park boundaries</div>
                  </div>
                </label>
                <Switch
                  id="parks"
                  checked={overlaysState.parks}
                  onCheckedChange={(checked) => onOverlayToggle('parks', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="forests" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Forest className="h-4 w-4 text-green-800" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">State Forests</div>
                    <div className="text-xs text-gray-500">Forest boundaries</div>
                  </div>
                </label>
                <Switch
                  id="forests"
                  checked={overlaysState.forests}
                  onCheckedChange={(checked) => onOverlayToggle('forests', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default MapOptions;