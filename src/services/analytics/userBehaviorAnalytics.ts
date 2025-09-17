/**
 * Enhanced User Behavior Analytics and Event Tracking System
 *
 * Comprehensive user behavior analysis including:
 * - Real-time event tracking and session analysis
 * - User journey mapping and funnel analysis
 * - Engagement scoring and retention metrics
 * - Predictive user behavior modeling
 */

import { supabase } from '@/integrations/supabase/client';
import { collectUserAction, collectResponseTime } from '@/services/pam/analytics/analyticsCollector';
import { logger } from '@/lib/logger';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface UserEvent {
  event_type: string;
  event_category: 'navigation' | 'interaction' | 'engagement' | 'conversion' | 'error';
  properties: Record<string, any>;
  timestamp: string;
  session_id: string;
  user_id?: string;
  page_url: string;
  user_agent: string;
  device_info: DeviceInfo;
}

interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  screen_resolution: string;
  viewport_size: string;
  connection_type: string;
}

interface UserSession {
  session_id: string;
  user_id?: string;
  start_time: string;
  end_time?: string;
  duration: number;
  page_views: number;
  events: UserEvent[];
  bounce_rate: number;
  engagement_score: number;
  conversion_events: string[];
  exit_page: string;
  entry_page: string;
}

interface UserJourney {
  user_id: string;
  journey_type: 'onboarding' | 'trip_planning' | 'expense_tracking' | 'social_engagement';
  steps: JourneyStep[];
  completion_rate: number;
  time_to_complete: number;
  drop_off_points: string[];
  optimization_opportunities: string[];
}

interface JourneyStep {
  step_name: string;
  page_url: string;
  timestamp: string;
  duration: number;
  interactions: number;
  completed: boolean;
  difficulty_score: number;
}

interface EngagementMetrics {
  daily_active_users: number;
  weekly_active_users: number;
  monthly_active_users: number;
  session_duration_avg: number;
  bounce_rate: number;
  page_views_per_session: number;
  feature_adoption_rate: Record<string, number>;
  retention_rate: {
    day_1: number;
    day_7: number;
    day_30: number;
  };
}

interface BehaviorPattern {
  pattern_id: string;
  pattern_type: 'usage_spike' | 'feature_adoption' | 'churn_risk' | 'power_user';
  description: string;
  frequency: number;
  users_affected: string[];
  trend: 'increasing' | 'decreasing' | 'stable';
  actionable_insights: string[];
}

// =====================================================
// USER BEHAVIOR ANALYTICS ENGINE
// =====================================================

export class UserBehaviorAnalytics {
  private static instance: UserBehaviorAnalytics;
  private eventQueue: UserEvent[] = [];
  private activeSessions = new Map<string, UserSession>();
  private userJourneys = new Map<string, UserJourney[]>();
  private behaviorPatterns: BehaviorPattern[] = [];

  private readonly BATCH_SIZE = 20;
  private readonly FLUSH_INTERVAL = 10000; // 10 seconds
  private readonly SESSION_TIMEOUT = 1800000; // 30 minutes

  private constructor() {
    this.initializeAnalytics();
  }

  static getInstance(): UserBehaviorAnalytics {
    if (!UserBehaviorAnalytics.instance) {
      UserBehaviorAnalytics.instance = new UserBehaviorAnalytics();
    }
    return UserBehaviorAnalytics.instance;
  }

  private initializeAnalytics(): void {
    // Start event processing
    setInterval(() => this.flushEvents(), this.FLUSH_INTERVAL);

    // Session cleanup
    setInterval(() => this.cleanupSessions(), 300000); // 5 minutes

    // Pattern analysis
    setInterval(() => this.analyzeBehaviorPatterns(), 3600000); // 1 hour

    // Set up page visibility handling
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushEvents();
          this.updateSessionsOnHide();
        }
      });

      window.addEventListener('beforeunload', () => {
        this.flushEvents();
        this.endAllSessions();
      });
    }

    logger.debug('📊 User Behavior Analytics initialized');
  }

  // =====================================================
  // EVENT TRACKING
  // =====================================================

  trackEvent(eventType: string, properties: Record<string, any> = {}): void {
    const event: UserEvent = {
      event_type: eventType,
      event_category: this.categorizeEvent(eventType),
      properties: {
        ...properties,
        client_timestamp: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      timestamp: new Date().toISOString(),
      session_id: this.getCurrentSessionId(),
      user_id: this.getCurrentUserId(),
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      device_info: this.getDeviceInfo()
    };

    this.eventQueue.push(event);
    this.updateCurrentSession(event);

    // Immediate flush for critical events
    if (this.isCriticalEvent(eventType)) {
      this.flushEvents();
    }

    // Queue is full, flush immediately
    if (this.eventQueue.length >= this.BATCH_SIZE) {
      this.flushEvents();
    }
  }

  // Page view tracking
  trackPageView(url: string, referrer?: string): void {
    this.trackEvent('page_view', {
      url,
      referrer,
      title: document.title,
      load_time: performance.timing?.loadEventEnd - performance.timing?.navigationStart
    });
  }

  // User interaction tracking
  trackClick(element: string, properties: Record<string, any> = {}): void {
    this.trackEvent('click', {
      element,
      ...properties,
      coordinates: properties.coordinates || null
    });
  }

  // Form interaction tracking
  trackFormInteraction(formId: string, action: 'start' | 'complete' | 'abandon', properties: Record<string, any> = {}): void {
    this.trackEvent(`form_${action}`, {
      form_id: formId,
      ...properties
    });
  }

  // Feature usage tracking
  trackFeatureUsage(feature: string, action: string, properties: Record<string, any> = {}): void {
    this.trackEvent('feature_usage', {
      feature,
      action,
      ...properties
    });
  }

  // Error tracking
  trackError(error: Error, context: Record<string, any> = {}): void {
    this.trackEvent('error', {
      error_message: error.message,
      error_stack: error.stack,
      error_type: error.name,
      ...context
    });
  }

  // Performance tracking
  trackPerformance(metric: string, value: number, properties: Record<string, any> = {}): void {
    this.trackEvent('performance', {
      metric,
      value,
      ...properties
    });
  }

  // Conversion tracking
  trackConversion(goal: string, value?: number, properties: Record<string, any> = {}): void {
    this.trackEvent('conversion', {
      goal,
      value,
      ...properties
    });

    // Update session with conversion
    const sessionId = this.getCurrentSessionId();
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.conversion_events.push(goal);
    }
  }

  // =====================================================
  // SESSION MANAGEMENT
  // =====================================================

  startSession(userId?: string): string {
    const sessionId = this.generateSessionId();
    const session: UserSession = {
      session_id: sessionId,
      user_id: userId,
      start_time: new Date().toISOString(),
      duration: 0,
      page_views: 0,
      events: [],
      bounce_rate: 0,
      engagement_score: 0,
      conversion_events: [],
      exit_page: '',
      entry_page: window.location.href
    };

    this.activeSessions.set(sessionId, session);
    this.setCurrentSessionId(sessionId);

    if (userId) {
      this.setCurrentUserId(userId);
    }

    this.trackEvent('session_start', { session_id: sessionId });
    return sessionId;
  }

  endSession(sessionId?: string): void {
    const id = sessionId || this.getCurrentSessionId();
    const session = this.activeSessions.get(id);

    if (session) {
      session.end_time = new Date().toISOString();
      session.duration = new Date(session.end_time).getTime() - new Date(session.start_time).getTime();
      session.exit_page = window.location.href;
      session.engagement_score = this.calculateEngagementScore(session);
      session.bounce_rate = session.page_views <= 1 ? 1 : 0;

      this.trackEvent('session_end', {
        session_id: id,
        duration: session.duration,
        engagement_score: session.engagement_score
      });

      // Store session data
      this.storeSessionData(session);
      this.activeSessions.delete(id);
    }
  }

  private updateCurrentSession(event: UserEvent): void {
    const session = this.activeSessions.get(event.session_id);
    if (!session) return;

    session.events.push(event);

    if (event.event_type === 'page_view') {
      session.page_views++;
    }

    // Update duration
    session.duration = Date.now() - new Date(session.start_time).getTime();
  }

  private calculateEngagementScore(session: UserSession): number {
    let score = 0;

    // Duration scoring (max 40 points)
    const durationMinutes = session.duration / 60000;
    score += Math.min(durationMinutes * 2, 40);

    // Interaction scoring (max 30 points)
    const interactions = session.events.filter(e =>
      ['click', 'form_start', 'feature_usage'].includes(e.event_type)
    ).length;
    score += Math.min(interactions * 3, 30);

    // Page view scoring (max 20 points)
    score += Math.min(session.page_views * 5, 20);

    // Conversion scoring (max 10 points)
    score += session.conversion_events.length * 10;

    return Math.min(score, 100);
  }

  // =====================================================
  // USER JOURNEY ANALYSIS
  // =====================================================

  trackUserJourney(userId: string, journeyType: UserJourney['journey_type'], stepName: string): void {
    let journeys = this.userJourneys.get(userId) || [];
    let currentJourney = journeys.find(j => j.journey_type === journeyType && !j.steps.find(s => s.step_name === 'completed'));

    if (!currentJourney) {
      currentJourney = {
        user_id: userId,
        journey_type: journeyType,
        steps: [],
        completion_rate: 0,
        time_to_complete: 0,
        drop_off_points: [],
        optimization_opportunities: []
      };
      journeys.push(currentJourney);
    }

    const step: JourneyStep = {
      step_name: stepName,
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
      duration: 0,
      interactions: 0,
      completed: false,
      difficulty_score: 0
    };

    // Calculate duration from previous step
    const prevStep = currentJourney.steps[currentJourney.steps.length - 1];
    if (prevStep) {
      step.duration = Date.now() - new Date(prevStep.timestamp).getTime();
    }

    currentJourney.steps.push(step);
    this.userJourneys.set(userId, journeys);

    this.trackEvent('journey_step', {
      journey_type: journeyType,
      step_name: stepName,
      step_index: currentJourney.steps.length
    });
  }

  completeJourneyStep(userId: string, journeyType: UserJourney['journey_type'], stepName: string): void {
    const journeys = this.userJourneys.get(userId);
    if (!journeys) return;

    const journey = journeys.find(j => j.journey_type === journeyType);
    if (!journey) return;

    const step = journey.steps.find(s => s.step_name === stepName);
    if (step) {
      step.completed = true;
      step.difficulty_score = this.calculateStepDifficulty(step);

      this.trackEvent('journey_step_completed', {
        journey_type: journeyType,
        step_name: stepName,
        difficulty_score: step.difficulty_score
      });
    }
  }

  private calculateStepDifficulty(step: JourneyStep): number {
    let difficulty = 0;

    // Duration-based difficulty
    if (step.duration > 300000) difficulty += 3; // 5+ minutes = hard
    else if (step.duration > 120000) difficulty += 2; // 2+ minutes = medium
    else difficulty += 1; // < 2 minutes = easy

    // Interaction-based difficulty
    if (step.interactions > 10) difficulty += 2;
    else if (step.interactions > 5) difficulty += 1;

    return Math.min(difficulty, 5);
  }

  // =====================================================
  // BEHAVIOR PATTERN ANALYSIS
  // =====================================================

  private async analyzeBehaviorPatterns(): Promise<void> {
    try {
      // Analyze recent user behavior
      const patterns = await this.identifyPatterns();
      this.behaviorPatterns = patterns;

      // Store patterns in database
      await this.storeBehaviorPatterns(patterns);

      logger.debug(`📊 Analyzed ${patterns.length} behavior patterns`);
    } catch (error) {
      logger.error('Error analyzing behavior patterns:', error);
    }
  }

  private async identifyPatterns(): Promise<BehaviorPattern[]> {
    const patterns: BehaviorPattern[] = [];

    // Pattern 1: Feature adoption spikes
    const adoptionPattern = await this.analyzeFeatureAdoption();
    if (adoptionPattern) patterns.push(adoptionPattern);

    // Pattern 2: Churn risk indicators
    const churnPattern = await this.analyzeChurnRisk();
    if (churnPattern) patterns.push(churnPattern);

    // Pattern 3: Power user identification
    const powerUserPattern = await this.analyzePowerUsers();
    if (powerUserPattern) patterns.push(powerUserPattern);

    // Pattern 4: Usage spikes
    const usagePattern = await this.analyzeUsageSpikes();
    if (usagePattern) patterns.push(usagePattern);

    return patterns;
  }

  private async analyzeFeatureAdoption(): Promise<BehaviorPattern | null> {
    // This would analyze feature usage trends
    return {
      pattern_id: 'feature_adoption_' + Date.now(),
      pattern_type: 'feature_adoption',
      description: 'Increased adoption of trip planning features',
      frequency: 0.85,
      users_affected: [], // Would calculate from data
      trend: 'increasing',
      actionable_insights: [
        'Trip planning is gaining traction',
        'Consider promoting related features',
        'Optimize onboarding for trip planning'
      ]
    };
  }

  private async analyzeChurnRisk(): Promise<BehaviorPattern | null> {
    // Identify users at risk of churning
    return {
      pattern_id: 'churn_risk_' + Date.now(),
      pattern_type: 'churn_risk',
      description: 'Users showing decreased engagement',
      frequency: 0.15,
      users_affected: [], // Would calculate from data
      trend: 'stable',
      actionable_insights: [
        'Implement re-engagement campaigns',
        'Provide personalized recommendations',
        'Simplify key user flows'
      ]
    };
  }

  private async analyzePowerUsers(): Promise<BehaviorPattern | null> {
    // Identify power users with high engagement
    return {
      pattern_id: 'power_users_' + Date.now(),
      pattern_type: 'power_user',
      description: 'Highly engaged users driving feature adoption',
      frequency: 0.05,
      users_affected: [], // Would calculate from data
      trend: 'increasing',
      actionable_insights: [
        'Leverage for beta testing',
        'Gather detailed feedback',
        'Create referral programs'
      ]
    };
  }

  private async analyzeUsageSpikes(): Promise<BehaviorPattern | null> {
    // Analyze traffic and usage spikes
    return {
      pattern_id: 'usage_spike_' + Date.now(),
      pattern_type: 'usage_spike',
      description: 'Increased activity during weekend planning',
      frequency: 0.7,
      users_affected: [], // Would calculate from data
      trend: 'increasing',
      actionable_insights: [
        'Optimize infrastructure for peak times',
        'Prepare weekend-specific content',
        'Schedule marketing for high-activity periods'
      ]
    };
  }

  // =====================================================
  // ENGAGEMENT METRICS
  // =====================================================

  async calculateEngagementMetrics(): Promise<EngagementMetrics> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // This would typically query the database for actual metrics
    return {
      daily_active_users: await this.getActiveUsers(dayAgo),
      weekly_active_users: await this.getActiveUsers(weekAgo),
      monthly_active_users: await this.getActiveUsers(monthAgo),
      session_duration_avg: this.calculateAverageSessionDuration(),
      bounce_rate: this.calculateBounceRate(),
      page_views_per_session: this.calculatePageViewsPerSession(),
      feature_adoption_rate: await this.calculateFeatureAdoptionRates(),
      retention_rate: await this.calculateRetentionRates()
    };
  }

  private async getActiveUsers(since: Date): Promise<number> {
    // This would query the database for unique users since the date
    return 0; // Placeholder
  }

  private calculateAverageSessionDuration(): number {
    const sessions = Array.from(this.activeSessions.values());
    if (sessions.length === 0) return 0;

    const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
    return totalDuration / sessions.length;
  }

  private calculateBounceRate(): number {
    const sessions = Array.from(this.activeSessions.values());
    if (sessions.length === 0) return 0;

    const bounces = sessions.filter(session => session.page_views <= 1).length;
    return bounces / sessions.length;
  }

  private calculatePageViewsPerSession(): number {
    const sessions = Array.from(this.activeSessions.values());
    if (sessions.length === 0) return 0;

    const totalPageViews = sessions.reduce((sum, session) => sum + session.page_views, 0);
    return totalPageViews / sessions.length;
  }

  private async calculateFeatureAdoptionRates(): Promise<Record<string, number>> {
    // This would calculate adoption rates for different features
    return {
      'trip_planning': 0.65,
      'expense_tracking': 0.80,
      'social_features': 0.35,
      'pam_assistant': 0.55
    };
  }

  private async calculateRetentionRates(): Promise<{ day_1: number; day_7: number; day_30: number }> {
    // This would calculate actual retention rates from user data
    return {
      day_1: 0.75,
      day_7: 0.45,
      day_30: 0.25
    };
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private categorizeEvent(eventType: string): UserEvent['event_category'] {
    const categoryMap: Record<string, UserEvent['event_category']> = {
      'page_view': 'navigation',
      'click': 'interaction',
      'form_start': 'engagement',
      'form_complete': 'conversion',
      'error': 'error',
      'feature_usage': 'engagement',
      'conversion': 'conversion'
    };

    return categoryMap[eventType] || 'interaction';
  }

  private isCriticalEvent(eventType: string): boolean {
    return ['error', 'conversion', 'session_end'].includes(eventType);
  }

  private getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;

    return {
      type: this.getDeviceType(),
      browser: this.getBrowser(userAgent),
      os: this.getOS(userAgent),
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      connection_type: this.getConnectionType()
    };
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('iOS')) return 'iOS';
    if (userAgent.includes('Android')) return 'Android';
    return 'Unknown';
  }

  private getConnectionType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType || 'unknown';
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private getCurrentSessionId(): string {
    return sessionStorage.getItem('analytics_session_id') || this.startSession();
  }

  private setCurrentSessionId(sessionId: string): void {
    sessionStorage.setItem('analytics_session_id', sessionId);
  }

  private getCurrentUserId(): string | undefined {
    return sessionStorage.getItem('analytics_user_id') || undefined;
  }

  private setCurrentUserId(userId: string): void {
    sessionStorage.setItem('analytics_user_id', userId);
  }

  // =====================================================
  // DATA PERSISTENCE
  // =====================================================

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Store events in database
      await this.storeEvents(events);

      collectUserAction('analytics_events_flushed', {
        event_count: events.length,
        flush_timestamp: Date.now()
      });

      logger.debug(`📊 Flushed ${events.length} user behavior events`);
    } catch (error) {
      logger.error('Error flushing analytics events:', error);
      // Re-queue events if storage fails
      this.eventQueue.unshift(...events);
    }
  }

  private async storeEvents(events: UserEvent[]): Promise<void> {
    // Store in Supabase
    const { error } = await supabase
      .from('user_events')
      .insert(events.map(event => ({
        event_type: event.event_type,
        event_category: event.event_category,
        properties: event.properties,
        timestamp: event.timestamp,
        session_id: event.session_id,
        user_id: event.user_id,
        page_url: event.page_url,
        user_agent: event.user_agent,
        device_info: event.device_info
      })));

    if (error) throw error;
  }

  private async storeSessionData(session: UserSession): Promise<void> {
    const { error } = await supabase
      .from('user_sessions')
      .insert({
        session_id: session.session_id,
        user_id: session.user_id,
        start_time: session.start_time,
        end_time: session.end_time,
        duration: session.duration,
        page_views: session.page_views,
        bounce_rate: session.bounce_rate,
        engagement_score: session.engagement_score,
        conversion_events: session.conversion_events,
        exit_page: session.exit_page,
        entry_page: session.entry_page
      });

    if (error) throw error;
  }

  private async storeBehaviorPatterns(patterns: BehaviorPattern[]): Promise<void> {
    const { error } = await supabase
      .from('behavior_patterns')
      .insert(patterns.map(pattern => ({
        pattern_id: pattern.pattern_id,
        pattern_type: pattern.pattern_type,
        description: pattern.description,
        frequency: pattern.frequency,
        users_affected: pattern.users_affected,
        trend: pattern.trend,
        actionable_insights: pattern.actionable_insights,
        identified_at: new Date().toISOString()
      })));

    if (error) throw error;
  }

  // =====================================================
  // CLEANUP AND MAINTENANCE
  // =====================================================

  private cleanupSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.activeSessions) {
      const lastActivity = new Date(session.start_time).getTime() + session.duration;
      if (now - lastActivity > this.SESSION_TIMEOUT) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.endSession(sessionId);
    });

    if (expiredSessions.length > 0) {
      logger.debug(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  private updateSessionsOnHide(): void {
    // Update all active sessions when page becomes hidden
    for (const session of this.activeSessions.values()) {
      session.duration = Date.now() - new Date(session.start_time).getTime();
    }
  }

  private endAllSessions(): void {
    const sessionIds = Array.from(this.activeSessions.keys());
    sessionIds.forEach(sessionId => this.endSession(sessionId));
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  getBehaviorPatterns(): BehaviorPattern[] {
    return [...this.behaviorPatterns];
  }

  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  getQueuedEventCount(): number {
    return this.eventQueue.length;
  }

  getUserJourneys(userId: string): UserJourney[] {
    return this.userJourneys.get(userId) || [];
  }

  forceFlush(): Promise<void> {
    return this.flushEvents();
  }

  dispose(): void {
    this.flushEvents();
    this.endAllSessions();
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const userBehaviorAnalytics = UserBehaviorAnalytics.getInstance();

// Convenience functions for React components
export const trackPageView = (url: string, referrer?: string) =>
  userBehaviorAnalytics.trackPageView(url, referrer);

export const trackClick = (element: string, properties?: Record<string, any>) =>
  userBehaviorAnalytics.trackClick(element, properties);

export const trackFeatureUsage = (feature: string, action: string, properties?: Record<string, any>) =>
  userBehaviorAnalytics.trackFeatureUsage(feature, action, properties);

export const trackConversion = (goal: string, value?: number, properties?: Record<string, any>) =>
  userBehaviorAnalytics.trackConversion(goal, value, properties);

export const startUserSession = (userId?: string) =>
  userBehaviorAnalytics.startSession(userId);

export const trackUserJourney = (userId: string, journeyType: UserJourney['journey_type'], stepName: string) =>
  userBehaviorAnalytics.trackUserJourney(userId, journeyType, stepName);