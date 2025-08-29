import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTripStatus } from '../useTripStatus';
import { useAuth } from '@/context/AuthContext';
import { useCachedTripData } from '../useCachedTripData';

// Mock dependencies
vi.mock('@/context/AuthContext');
vi.mock('../useCachedTripData');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

// Mock fetch for weather API
global.fetch = vi.fn();

describe('useTripStatus', () => {
  const mockUser = { id: 'test-user-123', getIdToken: vi.fn() };
  const mockCachedTrip = {
    originName: 'Sydney',
    destName: 'Melbourne',
    origin: [151.2093, -33.8688] as [number, number],
    destination: [144.9631, -37.8136] as [number, number],
    waypoints: [
      { name: 'Canberra', coords: [149.1300, -35.2809] as [number, number] }
    ],
    suggestions: [],
    routeProfile: 'driving',
    mode: 'standard',
    timestamp: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        weather: [{ main: 'Clear' }],
        main: { temp: 25 }
      })
    });
  });

  it('should return null when no user is authenticated', () => {
    (useAuth as any).mockReturnValue({ user: null });
    (useCachedTripData as any).mockReturnValue({ cachedTrip: null });

    const { result } = renderHook(() => useTripStatus());

    expect(result.current.tripStatus).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.hasActiveTrip).toBe(false);
  });

  it('should return null when no cached trip data exists', async () => {
    (useCachedTripData as any).mockReturnValue({ cachedTrip: null });

    const { result } = renderHook(() => useTripStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tripStatus).toBeNull();
    expect(result.current.hasActiveTrip).toBe(false);
  });

  it('should calculate trip status from cached trip data', async () => {
    (useCachedTripData as any).mockReturnValue({ cachedTrip: mockCachedTrip });

    const { result } = renderHook(() => useTripStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tripStatus).toBeTruthy();
    expect(result.current.tripStatus?.isActive).toBe(true);
    expect(result.current.tripStatus?.origin).toBe('Sydney');
    expect(result.current.tripStatus?.destination).toBe('Melbourne');
    expect(result.current.tripStatus?.nextStop?.name).toBe('Canberra');
    expect(result.current.hasActiveTrip).toBe(true);
  });

  it('should fetch weather data for next stop', async () => {
    (useCachedTripData as any).mockReturnValue({ cachedTrip: mockCachedTrip });

    const { result } = renderHook(() => useTripStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalled();
    expect(result.current.tripStatus?.weatherAtDestination).toEqual({
      condition: 'Clear',
      temperature: 25
    });
  });

  it('should handle weather API errors gracefully', async () => {
    (useCachedTripData as any).mockReturnValue({ cachedTrip: mockCachedTrip });
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTripStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should still return trip status with default weather
    expect(result.current.tripStatus).toBeTruthy();
    expect(result.current.tripStatus?.weatherAtDestination).toEqual({
      condition: 'Clear',
      temperature: 25
    });
  });

  it('should refresh trip status', async () => {
    (useCachedTripData as any).mockReturnValue({ cachedTrip: mockCachedTrip });

    const { result } = renderHook(() => useTripStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear previous calls
    vi.clearAllMocks();

    // Trigger refresh
    await result.current.refreshTripStatus();

    // Should fetch weather again
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should calculate trip progress correctly', async () => {
    (useCachedTripData as any).mockReturnValue({ cachedTrip: mockCachedTrip });

    const { result } = renderHook(() => useTripStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const status = result.current.tripStatus;
    expect(status?.totalDistance).toBeGreaterThan(0);
    expect(status?.completedDistance).toBe(0); // At first stop
    expect(status?.percentageComplete).toBe(0);
    expect(status?.distanceRemaining).toBe(status?.totalDistance);
  });

  it('should handle errors during calculation', async () => {
    const invalidTrip = { ...mockCachedTrip, origin: null };
    (useCachedTripData as any).mockReturnValue({ cachedTrip: invalidTrip });

    const { result } = renderHook(() => useTripStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.tripStatus).toBeNull();
  });
});