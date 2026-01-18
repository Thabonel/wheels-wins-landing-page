
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserRegion, cacheDetectedRegion } from '@/services/locationDetectionService';
import { supabase } from '@/integrations/supabase/client';

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

  // Auto-detect user's region on mount, preferring profile region for logged-in users
  useEffect(() => {
    async function detectRegion() {
      try {
        // First, check if user is logged in and has a region in their profile
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user?.id) {
          // Cast to any to bypass generated types that may not include region column
          const { data: profile, error } = await (supabase as any)
            .from('profiles')
            .select('region')
            .eq('id', session.user.id)
            .single();

          if (!error && profile?.region) {
            // Validate that the profile region is a valid Region type
            const validRegions: Region[] = ['Australia', 'New Zealand', 'United States', 'Canada', 'United Kingdom', 'Rest of the World'];
            const profileRegion = profile.region as string;
            if (validRegions.includes(profileRegion as Region)) {
              console.log(`Using profile region: ${profileRegion}`);
              setRegion(profileRegion as Region);
              cacheDetectedRegion(profileRegion as Region);
              setIsDetecting(false);
              return;
            }
          }
        }

        // Fallback to IP-based detection if not logged in or no profile region
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
