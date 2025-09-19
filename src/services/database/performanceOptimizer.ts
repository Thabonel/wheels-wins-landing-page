/**
 * Database Performance Optimization Service
 *
 * Provides intelligent database performance monitoring and optimization:
 * - Query performance analysis and optimization
 * - Connection pool management and monitoring
 * - Automated indexing suggestions
 * - Cache layer coordination
 * - Real-time performance metrics
 */

import { supabase } from '@/integrations/supabase/client';
import { collectResponseTime, collectUserAction } from '@/services/pam/analytics/analyticsCollector';
import { logger } from '@/lib/logger';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface QueryPerformanceMetric {
  query_id: string;
  query_pattern: string;
  table_name: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  execution_time: number;
  row_count: number;
  cache_hit: boolean;
  index_used: boolean;
  full_scan: boolean;
  timestamp: string;
  user_id?: string;
  optimization_score: number;
}

interface IndexSuggestion {
  table_name: string;
  column_names: string[];
  index_type: 'btree' | 'gin' | 'gist' | 'hash';
  estimated_performance_gain: number;
  query_patterns_affected: string[];
  implementation_cost: 'low' | 'medium' | 'high';
  priority: number;
}

interface ConnectionPoolStats {
  active_connections: number;
  idle_connections: number;
  waiting_count: number;
  max_connections: number;
  connection_errors: number;
  avg_query_time: number;
  peak_usage_time: string;
  efficiency_score: number;
}

interface DatabaseOptimizationReport {
  overall_score: number;
  query_performance: {
    avg_response_time: number;
    slow_queries_count: number;
    cache_hit_rate: number;
    index_usage_rate: number;
  };
  recommendations: Array<{
    category: 'indexing' | 'query_optimization' | 'caching' | 'connection_management';
    priority: 'high' | 'medium' | 'low';
    description: string;
    estimated_impact: string;
    implementation_effort: string;
  }>;
  index_suggestions: IndexSuggestion[];
  connection_health: ConnectionPoolStats;
  trending_issues: string[];
}

interface QueryOptimizationRule {
  rule_id: string;
  pattern: RegExp;
  category: 'n_plus_one' | 'missing_index' | 'inefficient_join' | 'excessive_data';
  description: string;
  suggestion: string;
  auto_fixable: boolean;
}

// =====================================================
// DATABASE PERFORMANCE OPTIMIZER
// =====================================================

export class DatabasePerformanceOptimizer {
  private static instance: DatabasePerformanceOptimizer;
  private queryMetrics: QueryPerformanceMetric[] = [];
  private connectionStats: ConnectionPoolStats = {
    active_connections: 0,
    idle_connections: 0,
    waiting_count: 0,
    max_connections: 20,
    connection_errors: 0,
    avg_query_time: 0,
    peak_usage_time: '',
    efficiency_score: 0
  };

  private optimizationRules: QueryOptimizationRule[] = [];
  private indexSuggestions: IndexSuggestion[] = [];

  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private readonly METRICS_RETENTION_HOURS = 24;
  private readonly ANALYSIS_INTERVAL = 300000; // 5 minutes

  private constructor() {
    this.initializeOptimizer();
  }

  static getInstance(): DatabasePerformanceOptimizer {
    if (!DatabasePerformanceOptimizer.instance) {
      DatabasePerformanceOptimizer.instance = new DatabasePerformanceOptimizer();
    }
    return DatabasePerformanceOptimizer.instance;
  }

  private initializeOptimizer(): void {
    this.setupOptimizationRules();
    this.startPerformanceMonitoring();
    this.setupQueryInterceptor();

    logger.debug('🚀 Database Performance Optimizer initialized');
  }

  // =====================================================
  // QUERY PERFORMANCE MONITORING
  // =====================================================

  async trackQuery(
    queryPattern: string,
    tableName: string,
    operation: QueryPerformanceMetric['operation'],
    startTime: number,
    result: any,
    userId?: string
  ): Promise<void> {
    const executionTime = Date.now() - startTime;
    const rowCount = Array.isArray(result?.data) ? result.data.length : result?.count || 0;

    const metric: QueryPerformanceMetric = {
      query_id: this.generateQueryId(queryPattern, tableName),
      query_pattern: queryPattern,
      table_name: tableName,
      operation,
      execution_time: executionTime,
      row_count: rowCount,
      cache_hit: false, // Would be determined by cache layer
      index_used: this.determineIndexUsage(queryPattern, executionTime),
      full_scan: this.detectFullScan(queryPattern, executionTime, rowCount),
      timestamp: new Date().toISOString(),
      user_id: userId,
      optimization_score: this.calculateOptimizationScore(executionTime, rowCount)
    };

    this.queryMetrics.push(metric);
    this.cleanupOldMetrics();

    // Track slow queries
    if (executionTime > this.SLOW_QUERY_THRESHOLD) {
      this.handleSlowQuery(metric);
    }

    // Send to analytics
    collectResponseTime({
      operation: `db_${operation.toLowerCase()}_${tableName}`,
      response_time_ms: executionTime,
      cache_hit: metric.cache_hit
    });

    // Check for optimization opportunities
    await this.analyzeQueryForOptimization(metric);
  }

  private generateQueryId(pattern: string, table: string): string {
    const hash = this.simpleHash(pattern + table);
    return `query_${table}_${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private determineIndexUsage(queryPattern: string, executionTime: number): boolean {
    // Simple heuristic: queries with WHERE clauses that execute quickly likely use indexes
    const hasWhereClause = queryPattern.toLowerCase().includes('where');
    const hasOrderBy = queryPattern.toLowerCase().includes('order by');
    const isFast = executionTime < 100; // 100ms

    return hasWhereClause && isFast || hasOrderBy && isFast;
  }

  private detectFullScan(queryPattern: string, executionTime: number, rowCount: number): boolean {
    // Heuristic: slow queries with many rows might indicate full table scans
    const hasNoWhere = !queryPattern.toLowerCase().includes('where');
    const isSlowWithManyRows = executionTime > 500 && rowCount > 1000;

    return hasNoWhere || isSlowWithManyRows;
  }

  private calculateOptimizationScore(executionTime: number, rowCount: number): number {
    let score = 100;

    // Penalize slow execution
    if (executionTime > 1000) score -= 30;
    else if (executionTime > 500) score -= 15;
    else if (executionTime > 200) score -= 5;

    // Penalize inefficient data retrieval
    if (rowCount > 10000) score -= 20;
    else if (rowCount > 5000) score -= 10;
    else if (rowCount > 1000) score -= 5;

    return Math.max(score, 0);
  }

  // =====================================================
  // QUERY OPTIMIZATION ANALYSIS
  // =====================================================

  private async analyzeQueryForOptimization(metric: QueryPerformanceMetric): Promise<void> {
    for (const rule of this.optimizationRules) {
      if (rule.pattern.test(metric.query_pattern)) {
        await this.handleOptimizationOpportunity(metric, rule);
      }
    }
  }

  private async handleOptimizationOpportunity(
    metric: QueryPerformanceMetric,
    rule: QueryOptimizationRule
  ): Promise<void> {
    collectUserAction('database_optimization_opportunity', {
      query_id: metric.query_id,
      table: metric.table_name,
      rule_category: rule.category,
      execution_time: metric.execution_time,
      auto_fixable: rule.auto_fixable
    });

    // Generate index suggestion if applicable
    if (rule.category === 'missing_index') {
      await this.generateIndexSuggestion(metric);
    }

    logger.debug(`🔍 Optimization opportunity detected: ${rule.description}`, {
      query_id: metric.query_id,
      category: rule.category
    });
  }

  private async generateIndexSuggestion(metric: QueryPerformanceMetric): Promise<void> {
    const suggestion: IndexSuggestion = {
      table_name: metric.table_name,
      column_names: this.extractColumnsFromQuery(metric.query_pattern),
      index_type: 'btree', // Default, could be more sophisticated
      estimated_performance_gain: this.estimatePerformanceGain(metric),
      query_patterns_affected: [metric.query_pattern],
      implementation_cost: this.estimateImplementationCost(metric.table_name),
      priority: this.calculateIndexPriority(metric)
    };

    // Check if suggestion already exists
    const existingSuggestion = this.indexSuggestions.find(
      s => s.table_name === suggestion.table_name &&
           JSON.stringify(s.column_names) === JSON.stringify(suggestion.column_names)
    );

    if (existingSuggestion) {
      existingSuggestion.query_patterns_affected.push(metric.query_pattern);
      existingSuggestion.priority = Math.max(existingSuggestion.priority, suggestion.priority);
    } else {
      this.indexSuggestions.push(suggestion);
    }
  }

  private extractColumnsFromQuery(queryPattern: string): string[] {
    const columns: string[] = [];
    const query = queryPattern.toLowerCase();

    // Extract WHERE clause columns
    const whereMatch = query.match(/where\s+(.+?)(?:\s+order\s+by|\s+group\s+by|\s+limit|$)/);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      // Simple extraction - could be more sophisticated
      const columnMatches = whereClause.match(/(\w+)\s*[=<>]/g);
      if (columnMatches) {
        columns.push(...columnMatches.map(match => match.replace(/\s*[=<>].*/, '')));
      }
    }

    // Extract ORDER BY columns
    const orderMatch = query.match(/order\s+by\s+(.+?)(?:\s+limit|$)/);
    if (orderMatch) {
      const orderClause = orderMatch[1];
      const orderColumns = orderClause.split(',').map(col => col.trim().split(' ')[0]);
      columns.push(...orderColumns);
    }

    return [...new Set(columns)]; // Remove duplicates
  }

  private estimatePerformanceGain(metric: QueryPerformanceMetric): number {
    // Estimate based on current execution time and row count
    if (metric.execution_time > 2000 && metric.row_count > 5000) return 0.8; // 80% improvement
    if (metric.execution_time > 1000 && metric.row_count > 1000) return 0.6; // 60% improvement
    if (metric.execution_time > 500) return 0.4; // 40% improvement
    return 0.2; // 20% improvement
  }

  private estimateImplementationCost(tableName: string): 'low' | 'medium' | 'high' {
    // Simple heuristic based on table name
    const highTrafficTables = ['user_events', 'user_sessions', 'expenses'];
    const mediumTrafficTables = ['user_trips', 'pam_conversations'];

    if (highTrafficTables.includes(tableName)) return 'high';
    if (mediumTrafficTables.includes(tableName)) return 'medium';
    return 'low';
  }

  private calculateIndexPriority(metric: QueryPerformanceMetric): number {
    let priority = 0;

    // High execution time = higher priority
    if (metric.execution_time > 2000) priority += 3;
    else if (metric.execution_time > 1000) priority += 2;
    else if (metric.execution_time > 500) priority += 1;

    // High row count = higher priority
    if (metric.row_count > 10000) priority += 3;
    else if (metric.row_count > 5000) priority += 2;
    else if (metric.row_count > 1000) priority += 1;

    // Low optimization score = higher priority
    if (metric.optimization_score < 50) priority += 2;
    else if (metric.optimization_score < 70) priority += 1;

    return Math.min(priority, 10); // Cap at 10
  }

  // =====================================================
  // OPTIMIZATION RULES SETUP
  // =====================================================

  private setupOptimizationRules(): void {
    this.optimizationRules = [
      {
        rule_id: 'missing_where_index',
        pattern: /select.*from\s+(\w+).*where\s+(\w+)\s*[=<>]/i,
        category: 'missing_index',
        description: 'Query with WHERE clause may benefit from index',
        suggestion: 'Consider adding index on filtered columns',
        auto_fixable: false
      },
      {
        rule_id: 'order_by_without_index',
        pattern: /select.*from\s+(\w+).*order\s+by\s+(\w+)/i,
        category: 'missing_index',
        description: 'ORDER BY clause may benefit from index',
        suggestion: 'Consider adding index on sorted columns',
        auto_fixable: false
      },
      {
        rule_id: 'select_star',
        pattern: /select\s+\*\s+from/i,
        category: 'excessive_data',
        description: 'SELECT * retrieves unnecessary data',
        suggestion: 'Specify only needed columns',
        auto_fixable: false
      },
      {
        rule_id: 'no_limit_large_table',
        pattern: /select.*from\s+(user_events|user_sessions|expenses)(?!.*limit)/i,
        category: 'excessive_data',
        description: 'Query on large table without LIMIT',
        suggestion: 'Add LIMIT clause to prevent excessive data retrieval',
        auto_fixable: false
      },
      {
        rule_id: 'inefficient_join',
        pattern: /select.*from\s+\w+.*join\s+\w+.*on.*=.*and.*=/i,
        category: 'inefficient_join',
        description: 'Complex join condition may be inefficient',
        suggestion: 'Review join conditions and consider index optimization',
        auto_fixable: false
      }
    ];
  }

  // =====================================================
  // SLOW QUERY HANDLING
  // =====================================================

  private async handleSlowQuery(metric: QueryPerformanceMetric): Promise<void> {
    logger.warn(`🐌 Slow query detected: ${metric.query_id}`, {
      execution_time: metric.execution_time,
      table: metric.table_name,
      operation: metric.operation
    });

    collectUserAction('slow_query_detected', {
      query_id: metric.query_id,
      execution_time: metric.execution_time,
      table: metric.table_name,
      operation: metric.operation,
      row_count: metric.row_count
    });

    // Store slow query for analysis
    await this.storeSlowQuery(metric);
  }

  private async storeSlowQuery(metric: QueryPerformanceMetric): Promise<void> {
    try {
      const { error } = await supabase
        .from('slow_queries')
        .insert({
          query_id: metric.query_id,
          query_pattern: metric.query_pattern,
          table_name: metric.table_name,
          operation: metric.operation,
          execution_time: metric.execution_time,
          row_count: metric.row_count,
          optimization_score: metric.optimization_score,
          detected_at: metric.timestamp,
          user_id: metric.user_id
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Error storing slow query:', error);
    }
  }

  // =====================================================
  // CONNECTION POOL MONITORING
  // =====================================================

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updateConnectionStats();
      this.generatePerformanceReport();
    }, this.ANALYSIS_INTERVAL);

    // Monitor query patterns
    setInterval(() => {
      this.analyzeQueryPatterns();
    }, 600000); // 10 minutes
  }

  private updateConnectionStats(): void {
    // This would typically integrate with connection pool metrics
    // For now, we'll simulate based on query volume

    const recentQueries = this.queryMetrics.filter(
      m => Date.now() - new Date(m.timestamp).getTime() < 60000 // Last minute
    );

    this.connectionStats.active_connections = Math.min(recentQueries.length, this.connectionStats.max_connections);
    this.connectionStats.avg_query_time = recentQueries.length > 0 ?
      recentQueries.reduce((sum, q) => sum + q.execution_time, 0) / recentQueries.length : 0;

    this.connectionStats.efficiency_score = this.calculateConnectionEfficiency();
  }

  private calculateConnectionEfficiency(): number {
    const utilizationRate = this.connectionStats.active_connections / this.connectionStats.max_connections;
    const avgQueryTime = this.connectionStats.avg_query_time;

    let score = 100;

    // Penalize high utilization
    if (utilizationRate > 0.9) score -= 30;
    else if (utilizationRate > 0.7) score -= 15;

    // Penalize slow queries
    if (avgQueryTime > 1000) score -= 25;
    else if (avgQueryTime > 500) score -= 10;

    // Penalize connection errors
    score -= this.connectionStats.connection_errors * 5;

    return Math.max(score, 0);
  }

  // =====================================================
  // QUERY INTERCEPTOR SETUP
  // =====================================================

  private setupQueryInterceptor(): void {
    // This would integrate with Supabase client to intercept queries
    // For now, we provide a wrapper function
    logger.debug('📡 Query interceptor ready');
  }

  // Wrapper function for monitoring queries
  async monitoredQuery<T>(
    operation: () => Promise<T>,
    queryPattern: string,
    tableName: string,
    operationType: QueryPerformanceMetric['operation'],
    userId?: string
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      await this.trackQuery(queryPattern, tableName, operationType, startTime, result, userId);
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      collectUserAction('database_query_error', {
        query_pattern: queryPattern,
        table: tableName,
        operation: operationType,
        execution_time: executionTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  // =====================================================
  // PERFORMANCE ANALYSIS
  // =====================================================

  private analyzeQueryPatterns(): void {
    const patterns = this.groupQueriesByPattern();

    for (const [pattern, queries] of patterns) {
      const avgExecutionTime = queries.reduce((sum, q) => sum + q.execution_time, 0) / queries.length;
      const totalQueries = queries.length;

      if (avgExecutionTime > this.SLOW_QUERY_THRESHOLD && totalQueries > 5) {
        logger.warn(`📊 Performance pattern detected: ${pattern}`, {
          avg_execution_time: avgExecutionTime,
          query_count: totalQueries
        });
      }
    }
  }

  private groupQueriesByPattern(): Map<string, QueryPerformanceMetric[]> {
    const patterns = new Map<string, QueryPerformanceMetric[]>();

    for (const metric of this.queryMetrics) {
      const pattern = metric.query_pattern;
      if (!patterns.has(pattern)) {
        patterns.set(pattern, []);
      }
      patterns.get(pattern)!.push(metric);
    }

    return patterns;
  }

  private generatePerformanceReport(): DatabaseOptimizationReport {
    const queries = this.queryMetrics.filter(
      m => Date.now() - new Date(m.timestamp).getTime() < 3600000 // Last hour
    );

    const slowQueries = queries.filter(q => q.execution_time > this.SLOW_QUERY_THRESHOLD);
    const cacheHits = queries.filter(q => q.cache_hit);
    const indexedQueries = queries.filter(q => q.index_used);

    const report: DatabaseOptimizationReport = {
      overall_score: this.calculateOverallScore(queries),
      query_performance: {
        avg_response_time: queries.length > 0 ?
          queries.reduce((sum, q) => sum + q.execution_time, 0) / queries.length : 0,
        slow_queries_count: slowQueries.length,
        cache_hit_rate: queries.length > 0 ? cacheHits.length / queries.length : 0,
        index_usage_rate: queries.length > 0 ? indexedQueries.length / queries.length : 0
      },
      recommendations: this.generateRecommendations(queries),
      index_suggestions: [...this.indexSuggestions].sort((a, b) => b.priority - a.priority),
      connection_health: { ...this.connectionStats },
      trending_issues: this.identifyTrendingIssues(queries)
    };

    // Send report to analytics
    collectUserAction('database_performance_report_generated', {
      overall_score: report.overall_score,
      slow_queries: report.query_performance.slow_queries_count,
      recommendations_count: report.recommendations.length
    });

    return report;
  }

  private calculateOverallScore(queries: QueryPerformanceMetric[]): number {
    if (queries.length === 0) return 100;

    const avgOptimizationScore = queries.reduce((sum, q) => sum + q.optimization_score, 0) / queries.length;
    const slowQueryPenalty = (queries.filter(q => q.execution_time > this.SLOW_QUERY_THRESHOLD).length / queries.length) * 30;
    const connectionScore = this.connectionStats.efficiency_score * 0.3;

    return Math.max(avgOptimizationScore - slowQueryPenalty + connectionScore * 0.3, 0);
  }

  private generateRecommendations(queries: QueryPerformanceMetric[]): DatabaseOptimizationReport['recommendations'] {
    const recommendations: DatabaseOptimizationReport['recommendations'] = [];

    // Index recommendations
    if (this.indexSuggestions.length > 0) {
      recommendations.push({
        category: 'indexing',
        priority: 'high',
        description: `${this.indexSuggestions.length} index suggestions available`,
        estimated_impact: 'Significant query performance improvement',
        implementation_effort: 'Medium'
      });
    }

    // Slow query recommendations
    const slowQueries = queries.filter(q => q.execution_time > this.SLOW_QUERY_THRESHOLD);
    if (slowQueries.length > 5) {
      recommendations.push({
        category: 'query_optimization',
        priority: 'high',
        description: `${slowQueries.length} slow queries detected`,
        estimated_impact: 'Reduced response times',
        implementation_effort: 'High'
      });
    }

    // Connection pool recommendations
    if (this.connectionStats.efficiency_score < 70) {
      recommendations.push({
        category: 'connection_management',
        priority: 'medium',
        description: 'Connection pool efficiency below optimal',
        estimated_impact: 'Better resource utilization',
        implementation_effort: 'Low'
      });
    }

    // Cache recommendations
    const cacheHitRate = queries.length > 0 ?
      queries.filter(q => q.cache_hit).length / queries.length : 0;
    if (cacheHitRate < 0.5) {
      recommendations.push({
        category: 'caching',
        priority: 'medium',
        description: 'Low cache hit rate detected',
        estimated_impact: 'Faster response times',
        implementation_effort: 'Medium'
      });
    }

    return recommendations;
  }

  private identifyTrendingIssues(queries: QueryPerformanceMetric[]): string[] {
    const issues: string[] = [];

    // Check for increasing query times
    const recentQueries = queries.slice(-20);
    const olderQueries = queries.slice(-40, -20);

    if (recentQueries.length > 0 && olderQueries.length > 0) {
      const recentAvg = recentQueries.reduce((sum, q) => sum + q.execution_time, 0) / recentQueries.length;
      const olderAvg = olderQueries.reduce((sum, q) => sum + q.execution_time, 0) / olderQueries.length;

      if (recentAvg > olderAvg * 1.5) {
        issues.push('Query performance degrading over time');
      }
    }

    // Check for specific table issues
    const tablePerformance = new Map<string, number[]>();
    queries.forEach(q => {
      if (!tablePerformance.has(q.table_name)) {
        tablePerformance.set(q.table_name, []);
      }
      tablePerformance.get(q.table_name)!.push(q.execution_time);
    });

    for (const [table, times] of tablePerformance) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      if (avgTime > this.SLOW_QUERY_THRESHOLD && times.length > 3) {
        issues.push(`Consistent slow queries on table: ${table}`);
      }
    }

    return issues;
  }

  // =====================================================
  // CLEANUP AND MAINTENANCE
  // =====================================================

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - (this.METRICS_RETENTION_HOURS * 60 * 60 * 1000);
    this.queryMetrics = this.queryMetrics.filter(
      metric => new Date(metric.timestamp).getTime() > cutoffTime
    );
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  getPerformanceReport(): DatabaseOptimizationReport {
    return this.generatePerformanceReport();
  }

  getIndexSuggestions(): IndexSuggestion[] {
    return [...this.indexSuggestions].sort((a, b) => b.priority - a.priority);
  }

  getConnectionStats(): ConnectionPoolStats {
    return { ...this.connectionStats };
  }

  getQueryMetrics(tableName?: string): QueryPerformanceMetric[] {
    let metrics = [...this.queryMetrics];
    if (tableName) {
      metrics = metrics.filter(m => m.table_name === tableName);
    }
    return metrics;
  }

  clearMetrics(): void {
    this.queryMetrics = [];
    this.indexSuggestions = [];
    logger.debug('🧹 Database performance metrics cleared');
  }

  // Convenience method for wrapping Supabase queries
  wrapSupabaseQuery<T>(
    operation: () => Promise<T>,
    tableName: string,
    operationType: QueryPerformanceMetric['operation'],
    userId?: string
  ): Promise<T> {
    const queryPattern = `${operationType} FROM ${tableName}`;
    return this.monitoredQuery(operation, queryPattern, tableName, operationType, userId);
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const databasePerformanceOptimizer = DatabasePerformanceOptimizer.getInstance();

// Convenience functions
export const trackDatabaseQuery = (
  queryPattern: string,
  tableName: string,
  operation: QueryPerformanceMetric['operation'],
  startTime: number,
  result: any,
  userId?: string
) => databasePerformanceOptimizer.trackQuery(queryPattern, tableName, operation, startTime, result, userId);

export const wrapSupabaseQuery = <T>(
  operation: () => Promise<T>,
  tableName: string,
  operationType: QueryPerformanceMetric['operation'],
  userId?: string
): Promise<T> => databasePerformanceOptimizer.wrapSupabaseQuery(operation, tableName, operationType, userId);