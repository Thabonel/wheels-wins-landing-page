import mapboxgl from 'mapbox-gl';

export interface MarkerOptions {
  color?: string;
  draggable?: boolean;
  popup?: {
    text: string;
    offset?: number;
  };
}

/**
 * Creates a custom marker element for RV-specific POIs
 */
export function createCustomMarkerElement(type: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `marker-${type}`;
  
  const iconMap: { [key: string]: string } = {
    'rv_park': '🏕️',
    'fuel': '⛽',
    'dump_station': '🚽',
    'propane': '🔥',
    'groceries': '🛒',
    'rest_area': '🛑',
    'repair': '🔧',
    'hospital': '🏥',
    'scenic': '📸',
    'camping': '⛺'
  };
  
  el.innerHTML = `
    <div style="
      width: 35px;
      height: 35px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      font-size: 18px;
      cursor: pointer;
      transition: transform 0.2s;
    " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
      ${iconMap[type] || '📍'}
    </div>
  `;
  
  return el;
}

/**
 * Adds a marker to the map
 */
export function addMarker(
  map: mapboxgl.Map,
  coords: [number, number],
  options: MarkerOptions = {}
): mapboxgl.Marker {
  const marker = new mapboxgl.Marker({
    color: options.color || '#3b82f6',
    draggable: options.draggable || false
  })
    .setLngLat(coords)
    .addTo(map);
  
  if (options.popup) {
    const popup = new mapboxgl.Popup({ 
      offset: options.popup.offset || 25 
    })
      .setHTML(options.popup.text);
    
    marker.setPopup(popup);
  }
  
  return marker;
}

/**
 * Adds start and end markers for a route
 */
export function addRouteMarkers(
  map: mapboxgl.Map,
  start: { coords: [number, number]; name: string },
  end: { coords: [number, number]; name: string }
): { startMarker: mapboxgl.Marker; endMarker: mapboxgl.Marker } {
  // Create start marker (green)
  const startEl = document.createElement('div');
  startEl.innerHTML = `
    <div style="
      width: 40px;
      height: 40px;
      background: #10b981;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 16px;
      cursor: pointer;
    ">A</div>
  `;
  
  const startMarker = new mapboxgl.Marker(startEl)
    .setLngLat(start.coords)
    .setPopup(
      new mapboxgl.Popup({ offset: 25 })
        .setHTML(`<div style="font-weight: bold;">Start</div><div>${start.name}</div>`)
    )
    .addTo(map);
  
  // Create end marker (red)
  const endEl = document.createElement('div');
  endEl.innerHTML = `
    <div style="
      width: 40px;
      height: 40px;
      background: #ef4444;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 16px;
      cursor: pointer;
    ">B</div>
  `;
  
  const endMarker = new mapboxgl.Marker(endEl)
    .setLngLat(end.coords)
    .setPopup(
      new mapboxgl.Popup({ offset: 25 })
        .setHTML(`<div style="font-weight: bold;">Destination</div><div>${end.name}</div>`)
    )
    .addTo(map);
  
  return { startMarker, endMarker };
}

/**
 * Adds POI markers based on type
 */
export function addPOIMarkers(
  map: mapboxgl.Map,
  pois: Array<{
    coords: [number, number];
    name: string;
    type: string;
    description?: string;
  }>
): mapboxgl.Marker[] {
  return pois.map(poi => {
    const el = createCustomMarkerElement(poi.type);
    
    const popupContent = `
      <div style="padding: 8px;">
        <div style="font-weight: bold; margin-bottom: 4px;">${poi.name}</div>
        ${poi.description ? `<div style="font-size: 12px; color: #666;">${poi.description}</div>` : ''}
      </div>
    `;
    
    const marker = new mapboxgl.Marker(el)
      .setLngLat(poi.coords)
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML(popupContent)
      )
      .addTo(map);
    
    return marker;
  });
}

/**
 * Clears all markers from the map
 */
export function clearMarkers(map: mapboxgl.Map) {
  const markers = document.querySelectorAll('.mapboxgl-marker');
  markers.forEach(marker => marker.remove());
}

/**
 * Creates a draggable waypoint marker
 */
export function createDraggableWaypoint(
  map: mapboxgl.Map,
  coords: [number, number],
  index: number,
  onDragEnd: (coords: [number, number]) => void
): mapboxgl.Marker {
  const el = document.createElement('div');
  el.innerHTML = `
    <div style="
      width: 30px;
      height: 30px;
      background: #3b82f6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      cursor: move;
    ">${index + 1}</div>
  `;
  
  const marker = new mapboxgl.Marker(el, { draggable: true })
    .setLngLat(coords)
    .addTo(map);
  
  marker.on('dragend', () => {
    const lngLat = marker.getLngLat();
    onDragEnd([lngLat.lng, lngLat.lat]);
  });
  
  return marker;
}