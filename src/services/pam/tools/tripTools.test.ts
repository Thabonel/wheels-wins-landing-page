/**
 * Test suite for Trip Tools
 * Tests trip history, vehicle data, fuel records, and trip plans functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTripHistory,
  getVehicleData,
  getFuelData,
  getTripPlans,
  type Trip,
  type Vehicle,
  type FuelRecord,
  type TripPlan,
  type DateRange
} from './tripTools';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => mockPromise()),
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => mockPromise())
              }))
            }))
          }))
        })),
        single: vi.fn(() => mockPromise()),
        gte: vi.fn(() => ({
          order: vi.fn(() => mockPromise())
        })),
        lte: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => mockPromise())
          }))
        })),
        not: vi.fn(() => ({
          order: vi.fn(() => mockPromise())
        }))
      }))
    }))
  }))
};

const mockPromise = vi.fn();

// Mock logger
const mockLogger = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn()
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger
}));

describe('Trip Tools', () => {
  const TEST_USER_ID = 'test-user-123';
  const TEST_VEHICLE_ID = 'vehicle-456';
  const TEST_TRIP_ID = 'trip-789';

  beforeEach(() => {
    vi.clearAllMocks();
    mockPromise.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTripHistory', () => {
    const mockTripsData = [
      {
        id: TEST_TRIP_ID,
        user_id: TEST_USER_ID,
        title: 'Business Trip to Seattle',
        start_location: {
          address: '123 Main St, Portland, OR',
          coordinates: [-122.6765, 45.5152]
        },
        end_location: {
          address: '456 Pike St, Seattle, WA',
          coordinates: [-122.3328, 47.6061]
        },
        start_time: '2023-12-01T08:00:00Z',
        end_time: '2023-12-01T12:00:00Z',
        trip_type: 'business',
        distance_miles: 173,
        cost_breakdown: {
          fuel_cost: 35.50,
          tolls: 10.00,
          parking: 15.00,
          other: 0,
          total: 60.50
        },
        vehicle_id: TEST_VEHICLE_ID,
        status: 'completed',
        created_at: '2023-12-01T07:00:00Z',
        vehicles: {
          make: 'Toyota',
          model: 'Camry',
          year: 2020
        }
      }
    ];

    it('should successfully retrieve trip history', async () => {
      mockPromise.mockResolvedValueOnce({
        data: mockTripsData,
        error: null
      });

      const result = await getTripHistory(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].title).toBe('Business Trip to Seattle');
      expect(result.data?.[0].trip_type).toBe('business');
      expect(result.data?.[0].distance_miles).toBe(173);
      expect(result.message).toContain('Retrieved 1 trip(s) successfully');
    });

    it('should handle empty trip history', async () => {
      mockPromise.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await getTripHistory(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.message).toBe('No trips found for the specified criteria.');
    });

    it('should filter trips by date range', async () => {
      mockPromise.mockResolvedValueOnce({
        data: mockTripsData,
        error: null
      });

      const options = {
        start_date: '2023-12-01',
        end_date: '2023-12-31'
      };

      const result = await getTripHistory(TEST_USER_ID, options);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should filter trips by type', async () => {
      mockPromise.mockResolvedValueOnce({
        data: mockTripsData.filter(trip => trip.trip_type === 'business'),
        error: null
      });

      const result = await getTripHistory(TEST_USER_ID, { trip_type: 'business' });

      expect(result.success).toBe(true);
      expect(result.data?.[0].trip_type).toBe('business');
    });

    it('should handle database errors', async () => {
      mockPromise.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const result = await getTripHistory(TEST_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch trips');
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching trip history', expect.any(Object));
    });

    it('should apply limit correctly', async () => {
      const limitedData = mockTripsData.slice(0, 1);
      mockPromise.mockResolvedValueOnce({
        data: limitedData,
        error: null
      });

      const result = await getTripHistory(TEST_USER_ID, { limit: 1 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should handle trips with missing data gracefully', async () => {
      const incompleteTrip = {
        id: TEST_TRIP_ID,
        user_id: TEST_USER_ID,
        // Missing many fields
        status: 'completed',
        created_at: '2023-12-01T07:00:00Z'
      };

      mockPromise.mockResolvedValueOnce({
        data: [incompleteTrip],
        error: null
      });

      const result = await getTripHistory(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].title).toContain('Trip to'); // Default title
      expect(result.data?.[0].distance_miles).toBe(0); // Default value
    });

    it('should handle unexpected errors', async () => {
      mockPromise.mockRejectedValueOnce(new Error('Network error'));

      const result = await getTripHistory(TEST_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error in getTripHistory',
        expect.any(Error)
      );
    });
  });

  describe('getVehicleData', () => {
    const mockVehicleData = [
      {
        id: TEST_VEHICLE_ID,
        user_id: TEST_USER_ID,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Silver',
        license_plate: 'ABC123',
        fuel_type: 'gasoline',
        fuel_tank_capacity: 14.5,
        avg_mpg: 32.5,
        maintenance: {
          last_service_date: '2023-10-15',
          next_service_due: '2024-04-15',
          mileage: 45000,
          service_history: [
            {
              date: '2023-10-15',
              type: 'Oil Change',
              cost: 45.99,
              mileage: 45000,
              notes: 'Regular maintenance'
            }
          ]
        },
        insurance: {
          provider: 'State Farm',
          policy_number: 'SF123456',
          expiry_date: '2024-06-30',
          coverage_type: 'Full Coverage'
        },
        is_primary: true,
        created_at: '2023-01-15T10:00:00Z'
      }
    ];

    it('should successfully retrieve all vehicles', async () => {
      mockPromise.mockResolvedValueOnce({
        data: mockVehicleData,
        error: null
      });

      const result = await getVehicleData(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect((result.data as Vehicle[]).length).toBe(1);
      expect((result.data as Vehicle[])[0].make).toBe('Toyota');
      expect((result.data as Vehicle[])[0].model).toBe('Camry');
    });

    it('should retrieve specific vehicle by ID', async () => {
      mockPromise.mockResolvedValueOnce({
        data: mockVehicleData,
        error: null
      });

      const result = await getVehicleData(TEST_USER_ID, { vehicle_id: TEST_VEHICLE_ID });

      expect(result.success).toBe(true);
      expect((result.data as Vehicle).id).toBe(TEST_VEHICLE_ID);
      expect((result.data as Vehicle).make).toBe('Toyota');
    });

    it('should handle no vehicles found', async () => {
      mockPromise.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await getVehicleData(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.message).toBe('No vehicles found.');
    });

    it('should handle vehicle with minimal data', async () => {
      const minimalVehicle = {
        id: TEST_VEHICLE_ID,
        user_id: TEST_USER_ID,
        make: 'Honda',
        model: 'Civic',
        year: 2018,
        created_at: '2023-01-15T10:00:00Z'
        // Missing many optional fields
      };

      mockPromise.mockResolvedValueOnce({
        data: [minimalVehicle],
        error: null
      });

      const result = await getVehicleData(TEST_USER_ID);

      expect(result.success).toBe(true);
      const vehicle = (result.data as Vehicle[])[0];
      expect(vehicle.make).toBe('Honda');
      expect(vehicle.fuel_type).toBe('gasoline'); // Default value
      expect(vehicle.is_primary).toBe(false); // Default value
    });

    it('should handle database errors', async () => {
      mockPromise.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await getVehicleData(TEST_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch vehicles');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getFuelData', () => {
    const mockFuelData = [
      {
        id: 'fuel-record-1',
        user_id: TEST_USER_ID,
        vehicle_id: TEST_VEHICLE_ID,
        date: '2023-12-01',
        location: {
          station_name: 'Shell',
          address: '123 Gas St, Portland, OR',
          coordinates: [-122.6765, 45.5152]
        },
        fuel_type: 'Regular',
        gallons: 12.5,
        price_per_gallon: 3.45,
        total_cost: 43.13,
        odometer_reading: 45000,
        payment_method: 'Credit Card',
        created_at: '2023-12-01T15:30:00Z',
        vehicles: {
          make: 'Toyota',
          model: 'Camry',
          year: 2020
        }
      },
      {
        id: 'fuel-record-2',
        user_id: TEST_USER_ID,
        vehicle_id: TEST_VEHICLE_ID,
        date: '2023-12-15',
        location: {
          station_name: 'Exxon',
          address: '456 Fuel Ave, Portland, OR'
        },
        fuel_type: 'Regular',
        gallons: 11.8,
        price_per_gallon: 3.55,
        total_cost: 41.89,
        odometer_reading: 45300,
        created_at: '2023-12-15T12:15:00Z'
      }
    ];

    it('should successfully retrieve fuel data with summary', async () => {
      mockPromise.mockResolvedValueOnce({
        data: mockFuelData,
        error: null
      });

      const result = await getFuelData(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data?.records).toHaveLength(2);
      expect(result.data?.summary?.total_cost).toBeCloseTo(85.02, 2);
      expect(result.data?.summary?.total_gallons).toBeCloseTo(24.3, 1);
      expect(result.data?.summary?.records_count).toBe(2);
    });

    it('should handle empty fuel data', async () => {
      mockPromise.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await getFuelData(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data?.records).toHaveLength(0);
      expect(result.data?.summary?.total_cost).toBe(0);
      expect(result.message).toBe('No fuel records found for the specified criteria.');
    });

    it('should filter by date range', async () => {
      mockPromise.mockResolvedValueOnce({
        data: mockFuelData.slice(0, 1), // Only first record
        error: null
      });

      const dateRange: DateRange = {
        start_date: '2023-12-01',
        end_date: '2023-12-10'
      };

      const result = await getFuelData(TEST_USER_ID, { dateRange });

      expect(result.success).toBe(true);
      expect(result.data?.records).toHaveLength(1);
      expect(result.data?.records[0].date).toBe('2023-12-01');
    });

    it('should filter by vehicle ID', async () => {
      mockPromise.mockResolvedValueOnce({
        data: mockFuelData.filter(record => record.vehicle_id === TEST_VEHICLE_ID),
        error: null
      });

      const result = await getFuelData(TEST_USER_ID, { vehicle_id: TEST_VEHICLE_ID });

      expect(result.success).toBe(true);
      expect(result.data?.records.every(record => record.vehicle_id === TEST_VEHICLE_ID)).toBe(true);
    });

    it('should include station analysis when requested', async () => {
      mockPromise.mockResolvedValueOnce({
        data: mockFuelData,
        error: null
      });

      const result = await getFuelData(TEST_USER_ID, { include_stations: true });

      expect(result.success).toBe(true);
      expect(result.data?.stations).toBeDefined();
      expect(result.data?.stations).toHaveLength(2); // Shell and Exxon
      
      const shellStation = result.data?.stations?.find(s => s.name === 'Shell');
      expect(shellStation?.visit_count).toBe(1);
      expect(shellStation?.total_spent).toBeCloseTo(43.13, 2);
    });

    it('should handle fuel records with missing data', async () => {
      const incompleteRecord = {
        id: 'fuel-record-3',
        user_id: TEST_USER_ID,
        date: '2023-12-20',
        created_at: '2023-12-20T10:00:00Z'
        // Missing many fields
      };

      mockPromise.mockResolvedValueOnce({
        data: [incompleteRecord],
        error: null
      });

      const result = await getFuelData(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data?.records).toHaveLength(1);
      expect(result.data?.records[0].location.station_name).toBe('Unknown Station');
      expect(result.data?.records[0].gallons).toBe(0);
      expect(result.data?.records[0].total_cost).toBe(0);
    });

    it('should handle database errors', async () => {
      mockPromise.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const result = await getFuelData(TEST_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch fuel data');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getTripPlans', () => {
    const mockTripPlans = [
      {
        id: 'plan-1',
        user_id: TEST_USER_ID,
        title: 'Weekend Getaway to Coast',
        description: 'Relaxing weekend trip to the Oregon Coast',
        planned_date: '2024-01-15T08:00:00Z',
        destinations: [
          {
            name: 'Cannon Beach',
            address: 'Cannon Beach, OR',
            coordinates: [-123.9615, 45.8919],
            estimated_duration: 120
          }
        ],
        estimated_distance: 180,
        estimated_cost: {
          fuel: 45.00,
          tolls: 0,
          accommodation: 200.00,
          total: 245.00
        },
        vehicle_id: TEST_VEHICLE_ID,
        status: 'confirmed',
        created_at: '2024-01-01T10:00:00Z'
      }
    ];

    it('should successfully retrieve trip plans', async () => {
      mockPromise.mockResolvedValueOnce({
        data: mockTripPlans,
        error: null
      });

      const result = await getTripPlans(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].title).toBe('Weekend Getaway to Coast');
      expect(result.data?.[0].status).toBe('confirmed');
      expect(result.data?.[0].estimated_distance).toBe(180);
    });

    it('should handle no trip plans found', async () => {
      mockPromise.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await getTripPlans(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.message).toBe('No upcoming trip plans found.');
    });

    it('should apply limit correctly', async () => {
      mockPromise.mockResolvedValueOnce({
        data: mockTripPlans.slice(0, 1),
        error: null
      });

      const result = await getTripPlans(TEST_USER_ID, { limit: 1 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should handle trip plans with minimal data', async () => {
      const minimalPlan = {
        id: 'plan-2',
        user_id: TEST_USER_ID,
        title: 'Simple Trip',
        planned_date: '2024-02-01T10:00:00Z',
        created_at: '2024-01-15T10:00:00Z'
        // Missing many optional fields
      };

      mockPromise.mockResolvedValueOnce({
        data: [minimalPlan],
        error: null
      });

      const result = await getTripPlans(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].destinations).toEqual([]);
      expect(result.data?.[0].estimated_distance).toBe(0);
      expect(result.data?.[0].status).toBe('draft'); // Default value
    });

    it('should handle database errors', async () => {
      mockPromise.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await getTripPlans(TEST_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch trip plans');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty user ID gracefully', async () => {
      const result = await getTripHistory('');

      expect(result.success).toBe(false);
    });

    it('should handle very large datasets', async () => {
      const largeTripData = Array.from({ length: 1000 }, (_, i) => ({
        id: `trip-${i}`,
        user_id: TEST_USER_ID,
        title: `Trip ${i}`,
        start_time: '2023-01-01T00:00:00Z',
        status: 'completed',
        distance_miles: i * 10,
        created_at: '2023-01-01T00:00:00Z',
        cost_breakdown: { total: i * 5, fuel_cost: 0, tolls: 0, parking: 0, other: 0 }
      }));

      mockPromise.mockResolvedValueOnce({
        data: largeTripData.slice(0, 500), // Simulated limit
        error: null
      });

      const result = await getTripHistory(TEST_USER_ID, { limit: 500 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(500);
    });

    it('should handle network timeouts gracefully', async () => {
      mockPromise.mockRejectedValueOnce(new Error('Request timeout'));

      const result = await getVehicleData(TEST_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(result.message).toContain('unexpected error occurred');
    });

    it('should handle malformed date ranges', async () => {
      const invalidDateRange = {
        start_date: 'invalid-date',
        end_date: '2023-12-31'
      };

      mockPromise.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await getFuelData(TEST_USER_ID, { dateRange: invalidDateRange });

      expect(result.success).toBe(true); // Should still work, filtering will be handled by DB
      expect(result.data?.records).toHaveLength(0);
    });
  });

  describe('Data Integrity', () => {
    it('should calculate fuel efficiency correctly', async () => {
      const fuelRecordsWithOdometer = [
        {
          id: 'fuel-1',
          user_id: TEST_USER_ID,
          vehicle_id: TEST_VEHICLE_ID,
          date: '2023-12-01',
          location: { station_name: 'Shell', address: '123 Main St' },
          fuel_type: 'Regular',
          gallons: 12,
          price_per_gallon: 3.50,
          total_cost: 42.00,
          odometer_reading: 45000,
          created_at: '2023-12-01T10:00:00Z'
        },
        {
          id: 'fuel-2',
          user_id: TEST_USER_ID,
          vehicle_id: TEST_VEHICLE_ID,
          date: '2023-12-15',
          location: { station_name: 'Exxon', address: '456 Oak Ave' },
          fuel_type: 'Regular',
          gallons: 10,
          price_per_gallon: 3.60,
          total_cost: 36.00,
          odometer_reading: 45320, // 320 miles driven
          created_at: '2023-12-15T10:00:00Z'
        }
      ];

      mockPromise.mockResolvedValueOnce({
        data: fuelRecordsWithOdometer,
        error: null
      });

      const result = await getFuelData(TEST_USER_ID, { include_efficiency: true });

      expect(result.success).toBe(true);
      expect(result.data?.efficiency).toBeDefined();
      expect(result.data?.efficiency?.avg_mpg).toBeCloseTo(32, 0); // 320 miles / 10 gallons = 32 MPG
    });

    it('should handle currency calculations precisely', async () => {
      const precisionFuelData = [
        {
          id: 'fuel-precision',
          user_id: TEST_USER_ID,
          date: '2023-12-01',
          location: { station_name: 'Test Station', address: 'Test Address' },
          fuel_type: 'Regular',
          gallons: 10.333,
          price_per_gallon: 3.179,
          total_cost: 32.85, // 10.333 * 3.179 = 32.848507
          created_at: '2023-12-01T10:00:00Z'
        }
      ];

      mockPromise.mockResolvedValueOnce({
        data: precisionFuelData,
        error: null
      });

      const result = await getFuelData(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data?.summary?.total_cost).toBe(32.85);
      expect(result.data?.summary?.average_price_per_gallon).toBeCloseTo(3.179, 3);
    });
  });
});