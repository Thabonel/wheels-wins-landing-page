import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Undo2,
  Redo2,
  Save,
  Download,
  Upload,
  Share2,
  Printer,
  Settings,
  Navigation,
  MapPin,
  Route,
  Trash2,
  Eye,
  EyeOff,
  Calculator,
  MessageSquare
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface TripToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
  onSettings?: () => void;
  onStartNavigation?: () => void;
  onAddWaypoint?: () => void;
  onOptimizeRoute?: () => void;
  onClearRoute?: () => void;
  onToggleTraffic?: () => void;
  onBudgetCalculator?: () => void;
  onOpenPAM?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasRoute?: boolean;
  isNavigating?: boolean;
  showTraffic?: boolean;
  className?: string;
}

export default function TripToolbar({
  onUndo,
  onRedo,
  onSave,
  onExport,
  onImport,
  onShare,
  onPrint,
  onSettings,
  onStartNavigation,
  onAddWaypoint,
  onOptimizeRoute,
  onClearRoute,
  onToggleTraffic,
  onBudgetCalculator,
  onOpenPAM,
  canUndo = false,
  canRedo = false,
  hasRoute = false,
  isNavigating = false,
  showTraffic = false,
  className
}: TripToolbarProps) {
  return (
    <TooltipProvider>
      <div className={cn(
        "absolute bottom-6 left-1/2 -translate-x-1/2 z-10",
        "bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border",
        "px-2 py-1.5 flex items-center gap-1",
        className
      )}>
        {/* Undo/Redo Group */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onUndo}
                disabled={!canUndo}
                className="h-8 w-8 p-0"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRedo}
                disabled={!canRedo}
                className="h-8 w-8 p-0"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Route Actions Group */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddWaypoint}
                className="h-8 w-8 p-0"
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Waypoint</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onOptimizeRoute}
                disabled={!hasRoute}
                className="h-8 w-8 p-0"
              >
                <Route className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Optimize Route</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearRoute}
                disabled={!hasRoute}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear Route</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* View Options Group */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showTraffic ? "secondary" : "ghost"}
                size="sm"
                onClick={onToggleTraffic}
                className="h-8 w-8 p-0"
              >
                {showTraffic ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showTraffic ? 'Hide Traffic' : 'Show Traffic'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isNavigating ? "secondary" : "ghost"}
                size="sm"
                onClick={onStartNavigation}
                disabled={!hasRoute}
                className="h-8 w-8 p-0"
              >
                <Navigation className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isNavigating ? 'Stop Navigation' : 'Start Navigation'}
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* File Actions Group */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSave}
                disabled={!hasRoute}
                className="h-8 w-8 p-0"
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save Trip</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onImport}
                className="h-8 w-8 p-0"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import GPX</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onExport}
                disabled={!hasRoute}
                className="h-8 w-8 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export GPX</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Wheels & Wins Integration Group */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onBudgetCalculator}
                disabled={!hasRoute}
                className="h-8 px-2"
              >
                <Calculator className="h-4 w-4" />
                <span className="ml-1.5 text-xs">Budget</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Calculate Trip Budget</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenPAM}
                className="h-8 px-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="ml-1.5 text-xs">PAM</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ask PAM for Help</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Additional Actions Group */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onShare}
                disabled={!hasRoute}
                className="h-8 w-8 p-0"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share Trip</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrint}
                disabled={!hasRoute}
                className="h-8 w-8 p-0"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Print Itinerary</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSettings}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}