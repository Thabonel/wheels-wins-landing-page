import { supabase } from '../../integrations/supabase/client';
import { tripRecommendationEngine } from './tripRecommendationEngine';
import { financialForecastingEngine } from './financialForecastingEngine';
import { userBehaviorPredictionEngine } from './userBehaviorPredictionEngine';
import { aiBudgetAssistant } from './aiBudgetAssistant';
import { addDays, subDays, format } from 'date-fns';

interface UserPersonality {
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
  spending_style: 'frugal' | 'balanced' | 'liberal';
  planning_horizon: 'short' | 'medium' | 'long';
  feature_preference: 'simple' | 'advanced' | 'expert';
  interaction_style: 'guided' | 'independent' | 'minimal';
  notification_preference: 'frequent' | 'moderate' | 'minimal';
}

interface PersonalizationProfile {
  user_id: string;
  personality: UserPersonality;
  preferences: {
    dashboard_layout: 'minimal' | 'standard' | 'comprehensive';
    default_currency: string;
    date_format: string;
    theme: 'light' | 'dark' | 'auto';
    quick_actions: string[];
    favorite_categories: string[];
    hidden_features: string[];
  };
  behavioral_patterns: {
    peak_activity_hours: number[];
    preferred_session_length: number;
    feature_adoption_rate: number;
    error_tolerance: number;
    help_seeking_frequency: number;
  };
  context_awareness: {
    location_preferences: any[];
    seasonal_patterns: Record<string, any>;
    social_influences: string[];
    device_preferences: Record<string, number>;
  };
  learning_history: {
    completed_tutorials: string[];
    dismissed_tips: string[];
    successful_workflows: string[];
    problem_areas: string[];
  };
  last_updated: string;
}

interface PersonalizedContent {
  content_type: 'dashboard_widget' | 'notification' | 'recommendation' | 'tip' | 'tutorial' | 'alert';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  content: any;
  display_until: string;
  conditions: {
    min_engagement_score?: number;
    required_features?: string[];
    exclude_if_completed?: string[];
    time_restrictions?: { start_hour: number; end_hour: number };
  };
  personalization_score: number;
}

interface DynamicUI {
  layout_configuration: {
    grid_columns: number;
    widget_sizes: Record<string, 'small' | 'medium' | 'large'>;
    widget_positions: Record<string, { x: number; y: number }>;
    hidden_widgets: string[];
    quick_access_items: string[];
  };
  interaction_adaptations: {
    confirmation_dialogs: boolean;
    auto_save_frequency: number;
    tooltip_verbosity: 'minimal' | 'standard' | 'detailed';
    keyboard_shortcuts_enabled: boolean;
    gesture_controls: boolean;
  };
  visual_adaptations: {
    color_scheme: string;
    font_size_multiplier: number;
    contrast_level: 'normal' | 'high';
    animation_level: 'none' | 'reduced' | 'full';
    icon_style: 'minimal' | 'detailed';
  };
}

export class UserExperiencePersonalizer {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
  private readonly PROFILE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any, customTtl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: customTtl || this.CACHE_TTL
    });
  }

  async getPersonalizationProfile(userId: string, options: {
    force_refresh?: boolean;
    include_predictions?: boolean;
  } = {}): Promise<PersonalizationProfile | null> {
    const { force_refresh = false, include_predictions = true } = options;

    const cacheKey = `profile_${userId}`;
    if (!force_refresh) {
      const cached = this.getCachedData<PersonalizationProfile>(cacheKey);
      if (cached) return cached;
    }

    try {
      // Get base user data
      const { data: userData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!userData) return null;

      // Get user preferences
      const { data: preferencesData } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get behavioral data
      const behaviorData = include_predictions
        ? await userBehaviorPredictionEngine.getUserBehaviorData(userId)
        : null;

      // Get historical interactions
      const interactionHistory = await this.getInteractionHistory(userId);

      // Analyze personality traits
      const personality = await this.analyzeUserPersonality(userId, behaviorData, interactionHistory);

      // Build behavioral patterns
      const behavioralPatterns = this.analyzeBehavioralPatterns(behaviorData, interactionHistory);

      // Build context awareness
      const contextAwareness = await this.buildContextAwareness(userId, interactionHistory);

      // Build learning history
      const learningHistory = await this.getLearningHistory(userId);

      // Build preferences with defaults
      const preferences = {
        dashboard_layout: preferencesData?.dashboard_layout || this.getDefaultDashboardLayout(personality),
        default_currency: preferencesData?.default_currency || 'USD',
        date_format: preferencesData?.date_format || 'MM/dd/yyyy',
        theme: preferencesData?.theme || 'auto',
        quick_actions: preferencesData?.quick_actions || this.getDefaultQuickActions(personality),
        favorite_categories: preferencesData?.favorite_categories || [],
        hidden_features: preferencesData?.hidden_features || []
      };

      const profile: PersonalizationProfile = {
        user_id: userId,
        personality,
        preferences,
        behavioral_patterns: behavioralPatterns,
        context_awareness: contextAwareness,
        learning_history: learningHistory,
        last_updated: new Date().toISOString()
      };

      this.setCachedData(cacheKey, profile, this.PROFILE_CACHE_TTL);
      return profile;

    } catch (error) {
      console.error('Error getting personalization profile:', error);
      return null;
    }
  }

  private async analyzeUserPersonality(userId: string, behaviorData: any, interactionHistory: any[]): Promise<UserPersonality> {
    // Risk tolerance analysis
    let riskTolerance: UserPersonality['risk_tolerance'] = 'moderate';
    if (behaviorData) {
      if (behaviorData.engagement_score > 80 && behaviorData.feature_usage['advanced_features'] > 10) {
        riskTolerance = 'aggressive';
      } else if (behaviorData.engagement_score < 40 || behaviorData.activity_pattern === 'declining') {
        riskTolerance = 'conservative';
      }
    }

    // Spending style analysis
    const spendingStyle = await this.analyzeSpendingStyle(userId);

    // Planning horizon analysis
    const planningHorizon = await this.analyzePlanningHorizon(userId, interactionHistory);

    // Feature preference analysis
    const featurePreference = this.analyzeFeaturePreference(behaviorData, interactionHistory);

    // Interaction style analysis
    const interactionStyle = this.analyzeInteractionStyle(interactionHistory);

    // Notification preference analysis
    const notificationPreference = this.analyzeNotificationPreference(interactionHistory);

    return {
      risk_tolerance: riskTolerance,
      spending_style: spendingStyle,
      planning_horizon: planningHorizon,
      feature_preference: featurePreference,
      interaction_style: interactionStyle,
      notification_preference: notificationPreference
    };
  }

  private async analyzeSpendingStyle(userId: string): Promise<UserPersonality['spending_style']> {
    // Get spending data
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, category')
      .eq('user_id', userId)
      .gte('date', subDays(new Date(), 90).toISOString());

    if (!expenses || expenses.length === 0) return 'balanced';

    // Get income data
    const { data: income } = await supabase
      .from('user_income')
      .select('amount, frequency')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!income) return 'balanced';

    const monthlyIncome = this.normalizeToMonthlyAmount(income.amount, income.frequency);
    const monthlySpending = expenses.reduce((sum, expense) => sum + expense.amount, 0) / 3; // 3 months average

    const spendingRatio = monthlySpending / monthlyIncome;

    if (spendingRatio < 0.6) return 'frugal';
    if (spendingRatio > 0.9) return 'liberal';
    return 'balanced';
  }

  private normalizeToMonthlyAmount(amount: number, frequency: string): number {
    switch (frequency) {
      case 'weekly': return amount * 4.33;
      case 'bi-weekly': return amount * 2.17;
      case 'monthly': return amount;
      case 'quarterly': return amount / 3;
      case 'yearly': return amount / 12;
      default: return amount;
    }
  }

  private async analyzePlanningHorizon(userId: string, interactionHistory: any[]): Promise<UserPersonality['planning_horizon']> {
    // Look at goal-setting behavior and forecast usage
    const { data: goals } = await supabase
      .from('savings_goals')
      .select('target_date, created_at')
      .eq('user_id', userId);

    if (!goals || goals.length === 0) return 'short';

    // Calculate average goal timeframe
    const avgTimeframe = goals.reduce((sum, goal) => {
      const timeframe = new Date(goal.target_date).getTime() - new Date(goal.created_at).getTime();
      return sum + timeframe;
    }, 0) / goals.length;

    const monthsAhead = avgTimeframe / (30 * 24 * 60 * 60 * 1000);

    if (monthsAhead > 24) return 'long';
    if (monthsAhead > 6) return 'medium';
    return 'short';
  }

  private analyzeFeaturePreference(behaviorData: any, interactionHistory: any[]): UserPersonality['feature_preference'] {
    if (!behaviorData) return 'simple';

    const advancedFeatureUsage = behaviorData.feature_usage?.['advanced_features'] || 0;
    const totalFeatureUsage = Object.values(behaviorData.feature_usage || {}).reduce((sum: number, usage: any) => sum + usage, 0);

    const advancedRatio = totalFeatureUsage > 0 ? advancedFeatureUsage / totalFeatureUsage : 0;

    if (advancedRatio > 0.3) return 'expert';
    if (advancedRatio > 0.1) return 'advanced';
    return 'simple';
  }

  private analyzeInteractionStyle(interactionHistory: any[]): UserPersonality['interaction_style'] {
    const helpRequests = interactionHistory.filter(event => event.event_type === 'help_request').length;
    const tutorialCompletions = interactionHistory.filter(event => event.event_type === 'tutorial_completed').length;
    const totalInteractions = interactionHistory.length;

    if (totalInteractions === 0) return 'guided';

    const helpRatio = helpRequests / totalInteractions;
    const tutorialRatio = tutorialCompletions / totalInteractions;

    if (helpRatio > 0.1 || tutorialRatio > 0.2) return 'guided';
    if (helpRatio < 0.02 && tutorialRatio < 0.05) return 'minimal';
    return 'independent';
  }

  private analyzeNotificationPreference(interactionHistory: any[]): UserPersonality['notification_preference'] {
    const notificationInteractions = interactionHistory.filter(event =>
      event.event_type === 'notification_clicked' || event.event_type === 'notification_dismissed'
    );

    const clickedNotifications = interactionHistory.filter(event => event.event_type === 'notification_clicked').length;
    const dismissedNotifications = interactionHistory.filter(event => event.event_type === 'notification_dismissed').length;

    if (notificationInteractions.length === 0) return 'moderate';

    const engagementRatio = clickedNotifications / (clickedNotifications + dismissedNotifications);

    if (engagementRatio > 0.7) return 'frequent';
    if (engagementRatio < 0.3) return 'minimal';
    return 'moderate';
  }

  private getDefaultDashboardLayout(personality: UserPersonality): 'minimal' | 'standard' | 'comprehensive' {
    if (personality.feature_preference === 'simple') return 'minimal';
    if (personality.feature_preference === 'expert') return 'comprehensive';
    return 'standard';
  }

  private getDefaultQuickActions(personality: UserPersonality): string[] {
    const baseActions = ['add_expense', 'view_budget'];

    if (personality.feature_preference === 'advanced' || personality.feature_preference === 'expert') {
      baseActions.push('analytics_overview', 'goal_progress');
    }

    if (personality.spending_style === 'frugal') {
      baseActions.push('savings_tracker');
    }

    if (personality.planning_horizon === 'long') {
      baseActions.push('forecast_view');
    }

    return baseActions;
  }

  private async getInteractionHistory(userId: string): Promise<any[]> {
    const { data } = await supabase
      .from('user_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', subDays(new Date(), 90).toISOString())
      .order('created_at', { ascending: false })
      .limit(1000);

    return data || [];
  }

  private analyzeBehavioralPatterns(behaviorData: any, interactionHistory: any[]) {
    // Peak activity hours
    const hourCounts: Record<number, number> = {};
    interactionHistory.forEach(event => {
      const hour = new Date(event.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Preferred session length
    const sessionLengths = interactionHistory
      .filter(event => event.event_type === 'session_end')
      .map(event => event.session_duration || 0);

    const avgSessionLength = sessionLengths.length > 0
      ? sessionLengths.reduce((sum, length) => sum + length, 0) / sessionLengths.length
      : 300; // Default 5 minutes

    return {
      peak_activity_hours: peakHours,
      preferred_session_length: avgSessionLength,
      feature_adoption_rate: behaviorData?.usage_trends?.feature_adoption_rate || 0,
      error_tolerance: this.calculateErrorTolerance(interactionHistory),
      help_seeking_frequency: this.calculateHelpSeekingFrequency(interactionHistory)
    };
  }

  private calculateErrorTolerance(interactionHistory: any[]): number {
    const errorEvents = interactionHistory.filter(event => event.event_type === 'error' || event.event_type === 'failure');
    const retryEvents = interactionHistory.filter(event => event.event_type === 'retry' || event.event_type === 'repeat_action');

    if (errorEvents.length === 0) return 0.8; // Default high tolerance

    const retryRatio = retryEvents.length / errorEvents.length;
    return Math.min(1, retryRatio); // Higher ratio = higher tolerance
  }

  private calculateHelpSeekingFrequency(interactionHistory: any[]): number {
    const helpEvents = interactionHistory.filter(event =>
      event.event_type === 'help_request' ||
      event.event_type === 'tutorial_started' ||
      event.event_type === 'tooltip_viewed'
    );

    const totalEvents = interactionHistory.length;
    return totalEvents > 0 ? helpEvents.length / totalEvents : 0;
  }

  private async buildContextAwareness(userId: string, interactionHistory: any[]) {
    // Location preferences (simplified)
    const locationPreferences: any[] = [];

    // Seasonal patterns
    const seasonalPatterns = this.analyzeSeasonalPatterns(interactionHistory);

    // Social influences (placeholder)
    const socialInfluences: string[] = [];

    // Device preferences
    const devicePreferences = this.analyzeDevicePreferences(interactionHistory);

    return {
      location_preferences: locationPreferences,
      seasonal_patterns: seasonalPatterns,
      social_influences: socialInfluences,
      device_preferences: devicePreferences
    };
  }

  private analyzeSeasonalPatterns(interactionHistory: any[]): Record<string, any> {
    const monthlyActivity: Record<number, number> = {};

    interactionHistory.forEach(event => {
      const month = new Date(event.created_at).getMonth();
      monthlyActivity[month] = (monthlyActivity[month] || 0) + 1;
    });

    return monthlyActivity;
  }

  private analyzeDevicePreferences(interactionHistory: any[]): Record<string, number> {
    const deviceCounts: Record<string, number> = {};

    interactionHistory.forEach(event => {
      const device = event.device_type || 'unknown';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });

    return deviceCounts;
  }

  private async getLearningHistory(userId: string) {
    // Get completed tutorials
    const { data: tutorials } = await supabase
      .from('user_tutorial_progress')
      .select('tutorial_id')
      .eq('user_id', userId)
      .eq('completed', true);

    // Get dismissed tips
    const { data: dismissedTips } = await supabase
      .from('user_dismissed_tips')
      .select('tip_id')
      .eq('user_id', userId);

    return {
      completed_tutorials: tutorials?.map(t => t.tutorial_id) || [],
      dismissed_tips: dismissedTips?.map(t => t.tip_id) || [],
      successful_workflows: [], // Would track successful completion patterns
      problem_areas: [] // Would track areas where users struggle
    };
  }

  async generatePersonalizedContent(userId: string, contentType?: PersonalizedContent['content_type']): Promise<PersonalizedContent[]> {
    const cacheKey = `content_${userId}_${contentType || 'all'}`;
    const cached = this.getCachedData<PersonalizedContent[]>(cacheKey);
    if (cached) return cached;

    try {
      const profile = await this.getPersonalizationProfile(userId);
      if (!profile) return [];

      const content: PersonalizedContent[] = [];

      // Generate dashboard widgets
      if (!contentType || contentType === 'dashboard_widget') {
        content.push(...await this.generateDashboardWidgets(userId, profile));
      }

      // Generate recommendations
      if (!contentType || contentType === 'recommendation') {
        content.push(...await this.generatePersonalizedRecommendations(userId, profile));
      }

      // Generate tips and tutorials
      if (!contentType || contentType === 'tip' || contentType === 'tutorial') {
        content.push(...await this.generateLearningContent(userId, profile));
      }

      // Generate notifications
      if (!contentType || contentType === 'notification') {
        content.push(...await this.generateSmartNotifications(userId, profile));
      }

      // Sort by personalization score
      content.sort((a, b) => b.personalization_score - a.personalization_score);

      this.setCachedData(cacheKey, content, 2 * 60 * 60 * 1000); // 2 hour cache
      return content;

    } catch (error) {
      console.error('Error generating personalized content:', error);
      return [];
    }
  }

  private async generateDashboardWidgets(userId: string, profile: PersonalizationProfile): Promise<PersonalizedContent[]> {
    const widgets: PersonalizedContent[] = [];

    // Budget overview widget - always high priority for budget-conscious users
    if (profile.personality.spending_style === 'frugal' || profile.preferences.favorite_categories.includes('budget')) {
      widgets.push({
        content_type: 'dashboard_widget',
        priority: 'high',
        title: 'Budget Overview',
        description: 'Quick view of your current budget status',
        content: {
          widget_type: 'budget_overview',
          size: 'medium',
          data_source: 'budget_api'
        },
        display_until: addDays(new Date(), 30).toISOString(),
        conditions: {},
        personalization_score: 0.9
      });
    }

    // Trip planning widget for users with high mobility
    if (profile.behavioral_patterns.feature_adoption_rate > 0.6) {
      widgets.push({
        content_type: 'dashboard_widget',
        priority: 'medium',
        title: 'Smart Trip Planner',
        description: 'AI-powered trip recommendations based on your preferences',
        content: {
          widget_type: 'trip_recommendations',
          size: 'large',
          data_source: 'trip_api'
        },
        display_until: addDays(new Date(), 30).toISOString(),
        conditions: {
          min_engagement_score: 60
        },
        personalization_score: 0.8
      });
    }

    return widgets;
  }

  private async generatePersonalizedRecommendations(userId: string, profile: PersonalizationProfile): Promise<PersonalizedContent[]> {
    const recommendations: PersonalizedContent[] = [];

    // Get budget recommendations
    const budgetRecommendations = await aiBudgetAssistant.getOptimizationSuggestions(userId);

    // Convert quick wins to personalized content
    budgetRecommendations.quick_wins.forEach(rec => {
      recommendations.push({
        content_type: 'recommendation',
        priority: rec.priority as any,
        title: rec.title,
        description: rec.description,
        content: {
          type: rec.type,
          actions: rec.specific_actions,
          potential_savings: rec.potential_savings,
          difficulty: rec.implementation_difficulty
        },
        display_until: addDays(new Date(), 7).toISOString(),
        conditions: {},
        personalization_score: rec.confidence_score
      });
    });

    return recommendations;
  }

  private async generateLearningContent(userId: string, profile: PersonalizationProfile): Promise<PersonalizedContent[]> {
    const content: PersonalizedContent[] = [];

    // Only show learning content to users who haven't dismissed it
    if (profile.personality.interaction_style === 'guided' || profile.behavioral_patterns.help_seeking_frequency > 0.1) {

      // Budget basics for new users
      if (!profile.learning_history.completed_tutorials.includes('budget_basics')) {
        content.push({
          content_type: 'tutorial',
          priority: 'medium',
          title: 'Budget Basics Tutorial',
          description: 'Learn the fundamentals of budgeting with our interactive guide',
          content: {
            tutorial_id: 'budget_basics',
            estimated_duration: 300, // 5 minutes
            steps: 5
          },
          display_until: addDays(new Date(), 14).toISOString(),
          conditions: {
            exclude_if_completed: ['budget_basics']
          },
          personalization_score: 0.7
        });
      }

      // Advanced features tip for power users
      if (profile.personality.feature_preference === 'expert' && !profile.learning_history.dismissed_tips.includes('advanced_analytics')) {
        content.push({
          content_type: 'tip',
          priority: 'low',
          title: 'Advanced Analytics Features',
          description: 'Discover powerful analytics features you might have missed',
          content: {
            tip_id: 'advanced_analytics',
            feature_highlights: ['predictive_modeling', 'custom_reports', 'api_access']
          },
          display_until: addDays(new Date(), 7).toISOString(),
          conditions: {
            min_engagement_score: 80,
            exclude_if_completed: ['advanced_analytics']
          },
          personalization_score: 0.6
        });
      }
    }

    return content;
  }

  private async generateSmartNotifications(userId: string, profile: PersonalizationProfile): Promise<PersonalizedContent[]> {
    const notifications: PersonalizedContent[] = [];

    // Only generate notifications based on user preference
    if (profile.personality.notification_preference === 'minimal') {
      return notifications; // No notifications for minimal preference users
    }

    // Budget alerts for spending-conscious users
    if (profile.personality.spending_style !== 'liberal') {
      const alerts = await aiBudgetAssistant.generateSpendingAlerts(userId);

      alerts.slice(0, 3).forEach(alert => { // Limit to top 3 alerts
        notifications.push({
          content_type: 'notification',
          priority: alert.severity as any,
          title: alert.title,
          description: alert.message,
          content: {
            alert_id: alert.alert_id,
            type: alert.type,
            category: alert.category,
            actions: alert.actions
          },
          display_until: alert.expires_at,
          conditions: {
            time_restrictions: this.getOptimalNotificationTime(profile)
          },
          personalization_score: 0.8
        });
      });
    }

    return notifications;
  }

  private getOptimalNotificationTime(profile: PersonalizationProfile): { start_hour: number; end_hour: number } {
    const peakHours = profile.behavioral_patterns.peak_activity_hours;

    if (peakHours.length === 0) {
      return { start_hour: 9, end_hour: 17 }; // Default business hours
    }

    const minHour = Math.min(...peakHours);
    const maxHour = Math.max(...peakHours);

    return {
      start_hour: Math.max(8, minHour - 1), // 1 hour before peak, but not before 8 AM
      end_hour: Math.min(22, maxHour + 2) // 2 hours after peak, but not after 10 PM
    };
  }

  async generateDynamicUI(userId: string): Promise<DynamicUI> {
    const cacheKey = `dynamic_ui_${userId}`;
    const cached = this.getCachedData<DynamicUI>(cacheKey);
    if (cached) return cached;

    try {
      const profile = await this.getPersonalizationProfile(userId);
      if (!profile) {
        return this.getDefaultDynamicUI();
      }

      const dynamicUI: DynamicUI = {
        layout_configuration: this.generateLayoutConfiguration(profile),
        interaction_adaptations: this.generateInteractionAdaptations(profile),
        visual_adaptations: this.generateVisualAdaptations(profile)
      };

      this.setCachedData(cacheKey, dynamicUI, 12 * 60 * 60 * 1000); // 12 hour cache
      return dynamicUI;

    } catch (error) {
      console.error('Error generating dynamic UI:', error);
      return this.getDefaultDynamicUI();
    }
  }

  private generateLayoutConfiguration(profile: PersonalizationProfile): DynamicUI['layout_configuration'] {
    const layout = profile.preferences.dashboard_layout;

    let gridColumns = 2;
    let widgetSizes: Record<string, 'small' | 'medium' | 'large'> = {};
    let quickAccessItems = profile.preferences.quick_actions;

    switch (layout) {
      case 'minimal':
        gridColumns = 1;
        widgetSizes = {
          'budget_overview': 'large',
          'recent_expenses': 'medium',
          'quick_add': 'small'
        };
        break;
      case 'comprehensive':
        gridColumns = 3;
        widgetSizes = {
          'budget_overview': 'large',
          'analytics_chart': 'large',
          'recent_expenses': 'medium',
          'goal_progress': 'medium',
          'trip_recommendations': 'large',
          'financial_forecast': 'medium'
        };
        break;
      default: // standard
        gridColumns = 2;
        widgetSizes = {
          'budget_overview': 'large',
          'recent_expenses': 'medium',
          'goal_progress': 'medium',
          'quick_add': 'small'
        };
    }

    return {
      grid_columns: gridColumns,
      widget_sizes: widgetSizes,
      widget_positions: {}, // Would calculate optimal positions
      hidden_widgets: profile.preferences.hidden_features,
      quick_access_items: quickAccessItems
    };
  }

  private generateInteractionAdaptations(profile: PersonalizationProfile): DynamicUI['interaction_adaptations'] {
    return {
      confirmation_dialogs: profile.personality.interaction_style === 'guided',
      auto_save_frequency: profile.behavioral_patterns.error_tolerance > 0.7 ? 30 : 10, // seconds
      tooltip_verbosity: profile.personality.feature_preference === 'simple' ? 'detailed' :
                        profile.personality.feature_preference === 'expert' ? 'minimal' : 'standard',
      keyboard_shortcuts_enabled: profile.personality.feature_preference === 'expert',
      gesture_controls: profile.context_awareness.device_preferences['mobile'] > profile.context_awareness.device_preferences['desktop']
    };
  }

  private generateVisualAdaptations(profile: PersonalizationProfile): DynamicUI['visual_adaptations'] {
    return {
      color_scheme: profile.preferences.theme || 'auto',
      font_size_multiplier: 1.0, // Would adjust based on accessibility needs
      contrast_level: 'normal', // Would adjust based on accessibility preferences
      animation_level: profile.behavioral_patterns.preferred_session_length > 600 ? 'full' : 'reduced',
      icon_style: profile.personality.feature_preference === 'simple' ? 'detailed' : 'minimal'
    };
  }

  private getDefaultDynamicUI(): DynamicUI {
    return {
      layout_configuration: {
        grid_columns: 2,
        widget_sizes: {
          'budget_overview': 'large',
          'recent_expenses': 'medium'
        },
        widget_positions: {},
        hidden_widgets: [],
        quick_access_items: ['add_expense', 'view_budget']
      },
      interaction_adaptations: {
        confirmation_dialogs: true,
        auto_save_frequency: 30,
        tooltip_verbosity: 'standard',
        keyboard_shortcuts_enabled: false,
        gesture_controls: false
      },
      visual_adaptations: {
        color_scheme: 'auto',
        font_size_multiplier: 1.0,
        contrast_level: 'normal',
        animation_level: 'full',
        icon_style: 'detailed'
      }
    };
  }

  async updatePersonalizationProfile(userId: string, updates: Partial<PersonalizationProfile>): Promise<boolean> {
    try {
      // Update in database
      const { error } = await supabase
        .from('user_personalization')
        .upsert({
          user_id: userId,
          ...updates,
          last_updated: new Date().toISOString()
        });

      if (error) throw error;

      // Update cache
      const cacheKey = `profile_${userId}`;
      const currentProfile = this.getCachedData<PersonalizationProfile>(cacheKey);
      if (currentProfile) {
        const updatedProfile = { ...currentProfile, ...updates };
        this.setCachedData(cacheKey, updatedProfile, this.PROFILE_CACHE_TTL);
      }

      // Clear related caches
      this.clearUserCaches(userId);

      return true;

    } catch (error) {
      console.error('Error updating personalization profile:', error);
      return false;
    }
  }

  async trackPersonalizationEvent(userId: string, eventType: string, eventData: any): Promise<void> {
    try {
      // Track event for future personalization improvements
      await supabase
        .from('personalization_events')
        .insert({
          user_id: userId,
          event_type: eventType,
          event_data: eventData,
          created_at: new Date().toISOString()
        });

      // Update real-time personalization based on the event
      await this.updatePersonalizationFromEvent(userId, eventType, eventData);

    } catch (error) {
      console.error('Error tracking personalization event:', error);
    }
  }

  private async updatePersonalizationFromEvent(userId: string, eventType: string, eventData: any): Promise<void> {
    // Update profile based on specific events
    const updates: Partial<PersonalizationProfile> = {};

    switch (eventType) {
      case 'feature_discovered':
        // User discovered a new feature - might upgrade their preference level
        break;
      case 'tutorial_completed':
        // Add to learning history
        const profile = await this.getPersonalizationProfile(userId);
        if (profile) {
          updates.learning_history = {
            ...profile.learning_history,
            completed_tutorials: [...profile.learning_history.completed_tutorials, eventData.tutorial_id]
          };
        }
        break;
      case 'notification_dismissed':
        // User dismissed notification - adjust notification preferences
        break;
    }

    if (Object.keys(updates).length > 0) {
      await this.updatePersonalizationProfile(userId, updates);
    }
  }

  private clearUserCaches(userId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(userId));
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Memory management
  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0.82 // Placeholder - would track actual hit rate
    };
  }
}

export const userExperiencePersonalizer = new UserExperiencePersonalizer();