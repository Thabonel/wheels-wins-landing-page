import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAuth } from '../../context/AuthContext';
import { AuthProvider } from '../../context/AuthContext';

// Mock Supabase
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    })
  }
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth Hook', () => {
  it('provides user as null when not authenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.user).toBeNull();
  });

  it('provides loading state initially', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(typeof result.current.loading).toBe('boolean');
  });

  it('provides signIn function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(typeof result.current.signIn).toBe('function');
  });

  it('provides signOut function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(typeof result.current.signOut).toBe('function');
  });

  it('provides signUp function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(typeof result.current.signUp).toBe('function');
  });
});