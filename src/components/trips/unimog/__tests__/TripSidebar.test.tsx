import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TripSidebar from '../TripSidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock the services and contexts
vi.mock('@/services/tripTemplateService', () => ({
  fetchTripTemplatesForRegion: vi.fn().mockResolvedValue([
    {
      id: '1',
      name: 'Pacific Coast Highway',
      description: 'Scenic coastal route',
      estimatedMiles: 1650,
      estimatedDays: 10,
      difficulty: 'intermediate',
      suggestedBudget: 2500,
    },
    {
      id: '2',
      name: 'Yellowstone Adventure',
      description: 'National park exploration',
      estimatedMiles: 2450,
      estimatedDays: 14,
      difficulty: 'beginner',
      suggestedBudget: 3200,
    },
  ]),
  TripTemplate: {} as any,
}));

vi.mock('@/context/RegionContext', () => ({
  useRegion: vi.fn(() => ({ region: 'west-coast' })),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Test wrapper
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

describe('TripSidebar', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    onCreateTrip: vi.fn(),
    onSelectTemplate: vi.fn(),
    onSearchLocation: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(
      <TestWrapper>
        <TripSidebar {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Trip Planner')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search locations...')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <TestWrapper>
        <TripSidebar {...mockProps} isOpen={false} />
      </TestWrapper>
    );

    expect(screen.queryByText('Trip Planner')).not.toBeInTheDocument();
  });

  it('displays all three tabs', () => {
    render(
      <TestWrapper>
        <TripSidebar {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByRole('tab', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'My Trips' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Templates' })).toBeInTheDocument();
  });

  it('handles location search', () => {
    render(
      <TestWrapper>
        <TripSidebar {...mockProps} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search locations...');
    fireEvent.change(searchInput, { target: { value: 'Yellowstone' } });
    fireEvent.submit(searchInput.closest('form')!);

    expect(mockProps.onSearchLocation).toHaveBeenCalledWith('Yellowstone');
  });

  it('does not search with empty query', () => {
    render(
      <TestWrapper>
        <TripSidebar {...mockProps} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search locations...');
    fireEvent.submit(searchInput.closest('form')!);

    expect(mockProps.onSearchLocation).not.toHaveBeenCalled();
  });

  it('displays quick action buttons in search tab', () => {
    render(
      <TestWrapper>
        <TripSidebar {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Find RV Parks Nearby')).toBeInTheDocument();
    expect(screen.getByText('Explore National Parks')).toBeInTheDocument();
    expect(screen.getByText('Discover Scenic Routes')).toBeInTheDocument();
  });

  it('triggers quick action searches', () => {
    render(
      <TestWrapper>
        <TripSidebar {...mockProps} />
      </TestWrapper>
    );

    const rvParksButton = screen.getByText('Find RV Parks Nearby');
    fireEvent.click(rvParksButton);

    expect(mockProps.onSearchLocation).toHaveBeenCalledWith('RV parks near me');
  });

  it('displays saved trips in My Trips tab', () => {
    render(
      <TestWrapper>
        <TripSidebar {...mockProps} />
      </TestWrapper>
    );

    // Switch to My Trips tab
    const tripsTab = screen.getByRole('tab', { name: 'My Trips' });
    fireEvent.click(tripsTab);

    expect(screen.getByText('Yellowstone Adventure')).toBeInTheDocument();
    expect(screen.getByText('Pacific Coast Highway')).toBeInTheDocument();
    expect(screen.getByText('2,450 miles')).toBeInTheDocument();
    expect(screen.getByText('1,650 miles')).toBeInTheDocument();
  });

  it('displays create new trip button', () => {
    render(
      <TestWrapper>
        <TripSidebar {...mockProps} />
      </TestWrapper>
    );

    // Switch to My Trips tab
    const tripsTab = screen.getByRole('tab', { name: 'My Trips' });
    fireEvent.click(tripsTab);

    const createButton = screen.getByText('Create New Trip');
    fireEvent.click(createButton);

    expect(mockProps.onCreateTrip).toHaveBeenCalled();
  });

  it('loads and displays templates in Templates tab', async () => {
    render(
      <TestWrapper>
        <TripSidebar {...mockProps} />
      </TestWrapper>
    );

    // Switch to Templates tab
    const templatesTab = screen.getByRole('tab', { name: 'Templates' });
    fireEvent.click(templatesTab);

    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('Pacific Coast Highway')).toBeInTheDocument();
      expect(screen.getByText('Yellowstone Adventure')).toBeInTheDocument();
    });

    // Check template details are displayed
    expect(screen.getByText('1650 miles')).toBeInTheDocument();
    expect(screen.getByText('10 days')).toBeInTheDocument();
    expect(screen.getByText('intermediate')).toBeInTheDocument();
    expect(screen.getByText('Budget: $2500')).toBeInTheDocument();
  });

  it('handles template selection', async () => {
    render(
      <TestWrapper>
        <TripSidebar {...mockProps} />
      </TestWrapper>
    );

    // Switch to Templates tab
    const templatesTab = screen.getByRole('tab', { name: 'Templates' });
    fireEvent.click(templatesTab);

    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('Pacific Coast Highway')).toBeInTheDocument();
    });

    // Click on a template
    const template = screen.getByText('Pacific Coast Highway').closest('div[class*="cursor-pointer"]');
    fireEvent.click(template!);

    expect(mockProps.onSelectTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Pacific Coast Highway',
      })
    );
  });

  it('displays recent searches', () => {
    render(
      <TestWrapper>
        <TripSidebar {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Recent Searches')).toBeInTheDocument();
    expect(screen.getByText('Yellowstone National Park')).toBeInTheDocument();
    expect(screen.getByText('Grand Canyon South Rim')).toBeInTheDocument();
    expect(screen.getByText('Zion National Park')).toBeInTheDocument();
  });

  it('applies correct difficulty color classes to badges', async () => {
    render(
      <TestWrapper>
        <TripSidebar {...mockProps} />
      </TestWrapper>
    );

    // Switch to Templates tab
    const templatesTab = screen.getByRole('tab', { name: 'Templates' });
    fireEvent.click(templatesTab);

    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('beginner')).toBeInTheDocument();
      expect(screen.getByText('intermediate')).toBeInTheDocument();
    });

    const beginnerBadge = screen.getByText('beginner');
    const intermediateBadge = screen.getByText('intermediate');

    expect(beginnerBadge.className).toContain('green');
    expect(intermediateBadge.className).toContain('yellow');
  });

  it('shows loading state while fetching templates', async () => {
    // Mock slow loading
    const { fetchTripTemplatesForRegion } = await import('@/services/tripTemplateService');
    (fetchTripTemplatesForRegion as any).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([]), 100))
    );

    render(
      <TestWrapper>
        <TripSidebar {...mockProps} />
      </TestWrapper>
    );

    // Switch to Templates tab
    const templatesTab = screen.getByRole('tab', { name: 'Templates' });
    fireEvent.click(templatesTab);

    // Should show loading spinner
    expect(screen.getByTestId('loader2')).toBeInTheDocument();
  });

  it('handles template loading error', async () => {
    // Mock error
    const { fetchTripTemplatesForRegion } = await import('@/services/tripTemplateService');
    (fetchTripTemplatesForRegion as any).mockRejectedValueOnce(new Error('Failed to load'));

    const { toast } = await import('sonner');

    render(
      <TestWrapper>
        <TripSidebar {...mockProps} />
      </TestWrapper>
    );

    // Switch to Templates tab
    const templatesTab = screen.getByRole('tab', { name: 'Templates' });
    fireEvent.click(templatesTab);

    // Wait for error handling
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load trip templates');
    });
  });

  it('shows retry button when no templates available', async () => {
    // Mock empty response
    const { fetchTripTemplatesForRegion } = await import('@/services/tripTemplateService');
    (fetchTripTemplatesForRegion as any).mockResolvedValueOnce([]);

    render(
      <TestWrapper>
        <TripSidebar {...mockProps} />
      </TestWrapper>
    );

    // Switch to Templates tab
    const templatesTab = screen.getByRole('tab', { name: 'Templates' });
    fireEvent.click(templatesTab);

    // Wait for empty state
    await waitFor(() => {
      expect(screen.getByText('No templates available for west-coast')).toBeInTheDocument();
    });

    // Check retry button exists
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();

    // Mock successful retry
    (fetchTripTemplatesForRegion as any).mockResolvedValueOnce([
      {
        id: '3',
        name: 'Route 66',
        description: 'Historic highway',
        estimatedMiles: 2400,
        estimatedDays: 12,
        difficulty: 'intermediate',
      },
    ]);

    // Click retry
    fireEvent.click(retryButton);

    // Should load templates again
    await waitFor(() => {
      expect(screen.getByText('Route 66')).toBeInTheDocument();
    });
  });
});