import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { TransitionProfile } from '@/types/transition.types';

interface UseTransitionModuleResult {
  isEnabled: boolean;
  isLoading: boolean;
  profile: TransitionProfile | null;
  shouldShowInNav: boolean;
  daysUntilDeparture: number | null;
}

/**
 * Hook to check if the Life Transition Navigator module is enabled for the current user
 *
 * @returns {UseTransitionModuleResult} Module status and configuration
 */
export function useTransitionModule(): UseTransitionModuleResult {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<TransitionProfile | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      setProfile(null);
      return;
    }

    const fetchTransitionProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('transition_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching transition profile:', error);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error('Unexpected error fetching transition profile:', err);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransitionProfile();
  }, [user?.id]);

  // Determine if the module is enabled
  const isEnabled = Boolean(profile?.is_enabled);

  // Determine if the module should show in navigation
  const shouldShowInNav = (() => {
    if (!profile || !profile.is_enabled) {
      return false;
    }

    // Check if auto-hide is enabled and we're past the hide date
    if (profile.auto_hide_after_departure && profile.departure_date) {
      const departureDate = new Date(profile.departure_date);
      const hideAfterDays = profile.hide_days_after_departure || 30;
      const hideDate = new Date(departureDate);
      hideDate.setDate(hideDate.getDate() + hideAfterDays);

      const now = new Date();
      if (now > hideDate) {
        return false; // Past the hide date, don't show in nav
      }
    }

    return true; // Show in nav
  })();

  // Calculate days until departure
  const daysUntilDeparture = (() => {
    if (!profile || !profile.departure_date) {
      return null;
    }

    const departureDate = new Date(profile.departure_date);
    const now = new Date();

    // Set time to midnight for accurate day calculation
    departureDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffTime = departureDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  })();

  return {
    isEnabled,
    isLoading,
    profile,
    shouldShowInNav,
    daysUntilDeparture,
  };
}
