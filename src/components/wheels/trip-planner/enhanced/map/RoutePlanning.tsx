import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Car, 
  Truck, 
  Bike,
  MapPin,
  Navigation,
  Trash2,
  LocateFixed,
  Plus,
  Share2,
  Save,
  StopCircle
} from 'lucide-react';
import SaveRouteModal from '../SaveRouteModal';

interface RoutePlanningProps {
  onModeChange?: (mode: 'driving' | 'rv' | 'offroad') => void;
  onAddWaypoint?: () => void;
  onClearRoute?: () => void;
  onCenterUser?: () => void;
  onShare?: () => void;
  onSaveTrip?: () => void;
  waypointCount?: number;
  distance?: string;
  duration?: string;
}

const RoutePlanning: React.FC<RoutePlanningProps> = ({ 
  onModeChange,
  onAddWaypoint,
  onClearRoute,
  onCenterUser,
  onShare,
  onSaveTrip,
  waypointCount = 0,
  distance,
  duration
}) => {
  const [selectedMode, setSelectedMode] = useState<'driving' | 'rv' | 'offroad'>('rv');
  const [isOpen, setIsOpen] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleModeChange = (mode: 'driving' | 'rv' | 'offroad') => {
    setSelectedMode(mode);
    onModeChange?.(mode);
  };

  return (
    <Card className="w-72 shadow-lg bg-white/95 backdrop-blur-sm">
      <Button
        variant="ghost"
        className="w-full justify-start px-4 py-3 font-medium hover:bg-gray-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Navigation className="h-4 w-4 mr-2" />
        Route Planning
      </Button>
      
      {isOpen && (
        <CardContent className="p-4 space-y-3 border-t">
          {/* Vehicle Type Selection */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            <Button
              variant={selectedMode === 'driving' ? 'default' : 'ghost'}
              size="sm"
              className={`flex-1 ${selectedMode === 'driving' ? 'bg-green-700 hover:bg-green-800' : ''}`}
              onClick={() => handleModeChange('driving')}
            >
              <Car className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedMode === 'rv' ? 'default' : 'ghost'}
              size="sm"
              className={`flex-1 ${selectedMode === 'rv' ? 'bg-green-700 hover:bg-green-800' : ''}`}
              onClick={() => handleModeChange('rv')}
            >
              <Truck className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedMode === 'offroad' ? 'default' : 'ghost'}
              size="sm"
              className={`flex-1 ${selectedMode === 'offroad' ? 'bg-green-700 hover:bg-green-800' : ''}`}
              onClick={() => handleModeChange('offroad')}
            >
              <Bike className="h-4 w-4" />
            </Button>
          </div>

          {/* Stop and POI Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start"
              onClick={onAddWaypoint}
            >
              <StopCircle className="h-4 w-4 mr-1" />
              STOP
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start"
              onClick={onAddWaypoint}
            >
              <Plus className="h-4 w-4 mr-1" />
              ADD POI
            </Button>
          </div>

          {/* Waypoint Counter */}
          {waypointCount > 0 && (
            <div className="px-2 py-1 bg-gray-50 rounded text-sm text-gray-600">
              {waypointCount} waypoint{waypointCount > 1 ? 's' : ''} added
            </div>
          )}

          {/* Distance and Duration Display */}
          {(distance || duration) && (
            <div className="px-2 py-2 bg-blue-50 rounded border border-blue-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Distance:</span>
                <span className="font-medium">{distance || '15.8 km'}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{duration || '19 min'}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClearRoute}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                CLEAR
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onShare}
              >
                <Share2 className="h-4 w-4 mr-1" />
                SHARE
              </Button>
            </div>

            <Button 
              className="w-full bg-green-700 hover:bg-green-800 text-white"
              size="sm" 
              onClick={() => setShowSaveModal(true)}
            >
              <Save className="h-4 w-4 mr-2" />
              SAVE TRIP TO LIST
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={onCenterUser}
            >
              <LocateFixed className="h-4 w-4 mr-2" />
              CENTER ON ME
            </Button>
          </div>
        </CardContent>
      )}
      
      {/* Save Route Modal */}
      {showSaveModal && (
        <SaveRouteModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          routeData={{
            start: 'Current Location',
            end: 'Destination',
            waypoints: Array(waypointCount).fill('').map((_, i) => `Waypoint ${i + 1}`),
            distance: parseFloat(distance || '0'),
            duration: parseFloat(duration || '0')
          }}
        />
      )}
    </Card>
  );
};

export default RoutePlanning;