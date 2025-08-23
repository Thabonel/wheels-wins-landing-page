# Map Component Documentation

## Overview

The map component in Wheels & Wins is built using Mapbox GL JS and provides comprehensive trip planning functionality with route management, waypoint handling, and various map overlays. The main component is `MapControls` which serves as the primary interface for all map interactions.

## Architecture

### Component Hierarchy

```
IntegratedTripPlanner
├── MapControls (Main map container)
│   ├── mapboxgl.Map (Core Mapbox instance)
│   ├── MapboxDirections (Route planning control)
│   ├── MapOptionsControl (Style and POI filters)
│   ├── POILayer (Points of Interest overlay)
│   └── Native Mapbox Controls
│       ├── NavigationControl (Zoom/Compass)
│       ├── GeolocateControl (User location)
│       ├── FullscreenControl
│       └── ScaleControl
└── PamVoiceCompanion (Voice assistant - to be simplified)
```

### File Structure

```
src/components/wheels/trip-planner/
├── MapControls.tsx           # Main map component
├── MapOptionsControl.ts      # Custom map options control
├── MapOptionsDropdown.tsx    # React dropdown for map options
├── POILayer.tsx             # Points of Interest overlay
├── types.ts                 # TypeScript interfaces
├── constants.ts             # Region centers and modes
├── utils.ts                 # Helper functions
└── IntegratedTripPlanner.tsx # Parent component
```

## Map Container Structure

The map is rendered with the following DOM structure:

```html
<div className="w-full h-[60vh] lg:h-[70vh] relative">
  <div className="overflow-hidden rounded-lg border h-full">
    <div ref={mapContainer} className="h-full w-full relative" />
    <POILayer />
    <!-- Status indicators overlay -->
    <!-- Offline mode overlay (when applicable) -->
  </div>
</div>
```

### Key CSS Classes
- **Container**: `w-full h-[60vh] lg:h-[70vh] relative` - Responsive height
- **Border wrapper**: `overflow-hidden rounded-lg border h-full`
- **Map canvas**: `h-full w-full relative` - Full container size

## Component Props

### MapControlsProps Interface

```typescript
interface MapControlsProps {
  // Core Props
  region: string;                    // User's region (e.g., "US", "Australia")
  map: MutableRefObject<Map>;        // Mapbox map instance reference
  directionsControl: MutableRefObject<Directions>; // Directions control reference
  isOffline?: boolean;               // Offline mode flag

  // Route Management
  originName: string;                // Origin location name
  destName: string;                  // Destination location name
  setOriginName: (name: string) => void;
  setDestName: (name: string) => void;
  waypoints: Waypoint[];             // Intermediate stops
  setWaypoints: (waypoints: Waypoint[]) => void;
  onRouteChange: () => void;         // Route update callback

  // Travel Configuration
  travelMode: string;                // driving, walking, cycling, traffic
  onTravelModeChange: (mode: string) => void;
  routeType: string;                 // fastest, shortest, scenic, etc.
  vehicle: string;                   // car, truck, bus, motorcycle
  exclude: string[];                 // Road types to avoid
  annotations: string[];             // Additional route data

  // Waypoint Management
  adding: boolean;                   // Pin-drop mode active
  setAdding: (adding: boolean) => void;
  manualMode: boolean;               // Manual waypoint mode
  manualWaypoints: ManualWaypoint[];
  onManualWaypointAdd: (waypoint: ManualWaypoint) => void;
  onManualWaypointRemove: (id: string) => void;

  // Lock States
  originLocked: boolean;             // Prevent origin changes
  destinationLocked: boolean;        // Prevent destination changes
  lockOrigin: () => void;
  lockDestination: () => void;

  // Template Data
  templateData?: any;                // Pre-populated route template
}
```

## Map Initialization

### Token Configuration

The map uses environment variables for Mapbox tokens:

```javascript
// Token priority order:
// 1. VITE_MAPBOX_PUBLIC_TOKEN (recommended)
// 2. VITE_MAPBOX_TOKEN (legacy fallback)

const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || 
              import.meta.env.VITE_MAPBOX_TOKEN;

mapboxgl.accessToken = token;
```

### Map Creation

```javascript
map.current = new mapboxgl.Map({
  container: mapContainer.current,
  style: "mapbox://styles/mapbox/streets-v11",
  center: regionCenters[region] || regionCenters.US,
  zoom: 3.5,
  hash: true,              // Enable URL hash for sharing
  projection: 'mercator'
});
```

### Region Centers

```javascript
const regionCenters = {
  Australia: [133.7751, -25.2744],
  US: [-98.5795, 39.8283],
  Canada: [-106.3468, 56.1304],
  NZ: [174.8860, -40.9006],
  UK: [-3.435973, 55.378051]
};
```

## Map Controls

### Native Mapbox Controls

1. **NavigationControl** (top-right)
   - Zoom in/out buttons
   - Compass for rotation
   - Pitch visualization

2. **GeolocateControl** (top-right)
   - User location tracking
   - High accuracy positioning
   - Heading indicator

3. **FullscreenControl** (top-right)
   - Toggle fullscreen mode

4. **ScaleControl** (bottom-left)
   - Dynamic units (metric/imperial)
   - Based on user region

### Custom Controls

1. **MapOptionsControl** (top-right)
   - Map style switcher
   - POI filter toggles
   - React-based dropdown

2. **MapboxDirections** (top-left)
   - Origin/destination inputs
   - Turn-by-turn instructions
   - Alternative routes
   - Profile switcher

## Route Configuration

### Route Types

```javascript
const routeTypes = {
  'fastest': 'time',        // Optimize for time
  'shortest': 'distance',   // Optimize for distance
  'scenic': 'time',         // Avoid highways
  'off_grid': 'distance',   // Avoid major roads
  'luxury': 'time',         // Avoid unpaved roads
  'manual': 'time'          // User-defined waypoints
};
```

### Vehicle-Specific Configuration

```javascript
// Truck Configuration
{
  exclude: ['restricted'],
  annotations: ['maxweight', 'maxheight']
}

// Bus Configuration
{
  exclude: ['restricted'],
  prefer: ['motorway']  // Comfort for passengers
}

// Motorcycle Configuration
{
  exclude: ['ferry'],     // Boarding complexity
  prefer: ['scenic']      // Enjoyable routes
}
```

## Event Handlers

### Map Click Events

```javascript
// Waypoint Addition (when adding mode is active)
map.on('click', async (e) => {
  if (!adding) return;
  
  const coords = [e.lngLat.lng, e.lngLat.lat];
  const place = await reverseGeocode(coords);
  const waypoint = { coords, name: place };
  
  setWaypoints([...waypoints, waypoint]);
  // Add visual marker
  // Insert into directions control
});
```

### Directions Events

```javascript
// Origin Change
directionsControl.on("origin", (e) => {
  if (!originLocked && e.feature) {
    setOriginName(e.feature.place_name);
    lockOrigin();
  }
});

// Destination Change
directionsControl.on("destination", (e) => {
  if (!destinationLocked && e.feature) {
    setDestName(e.feature.place_name);
    lockDestination();
  }
});

// Route Update
directionsControl.on("route", () => {
  onRouteChange();
});
```

## State Management

### Internal State

```javascript
const [currentStyle, setCurrentStyle] = useState("mapbox://styles/mapbox/streets-v11");
const [poiFilters, setPOIFilters] = useState({
  pet_stop: true,
  wide_parking: true,
  medical: true,
  farmers_market: true
});
```

### Refs

```javascript
const mapContainer = useRef<HTMLDivElement>(null);      // DOM container
const optionsControlRef = useRef<MapOptionsControl>();  // Options control
const isProgrammaticUpdate = useRef(false);             // Event flag
const manualWaypointMarkers = useRef<Marker[]>([]);     // Marker array
```

## POI Layer

The POI (Points of Interest) layer displays custom markers on the map:

```javascript
// POI Categories and Icons
{
  'pet_stop': '🐾',
  'wide_parking': '🅿️',
  'medical': '🚑',
  'farmers_market': '🥕'
}
```

POIs are loaded from `/data/poi/pois.json` and filtered based on user preferences.

## Status Indicators

Visual indicators appear in the top-right corner:

```javascript
// Locked Points
{originLocked && <span>A Locked</span>}
{destinationLocked && <span>B Locked</span>}

// Manual Mode
{manualMode && <span>Manual Mode</span>}

// Location Tracking
{locationTracking.isTracking && <span>Live on Map</span>}
```

## Utility Functions

### reverseGeocode
Converts coordinates to human-readable addresses:
```javascript
async function reverseGeocode([lng, lat]) {
  const data = await mapboxProxy.geocoding.reverse(lng, lat);
  return data.features?.[0]?.place_name || `${lat}, ${lng}`;
}
```

## Adding Custom Overlays

To add a new overlay or control to the map:

1. **As a Native Mapbox Control**:
```javascript
class CustomControl {
  onAdd(map) {
    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl';
    // Add content
    return this.container;
  }
  onRemove() {
    this.container.remove();
  }
}

map.addControl(new CustomControl(), 'top-right');
```

2. **As a React Overlay**:
```jsx
// Inside the map container div
<div className="absolute bottom-4 right-4 z-10">
  <YourReactComponent />
</div>
```

## Common Modifications

### Change Map Height
```jsx
// In MapControls return statement
<div className="w-full h-[80vh] relative">  // Changed from 60vh/70vh
```

### Add New POI Category
1. Add to POI filters state
2. Update getIcon function in POILayer
3. Add POIs to `/data/poi/pois.json`

### Modify Route Optimization
Update the `getOptimization` and `getRouteExclusions` functions in MapControls

### Add Map Style
Add new style option to MapOptionsDropdown component

## Performance Considerations

1. **Cleanup**: Always remove event listeners and markers in useEffect cleanup
2. **Debouncing**: Consider debouncing rapid state updates
3. **Marker Limits**: Limit POI markers based on zoom level
4. **Route Recalculation**: Avoid unnecessary route recalculations

## Integration Points

### With PAM Voice Assistant
- Voice commands can control map navigation
- PAM can announce turn-by-turn directions
- Integration point: Line 286 in IntegratedTripPlanner

### With Trip State
- Map state syncs with integrated trip state
- Waypoints, route details shared across components
- Managed by useIntegratedTripState hook

## Future Enhancements

1. **Offline Map Tiles**: Cache map tiles for offline use
2. **3D Buildings**: Enable 3D building layer at high zoom
3. **Weather Overlay**: Add weather data visualization
4. **Traffic Flow**: Real-time traffic visualization
5. **Custom Markers**: User-uploadable POI markers

## Troubleshooting

### Map Not Loading
1. Check environment variables for valid Mapbox token
2. Verify internet connectivity
3. Check browser console for errors
4. Ensure mapbox-gl CSS is imported

### Directions Not Working
1. Verify both origin and destination are set
2. Check if route type is valid
3. Ensure directions control is initialized
4. Check for API rate limits

### POIs Not Showing
1. Verify POI data file exists
2. Check POI filter states
3. Ensure map is loaded before adding markers
4. Check browser console for errors

---

This documentation provides a comprehensive overview of the map component architecture, making it easy to understand and modify the map functionality in the Wheels & Wins application.