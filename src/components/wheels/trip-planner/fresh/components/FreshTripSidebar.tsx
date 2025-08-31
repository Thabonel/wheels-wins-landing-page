import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Flag, 
  Circle, 
  Trash2, 
  GripVertical,
  Plus,
  Search,
  Navigation2,
  DollarSign,
  Clock,
  Fuel,
  Home,
  Tent,
  ShowerHead,
  Zap,
  Wifi,
  Car,
  Bike,
  FootprintsIcon as Walk
} from 'lucide-react';
import { Waypoint } from '../hooks/useFreshWaypointManager';
import { cn } from '@/lib/utils';

interface RouteInfo {
  distance: number;
  duration: number;
  geometry: any;
}

interface FreshTripSidebarProps {
  waypoints: Waypoint[];
  onRemoveWaypoint: (id: string) => void;
  onReorderWaypoints: (startIndex: number, endIndex: number) => void;
  onClearAll: () => void;
  routeProfile: 'driving' | 'walking' | 'cycling';
  onRouteProfileChange: (profile: 'driving' | 'walking' | 'cycling') => void;
  currentRoute: RouteInfo | null;
  isLoadingRoute: boolean;
  onAddPOI?: (poi: any) => void;
  onSearch?: (query: string) => void;
}

// RV-specific POI categories
const RV_POI_CATEGORIES = [
  { id: 'rv_park', label: 'RV Parks', icon: Home, color: 'text-green-600' },
  { id: 'campground', label: 'Campgrounds', icon: Tent, color: 'text-emerald-600' },
  { id: 'dump_station', label: 'Dump Stations', icon: ShowerHead, color: 'text-blue-600' },
  { id: 'propane', label: 'Propane', icon: Fuel, color: 'text-orange-600' },
  { id: 'electric', label: 'Electric Hookup', icon: Zap, color: 'text-yellow-600' },
  { id: 'wifi', label: 'WiFi Spots', icon: Wifi, color: 'text-purple-600' },
];

const FreshTripSidebar: React.FC<FreshTripSidebarProps> = ({
  waypoints,
  onRemoveWaypoint,
  onReorderWaypoints,
  onClearAll,
  routeProfile,
  onRouteProfileChange,
  currentRoute,
  isLoadingRoute,
  onAddPOI,
  onSearch
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('waypoints');

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    
    if (draggedIndex !== dropIndex) {
      onReorderWaypoints(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const handleSearch = () => {
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery);
    }
  };

  const formatDistance = (meters: number) => {
    const miles = meters * 0.000621371;
    return miles < 1 
      ? `${Math.round(meters * 3.28084)} ft`
      : `${miles.toFixed(1)} mi`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  const getWaypointIcon = (type?: string) => {
    switch (type) {
      case 'origin':
        return <Circle className="w-4 h-4 text-green-600" />;
      case 'destination':
        return <Flag className="w-4 h-4 text-red-600" />;
      default:
        return <MapPin className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="w-80 bg-white border-l h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Trip Planner</h3>
        {currentRoute && !isLoadingRoute && (
          <div className="mt-2 text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Navigation2 className="w-3 h-3" />
                {formatDistance(currentRoute.distance)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(currentRoute.duration)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Route Profile Selector */}
      <div className="p-4 border-b">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <Button
            variant={routeProfile === 'driving' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onRouteProfileChange('driving')}
            className="flex-1"
          >
            <Car className="w-4 h-4 mr-1" />
            Drive
          </Button>
          <Button
            variant={routeProfile === 'cycling' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onRouteProfileChange('cycling')}
            className="flex-1"
          >
            <Bike className="w-4 h-4 mr-1" />
            Bike
          </Button>
          <Button
            variant={routeProfile === 'walking' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onRouteProfileChange('walking')}
            className="flex-1"
          >
            <Walk className="w-4 h-4 mr-1" />
            Walk
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="waypoints">
            Waypoints ({waypoints.length})
          </TabsTrigger>
          <TabsTrigger value="poi">
            RV Services
          </TabsTrigger>
        </TabsList>

        {/* Waypoints Tab */}
        <TabsContent value="waypoints" className="flex-1 flex flex-col mt-0">
          {/* Search Bar */}
          <div className="p-4 border-b">
            <div className="flex gap-2">
              <Input
                placeholder="Search location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleSearch}
                disabled={!searchQuery.trim()}
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Waypoints List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {waypoints.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No waypoints added</p>
                  <p className="text-xs mt-1">Click the map or search to add stops</p>
                </div>
              ) : (
                waypoints.map((waypoint, index) => (
                  <div
                    key={waypoint.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className={cn(
                      "bg-gray-50 rounded-lg p-3 cursor-move transition-all",
                      draggedIndex === index && "opacity-50",
                      "hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getWaypointIcon(waypoint.type)}
                          <span className="font-medium text-sm">
                            {index === 0 ? 'Start' : 
                             index === waypoints.length - 1 ? 'End' : 
                             `Stop ${index}`}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {waypoint.name}
                        </p>
                        {waypoint.address && (
                          <p className="text-xs text-gray-500 mt-1">
                            {waypoint.address}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveWaypoint(waypoint.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Actions */}
          {waypoints.length > 0 && (
            <div className="p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="w-full"
              >
                Clear All Waypoints
              </Button>
            </div>
          )}
        </TabsContent>

        {/* POI Tab */}
        <TabsContent value="poi" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-600">
                Find RV-specific services along your route
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {RV_POI_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Button
                      key={category.id}
                      variant="outline"
                      size="sm"
                      onClick={() => onAddPOI && onAddPOI(category)}
                      className="justify-start"
                    >
                      <Icon className={cn("w-4 h-4 mr-2", category.color)} />
                      <span className="text-xs">{category.label}</span>
                    </Button>
                  );
                })}
              </div>

              {/* Budget Estimator */}
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Trip Cost Estimate
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Fuel (est.)</span>
                    <span className="font-medium">$0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Camping</span>
                    <span className="font-medium">$0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Food & Supplies</span>
                    <span className="font-medium">$0.00</span>
                  </div>
                  <div className="border-t pt-1 mt-2">
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>$0.00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FreshTripSidebar;