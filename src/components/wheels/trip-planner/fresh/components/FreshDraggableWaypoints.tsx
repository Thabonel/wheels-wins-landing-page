import React from 'react';
import { GripVertical, MapPin, X, Navigation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Waypoint {
  id: string;
  name: string;
  coordinates: [number, number];
  address?: string;
  type?: 'origin' | 'destination' | 'waypoint';
}

interface FreshDraggableWaypointsProps {
  isOpen: boolean;
  onClose: () => void;
  waypoints: Waypoint[];
  onRemoveWaypoint: (id: string) => void;
  onReorderWaypoints: (startIndex: number, endIndex: number) => void;
  onNavigateToWaypoint?: (waypoint: Waypoint) => void;
}

const FreshDraggableWaypoints: React.FC<FreshDraggableWaypointsProps> = ({
  isOpen,
  onClose,
  waypoints,
  onRemoveWaypoint,
  onReorderWaypoints,
  onNavigateToWaypoint
}) => {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  if (!isOpen) return null;

  const getWaypointIcon = (type?: string, index?: number) => {
    switch (type) {
      case 'origin':
        return '🟢'; // Green circle for start
      case 'destination':
        return '🔴'; // Red circle for end
      default:
        return '🔵'; // Blue circle for waypoints
    }
  };

  const getWaypointLabel = (type?: string, index?: number) => {
    switch (type) {
      case 'origin':
        return 'A';
      case 'destination':
        return 'B';
      default:
        return index?.toString() || '?';
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add visual feedback
    const target = e.target as HTMLElement;
    target.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.classList.remove('opacity-50');
    
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      onReorderWaypoints(draggedIndex, dragOverIndex);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const formatCoordinates = (coords: [number, number]) => {
    return `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`;
  };

  const canReorder = (index: number) => {
    // Prevent reordering origin (first) and destination (last) waypoints
    return waypoints.length > 2 && index > 0 && index < waypoints.length - 1;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[10002] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Waypoints Manager
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {waypoints.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No waypoints yet</h3>
              <p className="text-sm">Click on the map to add waypoints to your route</p>
            </div>
          ) : (
            <div className="space-y-3">
              {waypoints.map((waypoint, index) => (
                <div
                  key={waypoint.id}
                  draggable={canReorder(index)}
                  onDragStart={(e) => canReorder(index) && handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  className={`
                    relative p-4 border rounded-lg transition-all duration-200
                    ${dragOverIndex === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                    ${canReorder(index) ? 'cursor-move hover:shadow-md' : 'cursor-default'}
                    ${draggedIndex === index ? 'opacity-50' : 'opacity-100'}
                  `}
                >
                  {/* Drag Handle */}
                  {canReorder(index) && (
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                    </div>
                  )}

                  <div className={`flex items-start gap-3 ${canReorder(index) ? 'ml-6' : 'ml-2'}`}>
                    {/* Waypoint Icon */}
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full flex-shrink-0 mt-1">
                      <span className="text-lg">{getWaypointIcon(waypoint.type, index + 1)}</span>
                    </div>

                    {/* Waypoint Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            waypoint.type === 'origin' ? 'bg-green-50 text-green-700 border-green-200' :
                            waypoint.type === 'destination' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {waypoint.type === 'origin' ? 'Start' :
                           waypoint.type === 'destination' ? 'End' :
                           `Stop ${index}`}
                        </Badge>
                      </div>

                      <h4 className="font-medium text-gray-900 truncate mb-1">
                        {waypoint.name}
                      </h4>

                      {waypoint.address && (
                        <p className="text-sm text-gray-600 truncate mb-1">
                          {waypoint.address}
                        </p>
                      )}

                      <p className="text-xs text-gray-500 font-mono">
                        {formatCoordinates(waypoint.coordinates)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {onNavigateToWaypoint && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigateToWaypoint(waypoint)}
                          className="p-2 h-auto"
                          title="Zoom to waypoint"
                        >
                          <Navigation className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveWaypoint(waypoint.id)}
                        className="p-2 h-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Remove waypoint"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Drop indicator */}
                  {dragOverIndex === index && draggedIndex !== index && (
                    <div className="absolute inset-0 border-2 border-dashed border-blue-400 rounded-lg pointer-events-none" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reordering Instructions */}
          {waypoints.length > 2 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-sm mb-2 text-gray-900">Drag & Drop Instructions</h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Drag intermediate waypoints to reorder your route</li>
                <li>• Start and end points cannot be moved</li>
                <li>• Your route will recalculate automatically</li>
                <li>• Use the grip handle to drag waypoints</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {waypoints.length} waypoint{waypoints.length !== 1 ? 's' : ''} in your route
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreshDraggableWaypoints;