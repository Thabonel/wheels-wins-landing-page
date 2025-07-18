import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, ExternalLink } from 'lucide-react';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export interface RoutePoint {
  name: string;
  lat: number;
  lng: number;
}

export interface RouteData {
  origin: RoutePoint;
  destination: RoutePoint;
  waypoints?: RoutePoint[];
}

export interface BudgetData {
  total: number;
  remaining: number;
}

export interface NavigationExportHubProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoute: RouteData | any; // Allow any for compatibility with existing hook data
  currentBudget?: BudgetData | any; // Allow any for compatibility
}

function buildGoogleMapsLink(route: RouteData) {
  const waypoints = route.waypoints && route.waypoints.length
    ? `&waypoints=${  route.waypoints.map(w => `${w.lat},${w.lng}`).join('|')}`
    : '';
  return `https://www.google.com/maps/dir/?api=1&origin=${route.origin.lat},${route.origin.lng}&destination=${route.destination.lat},${route.destination.lng}${waypoints}`;
}

function buildAppleMapsLink(route: RouteData) {
  return `https://maps.apple.com/?saddr=${route.origin.lat},${route.origin.lng}&daddr=${route.destination.lat},${route.destination.lng}`;
}

function buildWazeLink(route: RouteData) {
  return `https://waze.com/ul?ll=${route.destination.lat}%2C${route.destination.lng}&navigate=yes`;
}

function buildGPX(route: RouteData) {
  const points = [route.origin, ...(route.waypoints || []), route.destination];
  const wpts = points
    .map(p => `<wpt lat="${p.lat}" lon="${p.lng}"><name>${p.name}</name></wpt>`) 
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="NavigationExportHub">\n${wpts}\n</gpx>`;
}

async function buildPDF(route: RouteData, budget?: BudgetData) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let y = 760;
  const size = 16;
  page.drawText('Trip Itinerary', { x: 50, y, size, font });
  y -= 30;
  page.drawText(`Origin: ${route.origin.name}`, { x: 50, y, size: 12, font });
  y -= 15;
  page.drawText(`Destination: ${route.destination.name}`, { x: 50, y, size: 12, font });
  if (route.waypoints && route.waypoints.length) {
    y -= 20;
    page.drawText('Waypoints:', { x: 50, y, size: 12, font });
    route.waypoints.forEach(wp => {
      y -= 15;
      page.drawText(`- ${wp.name}`, { x: 70, y, size: 12, font });
    });
  }
  if (budget) {
    y -= 25;
    page.drawText(`Budget remaining: $${budget.remaining} of $${budget.total}`, { x: 50, y, size: 12, font });
  }
  const pdfBytes = await doc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function NavigationExportHub({ isOpen, onClose, currentRoute, currentBudget }: NavigationExportHubProps) {
  // Check if we have route data from hooks (different structure)
  const hasOriginDest = currentRoute?.originName && currentRoute?.destName;
  const hasRoutePoints = currentRoute?.origin?.name && currentRoute?.destination?.name;
  
  // Transform hook data to expected format if needed
  const transformedRoute = hasOriginDest && !hasRoutePoints ? {
    origin: { name: currentRoute.originName, lat: 0, lng: 0 },
    destination: { name: currentRoute.destName, lat: 0, lng: 0 },
    waypoints: currentRoute.waypoints?.map((wp: any) => ({ 
      name: wp.name || 'Waypoint', 
      lat: wp.lat || 0, 
      lng: wp.lng || 0 
    })) || []
  } : currentRoute;

  const transformedBudget = currentBudget?.totalBudget ? {
    total: currentBudget.totalBudget,
    remaining: currentBudget.totalBudget - currentBudget.currentSpent
  } : currentBudget;

  const hasValidRoute = hasRoutePoints || hasOriginDest;

  const handleGPXDownload = () => {
    if (!hasValidRoute) return;
    const gpx = buildGPX(transformedRoute);
    downloadBlob(new Blob([gpx], { type: 'application/gpx+xml' }), 'route.gpx');
  };

  const handlePDFDownload = async () => {
    if (!hasValidRoute) return;
    const pdf = await buildPDF(transformedRoute, transformedBudget);
    downloadBlob(pdf, 'itinerary.pdf');
  };

  if (!hasValidRoute) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Export Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                <div>No route data available. Please plan a trip first.</div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button variant="secondary" onClick={onClose}>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const displayRoute = transformedRoute;
  const displayBudget = transformedBudget;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Trip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 text-sm">
              <div>Origin: {displayRoute.origin?.name || currentRoute.originName}</div>
              <div>Destination: {displayRoute.destination?.name || currentRoute.destName}</div>
              {((displayRoute.waypoints && displayRoute.waypoints.length > 0) || 
                (currentRoute.waypoints && currentRoute.waypoints.length > 0)) && (
                <div>Waypoints: {
                  (displayRoute.waypoints || currentRoute.waypoints)
                    ?.map((w: any) => w.name || 'Waypoint')
                    .join(', ')
                }</div>
              )}
              {displayBudget && (
                <div>Budget remaining: ${displayBudget.remaining || 0} / ${displayBudget.total || 0}</div>
              )}
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 gap-2">
            {hasRoutePoints && (
              <>
                <Button asChild variant="outline">
                  <a href={buildGoogleMapsLink(displayRoute)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" /> Google Maps
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={buildAppleMapsLink(displayRoute)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" /> Apple Maps
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={buildWazeLink(displayRoute)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" /> Waze
                  </a>
                </Button>
                <Button onClick={handleGPXDownload} variant="outline">
                  <Download className="w-4 h-4" /> GPX File
                </Button>
              </>
            )}
            <Button onClick={handlePDFDownload} variant="outline">
              <Download className="w-4 h-4" /> PDF Itinerary
            </Button>
          </div>
        </div>
        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

