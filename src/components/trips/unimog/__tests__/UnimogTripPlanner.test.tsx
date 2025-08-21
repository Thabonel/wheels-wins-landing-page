import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UnimogTripPlanner from '../UnimogTripPlanner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock Mapbox GL
vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
      remove: vi.fn(),
      addControl: vi.fn(),
      removeControl: vi.fn(),
      getCenter: vi.fn(() => ({ lng: -120, lat: 40 })),
      getZoom: vi.fn(() => 10),
      flyTo: vi.fn(),
      setStyle: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      removeSource: vi.fn(),
      getSource: vi.fn(),
      getLayer: vi.fn(),
      setPaintProperty: vi.fn(),
      setLayoutProperty: vi.fn(),
      resize: vi.fn(),
    })),
    NavigationControl: vi.fn(),
    GeolocateControl: vi.fn(),
    ScaleControl: vi.fn(),
    AttributionControl: vi.fn(),
    Marker: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      getElement: vi.fn(() => document.createElement('div')),
    })),
    Popup: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      setHTML: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    })),
    supported: vi.fn(() => true),
  },
}));

// Mock child components
vi.mock('../TripSidebar', () => ({
  default: vi.fn(({ isOpen, onClose, onCreateTrip, onSelectTemplate, onSearchLocation }) => 
    isOpen ? (
      <div data-testid="trip-sidebar">
        <button onClick={onClose}>Close Sidebar</button>
        <button onClick={onCreateTrip}>Create Trip</button>
        <button onClick={() => onSelectTemplate({ name: 'Test Template' })}>Select Template</button>
        <button onClick={() => onSearchLocation('Test Location')}>Search Location</button>
      </div>
    ) : null
  ),
}));

vi.mock('../TripToolbar', () => ({
  default: vi.fn((props) => (
    <div data-testid="trip-toolbar">
      <button onClick={props.onUndo}>Undo</button>
      <button onClick={props.onRedo}>Redo</button>
      <button onClick={props.onAddWaypoint}>Add Waypoint</button>
      <button onClick={props.onOptimizeRoute}>Optimize Route</button>
      <button onClick={props.onClearRoute}>Clear Route</button>
      <button onClick={props.onSaveRoute}>Save Route</button>
      <button onClick={props.onLoadRoute}>Load Route</button>
      <button onClick={props.onExportGPX}>Export GPX</button>
      <button onClick={props.onImportGPX}>Import GPX</button>
      <button onClick={props.onBudgetCalculator}>Budget Calculator</button>
      <button onClick={props.onOpenPAM}>Open PAM</button>
    </div>
  )),
}));

vi.mock('../MapOverlaysDropdown', () => ({
  default: vi.fn(() => <div data-testid="map-overlays">Map Overlays</div>),
}));

vi.mock('../GPXModal', () => ({
  default: vi.fn(({ isOpen, onClose }) => 
    isOpen ? (
      <div data-testid="gpx-modal">
        <button onClick={onClose}>Close GPX Modal</button>
      </div>
    ) : null
  ),
}));

vi.mock('../modals/SaveRouteModal', () => ({
  default: vi.fn(({ isOpen, onClose }) => 
    isOpen ? (
      <div data-testid="save-route-modal">
        <button onClick={onClose}>Close Save Modal</button>
      </div>
    ) : null
  ),
}));

vi.mock('../modals/POIModal', () => ({
  default: vi.fn(({ isOpen, onClose }) => 
    isOpen ? (
      <div data-testid="poi-modal">
        <button onClick={onClose}>Close POI Modal</button>
      </div>
    ) : null
  ),
}));

vi.mock('../modals/SettingsModal', () => ({
  default: vi.fn(({ isOpen, onClose }) => 
    isOpen ? (
      <div data-testid="settings-modal">
        <button onClick={onClose}>Close Settings Modal</button>
      </div>
    ) : null
  ),
}));

vi.mock('../PamTripAssistant', () => ({
  default: vi.fn(({ isOpen, onClose }) => 
    isOpen ? (
      <div data-testid="pam-assistant">
        <button onClick={onClose}>Close PAM</button>
      </div>
    ) : null
  ),
}));

vi.mock('../TripBudgetCalculator', () => ({
  default: vi.fn(({ isOpen, onClose }) => 
    isOpen ? (
      <div data-testid="budget-calculator">
        <button onClick={onClose}>Close Budget Calculator</button>
      </div>
    ) : null
  ),
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('UnimogTripPlanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main trip planner interface', () => {
    render(
      <TestWrapper>
        <UnimogTripPlanner />
      </TestWrapper>
    );

    expect(screen.getByTestId('trip-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('map-overlays')).toBeInTheDocument();
  });

  it('toggles the sidebar when menu button is clicked', async () => {
    render(
      <TestWrapper>
        <UnimogTripPlanner />
      </TestWrapper>
    );

    // Sidebar should not be visible initially
    expect(screen.queryByTestId('trip-sidebar')).not.toBeInTheDocument();

    // Click menu button to open sidebar
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    // Sidebar should now be visible
    await waitFor(() => {
      expect(screen.getByTestId('trip-sidebar')).toBeInTheDocument();
    });

    // Click close button in sidebar
    const closeButton = screen.getByText('Close Sidebar');
    fireEvent.click(closeButton);

    // Sidebar should be hidden again
    await waitFor(() => {
      expect(screen.queryByTestId('trip-sidebar')).not.toBeInTheDocument();
    });
  });

  it('opens save route modal when save button is clicked', async () => {
    render(
      <TestWrapper>
        <UnimogTripPlanner />
      </TestWrapper>
    );

    // Click save route button in toolbar
    const saveButton = screen.getByText('Save Route');
    fireEvent.click(saveButton);

    // Save modal should open
    await waitFor(() => {
      expect(screen.getByTestId('save-route-modal')).toBeInTheDocument();
    });

    // Close the modal
    const closeButton = screen.getByText('Close Save Modal');
    fireEvent.click(closeButton);

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('save-route-modal')).not.toBeInTheDocument();
    });
  });

  it('opens GPX import/export modal', async () => {
    render(
      <TestWrapper>
        <UnimogTripPlanner />
      </TestWrapper>
    );

    // Click import GPX button
    const importButton = screen.getByText('Import GPX');
    fireEvent.click(importButton);

    // GPX modal should open
    await waitFor(() => {
      expect(screen.getByTestId('gpx-modal')).toBeInTheDocument();
    });

    // Close the modal
    const closeButton = screen.getByText('Close GPX Modal');
    fireEvent.click(closeButton);

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('gpx-modal')).not.toBeInTheDocument();
    });
  });

  it('opens PAM assistant when PAM button is clicked', async () => {
    render(
      <TestWrapper>
        <UnimogTripPlanner />
      </TestWrapper>
    );

    // Click PAM button
    const pamButton = screen.getByText('Open PAM');
    fireEvent.click(pamButton);

    // PAM assistant should open
    await waitFor(() => {
      expect(screen.getByTestId('pam-assistant')).toBeInTheDocument();
    });

    // Close PAM
    const closeButton = screen.getByText('Close PAM');
    fireEvent.click(closeButton);

    // PAM should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('pam-assistant')).not.toBeInTheDocument();
    });
  });

  it('opens budget calculator when budget button is clicked', async () => {
    render(
      <TestWrapper>
        <UnimogTripPlanner />
      </TestWrapper>
    );

    // Click budget calculator button
    const budgetButton = screen.getByText('Budget Calculator');
    fireEvent.click(budgetButton);

    // Budget calculator should open
    await waitFor(() => {
      expect(screen.getByTestId('budget-calculator')).toBeInTheDocument();
    });

    // Close calculator
    const closeButton = screen.getByText('Close Budget Calculator');
    fireEvent.click(closeButton);

    // Calculator should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('budget-calculator')).not.toBeInTheDocument();
    });
  });

  it('handles template selection from sidebar', async () => {
    render(
      <TestWrapper>
        <UnimogTripPlanner />
      </TestWrapper>
    );

    // Open sidebar
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByTestId('trip-sidebar')).toBeInTheDocument();
    });

    // Select a template
    const selectTemplateButton = screen.getByText('Select Template');
    fireEvent.click(selectTemplateButton);

    // Should trigger template selection (check console or mock)
    // In real implementation, this would load the template route
  });

  it('handles location search from sidebar', async () => {
    render(
      <TestWrapper>
        <UnimogTripPlanner />
      </TestWrapper>
    );

    // Open sidebar
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByTestId('trip-sidebar')).toBeInTheDocument();
    });

    // Search for a location
    const searchButton = screen.getByText('Search Location');
    fireEvent.click(searchButton);

    // Should trigger location search (check console or mock)
    // In real implementation, this would search and display results
  });

  it('clears route when clear button is clicked', () => {
    render(
      <TestWrapper>
        <UnimogTripPlanner />
      </TestWrapper>
    );

    // Click clear route button
    const clearButton = screen.getByText('Clear Route');
    fireEvent.click(clearButton);

    // Should clear waypoints and route
    // In real implementation, verify waypoints array is empty
  });

  it('handles undo and redo operations', () => {
    render(
      <TestWrapper>
        <UnimogTripPlanner />
      </TestWrapper>
    );

    // Click undo button
    const undoButton = screen.getByText('Undo');
    fireEvent.click(undoButton);

    // Click redo button
    const redoButton = screen.getByText('Redo');
    fireEvent.click(redoButton);

    // Should handle undo/redo operations
    // In real implementation, verify history stack changes
  });

  it('optimizes route when optimize button is clicked', () => {
    render(
      <TestWrapper>
        <UnimogTripPlanner />
      </TestWrapper>
    );

    // Click optimize route button
    const optimizeButton = screen.getByText('Optimize Route');
    fireEvent.click(optimizeButton);

    // Should trigger route optimization
    // In real implementation, verify waypoints are reordered
  });
});