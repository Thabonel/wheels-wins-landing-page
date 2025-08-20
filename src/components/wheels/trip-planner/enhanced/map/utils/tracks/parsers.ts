/**
 * GPX Parser for importing track files
 */

export interface GPXPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
}

export interface GPXTrack {
  name: string;
  description?: string;
  points: GPXPoint[];
  totalDistance?: number;
  totalElevationGain?: number;
  bounds?: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
}

/**
 * Parse GPX XML string to extract track data
 */
export function parseGPX(gpxContent: string): GPXTrack {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxContent, 'text/xml');
  
  // Check for parsing errors
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid GPX file');
  }
  
  // Extract track name
  const nameElement = doc.querySelector('trk > name');
  const name = nameElement?.textContent || 'Imported Track';
  
  // Extract description
  const descElement = doc.querySelector('trk > desc');
  const description = descElement?.textContent || undefined;
  
  // Extract track points
  const trackPoints = doc.querySelectorAll('trkpt');
  const points: GPXPoint[] = [];
  
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  
  trackPoints.forEach((point) => {
    const lat = parseFloat(point.getAttribute('lat') || '0');
    const lon = parseFloat(point.getAttribute('lon') || '0');
    
    // Update bounds
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    
    // Extract elevation if available
    const eleElement = point.querySelector('ele');
    const ele = eleElement ? parseFloat(eleElement.textContent || '0') : undefined;
    
    // Extract time if available
    const timeElement = point.querySelector('time');
    const time = timeElement?.textContent || undefined;
    
    points.push({ lat, lon, ele, time });
  });
  
  // Calculate total distance and elevation gain
  let totalDistance = 0;
  let totalElevationGain = 0;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    
    // Calculate distance using Haversine formula
    totalDistance += calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
    
    // Calculate elevation gain
    if (prev.ele !== undefined && curr.ele !== undefined) {
      const elevDiff = curr.ele - prev.ele;
      if (elevDiff > 0) {
        totalElevationGain += elevDiff;
      }
    }
  }
  
  return {
    name,
    description,
    points,
    totalDistance,
    totalElevationGain,
    bounds: {
      minLat,
      maxLat,
      minLon,
      maxLon
    }
  };
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance * 0.621371; // Convert to miles
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Parse multiple GPX files
 */
export function parseMultipleGPX(files: File[]): Promise<GPXTrack[]> {
  const promises = files.map(file => {
    return new Promise<GPXTrack>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const track = parseGPX(content);
          resolve(track);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  });
  
  return Promise.all(promises);
}

/**
 * Validate GPX file
 */
export function validateGPXFile(file: File): boolean {
  // Check file extension
  if (!file.name.toLowerCase().endsWith('.gpx')) {
    return false;
  }
  
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return false;
  }
  
  return true;
}