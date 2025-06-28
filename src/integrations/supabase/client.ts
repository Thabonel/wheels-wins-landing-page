// Real backend API client - no more Supabase direct connections
const BACKEND_URL = 'https://pam-backend.onrender.com';

// Simulate auth state since your backend doesn't have auth endpoints yet
const mockUser = {
  id: 'current-user',
  email: 'user@wheelsandwins.com'
};

export const supabase = {
  auth: {
    getUser: () => Promise.resolve({ 
      data: { user: mockUser }, 
      error: null 
    }),
    getSession: () => Promise.resolve({ 
      data: { session: { user: mockUser } }, 
      error: null 
    }),
    signInWithPassword: () => Promise.resolve({ data: { user: mockUser }, error: null }),
    signUp: () => Promise.resolve({ data: { user: mockUser }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    updateUser: () => Promise.resolve({ error: null }),
    onAuthStateChange: (callback: any) => {
      callback('SIGNED_IN', { user: mockUser });
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  },
  functions: {
    invoke: () => Promise.resolve({ data: null, error: null })
  },
  rpc: () => Promise.resolve({ data: [], error: null }),
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } })
    })
  },
  channel: () => ({
    on: () => ({ subscribe: () => {} }),
    subscribe: () => {}
  }),
  removeChannel: () => {},
  from: (table: string) => ({
    select: (columns: string = '*') => ({
      eq: (column: string, value: any) => ({
        order: (column: string, options?: any) => handleTableQuery(table, 'select', { columns, where: { [column]: value }, order: { column, ...options } }),
        maybeSingle: () => handleTableQuery(table, 'selectSingle', { columns, where: { [column]: value } }),
        data: [],
        error: null
      }),
      order: (column: string, options?: any) => handleTableQuery(table, 'select', { columns, order: { column, ...options } }),
      maybeSingle: () => handleTableQuery(table, 'selectSingle', { columns }),
      data: [],
      error: null
    }),
    insert: (data: any) => handleTableQuery(table, 'insert', { data }),
    upsert: (data: any) => handleTableQuery(table, 'upsert', { data }),
    update: (data: any) => ({
      eq: (column: string, value: any) => handleTableQuery(table, 'update', { data, where: { [column]: value } })
    }),
    delete: () => ({
      eq: (column: string, value: any) => handleTableQuery(table, 'delete', { where: { [column]: value } })
    })
  })
};

async function handleTableQuery(table: string, operation: string, params: any) {
  try {
    // Route to appropriate backend endpoint
    switch (table) {
      case 'profiles':
        if (operation === 'selectSingle' || operation === 'select') {
          const response = await fetch(`${BACKEND_URL}/api/you/profile`);
          const data = await response.json();
          return { data: operation === 'selectSingle' ? data : [data], error: null };
        }
        break;
      
      case 'expenses':
        const response = await fetch(`${BACKEND_URL}/api/wins/expenses`);
        const data = await response.json();
        return { data, error: null };
      
      case 'budget_categories':
        // Return default categories for now
        return { data: ['Fuel', 'Food', 'Accommodation', 'Activities'], error: null };
      
      default:
        // Return empty data for unhandled tables
        return { data: operation === 'selectSingle' ? null : [], error: null };
    }
  } catch (error) {
    return { data: null, error: { message: 'Backend API error' } };
  }
}

export default supabase;
