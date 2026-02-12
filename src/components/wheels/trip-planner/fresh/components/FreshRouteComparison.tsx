import React, { useState } from 'react';
import { Clock, MapPin, TrendingUp, AlertTriangle, LayoutGrid, Table2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RouteAlternative {
  distance: number;
  duration: number;
  geometry: any;
  index: number;
  selected?: boolean;
}

interface ElevationProfile {
  totalClimb: number;
  totalDescent: number;
  maxGradient: number;
  averageGradient: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  elevationPoints: Array<{
    distance: number;
    elevation: number;
  }>;
}

interface RouteInfo {
  distance: number;
  duration: number;
  geometry: any;
  alternatives?: RouteAlternative[];
  elevation?: ElevationProfile;
}

interface FreshRouteComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  route: RouteInfo | null;
  onRouteSelect: (routeIndex: number) => void;
}

const FreshRouteComparison: React.FC<FreshRouteComparisonProps> = ({
  isOpen,
  onClose,
  route,
  onRouteSelect
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  if (!isOpen || !route) return null;

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Advanced': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Expert': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRouteColor = (index: number) => {
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];
    return colors[index] || '#6b7280';
  };

  const allRoutes = [
    {
      index: 0,
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
      selected: true,
      isMain: true
    },
    ...(route.alternatives || []).map(alt => ({
      ...alt,
      isMain: false
    }))
  ];

  const renderTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left p-3 font-medium text-gray-600">Route</th>
            <th className="text-right p-3 font-medium text-gray-600">Distance</th>
            <th className="text-right p-3 font-medium text-gray-600">Duration</th>
            {route.elevation && (
              <>
                <th className="text-right p-3 font-medium text-gray-600">Climb</th>
                <th className="text-right p-3 font-medium text-gray-600">Max Grade</th>
                <th className="text-center p-3 font-medium text-gray-600">Difficulty</th>
              </>
            )}
            <th className="text-right p-3 font-medium text-gray-600">vs Main</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {allRoutes.map((routeOption, index) => (
            <tr
              key={index}
              className={`border-b cursor-pointer transition-colors hover:bg-gray-50 ${
                routeOption.selected ? 'bg-blue-50' : ''
              }`}
              onClick={() => onRouteSelect(index)}
            >
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getRouteColor(index) }}
                  />
                  <span className="font-medium">
                    {routeOption.isMain ? 'Main Route' : `Alternative ${index}`}
                  </span>
                  {routeOption.selected && (
                    <Badge variant="secondary" className="text-xs">Selected</Badge>
                  )}
                </div>
              </td>
              <td className="p-3 text-right font-mono">{formatDistance(routeOption.distance)}</td>
              <td className="p-3 text-right font-mono">{formatDuration(routeOption.duration)}</td>
              {route.elevation && (
                <>
                  <td className="p-3 text-right font-mono">
                    {routeOption.isMain ? `${route.elevation.totalClimb}m` : '-'}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {routeOption.isMain ? `${route.elevation.maxGradient}%` : '-'}
                  </td>
                  <td className="p-3 text-center">
                    {routeOption.isMain && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${getDifficultyColor(route.elevation.difficulty)}`}
                      >
                        {route.elevation.difficulty}
                      </Badge>
                    )}
                  </td>
                </>
              )}
              <td className="p-3 text-right text-xs">
                {index > 0 && (
                  <div>
                    <span className={
                      routeOption.distance > allRoutes[0].distance ? 'text-red-600' : 'text-green-600'
                    }>
                      {routeOption.distance > allRoutes[0].distance ? '+' : '-'}
                      {formatDistance(Math.abs(routeOption.distance - allRoutes[0].distance))}
                    </span>
                    {' / '}
                    <span className={
                      routeOption.duration > allRoutes[0].duration ? 'text-red-600' : 'text-green-600'
                    }>
                      {routeOption.duration > allRoutes[0].duration ? '+' : '-'}
                      {formatDuration(Math.abs(routeOption.duration - allRoutes[0].duration))}
                    </span>
                  </div>
                )}
                {index === 0 && <span className="text-gray-400">baseline</span>}
              </td>
              <td className="p-3">
                <Button
                  variant={routeOption.selected ? 'default' : 'outline'}
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onRouteSelect(index); }}
                >
                  {routeOption.selected ? 'Selected' : 'Select'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCardView = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {allRoutes.map((routeOption, index) => (
        <Card
          key={index}
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            routeOption.selected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}
          onClick={() => onRouteSelect(index)}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getRouteColor(index) }}
                />
                {routeOption.isMain ? 'Main Route' : `Alternative ${index}`}
                {routeOption.selected && (
                  <Badge variant="secondary" className="text-xs">Selected</Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="font-medium">{formatDistance(routeOption.distance)}</div>
                  <div className="text-gray-500 text-xs">Distance</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="font-medium">{formatDuration(routeOption.duration)}</div>
                  <div className="text-gray-500 text-xs">Duration</div>
                </div>
              </div>
            </div>

            {routeOption.isMain && route.elevation && (
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-sm">Terrain Analysis</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Climb:</span>
                    <span className="ml-1 font-medium">{route.elevation.totalClimb}m</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Descent:</span>
                    <span className="ml-1 font-medium">{route.elevation.totalDescent}m</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Max Grade:</span>
                    <span className="ml-1 font-medium">{route.elevation.maxGradient}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Avg Grade:</span>
                    <span className="ml-1 font-medium">{route.elevation.averageGradient}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${getDifficultyColor(route.elevation.difficulty)}`}
                  >
                    {route.elevation.difficulty}
                  </Badge>
                  {route.elevation.difficulty === 'Expert' && (
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-1 text-xs">
              {routeOption.isMain && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Road Following
                </Badge>
              )}
              {!routeOption.isMain && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  Alternative Path
                </Badge>
              )}
            </div>

            {index > 0 && (
              <div className="text-xs text-gray-500 border-t pt-2">
                <div className="flex justify-between">
                  <span>vs Main Route:</span>
                  <span className={
                    routeOption.distance > allRoutes[0].distance ? 'text-red-600' : 'text-green-600'
                  }>
                    {routeOption.distance > allRoutes[0].distance ? '+' : ''}
                    {formatDistance(Math.abs(routeOption.distance - allRoutes[0].distance))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span></span>
                  <span className={
                    routeOption.duration > allRoutes[0].duration ? 'text-red-600' : 'text-green-600'
                  }>
                    {routeOption.duration > allRoutes[0].duration ? '+' : ''}
                    {formatDuration(Math.abs(routeOption.duration - allRoutes[0].duration))}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[10002] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Route Comparison
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-md p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                title="Table view"
              >
                <Table2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                title="Card view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              X
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {viewMode === 'table' ? renderTableView() : renderCardView()}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-sm mb-3 text-gray-900">Route Features</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Magnetic Road Snapping
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Multiple Alternatives
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                Elevation Analysis
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                Vehicle Optimized
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Click on any route to select it as your primary route
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => {
              onClose();
            }}>
              Apply Selected Route
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreshRouteComparison;
