
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserRegion } from '@/services/locationDetectionService';

export type Region = 'Australia' | 'New Zealand' | 'United States' | 'Canada' | 'United Kingdom' | 'Rest of the World';

export interface RegionConfig {
  currency: string;
  currencySymbol: string;
  units: 'imperial' | 'metric';
  country: string;
}

export const REGION_CONFIG: Record<Region, RegionConfig> = {
  'Australia': {
    currency: 'AUD',
    currencySymbol: 'A$',
    units: 'metric',
    country: 'AU'
  },
  'New Zealand': {
    currency: 'NZD',
    currencySymbol: 'NZ$',
    units: 'metric',
    country: 'NZ'
  },
  'United States': {
    currency: 'USD',
    currencySymbol: '$',
    units: 'imperial',
    country: 'US'
  },
  'Canada': {
    currency: 'CAD',
    currencySymbol: 'C$',
    units: 'metric',
    country: 'CA'
  },
  'United Kingdom': {
    currency: 'GBP',
    currencySymbol: '£',
    units: 'metric',
    country: 'GB'
  },
  'Rest of the World': {
    currency: 'USD',
    currencySymbol: '$',
    units: 'metric',
    country: 'WORLD'
  }
};

interface RegionContextType {
  region: Region;
  setRegion: (region: Region) => void;
  regionConfig: RegionConfig;
  getCurrencyForRegion: (region: Region) => RegionConfig;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

export const RegionProvider = ({ children }: { children: React.ReactNode }) => {
  const [region, setRegion] = useState<Region>('Rest of the World');
  const [isDetecting, setIsDetecting] = useState(true);
  
  // Auto-detect user's region on mount
  useEffect(() => {
    async function detectRegion() {
      try {
        const detectedRegion = await getUserRegion();
        setRegion(detectedRegion);
      } catch (error) {
        console.error('Failed to detect region:', error);
        // Keep default region
      } finally {
        setIsDetecting(false);
      }
    }
    
    detectRegion();
  }, []);
  
  const regionConfig = REGION_CONFIG[region];
  
  const getCurrencyForRegion = (targetRegion: Region): RegionConfig => {
    return REGION_CONFIG[targetRegion];
  };

  return (
    <RegionContext.Provider value={{ 
      region, 
      setRegion, 
      regionConfig, 
      getCurrencyForRegion 
    }}>
      {children}
    </RegionContext.Provider>
  );
};

export const useRegion = () => {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error('useRegion must be used within RegionProvider');
  }
  return context;
};
