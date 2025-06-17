import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase';

// Define supported regions
export type Region = 'Australia' | 'New Zealand' | 'United States' | 'Canada' | 'United Kingdom' | 'Rest of the World';

interface RegionContextType {
  region: Region;
  setRegion: (region: Region) => Promise<void>;
  isLoading: boolean;
}

const RegionContext = createContext<RegionContextType>({
  region: 'Australia',
  setRegion: async () => {},
  isLoading: true,
});

export const RegionProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [region, setRegionState] = useState<Region>('Australia');
  const [isLoading, setIsLoading] = useState(true);

  // Load user's region from Supabase when authenticated
  useEffect(() => {
    const loadRegion = async () => {
      if (isAuthenticated && user) {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('region')
            .eq('user_id', user.id)
            .single();

          if (error) {
            console.error('Error fetching region:', error);
          } else if (data) {
            const userRegion = data.region as Region;
            if (isValidRegion(userRegion)) {
              setRegionState(userRegion);
            }
          }
        } catch (error) {
          console.error('Error in region fetch:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    loadRegion();
  }, [isAuthenticated, user]);

  // Function to validate region
  const isValidRegion = (region: string): region is Region => {
    return [
      'Australia',
      'New Zealand',
      'United States',
      'Canada',
      'United Kingdom',
      'Rest of the World'
    ].includes(region);
  };

  // Function to update region
  const setRegion = async (newRegion: Region) => {
    if (!isAuthenticated || !user) {
      console.warn("Cannot update region: User not authenticated");
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ region: newRegion })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating region:', error);
        return;
      }

      setRegionState(newRegion);
    } catch (error) {
      console.error('Error in region update:', error);
    }
  };

  return (
    <RegionContext.Provider value={{ region, setRegion, isLoading }}>
      {children}
    </RegionContext.Provider>
  );
};

export const useRegion = () => useContext(RegionContext);
