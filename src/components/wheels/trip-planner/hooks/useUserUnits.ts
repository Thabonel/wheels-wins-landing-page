import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useUserUnits() {
  const [units, setUnits] = useState<'imperial' | 'metric'>('metric');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchUserRegion() {
      if (!user) {
        // Default to metric if no user
        setUnits('metric');
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('region')
          .eq('id', user.id)
          .single();

        if (error) {
          console.warn('Error fetching user profile:', error);
          setUnits('metric');
          setLoading(false);
          return;
        }

        // Determine units based on region
        const userUnits = getUnitsFromRegion(profile?.region);
        setUnits(userUnits);
      } catch (error) {
        console.warn('Error determining user units:', error);
        setUnits('metric');
      } finally {
        setLoading(false);
      }
    }

    fetchUserRegion();
  }, [user]);

  return { units, loading };
}

function getUnitsFromRegion(region: string | null): 'imperial' | 'metric' {
  if (!region) return 'metric';

  // Countries that use Imperial system
  const imperialCountries = [
    'US', 'USA', 'United States',
    'LR', 'Liberia', 
    'MM', 'Myanmar', 'Burma',
    // UK uses a mix but mostly metric now, defaulting to metric
  ];

  // Check if region matches any imperial country
  const isImperial = imperialCountries.some(country => 
    region.toLowerCase().includes(country.toLowerCase())
  );

  return isImperial ? 'imperial' : 'metric';
}