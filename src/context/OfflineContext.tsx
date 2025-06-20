
import React, { createContext, useContext, useState } from 'react';

interface OfflineContextType {
  isOffline: boolean;
  setOffline: (offline: boolean) => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOffline, setIsOffline] = useState(false);

  const setOffline = (offline: boolean) => {
    setIsOffline(offline);
  };

  return (
    <OfflineContext.Provider value={{ isOffline, setOffline }}>
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
