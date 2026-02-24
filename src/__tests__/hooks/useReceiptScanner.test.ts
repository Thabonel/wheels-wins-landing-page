import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReceiptScanner } from '@/hooks/useReceiptScanner';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

vi.mock('heic2any', () => ({ default: vi.fn() }));

describe('useReceiptScanner - review step', () => {
  it('should expose pendingReview state starting as false', () => {
    const { result } = renderHook(() => useReceiptScanner());
    expect(result.current.pendingReview).toBe(false);
  });

  it('should expose pendingData state starting as null', () => {
    const { result } = renderHook(() => useReceiptScanner());
    expect(result.current.pendingData).toBe(null);
  });

  it('should expose confirmExtraction and rejectExtraction callbacks', () => {
    const { result } = renderHook(() => useReceiptScanner());
    expect(typeof result.current.confirmExtraction).toBe('function');
    expect(typeof result.current.rejectExtraction).toBe('function');
  });

  it('rejectExtraction should set error message for manual entry', () => {
    const { result } = renderHook(() => useReceiptScanner());

    act(() => {
      result.current.rejectExtraction();
    });

    expect(result.current.error).toBe('Extraction rejected - please enter details manually.');
    expect(result.current.pendingReview).toBe(false);
    expect(result.current.pendingData).toBe(null);
  });

  it('confirmExtraction with no pending data should be a no-op', () => {
    const { result } = renderHook(() => useReceiptScanner());

    act(() => {
      result.current.confirmExtraction();
    });

    expect(result.current.extracted).toBe(null);
    expect(result.current.pendingReview).toBe(false);
  });

  it('reset should clear pendingReview and pendingData', () => {
    const { result } = renderHook(() => useReceiptScanner());

    act(() => {
      result.current.rejectExtraction();
    });
    expect(result.current.error).not.toBe(null);

    act(() => {
      result.current.reset();
    });

    expect(result.current.pendingReview).toBe(false);
    expect(result.current.pendingData).toBe(null);
    expect(result.current.error).toBe(null);
  });
});
