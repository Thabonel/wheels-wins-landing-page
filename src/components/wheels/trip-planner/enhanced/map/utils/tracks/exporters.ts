/**
 * GPX Exporter for saving routes as GPX files
 */

import { GPXPoint } from './parsers';

export interface ExportOptions {
  name: string;
  description?: string;
  author?: string;
  includeTimestamps?: boolean;
  includeElevation?: boolean;
}

/**
 * Convert route to GPX format
 */
export function routeToGPX(
  route: any,
  waypoints: Array<{ name: string; coords: [number, number] }>,
  options: ExportOptions
): string {
  const timestamp = new Date().toISOString();
  
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Wheels & Wins Trip Planner"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXML(options.name)}</name>
    ${options.description ? `<desc>${escapeXML(options.description)}</desc>` : ''}
    ${options.author ? `<author><name>${escapeXML(options.author)}</name></author>` : ''}
    <time>${timestamp}</time>
  </metadata>`;

  // Add waypoints
  if (waypoints && waypoints.length > 0) {
    waypoints.forEach((waypoint, index) => {
      gpx += `
  <wpt lat="${waypoint.coords[1]}" lon="${waypoint.coords[0]}">
    <name>${escapeXML(waypoint.name || `Waypoint ${index + 1}`)}</name>
  </wpt>`;
    });
  }

  // Add track
  gpx += `
  <trk>
    <name>${escapeXML(options.name)}</name>
    ${options.description ? `<desc>${escapeXML(options.description)}</desc>` : ''}
    <trkseg>`;

  // Add track points from route geometry
  if (route && route.geometry && route.geometry.coordinates) {
    route.geometry.coordinates.forEach((coord: [number, number], index: number) => {
      gpx += `
      <trkpt lat="${coord[1]}" lon="${coord[0]}">`;
      
      if (options.includeElevation) {
        // Note: Elevation would need to come from a separate API call
        gpx += `
        <ele>0</ele>`;
      }
      
      if (options.includeTimestamps) {
        // Calculate estimated time based on route duration
        const segmentTime = new Date(Date.now() + (index * 60000)); // 1 minute intervals
        gpx += `
        <time>${segmentTime.toISOString()}</time>`;
      }
      
      gpx += `
      </trkpt>`;
    });
  }

  gpx += `
    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

/**
 * Convert points array to GPX format
 */
export function pointsToGPX(
  points: GPXPoint[],
  options: ExportOptions
): string {
  const timestamp = new Date().toISOString();
  
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Wheels & Wins Trip Planner"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXML(options.name)}</name>
    ${options.description ? `<desc>${escapeXML(options.description)}</desc>` : ''}
    ${options.author ? `<author><name>${escapeXML(options.author)}</name></author>` : ''}
    <time>${timestamp}</time>
  </metadata>
  <trk>
    <name>${escapeXML(options.name)}</name>
    <trkseg>`;

  points.forEach(point => {
    gpx += `
      <trkpt lat="${point.lat}" lon="${point.lon}">`;
    
    if (point.ele !== undefined) {
      gpx += `
        <ele>${point.ele}</ele>`;
    }
    
    if (point.time) {
      gpx += `
        <time>${point.time}</time>`;
    }
    
    gpx += `
      </trkpt>`;
  });

  gpx += `
    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

/**
 * Download GPX file
 */
export function downloadGPX(gpxContent: string, filename: string) {
  const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename.endsWith('.gpx') ? filename : `${filename}.gpx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Export route as GPX and download
 */
export function exportRouteAsGPX(
  route: any,
  waypoints: Array<{ name: string; coords: [number, number] }>,
  tripName: string
) {
  const gpxContent = routeToGPX(route, waypoints, {
    name: tripName,
    description: `RV trip route exported from Wheels & Wins`,
    author: 'Wheels & Wins User',
    includeTimestamps: false,
    includeElevation: false
  });
  
  const filename = `${tripName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_route.gpx`;
  downloadGPX(gpxContent, filename);
}

/**
 * Escape XML special characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}