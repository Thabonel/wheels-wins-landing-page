import { useState, useEffect, useCallback } from 'react';
import { offlineManager } from '@/services/offlineManager';
import { MobileOptimizer } from '@/services/mobileOptimizer';
import { useProgressiveLoading } from './useProgressiveLoading';

export interface MobileOptimizedOptions {
  enableOffline?: boolean;
  enableCompression?: boolean;
  enableProgressive?: boolean;
  cacheKey?: string;
  essentialFields?: string[];
}

export function useMobileOptimized<T>(
  apiEndpoint: string,
  options: MobileOptimizedOptions = {}
) {
  const {
    enableOffline = true,
    enableCompression = true,
    enableProgressive = true,
    cacheKey,
    essentialFields = []
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'cached'>('online');

  const isMobile = window.innerWidth <= 768;

  // Progressive loading for lists
  const progressiveLoader = useProgressiveLoading(
    useCallback(async (page: number, limit: number) => {
      const url = `${apiEndpoint}?page=${page}&limit=${limit}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }, [apiEndpoint]),
    {
      batchSize: isMobile ? 5 : 10,
      delay: isMobile ? 500 : 300
    }
  );

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Try cache first (offline or performance)
      if (!forceRefresh && cacheKey && enableOffline) {
        const cached = offlineManager.getCache(cacheKey);
        if (cached) {
          let processedData = cached;
          
          // Apply mobile optimizations to cached data
          if (isMobile && enableCompression && essentialFields.length > 0) {
            processedData = MobileOptimizer.selectiveFields(
              cached,
              essentialFields as (keyof typeof cached)[],
              true
            );
          }
          
          setData(processedData);
          setNetworkStatus('cached');
          setLoading(false);
          return;
        }
      }

      // Determine if we're online
      if (offlineManager.isOffline) {
        setNetworkStatus('offline');
        if (enableOffline && cacheKey) {
          const cached = offlineManager.getCache(cacheKey);
          if (cached) {
            setData(cached);
            setLoading(false);
            return;
          }
        }
        throw new Error('No offline data available');
      }

      // Make API request with mobile optimizations
      const apiOptions: RequestInit = {
        headers: {
          'Accept': 'application/json',
          'X-Mobile-Client': isMobile ? 'true' : 'false',
          'X-Compression-Enabled': enableCompression ? 'true' : 'false'
        }
      };

      let responseData: T;

      if (enableOffline) {
        responseData = await offlineManager.apiCall(
          apiEndpoint,
          apiOptions,
          cacheKey
        );
      } else {
        const response = await fetch(apiEndpoint, apiOptions);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        responseData = await response.json();
      }

      // Apply mobile optimizations
      if (isMobile && enableCompression) {
        const optimized = MobileOptimizer.compressPayload(responseData, {
          enabled: true,
          threshold: 25 * 1024, // 25KB
          algorithm: 'gzip'
        });

        if (essentialFields.length > 0) {
          responseData = MobileOptimizer.selectiveFields(
            optimized.data,
            essentialFields as (keyof typeof optimized.data)[],
            true
          ) as T;
        } else {
          responseData = optimized.data;
        }
      }

      setData(responseData);
      setNetworkStatus('online');

      // Cache the result
      if (enableOffline && cacheKey) {
        offlineManager.setCache(cacheKey, responseData);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      // Try to fallback to cache on error
      if (enableOffline && cacheKey) {
        const cached = offlineManager.getCache(cacheKey);
        if (cached) {
          setData(cached);
          setNetworkStatus('cached');
          setError(`${errorMessage} (showing cached data)`);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, cacheKey, enableOffline, enableCompression, essentialFields, isMobile]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for online/offline changes
  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return {
    data,
    loading,
    error,
    networkStatus,
    refetch,
    progressiveLoader: enableProgressive ? progressiveLoader : null,
    offlineStats: enableOffline ? offlineManager.cacheStats : null
  };
}

// Specialized hook for PAM API calls
export function usePamMobileOptimized(endpoint: string, options: MobileOptimizedOptions = {}) {
  return useMobileOptimized(endpoint, {
    enableOffline: true,
    enableCompression: true,
    enableProgressive: true,
    essentialFields: ['id', 'title', 'content', 'timestamp', 'user_id'],
    ...options
  });
}