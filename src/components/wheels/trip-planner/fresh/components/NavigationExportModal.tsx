/**
 * Navigation Export Modal
 * Comprehensive interface for exporting trips to various GPS apps and devices
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Navigation,
  Smartphone,
  HardDrive,
  Download,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Loader2,
  MapPin,
  Clock,
  Route
} from 'lucide-react';
import { toast } from 'sonner';
import {
  NAVIGATION_APPS,
  exportRoute,
  convertTripToRoute,
  detectPlatform,
  isMobile,
  type NavigationApp,
  type ExportOptions
} from '@/services/navigation/navigationExportService';

interface NavigationExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripData: {
    waypoints: any[];
    route?: any;
    profile?: string;
    distance?: number;
    duration?: number;
    tripName?: string;
  };
}

export default function NavigationExportModal({
  isOpen,
  onClose,
  tripData
}: NavigationExportModalProps) {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedApps, setExportedApps] = useState<Set<string>>(new Set());

  const platform = detectPlatform();
  const mobile = isMobile();

  // Filter apps by availability on current platform
  const getAvailableApps = (category: string): NavigationApp[] => {
    return NAVIGATION_APPS.filter(app => {
      if (app.category !== category) return false;

      // Check platform compatibility
      if (app.platforms.includes(platform) || app.platforms.includes('web')) {
        return true;
      }

      return false;
    });
  };

  const mobileApps = getAvailableApps('mobile');
  const gpsApps = getAvailableApps('gps');
  const fileApps = getAvailableApps('file');

  // Format trip summary for display
  const tripSummary = {
    startLocation: tripData.waypoints?.[0]?.name || 'Start Location',
    endLocation: tripData.waypoints?.[tripData.waypoints.length - 1]?.name || 'End Location',
    distance: tripData.distance ? `${(tripData.distance / 1000).toFixed(1)} km` : 'Unknown',
    duration: tripData.duration ? formatDuration(tripData.duration) : 'Unknown',
    waypointCount: tripData.waypoints?.length || 0
  };

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  }

  const handleExport = async (app: NavigationApp, format: string = 'url') => {
    if (tripData.waypoints.length < 2) {
      toast.error('Trip must have at least 2 waypoints to export');
      return;
    }

    setSelectedApp(app.id);
    setIsExporting(true);

    try {
      // Convert trip data to route format
      const route = convertTripToRoute({
        ...tripData,
        tripName: tripData.tripName || `${tripSummary.startLocation} to ${tripSummary.endLocation}`
      });

      const options: ExportOptions = {
        app: app.id as any,
        format: format as any,
        scope: 'full'
      };

      await exportRoute(route, options);

      // Mark as exported
      setExportedApps(prev => new Set([...prev, app.id]));

      // Show success message
      const message = app.deepLinkSupport
        ? `Opened in ${app.name}`
        : `Downloaded ${format.toUpperCase()} file for ${app.name}`;

      toast.success(message);

    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export to ${app.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setSelectedApp(null);
    }
  };

  const AppCard = ({ app, formats = ['url'] }: { app: NavigationApp; formats?: string[] }) => {
    const isSelected = selectedApp === app.id;
    const isExported = exportedApps.has(app.id);
    const isLoading = isExporting && isSelected;

    return (
      <Card
        className={`cursor-pointer transition-all hover:shadow-md border-2 ${
          isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{app.icon}</div>
              <div>
                <div className="font-semibold text-sm">{app.name}</div>
                <div className="text-xs text-muted-foreground">{app.description}</div>
              </div>
            </div>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : isExported ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : app.deepLinkSupport ? (
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Download className="w-4 h-4 text-muted-foreground" />
            )}
          </div>

          {/* Platform badges */}
          <div className="flex flex-wrap gap-1 mb-3">
            {app.platforms.map(p => (
              <Badge
                key={p}
                variant={p === platform ? "default" : "secondary"}
                className="text-xs"
              >
                {p.toUpperCase()}
              </Badge>
            ))}
          </div>

          {/* Action buttons */}
          <div className="space-y-1">
            {formats.map(format => (
              <Button
                key={format}
                variant={format === 'url' ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                onClick={() => handleExport(app, format)}
                disabled={isExporting}
              >
                {format === 'url' ? (
                  <>
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Open in App
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3 mr-2" />
                    Download {format.toUpperCase()}
                  </>
                )}
              </Button>
            ))}
          </div>

          {/* Compatibility warning */}
          {!app.platforms.includes(platform) && !app.platforms.includes('web') && (
            <div className="flex items-center gap-2 mt-2 text-xs text-yellow-600">
              <AlertTriangle className="w-3 h-3" />
              Not available on {platform}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] z-[9999] mt-24 max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Send To Navigation
          </DialogTitle>
          <DialogDescription>
            Export your trip to GPS apps, devices, or download as files
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Trip Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="font-medium">From:</span>
                    <span>{tripSummary.startLocation}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Route className="w-4 h-4 text-red-600" />
                    <span className="font-medium">To:</span>
                    <span>{tripSummary.endLocation}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Route className="w-3 h-3" />
                    {tripSummary.distance}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {tripSummary.duration}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {tripSummary.waypointCount} stops
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Tabs defaultValue="mobile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="mobile" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Mobile Apps
              </TabsTrigger>
              <TabsTrigger value="gps" className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                GPS Devices
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                File Downloads
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mobile" className="space-y-3 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mobileApps.map(app => (
                  <AppCard key={app.id} app={app} />
                ))}
              </div>
              {mobileApps.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Smartphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No mobile apps available on {platform}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="gps" className="space-y-3 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {gpsApps.map(app => (
                  <AppCard
                    key={app.id}
                    app={app}
                    formats={app.fileFormats || ['gpx']}
                  />
                ))}
              </div>
              {gpsApps.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <HardDrive className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No GPS apps available on {platform}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="files" className="space-y-3 mt-4">
              <div className="grid grid-cols-1 gap-3">
                {fileApps.map(app => (
                  <AppCard
                    key={app.id}
                    app={app}
                    formats={['gpx', 'kml', 'geojson', 'csv']}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Platform info */}
          <div className="text-xs text-muted-foreground text-center py-2">
            Detected platform: {platform} {mobile ? '(Mobile)' : '(Desktop)'}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}