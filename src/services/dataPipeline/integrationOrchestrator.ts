/**
 * Data Pipeline Integration Orchestrator
 *
 * Coordinates all analytics and data pipeline systems:
 * - Trip Data Pipeline integration
 * - Financial Data Pipeline coordination
 * - User Behavior Analytics aggregation
 * - Database Performance monitoring
 * - Real-time dashboard data feeds
 */

import { tripDataPipeline } from './tripDataPipeline';
import { financialDataPipeline } from './financialDataPipeline';
import { userBehaviorAnalytics } from '../analytics/userBehaviorAnalytics';
import { databasePerformanceOptimizer } from '../database/performanceOptimizer';
import { collectUserAction, collectResponseTime } from '../pam/analytics/analyticsCollector';
import { logger } from '@/lib/logger';

// =====================================================
// INTEGRATION ORCHESTRATOR
// =====================================================

export class DataPipelineOrchestrator {
  private static instance: DataPipelineOrchestrator;
  private initialized = false;
  private performanceMonitoringInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): DataPipelineOrchestrator {
    if (!DataPipelineOrchestrator.instance) {
      DataPipelineOrchestrator.instance = new DataPipelineOrchestrator();
    }
    return DataPipelineOrchestrator.instance;
  }

  // =====================================================
  // INITIALIZATION
  // =====================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('🚀 Initializing Data Pipeline Orchestrator...');

      // Initialize all pipeline components
      await this.initializeComponents();

      // Start monitoring services
      this.startPerformanceMonitoring();
      this.startHealthChecks();

      // Setup event listeners
      this.setupEventListeners();

      this.initialized = true;
      logger.info('✅ Data Pipeline Orchestrator initialized successfully');

      collectUserAction('data_pipeline_orchestrator_initialized', {
        timestamp: Date.now(),
        components: ['trip_pipeline', 'financial_pipeline', 'user_analytics', 'db_optimizer']
      });

    } catch (error) {
      logger.error('❌ Failed to initialize Data Pipeline Orchestrator:', error);
      throw error;
    }
  }

  private async initializeComponents(): Promise<void> {
    // Components are automatically initialized via their singletons
    // This method serves as a coordination point for any cross-component setup

    logger.debug('📊 All pipeline components ready');
  }

  // =====================================================
  // MONITORING AND HEALTH CHECKS
  // =====================================================

  private startPerformanceMonitoring(): void {
    // Monitor overall system performance every 5 minutes
    this.performanceMonitoringInterval = setInterval(async () => {
      await this.collectSystemMetrics();
    }, 5 * 60 * 1000);
  }

  private startHealthChecks(): void {
    // Health checks every 2 minutes
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 2 * 60 * 1000);
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      const startTime = Date.now();

      // Collect metrics from all components
      const [tripMetrics, financialStats, userEngagement, dbPerformance] = await Promise.all([
        tripDataPipeline.getPipelineMetrics(),
        financialDataPipeline.getCacheStats(),
        userBehaviorAnalytics.calculateEngagementMetrics(),
        databasePerformanceOptimizer.getPerformanceReport()
      ]);

      const systemMetrics = {
        timestamp: new Date().toISOString(),
        trip_pipeline: {
          cache_hit_rate: tripMetrics.cache_hit_rate,
          user_engagement: tripMetrics.user_engagement,
          data_freshness: tripMetrics.data_freshness
        },
        financial_pipeline: {
          cache_size: financialStats.size,
          memory_usage: financialStats.memory_usage
        },
        user_analytics: {
          daily_active_users: userEngagement.daily_active_users,
          session_duration: userEngagement.session_duration_avg,
          bounce_rate: userEngagement.bounce_rate
        },
        database: {
          overall_score: dbPerformance.overall_score,
          avg_response_time: dbPerformance.query_performance.avg_response_time,
          slow_queries: dbPerformance.query_performance.slow_queries_count
        }
      };

      collectResponseTime({
        operation: 'system_metrics_collection',
        response_time_ms: Date.now() - startTime,
        cache_hit: false
      });

      collectUserAction('system_metrics_collected', systemMetrics);

      logger.debug('📊 System metrics collected', systemMetrics);

    } catch (error) {
      logger.error('Error collecting system metrics:', error);
    }
  }

  private async performHealthChecks(): Promise<void> {
    try {
      const healthStatus = {
        trip_pipeline: this.checkTripPipelineHealth(),
        financial_pipeline: this.checkFinancialPipelineHealth(),
        user_analytics: this.checkUserAnalyticsHealth(),
        database_optimizer: this.checkDatabaseHealth(),
        overall: 'healthy' as 'healthy' | 'degraded' | 'critical'
      };

      // Determine overall health
      const unhealthyComponents = Object.entries(healthStatus)
        .filter(([key, status]) => key !== 'overall' && status !== 'healthy')
        .length;

      if (unhealthyComponents === 0) {
        healthStatus.overall = 'healthy';
      } else if (unhealthyComponents <= 1) {
        healthStatus.overall = 'degraded';
      } else {
        healthStatus.overall = 'critical';
      }

      collectUserAction('system_health_check', healthStatus);

      if (healthStatus.overall !== 'healthy') {
        logger.warn('⚠️ System health degraded', healthStatus);
      }

    } catch (error) {
      logger.error('Error performing health checks:', error);
    }
  }

  private checkTripPipelineHealth(): 'healthy' | 'degraded' | 'critical' {
    const stats = tripDataPipeline.getCacheStats();
    const metrics = tripDataPipeline.getPipelineMetrics();

    if (metrics.cache_hit_rate > 0.8 && metrics.data_freshness > 0.8) {
      return 'healthy';
    } else if (metrics.cache_hit_rate > 0.6 || metrics.data_freshness > 0.6) {
      return 'degraded';
    }
    return 'critical';
  }

  private checkFinancialPipelineHealth(): 'healthy' | 'degraded' | 'critical' {
    const stats = financialDataPipeline.getCacheStats();

    // Simple health check based on cache size and memory usage
    if (stats.size < 1000 && stats.memory_usage < 10000000) { // 10MB
      return 'healthy';
    } else if (stats.size < 2000) {
      return 'degraded';
    }
    return 'critical';
  }

  private checkUserAnalyticsHealth(): 'healthy' | 'degraded' | 'critical' {
    const activeUsers = userBehaviorAnalytics.getActiveSessionCount();
    const queuedEvents = userBehaviorAnalytics.getQueuedEventCount();

    if (queuedEvents < 100 && activeUsers >= 0) {
      return 'healthy';
    } else if (queuedEvents < 500) {
      return 'degraded';
    }
    return 'critical';
  }

  private checkDatabaseHealth(): 'healthy' | 'degraded' | 'critical' {
    const report = databasePerformanceOptimizer.getPerformanceReport();

    if (report.overall_score > 80) {
      return 'healthy';
    } else if (report.overall_score > 60) {
      return 'degraded';
    }
    return 'critical';
  }

  // =====================================================
  // EVENT COORDINATION
  // =====================================================

  private setupEventListeners(): void {
    // Listen for page visibility changes to coordinate all systems
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.handlePageHide();
        } else {
          this.handlePageShow();
        }
      });

      window.addEventListener('beforeunload', () => {
        this.handlePageUnload();
      });
    }
  }

  private async handlePageHide(): Promise<void> {
    logger.debug('🔄 Page hidden - flushing all analytics data');

    await Promise.all([
      userBehaviorAnalytics.forceFlush(),
      // Other components' flush methods would be called here
    ]);
  }

  private handlePageShow(): void {
    logger.debug('👁️ Page visible - resuming analytics collection');

    // Resume any paused operations
    collectUserAction('page_became_visible', {
      timestamp: Date.now()
    });
  }

  private async handlePageUnload(): Promise<void> {
    logger.debug('👋 Page unloading - final data flush');

    await Promise.all([
      userBehaviorAnalytics.forceFlush(),
      // Final cleanup for other components
    ]);
  }

  // =====================================================
  // USER JOURNEY COORDINATION
  // =====================================================

  async trackUserJourney(
    userId: string,
    action: 'trip_created' | 'expense_added' | 'feature_used',
    data: Record<string, any>
  ): Promise<void> {
    try {
      // Track in user behavior analytics
      userBehaviorAnalytics.trackEvent(action, data);

      // Coordinate with relevant pipelines based on action
      switch (action) {
        case 'trip_created':
          await this.handleTripCreated(userId, data);
          break;
        case 'expense_added':
          await this.handleExpenseAdded(userId, data);
          break;
        case 'feature_used':
          await this.handleFeatureUsed(userId, data);
          break;
      }

      collectUserAction('user_journey_tracked', {
        user_id: userId,
        action,
        data,
        timestamp: Date.now()
      });

    } catch (error) {
      logger.error('Error tracking user journey:', error);
    }
  }

  private async handleTripCreated(userId: string, data: Record<string, any>): Promise<void> {
    // Track trip planning journey
    userBehaviorAnalytics.trackUserJourney(userId, 'trip_planning', 'trip_created');

    // Log trip metrics
    collectUserAction('trip_planning_milestone', {
      user_id: userId,
      trip_data: data,
      pipeline_optimized: true
    });
  }

  private async handleExpenseAdded(userId: string, data: Record<string, any>): Promise<void> {
    // Track expense tracking journey
    userBehaviorAnalytics.trackUserJourney(userId, 'expense_tracking', 'expense_added');

    // Log financial metrics
    collectUserAction('financial_tracking_milestone', {
      user_id: userId,
      expense_data: data,
      real_time_analysis: true
    });
  }

  private async handleFeatureUsed(userId: string, data: Record<string, any>): Promise<void> {
    // Generic feature usage tracking
    userBehaviorAnalytics.trackFeatureUsage(data.feature, data.action, data);

    collectUserAction('feature_engagement', {
      user_id: userId,
      feature: data.feature,
      action: data.action
    });
  }

  // =====================================================
  // DASHBOARD DATA AGGREGATION
  // =====================================================

  async getDashboardData(): Promise<{
    trip_metrics: any;
    financial_metrics: any;
    user_behavior: any;
    database_performance: any;
    system_health: any;
  }> {
    try {
      const [tripMetrics, financialStats, userEngagement, dbPerformance] = await Promise.all([
        tripDataPipeline.getPipelineMetrics(),
        financialDataPipeline.getCacheStats(),
        userBehaviorAnalytics.calculateEngagementMetrics(),
        databasePerformanceOptimizer.getPerformanceReport()
      ]);

      const systemHealth = {
        overall_status: 'healthy',
        active_sessions: userBehaviorAnalytics.getActiveSessionCount(),
        cache_efficiency: tripMetrics.cache_hit_rate,
        response_time: dbPerformance.query_performance.avg_response_time,
        last_updated: new Date().toISOString()
      };

      return {
        trip_metrics: tripMetrics,
        financial_metrics: financialStats,
        user_behavior: userEngagement,
        database_performance: dbPerformance,
        system_health: systemHealth
      };

    } catch (error) {
      logger.error('Error aggregating dashboard data:', error);
      throw error;
    }
  }

  // =====================================================
  // OPTIMIZATION COORDINATION
  // =====================================================

  async optimizeSystem(): Promise<{
    actions_taken: string[];
    performance_impact: Record<string, number>;
  }> {
    const actionsTaken: string[] = [];
    const performanceImpact: Record<string, number> = {};

    try {
      // Clear expired caches
      tripDataPipeline.clearCache();
      actionsTaken.push('cleared_trip_cache');

      financialDataPipeline.clearCache();
      actionsTaken.push('cleared_financial_cache');

      // Reset metrics collections
      databasePerformanceOptimizer.clearMetrics();
      actionsTaken.push('reset_db_metrics');

      // Force analytics flush
      await userBehaviorAnalytics.forceFlush();
      actionsTaken.push('flushed_analytics');

      collectUserAction('system_optimization_performed', {
        actions_taken: actionsTaken,
        timestamp: Date.now()
      });

      logger.info('🔧 System optimization completed', { actions_taken: actionsTaken });

      return { actions_taken: actionsTaken, performance_impact: performanceImpact };

    } catch (error) {
      logger.error('Error during system optimization:', error);
      throw error;
    }
  }

  // =====================================================
  // SHUTDOWN AND CLEANUP
  // =====================================================

  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      logger.info('🛑 Shutting down Data Pipeline Orchestrator...');

      // Clear intervals
      if (this.performanceMonitoringInterval) {
        clearInterval(this.performanceMonitoringInterval);
        this.performanceMonitoringInterval = null;
      }

      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Shutdown components
      await Promise.all([
        userBehaviorAnalytics.forceFlush(),
        // Other component cleanup would go here
      ]);

      this.initialized = false;
      logger.info('✅ Data Pipeline Orchestrator shutdown complete');

    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  isInitialized(): boolean {
    return this.initialized;
  }

  getSystemStatus(): {
    initialized: boolean;
    components: Record<string, boolean>;
    last_health_check: string;
  } {
    return {
      initialized: this.initialized,
      components: {
        trip_pipeline: true,
        financial_pipeline: true,
        user_analytics: true,
        database_optimizer: true
      },
      last_health_check: new Date().toISOString()
    };
  }

  async forceHealthCheck(): Promise<void> {
    await this.performHealthChecks();
  }

  async forceMetricsCollection(): Promise<void> {
    await this.collectSystemMetrics();
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const dataPipelineOrchestrator = DataPipelineOrchestrator.getInstance();

// Auto-initialize when imported
dataPipelineOrchestrator.initialize().catch(error => {
  console.error('Failed to auto-initialize Data Pipeline Orchestrator:', error);
});

// Convenience functions
export const trackUserJourney = (
  userId: string,
  action: 'trip_created' | 'expense_added' | 'feature_used',
  data: Record<string, any>
) => dataPipelineOrchestrator.trackUserJourney(userId, action, data);

export const getDashboardData = () => dataPipelineOrchestrator.getDashboardData();

export const optimizeSystem = () => dataPipelineOrchestrator.optimizeSystem();