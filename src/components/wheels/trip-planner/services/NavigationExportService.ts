export interface RouteExport {
  origin: { name: string; coordinates: [number, number] };
  destination: { name: string; coordinates: [number, number] };
  waypoints: Array<{ name: string; coordinates: [number, number] }>;
  totalDistance: number;
  estimatedTime: number;
  dayIndex?: number;
}

export interface ExportOptions {
  app: 'google' | 'apple' | 'waze' | 'garmin';
  scope: 'daily' | 'full' | 'waypoints';
  dayIndex?: number;
  format: 'url' | 'gpx';
}

export interface ExportResult {
  success: boolean;
  url?: string;
  file?: Blob;
  error?: string;
}

export class NavigationExportService {
  static generateMultiDayRoutes(
    origin: { name: string; coordinates: [number, number] },
    destination: { name: string; coordinates: [number, number] },
    waypoints: Array<{ name: string; coordinates: [number, number] }>,
    totalDistance: number,
    estimatedTime: number
  ): RouteExport[] {
    const days = Math.ceil(totalDistance / 300);
    return [{
      origin,
      destination,
      waypoints,
      totalDistance,
      estimatedTime,
      dayIndex: 1
    }];
  }

  static async exportRoute(route: RouteExport, options: ExportOptions): Promise<ExportResult> {
    const url = `https://www.google.com/maps/dir/${route.origin.coordinates[1]},${route.origin.coordinates[0]}/${route.destination.coordinates[1]},${route.destination.coordinates[0]}`;
    window.open(url, '_blank');
    return { success: true, url };
  }

  static async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      return false;
    }
  }
}