
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type Region = 'US' | 'Canada' | 'Australia';

interface RegionContextType {
  region: Region;
  setRegion: (region: Region) => void;
  isLoading: boolean;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegion] = useState<Region>('US');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // Set default region or load from user preferences
    if (user) {
      // Could load from user profile in the future
      setRegion('US');
    }
    setIsLoading(false);
  }, [user]);

  return (
    <RegionContext.Provider value={{ region, setRegion, isLoading }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (context === undefined) {
    throw new Error('useRegion must be used within a RegionProvider');
  }
  return context;
}
