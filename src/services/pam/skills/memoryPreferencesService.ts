import { supabase } from '@/integrations/supabase/client';
import type { PamMemoryPreference, MemoryPreferenceCategory } from './skills/types';

export async function getPreferencesForUser(userId: string): Promise<PamMemoryPreference[]> {
  const { data, error } = await supabase
    .from('pam_memory_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('Failed to load memory preferences:', error);
    return [];
  }

  return data as PamMemoryPreference[];
}

export async function getPreferenceByKey(
  userId: string,
  category: MemoryPreferenceCategory,
  key: string
): Promise<PamMemoryPreference | null> {
  const { data, error } = await supabase
    .from('pam_memory_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .eq('preference_key', key)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Failed to load preference:', error);
    }
    return null;
  }

  return data as PamMemoryPreference;
}

export async function getPreferencesByCategory(
  userId: string,
  category: MemoryPreferenceCategory
): Promise<PamMemoryPreference[]> {
  const { data, error } = await supabase
    .from('pam_memory_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .eq('is_active', true);

  if (error) {
    console.error('Failed to load preferences by category:', error);
    return [];
  }

  return data as PamMemoryPreference[];
}

export async function setPreference(
  userId: string,
  category: MemoryPreferenceCategory,
  key: string,
  value: Record<string, unknown>,
  source: PamMemoryPreference['source'] = 'user',
  confidence = 1.0
): Promise<PamMemoryPreference | null> {
  const { data: existing } = await supabase
    .from('pam_memory_preferences')
    .select('id')
    .eq('user_id', userId)
    .eq('category', category)
    .eq('preference_key', key)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('pam_memory_preferences')
      .update({
        preference_value: value,
        confidence,
        source,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update preference:', error);
      return null;
    }

    return data as PamMemoryPreference;
  }

  const { data, error } = await supabase
    .from('pam_memory_preferences')
    .insert({
      user_id: userId,
      category,
      preference_key: key,
      preference_value: value,
      confidence,
      source
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create preference:', error);
    return null;
  }

  return data as PamMemoryPreference;
}

export async function deletePreference(
  userId: string,
  preferenceId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('pam_memory_preferences')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', preferenceId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete preference:', error);
    return false;
  }

  return true;
}

export async function buildSpecialistContext(userId: string): Promise<{
  region?: string;
  vehicleType?: string;
  travelStyle?: string;
  fuelPreference?: string;
  budgetGoals?: Record<string, unknown>;
  preferredCampingStyle?: string;
  accessibilityNeeds?: string;
  tripPlanningPreferences?: Record<string, unknown>;
  incomeInterests?: string;
}> {
  const prefs = await getPreferencesForUser(userId);
  const context: Record<string, unknown> = {};

  for (const pref of prefs) {
    const val = pref.preference_value;
    switch (pref.category) {
      case 'region':
        context.region = val.region as string;
        break;
      case 'vehicle_type':
        context.vehicleType = val.vehicle_type as string;
        break;
      case 'travel_style':
        context.travelStyle = val.travel_style as string;
        break;
      case 'fuel_preference':
        context.fuelPreference = val.fuel_preference as string;
        break;
      case 'budget_goals':
        context.budgetGoals = val;
        break;
      case 'preferred_camping_style':
        context.preferredCampingStyle = val.preferred_camping_style as string;
        break;
      case 'accessibility_needs':
        context.accessibilityNeeds = val.accessibility_needs as string;
        break;
      case 'trip_planning_preferences':
        context.tripPlanningPreferences = val;
        break;
      case 'income_interests':
        context.incomeInterests = val.income_interests as string;
        break;
    }
  }

  return context;
}
