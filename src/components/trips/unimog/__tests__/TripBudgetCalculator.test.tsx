import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TripBudgetCalculator from '../TripBudgetCalculator';

// Mock the budget calculator service
vi.mock('@/components/wheels/trip-planner/services/BudgetCalculator', () => ({
  default: {
    calculateCosts: vi.fn().mockReturnValue({
      fuel: 250,
      campground: 450,
      food: 300,
      activities: 200,
      miscellaneous: 100,
      total: 1300,
    }),
  },
}));

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('TripBudgetCalculator', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    tripData: {
      waypoints: [
        { id: '1', name: 'Start', lat: 40, lng: -74, order: 0 },
        { id: '2', name: 'Stop 1', lat: 39, lng: -75, order: 1 },
        { id: '3', name: 'End', lat: 38, lng: -76, order: 2 },
      ],
      route: {
        distance: 450000, // meters
        duration: 21600,  // seconds (6 hours)
        geometry: 'mock-geometry',
      },
    },
    existingBudget: null as any,
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<TripBudgetCalculator {...mockProps} />);

    expect(screen.getByText('Trip Budget Calculator')).toBeInTheDocument();
    expect(screen.getByText('Trip Information')).toBeInTheDocument();
    expect(screen.getByText('Cost Settings')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<TripBudgetCalculator {...mockProps} isOpen={false} />);

    expect(screen.queryByText('Trip Budget Calculator')).not.toBeInTheDocument();
  });

  it('displays trip information correctly', () => {
    render(<TripBudgetCalculator {...mockProps} />);

    // Check distance (450km)
    expect(screen.getByText(/450\.0 km/)).toBeInTheDocument();
    // Check duration (6 hours)
    expect(screen.getByText(/6\.0 hours/)).toBeInTheDocument();
    // Check waypoints
    expect(screen.getByText(/3 waypoints/)).toBeInTheDocument();
  });

  it('calculates and displays cost breakdown', () => {
    render(<TripBudgetCalculator {...mockProps} />);

    expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
    expect(screen.getByText(/Fuel.*\$250/)).toBeInTheDocument();
    expect(screen.getByText(/Campground.*\$450/)).toBeInTheDocument();
    expect(screen.getByText(/Food.*\$300/)).toBeInTheDocument();
    expect(screen.getByText(/Activities.*\$200/)).toBeInTheDocument();
    expect(screen.getByText(/Miscellaneous.*\$100/)).toBeInTheDocument();
    expect(screen.getByText(/Total Estimated Cost.*\$1,300/)).toBeInTheDocument();
  });

  it('updates fuel price and recalculates', async () => {
    const BudgetCalculator = (await import('@/components/wheels/trip-planner/services/BudgetCalculator')).default;
    
    render(<TripBudgetCalculator {...mockProps} />);

    const fuelPriceInput = screen.getByLabelText(/Fuel Price/);
    
    // Change fuel price
    fireEvent.change(fuelPriceInput, { target: { value: '5.00' } });

    // Verify calculateCosts was called with updated settings
    await waitFor(() => {
      expect(BudgetCalculator.calculateCosts).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          fuelPrice: 5.00,
        })
      );
    });
  });

  it('updates MPG and recalculates', async () => {
    const BudgetCalculator = (await import('@/components/wheels/trip-planner/services/BudgetCalculator')).default;
    
    render(<TripBudgetCalculator {...mockProps} />);

    const mpgInput = screen.getByLabelText(/MPG/);
    
    // Change MPG
    fireEvent.change(mpgInput, { target: { value: '15' } });

    await waitFor(() => {
      expect(BudgetCalculator.calculateCosts).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          mpg: 15,
        })
      );
    });
  });

  it('updates campground cost and recalculates', async () => {
    const BudgetCalculator = (await import('@/components/wheels/trip-planner/services/BudgetCalculator')).default;
    
    render(<TripBudgetCalculator {...mockProps} />);

    const campgroundInput = screen.getByLabelText(/Campground/);
    
    // Change campground cost
    fireEvent.change(campgroundInput, { target: { value: '60' } });

    await waitFor(() => {
      expect(BudgetCalculator.calculateCosts).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          campgroundCost: 60,
        })
      );
    });
  });

  it('displays budget status when existing budget is provided', () => {
    const propsWithBudget = {
      ...mockProps,
      existingBudget: {
        amount: 1500,
        name: 'Summer Trip',
      },
    };

    render(<TripBudgetCalculator {...propsWithBudget} />);

    expect(screen.getByText('Budget Status')).toBeInTheDocument();
    expect(screen.getByText('Summer Trip')).toBeInTheDocument();
    expect(screen.getByText('$1,500')).toBeInTheDocument();
    expect(screen.getByText(/86\.7%/)).toBeInTheDocument(); // 1300/1500
    expect(screen.getByText(/\$200 under budget/)).toBeInTheDocument();
  });

  it('shows over budget warning when costs exceed budget', () => {
    const propsWithLowBudget = {
      ...mockProps,
      existingBudget: {
        amount: 1000,
        name: 'Limited Budget',
      },
    };

    render(<TripBudgetCalculator {...propsWithLowBudget} />);

    expect(screen.getByText(/130\.0%/)).toBeInTheDocument(); // 1300/1000
    expect(screen.getByText(/\$300 over budget/)).toBeInTheDocument();
    
    // Check for warning styling (red text)
    const overBudgetElement = screen.getByText(/\$300 over budget/);
    expect(overBudgetElement.className).toContain('text-red');
  });

  it('handles save budget button click', async () => {
    const { toast } = await import('sonner');
    
    render(<TripBudgetCalculator {...mockProps} />);

    const saveButton = screen.getByText('Save Budget');
    fireEvent.click(saveButton);

    expect(mockProps.onSave).toHaveBeenCalledWith({
      fuel: 250,
      campground: 450,
      food: 300,
      activities: 200,
      miscellaneous: 100,
      total: 1300,
    });

    expect(toast.success).toHaveBeenCalledWith('Budget saved successfully');
  });

  it('handles close button click', () => {
    render(<TripBudgetCalculator {...mockProps} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('displays message when no route data is available', () => {
    const propsWithoutRoute = {
      ...mockProps,
      tripData: {
        waypoints: [],
        route: null,
      },
    };

    render(<TripBudgetCalculator {...propsWithoutRoute} />);

    expect(screen.getByText('No route data available')).toBeInTheDocument();
    expect(screen.getByText('Plan a route first to calculate budget')).toBeInTheDocument();
  });

  it('updates all cost settings correctly', async () => {
    const BudgetCalculator = (await import('@/components/wheels/trip-planner/services/BudgetCalculator')).default;
    
    render(<TripBudgetCalculator {...mockProps} />);

    // Update multiple settings
    const fuelInput = screen.getByLabelText(/Fuel Price/);
    const campgroundInput = screen.getByLabelText(/Campground/);
    const foodInput = screen.getByLabelText(/Food/);
    const activitiesInput = screen.getByLabelText(/Activities/);
    const miscInput = screen.getByLabelText(/Miscellaneous/);

    fireEvent.change(fuelInput, { target: { value: '5.50' } });
    fireEvent.change(campgroundInput, { target: { value: '75' } });
    fireEvent.change(foodInput, { target: { value: '80' } });
    fireEvent.change(activitiesInput, { target: { value: '60' } });
    fireEvent.change(miscInput, { target: { value: '40' } });

    await waitFor(() => {
      expect(BudgetCalculator.calculateCosts).toHaveBeenLastCalledWith(
        expect.any(Object),
        expect.objectContaining({
          fuelPrice: 5.50,
          campgroundCost: 75,
          foodCost: 80,
          activitiesCost: 60,
          miscellaneousCost: 40,
        })
      );
    });
  });

  it('formats large numbers correctly', () => {
    const BudgetCalculator = (await import('@/components/wheels/trip-planner/services/BudgetCalculator')).default;
    (BudgetCalculator.calculateCosts as any).mockReturnValue({
      fuel: 1250,
      campground: 2450,
      food: 1300,
      activities: 800,
      miscellaneous: 500,
      total: 6300,
    });

    render(<TripBudgetCalculator {...mockProps} />);

    expect(screen.getByText(/\$6,300/)).toBeInTheDocument();
    expect(screen.getByText(/\$1,250/)).toBeInTheDocument();
    expect(screen.getByText(/\$2,450/)).toBeInTheDocument();
  });

  it('handles decimal input values correctly', () => {
    render(<TripBudgetCalculator {...mockProps} />);

    const fuelInput = screen.getByLabelText(/Fuel Price/) as HTMLInputElement;
    
    fireEvent.change(fuelInput, { target: { value: '4.99' } });
    
    expect(fuelInput.value).toBe('4.99');
  });

  it('prevents negative values in input fields', () => {
    render(<TripBudgetCalculator {...mockProps} />);

    const mpgInput = screen.getByLabelText(/MPG/) as HTMLInputElement;
    
    fireEvent.change(mpgInput, { target: { value: '-10' } });
    
    // Input should have min="0" attribute
    expect(mpgInput.getAttribute('min')).toBe('0');
  });
});