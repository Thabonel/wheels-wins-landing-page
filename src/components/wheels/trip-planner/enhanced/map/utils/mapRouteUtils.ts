import mapboxgl from 'mapbox-gl';

// Set Mapbox access token
const token = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
if (token) {
  mapboxgl.accessToken = token;
}

interface RouteOptions {
  waypoints?: Array<[number, number]>;
  profile?: 'driving' | 'driving-traffic' | 'walking' | 'cycling';
  alternatives?: boolean;
  overview?: 'full' | 'simplified' | 'false';
}

/**
 * Fetches a route from Mapbox Directions API
 */
export async function fetchRoute(
  start: [number, number],
  end: [number, number],
  options: RouteOptions = {}
): Promise<any> {
  const {
    waypoints = [],
    profile = 'driving',
    alternatives = false,
    overview = 'full'
  } = options;

  // Build coordinates string
  const coordinates = [start, ...waypoints, end]
    .map(coord => coord.join(','))
    .join(';');

  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?` +
    `geometries=geojson&overview=${overview}&alternatives=${alternatives}&access_token=${mapboxgl.accessToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      return data.routes[0];
    }
    throw new Error('No route found');
  } catch (error) {
    console.error('Error fetching route:', error);
    throw error;
  }
}

/**
 * Adds a route to the map
 */
export function addRouteToMap(map: mapboxgl.Map, route: any) {
  const routeId = 'route';
  
  // Remove existing route if present
  if (map.getSource(routeId)) {
    map.removeLayer(routeId);
    map.removeSource(routeId);
  }

  // Add the route as a new source
  map.addSource(routeId, {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: route.geometry
    }
  });

  // Add the route layer
  map.addLayer({
    id: routeId,
    type: 'line',
    source: routeId,
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#3b82f6', // Blue color for RV routes
      'line-width': 5,
      'line-opacity': 0.75
    }
  });
}

/**
 * Adds waypoint markers to the map
 */
export function addWaypointMarkers(
  map: mapboxgl.Map,
  waypoints: Array<{ coords: [number, number]; name?: string }>
) {
  // Clear existing markers
  const markers = document.querySelectorAll('.mapboxgl-marker');
  markers.forEach(marker => marker.remove());

  waypoints.forEach((waypoint, index) => {
    const el = document.createElement('div');
    el.className = 'waypoint-marker';
    el.style.width = '30px';
    el.style.height = '30px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = index === 0 ? '#10b981' : index === waypoints.length - 1 ? '#ef4444' : '#3b82f6';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    el.style.cursor = 'pointer';

    const marker = new mapboxgl.Marker(el)
      .setLngLat(waypoint.coords)
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML(`<h3>${waypoint.name || `Waypoint ${index + 1}`}</h3>`)
      )
      .addTo(map);
  });
}

/**
 * Calculates the bounds for a route to fit in view
 */
export function getRouteBounds(route: any): mapboxgl.LngLatBounds {
  const bounds = new mapboxgl.LngLatBounds();
  
  if (route.geometry && route.geometry.coordinates) {
    route.geometry.coordinates.forEach((coord: [number, number]) => {
      bounds.extend(coord);
    });
  }
  
  return bounds;
}

/**
 * Fits the map view to show the entire route
 */
export function fitMapToRoute(map: mapboxgl.Map, route: any, padding = 50) {
  const bounds = getRouteBounds(route);
  
  map.fitBounds(bounds, {
    padding: {
      top: padding,
      right: padding,
      bottom: padding,
      left: padding
    }
  });
}

/**
 * Geocodes a location string to coordinates
 */
export async function geocodeLocation(location: string): Promise<[number, number] | null> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxgl.accessToken}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      return data.features[0].center as [number, number];
    }
    return null;
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
}

/**
 * Formats route distance and duration
 */
export function formatRouteInfo(route: any) {
  const distance = route.distance ? (route.distance / 1609.34).toFixed(1) : '0';
  const duration = route.duration ? Math.round(route.duration / 60) : 0;
  
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  
  const durationText = hours > 0 
    ? `${hours}h ${minutes}min`
    : `${minutes}min`;
  
  return {
    distance: `${distance} miles`,
    duration: durationText,
    distanceValue: parseFloat(distance),
    durationValue: duration
  };
}