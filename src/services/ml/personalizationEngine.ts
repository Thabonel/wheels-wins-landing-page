import { addDays, subDays, format } from 'date-fns';
import { BaseMLEngine } from './BaseMLEngine';
import { tripRecommendationEngine } from './tripRecommendationEngine';
import { financialForecastingEngine } from './financialForecastingEngine';
import { userBehaviorPredictionEngine } from './userBehaviorPredictionEngine';
import { aiBudgetAssistant } from './aiBudgetAssistant';

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

interface PersonalizedRecommendation {
  id: string;
  type: 'ui_adjustment' | 'workflow_suggestion' | 'feature_highlight' | 'content_curation' | 'reminder_optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  implementation: {
    component: string;
    changes: Record<string, any>;
    duration: number;
    reversible: boolean;
  };
  expected_impact: {
    engagement_lift: number;
    efficiency_gain: number;
    satisfaction_score: number;
  };
  conditions: {
    user_segments: string[];
    time_constraints?: string[];
    feature_dependencies?: string[];
  };
  personalization_score: number;
  created_at: string;
}

interface DynamicUIConfig {
  layout: {
    grid_columns: number;
    widget_sizes: Record<string, 'small' | 'medium' | 'large'>;
    quick_access_items: string[];
    hidden_widgets: string[];
  };
  styling: {
    color_scheme: 'light' | 'dark' | 'auto' | 'custom';
    font_size: 'small' | 'medium' | 'large';
    animation_level: 'none' | 'minimal' | 'standard' | 'enhanced';
    density: 'compact' | 'comfortable' | 'spacious';
  };
  interaction: {
    click_targets: 'small' | 'medium' | 'large';
    gesture_sensitivity: number;
    keyboard_shortcuts: boolean;
    voice_commands: boolean;
  };
  content: {
    detail_level: 'minimal' | 'standard' | 'detailed';
    chart_preferences: string[];
    default_time_range: number;
    auto_refresh: boolean;
  };
}

/**
 * User Experience Personalizer - Refactored to extend BaseMLEngine
 *
 * Provides comprehensive UI/UX personalization based on user behavior and preferences.
 * Now uses shared functionality from BaseMLEngine, eliminating duplicate code.
 */
export class UserExperiencePersonalizer extends BaseMLEngine {
  private readonly PROFILE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    super({
      cacheTTL: 6 * 60 * 60 * 1000, // 6 hours for personalization data
      enableLogging: true,
      maxRetries: 3
    });
  }

  getName(): string {
    return 'User Experience Personalizer';
  }

  getVersion(): string {
    return '2.0.0';
  }

  async getPersonalizationProfile(userId: string): Promise<PersonalizationProfile> {
    this.validateUserId(userId);

    const cacheKey = this.getCacheKey(userId, 'personalization_profile');
    const cached = this.getFromCache<PersonalizationProfile>(cacheKey);
    if (cached) return cached;

    return this.withErrorHandling(async () => {
      const profile = await this.buildPersonalizationProfile(userId);
      this.setCache(cacheKey, profile, this.PROFILE_CACHE_TTL);
      return profile;
    }, 'getPersonalizationProfile');
  }

  async generatePersonalizedRecommendations(
    userId: string,
    context: {
      current_page?: string;
      time_of_day?: string;
      recent_actions?: string[];
      session_duration?: number;
    } = {}
  ): Promise<PersonalizedRecommendation[]> {
    this.validateUserId(userId);

    const cacheKey = this.getCacheKey(userId, 'recommendations', context);
    const cached = this.getFromCache<PersonalizedRecommendation[]>(cacheKey);
    if (cached) return cached;

    return this.withErrorHandling(async () => {
      const [profile, behaviorData] = await Promise.all([
        this.getPersonalizationProfile(userId),
        userBehaviorPredictionEngine.getUserBehaviorData(userId)
      ]);

      const recommendations = this.generateRecommendations(profile, behaviorData, context);
      this.setCache(cacheKey, recommendations);

      return recommendations;
    }, 'generatePersonalizedRecommendations', []);
  }

  async getDynamicUIConfig(userId: string, deviceType?: string): Promise<DynamicUIConfig> {
    this.validateUserId(userId);

    const cacheKey = this.getCacheKey(userId, 'ui_config', { deviceType });
    const cached = this.getFromCache<DynamicUIConfig>(cacheKey);
    if (cached) return cached;

    return this.withErrorHandling(async () => {
      const profile = await this.getPersonalizationProfile(userId);
      const uiConfig = this.buildDynamicUIConfig(profile, deviceType);

      this.setCache(cacheKey, uiConfig);
      return uiConfig;
    }, 'getDynamicUIConfig');
  }

  async updatePersonalizationFromFeedback(
    userId: string,
    feedback: {
      interaction_type: string;
      component: string;
      satisfaction: number; // 1-5 scale
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    this.validateUserId(userId);

    return this.withErrorHandling(async () => {
      await this.withRetry(async () => {
        // Store feedback using base class retry logic
        const { error } = await this.supabase
          .from('user_feedback')
          .insert({
            user_id: userId,
            interaction_type: feedback.interaction_type,
            component: feedback.component,
            satisfaction_score: feedback.satisfaction,
            metadata: feedback.metadata,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
      }, 'updatePersonalizationFromFeedback');

      // Invalidate personalization cache to trigger rebuild
      this.clearCache(userId);
    }, 'updatePersonalizationFromFeedback');
  }

  async getOptimalWorkflow(userId: string, taskType: string): Promise<{
    steps: Array<{
      action: string;
      component: string;
      estimated_duration: number;
      success_probability: number;
    }>;
    total_estimated_time: number;
    confidence_score: number;
    alternative_paths: string[];
  }> {
    this.validateUserId(userId);

    const cacheKey = this.getCacheKey(userId, 'workflow', { taskType });
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    return this.withErrorHandling(async () => {
      const [profile, behaviorData] = await Promise.all([
        this.getPersonalizationProfile(userId),
        userBehaviorPredictionEngine.getUserBehaviorData(userId)
      ]);

      const workflow = this.optimizeWorkflow(profile, behaviorData, taskType);
      this.setCache(cacheKey, workflow);

      return workflow;
    }, 'getOptimalWorkflow');
  }

  async getPredictiveInsights(userId: string): Promise<{
    likely_next_actions: string[];
    optimal_engagement_times: string[];
    feature_recommendations: string[];
    potential_pain_points: string[];
    personalization_opportunities: string[];
  }> {
    this.validateUserId(userId);

    const cacheKey = this.getCacheKey(userId, 'predictive_insights');
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    return this.withErrorHandling(async () => {
      const [profile, prediction] = await Promise.all([
        this.getPersonalizationProfile(userId),
        userBehaviorPredictionEngine.predictNextAction(userId)
      ]);

      const insights = this.generatePredictiveInsights(profile, prediction);
      this.setCache(cacheKey, insights);

      return insights;
    }, 'getPredictiveInsights');
  }

  // ============================================================================
  // PRIVATE METHODS - Engine-specific logic
  // ============================================================================

  private async buildPersonalizationProfile(userId: string): Promise<PersonalizationProfile> {
    // Fetch all required data using base class methods
    const [profile, userSettings, behaviorData, expenses, trips] = await Promise.all([
      this.fetchProfile(userId),
      this.fetchUserSettings(userId),
      userBehaviorPredictionEngine.getUserBehaviorData(userId),
      this.fetchExpenses(userId, { limit: 200 }),
      this.fetchTrips(userId, { limit: 50 })
    ]);

    // Build personality profile
    const personality = this.inferUserPersonality(behaviorData, expenses, trips, profile);

    // Extract preferences
    const preferences = {
      dashboard_layout: userSettings?.dashboard_layout || 'standard',
      default_currency: userSettings?.default_currency || 'USD',
      date_format: userSettings?.date_format || 'MM/DD/YYYY',
      theme: userSettings?.theme || 'auto',
      quick_actions: userSettings?.quick_actions || ['add_expense', 'view_budget'],
      favorite_categories: this.extractFavoriteCategories(expenses),
      hidden_features: userSettings?.hidden_features || []
    };

    // Analyze behavioral patterns
    const behavioral_patterns = {
      peak_activity_hours: this.extractPeakHours(behaviorData),
      preferred_session_length: behaviorData.sessionData.averageSessionDuration,
      feature_adoption_rate: this.calculateFeatureAdoptionRate(behaviorData),
      error_tolerance: this.estimateErrorTolerance(behaviorData),
      help_seeking_frequency: this.calculateHelpSeekingFrequency(behaviorData)
    };

    // Build context awareness
    const context_awareness = {
      location_preferences: [], // Would integrate with location data
      seasonal_patterns: this.analyzeSeasonalPatterns(expenses, trips),
      social_influences: [], // Would integrate with social features
      device_preferences: this.analyzeDevicePreferences(behaviorData)
    };

    // Track learning history
    const learning_history = {
      completed_tutorials: userSettings?.completed_tutorials || [],
      dismissed_tips: userSettings?.dismissed_tips || [],
      successful_workflows: this.identifySuccessfulWorkflows(behaviorData),
      problem_areas: this.identifyProblemAreas(behaviorData)
    };

    return {
      user_id: userId,
      personality,
      preferences,
      behavioral_patterns,
      context_awareness,
      learning_history,
      last_updated: new Date().toISOString()
    };
  }

  private inferUserPersonality(
    behaviorData: any,
    expenses: any[],
    trips: any[],
    profile: any
  ): UserPersonality {
    // Analyze risk tolerance from financial behavior
    const risk_tolerance = this.analyzeRiskTolerance(expenses, trips, behaviorData);

    // Analyze spending patterns
    const spending_style = this.analyzeSpendingStyle(expenses);

    // Analyze planning behavior
    const planning_horizon = this.analyzePlanningHorizon(trips, expenses);

    // Analyze feature usage complexity
    const feature_preference = this.analyzeFeaturePreference(behaviorData);

    // Analyze help-seeking behavior
    const interaction_style = this.analyzeInteractionStyle(behaviorData);

    // Analyze notification response
    const notification_preference = profile?.notification_preference || 'moderate';

    return {
      risk_tolerance,
      spending_style,
      planning_horizon,
      feature_preference,
      interaction_style,
      notification_preference
    };
  }

  private analyzeRiskTolerance(expenses: any[], trips: any[], behaviorData: any): 'conservative' | 'moderate' | 'aggressive' {
    let score = 0;

    // Analyze expense patterns
    const expenseVariance = this.calculateStandardDeviation(
      this.groupByTimePeriod(expenses, 'month').map(month =>
        month.reduce((sum, exp) => sum + exp.amount, 0)
      )
    );
    const avgMonthlySpend = this.calculateAverage(
      this.groupByTimePeriod(expenses, 'month').map(month =>
        month.reduce((sum, exp) => sum + exp.amount, 0)
      )
    );

    if (expenseVariance / avgMonthlySpend > 0.3) score += 2; // High variance = more aggressive
    else if (expenseVariance / avgMonthlySpend < 0.1) score -= 1; // Low variance = conservative

    // Analyze trip planning patterns
    const lastMinuteTrips = trips.filter(trip => {
      const created = new Date(trip.created_at);
      const startDate = new Date(trip.start_date);
      const daysDiff = (startDate.getTime() - created.getTime()) / (1000 * 3600 * 24);
      return daysDiff < 7; // Less than a week planning
    });

    if (lastMinuteTrips.length / Math.max(trips.length, 1) > 0.3) score += 1;

    // Analyze feature adoption rate
    if (behaviorData.interactionPatterns?.featureAdoptionRate) {
      const adoptionRate = Object.values(behaviorData.interactionPatterns.featureAdoptionRate)
        .reduce((sum: number, rate: number) => sum + rate, 0) /
        Object.values(behaviorData.interactionPatterns.featureAdoptionRate).length;

      if (adoptionRate > 0.7) score += 1;
      else if (adoptionRate < 0.3) score -= 1;
    }

    return score >= 2 ? 'aggressive' : score <= -1 ? 'conservative' : 'moderate';
  }

  private analyzeSpendingStyle(expenses: any[]): 'frugal' | 'balanced' | 'liberal' {
    if (expenses.length === 0) return 'balanced';

    const categories = this.groupByCategory(expenses);
    const discretionaryCategories = ['entertainment', 'shopping', 'dining', 'travel'];

    const discretionarySpending = discretionaryCategories.reduce((sum, cat) => {
      const catExpenses = categories[cat] || [];
      return sum + catExpenses.reduce((catSum, exp) => catSum + exp.amount, 0);
    }, 0);

    const totalSpending = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const discretionaryRatio = discretionarySpending / totalSpending;

    if (discretionaryRatio > 0.4) return 'liberal';
    if (discretionaryRatio < 0.2) return 'frugal';
    return 'balanced';
  }

  private analyzePlanningHorizon(trips: any[], expenses: any[]): 'short' | 'medium' | 'long' {
    let planningScore = 0;

    // Analyze trip planning lead times
    const planningLeadTimes = trips.map(trip => {
      const created = new Date(trip.created_at);
      const startDate = new Date(trip.start_date);
      return (startDate.getTime() - created.getTime()) / (1000 * 3600 * 24);
    });

    const avgLeadTime = this.calculateAverage(planningLeadTimes);
    if (avgLeadTime > 60) planningScore += 2; // 2+ months
    else if (avgLeadTime > 30) planningScore += 1; // 1+ month
    else if (avgLeadTime < 7) planningScore -= 1; // Less than week

    // Analyze budget planning (looking for recurring/planned expenses)
    const recurringExpenses = expenses.filter(exp =>
      exp.description?.toLowerCase().includes('subscription') ||
      exp.description?.toLowerCase().includes('monthly') ||
      exp.category === 'utilities'
    );

    if (recurringExpenses.length / Math.max(expenses.length, 1) > 0.3) planningScore += 1;

    return planningScore >= 2 ? 'long' : planningScore <= -1 ? 'short' : 'medium';
  }

  private analyzeFeaturePreference(behaviorData: any): 'simple' | 'advanced' | 'expert' {
    const featuresUsed = behaviorData.sessionData?.mostUsedFeatures?.length || 0;
    const formCompletionRate = behaviorData.interactionPatterns?.formCompletionRate || 0;
    const avgSessionLength = behaviorData.sessionData?.averageSessionDuration || 300;

    let complexity = 0;
    if (featuresUsed > 5) complexity += 2;
    else if (featuresUsed < 3) complexity -= 1;

    if (formCompletionRate > 0.8) complexity += 1;
    if (avgSessionLength > 600) complexity += 1; // 10+ minutes

    return complexity >= 3 ? 'expert' : complexity <= 0 ? 'simple' : 'advanced';
  }

  private analyzeInteractionStyle(behaviorData: any): 'guided' | 'independent' | 'minimal' {
    const bounceRate = behaviorData.sessionData?.bounceRate || 0.3;
    const pagesPerSession = behaviorData.sessionData?.pagesPerSession || 3;
    const scrollDepth = behaviorData.interactionPatterns?.scrollDepth || 50;

    let independence = 0;
    if (bounceRate < 0.2) independence += 1; // Low bounce = explores more
    if (pagesPerSession > 5) independence += 1; // Many pages = explores
    if (scrollDepth > 70) independence += 1; // Deep scrolling = thorough

    return independence >= 2 ? 'independent' : independence === 0 ? 'minimal' : 'guided';
  }

  private extractFavoriteCategories(expenses: any[]): string[] {
    const categoryTotals = this.groupByCategory(expenses);

    return Object.entries(categoryTotals)
      .map(([category, exps]) => ({
        category,
        total: exps.reduce((sum, exp) => sum + exp.amount, 0),
        frequency: exps.length
      }))
      .sort((a, b) => (b.total + b.frequency * 10) - (a.total + a.frequency * 10))
      .slice(0, 5)
      .map(item => item.category);
  }

  private extractPeakHours(behaviorData: any): number[] {
    // Would analyze actual interaction timestamps
    // For now, return reasonable defaults based on preferred time
    const timeOfDay = behaviorData.sessionData?.preferredTimeOfDay || 'evening';

    switch (timeOfDay) {
      case 'morning': return [7, 8, 9, 10];
      case 'afternoon': return [12, 13, 14, 15, 16];
      case 'evening': return [18, 19, 20, 21];
      case 'night': return [21, 22, 23, 0];
      default: return [19, 20, 21]; // Default evening
    }
  }

  private calculateFeatureAdoptionRate(behaviorData: any): number {
    const adoptionRates = behaviorData.interactionPatterns?.featureAdoptionRate || {};
    const rates = Object.values(adoptionRates) as number[];
    return rates.length > 0 ? this.calculateAverage(rates) : 0.5;
  }

  private estimateErrorTolerance(behaviorData: any): number {
    // Higher form completion rate suggests higher error tolerance
    const formCompletion = behaviorData.interactionPatterns?.formCompletionRate || 0.8;
    // Longer sessions despite potential errors suggests tolerance
    const sessionLength = behaviorData.sessionData?.averageSessionDuration || 300;

    return Math.min(1, (formCompletion + (sessionLength / 600)) / 2);
  }

  private calculateHelpSeekingFrequency(behaviorData: any): number {
    // Would analyze actual help interactions
    // For now, estimate based on interaction patterns
    const complexity = behaviorData.sessionData?.mostUsedFeatures?.length || 3;
    return Math.min(1, complexity / 10); // More features = more help seeking
  }

  private analyzeSeasonalPatterns(expenses: any[], trips: any[]): Record<string, any> {
    const patterns = {};

    // Analyze seasonal spending
    const expensesByMonth = this.groupByTimePeriod(expenses, 'month');
    const tripsByMonth = this.groupByTimePeriod(trips, 'month');

    // Simple seasonal analysis
    Object.entries(expensesByMonth).forEach(([month, exps]) => {
      const total = exps.reduce((sum, exp) => sum + exp.amount, 0);
      patterns[month] = { spending: total, trips: (tripsByMonth[month] || []).length };
    });

    return patterns;
  }

  private analyzeDevicePreferences(behaviorData: any): Record<string, number> {
    // Would analyze device usage patterns
    const deviceType = behaviorData.sessionData?.deviceType || 'desktop';
    return { [deviceType]: 1.0 };
  }

  private identifySuccessfulWorkflows(behaviorData: any): string[] {
    // Would analyze completed task sequences
    const features = behaviorData.sessionData?.mostUsedFeatures || [];
    return features.map(feature => `${feature}_workflow`);
  }

  private identifyProblemAreas(behaviorData: any): string[] {
    const problemAreas = [];

    if (behaviorData.sessionData?.bounceRate > 0.5) {
      problemAreas.push('high_bounce_rate');
    }

    if (behaviorData.interactionPatterns?.formCompletionRate < 0.6) {
      problemAreas.push('form_completion_difficulty');
    }

    if (behaviorData.sessionData?.averageSessionDuration < 120) {
      problemAreas.push('short_session_duration');
    }

    return problemAreas;
  }

  private generateRecommendations(
    profile: PersonalizationProfile,
    behaviorData: any,
    context: any
  ): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    // UI Layout recommendations
    if (profile.personality.feature_preference === 'simple' && profile.preferences.dashboard_layout === 'comprehensive') {
      recommendations.push({
        id: 'simplify_dashboard',
        type: 'ui_adjustment',
        priority: 'high',
        title: 'Simplify Dashboard Layout',
        description: 'Switch to a cleaner, more focused dashboard layout',
        implementation: {
          component: 'dashboard',
          changes: { layout: 'minimal', hide_advanced_widgets: true },
          duration: 0,
          reversible: true
        },
        expected_impact: {
          engagement_lift: 0.15,
          efficiency_gain: 0.20,
          satisfaction_score: 0.25
        },
        conditions: {
          user_segments: ['simple_preference']
        },
        personalization_score: this.calculateConfidence(5, 0.1),
        created_at: new Date().toISOString()
      });
    }

    // Feature recommendations based on personality
    if (profile.personality.spending_style === 'liberal' && !profile.preferences.favorite_categories.includes('savings')) {
      recommendations.push({
        id: 'highlight_savings_features',
        type: 'feature_highlight',
        priority: 'medium',
        title: 'Savings Goal Features',
        description: 'Discover budgeting tools to balance your spending',
        implementation: {
          component: 'budget_section',
          changes: { highlight: true, show_savings_prompt: true },
          duration: 7 * 24 * 60 * 60 * 1000, // 7 days
          reversible: true
        },
        expected_impact: {
          engagement_lift: 0.10,
          efficiency_gain: 0.15,
          satisfaction_score: 0.20
        },
        conditions: {
          user_segments: ['liberal_spender']
        },
        personalization_score: 0.75,
        created_at: new Date().toISOString()
      });
    }

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  private buildDynamicUIConfig(profile: PersonalizationProfile, deviceType?: string): DynamicUIConfig {
    const config: DynamicUIConfig = {
      layout: {
        grid_columns: profile.personality.feature_preference === 'expert' ? 4 :
                     profile.personality.feature_preference === 'simple' ? 2 : 3,
        widget_sizes: this.calculateWidgetSizes(profile),
        quick_access_items: profile.preferences.quick_actions,
        hidden_widgets: profile.preferences.hidden_features
      },
      styling: {
        color_scheme: profile.preferences.theme,
        font_size: profile.behavioral_patterns.error_tolerance > 0.7 ? 'medium' : 'large',
        animation_level: profile.personality.interaction_style === 'minimal' ? 'minimal' : 'standard',
        density: profile.personality.feature_preference === 'expert' ? 'compact' : 'comfortable'
      },
      interaction: {
        click_targets: deviceType === 'mobile' ? 'large' : 'medium',
        gesture_sensitivity: 0.8,
        keyboard_shortcuts: profile.personality.feature_preference === 'expert',
        voice_commands: profile.personality.interaction_style === 'guided'
      },
      content: {
        detail_level: profile.personality.feature_preference === 'simple' ? 'minimal' : 'standard',
        chart_preferences: this.getPreferredChartTypes(profile),
        default_time_range: profile.personality.planning_horizon === 'long' ? 365 : 30,
        auto_refresh: profile.behavioral_patterns.feature_adoption_rate > 0.7
      }
    };

    return config;
  }

  private calculateWidgetSizes(profile: PersonalizationProfile): Record<string, 'small' | 'medium' | 'large'> {
    const sizes: Record<string, 'small' | 'medium' | 'large'> = {};

    // Size widgets based on favorite categories and feature preference
    profile.preferences.favorite_categories.forEach(category => {
      sizes[`${category}_widget`] = profile.personality.feature_preference === 'expert' ? 'large' : 'medium';
    });

    // Default sizes for common widgets
    sizes['budget_summary'] = 'large';
    sizes['recent_expenses'] = 'medium';
    sizes['quick_actions'] = 'small';

    return sizes;
  }

  private getPreferredChartTypes(profile: PersonalizationProfile): string[] {
    const charts = [];

    if (profile.personality.feature_preference === 'simple') {
      charts.push('pie', 'bar');
    } else if (profile.personality.feature_preference === 'expert') {
      charts.push('line', 'area', 'scatter', 'heatmap');
    } else {
      charts.push('pie', 'bar', 'line');
    }

    return charts;
  }

  private optimizeWorkflow(profile: PersonalizationProfile, behaviorData: any, taskType: string): any {
    // Simplified workflow optimization
    const baseSteps = this.getWorkflowSteps(taskType);
    const optimizedSteps = baseSteps.map(step => ({
      ...step,
      estimated_duration: step.estimated_duration * (profile.behavioral_patterns.error_tolerance || 1),
      success_probability: Math.min(0.95, step.success_probability * (profile.behavioral_patterns.feature_adoption_rate || 0.8))
    }));

    return {
      steps: optimizedSteps,
      total_estimated_time: optimizedSteps.reduce((sum, step) => sum + step.estimated_duration, 0),
      confidence_score: this.calculateConfidence(optimizedSteps.length),
      alternative_paths: []
    };
  }

  private getWorkflowSteps(taskType: string) {
    const workflows = {
      'add_expense': [
        { action: 'navigate_to_expenses', component: 'expenses_page', estimated_duration: 5, success_probability: 0.95 },
        { action: 'click_add_button', component: 'add_expense_button', estimated_duration: 2, success_probability: 0.9 },
        { action: 'fill_expense_form', component: 'expense_form', estimated_duration: 30, success_probability: 0.8 },
        { action: 'submit_expense', component: 'submit_button', estimated_duration: 3, success_probability: 0.9 }
      ],
      'create_budget': [
        { action: 'navigate_to_budgets', component: 'budgets_page', estimated_duration: 5, success_probability: 0.95 },
        { action: 'click_create_budget', component: 'create_budget_button', estimated_duration: 2, success_probability: 0.9 },
        { action: 'set_budget_categories', component: 'budget_form', estimated_duration: 60, success_probability: 0.75 },
        { action: 'save_budget', component: 'save_button', estimated_duration: 3, success_probability: 0.9 }
      ]
    };

    return workflows[taskType] || [];
  }

  private generatePredictiveInsights(profile: PersonalizationProfile, prediction: any): any {
    return {
      likely_next_actions: prediction.suggestedFeatures || ['view_dashboard', 'add_expense'],
      optimal_engagement_times: profile.behavioral_patterns.peak_activity_hours.map(h => `${h}:00`),
      feature_recommendations: this.getFeatureRecommendations(profile),
      potential_pain_points: profile.learning_history.problem_areas,
      personalization_opportunities: this.identifyPersonalizationOpportunities(profile)
    };
  }

  private getFeatureRecommendations(profile: PersonalizationProfile): string[] {
    const recommendations = [];

    if (profile.personality.planning_horizon === 'long' && !profile.preferences.favorite_categories.includes('investments')) {
      recommendations.push('investment_tracking');
    }

    if (profile.personality.spending_style === 'liberal' && !profile.learning_history.completed_tutorials.includes('budgeting_basics')) {
      recommendations.push('budgeting_tutorial');
    }

    return recommendations;
  }

  private identifyPersonalizationOpportunities(profile: PersonalizationProfile): string[] {
    const opportunities = [];

    if (profile.preferences.dashboard_layout === 'standard' && profile.personality.feature_preference === 'expert') {
      opportunities.push('upgrade_to_comprehensive_dashboard');
    }

    if (profile.behavioral_patterns.help_seeking_frequency < 0.2 && profile.personality.interaction_style === 'guided') {
      opportunities.push('enable_contextual_hints');
    }

    return opportunities;
  }

  // Add supabase property for direct access
  private get supabase() {
    const { supabase } = require('../../integrations/supabase/client');
    return supabase;
  }
}

// Export singleton instance
export const userExperiencePersonalizer = new UserExperiencePersonalizer();