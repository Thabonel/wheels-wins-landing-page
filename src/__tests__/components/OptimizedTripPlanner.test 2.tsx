import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, Mock } from 'vitest';
import OptimizedTripPlannerApp from '@/components/wheels/OptimizedTripPlannerApp';
import { useAuth } from '@/context/AuthContext';
import { useRegion } from '@/context/RegionContext';
import { useToast } from '@/hooks/use-toast';
import { getLocationBasedTripTemplates, incrementTemplateUsage } from '@/services/tripTemplateService';
import * as mapboxLoader from '@/utils/mapboxLoader';

// Mock dependencies
vi.mock('@/context/AuthContext');
vi.mock('@/context/RegionContext');
vi.mock('@/hooks/use-toast');
vi.mock('@/services/tripTemplateService');
vi.mock('@/utils/mapboxLoader');

// Mock lazy loaded components
vi.mock('@/components/wheels/trip-planner/LazyMapComponents', () => ({
  LazyIntegratedTripPlanner: () => <div data-testid="trip-planner">Trip Planner</div>,
  BudgetSidebar: () => <div data-testid="budget-sidebar">Budget Sidebar</div>,
  SocialSidebar: () => <div data-testid="social-sidebar">Social Sidebar</div>,
  SocialTripCoordinator: () => <div data-testid="social-coordinator">Social Coordinator</div>,
  NavigationExportHub: () => <div data-testid="nav-export">Navigation Export</div>,
  TripPlannerHeader: () => <div data-testid="trip-header">Trip Header</div>
}));

// Mock performance monitoring
vi.mock('@/components/common/PerformanceMonitor', () => ({
  usePerformanceMonitor: () => ({
    metrics: { mapLoadTime: 500, componentLoadTime: 100 },
    recordMapLoadTime: vi.fn()
  }),
  PerformanceOverlay: () => null
}));

describe('OptimizedTripPlannerApp', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockToast = vi.fn();
  const mockPreloadMapbox = vi.fn();
  const mockTemplates = [
    {
      id: '1',
      title: 'Pacific Coast Adventure',
      description: 'Scenic coastal route',
      suggestedBudget: 1500,
      estimatedDays: 7,
      route: {
        origin: { name: 'San Francisco, CA', coordinates: [-122.4194, 37.7749] },
        destination: { name: 'Los Angeles, CA', coordinates: [-118.2437, 34.0522] },
        waypoints: [{ name: 'Big Sur, CA', coordinates: [-121.9, 36.27] }]
      }
    },
    {
      id: '2',
      title: 'Southwest Desert Tour',
      description: 'Desert landscapes and national parks',
      suggestedBudget: 2000,
      estimatedDays: 10,
      route: null
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useAuth as Mock).mockReturnValue({ user: mockUser });
    (useRegion as Mock).mockReturnValue({ region: 'US' });
    (useToast as Mock).mockReturnValue({ toast: mockToast });
    (getLocationBasedTripTemplates as Mock).mockResolvedValue(mockTemplates);
    (incrementTemplateUsage as Mock).mockResolvedValue(undefined);
    (mapboxLoader.preloadMapbox as Mock).mockImplementation(mockPreloadMapbox);
    
    // Reset localStorage
    localStorage.clear();
  });

  describe('Welcome Screen', () => {
    it('shows welcome screen for non-authenticated users', () => {
      (useAuth as Mock).mockReturnValue({ user: null });
      
      render(<OptimizedTripPlannerApp />);
      
      expect(screen.getByText('Welcome to Trip Planner')).toBeInTheDocument();
      expect(screen.getByText('Plan your perfect RV adventure with smart routing and budgeting')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start planning/i })).toBeInTheDocument();
    });

    it('hides welcome screen when start planning is clicked', async () => {
      const user = userEvent.setup();
      (useAuth as Mock).mockReturnValue({ user: null });
      
      render(<OptimizedTripPlannerApp />);
      
      const startButton = screen.getByRole('button', { name: /start planning/i });
      await user.click(startButton);
      
      expect(screen.queryByText('Welcome to Trip Planner')).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /trip ideas/i })).toBeInTheDocument();
    });

    it('does not show welcome screen for authenticated users', () => {
      render(<OptimizedTripPlannerApp />);
      
      expect(screen.queryByText('Welcome to Trip Planner')).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /trip ideas/i })).toBeInTheDocument();
    });
  });

  describe('Performance Optimization', () => {
    it('preloads mapbox when hovering over planner tab', async () => {
      const user = userEvent.setup();
      render(<OptimizedTripPlannerApp />);
      
      const plannerTab = screen.getByRole('tab', { name: /trip planner/i });
      
      // Hover over tab
      await user.hover(plannerTab);
      
      expect(mockPreloadMapbox).toHaveBeenCalledTimes(1);
    });

    it('preloads mapbox when focusing planner tab', async () => {
      render(<OptimizedTripPlannerApp />);
      
      const plannerTab = screen.getByRole('tab', { name: /trip planner/i });
      
      // Focus tab
      fireEvent.focus(plannerTab);
      
      expect(mockPreloadMapbox).toHaveBeenCalledTimes(1);
    });

    it('only preloads mapbox once', async () => {
      const user = userEvent.setup();
      render(<OptimizedTripPlannerApp />);
      
      const plannerTab = screen.getByRole('tab', { name: /trip planner/i });
      
      // Multiple hover events
      await user.hover(plannerTab);
      await user.unhover(plannerTab);
      await user.hover(plannerTab);
      
      // Should still only be called once
      expect(mockPreloadMapbox).toHaveBeenCalledTimes(1);
    });

    it('does not load map component until needed', () => {
      render(<OptimizedTripPlannerApp />);
      
      // Trip planner should not be rendered initially
      expect(screen.queryByTestId('trip-planner')).not.toBeInTheDocument();
    });

    it('loads map when switching to planner tab after initialization', async () => {
      const user = userEvent.setup();
      render(<OptimizedTripPlannerApp />);
      
      // Click start planning on planner tab
      const plannerTab = screen.getByRole('tab', { name: /trip planner/i });
      await user.click(plannerTab);
      
      const startButton = screen.getByRole('button', { name: /start planning/i });
      await user.click(startButton);
      
      // Now trip planner should be loaded
      await waitFor(() => {
        expect(screen.getByTestId('trip-planner')).toBeInTheDocument();
      });
    });
  });

  describe('Template Loading', () => {
    it('loads templates based on user region', async () => {
      render(<OptimizedTripPlannerApp />);
      
      await waitFor(() => {
        expect(getLocationBasedTripTemplates).toHaveBeenCalledWith('US');
      });
      
      expect(screen.getByText('Pacific Coast Adventure')).toBeInTheDocument();
      expect(screen.getByText('Southwest Desert Tour')).toBeInTheDocument();
    });

    it('shows loading state while fetching templates', () => {
      (getLocationBasedTripTemplates as Mock).mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );
      
      render(<OptimizedTripPlannerApp />);
      
      // Should show loading skeletons
      expect(screen.getAllByRole('article')).toHaveLength(4); // 4 skeleton cards
    });

    it('handles template loading errors', async () => {
      (getLocationBasedTripTemplates as Mock).mockRejectedValue(new Error('Network error'));
      
      render(<OptimizedTripPlannerApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load trip suggestions. Please try again later.')).toBeInTheDocument();
      });
    });
  });

  describe('Template Usage', () => {
    it('applies template when clicked', async () => {
      const user = userEvent.setup();
      render(<OptimizedTripPlannerApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Pacific Coast Adventure')).toBeInTheDocument();
      });
      
      const templateCard = screen.getByText('Pacific Coast Adventure').closest('[class*="Card"]');
      await user.click(templateCard!);
      
      // Should increment usage
      expect(incrementTemplateUsage).toHaveBeenCalledWith('1');
      
      // Should switch to planner tab
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /trip planner/i })).toHaveAttribute('aria-selected', 'true');
      });
      
      // Should show toast
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Template Applied',
        description: 'Starting your Pacific Coast Adventure planning!'
      });
      
      // Should load trip planner
      expect(screen.getByTestId('trip-planner')).toBeInTheDocument();
    });

    it('shows template badge when template is applied', async () => {
      const user = userEvent.setup();
      render(<OptimizedTripPlannerApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Pacific Coast Adventure')).toBeInTheDocument();
      });
      
      const templateCard = screen.getByText('Pacific Coast Adventure').closest('[class*="Card"]');
      await user.click(templateCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Template')).toBeInTheDocument();
        expect(screen.getByText('Pacific Coast Adventure')).toBeInTheDocument();
      });
    });

    it('allows removing template', async () => {
      const user = userEvent.setup();
      render(<OptimizedTripPlannerApp />);
      
      // Apply template
      await waitFor(() => {
        expect(screen.getByText('Pacific Coast Adventure')).toBeInTheDocument();
      });
      
      const templateCard = screen.getByText('Pacific Coast Adventure').closest('[class*="Card"]');
      await user.click(templateCard!);
      
      // Remove template
      await waitFor(() => {
        const removeButton = screen.getByRole('button', { name: /×/i });
        return user.click(removeButton);
      });
      
      expect(screen.queryByText('Template')).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches between tabs correctly', async () => {
      const user = userEvent.setup();
      render(<OptimizedTripPlannerApp />);
      
      // Initially on trip ideas tab
      expect(screen.getByRole('tab', { name: /trip ideas/i })).toHaveAttribute('aria-selected', 'true');
      
      // Switch to planner
      await user.click(screen.getByRole('tab', { name: /trip planner/i }));
      expect(screen.getByRole('tab', { name: /trip planner/i })).toHaveAttribute('aria-selected', 'true');
      
      // Switch to social
      await user.click(screen.getByRole('tab', { name: /social/i }));
      expect(screen.getByRole('tab', { name: /social/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('social-coordinator')).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring', () => {
    it('shows performance overlay when enabled', () => {
      localStorage.setItem('showPerformance', 'true');
      
      const { container } = render(<OptimizedTripPlannerApp />);
      
      // Performance overlay should be rendered (but may be hidden)
      expect(container.innerHTML).toContain('mapLoadTime');
    });

    it('does not show performance overlay by default', () => {
      const { container } = render(<OptimizedTripPlannerApp />);
      
      // Performance overlay should not be rendered
      expect(container.innerHTML).not.toContain('mapLoadTime');
    });
  });

  describe('Map Loading States', () => {
    it('shows loading fallback while map loads', async () => {
      const user = userEvent.setup();
      render(<OptimizedTripPlannerApp />);
      
      // Start planning
      await user.click(screen.getByRole('tab', { name: /trip planner/i }));
      await user.click(screen.getByRole('button', { name: /start planning/i }));
      
      // Should show loading state initially
      expect(screen.getByText('Loading map...')).toBeInTheDocument();
    });

    it('shows ready state before initialization', async () => {
      const user = userEvent.setup();
      render(<OptimizedTripPlannerApp />);
      
      await user.click(screen.getByRole('tab', { name: /trip planner/i }));
      
      expect(screen.getByText('Ready to Plan Your Trip?')).toBeInTheDocument();
      expect(screen.getByText('Start from scratch or choose a template to begin')).toBeInTheDocument();
    });
  });

  describe('Sidebar Components', () => {
    it('renders all sidebar components when planner is active', async () => {
      const user = userEvent.setup();
      render(<OptimizedTripPlannerApp />);
      
      // Initialize planner
      await user.click(screen.getByRole('tab', { name: /trip planner/i }));
      await user.click(screen.getByRole('button', { name: /start planning/i }));
      
      await waitFor(() => {
        expect(screen.getByTestId('budget-sidebar')).toBeInTheDocument();
        expect(screen.getByTestId('social-sidebar')).toBeInTheDocument();
        expect(screen.getByTestId('nav-export')).toBeInTheDocument();
      });
    });
  });
});