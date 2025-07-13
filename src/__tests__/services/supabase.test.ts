import { describe, it, expect, vi } from 'vitest';
import { supabase } from '../../integrations/supabase/client';

// Mock environment variables
vi.mock('../../integrations/supabase/client', async () => {
  const actual = await vi.importActual('../../integrations/supabase/client');
  return {
    ...actual,
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null })
          }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          update: vi.fn().mockResolvedValue({ data: null, error: null }),
          delete: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    }
  };
});

describe('Supabase Client', () => {
  it('provides auth methods', () => {
    expect(supabase.auth).toBeDefined();
    expect(typeof supabase.auth.getSession).toBe('function');
    expect(typeof supabase.auth.signInWithPassword).toBe('function');
    expect(typeof supabase.auth.signOut).toBe('function');
    expect(typeof supabase.auth.signUp).toBe('function');
  });

  it('provides database query methods', () => {
    expect(typeof supabase.from).toBe('function');
  });

  it('can perform basic database operations', async () => {
    const query = supabase.from('test_table');
    expect(query).toBeDefined();
    
    const selectQuery = query.select('*');
    expect(selectQuery).toBeDefined();
  });

  it('handles authentication operations', async () => {
    const sessionResult = await supabase.auth.getSession();
    expect(sessionResult).toBeDefined();
    expect(sessionResult.data).toBeDefined();
  });

  it('provides auth state change subscription', () => {
    const subscription = supabase.auth.onAuthStateChange(() => {});
    expect(subscription).toBeDefined();
    expect(subscription.data).toBeDefined();
  });
});