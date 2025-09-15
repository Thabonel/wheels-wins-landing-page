/**
 * Navigation Export Service
 * Comprehensive system for exporting trips to various GPS apps and devices
 */

export interface Waypoint {
  coordinates: [number, number]; // [longitude, latitude]
  name?: string;
  address?: string;
}

export interface RouteExport {
  origin: Waypoint;
  destination: Waypoint;
  waypoints: Waypoint[];
  metadata: {
    totalDistance?: number;
    estimatedTime?: number;
    tripName?: string;
    createdBy?: string;
  };
}

export interface ExportOptions {
  app: 'google' | 'apple' | 'waze' | 'here' | 'mapsme' | 'garmin' | 'gaia' | 'komoot' | 'osmand' | 'tomtom' | 'file';
  format: 'url' | 'gpx' | 'kml' | 'csv' | 'geojson';
  scope: 'full' | 'daily' | 'waypoints';
  dayIndex?: number;
}

export interface NavigationApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'mobile' | 'gps' | 'file';
  platforms: ('ios' | 'android' | 'web' | 'desktop')[];
  deepLinkSupport: boolean;
  fileFormats?: string[];
}

// Navigation app database
export const NAVIGATION_APPS: NavigationApp[] = [
  // Mobile Apps
  {
    id: 'google',
    name: 'Google Maps',
    description: 'World\'s most popular navigation app',
    icon: '🗺️',
    category: 'mobile',
    platforms: ['ios', 'android', 'web'],
    deepLinkSupport: true
  },
  {
    id: 'apple',
    name: 'Apple Maps',
    description: 'Native iOS navigation with privacy focus',
    icon: '🍎',
    category: 'mobile',
    platforms: ['ios'],
    deepLinkSupport: true
  },
  {
    id: 'waze',
    name: 'Waze',
    description: 'Community-driven navigation with live traffic',
    icon: '🚗',
    category: 'mobile',
    platforms: ['ios', 'android', 'web'],
    deepLinkSupport: true
  },
  {
    id: 'here',
    name: 'HERE WeGo',
    description: 'Offline maps and navigation',
    icon: '📍',
    category: 'mobile',
    platforms: ['ios', 'android', 'web'],
    deepLinkSupport: true
  },
  {
    id: 'mapsme',
    name: 'Maps.me',
    description: 'Offline maps for travelers',
    icon: '🗾',
    category: 'mobile',
    platforms: ['ios', 'android'],
    deepLinkSupport: true
  },

  // GPS Devices & Specialized Apps
  {
    id: 'garmin',
    name: 'Garmin',
    description: 'Professional GPS devices',
    icon: '📡',
    category: 'gps',
    platforms: ['desktop'],
    deepLinkSupport: false,
    fileFormats: ['gpx']
  },
  {
    id: 'gaia',
    name: 'Gaia GPS',
    description: 'Outdoor navigation and mapping',
    icon: '🏔️',
    category: 'gps',
    platforms: ['ios', 'android', 'web'],
    deepLinkSupport: false,
    fileFormats: ['gpx', 'kml']
  },
  {
    id: 'komoot',
    name: 'Komoot',
    description: 'Outdoor adventure planning',
    icon: '🚴',
    category: 'gps',
    platforms: ['ios', 'android', 'web'],
    deepLinkSupport: false,
    fileFormats: ['gpx']
  },
  {
    id: 'osmand',
    name: 'OsmAnd',
    description: 'Open source offline maps',
    icon: '🗺️',
    category: 'gps',
    platforms: ['ios', 'android'],
    deepLinkSupport: false,
    fileFormats: ['gpx']
  },
  {
    id: 'tomtom',
    name: 'TomTom',
    description: 'Professional navigation systems',
    icon: '📱',
    category: 'gps',
    platforms: ['ios', 'android', 'desktop'],
    deepLinkSupport: false,
    fileFormats: ['gpx', 'itn']
  },

  // Popular GPS Device Brands for 2025
  {
    id: 'navman',
    name: 'Navman',
    description: 'Australian GPS navigation specialist',
    icon: '🇦🇺',
    category: 'gps',
    platforms: ['desktop'],
    deepLinkSupport: false,
    fileFormats: ['gpx']
  },
  {
    id: 'hema',
    name: 'Hema Navigator',
    description: 'Australian off-road GPS mapping',
    icon: '🏞️',
    category: 'gps',
    platforms: ['ios', 'android', 'desktop'],
    deepLinkSupport: false,
    fileFormats: ['gpx', 'kml']
  },
  {
    id: 'vms4x4',
    name: 'VMS 4x4',
    description: 'Vehicle monitoring and tracking',
    icon: '🚙',
    category: 'gps',
    platforms: ['web', 'ios', 'android'],
    deepLinkSupport: false,
    fileFormats: ['gpx']
  },
  {
    id: 'family1st',
    name: 'Family1st',
    description: 'Family GPS tracking devices',
    icon: '👨‍👩‍👧‍👦',
    category: 'gps',
    platforms: ['web', 'ios', 'android'],
    deepLinkSupport: false,
    fileFormats: ['gpx']
  },
  {
    id: 'tkstar',
    name: 'TKStar',
    description: 'GPS tracking solutions',
    icon: '⭐',
    category: 'gps',
    platforms: ['web', 'android'],
    deepLinkSupport: false,
    fileFormats: ['gpx']
  },
  {
    id: 'itrack',
    name: 'iTrack',
    description: 'Real-time GPS tracking',
    icon: '📍',
    category: 'gps',
    platforms: ['web', 'ios', 'android'],
    deepLinkSupport: false,
    fileFormats: ['gpx']
  },
  {
    id: 'sinotrack',
    name: 'SinoTrack',
    description: 'Professional GPS tracking',
    icon: '🛰️',
    category: 'gps',
    platforms: ['web', 'android'],
    deepLinkSupport: false,
    fileFormats: ['gpx']
  },
  {
    id: 'queclink',
    name: 'Queclink',
    description: 'IoT and GPS tracking solutions',
    icon: '📡',
    category: 'gps',
    platforms: ['web'],
    deepLinkSupport: false,
    fileFormats: ['gpx']
  },
  {
    id: 'xgps',
    name: 'X-GPS',
    description: 'GPS navigation and tracking',
    icon: '❌',
    category: 'gps',
    platforms: ['desktop', 'android'],
    deepLinkSupport: false,
    fileFormats: ['gpx']
  },
  {
    id: 'amcrest',
    name: 'Amcrest',
    description: 'Security and GPS tracking',
    icon: '🔒',
    category: 'gps',
    platforms: ['web', 'ios', 'android'],
    deepLinkSupport: false,
    fileFormats: ['gpx']
  },

  // Smart Tags & Tracking
  {
    id: 'airtag',
    name: 'Apple AirTag',
    description: 'Find My network tracking',
    icon: '🏷️',
    category: 'gps',
    platforms: ['ios'],
    deepLinkSupport: false,
    fileFormats: ['gpx']
  },
  {
    id: 'smarttag',
    name: 'Samsung SmartTag',
    description: 'Galaxy Find network tracking',
    icon: '🔍',
    category: 'gps',
    platforms: ['android'],
    deepLinkSupport: false,
    fileFormats: ['gpx']
  },
  {
    id: 'tile',
    name: 'Tile Tracker',
    description: 'Bluetooth tracking network',
    icon: '🔲',
    category: 'gps',
    platforms: ['ios', 'android'],
    deepLinkSupport: false,
    fileFormats: ['gpx']
  },

  // File Downloads
  {
    id: 'file',
    name: 'Download Files',
    description: 'Export in various file formats',
    icon: '📁',
    category: 'file',
    platforms: ['web', 'desktop'],
    deepLinkSupport: false,
    fileFormats: ['gpx', 'kml', 'geojson', 'csv']
  }
];

/**
 * Platform detection utilities
 */
export const detectPlatform = (): 'ios' | 'android' | 'web' => {
  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  } else if (/android/.test(userAgent)) {
    return 'android';
  }
  return 'web';
};

export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Deep link generators for mobile apps
 */
export const generateGoogleMapsUrl = (route: RouteExport): string => {
  const origin = `${route.origin.coordinates[1]},${route.origin.coordinates[0]}`;
  const destination = `${route.destination.coordinates[1]},${route.destination.coordinates[0]}`;

  // Include intermediate waypoints
  const waypoints = route.waypoints.slice(1, -1).map(wp =>
    `${wp.coordinates[1]},${wp.coordinates[0]}`
  ).join('|');

  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: 'driving'
  });

  if (waypoints) {
    params.append('waypoints', waypoints);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

export const generateAppleMapsUrl = (route: RouteExport): string => {
  const origin = `${route.origin.coordinates[1]},${route.origin.coordinates[0]}`;
  const destination = `${route.destination.coordinates[1]},${route.destination.coordinates[0]}`;

  const params = new URLSearchParams({
    saddr: origin,
    daddr: destination,
    dirflg: 'd' // driving directions
  });

  return `http://maps.apple.com/?${params.toString()}`;
};

export const generateWazeUrl = (route: RouteExport): string => {
  // Waze works better with origin and destination for full route planning
  const origin = route.origin.coordinates;
  const destination = route.destination.coordinates;

  const params = new URLSearchParams({
    from: `${origin[1]},${origin[0]}`,
    to: `${destination[1]},${destination[0]}`,
    navigate: 'yes'
  });

  return `https://waze.com/ul?${params.toString()}`;
};

export const generateHereUrl = (route: RouteExport): string => {
  // HERE WeGo supports waypoints in URL
  const waypoints = [route.origin, ...route.waypoints.slice(1, -1), route.destination];
  const coordinates = waypoints.map(wp => `${wp.coordinates[1]},${wp.coordinates[0]}`).join('/');

  return `https://share.here.com/r/${coordinates}`;
};

export const generateMapsMeUrl = (route: RouteExport): string => {
  const destination = route.destination.coordinates;

  const params = new URLSearchParams({
    sll: `${destination[1]},${destination[0]}`,
    dll: `${destination[1]},${destination[0]}`
  });

  return `mapsme://route?${params.toString()}`;
};

/**
 * File format generators
 */
export const generateGPX = (route: RouteExport): string => {
  const waypoints = [route.origin, ...route.waypoints.slice(1, -1), route.destination];

  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Wheels & Wins" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${route.metadata.tripName || 'RV Trip Route'}</name>
    <desc>Generated by Wheels & Wins RV Trip Planner</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
`;

  // Add waypoints
  waypoints.forEach((waypoint, index) => {
    const name = waypoint.name || `Waypoint ${index + 1}`;
    gpx += `  <wpt lat="${waypoint.coordinates[1]}" lon="${waypoint.coordinates[0]}">
    <name>${escapeXml(name)}</name>
    <desc>${escapeXml(waypoint.address || name)}</desc>
  </wpt>
`;
  });

  // Add route
  gpx += `  <rte>
    <name>${route.metadata.tripName || 'RV Trip Route'}</name>
`;

  waypoints.forEach((waypoint, index) => {
    const name = waypoint.name || `Waypoint ${index + 1}`;
    gpx += `    <rtept lat="${waypoint.coordinates[1]}" lon="${waypoint.coordinates[0]}">
      <name>${escapeXml(name)}</name>
    </rtept>
`;
  });

  gpx += `  </rte>
</gpx>`;

  return gpx;
};

export const generateKML = (route: RouteExport): string => {
  const waypoints = [route.origin, ...route.waypoints.slice(1, -1), route.destination];

  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${route.metadata.tripName || 'RV Trip Route'}</name>
    <description>Generated by Wheels & Wins RV Trip Planner</description>
`;

  // Add waypoints as placemarks
  waypoints.forEach((waypoint, index) => {
    const name = waypoint.name || `Waypoint ${index + 1}`;
    kml += `    <Placemark>
      <name>${escapeXml(name)}</name>
      <description>${escapeXml(waypoint.address || name)}</description>
      <Point>
        <coordinates>${waypoint.coordinates[0]},${waypoint.coordinates[1]},0</coordinates>
      </Point>
    </Placemark>
`;
  });

  // Add route as LineString
  const coordinates = waypoints.map(wp => `${wp.coordinates[0]},${wp.coordinates[1]},0`).join(' ');
  kml += `    <Placemark>
      <name>Route</name>
      <LineString>
        <coordinates>${coordinates}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

  return kml;
};

export const generateGeoJSON = (route: RouteExport): string => {
  const waypoints = [route.origin, ...route.waypoints.slice(1, -1), route.destination];

  const features = waypoints.map((waypoint, index) => ({
    type: 'Feature',
    properties: {
      name: waypoint.name || `Waypoint ${index + 1}`,
      address: waypoint.address,
      index
    },
    geometry: {
      type: 'Point',
      coordinates: waypoint.coordinates
    }
  }));

  // Add route line
  features.push({
    type: 'Feature',
    properties: {
      name: 'Route',
      tripName: route.metadata.tripName,
      distance: route.metadata.totalDistance,
      estimatedTime: route.metadata.estimatedTime
    },
    geometry: {
      type: 'LineString',
      coordinates: waypoints.map(wp => wp.coordinates)
    }
  });

  const geoJSON = {
    type: 'FeatureCollection',
    features
  };

  return JSON.stringify(geoJSON, null, 2);
};

export const generateCSV = (route: RouteExport): string => {
  const waypoints = [route.origin, ...route.waypoints.slice(1, -1), route.destination];

  let csv = 'Name,Latitude,Longitude,Address\n';

  waypoints.forEach((waypoint, index) => {
    const name = (waypoint.name || `Waypoint ${index + 1}`).replace(/"/g, '""');
    const address = (waypoint.address || '').replace(/"/g, '""');
    csv += `"${name}",${waypoint.coordinates[1]},${waypoint.coordinates[0]},"${address}"\n`;
  });

  return csv;
};

/**
 * Utility functions
 */
const escapeXml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Download file helper
 */
export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/**
 * Main export function
 */
export const exportRoute = async (route: RouteExport, options: ExportOptions): Promise<void> => {
  const platform = detectPlatform();

  try {
    switch (options.app) {
      case 'google':
        const googleUrl = generateGoogleMapsUrl(route);
        window.open(googleUrl, '_blank');
        break;

      case 'apple':
        if (platform === 'ios') {
          const appleUrl = generateAppleMapsUrl(route);
          window.location.href = appleUrl;
        } else {
          throw new Error('Apple Maps is only available on iOS devices');
        }
        break;

      case 'waze':
        const wazeUrl = generateWazeUrl(route);
        window.open(wazeUrl, '_blank');
        break;

      case 'here':
        const hereUrl = generateHereUrl(route);
        window.open(hereUrl, '_blank');
        break;

      case 'mapsme':
        if (isMobile()) {
          const mapsMeUrl = generateMapsMeUrl(route);
          window.location.href = mapsMeUrl;
        } else {
          throw new Error('Maps.me is only available on mobile devices');
        }
        break;

      case 'file':
        await handleFileExport(route, options.format);
        break;

      default:
        // For GPS devices, export as GPX
        await handleFileExport(route, 'gpx');
        break;
    }
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};

const handleFileExport = async (route: RouteExport, format: string): Promise<void> => {
  const tripName = route.metadata.tripName || 'rv-trip';
  const safeFilename = tripName.replace(/[^a-z0-9]/gi, '-').toLowerCase();

  switch (format) {
    case 'gpx':
      const gpx = generateGPX(route);
      downloadFile(gpx, `${safeFilename}.gpx`, 'application/gpx+xml');
      break;

    case 'kml':
      const kml = generateKML(route);
      downloadFile(kml, `${safeFilename}.kml`, 'application/vnd.google-earth.kml+xml');
      break;

    case 'geojson':
      const geoJSON = generateGeoJSON(route);
      downloadFile(geoJSON, `${safeFilename}.geojson`, 'application/geo+json');
      break;

    case 'csv':
      const csv = generateCSV(route);
      downloadFile(csv, `${safeFilename}.csv`, 'text/csv');
      break;

    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
};

/**
 * Convert trip data to RouteExport format
 */
export const convertTripToRoute = (tripData: any): RouteExport => {
  const waypoints = tripData.waypoints || [];

  if (waypoints.length < 2) {
    throw new Error('Route must have at least 2 waypoints');
  }

  return {
    origin: waypoints[0],
    destination: waypoints[waypoints.length - 1],
    waypoints: waypoints,
    metadata: {
      totalDistance: tripData.distance,
      estimatedTime: tripData.duration,
      tripName: tripData.tripName || `${waypoints[0]?.name || 'Start'} to ${waypoints[waypoints.length - 1]?.name || 'End'}`,
      createdBy: tripData.createdBy
    }
  };
};