import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Undo2, 
  Redo2, 
  Save, 
  Share2, 
  Navigation, 
  TrafficCone,
  Sidebar,
  MapPin,
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FreshTripToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSave: () => void;
  onShare: () => void;
  onClearRoute: () => void;
  onStartNavigation: () => void;
  onToggleTraffic: () => void;
  onToggleSidebar: () => void;
  onAddWaypoint: () => void;
  showTraffic: boolean;
  isNavigating: boolean;
  isAddingWaypoint: boolean;
  hasRoute: boolean;
  onImport?: () => void;
  onExport?: () => void;
}

const FreshTripToolbar: React.FC<FreshTripToolbarProps> = ({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSave,
  onShare,
  onClearRoute,
  onStartNavigation,
  onToggleTraffic,
  onToggleSidebar,
  onAddWaypoint,
  showTraffic,
  isNavigating,
  isAddingWaypoint,
  hasRoute,
  onImport,
  onExport
}) => {
  return (
    <div className="bg-white border-b shadow-sm">
      <div className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Undo/Redo Group */}
          <div className="flex items-center gap-1 border-r pr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              className="h-8 px-2"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              className="h-8 px-2"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Route Actions Group */}
          <div className="flex items-center gap-1 border-r pr-2">
            <Button
              variant={isAddingWaypoint ? "default" : "ghost"}
              size="sm"
              onClick={onAddWaypoint}
              className="h-8 px-3"
              title="Add waypoint by clicking on map"
            >
              <MapPin className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Add Stop</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearRoute}
              disabled={!hasRoute}
              className="h-8 px-2"
              title="Clear all waypoints"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Map Features Group */}
          <div className="flex items-center gap-1 border-r pr-2">
            <Button
              variant={showTraffic ? "default" : "ghost"}
              size="sm"
              onClick={onToggleTraffic}
              className="h-8 px-3"
              title="Toggle traffic layer"
            >
              <TrafficCone className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Traffic</span>
            </Button>
            <Button
              variant={isNavigating ? "default" : "ghost"}
              size="sm"
              onClick={onStartNavigation}
              disabled={!hasRoute}
              className="h-8 px-3"
              title="Start navigation"
            >
              <Navigation className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Navigate</span>
            </Button>
          </div>

          {/* File Actions Group */}
          <div className="flex items-center gap-1 border-r pr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              disabled={!hasRoute}
              className="h-8 px-3"
              title="Save trip"
            >
              <Save className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Save</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
              disabled={!hasRoute}
              className="h-8 px-3"
              title="Share trip"
            >
              <Share2 className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            {onImport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onImport}
                className="h-8 px-2"
                title="Import route"
              >
                <Upload className="w-4 h-4" />
              </Button>
            )}
            {onExport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExport}
                disabled={!hasRoute}
                className="h-8 px-2"
                title="Export route"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* View Options - Right aligned */}
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="h-8 px-2"
              title="Toggle sidebar"
            >
              <Sidebar className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Status indicators for mobile */}
        {(isAddingWaypoint || isNavigating || showTraffic) && (
          <div className="flex flex-wrap gap-2 mt-2 sm:hidden">
            {isAddingWaypoint && (
              <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                Click map to add waypoint
              </div>
            )}
            {isNavigating && (
              <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                Navigation active
              </div>
            )}
            {showTraffic && (
              <div className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                Traffic visible
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FreshTripToolbar;