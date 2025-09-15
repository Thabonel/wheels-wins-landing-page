/**
 * Test suite for Profile Tools
 * Tests user profile, settings, and preferences functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getUserProfile,
  getUserSettings,
  getUserPreferences,
  checkUserExists,
  getUserDisplayName,
  type UserProfile,
  type UserSettings,
  type UserPreferences
} from './profileTools';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        limit: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }))
};

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

describe('Profile Tools', () => {
  const TEST_USER_ID = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserProfile', () => {
    it('should successfully retrieve basic user profile', async () => {
      const mockProfile = {
        id: TEST_USER_ID,
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      };

      // Mock the database query chain
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: mockProfile,
        error: null
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getUserProfile(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.email).toBe('test@example.com');
      expect(result.data?.full_name).toBe('Test User');
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });

    it('should handle profile not found', async () => {
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: null
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getUserProfile(TEST_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Profile not found');
      expect(result.message).toBe('No profile found for this user.');
    });

    it('should handle database errors gracefully', async () => {
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getUserProfile(TEST_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch user profile');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should include financial goals when requested', async () => {
      const mockProfile = {
        id: TEST_USER_ID,
        email: 'test@example.com',
        full_name: 'Test User',
        created_at: '2023-01-01T00:00:00Z'
      };

      const mockGoals = {
        financial_goals: {
          emergency_fund_target: 10000,
          monthly_savings_goal: 1000
        }
      };

      // Mock profile query
      let callCount = 0;
      const mockSingle = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: mockProfile, error: null });
        } else if (callCount === 2) {
          return Promise.resolve({ data: mockGoals, error: null });
        } else {
          return Promise.resolve({ data: null, error: null });
        }
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getUserProfile(TEST_USER_ID, { 
        include_financial_goals: true 
      });

      expect(result.success).toBe(true);
      expect(result.data?.financial_goals).toBeDefined();
      expect(result.data?.financial_goals?.emergency_fund_target).toBe(10000);
    });

    it('should include statistics when requested', async () => {
      const mockProfile = {
        id: TEST_USER_ID,
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z'
      };

      // Mock multiple database calls for statistics
      let callCount = 0;
      const mockSingle = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: mockProfile, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Mock the Promise.all calls for statistics
      const mockSelect = vi.fn().mockImplementation((fields) => {
        if (fields === 'amount') {
          return {
            eq: vi.fn().mockResolvedValue({
              data: [{ amount: 100 }, { amount: 200 }],
              error: null
            })
          };
        } else if (fields === 'id') {
          return {
            eq: vi.fn().mockResolvedValue({
              data: [{ id: '1' }, { id: '2' }, { id: '3' }],
              error: null
            })
          };
        }
        return { eq: vi.fn().mockReturnValue({ single: mockSingle }) };
      });

      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getUserProfile(TEST_USER_ID, { 
        include_statistics: true 
      });

      expect(result.success).toBe(true);
      expect(result.data?.statistics).toBeDefined();
      expect(result.data?.statistics?.total_expenses).toBe(300);
      expect(result.data?.statistics?.total_trips).toBe(3);
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const result = await getUserProfile(TEST_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error in getUserProfile',
        expect.any(Error)
      );
    });
  });

  describe('getUserSettings', () => {
    it('should successfully retrieve user settings', async () => {
      const mockSettings = {
        id: 'settings-123',
        user_id: TEST_USER_ID,
        notifications: {
          email_enabled: true,
          push_enabled: false,
          budget_alerts: true
        },
        privacy: {
          data_sharing: false,
          analytics_tracking: true
        },
        display: {
          theme: 'dark',
          currency: 'EUR',
          language: 'en'
        }
      };

      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: mockSettings,
        error: null
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getUserSettings(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data?.notifications?.email_enabled).toBe(true);
      expect(result.data?.display?.theme).toBe('dark');
      expect(mockSupabase.from).toHaveBeenCalledWith('user_settings');
    });

    it('should return default settings when none exist', async () => {
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: null
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getUserSettings(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data?.notifications?.email_enabled).toBe(true);
      expect(result.data?.display?.theme).toBe('auto');
      expect(result.data?.display?.currency).toBe('USD');
      expect(result.message).toContain('Default settings returned');
    });

    it('should return specific category when requested', async () => {
      const mockSettings = {
        id: 'settings-123',
        user_id: TEST_USER_ID,
        notifications: {
          email_enabled: true,
          push_enabled: false
        }
      };

      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: mockSettings,
        error: null
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getUserSettings(TEST_USER_ID, 'notifications');

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('notifications');
      expect(result.data).not.toHaveProperty('display');
      expect(result.message).toContain('notifications settings retrieved');
    });

    it('should handle database errors', async () => {
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: 'DB001' }
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getUserSettings(TEST_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch settings');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getUserPreferences', () => {
    it('should successfully retrieve user preferences', async () => {
      const mockPreferences = {
        id: 'pref-123',
        user_id: TEST_USER_ID,
        financial: {
          default_budget_categories: ['food', 'transport'],
          preferred_payment_methods: ['credit_card']
        },
        travel: {
          preferred_fuel_stations: ['Shell', 'BP'],
          trip_tracking_enabled: true
        }
      };

      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: mockPreferences,
        error: null
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getUserPreferences(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data?.financial?.preferred_payment_methods).toContain('credit_card');
      expect(result.data?.travel?.trip_tracking_enabled).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_preferences');
    });

    it('should return default preferences when none exist', async () => {
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' } // No rows returned
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getUserPreferences(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data?.financial?.default_budget_categories).toBeDefined();
      expect(result.data?.travel?.preferred_fuel_stations).toBeDefined();
      expect(result.message).toContain('Default preferences returned');
    });

    it('should merge with defaults when partial preferences exist', async () => {
      const mockPreferences = {
        id: 'pref-123',
        user_id: TEST_USER_ID,
        financial: {
          preferred_payment_methods: ['debit_card']
        },
        travel: {} // Empty travel preferences
      };

      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: mockPreferences,
        error: null
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getUserPreferences(TEST_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data?.financial?.preferred_payment_methods).toContain('debit_card');
      expect(result.data?.financial?.default_budget_categories).toBeDefined(); // From defaults
      expect(result.data?.travel?.preferred_fuel_stations).toBeDefined(); // From defaults
    });
  });

  describe('Utility Functions', () => {
    describe('checkUserExists', () => {
      it('should return true when user exists', async () => {
        const mockSingle = vi.fn().mockResolvedValueOnce({
          data: { id: TEST_USER_ID },
          error: null
        });

        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        mockSupabase.from.mockReturnValue({ select: mockSelect });

        const result = await checkUserExists(TEST_USER_ID);

        expect(result).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      });

      it('should return false when user does not exist', async () => {
        const mockSingle = vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' }
        });

        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        mockSupabase.from.mockReturnValue({ select: mockSelect });

        const result = await checkUserExists(TEST_USER_ID);

        expect(result).toBe(false);
      });

      it('should handle exceptions gracefully', async () => {
        mockSupabase.from.mockImplementation(() => {
          throw new Error('Database connection failed');
        });

        const result = await checkUserExists(TEST_USER_ID);

        expect(result).toBe(false);
      });
    });

    describe('getUserDisplayName', () => {
      it('should return full name when available', async () => {
        const mockSingle = vi.fn().mockResolvedValueOnce({
          data: { full_name: 'John Doe', email: 'john@example.com' },
          error: null
        });

        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        mockSupabase.from.mockReturnValue({ select: mockSelect });

        const result = await getUserDisplayName(TEST_USER_ID);

        expect(result).toBe('John Doe');
      });

      it('should return email username when full name not available', async () => {
        const mockSingle = vi.fn().mockResolvedValueOnce({
          data: { full_name: null, email: 'john.doe@example.com' },
          error: null
        });

        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        mockSupabase.from.mockReturnValue({ select: mockSelect });

        const result = await getUserDisplayName(TEST_USER_ID);

        expect(result).toBe('john.doe');
      });

      it('should return "User" as fallback', async () => {
        const mockSingle = vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' }
        });

        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        mockSupabase.from.mockReturnValue({ select: mockSelect });

        const result = await getUserDisplayName(TEST_USER_ID);

        expect(result).toBe('User');
      });

      it('should handle exceptions gracefully', async () => {
        mockSupabase.from.mockImplementation(() => {
          throw new Error('Database error');
        });

        const result = await getUserDisplayName(TEST_USER_ID);

        expect(result).toBe('User');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty user ID', async () => {
      const result = await getUserProfile('');

      expect(result.success).toBe(false);
    });

    it('should handle null/undefined options', async () => {
      const mockProfile = {
        id: TEST_USER_ID,
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z'
      };

      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: mockProfile,
        error: null
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getUserProfile(TEST_USER_ID, undefined as any);

      expect(result.success).toBe(true);
    });

    it('should handle malformed database responses', async () => {
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: { malformed: 'data' }, // Missing expected fields
        error: null
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await getUserProfile(TEST_USER_ID);

      expect(result.success).toBe(true); // Should still succeed with partial data
      expect(result.data?.id).toBeUndefined();
    });
  });
});