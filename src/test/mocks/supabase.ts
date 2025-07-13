import { vi } from 'vitest';

// Mock Supabase client
export const mockSupabase = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          user: {
            id: 'mock_user_id',
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User' }
          }
        }
      },
      error: null
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: { id: 'mock_user_id' }, session: {} },
      error: null
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: { id: 'mock_user_id' }, session: {} },
      error: null
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    }),
    refreshSession: vi.fn().mockResolvedValue({
      data: { session: { access_token: 'new_mock_token' } },
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

// Mock the Supabase module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}));