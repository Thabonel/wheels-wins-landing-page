/**
 * PAM Analytics System - Main Export
 * 
 * Complete analytics solution for PAM with usage tracking, performance monitoring,
 * error reporting, user feedback collection, and cost analysis.
 */

// Core Services
export { UsageAnalyticsService, analyticsService } from './usageAnalytics';
export { AnalyticsCollector } from './analyticsCollector';

// React Hooks
export { useAnalytics } from './usageAnalytics';
export { useAnalyticsCollector } from './analyticsCollector';

// Convenience Functions
export {
  collectToolUsage,
  collectResponseTime,
  collectError,
  collectUserFeedback,
  collectTokenUsage,
  collectCacheEvent,
  collectUserAction
} from './analyticsCollector';

// Types
export type {
  AnalyticsEvent,
  AnalyticsEventType,
  ToolUsageEvent,
  ResponseTimeEvent,
  ErrorEvent,
  UserFeedbackEvent,
  TokenUsageEvent,
  AnalyticsMetrics
} from './usageAnalytics';

// Dashboard Component
export { default as AnalyticsDashboard } from '@/components/pam/analytics/AnalyticsDashboard';

// =====================================================
// CONVENIENCE WRAPPER FOR EASY INTEGRATION
// =====================================================

import { AnalyticsCollector } from './analyticsCollector';
import { UsageAnalyticsService } from './usageAnalytics';

export class PAMAnalytics {
  private static instance: PAMAnalytics;
  private collector: AnalyticsCollector;
  private service: UsageAnalyticsService;
  private userId: string;
  private isInitialized: boolean = false;

  private constructor() {
    this.collector = AnalyticsCollector.getInstance();
  }

  static getInstance(): PAMAnalytics {
    if (!PAMAnalytics.instance) {
      PAMAnalytics.instance = new PAMAnalytics();
    }
    return PAMAnalytics.instance;
  }

  /**
   * Initialize analytics for a user
   */
  initialize(userId: string, sessionId?: string): void {
    this.userId = userId;
    this.collector.initialize(userId, sessionId);
    this.service = UsageAnalyticsService.getInstance(userId, sessionId);
    this.isInitialized = true;
  }

  /**
   * Enable or disable analytics collection
   */
  setEnabled(enabled: boolean): void {
    this.collector.setEnabled(enabled);
  }

  /**
   * Track tool usage with enhanced data
   */
  trackTool(toolName: string, options?: {
    responseTime?: number;
    parameters?: string[];
    success?: boolean;
    contextLength?: number;
  }): void {
    if (!this.isInitialized) return;

    this.collector.collectToolUsage({
      tool_name: toolName,
      average_response_time: options?.responseTime || 0,
      parameters_used: options?.parameters || [],
      success_rate: options?.success !== false ? 1.0 : 0.0,
      context_length: options?.contextLength || 0
    });
  }

  /**
   * Track API performance
   */
  trackPerformance(operation: string, responseTime: number, options?: {
    tokenCount?: number;
    cacheHit?: boolean;
    networkLatency?: number;
  }): void {
    if (!this.isInitialized) return;

    this.collector.collectResponseTime({
      operation,
      response_time_ms: responseTime,
      token_count: options?.tokenCount || 0,
      cache_hit: options?.cacheHit || false,
      network_latency: options?.networkLatency
    });
  }

  /**
   * Track errors with context
   */
  trackError(error: Error, context?: {
    operation?: string;
    userInput?: string;
    recoveryAttempted?: boolean;
    recoverySuccessful?: boolean;
  }): void {
    if (!this.isInitialized) return;

    this.collector.collectError({
      error_type: this.classifyError(error),
      error_message: error.message,
      stack_trace: error.stack,
      context: {
        operation: context?.operation || 'unknown',
        user_input: context?.userInput,
        system_state: {
          timestamp: new Date().toISOString(),
          url: window.location.href
        }
      },
      recovery_attempted: context?.recoveryAttempted || false,
      recovery_successful: context?.recoverySuccessful
    });
  }

  /**
   * Track user feedback
   */
  trackFeedback(messageId: string, type: 'thumbs_up' | 'thumbs_down' | 'rating', value?: number, comment?: string): void {
    if (!this.isInitialized) return;

    this.collector.collectUserFeedback({
      feedback_type: type,
      feedback_value: value || (type === 'thumbs_up' ? 1 : 0),
      message_id: messageId,
      response_quality: this.inferQuality(type, value),
      response_relevance: this.inferQuality(type, value),
      response_helpfulness: this.inferQuality(type, value),
      additional_comments: comment
    });
  }

  /**
   * Track token usage and costs
   */
  trackTokens(operation: string, tokens: {
    input?: number;
    output?: number;
    total: number;
  }, options?: {
    model?: string;
    conversationLength?: number;
    optimized?: boolean;
  }): void {
    if (!this.isInitialized) return;

    const estimatedCost = this.calculateCost(tokens.total);

    this.collector.collectTokenUsage({
      operation,
      input_tokens: tokens.input || 0,
      output_tokens: tokens.output || 0,
      total_tokens: tokens.total,
      estimated_cost: estimatedCost,
      model: options?.model || 'claude-3.5-sonnet',
      conversation_length: options?.conversationLength || 0,
      context_optimization_applied: options?.optimized || false
    });
  }

  /**
   * Track cache performance
   */
  trackCache(operation: string, hit: boolean, options?: {
    timeSaved?: number;
    cacheSize?: number;
  }): void {
    if (!this.isInitialized) return;

    this.collector.collectCacheEvent(hit ? 'hit' : 'miss', {
      operation,
      response_time_saved: options?.timeSaved,
      cache_size: options?.cacheSize
    });
  }

  /**
   * Track user actions
   */
  trackAction(action: string, data?: Record<string, any>): void {
    if (!this.isInitialized) return;

    this.collector.collectUserAction(action, data);
  }

  /**
   * Get analytics metrics
   */
  async getMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h') {
    if (!this.isInitialized) return null;
    return await this.service.getAnalyticsMetrics(timeRange);
  }

  /**
   * Generate performance report
   */
  async generateReport(): Promise<string> {
    if (!this.isInitialized) return 'Analytics not initialized';
    
    const metrics = await this.service.getAnalyticsMetrics('24h');
    if (!metrics) return 'No data available';

    return `
# PAM Analytics Report (24h)

## Usage Summary
- Sessions: ${metrics.usage.totalSessions}
- Events: ${metrics.usage.totalEvents}
- Top Tool: ${metrics.usage.mostUsedTools[0]?.tool || 'None'}

## Performance
- Avg Response Time: ${metrics.performance.averageResponseTime.toFixed(0)}ms
- Cache Hit Rate: ${(metrics.performance.cacheHitRate * 100).toFixed(1)}%
- Error Rate: ${(metrics.performance.errorRate * 100).toFixed(1)}%

## User Satisfaction
- Thumbs Up Rate: ${(metrics.satisfaction.thumbsUpRate * 100).toFixed(1)}%
- Average Rating: ${metrics.satisfaction.averageRating.toFixed(1)}/5
- NPS Score: ${metrics.satisfaction.npsScore.toFixed(0)}

## Cost Analysis
- Total Tokens: ${metrics.costs.totalTokensUsed.toLocaleString()}
- Estimated Cost: $${metrics.costs.estimatedCost.toFixed(4)}
- Cost per Session: $${metrics.costs.costPerSession.toFixed(4)}

Generated: ${new Date().toLocaleString()}
    `.trim();
  }

  /**
   * Flush pending data
   */
  async flush(): Promise<void> {
    await this.collector.flush();
  }

  /**
   * End session and cleanup
   */
  async dispose(): Promise<void> {
    if (this.service) {
      await this.service.endSession();
    }
    this.collector.dispose();
    this.isInitialized = false;
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private classifyError(error: Error): 'api_error' | 'network_error' | 'validation_error' | 'system_error' {
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'network_error';
    }
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return 'validation_error';
    }
    if (error.message.includes('API') || error.message.includes('401') || error.message.includes('403')) {
      return 'api_error';
    }
    return 'system_error';
  }

  private inferQuality(type: string, value?: number): number {
    if (type === 'thumbs_up') return 4;
    if (type === 'thumbs_down') return 2;
    if (type === 'rating' && value) return value;
    return 3;
  }

  private calculateCost(tokens: number): number {
    // Claude 3.5 Sonnet pricing (approximate)
    const INPUT_COST_PER_1M = 3.00;
    const OUTPUT_COST_PER_1M = 15.00;
    
    // Assume 70% input, 30% output
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    
    return (inputTokens / 1000000 * INPUT_COST_PER_1M) + 
           (outputTokens / 1000000 * OUTPUT_COST_PER_1M);
  }
}

// =====================================================
// GLOBAL ANALYTICS INSTANCE
// =====================================================

export const pamAnalytics = PAMAnalytics.getInstance();

// =====================================================
// REACT HOOK FOR COMPLETE ANALYTICS
// =====================================================

export function usePAMAnalytics(userId?: string) {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [metrics, setMetrics] = React.useState<any>(null);

  React.useEffect(() => {
    if (userId) {
      pamAnalytics.initialize(userId);
      setIsInitialized(true);
    }

    return () => {
      if (isInitialized) {
        pamAnalytics.dispose();
      }
    };
  }, [userId]);

  const loadMetrics = async (timeRange?: '1h' | '24h' | '7d' | '30d') => {
    const data = await pamAnalytics.getMetrics(timeRange);
    setMetrics(data);
    return data;
  };

  return {
    isInitialized,
    metrics,
    loadMetrics,
    trackTool: pamAnalytics.trackTool.bind(pamAnalytics),
    trackPerformance: pamAnalytics.trackPerformance.bind(pamAnalytics),
    trackError: pamAnalytics.trackError.bind(pamAnalytics),
    trackFeedback: pamAnalytics.trackFeedback.bind(pamAnalytics),
    trackTokens: pamAnalytics.trackTokens.bind(pamAnalytics),
    trackCache: pamAnalytics.trackCache.bind(pamAnalytics),
    trackAction: pamAnalytics.trackAction.bind(pamAnalytics),
    generateReport: pamAnalytics.generateReport.bind(pamAnalytics),
    setEnabled: pamAnalytics.setEnabled.bind(pamAnalytics)
  };
}

export default PAMAnalytics;