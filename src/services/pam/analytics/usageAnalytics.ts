/**
 * PAM Usage Analytics System
 * 
 * Comprehensive analytics system for tracking PAM usage, performance, and user satisfaction.
 * Includes tool usage frequency, response times, error rates, user feedback, and token usage
 * for cost monitoring and optimization.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface AnalyticsEvent {
  id?: string;
  user_id: string;
  session_id: string;
  event_type: AnalyticsEventType;
  event_data: Record<string, any>;
  timestamp: Date;
  metadata?: {
    user_agent?: string;
    screen_size?: string;
    device_type?: 'mobile' | 'tablet' | 'desktop';
    connection_type?: string;
  };
}

export type AnalyticsEventType = 
  | 'tool_usage'
  | 'response_time' 
  | 'error_occurred'
  | 'user_feedback'
  | 'token_usage'
  | 'conversation_start'
  | 'conversation_end'
  | 'cache_hit'
  | 'cache_miss'
  | 'context_optimization'
  | 'user_action';

export interface ToolUsageEvent {
  tool_name: string;
  tool_category: 'financial' | 'travel' | 'general' | 'system';
  usage_count: number;
  success_rate: number;
  average_response_time: number;
  parameters_used: string[];
  context_length: number;
}

export interface ResponseTimeEvent {
  operation: string;
  response_time_ms: number;
  token_count: number;
  cache_hit: boolean;
  network_latency?: number;
  processing_time?: number;
}

export interface ErrorEvent {
  error_type: 'api_error' | 'network_error' | 'validation_error' | 'system_error';
  error_message: string;
  error_code?: string;
  stack_trace?: string;
  context: {
    operation: string;
    user_input?: string;
    system_state?: any;
  };
  recovery_attempted: boolean;
  recovery_successful?: boolean;
}

export interface UserFeedbackEvent {
  feedback_type: 'thumbs_up' | 'thumbs_down' | 'rating' | 'comment';
  feedback_value: number | string;
  message_id: string;
  response_quality: number; // 1-5 scale
  response_relevance: number; // 1-5 scale
  response_helpfulness: number; // 1-5 scale
  additional_comments?: string;
}

export interface TokenUsageEvent {
  operation: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  model: string;
  conversation_length: number;
  context_optimization_applied: boolean;
}

export interface AnalyticsMetrics {
  usage: {
    totalSessions: number;
    totalEvents: number;
    averageSessionDuration: number;
    mostUsedTools: Array<{ tool: string; count: number; percentage: number }>;
    peakUsageHours: Array<{ hour: number; count: number }>;
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
    uptime: number;
  };
  satisfaction: {
    averageRating: number;
    thumbsUpRate: number;
    npsScore: number; // Net Promoter Score
    commonIssues: Array<{ issue: string; count: number }>;
  };
  costs: {
    totalTokensUsed: number;
    estimatedCost: number;
    costPerSession: number;
    tokenEfficiency: number;
    optimizationSavings: number;
  };
}

// =====================================================
// USAGE ANALYTICS SERVICE
// =====================================================

export class UsageAnalyticsService {
  private static instance: UsageAnalyticsService;
  private sessionId: string;
  private userId: string;
  private batchQueue: AnalyticsEvent[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_TIMEOUT_MS = 5000; // 5 seconds

  private constructor(userId: string, sessionId?: string) {
    this.userId = userId;
    this.sessionId = sessionId || this.generateSessionId();
    this.initializeSession();
  }

  static getInstance(userId: string, sessionId?: string): UsageAnalyticsService {
    if (!UsageAnalyticsService.instance || UsageAnalyticsService.instance.userId !== userId) {
      UsageAnalyticsService.instance = new UsageAnalyticsService(userId, sessionId);
    }
    return UsageAnalyticsService.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeSession(): Promise<void> {
    await this.trackEvent('conversation_start', {
      session_started_at: new Date().toISOString(),
      user_agent: navigator.userAgent,
      screen_size: `${window.screen.width}x${window.screen.height}`,
      device_type: this.getDeviceType(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  // =====================================================
  // EVENT TRACKING METHODS
  // =====================================================

  /**
   * Track tool usage with detailed metrics
   */
  async trackToolUsage(toolData: ToolUsageEvent): Promise<void> {
    await this.trackEvent('tool_usage', {
      ...toolData,
      timestamp: new Date().toISOString(),
      session_context: this.getSessionContext()
    });

    logger.debug('📊 Tool usage tracked', { 
      tool: toolData.tool_name, 
      category: toolData.tool_category,
      responseTime: toolData.average_response_time 
    });
  }

  /**
   * Track response time and performance metrics
   */
  async trackResponseTime(responseData: ResponseTimeEvent): Promise<void> {
    await this.trackEvent('response_time', {
      ...responseData,
      timestamp: new Date().toISOString(),
      performance_grade: this.calculatePerformanceGrade(responseData.response_time_ms),
      session_context: this.getSessionContext()
    });

    // Also track cache performance
    if (responseData.cache_hit !== undefined) {
      await this.trackEvent(responseData.cache_hit ? 'cache_hit' : 'cache_miss', {
        operation: responseData.operation,
        response_time_saved: responseData.cache_hit ? responseData.response_time_ms * 0.8 : 0, // Estimate
        token_count: responseData.token_count
      });
    }
  }

  /**
   * Track errors with detailed context
   */
  async trackError(errorData: ErrorEvent): Promise<void> {
    await this.trackEvent('error_occurred', {
      ...errorData,
      timestamp: new Date().toISOString(),
      severity: this.calculateErrorSeverity(errorData),
      user_impact: this.calculateUserImpact(errorData),
      session_context: this.getSessionContext()
    });

    logger.error('📊 Error tracked', { 
      type: errorData.error_type, 
      operation: errorData.context.operation,
      recoverable: errorData.recovery_attempted
    });
  }

  /**
   * Track user feedback and satisfaction
   */
  async trackUserFeedback(feedbackData: UserFeedbackEvent): Promise<void> {
    await this.trackEvent('user_feedback', {
      ...feedbackData,
      timestamp: new Date().toISOString(),
      overall_satisfaction: this.calculateOverallSatisfaction(feedbackData),
      session_context: this.getSessionContext()
    });

    logger.info('📊 User feedback tracked', { 
      type: feedbackData.feedback_type, 
      value: feedbackData.feedback_value,
      quality: feedbackData.response_quality
    });
  }

  /**
   * Track token usage for cost monitoring
   */
  async trackTokenUsage(tokenData: TokenUsageEvent): Promise<void> {
    await this.trackEvent('token_usage', {
      ...tokenData,
      timestamp: new Date().toISOString(),
      cost_efficiency_score: this.calculateCostEfficiency(tokenData),
      optimization_potential: this.calculateOptimizationPotential(tokenData),
      session_context: this.getSessionContext()
    });

    logger.debug('📊 Token usage tracked', { 
      operation: tokenData.operation, 
      total_tokens: tokenData.total_tokens,
      estimated_cost: tokenData.estimated_cost
    });
  }

  /**
   * Track context optimization events
   */
  async trackContextOptimization(optimizationData: {
    messages_before: number;
    messages_after: number;
    tokens_before: number;
    tokens_after: number;
    optimization_type: 'summarization' | 'window_sliding' | 'importance_filtering';
    processing_time_ms: number;
  }): Promise<void> {
    const compressionRatio = optimizationData.tokens_after / optimizationData.tokens_before;
    const tokensReduced = optimizationData.tokens_before - optimizationData.tokens_after;

    await this.trackEvent('context_optimization', {
      ...optimizationData,
      compression_ratio: compressionRatio,
      tokens_reduced: tokensReduced,
      efficiency_gain: 1 - compressionRatio,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track user actions for behavior analysis
   */
  async trackUserAction(action: string, actionData?: Record<string, any>): Promise<void> {
    await this.trackEvent('user_action', {
      action,
      ...actionData,
      timestamp: new Date().toISOString(),
      page_url: window.location.pathname,
      session_context: this.getSessionContext()
    });
  }

  // =====================================================
  // CALCULATION HELPERS
  // =====================================================

  private calculatePerformanceGrade(responseTime: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (responseTime < 1000) return 'excellent';
    if (responseTime < 3000) return 'good';
    if (responseTime < 5000) return 'fair';
    return 'poor';
  }

  private calculateErrorSeverity(error: ErrorEvent): 'critical' | 'high' | 'medium' | 'low' {
    if (error.error_type === 'system_error' && !error.recovery_attempted) return 'critical';
    if (error.error_type === 'api_error' && error.error_message.includes('authentication')) return 'high';
    if (error.recovery_attempted && error.recovery_successful) return 'low';
    return 'medium';
  }

  private calculateUserImpact(error: ErrorEvent): 'blocking' | 'degraded' | 'minimal' {
    if (error.error_type === 'system_error') return 'blocking';
    if (error.recovery_successful) return 'minimal';
    return 'degraded';
  }

  private calculateOverallSatisfaction(feedback: UserFeedbackEvent): number {
    // Weight different aspects of feedback
    const qualityWeight = 0.4;
    const relevanceWeight = 0.3;
    const helpfulnessWeight = 0.3;

    return (
      feedback.response_quality * qualityWeight +
      feedback.response_relevance * relevanceWeight +
      feedback.response_helpfulness * helpfulnessWeight
    );
  }

  private calculateCostEfficiency(tokenData: TokenUsageEvent): number {
    // Higher efficiency for shorter conversations that accomplish more
    const baseEfficiency = 1 / (tokenData.total_tokens / 1000); // Inversely related to token count
    const optimizationBonus = tokenData.context_optimization_applied ? 1.2 : 1.0;
    
    return Math.min(baseEfficiency * optimizationBonus, 1.0);
  }

  private calculateOptimizationPotential(tokenData: TokenUsageEvent): number {
    // Higher potential for optimization in longer conversations
    if (tokenData.conversation_length < 10) return 0.1;
    if (tokenData.conversation_length < 30) return 0.3;
    if (tokenData.conversation_length < 50) return 0.6;
    return 0.9;
  }

  private getSessionContext() {
    return {
      session_duration: Date.now() - parseInt(this.sessionId.split('_')[1]),
      events_in_session: this.batchQueue.length,
      current_page: window.location.pathname,
      timestamp: new Date().toISOString()
    };
  }

  // =====================================================
  // CORE EVENT TRACKING
  // =====================================================

  /**
   * Core event tracking method with batching
   */
  private async trackEvent(eventType: AnalyticsEventType, eventData: Record<string, any>): Promise<void> {
    const event: AnalyticsEvent = {
      user_id: this.userId,
      session_id: this.sessionId,
      event_type: eventType,
      event_data: eventData,
      timestamp: new Date(),
      metadata: {
        user_agent: navigator.userAgent,
        screen_size: `${window.screen.width}x${window.screen.height}`,
        device_type: this.getDeviceType(),
        connection_type: this.getConnectionType()
      }
    };

    // Add to batch queue
    this.batchQueue.push(event);

    // Send immediately for critical events, otherwise batch
    if (this.isCriticalEvent(eventType)) {
      await this.flushBatch();
    } else if (this.batchQueue.length >= this.BATCH_SIZE) {
      await this.flushBatch();
    } else {
      this.scheduleBatchFlush();
    }
  }

  private isCriticalEvent(eventType: AnalyticsEventType): boolean {
    return ['error_occurred', 'conversation_start', 'conversation_end'].includes(eventType);
  }

  private getConnectionType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType || 'unknown';
  }

  private scheduleBatchFlush(): void {
    if (this.batchTimeout) return;

    this.batchTimeout = setTimeout(async () => {
      await this.flushBatch();
    }, this.BATCH_TIMEOUT_MS);
  }

  /**
   * Flush batched events to Supabase
   */
  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const events = [...this.batchQueue];
    this.batchQueue = [];

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    try {
      const { error } = await supabase
        .from('pam_analytics')
        .insert(events.map(event => ({
          user_id: event.user_id,
          session_id: event.session_id,
          event_type: event.event_type,
          event_data: event.event_data,
          timestamp: event.timestamp.toISOString(),
          metadata: event.metadata
        })));

      if (error) {
        logger.error('Failed to store analytics events', error);
        // Re-queue events for retry (with limit to prevent infinite growth)
        if (this.batchQueue.length < 100) {
          this.batchQueue.unshift(...events);
        }
      } else {
        logger.debug(`📊 Successfully stored ${events.length} analytics events`);
      }
    } catch (error) {
      logger.error('Analytics batch flush failed', error);
    }
  }

  // =====================================================
  // ANALYTICS RETRIEVAL METHODS
  // =====================================================

  /**
   * Get analytics metrics for dashboard
   */
  async getAnalyticsMetrics(
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h',
    userId?: string
  ): Promise<AnalyticsMetrics> {
    const targetUserId = userId || this.userId;
    const startDate = this.getStartDateForRange(timeRange);

    try {
      // Get base analytics data
      const { data: events, error } = await supabase
        .from('pam_analytics')
        .select('*')
        .eq('user_id', targetUserId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });

      if (error) {
        logger.error('Failed to fetch analytics data', error);
        return this.getEmptyMetrics();
      }

      return this.calculateMetrics(events || []);
    } catch (error) {
      logger.error('Error fetching analytics metrics', error);
      return this.getEmptyMetrics();
    }
  }

  private getStartDateForRange(range: string): Date {
    const now = new Date();
    switch (range) {
      case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private calculateMetrics(events: any[]): AnalyticsMetrics {
    const sessions = new Set(events.map(e => e.session_id));
    const toolUsageEvents = events.filter(e => e.event_type === 'tool_usage');
    const responseTimeEvents = events.filter(e => e.event_type === 'response_time');
    const errorEvents = events.filter(e => e.event_type === 'error_occurred');
    const feedbackEvents = events.filter(e => e.event_type === 'user_feedback');
    const tokenUsageEvents = events.filter(e => e.event_type === 'token_usage');

    // Calculate usage metrics
    const toolCounts = toolUsageEvents.reduce((acc, event) => {
      const tool = event.event_data.tool_name;
      acc[tool] = (acc[tool] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedTools = Object.entries(toolCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tool, count]) => ({
        tool,
        count,
        percentage: (count / toolUsageEvents.length) * 100
      }));

    // Calculate performance metrics
    const responseTimes = responseTimeEvents.map(e => e.event_data.response_time_ms).filter(Boolean);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    const p95ResponseTime = responseTimes.length > 0
      ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)]
      : 0;

    const cacheHits = events.filter(e => e.event_type === 'cache_hit').length;
    const cacheMisses = events.filter(e => e.event_type === 'cache_miss').length;
    const cacheHitRate = (cacheHits + cacheMisses) > 0 ? cacheHits / (cacheHits + cacheMisses) : 0;

    const errorRate = events.length > 0 ? errorEvents.length / events.length : 0;

    // Calculate satisfaction metrics
    const ratings = feedbackEvents
      .filter(e => e.event_data.response_quality)
      .map(e => e.event_data.response_quality);
    
    const averageRating = ratings.length > 0 
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
      : 0;

    const thumbsUp = feedbackEvents.filter(e => e.event_data.feedback_type === 'thumbs_up').length;
    const thumbsDown = feedbackEvents.filter(e => e.event_data.feedback_type === 'thumbs_down').length;
    const thumbsUpRate = (thumbsUp + thumbsDown) > 0 ? thumbsUp / (thumbsUp + thumbsDown) : 0;

    // Calculate cost metrics
    const totalTokens = tokenUsageEvents.reduce((sum, event) => 
      sum + (event.event_data.total_tokens || 0), 0);
    
    const totalCost = tokenUsageEvents.reduce((sum, event) => 
      sum + (event.event_data.estimated_cost || 0), 0);

    return {
      usage: {
        totalSessions: sessions.size,
        totalEvents: events.length,
        averageSessionDuration: this.calculateAverageSessionDuration(events),
        mostUsedTools,
        peakUsageHours: this.calculatePeakUsageHours(events)
      },
      performance: {
        averageResponseTime,
        p95ResponseTime,
        cacheHitRate,
        errorRate,
        uptime: 1 - errorRate // Simplified uptime calculation
      },
      satisfaction: {
        averageRating,
        thumbsUpRate,
        npsScore: this.calculateNPS(feedbackEvents),
        commonIssues: this.getCommonIssues(errorEvents)
      },
      costs: {
        totalTokensUsed: totalTokens,
        estimatedCost: totalCost,
        costPerSession: sessions.size > 0 ? totalCost / sessions.size : 0,
        tokenEfficiency: this.calculateTokenEfficiency(tokenUsageEvents),
        optimizationSavings: this.calculateOptimizationSavings(events)
      }
    };
  }

  private calculateAverageSessionDuration(events: any[]): number {
    const sessionDurations = new Map<string, { start: number; end: number }>();

    events.forEach(event => {
      const sessionId = event.session_id;
      const timestamp = new Date(event.timestamp).getTime();

      if (!sessionDurations.has(sessionId)) {
        sessionDurations.set(sessionId, { start: timestamp, end: timestamp });
      } else {
        const session = sessionDurations.get(sessionId)!;
        session.start = Math.min(session.start, timestamp);
        session.end = Math.max(session.end, timestamp);
      }
    });

    const durations = Array.from(sessionDurations.values()).map(s => s.end - s.start);
    return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }

  private calculatePeakUsageHours(events: any[]): Array<{ hour: number; count: number }> {
    const hourCounts = events.reduce((acc, event) => {
      const hour = new Date(event.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }

  private calculateNPS(feedbackEvents: any[]): number {
    const ratings = feedbackEvents
      .filter(e => e.event_data.response_quality)
      .map(e => e.event_data.response_quality);

    if (ratings.length === 0) return 0;

    const promoters = ratings.filter(r => r >= 4).length;
    const detractors = ratings.filter(r => r <= 2).length;
    
    return ((promoters - detractors) / ratings.length) * 100;
  }

  private getCommonIssues(errorEvents: any[]): Array<{ issue: string; count: number }> {
    const issueCounts = errorEvents.reduce((acc, event) => {
      const issue = event.event_data.error_type || 'Unknown Error';
      acc[issue] = (acc[issue] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(issueCounts)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private calculateTokenEfficiency(tokenUsageEvents: any[]): number {
    if (tokenUsageEvents.length === 0) return 1;

    const efficiencies = tokenUsageEvents
      .map(e => e.event_data.cost_efficiency_score)
      .filter(Boolean);

    return efficiencies.length > 0 
      ? efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length
      : 0.5;
  }

  private calculateOptimizationSavings(events: any[]): number {
    const optimizationEvents = events.filter(e => e.event_type === 'context_optimization');
    
    return optimizationEvents.reduce((savings, event) => {
      const tokensReduced = event.event_data.tokens_reduced || 0;
      const costPerToken = 0.000003; // Approximate cost per token
      return savings + (tokensReduced * costPerToken);
    }, 0);
  }

  private getEmptyMetrics(): AnalyticsMetrics {
    return {
      usage: {
        totalSessions: 0,
        totalEvents: 0,
        averageSessionDuration: 0,
        mostUsedTools: [],
        peakUsageHours: []
      },
      performance: {
        averageResponseTime: 0,
        p95ResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        uptime: 1
      },
      satisfaction: {
        averageRating: 0,
        thumbsUpRate: 0,
        npsScore: 0,
        commonIssues: []
      },
      costs: {
        totalTokensUsed: 0,
        estimatedCost: 0,
        costPerSession: 0,
        tokenEfficiency: 1,
        optimizationSavings: 0
      }
    };
  }

  /**
   * End session tracking
   */
  async endSession(): Promise<void> {
    await this.trackEvent('conversation_end', {
      session_ended_at: new Date().toISOString(),
      total_events: this.batchQueue.length,
      session_duration: Date.now() - parseInt(this.sessionId.split('_')[1])
    });

    await this.flushBatch();
  }

  /**
   * Cleanup analytics service
   */
  dispose(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }
}

// =====================================================
// REACT HOOK FOR ANALYTICS
// =====================================================

export function useAnalytics(userId: string) {
  const [analytics] = React.useState(() => UsageAnalyticsService.getInstance(userId));
  const [metrics, setMetrics] = React.useState<AnalyticsMetrics | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const trackToolUsage = async (toolData: ToolUsageEvent) => {
    await analytics.trackToolUsage(toolData);
  };

  const trackResponseTime = async (responseData: ResponseTimeEvent) => {
    await analytics.trackResponseTime(responseData);
  };

  const trackError = async (errorData: ErrorEvent) => {
    await analytics.trackError(errorData);
  };

  const trackUserFeedback = async (feedbackData: UserFeedbackEvent) => {
    await analytics.trackUserFeedback(feedbackData);
  };

  const trackTokenUsage = async (tokenData: TokenUsageEvent) => {
    await analytics.trackTokenUsage(tokenData);
  };

  const trackUserAction = async (action: string, actionData?: Record<string, any>) => {
    await analytics.trackUserAction(action, actionData);
  };

  const loadMetrics = async (timeRange: '1h' | '24h' | '7d' | '30d' = '24h') => {
    setIsLoading(true);
    try {
      const data = await analytics.getAnalyticsMetrics(timeRange);
      setMetrics(data);
    } catch (error) {
      logger.error('Failed to load analytics metrics', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadMetrics();
    
    return () => {
      analytics.dispose();
    };
  }, [userId]);

  return {
    trackToolUsage,
    trackResponseTime,
    trackError,
    trackUserFeedback,
    trackTokenUsage,
    trackUserAction,
    loadMetrics,
    metrics,
    isLoading
  };
}

// =====================================================
// EXPORTS
// =====================================================

export default UsageAnalyticsService;

// Create singleton instance for global usage
export const analyticsService = {
  getInstance: UsageAnalyticsService.getInstance
};