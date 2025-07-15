import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '../../test/utils/test-utils';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { mockSupabase } from '../../test/mocks/supabase';

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides initial auth state correctly', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({
      id: 'mock-user-id',
      email: 'test@example.com',
      full_name: 'Test User'
    });
    expect(result.current.token).toBe('mock-token');
  });

  it('handles sign in correctly', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    });
  });

  it('handles sign up correctly', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signUp('test@example.com', 'password', 'Test User');
    });

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
      options: {
        emailRedirectTo: expect.any(String),
        data: { full_name: 'Test User' }
      }
    });
  });

  it('handles sign out correctly', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Temporarily suppress console.error to avoid test noise
    const originalError = console.error;
    console.error = vi.fn();
    
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
    
    // Restore console.error
    console.error = originalError;
  });

  it('handles auth state changes', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    renderHook(() => useAuth(), { wrapper });

    // Verify that onAuthStateChange was called to set up the listener
    expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
  });

  it('sets dev mode correctly', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isDevMode).toBe(false);
  });
});
