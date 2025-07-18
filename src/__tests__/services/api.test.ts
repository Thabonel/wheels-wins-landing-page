import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticatedFetch, apiFetch, getAuthenticatedWebSocketUrl } from '../../services/api';
import { mockSupabase } from '../../test/mocks/supabase';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('authenticatedFetch', () => {
    it('includes auth headers with valid session', async () => {
      localStorage.setItem('use_reference_tokens', 'false');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
        headers: new Map([['content-type', 'application/json']])
      });

      await authenticatedFetch('/test', { method: 'GET' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^Bearer .+/),
            'Content-Type': 'application/json',
            'X-Auth-Type': 'jwt'
          })
        })
      );
      
      localStorage.removeItem('use_reference_tokens');
    });

    it('throws error when no session available', async () => {
      localStorage.setItem('use_reference_tokens', 'false');
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null
      });

      await expect(authenticatedFetch('/test')).rejects.toThrow(
        'No valid session found. Please log in.'
      );
      
      localStorage.removeItem('use_reference_tokens');
    });

    it('handles 401 errors by refreshing token and retrying', async () => {
      localStorage.setItem('use_reference_tokens', 'false');
      
      mockSupabase.auth.getSession
        .mockResolvedValueOnce({
          data: { session: { access_token: 'initial-token' } },
          error: null
        })
        .mockResolvedValueOnce({
          data: { session: { access_token: 'initial-token' } },
          error: null
        });
      
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Map([['content-type', 'application/json']])
      });

      // Second call (after refresh) succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
        headers: new Map([['content-type', 'application/json']])
      });

      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: { access_token: 'new-token' } },
        error: null
      });

      const response = await authenticatedFetch('/test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(200);
      
      localStorage.removeItem('use_reference_tokens');
    });

    it('throws error when refresh fails', async () => {
      localStorage.setItem('use_reference_tokens', 'false');
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { access_token: 'initial-token' } },
        error: null
      });
      
      // First fetch returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Map([['content-type', 'application/json']])
      });

      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: null },
        error: new Error('Refresh failed')
      });

      await expect(authenticatedFetch('/test')).rejects.toThrow(
        'Session expired and refresh failed. Please log in again.'
      );
      
      localStorage.removeItem('use_reference_tokens');
    });

    it('handles auth service errors', async () => {
      localStorage.clear();
      localStorage.setItem('use_reference_tokens', 'false');
      
      vi.clearAllMocks();
      mockFetch.mockReset();
      mockSupabase.auth.getSession.mockReset();
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: new Error('Auth service error')
      });

      await expect(authenticatedFetch('/test')).rejects.toThrow('Authentication error: Auth service error');
      
      expect(mockFetch).not.toHaveBeenCalled();
      
      localStorage.removeItem('use_reference_tokens');
    });
  });

  describe('apiFetch', () => {
    it('makes requests without authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      await apiFetch('/public');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/public',
        {}
      );
    });
  });

  describe('getAuthenticatedWebSocketUrl', () => {
    beforeEach(() => {
      mockSupabase.auth.getSession.mockReset();
    });

    it('generates WebSocket URL with token', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { access_token: 'mock-token' } },
        error: null
      });

      const url = await getAuthenticatedWebSocketUrl('/ws');

      expect(url).toContain('ws://localhost:8000');
      expect(url).toContain('token=mock-token');
    });

    it('handles anonymous sessions', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null
      });

      const url = await getAuthenticatedWebSocketUrl('/ws');

      expect(url).toContain('token=anonymous');
    });

    it.skip('uses environment override when available', async () => {
      // Note: Environment variables are read-only in Vite tests
      // This test would need to be implemented differently or tested in integration tests
      const url = await getAuthenticatedWebSocketUrl('/ws');
      expect(url).toContain('wss://pam-backend.onrender.com');
    });
  });
});
