import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticatedFetch, apiFetch, getAuthenticatedWebSocketUrl } from '../../services/api';
import { mockSupabase } from '../../test/mocks/supabase';

// Import mocks
import '../../test/mocks/supabase';

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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      });

      await authenticatedFetch('/test', { method: 'GET' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('throws error when no session available', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null
      });

      await expect(authenticatedFetch('/test')).rejects.toThrow(
        'No valid session found. Please log in.'
      );
    });

    it('handles 401 errors by refreshing token and retrying', async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      // Second call (after refresh) succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      });

      const response = await authenticatedFetch('/test');

      expect(mockSupabase.auth.refreshSession).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(200);
    });

    it('throws error when refresh fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: null },
        error: new Error('Refresh failed')
      });

      await expect(authenticatedFetch('/test')).rejects.toThrow(
        'Session expired and refresh failed. Please log in again.'
      );
    });

    it('handles auth service errors', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: new Error('Auth service error')
      });

      await expect(authenticatedFetch('/test')).rejects.toThrow(
        'Authentication error: Auth service error'
      );
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
        expect.stringContaining('/public'),
        {}
      );
    });
  });

  describe('getAuthenticatedWebSocketUrl', () => {
    it('generates WebSocket URL with token', async () => {
      const url = await getAuthenticatedWebSocketUrl('/ws');

      expect(url).toContain('wss://');
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