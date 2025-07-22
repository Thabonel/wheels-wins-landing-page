/**
 * Supabase mocks for testing
 * Comprehensive mock implementation for all Supabase functionality
 */

import { vi } from 'vitest';

// Mock user data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg'
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z'
};

// Mock session data
const mockSession = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'mock-refresh-token',
  user: mockUser
};

// Mock profile data
const mockProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  bio: 'Test user bio',
  location: 'Test Location',
  website: 'https://example.com',
  travel_style: 'adventure',
  experience_level: 'intermediate',
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z'
};

// Mock trip data
const mockTrip = {
  id: 'test-trip-id',
  user_id: 'test-user-id',
  title: 'Test Trip',
  description: 'A test trip description',
  start_date: '2024-06-01',
  end_date: '2024-06-15',
  status: 'planning',
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z'
};

// Mock auth methods
const mockAuthMethods = {
  signInWithPassword: vi.fn().mockResolvedValue({
    data: { user: mockUser, session: mockSession },
    error: null
  }),
  signUp: vi.fn().mockResolvedValue({
    data: { user: mockUser, session: mockSession },
    error: null
  }),
  signOut: vi.fn().mockResolvedValue({
    error: null
  }),
  getSession: vi.fn().mockResolvedValue({
    data: { session: mockSession },
    error: null
  }),
  getUser: vi.fn().mockResolvedValue({
    data: { user: mockUser },
    error: null
  }),
  onAuthStateChange: vi.fn().mockImplementation((callback) => {
    // Simulate authenticated state
    setTimeout(() => callback('SIGNED_IN', mockSession), 0);
    return {
      data: { subscription: { unsubscribe: vi.fn() } }
    };
  }),
  refreshSession: vi.fn().mockResolvedValue({
    data: { session: mockSession },
    error: null
  }),
  resetPasswordForEmail: vi.fn().mockResolvedValue({
    error: null
  }),
  updateUser: vi.fn().mockResolvedValue({
    data: { user: mockUser },
    error: null
  })
};

// Mock database operations
const createMockQueryBuilder = () => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  like: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  contains: vi.fn().mockReturnThis(),
  containedBy: vi.fn().mockReturnThis(),
  rangeGt: vi.fn().mockReturnThis(),
  rangeGte: vi.fn().mockReturnThis(),
  rangeLt: vi.fn().mockReturnThis(),
  rangeLte: vi.fn().mockReturnThis(),
  rangeAdjacent: vi.fn().mockReturnThis(),
  overlaps: vi.fn().mockReturnThis(),
  textSearch: vi.fn().mockReturnThis(),
  match: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  filter: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
  then: vi.fn().mockImplementation((callback) => {
    return callback({ data: [mockProfile], error: null });
  })
});

// Mock database client
const mockDatabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'from') {
      return vi.fn().mockImplementation((table) => {
        const queryBuilder = createMockQueryBuilder();
        
        // Table-specific mock data
        if (table === 'profiles') {
          queryBuilder.single = vi.fn().mockResolvedValue({ data: mockProfile, error: null });
          queryBuilder.then = vi.fn().mockImplementation((callback) => {
            return callback({ data: [mockProfile], error: null });
          });
        } else if (table === 'trips') {
          queryBuilder.single = vi.fn().mockResolvedValue({ data: mockTrip, error: null });
          queryBuilder.then = vi.fn().mockImplementation((callback) => {
            return callback({ data: [mockTrip], error: null });
          });
        }
        
        return queryBuilder;
      });
    }
    return createMockQueryBuilder();
  }
});

// Mock storage methods
const mockStorage = {
  from: vi.fn().mockImplementation(() => ({
    upload: vi.fn().mockResolvedValue({
      data: { path: 'test-path/test-file.jpg' },
      error: null
    }),
    download: vi.fn().mockResolvedValue({
      data: new Blob(),
      error: null
    }),
    remove: vi.fn().mockResolvedValue({
      error: null
    }),
    list: vi.fn().mockResolvedValue({
      data: [],
      error: null
    }),
    getPublicUrl: vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/test-file.jpg' }
    }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url' },
      error: null
    })
  }))
};

// Mock realtime methods
const mockRealtime = {
  channel: vi.fn().mockImplementation(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockImplementation((callback) => {
      setTimeout(() => callback('SUBSCRIBED'), 0);
      return {
        unsubscribe: vi.fn().mockResolvedValue({ error: null })
      };
    }),
    unsubscribe: vi.fn().mockResolvedValue({ error: null })
  })),
  removeChannel: vi.fn().mockResolvedValue({ error: null }),
  removeAllChannels: vi.fn().mockResolvedValue({ error: null })
};

// Mock functions methods
const mockFunctions = {
  invoke: vi.fn().mockResolvedValue({
    data: { success: true },
    error: null
  })
};

// Main Supabase client mock
const mockSupabaseClient = {
  auth: mockAuthMethods,
  from: mockDatabase.from,
  storage: mockStorage,
  realtime: mockRealtime,
  functions: mockFunctions,
  rpc: vi.fn().mockResolvedValue({
    data: [],
    error: null
  })
};

// Mock the createClient function
const mockCreateClient = vi.fn().mockReturnValue(mockSupabaseClient);

// Mock the entire @supabase/supabase-js module
vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient
}));

// Export mocks for use in tests
export {
  mockUser,
  mockSession,
  mockProfile,
  mockTrip,
  mockSupabaseClient,
  mockCreateClient,
  mockAuthMethods,
  mockDatabase,
  mockStorage,
  mockRealtime,
  mockFunctions
};

// Export test utilities
export const createMockAuthUser = (overrides = {}) => ({
  ...mockUser,
  ...overrides
});

export const createMockSession = (overrides = {}) => ({
  ...mockSession,
  user: {
    ...mockUser,
    ...overrides.user
  },
  ...overrides
});

export const createMockProfile = (overrides = {}) => ({
  ...mockProfile,
  ...overrides
});

export const createMockTrip = (overrides = {}) => ({
  ...mockTrip,
  ...overrides
});

// Reset all mocks utility
export const resetAllMocks = () => {
  Object.values(mockAuthMethods).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  
  // Reset default resolved values
  mockAuthMethods.getSession.mockResolvedValue({
    data: { session: mockSession },
    error: null
  });
  
  mockAuthMethods.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null
  });
};