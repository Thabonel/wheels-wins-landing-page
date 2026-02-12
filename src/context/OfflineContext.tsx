
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { offlineManager } from '@/services/offlineManager';

interface OfflineContextType {
  isOffline: boolean;
  setOffline: (offline: boolean) => void;
  addToQueue: (action: string, data: any) => void;
  queueSize: number;
  cacheStats: { entries: number; size: number; maxSize: number };
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [queueSize, setQueueSize] = useState(offlineManager.queueSize);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Sync queue size periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setQueueSize(offlineManager.queueSize);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const setOffline = (offline: boolean) => {
    setIsOffline(offline);
  };

  const addToQueue = useCallback((action: string, data: any) => {
    offlineManager.addToQueue({
      endpoint: `/api/v1/${action.replace(/_/g, '-')}`,
      method: 'POST',
      data,
      priority: 'medium',
    });
    setQueueSize(offlineManager.queueSize);
  }, []);

  const cacheStats = offlineManager.cacheStats;

  return (
    <OfflineContext.Provider value={{ isOffline, setOffline, addToQueue, queueSize, cacheStats }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};
