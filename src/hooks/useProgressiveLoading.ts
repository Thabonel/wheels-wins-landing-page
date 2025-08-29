import { useState, useEffect, useCallback, useRef } from 'react';
import { MobileOptimizer } from '@/services/mobileOptimizer';

export interface ProgressiveLoadingConfig {
  batchSize: number;
  delay: number;
  threshold: number; // px from bottom to trigger next load
  maxConcurrent: number;
}

export interface LoadingState<T> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  currentPage: number;
  totalLoaded: number;
}

const DEFAULT_CONFIG: ProgressiveLoadingConfig = {
  batchSize: 10,
  delay: 300,
  threshold: 200,
  maxConcurrent: 3
};

export function useProgressiveLoading<T>(
  fetchFunction: (page: number, limit: number) => Promise<{ items: T[]; hasMore: boolean }>,
  config: Partial<ProgressiveLoadingConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [state, setState] = useState<LoadingState<T>>({
    items: [],
    isLoading: false,
    hasMore: true,
    error: null,
    currentPage: 1,
    totalLoaded: 0
  });

  const loadingRequests = useRef(new Set<number>());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(async (page: number) => {
    if (loadingRequests.current.has(page) || 
        loadingRequests.current.size >= finalConfig.maxConcurrent) {
      return;
    }

    loadingRequests.current.add(page);
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await new Promise(resolve => setTimeout(resolve, finalConfig.delay));
      
      const result = await fetchFunction(page, finalConfig.batchSize);
      
      setState(prev => ({
        ...prev,
        items: page === 1 ? result.items : [...prev.items, ...result.items],
        hasMore: result.hasMore,
        currentPage: page + 1,
        totalLoaded: page === 1 ? result.items.length : prev.totalLoaded + result.items.length,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load data',
        isLoading: false
      }));
    } finally {
      loadingRequests.current.delete(page);
    }
  }, [fetchFunction, finalConfig.batchSize, finalConfig.delay, finalConfig.maxConcurrent]);

  const reset = useCallback(() => {
    loadingRequests.current.clear();
    setState({
      items: [],
      isLoading: false,
      hasMore: true,
      error: null,
      currentPage: 1,
      totalLoaded: 0
    });
  }, []);

  const loadInitial = useCallback(() => {
    reset();
    loadMore(1);
  }, [reset, loadMore]);

  const loadNext = useCallback(() => {
    if (state.hasMore && !state.isLoading) {
      loadMore(state.currentPage);
    }
  }, [state.hasMore, state.isLoading, state.currentPage, loadMore]);

  // Intersection Observer for infinite scroll
  const setScrollElement = useCallback((element: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (element) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && state.hasMore && !state.isLoading) {
            loadNext();
          }
        },
        { rootMargin: `${finalConfig.threshold}px` }
      );
      observerRef.current.observe(element);
    }
  }, [state.hasMore, state.isLoading, loadNext, finalConfig.threshold]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    ...state,
    loadInitial,
    loadNext,
    reset,
    setScrollElement
  };
}

// Specialized hook for PAM data with mobile optimization
export function usePamProgressiveLoading(
  endpoint: string,
  isMobile: boolean = false
) {
  const fetchPamData = useCallback(async (page: number, limit: number) => {
    const response = await fetch(`${endpoint}?page=${page}&limit=${limit}&mobile=${isMobile}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (isMobile) {
      const optimized = MobileOptimizer.compressPayload(data, {
        enabled: true,
        threshold: 10 * 1024,
        algorithm: 'gzip'
      });
      return optimized.data;
    }
    
    return data;
  }, [endpoint, isMobile]);

  return useProgressiveLoading(fetchPamData, {
    batchSize: isMobile ? 5 : 10,
    delay: isMobile ? 500 : 300,
    threshold: isMobile ? 150 : 200,
    maxConcurrent: isMobile ? 2 : 3
  });
}