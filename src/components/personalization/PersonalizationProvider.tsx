import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { userExperiencePersonalizer } from '@/services/ml/personalizationEngine';

interface PersonalizationContextType {
  isEnabled: boolean;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    dashboardLayout: 'minimal' | 'standard' | 'comprehensive';
    quickActions: string[];
    hiddenFeatures: string[];
  };
  personality: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    spendingStyle: 'frugal' | 'balanced' | 'liberal';
    featurePreference: 'simple' | 'advanced' | 'expert';
    interactionStyle: 'guided' | 'independent' | 'minimal';
  } | null;
  updatePreference: (key: string, value: any) => Promise<void>;
  trackInteraction: (eventType: string, data: any) => Promise<void>;
  refreshPersonalization: () => Promise<void>;
}

const PersonalizationContext = createContext<PersonalizationContextType | null>(null);

interface PersonalizationProviderProps {
  children: ReactNode;
  enablePersonalization?: boolean;
}

export function PersonalizationProvider({
  children,
  enablePersonalization = true
}: PersonalizationProviderProps) {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(enablePersonalization);
  const [preferences, setPreferences] = useState({
    theme: 'auto' as const,
    dashboardLayout: 'standard' as const,
    quickActions: ['add_expense', 'view_budget'],
    hiddenFeatures: []
  });
  const [personality, setPersonality] = useState<PersonalizationContextType['personality']>(null);
  const [loading, setLoading] = useState(false);

  // Load personalization profile
  const loadPersonalization = async () => {
    if (!user?.id || !isEnabled) return;

    try {
      setLoading(true);
      const profile = await userExperiencePersonalizer.getPersonalizationProfile(user.id);

      if (profile) {
        setPreferences({
          theme: profile.preferences.theme as any,
          dashboardLayout: profile.preferences.dashboard_layout,
          quickActions: profile.preferences.quick_actions,
          hiddenFeatures: profile.preferences.hidden_features
        });

        setPersonality({
          riskTolerance: profile.personality.risk_tolerance,
          spendingStyle: profile.personality.spending_style,
          featurePreference: profile.personality.feature_preference,
          interactionStyle: profile.personality.interaction_style
        });

        // Apply theme to document
        applyTheme(profile.preferences.theme);
      }
    } catch (error) {
      console.error('Error loading personalization:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply theme to document
  const applyTheme = (theme: string) => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // Auto theme - respect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  // Update a specific preference
  const updatePreference = async (key: string, value: any) => {
    if (!user?.id) return;

    try {
      const updatedPreferences = { ...preferences, [key]: value };
      setPreferences(updatedPreferences);

      // Update in personalization engine
      await userExperiencePersonalizer.updatePersonalizationProfile(user.id, {
        preferences: {
          ...preferences,
          [key]: value
        }
      });

      // Apply theme if it was updated
      if (key === 'theme') {
        applyTheme(value);
      }

      // Track the preference change
      await trackInteraction('preference_updated', { key, value });
    } catch (error) {
      console.error('Error updating preference:', error);
    }
  };

  // Track user interaction
  const trackInteraction = async (eventType: string, data: any) => {
    if (!user?.id || !isEnabled) return;

    try {
      await userExperiencePersonalizer.trackPersonalizationEvent(user.id, eventType, data);
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  };

  // Refresh personalization data
  const refreshPersonalization = async () => {
    await loadPersonalization();
  };

  // Load personalization on mount and user change
  useEffect(() => {
    if (user?.id && isEnabled) {
      loadPersonalization();
    }
  }, [user?.id, isEnabled]);

  // Listen for system theme changes
  useEffect(() => {
    if (preferences.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        applyTheme('auto');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [preferences.theme]);

  const contextValue: PersonalizationContextType = {
    isEnabled,
    preferences,
    personality,
    updatePreference,
    trackInteraction,
    refreshPersonalization
  };

  return (
    <PersonalizationContext.Provider value={contextValue}>
      {children}
    </PersonalizationContext.Provider>
  );
}

// Hook to use personalization context
export function usePersonalizationContext(): PersonalizationContextType {
  const context = useContext(PersonalizationContext);
  if (!context) {
    throw new Error('usePersonalizationContext must be used within a PersonalizationProvider');
  }
  return context;
}

// Higher-order component for easy personalization integration
export function withPersonalization<P extends object>(
  Component: React.ComponentType<P>
) {
  const WrappedComponent = (props: P) => {
    const personalization = usePersonalizationContext();

    return (
      <Component
        {...props}
        personalization={personalization}
      />
    );
  };

  WrappedComponent.displayName = `withPersonalization(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export default PersonalizationProvider;