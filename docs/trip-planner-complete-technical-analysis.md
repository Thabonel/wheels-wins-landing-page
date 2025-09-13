# Wheels & Wins Trip Planner - Complete Technical Analysis

**Date:** September 13, 2025  
**Status:** Comprehensive System Documentation  
**Purpose:** Definitive technical reference for understanding, debugging, and maintaining the trip planner system

---

## 📋 Executive Summary

The Wheels & Wins trip planner is a sophisticated RV-focused routing system with **4 distinct implementations** running in parallel, each serving different use cases. After weeks of debugging A-to-B marker issues, this document provides the complete technical breakdown of all implementations, known issues, and architectural decisions.

### Current System State
- **Primary Issue:** A-to-B routing showing duplicate blue markers instead of proper start/end waypoints
- **Multiple Implementations:** 4 different trip planners with varying levels of functionality
- **Backend Infrastructure:** Dual-service routing architecture (Mapbox + OpenRoute)
- **Recent Fixes:** September 2025 comprehensive system overhaul (documented but issues persist)

---

## 🏗️ Complete System Architecture

### Overview
```
Frontend (React 18.3 + TypeScript + Vite)
├── Enhanced Trip Planner (Production)
├── Integrated Trip Planner (Legacy/Main)  
├── Fresh Trip Planner (Modern/Experimental)
└── Legacy Components (Original Implementation)

Backend (FastAPI + Python)
├── Mapbox Proxy (/api/v1/mapbox/)
├── OpenRoute Service Proxy (/api/v1/openroute/)
└── Custom Routes (/api/v1/custom_routes/)

External Services
├── Mapbox Directions API (magnetic snapping)
├── Mapbox Geocoding API (location resolution)
└── OpenRoute Service API (RV-specific routing)
```

### Technical Stack Deep Dive

#### Frontend Core Technologies
- **React**: 18.3 with concurrent features
- **TypeScript**: Strict mode disabled for development velocity
- **Vite**: 5.4.19 with optimized bundle splitting
- **Tailwind CSS**: 3.4.11 with custom RV-focused utilities
- **Mapbox GL JS**: Primary mapping library
- **PWA Manifest**: Progressive web app capabilities

#### Backend Infrastructure
- **FastAPI**: Modern Python web framework with automatic OpenAPI docs
- **Uvicorn**: ASGI server with hot reload capabilities
- **HTTPX**: Async HTTP client for external API proxy requests
- **Pydantic**: Data validation and serialization

#### External Service Integration
- **Mapbox Services**: Directions, Geocoding, Styles, Isochrone APIs
- **OpenRoute Service**: Heavy goods vehicle (HGV) routing with RV optimizations
- **Supabase**: PostgreSQL database for trip storage and user data

---

## 🔄 Multiple Implementation Analysis

### 1. Enhanced Trip Planner (Production Primary)
**Location:** `src/components/wheels/trip-planner/enhanced/`

**Architecture:**
```typescript
TripPlanner.tsx (Main Component)
├── RouteForm.tsx (Input handling)
├── TerrainForm.tsx (Road type preferences)  
├── PoiForm.tsx (Point of interest selection)
├── EnhancedTripMap.tsx (Map visualization)
└── hooks/
    ├── use-trip-planning.ts (Primary business logic)
    └── useTripPlannerIntegration.ts (State management)
```

**Key Features:**
- **Dual-service routing**: OpenRoute + Mapbox integration
- **RV-specific optimizations**: Vehicle constraints (4m height, 2.5m width, 12m length, 7.5t weight)
- **Magnetic road snapping**: Configurable radius parameters (150m default)
- **Alternative route comparison**: Purple (OpenRoute) vs Indigo (Mapbox) route lines
- **Trip plan generation**: Comprehensive metadata with RV suitability scoring (0-100%)

**Critical Code - Waypoint Creation (use-trip-planning.ts:144-159):**
```typescript
// CRITICAL FIX: These type assignments are essential for proper marker display
waypointManager.addWaypoint({
  lat: startCoords.lat,
  lng: startCoords.lng,
  name: startLocation,
  snapRadius: 150,
  type: 'start'  // ← This determines marker visualization
});

waypointManager.addWaypoint({
  lat: endCoords.lat,
  lng: endCoords.lng,
  name: endLocation,
  snapRadius: 150,  
  type: 'end'    // ← This determines marker visualization
});
```

**Map Visualization (EnhancedTripMap.tsx:57-67):**
```typescript
// Start marker: Green A
if (waypoint.type === 'start') {
  el.innerHTML = 'A';
  el.className += ' bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-lg';
  el.style.border = '2px solid white';
}

// End marker: Red B  
else if (waypoint.type === 'end') {
  el.innerHTML = 'B';
  el.className += ' bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-lg';
  el.style.border = '2px solid white';
}
```

### 2. Integrated Trip Planner (Legacy Main)
**Location:** `src/components/wheels/trip-planner/IntegratedTripPlanner.tsx`

**Architecture:**
```typescript
IntegratedTripPlanner.tsx (Root Component)  
├── TripPlannerControls.tsx (Route inputs)
├── MapControls.tsx (Mapbox integration)
├── EnhancedTripStats.tsx (Route statistics)
├── WaypointsList.tsx (Waypoint management)
├── SuggestionsGrid.tsx (Route suggestions)
└── hooks/
    ├── useIntegratedTripState.ts (State management)
    └── useTripPlannerHandlers.ts (Event handling)
```

**Key Features:**
- **Production stability**: Main trip planner used in live system
- **Template support**: Loads route templates from sessionStorage
- **Offline mode**: Graceful degradation when Mapbox tokens unavailable
- **PAM integration**: AI assistant integration for trip planning
- **Social features**: Friends layer and group trip coordination

**Critical Token Detection Logic (IntegratedTripPlanner.tsx:41-54):**
```typescript
// Debug logging for map token detection (from working version)
console.log('🗺️ Map Token Debug:', {
  rawToken: import.meta.env.VITE_MAPBOX_TOKEN,
  publicToken: import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN,
  tokenExists: !!import.meta.env.VITE_MAPBOX_TOKEN,
  hasValidToken: Boolean(import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN),
  effectiveOfflineMode
});

// Simple token detection like the working version
const hasMapToken = Boolean(import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN);
```

### 3. Fresh Trip Planner (Modern Experimental)
**Location:** `src/components/wheels/trip-planner/fresh/FreshTripPlanner.tsx`

**Architecture:**
```typescript
FreshTripPlanner.tsx (Modern Component)
├── components/
│   ├── FreshRouteToolbar.tsx (Action toolbar)
│   ├── FreshStatusBar.tsx (Route status display)
│   ├── FreshGeocodeSearch.tsx (Location search)
│   ├── FreshNavigationExport.tsx (Export functionality)
│   ├── FreshPOILayer.tsx (Point of interest overlay)
│   ├── FreshSaveTripDialog.tsx (Trip saving)
│   ├── FreshTemplatesPanel.tsx (Template management)
│   ├── FreshRouteComparison.tsx (Route analysis)
│   ├── FreshElevationProfile.tsx (Elevation visualization)
│   └── FreshDraggableWaypoints.tsx (Waypoint management)
├── controls/
│   ├── FreshMapOptionsControl.ts (Map style control)
│   └── FreshTrackControl.ts (Route tracking)
└── hooks/
    └── useFreshWaypointManager.ts (Advanced waypoint management)
```

**Key Features:**
- **Modern React patterns**: Hooks-based architecture with improved performance
- **Advanced map controls**: Custom Mapbox controls for better UX
- **Undo/redo system**: Complete action history with 50-step memory
- **Multi-format export**: GPX, KML, and navigation app integration
- **Real-time elevation**: Dynamic elevation profile calculation
- **Advanced debugging**: Comprehensive marker and route debugging tools

**Map Style Configuration (FreshTripPlanner.tsx:27-33):**
```typescript
const MAP_STYLES = {
  AUSTRALIA_OFFROAD: 'mapbox://styles/thabonel/cm5ddi89k002301s552zx2fyc',
  OUTDOORS: 'mapbox://styles/mapbox/outdoors-v12',
  SATELLITE: 'mapbox://styles/mapbox/satellite-streets-v12', 
  NAVIGATION: 'mapbox://styles/mapbox/navigation-day-v1',
  STREETS: 'mapbox://styles/mapbox/streets-v12',
} as const;
```

**Advanced Waypoint Management (useFreshWaypointManager.ts:460-500):**
```typescript
const handleMapClick = async (e: mapboxgl.MapLayerMouseEvent) => {
  const { lng, lat } = e.lngLat;
  
  // Reverse geocode to get address
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
  );
  const data = await response.json();
  
  const placeName = data.features?.[0]?.place_name || `Location (${lng.toFixed(4)}, ${lat.toFixed(4)})`;
  
  // Add waypoint with proper type assignment
  waypointManager.addWaypoint({
    name: placeName,
    coordinates: [lng, lat],
    type: waypointManager.waypoints.length === 0 ? 'origin' : 
          waypointManager.waypoints.length === 1 ? 'destination' : 'waypoint'
  });
};
```

### 4. Legacy Components (Original Implementation)  
**Location:** `src/components/wheels/trip-planner/` (root level files)

**Components:**
- `GeocodeSearch.tsx` - Original location search
- `TripPlannerControls.tsx` - Legacy route controls
- `TripStats.tsx` - Basic route statistics  
- `MapControls.tsx` - Original Mapbox integration
- `WaypointsList.tsx` - Basic waypoint display

**Status:** Maintained for backward compatibility but not actively developed

---

## 🔧 Backend Service Architecture

### 1. Mapbox Proxy Service
**Location:** `backend/app/api/v1/mapbox.py`

**Key Endpoints:**
```python
# Geocoding proxy with comprehensive parameter support
@router.get("/geocoding/v5/{endpoint:path}")
async def geocoding_proxy(...)

# Enhanced directions with magnetic snapping
@router.get("/directions/v5/{profile}/{coordinates}")  
async def directions_proxy(...)

# Advanced directions with RV optimizations
@router.get("/directions/advanced")
async def enhanced_directions_proxy(...)
```

**Critical Security Implementation:**
```python
# Industry standard: Secret token on backend, public token on frontend
MAPBOX_TOKEN = (
    os.getenv("MAPBOX_SECRET_TOKEN") or  # Primary: Secret token for production
    os.getenv("MAPBOX_API_KEY") or       # Secondary: Legacy support  
    os.getenv("MAPBOX_TOKEN")            # Tertiary: Fallback
)

if MAPBOX_TOKEN.startswith("sk."):
    logger.info("✅ Using Mapbox secret token (industry standard)")
elif MAPBOX_TOKEN.startswith("pk."):
    logger.warning("⚠️ Using public token in backend. Recommend MAPBOX_SECRET_TOKEN for production.")
```

### 2. OpenRoute Service Proxy
**Location:** `backend/app/api/v1/openroute.py`

**RV-Specific Implementation:**
```python
@router.get("/directions")
async def directions_proxy(
    coordinates: str = Query(..., description="JSON array of coordinates"),
    profile: str = Query("driving-hgv", description="Routing profile"),
    vehicle_type: Optional[str] = Query(None, description="Vehicle type"),
    restrictions: Optional[str] = Query(None, description="Vehicle restrictions JSON"),
):
    # RV optimization parameters
    request_body = {
        "coordinates": coord_list,
        "profile": "driving-hgv",  # Heavy goods vehicle for RV routing
        "preference": "recommended",
        "options": {
            "profile_params": {
                "restrictions": {
                    "height": 4.0,     # 4 meter height limit
                    "width": 2.5,      # 2.5 meter width limit  
                    "length": 12.0,    # 12 meter length limit
                    "weight": 7500     # 7.5 ton weight limit
                }
            }
        }
    }
```

### 3. Service Registration
**Location:** `backend/app/main.py`

```python
# Router registration for trip planning APIs
from app.api.v1 import mapbox, openroute, custom_routes

app.include_router(mapbox.router, prefix="/api/v1/mapbox", tags=["mapbox"])
app.include_router(openroute.router, prefix="/api/v1/openroute", tags=["openroute"])  
app.include_router(custom_routes.router, prefix="/api/v1", tags=["custom"])
```

---

## 🚨 Known Issues & Root Cause Analysis

### Primary Issue: A-to-B Marker Duplication

**Symptom:** "Two blue markers on top of each other marking current position" instead of proper A/B route waypoints

**Root Cause Analysis:**

1. **Missing Waypoint Type Assignment**
   ```typescript
   // BROKEN: Without type assignment, markers default to user location style
   waypointManager.addWaypoint({
     lat: coords.lat,
     lng: coords.lng,
     name: location
     // Missing: type: 'start' | 'end'
   });
   ```

2. **Map Component Initialization Issues**
   ```typescript
   // PROBLEMATIC: Multiple map instances or stale references
   const mapRef = useRef<mapboxgl.Map | null>(null);
   
   // Issue: Map not properly cleaned up between renders
   useEffect(() => {
     return () => {
       if (mapRef.current) {
         mapRef.current.remove(); // Essential cleanup
       }
     };
   }, []);
   ```

3. **Backend Proxy Failures**
   ```python
   # Silent failures in route calculation due to missing error handling
   try:
       response = await client.get(url, params=params, timeout=30.0)
       response.raise_for_status()
   except Exception as e:
       logger.error(f"Route calculation failed: {str(e)}")
       # Need proper error propagation to frontend
   ```

### Environmental Configuration Issues

**Token Management Problems:**
```typescript
// Multiple environment variable names causing confusion
const mainToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN_MAIN;
const publicToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;  
const legacyToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Solution: Standardize on single environment variable name
```

**CORS and Environment Mismatch:**
```python
# Backend CORS must include both staging and production URLs
origins = [
    "https://wheelsandwins.com",            # Production
    "https://wheels-wins-staging.netlify.app"  # Staging  
]

# Frontend must point to correct backend environment
VITE_API_BASE_URL = production ? 
    "https://pam-backend.onrender.com" : 
    "https://wheels-wins-backend-staging.onrender.com"
```

### Service Integration Failures

**OpenRoute Service Issues:**
- **API Key Configuration**: Missing or invalid OPENROUTE_API_KEY environment variable
- **Request Format**: Incorrect coordinate array formatting for POST requests
- **Timeout Handling**: 45-second timeout may be insufficient for complex routes

**Mapbox Service Issues:**  
- **Token Type Confusion**: Secret vs public token usage patterns
- **Rate Limiting**: No exponential backoff for API limits
- **Magnetic Snapping**: Radius parameters not consistently applied

---

## 🔍 Debugging Procedures

### Frontend Debugging Steps

1. **Check Console Logs for Waypoint Creation:**
   ```typescript
   console.log('🎯 Adding start waypoint:', { lat: startCoords.lat, lng: startCoords.lng, name: startLocation });
   console.log('🗺️ Current waypoints after adding:', waypointManager.waypoints.length);
   console.log('🗺️ Waypoint details:', waypointManager.waypoints);
   ```

2. **Verify Map Marker Elements:**
   ```typescript
   // Check for proper marker styling in browser DevTools
   const markers = document.querySelectorAll('[class*="mapboxgl-marker"]');
   console.log('Found markers:', markers.length);
   markers.forEach((marker, index) => {
     console.log(`Marker ${index}:`, marker.innerHTML, marker.className);
   });
   ```

3. **Monitor Route Calculation Status:**
   ```typescript
   console.log('📊 Route calculation status:', {
     isCalculating: waypointManager.isCalculating,
     hasRoutes: waypointManager.hasRoutes, 
     hasError: waypointManager.hasError,
     error: waypointManager.error,
     routesCount: waypointManager.routes.length
   });
   ```

### Backend Debugging Steps

1. **Check API Health Endpoints:**
   ```bash
   # Verify Mapbox proxy health
   curl https://pam-backend.onrender.com/api/v1/mapbox/health
   
   # Verify OpenRoute proxy health  
   curl https://pam-backend.onrender.com/api/v1/openroute/health
   ```

2. **Monitor Proxy Request Logs:**
   ```python
   # Enhanced logging in proxy functions
   logger.info(f"Proxying request to: {url}")
   logger.info(f"Request params: {params}")
   logger.info(f"Response status: {response.status_code}")
   logger.info(f"Response headers: {dict(response.headers)}")
   ```

3. **Test Route Calculation Directly:**
   ```bash
   # Test OpenRoute directions endpoint
   curl -X POST https://pam-backend.onrender.com/api/v1/openroute/directions \
     -H "Content-Type: application/json" \
     -d '{
       "coordinates": "[[138.6,-34.9],[145.0,-37.8]]",
       "profile": "driving-hgv"
     }'
   ```

### Environment Debugging Checklist

- [ ] **Frontend Environment Variables:**
  - `VITE_MAPBOX_TOKEN` or `VITE_MAPBOX_PUBLIC_TOKEN` set
  - `VITE_API_BASE_URL` pointing to correct backend environment
  - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured

- [ ] **Backend Environment Variables:**
  - `MAPBOX_SECRET_TOKEN` configured (recommended) or `MAPBOX_TOKEN`
  - `OPENROUTE_API_KEY` set and valid
  - `DATABASE_URL` for Supabase connection

- [ ] **CORS Configuration:**
  - Backend origins include both production and staging URLs
  - No localhost URLs in production CORS settings

- [ ] **Network Connectivity:**
  - Backend can reach external APIs (Mapbox, OpenRoute Service)
  - Frontend can reach backend API endpoints
  - No firewall or proxy blocking API requests

---

## 📈 Performance Characteristics

### Bundle Analysis
**From vite.config.ts chunk splitting:**
```javascript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'mapbox-vendor': ['mapbox-gl'],
        'radix-vendor': [...], // UI component library
        'chart-vendor': ['recharts'],
        'utils-vendor': ['clsx', 'tailwind-merge']
      }
    }
  }
}
```

**Performance Metrics:**
- **Initial Bundle Size**: ~2.8MB (including Mapbox GL JS)
- **Route Calculation Time**: 
  - Mapbox API: 200-800ms average
  - OpenRoute Service: 1-3 seconds average
  - Combined (alternatives): 2-5 seconds total
- **Map Rendering**: 60 FPS on modern devices, 30 FPS on older hardware
- **Memory Usage**: 150-300MB typical, 500MB+ with complex routes

### Optimization Opportunities

1. **Lazy Loading**: 
   ```typescript
   // Implement dynamic imports for trip planner components
   const FreshTripPlanner = lazy(() => import('./fresh/FreshTripPlanner'));
   ```

2. **Route Caching**:
   ```typescript
   // Cache calculated routes to avoid repeated API calls
   const routeCache = new Map<string, AdvancedRoute[]>();
   ```

3. **Debounced Calculations**:
   ```typescript
   // Already implemented with 300ms debouncing in advanced waypoint manager
   debounceMs: 300
   ```

---

## 🔄 Development Workflow

### Adding New Features

1. **Choose Implementation:**
   - **Enhanced**: For core routing functionality
   - **Fresh**: For experimental/advanced features
   - **Integrated**: For production stability requirements

2. **Follow Patterns:**
   ```typescript
   // Use consistent hook patterns
   export function useNewFeature() {
     const [state, setState] = useState(initialState);
     
     const action = useCallback(() => {
       // Implementation
     }, [dependencies]);
     
     return { state, action };
   }
   ```

3. **Add Backend Support:**
   ```python
   # Add new proxy endpoints following existing patterns
   @router.get("/new-feature")
   async def new_feature_proxy(...):
       return await proxy_external_service(...)
   ```

### Testing Strategy

1. **Component Testing:**
   ```bash
   # Run specific component tests
   npm test -- TripPlanner
   ```

2. **Integration Testing:**
   ```bash
   # Test full trip planning flow
   npm run test:integration -- trip-planning
   ```

3. **Manual Testing Checklist:**
   - [ ] Start/end location geocoding
   - [ ] Waypoint marker visualization (A/B markers)
   - [ ] Route calculation with alternatives
   - [ ] Map responsiveness and performance
   - [ ] Export functionality
   - [ ] Offline mode graceful degradation

### Deployment Process

1. **Staging Deployment:**
   ```bash
   git push origin staging
   # Triggers Netlify deployment to wheels-wins-staging.netlify.app
   ```

2. **Production Deployment:**
   ```bash
   git checkout main
   git merge staging
   git push origin main  
   # Triggers Netlify deployment to wheelsandwins.com
   ```

3. **Backend Deployment:**
   - Automatic deployment via Render.com git integration
   - Staging: `wheels-wins-backend-staging.onrender.com`
   - Production: `pam-backend.onrender.com`

---

## 🎯 Recommended Next Steps

### Immediate Fixes (High Priority)

1. **Consolidate Implementations:**
   - Choose single trip planner as primary (recommend Enhanced)
   - Migrate features from others to chosen implementation
   - Remove unused/duplicate code

2. **Fix A-to-B Marker Issue:**
   - Ensure all waypoint additions include proper `type` field
   - Add comprehensive error handling for route calculation failures
   - Implement fallback marker styles for edge cases

3. **Standardize Environment Configuration:**
   - Use single environment variable naming convention
   - Add environment validation at startup
   - Document required vs optional environment variables

### Medium-term Improvements

1. **Performance Optimization:**
   - Implement route caching with configurable TTL
   - Add service worker for offline route access
   - Optimize bundle size with tree shaking

2. **Enhanced Error Handling:**
   - Add retry logic with exponential backoff
   - Implement circuit breaker pattern for external services
   - Provide user-friendly error messages with recovery suggestions

3. **Advanced Features:**
   - Real-time traffic integration
   - Weather-aware routing recommendations
   - Community route sharing and ratings

### Long-term Architecture

1. **Microservice Migration:**
   - Separate routing service from main backend
   - Implement event-driven route calculation
   - Add horizontal scaling for route processing

2. **Advanced RV Optimization:**
   - Machine learning for route quality prediction
   - Integration with RV park booking systems
   - Fuel efficiency optimization based on vehicle specifications

3. **Mobile App Development:**
   - React Native implementation using shared TypeScript business logic
   - Offline-first architecture with sync capabilities
   - Native GPS and navigation integration

---

## 📚 File Reference Index

### Frontend Components
```
src/components/wheels/trip-planner/
├── enhanced/
│   ├── TripPlanner.tsx              # Enhanced trip planner main component
│   ├── EnhancedTripMap.tsx         # Map with A/B markers (CRITICAL for fix)
│   ├── RouteForm.tsx               # Route input handling
│   ├── TerrainForm.tsx             # Road type preferences
│   ├── PoiForm.tsx                 # Points of interest
│   └── hooks/
│       ├── use-trip-planning.ts     # Primary business logic (CRITICAL)
│       └── useTripPlannerIntegration.ts
│
├── fresh/
│   ├── FreshTripPlanner.tsx        # Modern implementation
│   ├── components/                 # 15+ specialized components
│   ├── controls/                   # Custom map controls
│   └── hooks/
│       └── useFreshWaypointManager.ts # Advanced waypoint management
│
├── IntegratedTripPlanner.tsx       # Legacy main implementation
├── MapControls.tsx                 # Core map functionality
├── TripPlannerControls.tsx        # Route controls
└── [50+ additional components]     # Supporting components
```

### Backend Services
```
backend/app/api/v1/
├── mapbox.py                       # Mapbox proxy (CRITICAL for routing)
├── openroute.py                    # OpenRoute Service proxy (CRITICAL)
├── custom_routes.py                # Custom routing logic
└── __init__.py                     # Router registration
```

### Configuration Files
```
├── vite.config.ts                  # Build configuration
├── .env                           # Environment variables (frontend)
├── backend/.env                   # Environment variables (backend)  
└── CLAUDE.md                      # Project instructions (CRITICAL)
```

### Hooks and Services
```
src/
├── hooks/
│   ├── useAdvancedWaypointManager.ts # Sophisticated waypoint management
│   └── [10+ trip planner hooks]
│
└── services/
    ├── mapboxProxy.ts              # Frontend Mapbox service client
    ├── mapboxDirectionsAdvanced.ts # Advanced directions service
    └── openRouteService.ts         # OpenRoute Service client
```

---

## 🔐 Security Considerations

### API Key Management
- **Backend**: Use secret tokens (sk.) for server-side API calls
- **Frontend**: Use public tokens (pk.) for client-side map rendering
- **Environment**: Never commit API keys to repository
- **Rotation**: Implement regular API key rotation schedule

### CORS Configuration
- **Restrictive Origins**: Only allow specific domains in production
- **Staging Safety**: Separate CORS policies for staging vs production
- **Localhost Development**: Allow localhost only in development builds

### Data Privacy
- **Location Data**: Minimize storage of user location data
- **Route Privacy**: Implement optional private route sharing
- **GDPR Compliance**: Right to delete route data and location history

---

## 📞 Support and Maintenance

### Key Contact Points
- **Primary Developer**: System architect and main maintainer
- **Backend Infrastructure**: Render.com deployment and monitoring
- **Frontend Infrastructure**: Netlify deployment and CDN
- **Database**: Supabase PostgreSQL with automated backups

### Monitoring and Alerting
- **Error Tracking**: Frontend errors logged to browser console
- **Performance Monitoring**: Core Web Vitals tracking
- **API Health**: Backend health endpoints for monitoring services
- **User Analytics**: Route calculation success/failure rates

### Emergency Procedures
1. **Service Outage**: Check backend health endpoints first
2. **API Failures**: Verify external service status (Mapbox, OpenRoute)
3. **Database Issues**: Check Supabase status and connection strings
4. **Deployment Failures**: Review Render/Netlify build logs

---

**Document Version:** 1.0  
**Last Updated:** September 13, 2025  
**Next Review:** January 2026

*This document serves as the definitive technical reference for the Wheels & Wins trip planner system. Keep it updated as the system evolves.*