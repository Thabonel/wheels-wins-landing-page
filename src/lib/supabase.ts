// Mock Supabase client with working auth state
const mockUser = {
  id: 'mock-user-id',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User', avatar_url: null },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00.000Z'
};

const mockSession = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: mockUser
};

export const supabase = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: mockUser }, error: null }),
    getSession: () => Promise.resolve({ 
      data: { session: mockSession }, 
      error: null 
    }),
    signInWithPassword: () => Promise.resolve({ 
      data: { user: mockUser, session: mockSession }, 
      error: null 
    }),
    signUp: () => Promise.resolve({ 
      data: { user: mockUser, session: mockSession }, 
      error: null 
    }),
    signOut: () => Promise.resolve({ error: null }),
    refreshSession: () => Promise.resolve({
      data: { session: { ...mockSession, access_token: 'refreshed-mock-token' } },
      error: null
    }),
    onAuthStateChange: (callback: any) => {
      // Immediately call with mock session
      setTimeout(() => callback('SIGNED_IN', mockSession), 100);
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  },
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null })
  })
};

export const createClient = () => supabase;
