
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface OfflineQueueItem {
  id: string;
  type: 'add_expense' | 'log_trip' | 'update_storage' | 'update_budget';
  data: any;
  timestamp: Date;
}

interface OfflineContextType {
  isOffline: boolean;
  offlineQueue: OfflineQueueItem[];
  addToQueue: (type: OfflineQueueItem['type'], data: any) => void;
  clearQueue: () => void;
  syncQueue: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() => {
    const saved = localStorage.getItem('offline-queue');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('offline-queue', JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  const addToQueue = (type: OfflineQueueItem['type'], data: any) => {
    const item: OfflineQueueItem = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      data,
      timestamp: new Date(),
    };
    setOfflineQueue(prev => [...prev, item]);
  };

  const clearQueue = () => {
    setOfflineQueue([]);
    localStorage.removeItem('offline-queue');
  };

  const syncQueue = async () => {
    if (isOffline || offlineQueue.length === 0) return;

    try {
      // Process queue items here
      // For now, just clear the queue after "sync"
      console.log('Syncing offline queue:', offlineQueue);
      clearQueue();
    } catch (error) {
      console.error('Failed to sync offline queue:', error);
    }
  };

  useEffect(() => {
    if (!isOffline && offlineQueue.length > 0) {
      syncQueue();
    }
  }, [isOffline]);

  return (
    <OfflineContext.Provider value={{
      isOffline,
      offlineQueue,
      addToQueue,
      clearQueue,
      syncQueue
    }}>
      {children}
    </OfflineContext.Provider>
  );
}
