import { vi } from 'vitest';

// Create mock session data
const createMockSession = (overrides = {}) => ({
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: {
    id: 'mock-user-id',
    email: 'test@example.com',
    user_metadata: { 
      full_name: 'Test User',
      avatar_url: null 
    },
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2023-01-01T00:00:00.000Z',
    ...overrides?.user
  },
  ...overrides
});

// Mock Supabase client
export const mockSupabase = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: createMockSession()
      },
      error: null
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { 
        user: {
          id: 'mock-user-id',
          email: 'test@example.com',
          user_metadata: { full_name: 'Test User' }
        }, 
        session: createMockSession()
      },
      error: null
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { 
        user: {
          id: 'mock-user-id',
          email: 'test@example.com',
          user_metadata: { full_name: 'Test User' }
        }, 
        session: createMockSession()
      },
      error: null
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    }),
    refreshSession: vi.fn().mockResolvedValue({
      data: { 
        session: createMockSession({ access_token: 'refreshed-mock-token' })
      },
      error: null
    })
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue({ data: [], error: null }),
  single: vi.fn().mockReturnThis()
};

// Mock the Supabase module - target the actual imports used by the app
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
  default: mockSupabase
}));

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  createClient: () => mockSupabase
}));

// Export for use in tests
export { createMockSession };