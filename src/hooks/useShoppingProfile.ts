
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ShoppingProfile {
  id?: string;
  userId: string;
  travelStyle: 'budget' | 'mid-range' | 'luxury' | 'adventure' | 'business' | 'leisure';
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
      const { data, error } = await supabase
        .from('user_shopping_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile({
          id: data.id,
          userId: data.user_id,
          travelStyle: data.travel_style,
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
      const { data, error } = await supabase
        .from('user_shopping_profiles')
        .upsert({
          user_id: user.id,
          travel_style: profileData.travelStyle || 'budget',
          price_sensitivity: profileData.priceSensitivity || 0.5,
          preferred_categories: profileData.preferredCategories || [],
          seasonal_preferences: profileData.seasonalPreferences || {}
        })
        .select()
        .single();

      if (error) throw error;

      setProfile({
        id: data.id,
        userId: data.user_id,
        travelStyle: data.travel_style,
        priceSensitivity: data.price_sensitivity,
        preferredCategories: data.preferred_categories || [],
        seasonalPreferences: data.seasonal_preferences || {},
        createdAt: data.created_at,
        updatedAt: data.updated_at
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
