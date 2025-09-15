/**
 * Integration Tests for Tool Executor
 * Tests actual tool execution with mock data scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeToolCall,
  formatToolResponse,
  validateToolParams,
  type ToolExecutionResult,
  type ValidationResult
} from './toolExecutor';

// Mock the logger
const mockLogger = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn()
};

vi.mock('@/lib/logger', () => ({
  logger: mockLogger
}));

// Mock Supabase client with realistic data
const createMockSupabase = () => {
  const mockData: Record<string, any> = {
    profiles: {
      'user-123': {
        id: 'user-123',
        email: 'john@example.com',
        full_name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2023-01-15T10:00:00Z',
        updated_at: '2023-12-01T15:30:00Z'
      }
    },
    user_settings: {
      'user-123': {
        id: 'settings-123',
        user_id: 'user-123',
        notifications: {
          email_enabled: true,
          push_enabled: false,
          budget_alerts: true,
          trip_reminders: true,
          bill_reminders: false
        },
        privacy: {
          data_sharing: false,
          analytics_tracking: true,
          location_tracking: true
        },
        display: {
          theme: 'dark',
          currency: 'USD',
          date_format: 'MM/DD/YYYY',
          language: 'en'
        },
        integrations: {
          bank_connected: true,
          calendar_synced: false,
          vehicle_connected: true
        }
      }
    },
    trips: [
      {
        id: 'trip-1',
        user_id: 'user-123',
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
        end_time: '2023-12-01T14:00:00Z',
        trip_type: 'business',
        distance_miles: 173,
        cost_breakdown: {
          fuel_cost: 35.50,
          tolls: 12.00,
          parking: 15.00,
          other: 8.50,
          total: 71.00
        },
        vehicle_id: 'vehicle-1',
        status: 'completed',
        created_at: '2023-12-01T07:00:00Z'
      },
      {
        id: 'trip-2',
        user_id: 'user-123',
        title: 'Weekend Coast Trip',
        start_location: {
          address: '789 Oak Ave, Portland, OR',
          coordinates: [-122.6765, 45.5152]
        },
        end_location: {
          address: 'Cannon Beach, OR',
          coordinates: [-123.9615, 45.8919]
        },
        start_time: '2023-11-15T09:00:00Z',
        end_time: '2023-11-17T18:00:00Z',
        trip_type: 'personal',
        distance_miles: 190,
        cost_breakdown: {
          fuel_cost: 42.80,
          tolls: 0,
          parking: 20.00,
          other: 150.00,
          total: 212.80
        },
        vehicle_id: 'vehicle-1',
        status: 'completed',
        created_at: '2023-11-14T20:00:00Z'
      }
    ],
    vehicles: [
      {
        id: 'vehicle-1',
        user_id: 'user-123',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Silver',
        license_plate: 'PDX123',
        fuel_type: 'gasoline',
        fuel_tank_capacity: 14.5,
        avg_mpg: 32.5,
        maintenance: {
          last_service_date: '2023-10-15',
          next_service_due: '2024-04-15',
          mileage: 45250,
          service_history: [
            {
              date: '2023-10-15',
              type: 'Oil Change & Inspection',
              cost: 89.99,
              mileage: 45250,
              notes: 'All systems normal'
            }
          ]
        },
        insurance: {
          provider: 'State Farm',
          policy_number: 'SF987654',
          expiry_date: '2024-06-30',
          coverage_type: 'Full Coverage'
        },
        is_primary: true,
        created_at: '2023-01-20T12:00:00Z'
      }
    ],
    fuel_records: [
      {
        id: 'fuel-1',
        user_id: 'user-123',
        vehicle_id: 'vehicle-1',
        date: '2023-12-01',
        location: {
          station_name: 'Shell',
          address: '500 SW Taylor St, Portland, OR',
          coordinates: [-122.6850, 45.5202]
        },
        fuel_type: 'Regular',
        gallons: 12.8,
        price_per_gallon: 3.45,
        total_cost: 44.16,
        odometer_reading: 45100,
        trip_id: 'trip-1',
        payment_method: 'Credit Card',
        created_at: '2023-12-01T07:30:00Z'
      },
      {
        id: 'fuel-2',
        user_id: 'user-123',
        vehicle_id: 'vehicle-1',
        date: '2023-11-15',
        location: {
          station_name: 'Chevron',
          address: '200 NW Burnside St, Portland, OR',
          coordinates: [-122.6734, 45.5231]
        },
        fuel_type: 'Regular',
        gallons: 13.2,
        price_per_gallon: 3.52,
        total_cost: 46.46,
        odometer_reading: 44750,
        payment_method: 'Credit Card',
        created_at: '2023-11-15T08:15:00Z'
      }
    ]
  };

  return {
    from: vi.fn((table: string) => ({
      select: vi.fn((fields: string) => ({
        eq: vi.fn((field: string, value: any) => {
          if (table === 'profiles' && field === 'id') {
            return {
              single: vi.fn().mockResolvedValue({
                data: mockData.profiles[value] || null,
                error: null
              })
            };
          } else if (table === 'user_settings' && field === 'user_id') {
            return {
              single: vi.fn().mockResolvedValue({
                data: mockData.user_settings[value] || null,
                error: null
              })
            };
          } else if (table === 'trips' && field === 'user_id') {
            return {
              eq: vi.fn((statusField: string, statusValue: string) => ({
                order: vi.fn(() => ({
                  limit: vi.fn((limit: number) => Promise.resolve({
                    data: mockData.trips.filter((trip: any) => 
                      trip.user_id === value && 
                      (statusValue === 'all' || trip.status === statusValue)
                    ).slice(0, limit),
                    error: null
                  })),
                  gte: vi.fn(() => ({
                    lte: vi.fn(() => ({
                      eq: vi.fn(() => ({
                        order: vi.fn(() => Promise.resolve({
                          data: mockData.trips.filter((trip: any) => trip.user_id === value),
                          error: null
                        }))
                      }))
                    }))
                  }))
                }))
              })),
              order: vi.fn(() => Promise.resolve({
                data: mockData.trips.filter((trip: any) => trip.user_id === value),
                error: null
              }))
            };
          } else if (table === 'vehicles' && field === 'user_id') {
            return Promise.resolve({
              data: mockData.vehicles.filter((vehicle: any) => vehicle.user_id === value),
              error: null
            });
          } else if (table === 'fuel_records' && field === 'user_id') {
            return {
              order: vi.fn(() => Promise.resolve({
                data: mockData.fuel_records.filter((record: any) => record.user_id === value),
                error: null
              }))
            };
          }
          return Promise.resolve({ data: null, error: null });
        }),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      }))
    }))
  };
};

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabase()
}));

describe('Tool Executor Integration Tests', () => {
  const TEST_USER_ID = 'user-123';
  const TEST_REQUEST_ID = 'test-req-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeToolCall - Profile Tools', () => {
    it('should successfully execute getUserProfile with full data', async () => {
      const result = await executeToolCall(
        'getUserProfile',
        {
          include_financial_goals: true,
          include_statistics: true
        },
        TEST_USER_ID,
        TEST_REQUEST_ID
      );

      expect(result.success).toBe(true);
      expect(result.toolName).toBe('getUserProfile');
      expect(result.data?.email).toBe('john@example.com');
      expect(result.data?.full_name).toBe('John Doe');
      expect(result.formattedResponse).toContain('User Profile for John Doe');
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.userId).toBe(TEST_USER_ID);
      expect(result.requestId).toBe(TEST_REQUEST_ID);
    });

    it('should successfully execute getUserSettings with specific category', async () => {
      const result = await executeToolCall(
        'getUserSettings',
        { category: 'notifications' },
        TEST_USER_ID
      );

      expect(result.success).toBe(true);
      expect(result.data?.notifications?.email_enabled).toBe(true);
      expect(result.formattedResponse).toContain('Notifications:');
      expect(result.formattedResponse).toContain('Email: Enabled');
    });

    it('should handle getUserPreferences with default fallbacks', async () => {
      const result = await executeToolCall(
        'getUserPreferences',
        { include_defaults: true },
        TEST_USER_ID
      );

      expect(result.success).toBe(true);
      expect(result.data?.financial?.default_budget_categories).toBeDefined();
      expect(Array.isArray(result.data?.financial?.default_budget_categories)).toBe(true);
    });
  });

  describe('executeToolCall - Trip Tools', () => {
    it('should successfully execute getTripHistory with filtering', async () => {
      const result = await executeToolCall(
        'getTripHistory',
        {
          trip_type: 'business',
          include_costs: true,
          limit: 10
        },
        TEST_USER_ID
      );

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
      expect(result.formattedResponse).toContain('Found');
      expect(result.formattedResponse).toContain('Business Trip to Seattle');
      expect(result.formattedResponse).toContain('Total Cost: $71.00');
    });

    it('should successfully execute getVehicleData with maintenance info', async () => {
      const result = await executeToolCall(
        'getVehicleData',
        {
          include_maintenance: true,
          include_insurance: true
        },
        TEST_USER_ID
      );

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data[0].make).toBe('Toyota');
      expect(result.data[0].model).toBe('Camry');
      expect(result.formattedResponse).toContain('2020 Toyota Camry');
      expect(result.formattedResponse).toContain('Next Service:');
    });

    it('should successfully execute getFuelData with efficiency analysis', async () => {
      const result = await executeToolCall(
        'getFuelData',
        {
          include_efficiency: true,
          include_stations: true,
          analysis_type: 'all'
        },
        TEST_USER_ID
      );

      expect(result.success).toBe(true);
      expect(result.data?.records).toBeDefined();
      expect(result.data?.summary).toBeDefined();
      expect(result.formattedResponse).toContain('Fuel Data Summary');
      expect(result.formattedResponse).toContain('Total Cost:');
    });

    it('should handle getTripPlans (empty results)', async () => {
      const result = await executeToolCall(
        'getTripPlans',
        { limit: 5 },
        TEST_USER_ID
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.formattedResponse).toContain('No upcoming trip plans found');
    });
  });

  describe('executeToolCall - Error Handling', () => {
    it('should handle invalid tool name', async () => {
      const result = await executeToolCall(
        'invalidToolName',
        {},
        TEST_USER_ID
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found in registry');
      expect(result.message).toContain('is not available');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle missing required parameters', async () => {
      const result = await executeToolCall(
        'getTripHistory',
        {}, // Missing user_id is handled by function, but let's test with invalid parameter
        '' // Empty user ID
      );

      expect(result.success).toBe(false);
    });

    it('should handle invalid parameter types', async () => {
      const result = await executeToolCall(
        'getFuelData',
        {
          start_date: 'invalid-date-format',
          limit: 'not-a-number'
        },
        TEST_USER_ID
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Parameter validation failed');
      expect(result.message).toContain('Invalid parameters');
    });

    it('should handle unimplemented tools gracefully', async () => {
      const result = await executeToolCall(
        'getUserExpenses',
        {},
        TEST_USER_ID
      );

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.message).toContain('not yet implemented');
    });

    it('should log tool usage analytics', async () => {
      await executeToolCall(
        'getUserProfile',
        {},
        TEST_USER_ID
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Executing tool call',
        expect.objectContaining({
          toolName: 'getUserProfile',
          userId: TEST_USER_ID
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tool usage analytics',
        expect.objectContaining({
          toolName: 'getUserProfile',
          userId: TEST_USER_ID,
          success: true
        })
      );
    });
  });

  describe('validateToolParams', () => {
    it('should validate correct parameters', () => {
      const result = validateToolParams('getTripHistory', {
        start_date: '2023-12-01',
        end_date: '2023-12-31',
        trip_type: 'business',
        limit: 10
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid date format', () => {
      const result = validateToolParams('getTripHistory', {
        start_date: '2023/12/01', // Invalid format
        trip_type: 'business'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('valid date string');
    });

    it('should reject invalid enum values', () => {
      const result = validateToolParams('getTripHistory', {
        trip_type: 'invalid_type'
      });

      expect(result.valid).toBe(false);
      expect(result.errors?.[0].message).toContain('must be one of:');
    });

    it('should reject out-of-range numbers', () => {
      const result = validateToolParams('getTripHistory', {
        limit: -5
      });

      expect(result.valid).toBe(false);
      expect(result.errors?.[0].message).toContain('must be >= 1');
    });

    it('should reject incorrect types', () => {
      const result = validateToolParams('getVehicleData', {
        include_maintenance: 'yes' // Should be boolean
      });

      expect(result.valid).toBe(false);
      expect(result.errors?.[0].message).toContain('must be a boolean');
    });

    it('should handle missing required parameters', () => {
      const result = validateToolParams('calculateSavings', {
        // Missing required 'period' parameter
        include_goals: true
      });

      expect(result.valid).toBe(false);
      expect(result.errors?.[0].message).toContain('Required parameter');
      expect(result.errors?.[0].parameter).toBe('period');
    });
  });

  describe('formatToolResponse', () => {
    it('should format profile response correctly', () => {
      const profileData = {
        full_name: 'John Doe',
        email: 'john@example.com',
        financial_goals: {
          emergency_fund_target: 10000,
          monthly_savings_goal: 1500
        },
        statistics: {
          total_expenses: 25000,
          total_income: 75000,
          total_trips: 15,
          account_age_days: 300
        }
      };

      const formatted = formatToolResponse('getUserProfile', profileData);

      expect(formatted).toContain('User Profile for John Doe');
      expect(formatted).toContain('Emergency Fund Target: $10,000');
      expect(formatted).toContain('Monthly Savings Goal: $1,500');
      expect(formatted).toContain('Total Expenses: $25,000');
      expect(formatted).toContain('Account Age: 300 days');
    });

    it('should format trip history response correctly', () => {
      const tripData = [
        {
          title: 'Seattle Business Trip',
          trip_type: 'business',
          distance_miles: 173,
          start_time: '2023-12-01T08:00:00Z',
          cost_breakdown: { total: 71.50 }
        },
        {
          title: 'Coast Weekend',
          trip_type: 'personal',
          distance_miles: 190,
          start_time: '2023-11-15T09:00:00Z',
          cost_breakdown: { total: 212.80 }
        }
      ];

      const formatted = formatToolResponse('getTripHistory', tripData);

      expect(formatted).toContain('Found 2 trip(s):');
      expect(formatted).toContain('Seattle Business Trip');
      expect(formatted).toContain('Type: business');
      expect(formatted).toContain('Distance: 173 miles');
      expect(formatted).toContain('Total Cost: $71.50');
    });

    it('should format vehicle response correctly', () => {
      const vehicleData = [
        {
          year: 2020,
          make: 'Toyota',
          model: 'Camry',
          color: 'Silver',
          avg_mpg: 32.5,
          maintenance: {
            next_service_due: '2024-04-15'
          },
          is_primary: true
        }
      ];

      const formatted = formatToolResponse('getVehicleData', vehicleData);

      expect(formatted).toContain('Found 1 vehicle(s):');
      expect(formatted).toContain('2020 Toyota Camry');
      expect(formatted).toContain('Color: Silver');
      expect(formatted).toContain('Average MPG: 32.5');
      expect(formatted).toContain('Primary Vehicle');
    });

    it('should format fuel data response correctly', () => {
      const fuelData = {
        records: [],
        summary: {
          records_count: 12,
          total_cost: 456.78,
          total_gallons: 132.5,
          average_price_per_gallon: 3.45
        },
        efficiency: {
          avg_mpg: 31.2,
          best_mpg: 35.8,
          worst_mpg: 27.1
        },
        stations: [
          { name: 'Shell', visit_count: 8, avg_price: 3.42 },
          { name: 'Chevron', visit_count: 4, avg_price: 3.48 }
        ]
      };

      const formatted = formatToolResponse('getFuelData', fuelData);

      expect(formatted).toContain('Fuel Data Summary:');
      expect(formatted).toContain('Total Records: 12');
      expect(formatted).toContain('Total Cost: $456.78');
      expect(formatted).toContain('Average MPG: 31.2');
      expect(formatted).toContain('Shell: 8 visits');
    });

    it('should handle empty data gracefully', () => {
      const formatted = formatToolResponse('getTripHistory', null);
      expect(formatted).toBe('No trips found for the specified criteria.');

      const emptyArray = formatToolResponse('getTripHistory', []);
      expect(emptyArray).toBe('No trips found for the specified criteria.');
    });

    it('should handle unknown tool names', () => {
      const formatted = formatToolResponse('unknownTool', { some: 'data' });
      expect(formatted).toContain('Retrieved unknownTool data with');
    });
  });

  describe('End-to-End Integration Scenarios', () => {
    it('should execute complete user data retrieval workflow', async () => {
      // Get profile
      const profile = await executeToolCall('getUserProfile', {
        include_statistics: true
      }, TEST_USER_ID);

      // Get recent trips
      const trips = await executeToolCall('getTripHistory', {
        limit: 5,
        include_costs: true
      }, TEST_USER_ID);

      // Get vehicle data
      const vehicles = await executeToolCall('getVehicleData', {
        include_maintenance: true
      }, TEST_USER_ID);

      // Get fuel analysis
      const fuel = await executeToolCall('getFuelData', {
        include_efficiency: true
      }, TEST_USER_ID);

      expect(profile.success).toBe(true);
      expect(trips.success).toBe(true);
      expect(vehicles.success).toBe(true);
      expect(fuel.success).toBe(true);

      // Verify data consistency
      expect(profile.data?.email).toBe('john@example.com');
      expect(trips.data?.length).toBeGreaterThan(0);
      expect(vehicles.data?.length).toBeGreaterThan(0);
      expect(fuel.data?.records?.length).toBeGreaterThan(0);

      // Verify formatted responses are user-friendly
      expect(profile.formattedResponse).toContain('John Doe');
      expect(trips.formattedResponse).toContain('trip(s):');
      expect(vehicles.formattedResponse).toContain('Toyota Camry');
      expect(fuel.formattedResponse).toContain('Fuel Data Summary:');
    });

    it('should handle complex filtering scenarios', async () => {
      const result = await executeToolCall('getTripHistory', {
        start_date: '2023-11-01',
        end_date: '2023-12-31',
        trip_type: 'business',
        include_costs: true,
        include_fuel_data: true,
        limit: 3
      }, TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.formattedResponse).toContain('Found');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should maintain performance under load simulation', async () => {
      const promises = [];
      
      // Simulate 10 concurrent tool calls
      for (let i = 0; i < 10; i++) {
        promises.push(executeToolCall('getUserProfile', {}, TEST_USER_ID));
      }

      const results = await Promise.all(promises);
      
      // All should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // All should complete in reasonable time (< 1000ms each)
      expect(results.every(r => r.executionTime! < 1000)).toBe(true);
    });
  });
});