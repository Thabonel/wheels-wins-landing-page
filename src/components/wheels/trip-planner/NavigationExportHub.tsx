import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Navigation, 
  MapPin, 
  Download, 
  Copy, 
  ExternalLink,
  Clock,
  Route
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { NavigationExportService, RouteExport, ExportOptions } from './services/NavigationExportService';

interface NavigationExportHubProps {
  isOpen: boolean;
  onClose: () => void;
  origin: { name: string; coordinates: [number, number] };
  destination: { name: string; coordinates: [number, number] };
  waypoints: Array<{ name: string; coordinates: [number, number] }>;
  totalDistance: number;
  estimatedTime: number;
}

export default function NavigationExportHub({
  isOpen,
  onClose,
  origin,
  destination,
  waypoints,
  totalDistance,
  estimatedTime
}: NavigationExportHubProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  const navigationApps = [
    {
      id: 'google',
      name: 'Google Maps',
      icon: '🗺️',
      description: 'Best for comprehensive routing',
      available: true,
      supportsDailyRoutes: true
    },
    {
      id: 'apple',
      name: 'Apple Maps',
      icon: '🍎',
      description: 'iOS native navigation',
      available: /iPad|iPhone|iPod/.test(navigator.userAgent),
      supportsDailyRoutes: true
    },
    {
      id: 'waze',
      name: 'Waze',
      icon: '🛣️',
      description: 'Real-time traffic & alerts',
      available: true,
      supportsDailyRoutes: false
    },
    {
      id: 'garmin',
      name: 'Garmin GPS',
      icon: '📍',
      description: 'Download GPX for device',
      available: true,
      supportsDailyRoutes: true
    }
  ];

  const dailyRoutes = NavigationExportService.generateMultiDayRoutes(
    origin,
    destination,
    waypoints,
    totalDistance,
    estimatedTime
  );

  const handleExport = async (app: string, scope: 'daily' | 'full' | 'waypoints', dayIndex?: number) => {
    setIsExporting(true);
    setSelectedApp(app);

    try {
      let route: RouteExport;

      if (scope === 'daily' && dayIndex !== undefined) {
        route = dailyRoutes[dayIndex];
      } else if (scope === 'waypoints') {
        route = {
          origin,
          destination: waypoints[waypoints.length - 1] || destination,
          waypoints: waypoints.slice(0, -1),
          totalDistance,
          estimatedTime
        };
      } else {
        // Full trip
        route = {
          origin,
          destination,
          waypoints,
          totalDistance,
          estimatedTime
        };
      }

      const options: ExportOptions = {
        app: app as any,
        scope,
        dayIndex,
        format: app === 'garmin' ? 'gpx' : 'url'
      };

      const result = await NavigationExportService.exportRoute(route, options);

      if (result.success) {
        toast({
          title: '🎉 Export Successful',
          description: `Route exported to ${navigationApps.find(a => a.id === app)?.name}`,
        });

        if (result.url && scope !== 'daily') {
          // Offer to copy URL for sharing
          const copied = await NavigationExportService.copyToClipboard(result.url);
          if (copied) {
            toast({
              title: '📋 Link Copied',
              description: 'Navigation link copied to clipboard for sharing',
            });
          }
        }
      } else {
        toast({
          title: 'Export Failed',
          description: result.error || 'Failed to export route',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Export Error',
        description: 'An unexpected error occurred during export',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
      setSelectedApp(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Navigation className="w-6 h-6 text-primary" />
            Export to Navigation Apps
          </DialogTitle>
          <p className="text-muted-foreground">
            Choose your preferred navigation app and export format
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trip Summary */}
          <Card className="bg-primary/5">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium">Route Summary</div>
                    <div className="text-muted-foreground">{origin.name} → {destination.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium">{totalDistance.toFixed(0)} miles</div>
                    <div className="text-muted-foreground">{waypoints.length} waypoints</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium">{Math.round(estimatedTime / 60)} hours</div>
                    <div className="text-muted-foreground">{dailyRoutes.length} day trip</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Apps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {navigationApps.map((app) => (
              <Card 
                key={app.id} 
                className={`transition-all ${!app.available ? 'opacity-50' : 'hover:shadow-md'}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-2xl">{app.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base">{app.name}</h3>
                      <p className="text-sm text-muted-foreground">{app.description}</p>
                    </div>
                    {!app.available && (
                      <Badge variant="secondary" className="text-xs">
                        Unavailable
                      </Badge>
                    )}
                  </div>

                  {app.available && (
                    <div className="space-y-2">
                      {/* Full Trip Export */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleExport(app.id, 'full')}
                        disabled={isExporting}
                      >
                        {isExporting && selectedApp === app.id ? (
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                          <ExternalLink className="w-4 h-4 mr-2" />
                        )}
                        Export Full Trip
                      </Button>

                      {/* Daily Routes */}
                      {app.supportsDailyRoutes && dailyRoutes.length > 1 && (
                        <div className="grid grid-cols-2 gap-2">
                          {dailyRoutes.slice(0, 4).map((route, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleExport(app.id, 'daily', index)}
                              disabled={isExporting}
                            >
                              Day {route.dayIndex}
                            </Button>
                          ))}
                          {dailyRoutes.length > 4 && (
                            <Badge variant="secondary" className="text-xs text-center p-1">
                              +{dailyRoutes.length - 4} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Waypoints Only */}
                      {waypoints.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleExport(app.id, 'waypoints')}
                          disabled={isExporting}
                        >
                          {app.id === 'garmin' ? (
                            <Download className="w-4 h-4 mr-2" />
                          ) : (
                            <Copy className="w-4 h-4 mr-2" />
                          )}
                          Export Waypoints {app.id === 'garmin' ? '(GPX)' : ''}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Daily Route Breakdown */}
          {dailyRoutes.length > 1 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Route className="w-4 h-4" />
                  Daily Route Breakdown
                </h4>
                <div className="space-y-2">
                  {dailyRoutes.map((route, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Day {route.dayIndex}</Badge>
                        <span className="font-medium">
                          {route.origin.name} → {route.destination.name}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {route.totalDistance.toFixed(0)} mi • {Math.round(route.estimatedTime / 60)}h
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}