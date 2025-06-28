// Mock Supabase client with working auth state
const mockUser = {
  id: 'mock-user-123',
  email: 'user@wheelsandwins.com',
  user_metadata: { full_name: 'Mock User' }
};

export const supabase = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: mockUser }, error: null }),
    getSession: () => Promise.resolve({ 
      data: { session: { user: mockUser, access_token: 'mock-token' } }, 
      error: null 
    }),
    signInWithPassword: () => Promise.resolve({ data: { user: mockUser }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: (callback: any) => {
      // Immediately call with mock session
      setTimeout(() => callback('SIGNED_IN', { user: mockUser }), 100);
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
