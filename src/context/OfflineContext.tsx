
import React, { createContext, useContext, useState, useEffect } from 'react';

interface OfflineContextType {
  isOffline: boolean;
  setOffline: (offline: boolean) => void;
  addToQueue: (action: string, data: any) => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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

  const setOffline = (offline: boolean) => {
    setIsOffline(offline);
  };

  const addToQueue = (action: string, data: any) => {
    console.log('Adding to offline queue:', action, data);
    // In a real implementation, this would store the action for later sync
  };

  return (
    <OfflineContext.Provider value={{ isOffline, setOffline, addToQueue }}>
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
