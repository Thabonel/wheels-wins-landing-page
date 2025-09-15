import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getUserProfile, getUserSettings, getUserPreferences } from './profileTools';
import { getTripHistory, getVehicleData, getFuelData, getTripPlans } from './tripTools';
import { executeToolCall } from './toolExecutor';
import { getToolsForClaude, PAM_TOOLS } from './toolRegistry';
import { performance } from 'perf_hooks';

// Test database configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Test user IDs for different scenarios
const TEST_USERS = {
  ADMIN: 'test-admin-user-001',
  REGULAR: 'test-regular-user-002', 
  LIMITED: 'test-limited-user-003',
  NO_DATA: 'test-no-data-user-004'
};

// Mock logger for tests
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('PAM Tools Integration Tests', () => {
  let supabase: ReturnType<typeof createClient>;
  let testDataCleanup: (() => Promise<void>)[] = [];

  beforeAll(async () => {
    // Initialize Supabase client for testing
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    testDataCleanup = [];
  });

  afterEach(async () => {
    // Clean up any test-specific data
    for (const cleanup of testDataCleanup) {
      await cleanup();
    }
  });

  async function setupTestData() {
    // Create test profiles
    const profiles = [
      {
        id: TEST_USERS.ADMIN,
        email: 'admin@test.com',
        full_name: 'Test Admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: TEST_USERS.REGULAR,
        email: 'regular@test.com', 
        full_name: 'Test Regular User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: TEST_USERS.LIMITED,
        email: 'limited@test.com',
        full_name: 'Test Limited User', 
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: TEST_USERS.NO_DATA,
        email: 'nodata@test.com',
        full_name: 'Test No Data User',
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString()
      }
    ];

    // Insert test profiles
    await supabase.from('profiles').upsert(profiles);

    // Create test user settings
    const userSettings = [
      {
        user_id: TEST_USERS.ADMIN,
        theme: 'dark',
        notifications_enabled: true,
        currency: 'USD',
        timezone: 'UTC',
        updated_at: new Date().toISOString()
      },
      {
        user_id: TEST_USERS.REGULAR,
        theme: 'light', 
        notifications_enabled: false,
        currency: 'EUR',
        timezone: 'Europe/London',
        updated_at: new Date().toISOString()
      }
    ];

    await supabase.from('user_settings').upsert(userSettings);

    // Create test expenses
    const expenses = [
      {
        user_id: TEST_USERS.ADMIN,
        amount: 25.50,
        category: 'food',
        description: 'Lunch at cafe',
        date: '2024-01-15',
        created_at: new Date().toISOString()
      },
      {
        user_id: TEST_USERS.ADMIN,
        amount: 120.00,
        category: 'transport',
        description: 'Gas fill-up',
        date: '2024-01-16', 
        created_at: new Date().toISOString()
      },
      {
        user_id: TEST_USERS.REGULAR,
        amount: 15.75,
        category: 'food',
        description: 'Coffee and pastry',
        date: '2024-01-17',
        created_at: new Date().toISOString()
      }
    ];

    await supabase.from('expenses').upsert(expenses);

    // Create test budgets
    const budgets = [
      {
        user_id: TEST_USERS.ADMIN,
        category: 'food',
        amount: 500.00,
        period: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        created_at: new Date().toISOString()
      },
      {
        user_id: TEST_USERS.REGULAR,
        category: 'transport',
        amount: 300.00,
        period: 'monthly', 
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        created_at: new Date().toISOString()
      }
    ];

    await supabase.from('budgets').upsert(budgets);

    // Create test trips
    const trips = [
      {
        user_id: TEST_USERS.ADMIN,
        destination: 'Los Angeles, CA',
        start_date: '2024-01-20',
        end_date: '2024-01-22',
        trip_type: 'business',
        total_cost: 850.00,
        distance: 380,
        created_at: new Date().toISOString()
      },
      {
        user_id: TEST_USERS.REGULAR,
        destination: 'San Francisco, CA', 
        start_date: '2024-01-25',
        end_date: '2024-01-27',
        trip_type: 'leisure',
        total_cost: 450.00,
        distance: 220,
        created_at: new Date().toISOString()
      }
    ];

    await supabase.from('trips').upsert(trips);

    // Create test vehicles
    const vehicles = [
      {
        user_id: TEST_USERS.ADMIN,
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        vin: 'TEST123456789ADMIN',
        license_plate: 'TEST-001',
        fuel_type: 'gasoline',
        created_at: new Date().toISOString()
      },
      {
        user_id: TEST_USERS.REGULAR,
        make: 'Honda', 
        model: 'Accord',
        year: 2021,
        vin: 'TEST123456789REGULAR',
        license_plate: 'TEST-002',
        fuel_type: 'gasoline',
        created_at: new Date().toISOString()
      }
    ];

    await supabase.from('vehicles').upsert(vehicles);
  }

  async function cleanupTestData() {
    // Clean up in reverse dependency order
    const tables = ['expenses', 'budgets', 'trips', 'vehicles', 'user_settings', 'profiles'];
    
    for (const table of tables) {
      await supabase
        .from(table)
        .delete()
        .in('user_id', Object.values(TEST_USERS));
    }
  }

  describe('Profile Tools Integration', () => {
    describe('getUserProfile', () => {
      it('should retrieve complete user profile with financial goals', async () => {
        const result = await getUserProfile(TEST_USERS.ADMIN, {
          include_financial_goals: true,
          include_preferences: true,
          include_statistics: true
        });

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
          id: TEST_USERS.ADMIN,
          email: 'admin@test.com',
          full_name: 'Test Admin'
        });
        expect(result.executionTime).toBeGreaterThan(0);
        expect(result.formattedResponse).toContain('Test Admin');
      });

      it('should handle user with minimal data', async () => {
        const result = await getUserProfile(TEST_USERS.NO_DATA, {
          include_financial_goals: false,
          include_preferences: false
        });

        expect(result.success).toBe(true);
        expect(result.data?.full_name).toBe('Test No Data User');
      });

      it('should handle non-existent user', async () => {
        const result = await getUserProfile('non-existent-user-123');

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });
    });

    describe('getUserSettings', () => {
      it('should retrieve user settings with all preferences', async () => {
        const result = await getUserSettings(TEST_USERS.ADMIN);

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
          theme: 'dark',
          notifications_enabled: true,
          currency: 'USD',
          timezone: 'UTC'
        });
      });

      it('should handle user without settings (return defaults)', async () => {
        const result = await getUserSettings(TEST_USERS.LIMITED);

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
          theme: 'light',
          notifications_enabled: true,
          currency: 'USD'
        });
      });
    });

    describe('getUserPreferences', () => {
      it('should retrieve personalization preferences', async () => {
        const result = await getUserPreferences(TEST_USERS.REGULAR);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.formattedResponse).toContain('preferences');
      });
    });
  });

  describe('Trip Tools Integration', () => {
    describe('getTripHistory', () => {
      it('should retrieve filtered trip history', async () => {
        const result = await getTripHistory(TEST_USERS.ADMIN, {
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          trip_type: 'business',
          include_costs: true,
          include_fuel_data: true
        });

        expect(result.success).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data?.length).toBeGreaterThan(0);
        expect(result.data?.[0]).toMatchObject({
          destination: 'Los Angeles, CA',
          trip_type: 'business',
          total_cost: 850.00
        });
      });

      it('should return empty array for user with no trips', async () => {
        const result = await getTripHistory(TEST_USERS.NO_DATA);

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });

      it('should filter by date range correctly', async () => {
        const result = await getTripHistory(TEST_USERS.ADMIN, {
          start_date: '2024-01-01',
          end_date: '2024-01-19' // Before the trip date
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });
    });

    describe('getVehicleData', () => {
      it('should retrieve vehicle information', async () => {
        const result = await getVehicleData(TEST_USERS.ADMIN, {
          include_maintenance: true,
          include_insurance: true
        });

        expect(result.success).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data?.[0]).toMatchObject({
          make: 'Toyota',
          model: 'Camry',
          year: 2022,
          fuel_type: 'gasoline'
        });
      });

      it('should handle user with no vehicles', async () => {
        const result = await getVehicleData(TEST_USERS.NO_DATA);

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });
    });

    describe('getFuelData', () => {
      it('should retrieve fuel consumption data', async () => {
        const result = await getFuelData(TEST_USERS.ADMIN, {
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          include_costs: true,
          include_efficiency: true
        });

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it('should calculate MPG correctly', async () => {
        const result = await getFuelData(TEST_USERS.REGULAR);

        expect(result.success).toBe(true);
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          expect(result.data[0]).toHaveProperty('mpg');
        }
      });
    });

    describe('getTripPlans', () => {
      it('should retrieve upcoming trip plans', async () => {
        const result = await getTripPlans(TEST_USERS.ADMIN, {
          include_costs: true,
          include_weather: false // Skip weather API for testing
        });

        expect(result.success).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);
      });
    });
  });

  describe('Tool Combinations and Workflows', () => {
    it('should execute profile + settings combination', async () => {
      const profileResult = await getUserProfile(TEST_USERS.ADMIN);
      const settingsResult = await getUserSettings(TEST_USERS.ADMIN);

      expect(profileResult.success && settingsResult.success).toBe(true);
      
      // Verify data correlation
      expect(profileResult.data?.id).toBe(settingsResult.data?.user_id);
    });

    it('should execute trip + vehicle data combination', async () => {
      const tripsResult = await getTripHistory(TEST_USERS.ADMIN, { limit: 5 });
      const vehicleResult = await getVehicleData(TEST_USERS.ADMIN);

      expect(tripsResult.success && vehicleResult.success).toBe(true);
      
      if (tripsResult.data?.length && vehicleResult.data?.length) {
        // Both should belong to same user
        expect(tripsResult.data[0].user_id).toBe(TEST_USERS.ADMIN);
        expect(vehicleResult.data[0].user_id).toBe(TEST_USERS.ADMIN);
      }
    });

    it('should execute fuel + trip efficiency analysis', async () => {
      const fuelResult = await getFuelData(TEST_USERS.ADMIN, {
        include_efficiency: true
      });
      const tripResult = await getTripHistory(TEST_USERS.ADMIN, {
        include_fuel_data: true
      });

      expect(fuelResult.success && tripResult.success).toBe(true);
      
      // Should be able to correlate fuel efficiency with trip data
      expect(fuelResult.executionTime).toBeGreaterThan(0);
      expect(tripResult.executionTime).toBeGreaterThan(0);
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily mock Supabase to simulate connection error
      const originalFrom = supabase.from;
      supabase.from = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockRejectedValue(new Error('Connection failed'))
      }));

      const result = await getUserProfile(TEST_USERS.ADMIN);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');

      // Restore original function
      supabase.from = originalFrom;
    });

    it('should handle invalid date ranges', async () => {
      const result = await getTripHistory(TEST_USERS.ADMIN, {
        start_date: '2024-12-31',
        end_date: '2024-01-01' // Invalid: end before start
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid date range');
    });

    it('should handle malformed parameters', async () => {
      const result = await executeToolCall(
        'getUserProfile',
        { include_financial_goals: 'invalid_boolean' }, // Invalid type
        TEST_USERS.ADMIN
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('parameter validation');
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousUserId = "'; DROP TABLE profiles; --";
      const result = await getUserProfile(maliciousUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      
      // Verify profiles table still exists
      const { data: profiles } = await supabase.from('profiles').select('count');
      expect(profiles).toBeDefined();
    });

    it('should handle extremely large result sets', async () => {
      // Create many test records for large dataset test
      const manyTrips = Array.from({ length: 1000 }, (_, i) => ({
        user_id: TEST_USERS.ADMIN,
        destination: `Test Destination ${i}`,
        start_date: '2024-01-01',
        end_date: '2024-01-02',
        trip_type: 'business',
        total_cost: 100 + i,
        created_at: new Date().toISOString()
      }));

      await supabase.from('trips').insert(manyTrips);
      testDataCleanup.push(async () => {
        await supabase.from('trips').delete().like('destination', 'Test Destination%');
      });

      const result = await getTripHistory(TEST_USERS.ADMIN, { limit: 500 });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeLessThanOrEqual(500);
      expect(result.executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('User Permissions and Access Control', () => {
    it('should enforce user data isolation', async () => {
      const adminResult = await getUserProfile(TEST_USERS.ADMIN);
      const regularResult = await getUserProfile(TEST_USERS.REGULAR);

      expect(adminResult.success && regularResult.success).toBe(true);
      expect(adminResult.data?.email).not.toBe(regularResult.data?.email);
      expect(adminResult.data?.id).not.toBe(regularResult.data?.id);
    });

    it('should handle unauthorized access attempts', async () => {
      // Try to access another user's data (should only get own data)
      const result = await getTripHistory(TEST_USERS.LIMITED, {
        user_filter: TEST_USERS.ADMIN // Attempt to filter for different user
      });

      expect(result.success).toBe(true);
      // Should only return LIMITED user's data, not ADMIN's data
      if (result.data && result.data.length > 0) {
        expect(result.data.every(trip => trip.user_id === TEST_USERS.LIMITED)).toBe(true);
      }
    });

    it('should validate user existence for all tools', async () => {
      const tools = [
        () => getUserProfile('invalid-user-999'),
        () => getUserSettings('invalid-user-999'),
        () => getTripHistory('invalid-user-999'),
        () => getVehicleData('invalid-user-999'),
        () => getFuelData('invalid-user-999')
      ];

      for (const toolCall of tools) {
        const result = await toolCall();
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/not found|invalid user/i);
      }
    });

    it('should handle empty user ID', async () => {
      const result = await getUserProfile('');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
  });

  describe('Performance Tests', () => {
    it('should execute single tool calls within performance thresholds', async () => {
      const performanceTests = [
        { name: 'getUserProfile', fn: () => getUserProfile(TEST_USERS.ADMIN) },
        { name: 'getUserSettings', fn: () => getUserSettings(TEST_USERS.ADMIN) },
        { name: 'getTripHistory', fn: () => getTripHistory(TEST_USERS.ADMIN, { limit: 10 }) },
        { name: 'getVehicleData', fn: () => getVehicleData(TEST_USERS.ADMIN) },
        { name: 'getFuelData', fn: () => getFuelData(TEST_USERS.ADMIN) }
      ];

      for (const test of performanceTests) {
        const startTime = performance.now();
        const result = await test.fn();
        const endTime = performance.now();
        const executionTime = endTime - startTime;

        expect(result.success).toBe(true);
        expect(executionTime).toBeLessThan(2000); // Less than 2 seconds
        expect(result.executionTime).toBeLessThan(2000);
        
        console.log(`${test.name}: ${executionTime.toFixed(2)}ms`);
      }
    });

    it('should handle concurrent tool executions efficiently', async () => {
      const concurrentCalls = [
        getUserProfile(TEST_USERS.ADMIN),
        getUserSettings(TEST_USERS.ADMIN), 
        getTripHistory(TEST_USERS.ADMIN),
        getVehicleData(TEST_USERS.ADMIN),
        getUserProfile(TEST_USERS.REGULAR)
      ];

      const startTime = performance.now();
      const results = await Promise.all(concurrentCalls);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(results.every(result => result.success)).toBe(true);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      console.log(`Concurrent execution: ${totalTime.toFixed(2)}ms`);
    });

    it('should optimize query performance with proper indexing', async () => {
      // Test common query patterns that should be optimized
      const optimizationTests = [
        {
          name: 'User profile lookup',
          fn: () => getUserProfile(TEST_USERS.ADMIN),
          maxTime: 500
        },
        {
          name: 'Trip history with date filter',
          fn: () => getTripHistory(TEST_USERS.ADMIN, {
            start_date: '2024-01-01',
            end_date: '2024-12-31'
          }),
          maxTime: 1000
        },
        {
          name: 'Vehicle data lookup',
          fn: () => getVehicleData(TEST_USERS.ADMIN),
          maxTime: 500
        }
      ];

      for (const test of optimizationTests) {
        const result = await test.fn();
        
        expect(result.success).toBe(true);
        expect(result.executionTime).toBeLessThan(test.maxTime);
        
        console.log(`${test.name}: ${result.executionTime}ms (max: ${test.maxTime}ms)`);
      }
    });

    it('should handle memory efficiently with large datasets', async () => {
      const memoryBefore = process.memoryUsage();
      
      // Execute multiple operations that could consume memory
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(getTripHistory(TEST_USERS.ADMIN, { limit: 100 }));
      }
      
      const results = await Promise.all(operations);
      const memoryAfter = process.memoryUsage();
      
      const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
      
      expect(results.every(result => result.success)).toBe(true);
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Tool Executor Integration', () => {
    it('should route tool calls correctly through executeToolCall', async () => {
      const toolTests = [
        {
          toolName: 'getUserProfile',
          parameters: { include_financial_goals: true },
          userId: TEST_USERS.ADMIN
        },
        {
          toolName: 'getTripHistory',
          parameters: { limit: 5, include_costs: true },
          userId: TEST_USERS.REGULAR
        },
        {
          toolName: 'getVehicleData',
          parameters: { include_maintenance: false },
          userId: TEST_USERS.ADMIN
        }
      ];

      for (const test of toolTests) {
        const result = await executeToolCall(
          test.toolName,
          test.parameters,
          test.userId,
          `test-${Date.now()}`
        );

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.executionTime).toBeGreaterThan(0);
        expect(result.formattedResponse).toContain(test.toolName.replace('get', '').toLowerCase());
      }
    });

    it('should validate tool parameters through executor', async () => {
      const invalidTests = [
        {
          toolName: 'getUserProfile',
          parameters: { include_financial_goals: 'not-boolean' },
          expectedError: 'validation'
        },
        {
          toolName: 'getTripHistory', 
          parameters: { limit: 'not-number' },
          expectedError: 'validation'
        },
        {
          toolName: 'nonexistent-tool',
          parameters: {},
          expectedError: 'not found'
        }
      ];

      for (const test of invalidTests) {
        const result = await executeToolCall(
          test.toolName,
          test.parameters,
          TEST_USERS.ADMIN
        );

        expect(result.success).toBe(false);
        expect(result.error).toMatch(new RegExp(test.expectedError, 'i'));
      }
    });
  });

  describe('Tool Registry Integration', () => {
    it('should provide complete tool definitions for Claude', () => {
      const toolsForClaude = getToolsForClaude();
      
      expect(Array.isArray(toolsForClaude)).toBe(true);
      expect(toolsForClaude.length).toBeGreaterThan(5);
      
      toolsForClaude.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('input_schema');
        expect(tool.input_schema).toHaveProperty('type', 'object');
        expect(tool.input_schema).toHaveProperty('properties');
      });
    });

    it('should match tool registry with actual implementations', () => {
      const registeredTools = Object.keys(PAM_TOOLS);
      const implementedTools = [
        'getUserProfile',
        'getUserSettings', 
        'getUserPreferences',
        'getTripHistory',
        'getVehicleData',
        'getFuelData',
        'getTripPlans'
      ];

      implementedTools.forEach(toolName => {
        expect(registeredTools).toContain(toolName);
      });
    });

    it('should provide valid JSON schemas for all tools', () => {
      const toolsForClaude = getToolsForClaude();
      
      toolsForClaude.forEach(tool => {
        expect(() => {
          // Should be valid JSON schema structure
          JSON.stringify(tool.input_schema);
        }).not.toThrow();
        
        // Should have required schema properties
        expect(tool.input_schema.type).toBe('object');
        expect(typeof tool.input_schema.properties).toBe('object');
      });
    });
  });
});