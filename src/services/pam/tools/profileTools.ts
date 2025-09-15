/**
 * Profile Tools Implementation
 * Functions for retrieving user profile data, settings, and preferences
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// ===================
// TYPE DEFINITIONS
// ===================

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
  financial_goals?: {
    emergency_fund_target?: number;
    monthly_savings_goal?: number;
    retirement_goal?: number;
    debt_payoff_goal?: number;
  };
  personal_info?: {
    age?: number;
    occupation?: string;
    location?: string;
    annual_income?: number;
  };
  statistics?: {
    total_expenses: number;
    total_income: number;
    total_trips: number;
    account_age_days: number;
  };
}

export interface UserSettings {
  id: string;
  user_id: string;
  notifications: {
    email_enabled: boolean;
    push_enabled: boolean;
    budget_alerts: boolean;
    trip_reminders: boolean;
    bill_reminders: boolean;
  };
  privacy: {
    data_sharing: boolean;
    analytics_tracking: boolean;
    location_tracking: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    currency: string;
    date_format: string;
    language: string;
  };
  integrations: {
    bank_connected: boolean;
    calendar_synced: boolean;
    vehicle_connected: boolean;
  };
}

export interface UserPreferences {
  id: string;
  user_id: string;
  financial: {
    default_budget_categories: string[];
    expense_categorization_rules: Record<string, string>;
    preferred_payment_methods: string[];
  };
  travel: {
    preferred_fuel_stations: string[];
    default_vehicle_id?: string;
    trip_tracking_enabled: boolean;
  };
  interface: {
    dashboard_widgets: string[];
    quick_actions: string[];
    favorite_reports: string[];
  };
}

export interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ===================
// PROFILE FUNCTIONS
// ===================

/**
 * Get comprehensive user profile data
 */
export async function getUserProfile(
  userId: string,
  options: {
    include_financial_goals?: boolean;
    include_preferences?: boolean;
    include_statistics?: boolean;
  } = {}
): Promise<ToolResponse<UserProfile>> {
  try {
    logger.debug('Getting user profile', { userId, options });

    // Get basic profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single();

    if (profileError) {
      logger.error('Error fetching user profile', profileError);
      return {
        success: false,
        error: 'Failed to fetch user profile',
        message: 'Could not retrieve your profile information. Please try again.'
      };
    }

    if (!profile) {
      return {
        success: false,
        error: 'Profile not found',
        message: 'No profile found for this user.'
      };
    }

    // Build response object
    const userProfile: UserProfile = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    };

    // Add financial goals if requested
    if (options.include_financial_goals) {
      const { data: goals } = await supabase
        .from('user_settings')
        .select('financial_goals')
        .eq('user_id', userId)
        .single();
      
      userProfile.financial_goals = goals?.financial_goals || {};
    }

    // Add personal information
    const { data: personalInfo } = await supabase
      .from('user_settings')
      .select('personal_info')
      .eq('user_id', userId)
      .single();
    
    userProfile.personal_info = personalInfo?.personal_info || {};

    // Add statistics if requested
    if (options.include_statistics) {
      const [expensesData, incomeData, tripsData] = await Promise.all([
        supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', userId),
        supabase
          .from('income')
          .select('amount')
          .eq('user_id', userId),
        supabase
          .from('trips')
          .select('id')
          .eq('user_id', userId)
      ]);

      const totalExpenses = expensesData.data?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
      const totalIncome = incomeData.data?.reduce((sum, inc) => sum + (inc.amount || 0), 0) || 0;
      const totalTrips = tripsData.data?.length || 0;
      
      const accountAgeMs = Date.now() - new Date(profile.created_at).getTime();
      const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));

      userProfile.statistics = {
        total_expenses: totalExpenses,
        total_income: totalIncome,
        total_trips: totalTrips,
        account_age_days: accountAgeDays
      };
    }

    logger.debug('Successfully retrieved user profile', { userId });
    
    return {
      success: true,
      data: userProfile,
      message: 'Profile retrieved successfully'
    };

  } catch (error) {
    logger.error('Unexpected error in getUserProfile', error);
    return {
      success: false,
      error: 'Unexpected error',
      message: 'An unexpected error occurred while retrieving your profile.'
    };
  }
}

/**
 * Get user application settings
 */
export async function getUserSettings(
  userId: string,
  category?: 'notifications' | 'privacy' | 'display' | 'currency' | 'language' | 'integrations' | 'security' | 'all'
): Promise<ToolResponse<UserSettings | Partial<UserSettings>>> {
  try {
    logger.debug('Getting user settings', { userId, category });

    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.error('Error fetching user settings', error);
      return {
        success: false,
        error: 'Failed to fetch settings',
        message: 'Could not retrieve your settings. Please try again.'
      };
    }

    if (!settings) {
      // Return default settings if none exist
      const defaultSettings: UserSettings = {
        id: '',
        user_id: userId,
        notifications: {
          email_enabled: true,
          push_enabled: true,
          budget_alerts: true,
          trip_reminders: true,
          bill_reminders: true
        },
        privacy: {
          data_sharing: false,
          analytics_tracking: true,
          location_tracking: true
        },
        display: {
          theme: 'auto',
          currency: 'USD',
          date_format: 'MM/DD/YYYY',
          language: 'en'
        },
        integrations: {
          bank_connected: false,
          calendar_synced: false,
          vehicle_connected: false
        }
      };

      return {
        success: true,
        data: defaultSettings,
        message: 'Default settings returned (no custom settings found)'
      };
    }

    // Parse settings and ensure proper structure
    const userSettings: UserSettings = {
      id: settings.id,
      user_id: settings.user_id,
      notifications: settings.notifications || {
        email_enabled: true,
        push_enabled: true,
        budget_alerts: true,
        trip_reminders: true,
        bill_reminders: true
      },
      privacy: settings.privacy || {
        data_sharing: false,
        analytics_tracking: true,
        location_tracking: true
      },
      display: settings.display || {
        theme: 'auto',
        currency: 'USD',
        date_format: 'MM/DD/YYYY',
        language: 'en'
      },
      integrations: settings.integrations || {
        bank_connected: false,
        calendar_synced: false,
        vehicle_connected: false
      }
    };

    // Return specific category if requested
    if (category && category !== 'all') {
      const categoryData = userSettings[category as keyof UserSettings];
      return {
        success: true,
        data: { [category]: categoryData } as Partial<UserSettings>,
        message: `${category} settings retrieved successfully`
      };
    }

    logger.debug('Successfully retrieved user settings', { userId });
    
    return {
      success: true,
      data: userSettings,
      message: 'Settings retrieved successfully'
    };

  } catch (error) {
    logger.error('Unexpected error in getUserSettings', error);
    return {
      success: false,
      error: 'Unexpected error',
      message: 'An unexpected error occurred while retrieving your settings.'
    };
  }
}

/**
 * Get user personalization preferences
 */
export async function getUserPreferences(
  userId: string,
  options: {
    include_defaults?: boolean;
  } = {}
): Promise<ToolResponse<UserPreferences>> {
  try {
    logger.debug('Getting user preferences', { userId, options });

    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error('Error fetching user preferences', error);
      return {
        success: false,
        error: 'Failed to fetch preferences',
        message: 'Could not retrieve your preferences. Please try again.'
      };
    }

    // Default preferences
    const defaultPreferences: UserPreferences = {
      id: '',
      user_id: userId,
      financial: {
        default_budget_categories: [
          'food_dining',
          'transportation',
          'entertainment',
          'utilities',
          'healthcare',
          'shopping'
        ],
        expense_categorization_rules: {
          'gas station': 'fuel',
          'restaurant': 'food_dining',
          'grocery': 'food_dining',
          'amazon': 'shopping'
        },
        preferred_payment_methods: ['credit_card', 'debit_card']
      },
      travel: {
        preferred_fuel_stations: ['Shell', 'Exxon', 'BP'],
        trip_tracking_enabled: true
      },
      interface: {
        dashboard_widgets: ['expenses_summary', 'budget_status', 'recent_trips'],
        quick_actions: ['add_expense', 'log_trip', 'check_budget'],
        favorite_reports: ['monthly_spending', 'fuel_efficiency']
      }
    };

    if (!preferences) {
      return {
        success: true,
        data: defaultPreferences,
        message: options.include_defaults ? 
          'Default preferences returned (no custom preferences found)' :
          'No custom preferences found'
      };
    }

    // Merge with defaults to ensure complete structure
    const userPreferences: UserPreferences = {
      id: preferences.id,
      user_id: preferences.user_id,
      financial: {
        ...defaultPreferences.financial,
        ...preferences.financial
      },
      travel: {
        ...defaultPreferences.travel,
        ...preferences.travel
      },
      interface: {
        ...defaultPreferences.interface,
        ...preferences.interface
      }
    };

    logger.debug('Successfully retrieved user preferences', { userId });
    
    return {
      success: true,
      data: userPreferences,
      message: 'Preferences retrieved successfully'
    };

  } catch (error) {
    logger.error('Unexpected error in getUserPreferences', error);
    return {
      success: false,
      error: 'Unexpected error',
      message: 'An unexpected error occurred while retrieving your preferences.'
    };
  }
}

// ===================
// UTILITY FUNCTIONS
// ===================

/**
 * Check if user exists
 */
export async function checkUserExists(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Get user's display name
 */
export async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    return data?.full_name || data?.email?.split('@')[0] || 'User';
  } catch {
    return 'User';
  }
}

export default {
  getUserProfile,
  getUserSettings,
  getUserPreferences,
  checkUserExists,
  getUserDisplayName
};