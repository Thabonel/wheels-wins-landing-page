import { vi } from 'vitest';
import type { Session, User as SupabaseUser, AuthError, AuthTokenResponse } from '@supabase/supabase-js';

// Mock user data
export const mockUser: SupabaseUser = {
  id: 'test-user-id',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  email_confirmed_at: '2024-01-01T00:00:00.000Z',
  phone: '',
  confirmed_at: '2024-01-01T00:00:00.000Z',
  last_sign_in_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {},
  user_metadata: {
    full_name: 'Test User'
  },
  identities: [],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  is_anonymous: false
};

// Mock session data
export const mockSession: Session = {
  access_token: 'mock_access_token',
  refresh_token: 'mock_refresh_token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser
};

// Mock admin user
export const mockAdminUser: SupabaseUser = {
  ...mockUser,
  id: 'admin-user-id',
  email: 'admin@wheelsandwins.com',
  user_metadata: {
    full_name: 'Admin User'
  }
};

// Mock admin session
export const mockAdminSession: Session = {
  ...mockSession,
  user: mockAdminUser
};

// Mock auth error
export const mockAuthError: AuthError = {
  name: 'AuthError',
  message: 'Invalid login credentials',
  status: 400
};

// Mock successful auth response
export const mockAuthSuccess: AuthTokenResponse = {
  data: {
    user: mockUser,
    session: mockSession
  },
  error: null
};

// Mock auth failure response
export const mockAuthFailure: AuthTokenResponse = {
  data: {
    user: null,
    session: null
  },
  error: mockAuthError
};

// Mock Supabase auth methods
export const mockSupabaseAuth = {
  // Authentication state
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  
  // Authentication methods
  signInWithPassword: vi.fn().mockResolvedValue(mockAuthFailure),
  signUp: vi.fn().mockResolvedValue(mockAuthSuccess),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  signInWithOAuth: vi.fn().mockResolvedValue({ data: { provider: 'google', url: 'https://oauth.url' }, error: null }),
  
  // Password reset
  resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
  updateUser: vi.fn().mockResolvedValue(mockAuthSuccess),
  
  // Auth state change listener
  onAuthStateChange: vi.fn().mockImplementation((callback) => {
    // Return a mock subscription
    return {
      data: {
        subscription: {
          unsubscribe: vi.fn()
        }
      }
    };
  })
};

// Mock Supabase client
export const mockSupabase = {
  auth: mockSupabaseAuth,
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null })
};

// Mock the Supabase client module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// Mock auth logging
vi.mock('@/lib/authLogging', () => ({
  recordLogin: vi.fn().mockResolvedValue(undefined),
  endSession: vi.fn().mockResolvedValue(undefined)
}));

// Mock Sentry
vi.mock('@/lib/sentry', () => ({
  setUser: vi.fn(),
  setTag: vi.fn(),
  captureMessage: vi.fn()
}));

// Helper functions for tests
export const setMockAuthState = (user: SupabaseUser | null, session: Session | null = null) => {
  const sessionData = session || (user ? { ...mockSession, user } : null);
  mockSupabaseAuth.getSession.mockResolvedValue({ 
    data: { session: sessionData }, 
    error: null 
  });
  mockSupabaseAuth.getUser.mockResolvedValue({ 
    data: { user }, 
    error: null 
  });
};

export const setMockAuthError = (error: AuthError) => {
  mockSupabaseAuth.signInWithPassword.mockResolvedValue({
    data: { user: null, session: null },
    error
  });
};

export const setMockSignUpSuccess = () => {
  mockSupabaseAuth.signUp.mockResolvedValue(mockAuthSuccess);
};

export const setMockSignUpError = (error: AuthError) => {
  mockSupabaseAuth.signUp.mockResolvedValue({
    data: { user: null, session: null },
    error
  });
};

export const resetAllMocks = () => {
  vi.clearAllMocks();
  // Reset to default states
  mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  mockSupabaseAuth.signInWithPassword.mockResolvedValue(mockAuthFailure);
  mockSupabaseAuth.signUp.mockResolvedValue(mockAuthSuccess);
};

// Mock auth state change trigger for testing
export const triggerAuthStateChange = (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED', session: Session | null = null) => {
  const callbacks = mockSupabaseAuth.onAuthStateChange.mock.calls.map(call => call[0]);
  callbacks.forEach(callback => callback(event, session));
};