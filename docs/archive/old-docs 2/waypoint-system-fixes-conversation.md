# Waypoint System Fixes - Development Conversation

## Date: January 24, 2025

### Context
This document captures the conversation and fixes implemented to resolve issues with the trip planner waypoint system in the Wheels & Wins application.

---

## Initial Problem Report

**User:** "The waypoint system in the map is not working. It is a system for planning a trip, it has several elements, you can give it a starting and end point, it should then work out the route based on the settings in the map. You should be able to manually change the route by adding extra waypoints. Or you should be able to ask Pam to make the journey more interesting and add waypoints based on what you like and what she has learned about you."

---

## Investigation & Analysis

### Files Examined
1. `/src/components/wheels/trip-planner/fresh/hooks/useFreshWaypointManager.ts` - Core waypoint management logic
2. `/src/components/wheels/trip-planner/fresh/FreshTripPlanner.tsx` - Main trip planner component
3. `/src/services/googleImageService.ts` - (Previously fixed image service)
4. `/src/services/wikipediaImageService.ts` - (Previously created for real location images)

### Issues Identified

#### Issue 1: Data Structure Mismatch
The waypoint manager expected coordinates as an array `[lng, lat]`, but was receiving separate `lng` and `lat` properties.

**Location:** FreshTripPlanner.tsx
- Line 481-486: `handleLocationSelect` passing wrong format
- Line 500-503: Template waypoints using wrong format
- Line 623: Budget sidebar trying to access `wp.lng` and `wp.lat`

#### Issue 2: Map Click Handler Not Working
**User:** "When I click the + the mouse pointer is suppose to turn into a _ and add points on the map"

**Problems Found:**
1. Map click handler using closure that captured initial `isAddingWaypoint` state (always false)
2. No cursor style change when entering waypoint adding mode
3. Missing visual feedback for waypoint adding mode

#### Issue 3: Function Organization Issues
In `useFreshWaypointManager.ts`:
- `updateMapMarkers` and `calculateRoute` were defined after being called
- Duplicate function definitions existed
- Missing proper useCallback hooks causing dependency issues

---

## Solutions Implemented

### Fix 1: Waypoint Data Structure (First Commit)
```typescript
// Before
waypointManager.addWaypoint({
  lng: coordinates[0],
  lat: coordinates[1],
  type: waypointManager.waypoints.length === 0 ? 'origin' : 'destination',
  name: name
});

// After
waypointManager.addWaypoint({
  coordinates: coordinates,
  name: name,
  type: waypointManager.waypoints.length === 0 ? 'origin' : 'destination'
});
```

**Files Modified:**
- `FreshTripPlanner.tsx` - 3 locations fixed

### Fix 2: Cursor and Click Handler (Second Commit)

#### Added Cursor Style
```css
/* Cursor style for adding waypoints */
.mapboxgl-canvas-container.waypoint-cursor {
  cursor: crosshair !important;
}
```

#### Fixed Click Handler with Ref
```typescript
// Added ref to avoid closure issues
const isAddingWaypointRef = useRef(false);

// Sync state with ref and manage cursor
useEffect(() => {
  isAddingWaypointRef.current = isAddingWaypoint;
  
  // Update cursor style
  if (map) {
    const canvas = map.getCanvasContainer();
    if (isAddingWaypoint) {
      canvas.classList.add('waypoint-cursor');
    } else {
      canvas.classList.remove('waypoint-cursor');
    }
  }
}, [isAddingWaypoint, map]);

// Map click handler now uses ref
newMap.on('click', (e) => {
  if (isAddingWaypointRef.current) {
    handleMapClick(e);
  }
});
```

#### Reorganized Hook Functions
```typescript
// Moved function definitions before usage
const updateMapMarkers = useCallback((waypoints: Waypoint[]) => {
  // ... marker logic
}, [map]);

const calculateRoute = useCallback(async (waypoints: Waypoint[]) => {
  // ... route calculation
}, [map, routeProfile, drawRoute, fitMapToRoute]);

// Then used in setWaypoints
const setWaypoints = useCallback((newWaypoints: Waypoint[]) => {
  // ... uses updateMapMarkers and calculateRoute
}, [map, onRouteUpdate, currentRoute, addToHistory, updateMapMarkers, calculateRoute]);
```

**Files Modified:**
- `FreshTripPlanner.tsx` - Added ref and cursor management
- `fresh-trip-planner.css` - Added cursor style
- `useFreshWaypointManager.ts` - Reorganized functions, removed duplicates

---

## Testing Checklist

### ✅ Completed Features
- [x] Click + button to enter waypoint adding mode
- [x] Cursor changes to crosshair when in adding mode
- [x] Click on map to add waypoints
- [x] First waypoint shows as green marker (start)
- [x] Second waypoint shows as red marker (end)
- [x] Additional waypoints show as blue markers
- [x] Route automatically calculates with 2+ waypoints
- [x] Route displays as blue line on map
- [x] Map fits to show all waypoints
- [x] Search location adds waypoints correctly
- [x] Templates apply waypoints correctly
- [x] Budget sidebar receives correct waypoint data

### 🔄 Pending Features (Future Work)
- [ ] PAM integration for intelligent waypoint suggestions
- [ ] Drag waypoints to reorder
- [ ] Right-click to remove waypoints
- [ ] Save and load trips
- [ ] Export routes to navigation apps

---

## Environment Configuration

### Mapbox Token
Verified configuration in `.env`:
```
VITE_MAPBOX_TOKEN=[REDACTED-MAPBOX-TOKEN]
```

The component checks multiple environment variables for compatibility:
1. `VITE_MAPBOX_PUBLIC_TOKEN_MAIN`
2. `VITE_MAPBOX_PUBLIC_TOKEN`
3. `VITE_MAPBOX_TOKEN` (legacy, currently used)

---

## Commits

### Commit 1: Data Structure Fix
```
fix: waypoint system data structure mismatch in trip planner

- Fixed handleLocationSelect to use coordinates array instead of separate lng/lat
- Fixed template waypoint application to use consistent data structure  
- Fixed Budget sidebar integration to access wp.coordinates
- Enables proper route calculation with 2+ waypoints
- Allows manual waypoint addition via map click and search
```

### Commit 2: Click Handler and Cursor Fix
```
fix: waypoint adding functionality with proper cursor and map click handling

- Added crosshair cursor when in waypoint adding mode
- Fixed map click handler using ref to avoid closure issues
- Reorganized useFreshWaypointManager to fix function dependencies
- Removed duplicate function definitions
- Waypoints now properly display markers on map
- Route calculation triggers automatically with 2+ waypoints
```

---

## Technical Notes

### Key Components

#### useFreshWaypointManager Hook
- Manages waypoint state and operations
- Handles route calculation via Mapbox Directions API
- Manages map markers for waypoints
- Provides undo/redo functionality
- Exposes functions: addWaypoint, removeWaypoint, reorderWaypoints, clearWaypoints

#### FreshTripPlanner Component
- Main trip planner UI
- Integrates map, toolbar, and panels
- Handles user interactions
- Manages waypoint adding mode
- Coordinates between different features

### Mapbox Integration
- Uses Mapbox GL JS for map rendering
- Directions API for route calculation
- Geocoding API for reverse geocoding clicked locations
- Custom markers for waypoints
- Route layer for displaying calculated path

### Waypoint Data Structure
```typescript
interface Waypoint {
  id: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  address?: string;
  type?: 'origin' | 'destination' | 'waypoint';
  marker?: mapboxgl.Marker;
}
```

---

## Deployment

Both fixes were successfully deployed to staging branch:
- First push: commit `9b5d9d20`
- Second push: commit `3f00cb06`

Staging URL receives automatic deployment via Netlify CI/CD pipeline.

---

## Additional Context

This waypoint system is part of the larger trip planning feature in Wheels & Wins, designed for Unimog and adventure vehicle enthusiasts to plan their journeys. The system integrates with:
- Budget tracking (Budget sidebar)
- Social features (Social sidebar)
- POI discovery
- Trip templates
- Navigation export
- Future: PAM AI assistant for intelligent suggestions

---

## References
- [Mapbox Directions API](https://docs.mapbox.com/api/navigation/directions/)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/api/)
- [React Hooks Documentation](https://react.dev/reference/react)