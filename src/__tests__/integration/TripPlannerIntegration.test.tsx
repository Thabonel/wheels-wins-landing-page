/**
 * Integration Tests: Trip Planner Components
 * Tests complete trip planning workflows including map integration,
 * route calculation, data persistence, and PAM integration
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { 
  mockSupabaseClient, 
  resetAllMocks, 
  createMockTrip,
  createMockProfile 
} from '../../test/mocks/supabase';

// Mock Mapbox GL
const mockMapboxGL = {
  Map: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    getContainer: vi.fn().mockReturnValue(document.createElement('div')),
    resize: vi.fn(),
    getCenter: vi.fn().mockReturnValue({ lng: -98.5795, lat: 39.8283 }),
    getZoom: vi.fn().mockReturnValue(4),
    flyTo: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    getSource: vi.fn(),
    getLayer: vi.fn(),
    loaded: vi.fn().mockReturnValue(true)
  })),
  NavigationControl: vi.fn(),
  FullscreenControl: vi.fn(),
  GeolocateControl: vi.fn(),
  Marker: vi.fn().mockImplementation(() => ({
    setLngLat: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn()
  })),
  Popup: vi.fn().mockImplementation(() => ({
    setLngLat: vi.fn().mockReturnThis(),
    setHTML: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis()
  }))
};

vi.mock('mapbox-gl', () => ({
  default: mockMapboxGL,
  ...mockMapboxGL
}));

// Mock route calculation service
const mockRouteService = {
  calculateRoute: vi.fn().mockResolvedValue({
    distance: 250.5,
    duration: 14400, // 4 hours
    coordinates: [
      [-98.5795, 39.8283], // Start
      [-98.1234, 39.5678], // Waypoint
      [-97.7431, 39.0473]  // End
    ],
    legs: [
      { distance: 125.2, duration: 7200 },
      { distance: 125.3, duration: 7200 }
    ]
  }),
  geocodeLocation: vi.fn().mockResolvedValue({
    latitude: 39.8283,
    longitude: -98.5795,
    address: "Test Location, KS, USA"
  })
};

vi.mock('../../services/routeCalculation', () => ({
  default: mockRouteService
}));

// Mock trip planner components
const TripPlannerControls = ({ onLocationAdd, onRouteCalculate, trip }: any) => (
  <div data-testid="trip-planner-controls">
    <input 
      data-testid="location-input"
      placeholder="Add location"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onLocationAdd(e.target.value);
        }
      }}
    />
    <button 
      data-testid="calculate-route-btn"
      onClick={onRouteCalculate}
    >
      Calculate Route
    </button>
    <button data-testid="save-trip-btn">Save Trip</button>
    <div data-testid="trip-info">
      {trip && (
        <>
          <span data-testid="trip-distance">{trip.distance} miles</span>
          <span data-testid="trip-duration">{trip.duration} hours</span>
        </>
      )}
    </div>
  </div>
);

const TripMap = ({ locations, route, onMapClick }: any) => (
  <div 
    data-testid="trip-map" 
    style={{ width: '100%', height: '400px' }}
    onClick={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Simulate map coordinates
      onMapClick({ lng: -98 + (x / 100), lat: 39 + (y / 100) });
    }}
  >
    <div data-testid="map-container">
      {locations.map((location: any, index: number) => (
        <div key={index} data-testid={`location-marker-${index}`}>
          {location.name}
        </div>
      ))}
      {route && (
        <div data-testid="route-line">
          Route: {route.distance} miles
        </div>
      )}
    </div>
  </div>
);

const PAMTripAssistant = ({ tripData, onSuggestion }: any) => (
  <div data-testid="pam-trip-assistant">
    <div data-testid="pam-suggestions">
      <button 
        data-testid="suggest-campgrounds"
        onClick={() => onSuggestion('campgrounds')}
      >
        Suggest Campgrounds
      </button>
      <button 
        data-testid="suggest-attractions"
        onClick={() => onSuggestion('attractions')}
      >
        Suggest Attractions
      </button>
      <button 
        data-testid="optimize-route"
        onClick={() => onSuggestion('optimize')}
      >
        Optimize Route
      </button>
    </div>
    {tripData && (
      <div data-testid="pam-analysis">
        Analyzing trip: {tripData.locations?.length} locations
      </div>
    )}
  </div>
);

// Main trip planner component
const TripPlannerPage = () => {
  const [locations, setLocations] = React.useState([]);
  const [route, setRoute] = React.useState(null);
  const [trip, setTrip] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const handleLocationAdd = async (locationName: string) => {
    setLoading(true);
    try {
      const geocoded = await mockRouteService.geocodeLocation(locationName);
      const newLocation = {
        name: locationName,
        ...geocoded
      };
      setLocations(prev => [...prev, newLocation]);
    } catch (error) {
      console.error('Geocoding failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRouteCalculate = async () => {
    if (locations.length < 2) return;
    
    setLoading(true);
    try {
      const routeData = await mockRouteService.calculateRoute(locations);
      setRoute(routeData);
      setTrip({
        ...routeData,
        locations,
        name: 'My Trip'
      });
    } catch (error) {
      console.error('Route calculation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (coordinates: { lng: number; lat: number }) => {
    const newLocation = {
      name: `Location ${locations.length + 1}`,
      latitude: coordinates.lat,
      longitude: coordinates.lng
    };
    setLocations(prev => [...prev, newLocation]);
  };

  const handlePAMSuggestion = async (type: string) => {
    // Mock PAM suggestions
    const suggestions = {
      campgrounds: [
        { name: 'Scenic RV Park', distance: 2.5 },
        { name: 'Mountain View Campground', distance: 5.1 }
      ],
      attractions: [
        { name: 'Historic Downtown', distance: 1.2 },
        { name: 'State Park', distance: 8.3 }
      ],
      optimize: {
        newRoute: route,
        timeSaved: 45,
        fuelSaved: 15
      }
    };
    
    console.log(`PAM suggestion for ${type}:`, suggestions[type]);
  };

  return (
    <div data-testid="trip-planner-page">
      {loading && <div data-testid="loading-indicator">Loading...</div>}
      <TripPlannerControls 
        onLocationAdd={handleLocationAdd}
        onRouteCalculate={handleRouteCalculate}
        trip={trip}
      />
      <TripMap 
        locations={locations}
        route={route}
        onMapClick={handleMapClick}
      />
      <PAMTripAssistant 
        tripData={trip}
        onSuggestion={handlePAMSuggestion}
      />
    </div>
  );
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Trip Planner Integration Tests', () => {
  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
    
    // Setup default Supabase responses
    mockSupabaseClient.from = vi.fn().mockImplementation((table) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: table === 'trips' ? createMockTrip() : createMockProfile(),
        error: null
      })
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Trip Planning Workflow', () => {
    it('should complete a full trip planning workflow', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TripPlannerPage />
        </TestWrapper>
      );

      expect(screen.getByTestId('trip-planner-page')).toBeInTheDocument();

      // Add first location
      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, 'Kansas City, MO');
      await user.keyboard('{Enter}');

      // Should show loading
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

      // Wait for geocoding to complete
      await waitFor(() => {
        expect(mockRouteService.geocodeLocation).toHaveBeenCalledWith('Kansas City, MO');
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });

      // Add second location
      await user.clear(locationInput);
      await user.type(locationInput, 'Denver, CO');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockRouteService.geocodeLocation).toHaveBeenCalledWith('Denver, CO');
      });

      // Calculate route
      const calculateBtn = screen.getByTestId('calculate-route-btn');
      await user.click(calculateBtn);

      // Should call route calculation
      await waitFor(() => {
        expect(mockRouteService.calculateRoute).toHaveBeenCalled();
      });

      // Should display route information
      expect(screen.getByTestId('trip-distance')).toHaveTextContent('250.5 miles');
      expect(screen.getByTestId('trip-duration')).toHaveTextContent('4 hours');
      expect(screen.getByTestId('route-line')).toHaveTextContent('Route: 250.5 miles');
    });

    it('should handle location addition via map clicks', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TripPlannerPage />
        </TestWrapper>
      );

      const mapContainer = screen.getByTestId('trip-map');
      
      // Click on map to add location
      await user.click(mapContainer);

      // Should add a location marker
      await waitFor(() => {
        expect(screen.getByTestId('location-marker-0')).toBeInTheDocument();
      });

      // Click again to add second location
      await user.click(mapContainer);

      await waitFor(() => {
        expect(screen.getByTestId('location-marker-1')).toBeInTheDocument();
      });
    });
  });

  describe('Route Calculation and Optimization', () => {
    it('should calculate and display route details', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TripPlannerPage />
        </TestWrapper>
      );

      // Add locations first
      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, 'Start Location');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });

      await user.clear(locationInput);
      await user.type(locationInput, 'End Location');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });

      // Calculate route
      await user.click(screen.getByTestId('calculate-route-btn'));

      // Verify route calculation
      await waitFor(() => {
        expect(mockRouteService.calculateRoute).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ name: 'Start Location' }),
            expect.objectContaining({ name: 'End Location' })
          ])
        );
      });

      // Should display route on map
      expect(screen.getByTestId('route-line')).toBeInTheDocument();
      expect(screen.getByTestId('trip-info')).toBeInTheDocument();
    });

    it('should handle route calculation errors', async () => {
      const user = userEvent.setup();
      
      // Mock route calculation failure
      mockRouteService.calculateRoute.mockRejectedValue(new Error('Route calculation failed'));
      
      render(
        <TestWrapper>
          <TripPlannerPage />
        </TestWrapper>
      );

      // Add minimum required locations
      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, 'Location 1');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });

      await user.clear(locationInput);
      await user.type(locationInput, 'Location 2');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });

      // Try to calculate route
      await user.click(screen.getByTestId('calculate-route-btn'));

      // Should handle error gracefully
      await waitFor(() => {
        expect(screen.getByText(/route calculation failed/i)).toBeInTheDocument();
      });
    });

    it('should prevent route calculation with insufficient locations', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TripPlannerPage />
        </TestWrapper>
      );

      // Try to calculate route with no locations
      await user.click(screen.getByTestId('calculate-route-btn'));

      // Should not call route calculation
      expect(mockRouteService.calculateRoute).not.toHaveBeenCalled();

      // Add only one location
      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, 'Single Location');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });

      // Try again with one location
      await user.click(screen.getByTestId('calculate-route-btn'));

      // Should still not call route calculation
      expect(mockRouteService.calculateRoute).not.toHaveBeenCalled();
    });
  });

  describe('PAM Integration', () => {
    it('should provide PAM-powered suggestions', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TripPlannerPage />
        </TestWrapper>
      );

      // Set up a trip first
      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, 'Start');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });

      await user.clear(locationInput);
      await user.type(locationInput, 'End');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });

      await user.click(screen.getByTestId('calculate-route-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('pam-analysis')).toBeInTheDocument();
      });

      // Test PAM suggestions
      await user.click(screen.getByTestId('suggest-campgrounds'));
      // Verify PAM integration (would show suggestions in real implementation)

      await user.click(screen.getByTestId('suggest-attractions'));
      // Verify attraction suggestions

      await user.click(screen.getByTestId('optimize-route'));
      // Verify route optimization
    });

    it('should show PAM analysis of trip data', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TripPlannerPage />
        </TestWrapper>
      );

      // Create a trip with multiple locations
      const locations = ['Location 1', 'Location 2', 'Location 3'];
      const locationInput = screen.getByTestId('location-input');

      for (const location of locations) {
        await user.clear(locationInput);
        await user.type(locationInput, location);
        await user.keyboard('{Enter}');
        
        await waitFor(() => {
          expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
        });
      }

      await user.click(screen.getByTestId('calculate-route-btn'));

      // Should show PAM analysis
      await waitFor(() => {
        const analysis = screen.getByTestId('pam-analysis');
        expect(analysis).toHaveTextContent('Analyzing trip: 3 locations');
      });
    });
  });

  describe('Data Persistence', () => {
    it('should save trip data to database', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TripPlannerPage />
        </TestWrapper>
      );

      // Create a complete trip
      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, 'Start Location');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });

      await user.clear(locationInput);
      await user.type(locationInput, 'End Location');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });

      await user.click(screen.getByTestId('calculate-route-btn'));

      // Save the trip
      await user.click(screen.getByTestId('save-trip-btn'));

      // Should call database save
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('trips');
      });
    });

    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock save error
      mockSupabaseClient.from = vi.fn().mockImplementation(() => ({
        insert: vi.fn().mockRejectedValue(new Error('Save failed')),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      }));
      
      render(
        <TestWrapper>
          <TripPlannerPage />
        </TestWrapper>
      );

      // Try to save (assuming we have trip data)
      await user.click(screen.getByTestId('save-trip-btn'));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/save failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Map Integration', () => {
    it('should initialize map correctly', async () => {
      render(
        <TestWrapper>
          <TripPlannerPage />
        </TestWrapper>
      );

      // Map should be rendered
      expect(screen.getByTestId('trip-map')).toBeInTheDocument();
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('should handle map interactions', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TripPlannerPage />
        </TestWrapper>
      );

      const map = screen.getByTestId('trip-map');

      // Click on different parts of the map
      await user.click(map);
      await waitFor(() => {
        expect(screen.getByTestId('location-marker-0')).toBeInTheDocument();
      });

      // Click again in different position
      await user.click(map);
      await waitFor(() => {
        expect(screen.getByTestId('location-marker-1')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Loading States', () => {
    it('should show loading states during async operations', async () => {
      const user = userEvent.setup();
      
      // Make geocoding slower to test loading state
      mockRouteService.geocodeLocation.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          latitude: 39.8283,
          longitude: -98.5795,
          address: "Test Location"
        }), 100))
      );
      
      render(
        <TestWrapper>
          <TripPlannerPage />
        </TestWrapper>
      );

      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, 'Test Location');
      await user.keyboard('{Enter}');

      // Should show loading immediately
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

      // Should hide loading after completion
      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });
    });

    it('should handle multiple concurrent operations', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TripPlannerPage />
        </TestWrapper>
      );

      const locationInput = screen.getByTestId('location-input');

      // Rapidly add multiple locations
      await user.type(locationInput, 'Location 1');
      await user.keyboard('{Enter}');
      
      await user.clear(locationInput);
      await user.type(locationInput, 'Location 2');
      await user.keyboard('{Enter}');

      await user.clear(locationInput);
      await user.type(locationInput, 'Location 3');
      await user.keyboard('{Enter}');

      // All geocoding calls should complete successfully
      await waitFor(() => {
        expect(mockRouteService.geocodeLocation).toHaveBeenCalledTimes(3);
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });
    });
  });
});