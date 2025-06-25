
# Travel & Vehicles (Wheels)

## Overview
The Wheels section provides comprehensive travel planning and vehicle management tools, including trip planning, maintenance tracking, fuel logging, and RV/caravan management with integrated PAM AI assistance.

## Architecture & Components

### Main Structure
```
src/pages/Wheels.tsx                 # Main wheels page with tabbed interface
src/components/wheels/
├── TripPlanner.tsx                 # Complete trip planning system
├── FuelLog.tsx                     # Fuel consumption tracking
├── VehicleMaintenance.tsx          # Maintenance scheduling
├── RVStorageOrganizer.tsx          # RV storage management
├── CaravanSafety.tsx              # Safety checklists
└── WeatherWidget.tsx              # Weather information
```

### Trip Planning System
```
src/components/wheels/trip-planner/
├── TripPlannerLayout.tsx          # Main layout wrapper
├── TripPlannerHeader.tsx          # Header with controls
├── TripPlannerControls.tsx        # Action buttons
├── RouteInputs.tsx                # Origin/destination inputs
├── WaypointsList.tsx              # Route stops management
├── SuggestionsGrid.tsx            # Suggested destinations
├── MapControls.tsx                # Map interaction controls
├── DirectionsControl.tsx          # Mapbox directions integration
├── GeocodeSearch.tsx              # Location search functionality
├── TravelModeButtons.tsx          # Transportation modes
├── TripControls.tsx               # Trip management actions
├── TripPlannerTip.tsx            # Helpful tips display
├── OfflineTripBanner.tsx         # Offline functionality notice
└── TripService.tsx               # Trip data processing service
```

### Storage & Organization
```
src/components/wheels/storage/
├── DrawerCard.tsx                 # Individual drawer display
├── DrawerList.tsx                 # All drawers overview
└── ShoppingListDialog.tsx         # Generate shopping lists

src/components/wheels/drawer-selector/
├── DrawerSelector.tsx             # Main drawer interface
├── NewDrawerModal.tsx            # Create new compartments
├── services/drawerService.ts      # CRUD operations
├── hooks/
│   ├── useDrawerOperations.ts     # Storage operations
│   ├── useDrawerCreation.ts       # Creation workflow
│   ├── useDrawerFetch.ts         # Data fetching
│   └── useAuthState.ts           # Authentication state
├── constants.ts                   # Drawer types and categories
└── validation.ts                  # Input validation
```

### Trip Planning Hooks & Utils
```
src/components/wheels/trip-planner/hooks/
├── useTripPlannerState.ts         # State management
└── useTripPlannerHandlers.ts      # Event handling

src/components/wheels/trip-planner/
├── types.ts                       # TypeScript definitions
├── constants.ts                   # Default values and configs
└── utils.ts                       # Helper functions
```

## Features

### Trip Planning
- **Interactive Maps**: Mapbox GL JS integration with custom controls
- **Route Optimization**: Multi-waypoint routing with distance/time calculation
- **Destination Search**: Geocoding with autocomplete suggestions
- **Travel Modes**: Driving, walking, cycling route options
- **Cost Estimation**: Fuel and travel expense calculations
- **Offline Support**: Cached trip data and basic offline functionality
- **PAM Integration**: AI-powered trip suggestions and optimization

### Vehicle Maintenance
- **Service Tracking**: Complete maintenance history logging
- **Smart Reminders**: Automated notifications based on time/mileage
- **Multi-vehicle Support**: Manage cars, RVs, motorcycles
- **Service Categories**: Oil changes, inspections, repairs
- **PAM Advice**: AI-powered maintenance recommendations
- **Offline Mode**: Local storage of maintenance schedules

### Fuel Management
- **Consumption Tracking**: Log fuel purchases with location data
- **Efficiency Analysis**: MPG calculations and trend analysis
- **Cost Tracking**: Fuel expense monitoring with price alerts
- **Station Finder**: Nearby gas stations with price comparison
- **Route Fuel Planning**: Estimate fuel costs for planned trips
- **PAM Insights**: AI analysis of fuel efficiency patterns

### RV & Caravan Management
- **Storage Organization**: Digital inventory of RV compartments
- **Drawer System**: Organize belongings by storage location
- **Smart Shopping Lists**: Generate lists based on stored items
- **Safety Checklists**: Pre-departure inspection routines
- **Space Optimization**: Maximize storage efficiency
- **PAM Assistance**: AI-powered organization suggestions

### Weather Integration
- **Route Weather**: Conditions along planned routes
- **Destination Forecasts**: Multi-day weather predictions
- **Travel Advisories**: Weather-related safety warnings
- **Seasonal Planning**: Best travel times for destinations
- **Real-time Updates**: Live weather data integration

## Technical Implementation

### Mapping Technology
```typescript
// Mapbox GL JS integration
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

// Custom trip planning controls
const DirectionsControl = () => {
  const directions = new MapboxDirections({
    accessToken: MAPBOX_TOKEN,
    unit: 'metric',
    profile: 'mapbox/driving'
  });
  
  return directions;
};
```

### State Management
```typescript
// Trip planning state
const useTripPlannerState = () => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [waypoints, setWaypoints] = useState([]);
  const [travelMode, setTravelMode] = useState('driving');
  const [routeData, setRouteData] = useState(null);
  
  return {
    origin, setOrigin,
    destination, setDestination,
    waypoints, setWaypoints,
    travelMode, setTravelMode,
    routeData, setRouteData
  };
};
```

### Data Services
```typescript
// Trip data processing
export const TripService = {
  calculateRoute: async (origin, destination, waypoints) => {
    // Mapbox Directions API integration
  },
  
  estimateCosts: (routeData, vehicleEfficiency) => {
    // Fuel cost calculations
  },
  
  findNearbyPOIs: (coordinates, radius) => {
    // Points of interest discovery
  }
};
```

### Storage Management
```typescript
// RV storage operations
const useDrawerOperations = () => {
  const addItem = async (drawerId, item) => {
    // Add item to storage compartment
  };
  
  const generateShoppingList = (drawerIds) => {
    // Create shopping list from stored items
  };
  
  const organizeByCategory = (items) => {
    // Smart categorization of belongings
  };
};
```

## PAM AI Integration

### Trip Planning Assistant
```typescript
// PAM trip planning capabilities
const PamTripAssistant = {
  suggestDestinations: (userPreferences, budget, timeframe) => {
    // AI-powered destination recommendations
  },
  
  optimizeRoute: (waypoints, constraints) => {
    // Route optimization with AI
  },
  
  estimateExpenses: (tripData, userSpendingHistory) => {
    // Personalized expense predictions
  }
};
```

### Maintenance Advisor
```typescript
// PAM maintenance intelligence
const PamMaintenanceAdvisor = {
  predictMaintenanceNeeds: (vehicleData, drivingPatterns) => {
    // Predictive maintenance scheduling
  },
  
  findServiceCenters: (location, serviceType, budget) => {
    // Personalized service recommendations
  },
  
  analyzeVehicleHealth: (maintenanceHistory, symptoms) => {
    // AI-powered diagnostics
  }
};
```

## Offline Functionality

### Cached Data Structure
```typescript
interface OfflineWheelsData {
  recentTrips: Trip[];
  savedRoutes: Route[];
  vehicleProfiles: Vehicle[];
  maintenanceSchedule: MaintenanceItem[];
  rvInventory: StorageItem[];
  fuelLogs: FuelEntry[];
}
```

### Offline Features
- Trip planning with cached map data
- Maintenance reminder notifications
- RV storage inventory access
- Fuel log entry and tracking
- Basic PAM assistance with cached responses

## User Experience

### Mobile Optimization
- Touch-friendly map controls
- Responsive tabbed interface
- Swipe gestures for navigation
- Offline-first design
- GPS integration for location services

### Accessibility
- Screen reader compatible
- Keyboard navigation support
- High contrast mode support
- Voice input integration
- Large touch targets for mobile

### Progressive Enhancement
- Works without JavaScript (basic functionality)
- Graceful offline degradation
- Fast loading with code splitting
- Service worker caching
- Background sync capabilities

## API Integration

### Backend Endpoints
```python
# app/api/wheels.py
@router.post("/plan-trip")
async def plan_trip(request: TripPlanRequest, user_id: str = Depends(verify_token))

@router.post("/fuel-log")
async def log_fuel_purchase(request: FuelLogRequest, user_id: str = Depends(verify_token))

@router.get("/maintenance")
async def check_maintenance(user_id: str = Depends(verify_token))

@router.post("/weather")
async def get_weather_forecast(request: WeatherRequest, user_id: str = Depends(verify_token))
```

### External Services
- **Mapbox**: Maps, routing, geocoding
- **Weather APIs**: Forecast and conditions
- **Fuel Price APIs**: Real-time gas prices
- **POI Services**: Points of interest data

## Security & Privacy

### Location Data Protection
- Optional location sharing with granular controls
- Secure coordinate storage with encryption
- Privacy-first design with user consent
- Data retention policies and cleanup
- Anonymous usage analytics

### API Security
- Secure API key management
- Rate limiting and usage monitoring
- Input validation and sanitization
- Error handling without data leakage

## Future Enhancements

### Planned Features
- Real-time traffic integration
- EV charging station network
- Campground reservation system
- Social trip sharing platform
- Advanced expense tracking integration
- Community-driven POI database

### AI Enhancements
- Computer vision for maintenance issues
- Natural language trip planning
- Predictive travel recommendations
- Smart packing suggestions
- Automated expense categorization

This comprehensive wheels system provides Grey Nomads and travelers with powerful tools for managing their mobile lifestyle, enhanced by PAM AI assistance and designed for reliability both online and offline.
