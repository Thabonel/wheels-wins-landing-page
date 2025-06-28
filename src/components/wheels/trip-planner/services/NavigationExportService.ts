export interface ExportOptions {
  app: 'google' | 'apple' | 'waze' | 'garmin';
  scope: 'daily' | 'full' | 'waypoints';
  dayIndex?: number;
  format: 'url' | 'gpx' | 'coordinates';
}

export interface RouteExport {
  origin: { name: string; coordinates: [number, number] };
  destination: { name: string; coordinates: [number, number] };
  waypoints: Array<{ name: string; coordinates: [number, number] }>;
  totalDistance: number;
  estimatedTime: number;
  dayIndex?: number;
}

export interface ExportResult {
  success: boolean;
  url?: string;
  file?: Blob;
  error?: string;
}

export class NavigationExportService {
  private static detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private static detectiOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  static async exportRoute(route: RouteExport, options: ExportOptions): Promise<ExportResult> {
    try {
      switch (options.app) {
        case 'google':
          return this.exportToGoogleMaps(route, options);
        case 'apple':
          return this.exportToAppleMaps(route, options);
        case 'waze':
          return this.exportToWaze(route, options);
        case 'garmin':
          return this.exportToGarmin(route, options);
        default:
          throw new Error(`Unsupported navigation app: ${options.app}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  private static exportToGoogleMaps(route: RouteExport, options: ExportOptions): ExportResult {
    const baseUrl = 'https://www.google.com/maps/dir/';
    const params = new URLSearchParams();
    
    params.append('api', '1');
    params.append('origin', `${route.origin.coordinates[1]},${route.origin.coordinates[0]}`);
    params.append('destination', `${route.destination.coordinates[1]},${route.destination.coordinates[0]}`);
    
    if (route.waypoints.length > 0) {
      const waypoints = route.waypoints
        .map(wp => `${wp.coordinates[1]},${wp.coordinates[0]}`)
        .join('|');
      params.append('waypoints', waypoints);
    }
    
    params.append('travelmode', 'driving');
    
    const url = `${baseUrl}?${params.toString()}`;
    
    // Open in new tab/app
    if (this.detectMobile()) {
      window.location.href = url;
    } else {
      window.open(url, '_blank');
    }
    
    return {
      success: true,
      url
    };
  }

  private static exportToAppleMaps(route: RouteExport, options: ExportOptions): ExportResult {
    if (!this.detectiOS() && !this.detectMobile()) {
      return {
        success: false,
        error: 'Apple Maps is only available on iOS devices'
      };
    }

    const baseUrl = 'http://maps.apple.com/';
    const params = new URLSearchParams();
    
    params.append('saddr', `${route.origin.coordinates[1]},${route.origin.coordinates[0]}`);
    params.append('daddr', `${route.destination.coordinates[1]},${route.destination.coordinates[0]}`);
    params.append('dirflg', 'd'); // driving directions
    
    const url = `${baseUrl}?${params.toString()}`;
    
    window.location.href = url;
    
    return {
      success: true,
      url
    };
  }

  private static exportToWaze(route: RouteExport, options: ExportOptions): ExportResult {
    // Waze works best with single destinations, use final destination
    const destination = route.destination;
    const baseUrl = 'https://waze.com/ul';
    const params = new URLSearchParams();
    
    params.append('ll', `${destination.coordinates[1]},${destination.coordinates[0]}`);
    params.append('navigate', 'yes');
    
    if (destination.name) {
      params.append('q', destination.name);
    }
    
    const url = `${baseUrl}?${params.toString()}`;
    
    if (this.detectMobile()) {
      window.location.href = url;
    } else {
      window.open(url, '_blank');
    }
    
    return {
      success: true,
      url
    };
  }

  private static exportToGarmin(route: RouteExport, options: ExportOptions): ExportResult {
    const gpxContent = this.generateGPX(route);
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-day-${route.dayIndex || 'full'}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return {
      success: true,
      file: blob
    };
  }

  private static generateGPX(route: RouteExport): string {
    const date = new Date().toISOString();
    
    let waypoints = '';
    let routePoints = '';
    
    // Add origin as waypoint
    waypoints += `  <wpt lat="${route.origin.coordinates[1]}" lon="${route.origin.coordinates[0]}">
    <name>${this.escapeXml(route.origin.name)}</name>
    <type>Origin</type>
  </wpt>\n`;
    
    // Add route waypoints
    route.waypoints.forEach((wp, index) => {
      waypoints += `  <wpt lat="${wp.coordinates[1]}" lon="${wp.coordinates[0]}">
    <name>${this.escapeXml(wp.name)}</name>
    <type>Waypoint ${index + 1}</type>
  </wpt>\n`;
    });
    
    // Add destination as waypoint
    waypoints += `  <wpt lat="${route.destination.coordinates[1]}" lon="${route.destination.coordinates[0]}">
    <name>${this.escapeXml(route.destination.name)}</name>
    <type>Destination</type>
  </wpt>\n`;
    
    // Create route track
    routePoints += `    <trkpt lat="${route.origin.coordinates[1]}" lon="${route.origin.coordinates[0]}"></trkpt>\n`;
    route.waypoints.forEach(wp => {
      routePoints += `    <trkpt lat="${wp.coordinates[1]}" lon="${wp.coordinates[0]}"></trkpt>\n`;
    });
    routePoints += `    <trkpt lat="${route.destination.coordinates[1]}" lon="${route.destination.coordinates[0]}"></trkpt>\n`;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RV Trip Planner" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>RV Route - Day ${route.dayIndex || 'Full Trip'}</name>
    <desc>Generated route from RV Trip Planner</desc>
    <time>${date}</time>
  </metadata>
${waypoints}
  <trk>
    <name>Route Track</name>
    <desc>Turn-by-turn route</desc>
    <trkseg>
${routePoints}
    </trkseg>
  </trk>
</gpx>`;
  }

  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  static generateMultiDayRoutes(
    origin: { name: string; coordinates: [number, number] },
    destination: { name: string; coordinates: [number, number] },
    waypoints: Array<{ name: string; coordinates: [number, number] }>,
    totalDistance: number,
    estimatedTime: number
  ): RouteExport[] {
    // Simple implementation - in real app would use routing service
    const routes: RouteExport[] = [];
    const dailyDistance = totalDistance / Math.max(1, Math.ceil(totalDistance / 300)); // ~300 miles per day
    
    if (waypoints.length === 0) {
      // Single day trip
      return [{
        origin,
        destination,
        waypoints: [],
        totalDistance,
        estimatedTime,
        dayIndex: 1
      }];
    }
    
    // Multi-day with waypoints
    let currentOrigin = origin;
    waypoints.forEach((waypoint, index) => {
      routes.push({
        origin: currentOrigin,
        destination: waypoint,
        waypoints: [],
        totalDistance: dailyDistance,
        estimatedTime: estimatedTime / waypoints.length,
        dayIndex: index + 1
      });
      currentOrigin = waypoint;
    });
    
    // Final day to destination
    if (currentOrigin !== destination) {
      routes.push({
        origin: currentOrigin,
        destination,
        waypoints: [],
        totalDistance: dailyDistance,
        estimatedTime: estimatedTime / waypoints.length,
        dayIndex: routes.length + 1
      });
    }
    
    return routes;
  }

  static async copyToClipboard(url: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }
}