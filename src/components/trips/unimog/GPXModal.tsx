import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Download, FileText } from 'lucide-react';
import { parseGPX, trackToGeoJSON } from '@/utils/gpxParser';
import { toast } from 'sonner';

interface GPXModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'import' | 'export';
  onImport?: (gpxData: any) => void;
  currentRoute?: any;
  waypoints?: any[];
}

export default function GPXModal({
  isOpen,
  onClose,
  mode,
  onImport,
  currentRoute,
  waypoints = []
}: GPXModalProps) {
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [gpxText, setGpxText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.gpx') || file.name.endsWith('.kml')) {
        setGpxFile(file);
        // Read file content
        const reader = new FileReader();
        reader.onload = (event) => {
          setGpxText(event.target?.result as string);
        };
        reader.readAsText(file);
      } else {
        toast.error('Please select a GPX or KML file');
      }
    }
  };

  const handleImport = async () => {
    if (!gpxText) {
      toast.error('Please select a file or paste GPX content');
      return;
    }

    setIsProcessing(true);
    try {
      const parsedTrack = parseGPX(gpxText);
      if (parsedTrack) {
        toast.success(`Imported track: ${parsedTrack.name}`);
        if (onImport) {
          onImport(parsedTrack);
        }
        onClose();
      } else {
        toast.error('Failed to parse GPX file');
      }
    } catch (error) {
      console.error('Error importing GPX:', error);
      toast.error('Error importing GPX file');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateGPX = () => {
    if (!waypoints || waypoints.length === 0) {
      return '';
    }

    const now = new Date().toISOString();
    
    let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Wheels & Wins Trip Planner"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>RV Trip Route</name>
    <time>${now}</time>
  </metadata>
  <trk>
    <name>RV Trip</name>
    <trkseg>`;

    // Add track points from waypoints
    waypoints.forEach((waypoint: any) => {
      const coords = waypoint.coords || [waypoint.longitude, waypoint.latitude];
      gpxContent += `
      <trkpt lat="${coords[1]}" lon="${coords[0]}">
        <name>${waypoint.name || 'Waypoint'}</name>
        ${waypoint.elevation ? `<ele>${waypoint.elevation}</ele>` : ''}
        <time>${waypoint.time || now}</time>
      </trkpt>`;
    });

    gpxContent += `
    </trkseg>
  </trk>
</gpx>`;

    return gpxContent;
  };

  const handleExport = () => {
    const gpxContent = generateGPX();
    if (!gpxContent) {
      toast.error('No route data to export');
      return;
    }

    // Create blob and download
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rv-trip-${new Date().toISOString().split('T')[0]}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('GPX file exported successfully');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'import' ? (
              <>
                <Upload className="h-5 w-5" />
                Import GPX/KML Track
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Export Route as GPX
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'import' 
              ? 'Upload a GPX or KML file to import a route'
              : 'Download your current route as a GPX file'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'import' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gpx-file">Select GPX/KML File</Label>
              <Input
                id="gpx-file"
                type="file"
                accept=".gpx,.kml"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {gpxFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {gpxFile.name}
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or paste GPX content
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gpx-text">GPX Content</Label>
              <Textarea
                id="gpx-text"
                placeholder="Paste GPX or KML content here..."
                value={gpxText}
                onChange={(e) => setGpxText(e.target.value)}
                className="min-h-[150px] font-mono text-xs"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <h4 className="font-medium mb-2">Route Summary</h4>
              <div className="space-y-1 text-sm">
                <div>Waypoints: {waypoints.length}</div>
                {currentRoute && (
                  <>
                    <div>Distance: {formatDistance(currentRoute.distance)}</div>
                    <div>Duration: {formatDuration(currentRoute.duration)}</div>
                  </>
                )}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              The GPX file will include all waypoints and route information
              that can be imported into GPS devices or other mapping applications.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {mode === 'import' ? (
            <Button 
              onClick={handleImport} 
              disabled={!gpxText || isProcessing}
            >
              {isProcessing ? 'Importing...' : 'Import Route'}
            </Button>
          ) : (
            <Button 
              onClick={handleExport}
              disabled={waypoints.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export GPX
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to format distance (re-export if not available)
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// Helper function to format duration (re-export if not available)
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}