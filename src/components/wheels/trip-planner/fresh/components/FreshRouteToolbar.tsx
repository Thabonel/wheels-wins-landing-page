import React from 'react';
import { 
  Undo2, 
  Redo2, 
  Plus, 
  Trash2, 
  Navigation, 
  Save, 
  Share2,
  Menu,
  X,
  Map,
  DollarSign,
  Users,
  Download
} from 'lucide-react';

interface FreshRouteToolbarProps {
  // Undo/Redo
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // Route actions
  onAddWaypoint: () => void;
  onClearRoute: () => void;
  onSaveTrip: () => void;
  onShareTrip: () => void;
  onExportRoute?: () => void;
  
  // Navigation
  onStartNavigation: () => void;
  isNavigating: boolean;
  
  // Traffic
  onToggleTraffic: () => void;
  showTraffic: boolean;
  
  // Panel toggles
  onToggleSidebar: () => void;
  showSidebar: boolean;
  onToggleMapStyle: () => void;
  showMapStyle: boolean;
  onToggleBudget: () => void;
  showBudget: boolean;
  onToggleSocial: () => void;
  showSocial: boolean;
  
  // States
  isAddingWaypoint: boolean;
  hasRoute: boolean;
}

const FreshRouteToolbar: React.FC<FreshRouteToolbarProps> = ({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAddWaypoint,
  onClearRoute,
  onSaveTrip,
  onShareTrip,
  onExportRoute,
  onStartNavigation,
  isNavigating,
  onToggleTraffic,
  showTraffic,
  onToggleSidebar,
  showSidebar,
  onToggleMapStyle,
  showMapStyle,
  onToggleBudget,
  showBudget,
  onToggleSocial,
  showSocial,
  isAddingWaypoint,
  hasRoute,
}) => {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[10000]">
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-2 py-2 flex items-center">
        {/* Map Style Toggle - Leftmost */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMapStyle();
          }}
          className="p-2 rounded hover:bg-gray-100 transition-all mr-2"
          title="Map Style"
        >
          <Map className="w-4 h-4" />
        </button>
        
        {/* Undo/Redo Group */}
        <div className="flex items-center border-r border-gray-200 pr-2 mr-2 border-l pl-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
        
        {/* Route Planning Group */}
        <div className="flex items-center border-r border-gray-200 pr-2 mr-2">
          <button
            onClick={onAddWaypoint}
            className={`p-2 rounded transition-all ${
              isAddingWaypoint 
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                : 'hover:bg-gray-100'
            }`}
            title="Add Stop"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onClearRoute}
            disabled={!hasRoute}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Clear Route"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        {/* Navigation Group */}
        <div className="flex items-center border-r border-gray-200 pr-2 mr-2">
          <button
            onClick={onStartNavigation}
            disabled={!hasRoute}
            className={`p-2 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              isNavigating 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'hover:bg-gray-100'
            }`}
            title={isNavigating ? 'Stop Navigation' : 'Start Navigation'}
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>
        
        {/* Actions Group */}
        <div className="flex items-center border-r border-gray-200 pr-2 mr-2">
          <button
            onClick={onSaveTrip}
            disabled={!hasRoute}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Save Trip"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={onShareTrip}
            disabled={!hasRoute}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Share Trip"
          >
            <Share2 className="w-4 h-4" />
          </button>
          {onExportRoute && (
            <button
              onClick={onExportRoute}
              disabled={!hasRoute}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Export to Navigation Apps"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Budget and Social Group */}
        <div className="flex items-center border-r border-gray-200 pr-2 mr-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBudget();
            }}
            className={`p-2 rounded transition-all ${
              showBudget 
                ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                : 'hover:bg-gray-100'
            }`}
            title="Budget Tracker"
          >
            <DollarSign className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSocial();
            }}
            className={`p-2 rounded transition-all ${
              showSocial 
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                : 'hover:bg-gray-100'
            }`}
            title="Social & Friends"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>
        
        {/* Track Management Toggle (Hamburger) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSidebar();
          }}
          className="p-2 rounded hover:bg-gray-100 transition-all"
          title="Track Management"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>
      
      {/* Mobile-friendly version with labels */}
      <div className="hidden lg:block absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-xs text-gray-500 whitespace-nowrap">
        <span className="inline-flex items-center space-x-4">
          <span>Ctrl+Z: Undo</span>
          <span>•</span>
          <span>Ctrl+Y: Redo</span>
          <span>•</span>
          <span>Click map to add stops</span>
        </span>
      </div>
    </div>
  );
};

export default FreshRouteToolbar;