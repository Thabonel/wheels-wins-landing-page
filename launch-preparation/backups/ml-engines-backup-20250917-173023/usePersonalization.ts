import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { userExperiencePersonalizer } from '@/services/ml/personalizationEngine';

interface PersonalizedUIConfig {
  layout: {
    gridColumns: number;
    widgetSizes: Record<string, 'small' | 'medium' | 'large'>;
    quickAccessItems: string[];
    hiddenWidgets: string[];
  };
  interactions: {
    confirmationDialogs: boolean;
    autoSaveFrequency: number;
    tooltipVerbosity: 'minimal' | 'standard' | 'detailed';
    keyboardShortcuts: boolean;
    gestureControls: boolean;
  };
  visual: {
    colorScheme: string;
    fontSizeMultiplier: number;
    contrastLevel: 'normal' | 'high';
    animationLevel: 'none' | 'reduced' | 'full';
    iconStyle: 'minimal' | 'detailed';
  };
}

interface PersonalizedContent {
  widgets: any[];
  recommendations: any[];
  notifications: any[];
  learningContent: any[];
}

export function usePersonalization() {
  const { user } = useAuth();
  const [uiConfig, setUiConfig] = useState<PersonalizedUIConfig | null>(null);
  const [personalizedContent, setPersonalizedContent] = useState<PersonalizedContent>({
    widgets: [],
    recommendations: [],
    notifications: [],
    learningContent: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load personalized UI configuration
  const loadUIConfig = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const dynamicUI = await userExperiencePersonalizer.generateDynamicUI(user.id);

      const config: PersonalizedUIConfig = {
        layout: {
          gridColumns: dynamicUI.layout_configuration.grid_columns,
          widgetSizes: dynamicUI.layout_configuration.widget_sizes,
          quickAccessItems: dynamicUI.layout_configuration.quick_access_items,
          hiddenWidgets: dynamicUI.layout_configuration.hidden_widgets
        },
        interactions: {
          confirmationDialogs: dynamicUI.interaction_adaptations.confirmation_dialogs,
          autoSaveFrequency: dynamicUI.interaction_adaptations.auto_save_frequency,
          tooltipVerbosity: dynamicUI.interaction_adaptations.tooltip_verbosity,
          keyboardShortcuts: dynamicUI.interaction_adaptations.keyboard_shortcuts_enabled,
          gestureControls: dynamicUI.interaction_adaptations.gesture_controls
        },
        visual: {
          colorScheme: dynamicUI.visual_adaptations.color_scheme,
          fontSizeMultiplier: dynamicUI.visual_adaptations.font_size_multiplier,
          contrastLevel: dynamicUI.visual_adaptations.contrast_level,
          animationLevel: dynamicUI.visual_adaptations.animation_level,
          iconStyle: dynamicUI.visual_adaptations.icon_style
        }
      };

      setUiConfig(config);
    } catch (err) {
      console.error('Error loading UI configuration:', err);
      setError('Failed to load personalized UI configuration');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load personalized content
  const loadPersonalizedContent = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [widgets, recommendations, notifications, learningContent] = await Promise.all([
        userExperiencePersonalizer.generatePersonalizedContent(user.id, 'dashboard_widget'),
        userExperiencePersonalizer.generatePersonalizedContent(user.id, 'recommendation'),
        userExperiencePersonalizer.generatePersonalizedContent(user.id, 'notification'),
        userExperiencePersonalizer.generatePersonalizedContent(user.id, 'tip')
      ]);

      setPersonalizedContent({
        widgets,
        recommendations,
        notifications,
        learningContent
      });
    } catch (err) {
      console.error('Error loading personalized content:', err);
    }
  }, [user?.id]);

  // Track personalization events
  const trackEvent = useCallback(async (eventType: string, eventData: any) => {
    if (!user?.id) return;

    try {
      await userExperiencePersonalizer.trackPersonalizationEvent(user.id, eventType, eventData);
    } catch (err) {
      console.error('Error tracking personalization event:', err);
    }
  }, [user?.id]);

  // Utility functions for applying personalization
  const getWidgetSize = useCallback((widgetId: string): 'small' | 'medium' | 'large' => {
    return uiConfig?.layout.widgetSizes[widgetId] || 'medium';
  }, [uiConfig]);

  const isWidgetHidden = useCallback((widgetId: string): boolean => {
    return uiConfig?.layout.hiddenWidgets.includes(widgetId) || false;
  }, [uiConfig]);

  const shouldShowConfirmation = useCallback((): boolean => {
    return uiConfig?.interactions.confirmationDialogs ?? true;
  }, [uiConfig]);

  const getAnimationClass = useCallback((): string => {
    const level = uiConfig?.visual.animationLevel || 'full';
    switch (level) {
      case 'none': return 'motion-reduce';
      case 'reduced': return 'motion-safe:animate-pulse';
      case 'full': return 'motion-safe:animate-bounce';
      default: return '';
    }
  }, [uiConfig]);

  const getFontSizeClass = useCallback((): string => {
    const multiplier = uiConfig?.visual.fontSizeMultiplier || 1.0;
    if (multiplier > 1.2) return 'text-lg';
    if (multiplier < 0.9) return 'text-sm';
    return 'text-base';
  }, [uiConfig]);

  const getContrastClass = useCallback((): string => {
    const level = uiConfig?.visual.contrastLevel || 'normal';
    return level === 'high' ? 'contrast-high' : '';
  }, [uiConfig]);

  const getGridColumns = useCallback((): string => {
    const columns = uiConfig?.layout.gridColumns || 2;
    switch (columns) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 md:grid-cols-2';
      case 3: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      default: return 'grid-cols-1 md:grid-cols-2';
    }
  }, [uiConfig]);

  // Apply personalized styles to component
  const getPersonalizedStyles = useCallback((componentType: string = 'default') => {
    if (!uiConfig) return {};

    return {
      fontSize: `${uiConfig.visual.fontSizeMultiplier}rem`,
      animationDuration: uiConfig.visual.animationLevel === 'reduced' ? '0.5s' : '1s',
      filter: uiConfig.visual.contrastLevel === 'high' ? 'contrast(1.2)' : 'none'
    };
  }, [uiConfig]);

  // Initialize personalization
  useEffect(() => {
    if (user?.id) {
      loadUIConfig();
      loadPersonalizedContent();
    }
  }, [user?.id, loadUIConfig, loadPersonalizedContent]);

  return {
    // State
    uiConfig,
    personalizedContent,
    loading,
    error,

    // Actions
    loadUIConfig,
    loadPersonalizedContent,
    trackEvent,

    // Utilities
    getWidgetSize,
    isWidgetHidden,
    shouldShowConfirmation,
    getAnimationClass,
    getFontSizeClass,
    getContrastClass,
    getGridColumns,
    getPersonalizedStyles,

    // Computed values
    isPersonalized: !!uiConfig,
    quickActions: uiConfig?.layout.quickAccessItems || [],
    keyboardShortcutsEnabled: uiConfig?.interactions.keyboardShortcuts || false,
    autoSaveFrequency: uiConfig?.interactions.autoSaveFrequency || 30,
    tooltipVerbosity: uiConfig?.interactions.tooltipVerbosity || 'standard'
  };
}

export default usePersonalization;