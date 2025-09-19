import { addDays, subDays, format, parseISO, differenceInDays } from 'date-fns';
import { BaseMLEngine } from './BaseMLEngine';

interface UserBehaviorData {
  sessionData: {
    averageSessionDuration: number;
    pagesPerSession: number;
    bounceRate: number;
    preferredTimeOfDay: string;
    deviceType: string;
    mostUsedFeatures: string[];
  };
  interactionPatterns: {
    clickHeatmap: Record<string, number>;
    scrollDepth: number;
    formCompletionRate: number;
    featureAdoptionRate: Record<string, number>;
  };
  preferences: {
    navigationStyle: 'sidebar' | 'tabs' | 'minimal';
    dataVisualization: 'charts' | 'tables' | 'cards';
    notificationFrequency: 'high' | 'medium' | 'low';
    contentDensity: 'compact' | 'comfortable' | 'spacious';
  };
}

interface BehaviorPrediction {
  nextAction: string;
  confidence: number;
  timeToAction: number;
  suggestedFeatures: string[];
}

interface UserSegment {
  segment: 'power_user' | 'casual_user' | 'explorer' | 'focused_user';
  characteristics: string[];
  predictions: string[];
}

/**
 * User Behavior Prediction Engine - Refactored to extend BaseMLEngine
 *
 * Provides behavioral analytics, user segmentation, and next action prediction.
 * Now uses shared functionality from BaseMLEngine, eliminating duplicate code.
 */
class UserBehaviorPredictionEngine extends BaseMLEngine {

  constructor() {
    super({
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      enableLogging: true,
      maxRetries: 3
    });
  }

  getName(): string {
    return 'User Behavior Prediction Engine';
  }

  getVersion(): string {
    return '2.0.0';
  }

  async getUserBehaviorData(userId: string): Promise<UserBehaviorData> {
    this.validateUserId(userId);

    const cacheKey = this.getCacheKey(userId, 'behavior_data');
    const cached = this.getFromCache<UserBehaviorData>(cacheKey);
    if (cached) return cached;

    return this.withErrorHandling(async () => {
      // Fetch user session and interaction data using base class error handling
      const [sessions, interactions, preferences] = await Promise.all([
        this.fetchUserSessions(userId),
        this.fetchUserInteractions(userId),
        this.fetchUserSettings(userId)
      ]);

      const behaviorData = this.analyzeBehaviorData(sessions || [], interactions || [], preferences);
      this.setCache(cacheKey, behaviorData);

      return behaviorData;
    }, 'getUserBehaviorData', this.getDefaultBehaviorData());
  }

  async predictNextAction(userId: string): Promise<BehaviorPrediction> {
    this.validateUserId(userId);

    const cacheKey = this.getCacheKey(userId, 'next_action');
    const cached = this.getFromCache<BehaviorPrediction>(cacheKey);
    if (cached) return cached;

    return this.withErrorHandling(async () => {
      const behaviorData = await this.getUserBehaviorData(userId);
      const prediction = this.generateActionPrediction(behaviorData);

      this.setCache(cacheKey, prediction);
      return prediction;
    }, 'predictNextAction', {
      nextAction: 'view_dashboard',
      confidence: 0.5,
      timeToAction: 60,
      suggestedFeatures: ['budgets', 'trips']
    });
  }

  async segmentUser(userId: string): Promise<UserSegment> {
    this.validateUserId(userId);

    const cacheKey = this.getCacheKey(userId, 'user_segment');
    const cached = this.getFromCache<UserSegment>(cacheKey);
    if (cached) return cached;

    return this.withErrorHandling(async () => {
      const behaviorData = await this.getUserBehaviorData(userId);
      const segment = this.classifyUserSegment(behaviorData);

      this.setCache(cacheKey, segment);
      return segment;
    }, 'segmentUser', {
      segment: 'casual_user',
      characteristics: ['Standard usage patterns', 'Moderate engagement'],
      predictions: ['May benefit from guided onboarding', 'Likely to use basic features']
    });
  }

  async trackUserBehavior(userId: string, eventData: {
    eventType: string;
    featureName?: string;
    elementId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    this.validateUserId(userId);

    return this.withErrorHandling(async () => {
      // Track interaction using base class retry logic
      await this.withRetry(async () => {
        const { data, error } = await this.supabase
          .from('user_interactions')
          .insert({
            user_id: userId,
            event_type: eventData.eventType,
            feature_name: eventData.featureName,
            element_id: eventData.elementId,
            metadata: eventData.metadata,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        return data;
      }, 'trackUserBehavior');

      // Invalidate cache for this user
      this.clearCache(userId);
    }, 'trackUserBehavior');
  }

  // ============================================================================
  // PRIVATE METHODS - Engine-specific logic
  // ============================================================================

  private async fetchUserSessions(userId: string) {
    return this.withErrorHandling(async () => {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }, 'fetchUserSessions', []);
  }

  private async fetchUserInteractions(userId: string) {
    return this.withErrorHandling(async () => {
      const { data, error } = await this.supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      return data;
    }, 'fetchUserInteractions', []);
  }

  private analyzeBehaviorData(sessions: any[], interactions: any[], preferences: any): UserBehaviorData {
    // Analyze session data
    const sessionData = {
      averageSessionDuration: sessions.length > 0
        ? this.calculateAverage(sessions.map(s => s.duration || 300))
        : 300, // Default 5 minutes
      pagesPerSession: sessions.length > 0
        ? this.calculateAverage(sessions.map(s => s.page_views || 1))
        : 3,
      bounceRate: sessions.filter(s => (s.page_views || 1) === 1).length / Math.max(sessions.length, 1),
      preferredTimeOfDay: this.getMostCommonTimeOfDay(sessions),
      deviceType: this.getMostCommonDeviceType(sessions),
      mostUsedFeatures: this.getMostUsedFeatures(interactions)
    };

    // Analyze interaction patterns
    const interactionPatterns = {
      clickHeatmap: this.generateClickHeatmap(interactions),
      scrollDepth: this.calculateAverageScrollDepth(interactions),
      formCompletionRate: this.calculateFormCompletionRate(interactions),
      featureAdoptionRate: this.calculateFeatureAdoptionRate(interactions)
    };

    // Extract preferences using base class error handling
    const userPreferences = {
      navigationStyle: preferences?.navigation_style || 'tabs',
      dataVisualization: preferences?.data_visualization || 'charts',
      notificationFrequency: preferences?.notification_frequency || 'medium',
      contentDensity: preferences?.content_density || 'comfortable'
    };

    return {
      sessionData,
      interactionPatterns,
      preferences: userPreferences
    };
  }

  private getMostCommonTimeOfDay(sessions: any[]): string {
    const timeSlots = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    sessions.forEach(session => {
      if (session.created_at) {
        const hour = new Date(session.created_at).getHours();
        if (hour >= 6 && hour < 12) timeSlots.morning++;
        else if (hour >= 12 && hour < 18) timeSlots.afternoon++;
        else if (hour >= 18 && hour < 22) timeSlots.evening++;
        else timeSlots.night++;
      }
    });

    return Object.entries(timeSlots).reduce((a, b) => timeSlots[a[0]] > timeSlots[b[0]] ? a : b)[0];
  }

  private getMostCommonDeviceType(sessions: any[]): string {
    const devices = sessions.reduce((acc, session) => {
      const device = session.device_type || 'desktop';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(devices).reduce((a: any, b: any) => a[1] > b[1] ? a : b, ['desktop', 0])[0];
  }

  private getMostUsedFeatures(interactions: any[]): string[] {
    const featureCounts = interactions.reduce((acc, interaction) => {
      if (interaction.feature_name) {
        acc[interaction.feature_name] = (acc[interaction.feature_name] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(featureCounts)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 5)
      .map(([feature]) => feature);
  }

  private generateClickHeatmap(interactions: any[]): Record<string, number> {
    return interactions.reduce((acc, interaction) => {
      if (interaction.element_id) {
        acc[interaction.element_id] = (acc[interaction.element_id] || 0) + 1;
      }
      return acc;
    }, {});
  }

  private calculateAverageScrollDepth(interactions: any[]): number {
    const scrollEvents = interactions.filter(i => i.event_type === 'scroll');
    if (scrollEvents.length === 0) return 50; // Default 50%

    const scrollDepths = scrollEvents.map(event => event.scroll_depth || 50);
    return this.calculateAverage(scrollDepths);
  }

  private calculateFormCompletionRate(interactions: any[]): number {
    const formStarts = interactions.filter(i => i.event_type === 'form_start').length;
    const formCompletions = interactions.filter(i => i.event_type === 'form_complete').length;

    return formStarts > 0 ? formCompletions / formStarts : 0.8; // Default 80%
  }

  private calculateFeatureAdoptionRate(interactions: any[]): Record<string, number> {
    const features = ['budgets', 'trips', 'analytics', 'pam', 'social'];
    const adoptionRates = {};

    features.forEach(feature => {
      const featureInteractions = interactions.filter(i =>
        i.feature_name?.toLowerCase().includes(feature)
      ).length;

      adoptionRates[feature] = Math.min(featureInteractions / 10, 1); // Normalize to 0-1
    });

    return adoptionRates;
  }

  private generateActionPrediction(behaviorData: UserBehaviorData): BehaviorPrediction {
    const { sessionData, interactionPatterns } = behaviorData;

    // Predict based on most used features and interaction patterns
    const mostLikelyFeature = sessionData.mostUsedFeatures[0] || 'dashboard';
    const confidence = this.calculateConfidence(
      sessionData.mostUsedFeatures.length,
      interactionPatterns.formCompletionRate
    );

    // Estimate time to next action based on session patterns
    const timeToAction = Math.max(30, sessionData.averageSessionDuration / sessionData.pagesPerSession);

    const suggestedFeatures = sessionData.mostUsedFeatures.slice(0, 3);
    if (suggestedFeatures.length < 3) {
      suggestedFeatures.push(...['budgets', 'trips', 'analytics'].filter(f => !suggestedFeatures.includes(f)));
    }

    return {
      nextAction: `view_${mostLikelyFeature}`,
      confidence,
      timeToAction,
      suggestedFeatures: suggestedFeatures.slice(0, 3)
    };
  }

  private classifyUserSegment(behaviorData: UserBehaviorData): UserSegment {
    const { sessionData, interactionPatterns } = behaviorData;

    // Power User: High engagement, uses many features, long sessions
    if (sessionData.averageSessionDuration > 600 && // 10+ minutes
        sessionData.pagesPerSession > 5 &&
        sessionData.mostUsedFeatures.length >= 4) {
      return {
        segment: 'power_user',
        characteristics: [
          'High engagement levels',
          'Uses multiple features regularly',
          'Long session durations',
          'Low bounce rate'
        ],
        predictions: [
          'Likely to adopt new features quickly',
          'May provide valuable feedback',
          'Could benefit from advanced features',
          'Good candidate for beta testing'
        ]
      };
    }

    // Explorer: Medium engagement, tries different features
    if (sessionData.mostUsedFeatures.length >= 3 &&
        Object.keys(interactionPatterns.featureAdoptionRate).length > 2) {
      return {
        segment: 'explorer',
        characteristics: [
          'Curious about different features',
          'Medium engagement levels',
          'Varied interaction patterns',
          'Moderate session durations'
        ],
        predictions: [
          'Benefits from feature discovery',
          'May need guidance on advanced features',
          'Could increase engagement with recommendations',
          'Good candidate for feature tutorials'
        ]
      };
    }

    // Focused User: Uses few features but deeply
    if (sessionData.mostUsedFeatures.length <= 2 &&
        sessionData.averageSessionDuration > 300) {
      return {
        segment: 'focused_user',
        characteristics: [
          'Deep usage of specific features',
          'Consistent behavior patterns',
          'Goal-oriented interactions',
          'Good feature completion rates'
        ],
        predictions: [
          'May resist feature changes',
          'Values efficiency and simplicity',
          'Could benefit from workflow optimization',
          'Good candidate for specialized tools'
        ]
      };
    }

    // Default to Casual User
    return {
      segment: 'casual_user',
      characteristics: [
        'Standard usage patterns',
        'Moderate engagement',
        'Basic feature usage',
        'Short to medium sessions'
      ],
      predictions: [
        'May benefit from guided onboarding',
        'Could increase engagement with reminders',
        'Good candidate for simplified interfaces',
        'Benefits from clear value propositions'
      ]
    };
  }

  private getDefaultBehaviorData(): UserBehaviorData {
    return {
      sessionData: {
        averageSessionDuration: 300,
        pagesPerSession: 3,
        bounceRate: 0.3,
        preferredTimeOfDay: 'evening',
        deviceType: 'desktop',
        mostUsedFeatures: ['dashboard', 'budgets']
      },
      interactionPatterns: {
        clickHeatmap: {},
        scrollDepth: 50,
        formCompletionRate: 0.8,
        featureAdoptionRate: {
          budgets: 0.8,
          trips: 0.6,
          analytics: 0.4,
          pam: 0.3,
          social: 0.2
        }
      },
      preferences: {
        navigationStyle: 'tabs',
        dataVisualization: 'charts',
        notificationFrequency: 'medium',
        contentDensity: 'comfortable'
      }
    };
  }

  // Add supabase property for direct access (used in trackUserBehavior)
  private get supabase() {
    // Import here to avoid circular dependencies
    const { supabase } = require('../../integrations/supabase/client');
    return supabase;
  }
}

// Export singleton instance
export const userBehaviorPredictionEngine = new UserBehaviorPredictionEngine();