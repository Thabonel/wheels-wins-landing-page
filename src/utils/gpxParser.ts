/**
 * GPX (GPS Exchange Format) Parser Utilities
 * Handles parsing and converting GPX files for route planning
 */

export interface GPXWaypoint {
  lat: number;
  lon: number;
  ele?: number; // elevation
  time?: string;
  name?: string;
  desc?: string;
  sym?: string; // symbol
}

export interface GPXTrackPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
}

export interface GPXTrackSegment {
  points: GPXTrackPoint[];
}

export interface GPXTrack {
  name?: string;
  desc?: string;
  segments: GPXTrackSegment[];
}

export interface GPXRoute {
  name?: string;
  desc?: string;
  points: GPXWaypoint[];
}

export interface GPXData {
  waypoints: GPXWaypoint[];
  tracks: GPXTrack[];
  routes: GPXRoute[];
  metadata?: {
    name?: string;
    desc?: string;
    author?: string;
    time?: string;
  };
}

/**
 * Parse GPX XML string into structured data
 * @param gpxString GPX XML content as string
 * @returns Parsed GPX data
 */
export function parseGPX(gpxString: string): GPXData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxString, 'text/xml');
  
  // Check for parsing errors
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid GPX file: ' + parserError.textContent);
  }
  
  const gpx = doc.documentElement;
  
  // Parse metadata
  const metadataElement = gpx.querySelector('metadata');
  const metadata = metadataElement ? {
    name: metadataElement.querySelector('name')?.textContent || undefined,
    desc: metadataElement.querySelector('desc')?.textContent || undefined,
    author: metadataElement.querySelector('author name')?.textContent || undefined,
    time: metadataElement.querySelector('time')?.textContent || undefined,
  } : undefined;
  
  // Parse waypoints
  const waypoints: GPXWaypoint[] = [];
  const waypointElements = gpx.querySelectorAll('wpt');
  waypointElements.forEach(wpt => {
    const lat = parseFloat(wpt.getAttribute('lat') || '0');
    const lon = parseFloat(wpt.getAttribute('lon') || '0');
    
    waypoints.push({
      lat,
      lon,
      ele: parseFloatOrUndefined(wpt.querySelector('ele')?.textContent),
      time: wpt.querySelector('time')?.textContent || undefined,
      name: wpt.querySelector('name')?.textContent || undefined,
      desc: wpt.querySelector('desc')?.textContent || undefined,
      sym: wpt.querySelector('sym')?.textContent || undefined,
    });
  });
  
  // Parse tracks
  const tracks: GPXTrack[] = [];
  const trackElements = gpx.querySelectorAll('trk');
  trackElements.forEach(trk => {
    const track: GPXTrack = {
      name: trk.querySelector('name')?.textContent || undefined,
      desc: trk.querySelector('desc')?.textContent || undefined,
      segments: []
    };
    
    const segmentElements = trk.querySelectorAll('trkseg');
    segmentElements.forEach(seg => {
      const segment: GPXTrackSegment = { points: [] };
      
      const pointElements = seg.querySelectorAll('trkpt');
      pointElements.forEach(pt => {
        const lat = parseFloat(pt.getAttribute('lat') || '0');
        const lon = parseFloat(pt.getAttribute('lon') || '0');
        
        segment.points.push({
          lat,
          lon,
          ele: parseFloatOrUndefined(pt.querySelector('ele')?.textContent),
          time: pt.querySelector('time')?.textContent || undefined,
        });
      });
      
      if (segment.points.length > 0) {
        track.segments.push(segment);
      }
    });
    
    if (track.segments.length > 0) {
      tracks.push(track);
    }
  });
  
  // Parse routes
  const routes: GPXRoute[] = [];
  const routeElements = gpx.querySelectorAll('rte');
  routeElements.forEach(rte => {
    const route: GPXRoute = {
      name: rte.querySelector('name')?.textContent || undefined,
      desc: rte.querySelector('desc')?.textContent || undefined,
      points: []
    };
    
    const pointElements = rte.querySelectorAll('rtept');
    pointElements.forEach(pt => {
      const lat = parseFloat(pt.getAttribute('lat') || '0');
      const lon = parseFloat(pt.getAttribute('lon') || '0');
      
      route.points.push({
        lat,
        lon,
        ele: parseFloatOrUndefined(pt.querySelector('ele')?.textContent),
        time: pt.querySelector('time')?.textContent || undefined,
        name: pt.querySelector('name')?.textContent || undefined,
        desc: pt.querySelector('desc')?.textContent || undefined,
      });
    });
    
    if (route.points.length > 0) {
      routes.push(route);
    }
  });
  
  return {
    waypoints,
    tracks,
    routes,
    metadata
  };
}

/**
 * Convert GPX track to GeoJSON LineString
 * @param track GPX track data
 * @returns GeoJSON feature
 */
export function trackToGeoJSON(track: GPXTrack): any {
  const coordinates: number[][] = [];
  
  track.segments.forEach(segment => {
    segment.points.forEach(point => {
      // GeoJSON uses [longitude, latitude] order
      coordinates.push([point.lon, point.lat]);
    });
  });
  
  return {
    type: 'Feature',
    properties: {
      name: track.name,
      description: track.desc
    },
    geometry: {
      type: 'LineString',
      coordinates
    }
  };
}

/**
 * Convert GPX route to GeoJSON LineString
 * @param route GPX route data
 * @returns GeoJSON feature
 */
export function routeToGeoJSON(route: GPXRoute): any {
  const coordinates = route.points.map(point => [point.lon, point.lat]);
  
  return {
    type: 'Feature',
    properties: {
      name: route.name,
      description: route.desc
    },
    geometry: {
      type: 'LineString',
      coordinates
    }
  };
}

/**
 * Convert GPX waypoints to GeoJSON Point features
 * @param waypoints Array of GPX waypoints
 * @returns GeoJSON FeatureCollection
 */
export function waypointsToGeoJSON(waypoints: GPXWaypoint[]): any {
  const features = waypoints.map(waypoint => ({
    type: 'Feature',
    properties: {
      name: waypoint.name,
      description: waypoint.desc,
      elevation: waypoint.ele,
      time: waypoint.time,
      symbol: waypoint.sym
    },
    geometry: {
      type: 'Point',
      coordinates: [waypoint.lon, waypoint.lat]
    }
  }));
  
  return {
    type: 'FeatureCollection',
    features
  };
}

/**
 * Generate GPX XML string from waypoints
 * @param waypoints Array of waypoints with coordinates
 * @param metadata Optional metadata for the GPX file
 * @returns GPX XML string
 */
export function generateGPX(
  waypoints: Array<{ coordinates: [number, number]; name?: string; description?: string }>,
  metadata?: { name?: string; description?: string; author?: string }
): string {
  const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Wheels & Wins Trip Planner"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">`;
  
  let gpxContent = gpxHeader;
  
  // Add metadata if provided
  if (metadata) {
    gpxContent += '\n  <metadata>';
    if (metadata.name) gpxContent += `\n    <name>${escapeXml(metadata.name)}</name>`;
    if (metadata.description) gpxContent += `\n    <desc>${escapeXml(metadata.description)}</desc>`;
    if (metadata.author) {
      gpxContent += `\n    <author>\n      <name>${escapeXml(metadata.author)}</name>\n    </author>`;
    }
    gpxContent += '\n    <time>' + new Date().toISOString() + '</time>';
    gpxContent += '\n  </metadata>';
  }
  
  // Add route with waypoints
  if (waypoints.length > 0) {
    gpxContent += '\n  <rte>';
    if (metadata?.name) gpxContent += `\n    <name>${escapeXml(metadata.name)}</name>`;
    if (metadata?.description) gpxContent += `\n    <desc>${escapeXml(metadata.description)}</desc>`;
    
    waypoints.forEach((waypoint, index) => {
      gpxContent += `\n    <rtept lat="${waypoint.coordinates[1]}" lon="${waypoint.coordinates[0]}">`;
      gpxContent += `\n      <name>${escapeXml(waypoint.name || `Waypoint ${index + 1}`)}</name>`;
      if (waypoint.description) {
        gpxContent += `\n      <desc>${escapeXml(waypoint.description)}</desc>`;
      }
      gpxContent += '\n    </rtept>';
    });
    
    gpxContent += '\n  </rte>';
  }
  
  // Also add as individual waypoints for better compatibility
  waypoints.forEach((waypoint, index) => {
    gpxContent += `\n  <wpt lat="${waypoint.coordinates[1]}" lon="${waypoint.coordinates[0]}">`;
    gpxContent += `\n    <name>${escapeXml(waypoint.name || `Waypoint ${index + 1}`)}</name>`;
    if (waypoint.description) {
      gpxContent += `\n    <desc>${escapeXml(waypoint.description)}</desc>`;
    }
    gpxContent += '\n  </wpt>';
  });
  
  gpxContent += '\n</gpx>';
  
  return gpxContent;
}

/**
 * Helper function to parse float or return undefined
 */
function parseFloatOrUndefined(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}