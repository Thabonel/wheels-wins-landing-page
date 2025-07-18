
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type TravelStyle = 'budget' | 'mid-range' | 'luxury' | 'adventure' | 'business' | 'leisure';

interface ShoppingProfile {
  id?: string;
  userId: string;
  travelStyle: TravelStyle;
  priceSensitivity: number;
  preferredCategories: string[];
  seasonalPreferences: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export function useShoppingProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ShoppingProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Table doesn't exist yet, use default profile data
      const data = null;
      const error = null;

      if (data) {
        setProfile({
          id: data.id,
          userId: data.user_id,
          travelStyle: data.travel_style as TravelStyle,
          priceSensitivity: data.price_sensitivity,
          preferredCategories: data.preferred_categories || [],
          seasonalPreferences: data.seasonal_preferences || {},
          createdAt: data.created_at,
          updatedAt: data.updated_at
        });
      }
    } catch (error) {
      console.error('Error fetching shopping profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createOrUpdateProfile = useCallback(async (profileData: Partial<ShoppingProfile>) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Table doesn't exist yet, mock the profile creation
      console.log('Shopping profile saved:', {
        user_id: user.id,
        travel_style: profileData.travelStyle || 'budget',
        price_sensitivity: profileData.priceSensitivity || 0.5,
        preferred_categories: profileData.preferredCategories || [],
        seasonal_preferences: profileData.seasonalPreferences || {}
      });

      // Set a mock profile
      setProfile({
        id: `profile-${user.id}`,
        userId: user.id,
        travelStyle: (profileData.travelStyle || 'budget') as TravelStyle,
        priceSensitivity: profileData.priceSensitivity || 0.5,
        preferredCategories: profileData.preferredCategories || [],
        seasonalPreferences: profileData.seasonalPreferences || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating/updating shopping profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updatePreferences = useCallback(async (categories: string[]) => {
    if (!profile) return;

    await createOrUpdateProfile({
      ...profile,
      preferredCategories: categories
    });
  }, [profile, createOrUpdateProfile]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  return {
    profile,
    isLoading,
    createOrUpdateProfile,
    updatePreferences,
    fetchProfile
  };
}
