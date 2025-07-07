import { supabase } from '@/integrations/supabase/client';

export interface UserBehaviorPattern {
  userId: string;
  sessionDuration: number;
  pageViews: number;
  interactionFrequency: number;
  conversionProbability: number;
  churnRisk: number;
  preferredFeatures: string[];
  predictedActions: string[];
}

export interface PredictionModel {
  name: string;
  type: 'engagement' | 'churn' | 'conversion' | 'feature_usage';
  accuracy: number;
  features: string[];
  lastTrained: Date;
}

export class PredictiveAnalytics {
  private static instance: PredictiveAnalytics;
  private models = new Map<string, PredictionModel>();

  static getInstance(): PredictiveAnalytics {
    if (!PredictiveAnalytics.instance) {
      PredictiveAnalytics.instance = new PredictiveAnalytics();
    }
    return PredictiveAnalytics.instance;
  }

  async analyzeUserBehavior(userId: string): Promise<UserBehaviorPattern> {
    try {
      // Get user interaction data
      const { data: interactions } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Get session data
      const { data: sessions } = await supabase
        .from('analytics_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('session_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (!interactions || !sessions) {
        throw new Error('Insufficient data for analysis');
      }

      // Calculate metrics
      const avgSessionDuration = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length;
      const totalPageViews = sessions.reduce((sum, s) => sum + (s.page_views || 0), 0);
      const interactionFrequency = interactions.length / sessions.length;

      // Simple prediction models
      const conversionProbability = this.predictConversion(interactions, sessions);
      const churnRisk = this.predictChurn(interactions, sessions);
      const preferredFeatures = this.identifyPreferredFeatures(interactions);
      const predictedActions = this.predictNextActions(interactions);

      return {
        userId,
        sessionDuration: avgSessionDuration,
        pageViews: totalPageViews,
        interactionFrequency,
        conversionProbability,
        churnRisk,
        preferredFeatures,
        predictedActions
      };
    } catch (error) {
      console.error('Behavior analysis failed:', error);
      throw error;
    }
  }

  private predictConversion(interactions: any[], sessions: any[]): number {
    // Simple conversion prediction based on engagement patterns
    const engagementScore = interactions.length / Math.max(sessions.length, 1);
    const sessionQuality = sessions.filter(s => (s.duration_seconds || 0) > 300).length / sessions.length;
    
    return Math.min(0.95, (engagementScore * 0.4 + sessionQuality * 0.6));
  }

  private predictChurn(interactions: any[], sessions: any[]): number {
    const daysSinceLastInteraction = interactions.length > 0 
      ? (Date.now() - new Date(interactions[0].timestamp).getTime()) / (1000 * 60 * 60 * 24)
      : 30;

    const recentActivity = interactions.filter(i => 
      (Date.now() - new Date(i.timestamp).getTime()) < 7 * 24 * 60 * 60 * 1000
    ).length;

    const churnScore = Math.min(0.95, (daysSinceLastInteraction / 30) * 0.7 + (1 - recentActivity / 10) * 0.3);
    return churnScore;
  }

  private identifyPreferredFeatures(interactions: any[]): string[] {
    const featureUsage = new Map<string, number>();
    
    interactions.forEach(interaction => {
      const feature = interaction.interaction_type || 'unknown';
      featureUsage.set(feature, (featureUsage.get(feature) || 0) + 1);
    });

    return Array.from(featureUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([feature]) => feature);
  }

  private predictNextActions(interactions: any[]): string[] {
    // Simple sequence analysis
    const sequences = new Map<string, string[]>();
    
    for (let i = 0; i < interactions.length - 1; i++) {
      const current = interactions[i].interaction_type;
      const next = interactions[i + 1].interaction_type;
      
      if (!sequences.has(current)) {
        sequences.set(current, []);
      }
      sequences.get(current)!.push(next);
    }

    // Get most common next actions
    const predictions: string[] = [];
    for (const [action, nextActions] of sequences.entries()) {
      const mostCommon = this.getMostFrequent(nextActions);
      if (mostCommon && !predictions.includes(mostCommon)) {
        predictions.push(mostCommon);
      }
    }

    return predictions.slice(0, 3);
  }

  private getMostFrequent(items: string[]): string | null {
    const frequency = new Map<string, number>();
    items.forEach(item => {
      frequency.set(item, (frequency.get(item) || 0) + 1);
    });

    let maxCount = 0;
    let mostFrequent = null;
    for (const [item, count] of frequency.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = item;
      }
    }

    return mostFrequent;
  }

  async getEngagementPrediction(userId: string): Promise<{
    score: number;
    likelihood: 'low' | 'medium' | 'high';
    recommendations: string[];
  }> {
    try {
      const behavior = await this.analyzeUserBehavior(userId);
      
      const score = (
        behavior.conversionProbability * 0.4 +
        (1 - behavior.churnRisk) * 0.3 +
        Math.min(behavior.interactionFrequency / 10, 1) * 0.3
      );

      let likelihood: 'low' | 'medium' | 'high' = 'low';
      if (score > 0.7) likelihood = 'high';
      else if (score > 0.4) likelihood = 'medium';

      const recommendations = this.generateRecommendations(behavior);

      return { score, likelihood, recommendations };
    } catch (error) {
      console.error('Engagement prediction failed:', error);
      return { score: 0, likelihood: 'low', recommendations: [] };
    }
  }

  private generateRecommendations(behavior: UserBehaviorPattern): string[] {
    const recommendations: string[] = [];

    if (behavior.churnRisk > 0.6) {
      recommendations.push('Send re-engagement campaign');
      recommendations.push('Offer personalized content');
    }

    if (behavior.conversionProbability > 0.7) {
      recommendations.push('Present upgrade offer');
      recommendations.push('Highlight premium features');
    }

    if (behavior.sessionDuration < 120) {
      recommendations.push('Improve onboarding experience');
      recommendations.push('Add interactive tutorials');
    }

    return recommendations;
  }

  async trackInteraction(userId: string, interactionType: string, metadata: any = {}) {
    try {
      await supabase
        .from('user_interactions')
        .insert({
          user_id: userId,
          interaction_type: interactionType,
          page_path: window.location.pathname,
          metadata,
          device_info: {
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            mobile: window.innerWidth <= 768
          }
        });
    } catch (error) {
      console.error('Interaction tracking failed:', error);
    }
  }
}

export const predictiveAnalytics = PredictiveAnalytics.getInstance();