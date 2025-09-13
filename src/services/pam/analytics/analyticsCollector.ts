/**
 * PAM Analytics Data Collection Service
 * 
 * Centralized service for collecting and processing PAM analytics data.
 * Handles data validation, enrichment, and batch processing for optimal performance.
 */

import { UsageAnalyticsService } from './usageAnalytics';
import type { 
  ToolUsageEvent, 
  ResponseTimeEvent, 
  ErrorEvent, 
  UserFeedbackEvent, 
  TokenUsageEvent 
} from './usageAnalytics';
import { logger } from '@/lib/logger';

// =====================================================
// ANALYTICS COLLECTOR SERVICE
// =====================================================

export class AnalyticsCollector {
  private static instance: AnalyticsCollector;
  private analyticsService: UsageAnalyticsService | null = null;
  private userId: string | null = null;
  private isEnabled: boolean = true;
  private dataBuffer: Array<{ type: string; data: any; timestamp: Date }> = [];
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeCollector();
  }

  static getInstance(): AnalyticsCollector {
    if (!AnalyticsCollector.instance) {
      AnalyticsCollector.instance = new AnalyticsCollector();
    }
    return AnalyticsCollector.instance;
  }

  private initializeCollector(): void {
    // Start processing buffer every 10 seconds
    this.processingInterval = setInterval(() => {
      this.processBuffer();
    }, 10000);

    // Listen for page visibility changes to flush data
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.processBuffer();
        }
      });

      // Flush data before page unload
      window.addEventListener('beforeunload', () => {
        this.processBuffer();
      });
    }
  }

  /**
   * Initialize collector with user context
   */
  initialize(userId: string, sessionId?: string): void {
    this.userId = userId;
    this.analyticsService = UsageAnalyticsService.getInstance(userId, sessionId);
    
    logger.debug('📊 Analytics collector initialized', { userId, sessionId });
  }

  /**
   * Enable/disable analytics collection
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    logger.debug(`📊 Analytics collection ${enabled ? 'enabled' : 'disabled'}`);
  }

  // =====================================================
  // DATA COLLECTION METHODS
  // =====================================================

  /**
   * Collect tool usage data with automatic enhancement
   */
  collectToolUsage(data: Partial<ToolUsageEvent> & { tool_name: string }): void {
    if (!this.isEnabled || !this.userId) return;

    const enhancedData: ToolUsageEvent = {
      tool_name: data.tool_name,
      tool_category: data.tool_category || this.inferToolCategory(data.tool_name),
      usage_count: data.usage_count || 1,
      success_rate: data.success_rate || 1.0,
      average_response_time: data.average_response_time || 0,
      parameters_used: data.parameters_used || [],
      context_length: data.context_length || 0,
      ...this.addTimingData()
    };

    this.bufferData('tool_usage', enhancedData);
  }

  /**
   * Collect response time data with performance classification
   */
  collectResponseTime(data: Partial<ResponseTimeEvent> & { operation: string; response_time_ms: number }): void {
    if (!this.isEnabled || !this.userId) return;

    const enhancedData: ResponseTimeEvent = {
      operation: data.operation,
      response_time_ms: data.response_time_ms,
      token_count: data.token_count || 0,
      cache_hit: data.cache_hit || false,
      network_latency: data.network_latency,
      processing_time: data.processing_time,
      ...this.addPerformanceMetrics(data.response_time_ms)
    };

    this.bufferData('response_time', enhancedData);
  }

  /**
   * Collect error data with automatic classification and context
   */
  collectError(data: Partial<ErrorEvent> & { error_type: ErrorEvent['error_type']; error_message: string }): void {
    if (!this.isEnabled || !this.userId) return;

    const enhancedData: ErrorEvent = {
      error_type: data.error_type,
      error_message: data.error_message,
      error_code: data.error_code,
      stack_trace: data.stack_trace,
      context: {
        operation: data.context?.operation || 'unknown',
        user_input: data.context?.user_input,
        system_state: data.context?.system_state,
        ...this.captureErrorContext()
      },
      recovery_attempted: data.recovery_attempted || false,
      recovery_successful: data.recovery_successful,
      ...this.addErrorMetadata(data)
    };

    this.bufferData('error', enhancedData);

    // Log critical errors immediately
    if (['system_error', 'api_error'].includes(data.error_type)) {
      logger.error('Critical error collected', enhancedData);
    }
  }

  /**
   * Collect user feedback with sentiment analysis
   */
  collectUserFeedback(data: Partial<UserFeedbackEvent> & { 
    feedback_type: UserFeedbackEvent['feedback_type']; 
    message_id: string 
  }): void {
    if (!this.isEnabled || !this.userId) return;

    const enhancedData: UserFeedbackEvent = {
      feedback_type: data.feedback_type,
      feedback_value: data.feedback_value || (data.feedback_type === 'thumbs_up' ? 1 : 0),
      message_id: data.message_id,
      response_quality: data.response_quality || this.inferQualityFromFeedback(data),
      response_relevance: data.response_relevance || this.inferRelevanceFromFeedback(data),
      response_helpfulness: data.response_helpfulness || this.inferHelpfulnessFromFeedback(data),
      additional_comments: data.additional_comments,
      ...this.addFeedbackMetadata(data)
    };

    this.bufferData('user_feedback', enhancedData);
  }

  /**
   * Collect token usage data with cost analysis
   */
  collectTokenUsage(data: Partial<TokenUsageEvent> & { operation: string; total_tokens: number }): void {
    if (!this.isEnabled || !this.userId) return;

    const enhancedData: TokenUsageEvent = {
      operation: data.operation,
      input_tokens: data.input_tokens || 0,
      output_tokens: data.output_tokens || 0,
      total_tokens: data.total_tokens,
      estimated_cost: data.estimated_cost || this.calculateTokenCost(data.total_tokens),
      model: data.model || 'claude-3.5-sonnet',
      conversation_length: data.conversation_length || 0,
      context_optimization_applied: data.context_optimization_applied || false,
      ...this.addCostAnalysis(data)
    };

    this.bufferData('token_usage', enhancedData);
  }

  /**
   * Collect cache performance data
   */
  collectCacheEvent(type: 'hit' | 'miss', data: {
    operation: string;
    cache_key?: string;
    response_time_saved?: number;
    cache_size?: number;
  }): void {
    if (!this.isEnabled || !this.userId) return;

    this.bufferData(`cache_${type}`, {
      ...data,
      cache_efficiency: type === 'hit' ? 1 : 0,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Collect user action data
   */
  collectUserAction(action: string, data?: Record<string, any>): void {
    if (!this.isEnabled || !this.userId) return;

    this.bufferData('user_action', {
      action,
      ...data,
      page_url: window.location.pathname,
      timestamp: new Date().toISOString(),
      session_context: this.getSessionContext()
    });
  }

  // =====================================================
  // DATA ENHANCEMENT HELPERS
  // =====================================================

  private inferToolCategory(toolName: string): ToolUsageEvent['tool_category'] {
    const categoryMap: Record<string, ToolUsageEvent['tool_category']> = {
      'expense-tracker': 'financial',
      'budget-planner': 'financial',
      'income-tracker': 'financial',
      'trip-planner': 'travel',
      'route-optimizer': 'travel',
      'weather-check': 'travel',
      'chat': 'general',
      'search': 'general',
      'help': 'general'
    };

    return categoryMap[toolName.toLowerCase()] || 'general';
  }

  private addTimingData() {
    return {
      collected_at: new Date().toISOString(),
      client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      client_timestamp: Date.now()
    };
  }

  private addPerformanceMetrics(responseTime: number) {
    return {
      performance_grade: this.gradePerformance(responseTime),
      is_slow: responseTime > 3000,
      percentile_bucket: this.getPercentileBucket(responseTime)
    };
  }

  private gradePerformance(responseTime: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (responseTime < 1000) return 'excellent';
    if (responseTime < 3000) return 'good';
    if (responseTime < 5000) return 'fair';
    return 'poor';
  }

  private getPercentileBucket(responseTime: number): string {
    if (responseTime < 500) return 'p0-p25';
    if (responseTime < 1500) return 'p25-p50';
    if (responseTime < 3000) return 'p50-p75';
    if (responseTime < 5000) return 'p75-p90';
    if (responseTime < 10000) return 'p90-p95';
    return 'p95-p100';
  }

  private captureErrorContext() {
    return {
      url: window.location.href,
      user_agent: navigator.userAgent,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      connection_type: this.getConnectionType(),
      memory_usage: this.getMemoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  private addErrorMetadata(data: Partial<ErrorEvent>) {
    return {
      error_severity: this.calculateErrorSeverity(data),
      user_impact: this.calculateUserImpact(data),
      recovery_time: data.recovery_attempted ? Date.now() : null
    };
  }

  private calculateErrorSeverity(error: Partial<ErrorEvent>): 'low' | 'medium' | 'high' | 'critical' {
    if (error.error_type === 'system_error' && !error.recovery_attempted) return 'critical';
    if (error.error_type === 'api_error' && error.error_message?.includes('authentication')) return 'high';
    if (error.recovery_attempted && error.recovery_successful) return 'low';
    return 'medium';
  }

  private calculateUserImpact(error: Partial<ErrorEvent>): 'none' | 'minimal' | 'moderate' | 'severe' {
    if (error.recovery_successful) return 'minimal';
    if (error.error_type === 'validation_error') return 'minimal';
    if (error.error_type === 'network_error') return 'moderate';
    if (error.error_type === 'system_error') return 'severe';
    return 'moderate';
  }

  private inferQualityFromFeedback(data: Partial<UserFeedbackEvent>): number {
    if (data.feedback_type === 'thumbs_up') return 4;
    if (data.feedback_type === 'thumbs_down') return 2;
    if (data.feedback_type === 'rating' && typeof data.feedback_value === 'number') {
      return data.feedback_value;
    }
    return 3; // Neutral default
  }

  private inferRelevanceFromFeedback(data: Partial<UserFeedbackEvent>): number {
    // Similar logic to quality, but focused on relevance
    return this.inferQualityFromFeedback(data);
  }

  private inferHelpfulnessFromFeedback(data: Partial<UserFeedbackEvent>): number {
    // Similar logic to quality, but focused on helpfulness
    return this.inferQualityFromFeedback(data);
  }

  private addFeedbackMetadata(data: Partial<UserFeedbackEvent>) {
    return {
      feedback_context: {
        page_url: window.location.pathname,
        device_type: this.getDeviceType(),
        session_duration: this.getSessionDuration()
      },
      sentiment_score: this.calculateSentimentScore(data)
    };
  }

  private calculateSentimentScore(data: Partial<UserFeedbackEvent>): number {
    if (data.feedback_type === 'thumbs_up') return 0.8;
    if (data.feedback_type === 'thumbs_down') return -0.8;
    if (data.feedback_type === 'rating' && typeof data.feedback_value === 'number') {
      return (data.feedback_value - 3) / 2; // Convert 1-5 scale to -1 to 1
    }
    return 0;
  }

  private calculateTokenCost(tokens: number): number {
    // Claude 3.5 Sonnet pricing (approximate)
    const INPUT_COST_PER_1M = 3.00; // $3 per 1M input tokens
    const OUTPUT_COST_PER_1M = 15.00; // $15 per 1M output tokens
    
    // Assume 70% input, 30% output for cost calculation
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    
    return (inputTokens / 1000000 * INPUT_COST_PER_1M) + 
           (outputTokens / 1000000 * OUTPUT_COST_PER_1M);
  }

  private addCostAnalysis(data: Partial<TokenUsageEvent>) {
    const costPerToken = this.calculateTokenCost(1);
    
    return {
      cost_efficiency: 1 / (data.total_tokens || 1), // Inverse relationship
      optimization_potential: this.calculateOptimizationPotential(data.total_tokens || 0),
      budget_impact: this.calculateBudgetImpact(data.estimated_cost || 0)
    };
  }

  private calculateOptimizationPotential(tokens: number): number {
    if (tokens < 1000) return 0.1;
    if (tokens < 5000) return 0.3;
    if (tokens < 10000) return 0.6;
    return 0.9;
  }

  private calculateBudgetImpact(cost: number): 'low' | 'medium' | 'high' | 'critical' {
    if (cost < 0.01) return 'low';
    if (cost < 0.05) return 'medium';
    if (cost < 0.10) return 'high';
    return 'critical';
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getConnectionType(): string {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    return connection?.effectiveType || 'unknown';
  }

  private getMemoryUsage(): Record<string, number> | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  private getSessionDuration(): number {
    // This would need to be tracked from session start
    return Date.now() - (performance.timeOrigin || 0);
  }

  private getSessionContext() {
    return {
      session_duration: this.getSessionDuration(),
      page_views: this.dataBuffer.filter(d => d.type === 'user_action').length,
      interactions: this.dataBuffer.length,
      device_type: this.getDeviceType()
    };
  }

  // =====================================================
  // BUFFER MANAGEMENT
  // =====================================================

  private bufferData(type: string, data: any): void {
    this.dataBuffer.push({
      type,
      data,
      timestamp: new Date()
    });

    // Process buffer if it gets too large
    if (this.dataBuffer.length > 50) {
      this.processBuffer();
    }
  }

  private async processBuffer(): Promise<void> {
    if (!this.analyticsService || this.dataBuffer.length === 0) return;

    const batch = [...this.dataBuffer];
    this.dataBuffer = [];

    try {
      for (const item of batch) {
        switch (item.type) {
          case 'tool_usage':
            await this.analyticsService.trackToolUsage(item.data);
            break;
          case 'response_time':
            await this.analyticsService.trackResponseTime(item.data);
            break;
          case 'error':
            await this.analyticsService.trackError(item.data);
            break;
          case 'user_feedback':
            await this.analyticsService.trackUserFeedback(item.data);
            break;
          case 'token_usage':
            await this.analyticsService.trackTokenUsage(item.data);
            break;
          case 'user_action':
            await this.analyticsService.trackUserAction(item.data.action, item.data);
            break;
          case 'cache_hit':
          case 'cache_miss':
            await this.analyticsService.trackUserAction(`cache_${item.type.split('_')[1]}`, item.data);
            break;
        }
      }

      logger.debug(`📊 Processed ${batch.length} analytics events`);
    } catch (error) {
      logger.error('Failed to process analytics buffer', error);
      // Re-queue failed items (with limit)
      if (this.dataBuffer.length < 100) {
        this.dataBuffer.unshift(...batch);
      }
    }
  }

  /**
   * Force immediate processing of buffer
   */
  async flush(): Promise<void> {
    await this.processBuffer();
  }

  /**
   * Cleanup and dispose resources
   */
  dispose(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    // Process any remaining data
    this.processBuffer();
    
    this.analyticsService?.dispose();
  }
}

// =====================================================
// CONVENIENCE FUNCTIONS
// =====================================================

const collector = AnalyticsCollector.getInstance();

export const collectToolUsage = (data: Parameters<AnalyticsCollector['collectToolUsage']>[0]) => 
  collector.collectToolUsage(data);

export const collectResponseTime = (data: Parameters<AnalyticsCollector['collectResponseTime']>[0]) => 
  collector.collectResponseTime(data);

export const collectError = (data: Parameters<AnalyticsCollector['collectError']>[0]) => 
  collector.collectError(data);

export const collectUserFeedback = (data: Parameters<AnalyticsCollector['collectUserFeedback']>[0]) => 
  collector.collectUserFeedback(data);

export const collectTokenUsage = (data: Parameters<AnalyticsCollector['collectTokenUsage']>[0]) => 
  collector.collectTokenUsage(data);

export const collectCacheEvent = (type: 'hit' | 'miss', data: Parameters<AnalyticsCollector['collectCacheEvent']>[1]) => 
  collector.collectCacheEvent(type, data);

export const collectUserAction = (action: string, data?: Record<string, any>) => 
  collector.collectUserAction(action, data);

// =====================================================
// REACT HOOK FOR EASY COLLECTION
// =====================================================

export function useAnalyticsCollector(userId?: string) {
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    if (userId) {
      collector.initialize(userId);
      setIsInitialized(true);
    }

    return () => {
      collector.flush();
    };
  }, [userId]);

  return {
    isInitialized,
    collectToolUsage,
    collectResponseTime,
    collectError,
    collectUserFeedback,
    collectTokenUsage,
    collectCacheEvent,
    collectUserAction,
    flush: () => collector.flush(),
    setEnabled: (enabled: boolean) => collector.setEnabled(enabled)
  };
}

export default AnalyticsCollector;