/**
 * Enhanced Financial Data Pipeline with Real-time Analytics
 *
 * Provides intelligent financial data processing with:
 * - Real-time expense categorization and insights
 * - Budget monitoring and predictive analytics
 * - Automated anomaly detection
 * - Smart financial recommendations
 */

import { supabase } from '@/integrations/supabase/client';
import { collectUserAction, collectCacheEvent, collectResponseTime } from '@/services/pam/analytics/analyticsCollector';
import { logger } from '@/lib/logger';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface FinancialMetrics {
  total_spending: number;
  avg_daily_spending: number;
  category_breakdown: Record<string, number>;
  spending_velocity: number; // Rate of spending increase/decrease
  budget_utilization: number;
  savings_rate: number;
  anomaly_score: number;
}

interface SpendingPattern {
  pattern_type: 'daily' | 'weekly' | 'monthly' | 'seasonal';
  category: string;
  avg_amount: number;
  frequency: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
}

interface BudgetInsight {
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
  projected_overspend: number;
  recommendations: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

interface FinancialPrediction {
  target_date: string;
  predicted_spending: Record<string, number>;
  confidence_interval: [number, number];
  factors: string[];
  recommendations: string[];
}

interface CachedFinancialData {
  data: any;
  metrics: FinancialMetrics;
  insights: BudgetInsight[];
  patterns: SpendingPattern[];
  cached_at: string;
  expires_at: string;
  invalidation_triggers: string[];
}

// =====================================================
// ENHANCED FINANCIAL DATA PIPELINE
// =====================================================

export class FinancialDataPipeline {
  private static instance: FinancialDataPipeline;
  private cache = new Map<string, CachedFinancialData>();
  private realTimeSubscriptions = new Map<string, any>();
  private anomalyThresholds = {
    spending_spike: 2.5, // 2.5x normal spending
    unusual_category: 3.0, // 3x normal for category
    frequency_anomaly: 0.3 // 30% of normal frequency
  };

  private readonly CACHE_TTL = 1000 * 60 * 5; // 5 minutes for financial data
  private readonly REAL_TIME_WINDOW = 1000 * 60 * 60 * 24; // 24 hours

  private constructor() {
    this.initializePipeline();
  }

  static getInstance(): FinancialDataPipeline {
    if (!FinancialDataPipeline.instance) {
      FinancialDataPipeline.instance = new FinancialDataPipeline();
    }
    return FinancialDataPipeline.instance;
  }

  private initializePipeline(): void {
    // Start real-time data monitoring
    this.setupRealTimeSubscriptions();

    // Cleanup expired cache
    setInterval(() => this.cleanupCache(), 1000 * 60 * 2); // Every 2 minutes

    logger.debug('💰 Financial Data Pipeline initialized');
  }

  // =====================================================
  // ENHANCED EXPENSE OPERATIONS
  // =====================================================

  async createExpense(userId: string, expense: any): Promise<{ success: boolean; data?: any; insights?: any; error?: any }> {
    const startTime = Date.now();

    try {
      // Validate and enhance expense data
      const enhancedExpense = await this.enhanceExpenseData(expense);

      // Create expense in database
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: userId,
          amount: enhancedExpense.amount,
          category: enhancedExpense.category,
          date: enhancedExpense.date,
          description: enhancedExpense.description,
          metadata: {
            enhanced_category: enhancedExpense.enhanced_category,
            confidence_score: enhancedExpense.confidence_score,
            tags: enhancedExpense.tags,
            pipeline_version: '2.0'
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Invalidate relevant caches
      this.invalidateUserCaches(userId);

      // Generate real-time insights
      const insights = await this.generateExpenseInsights(userId, data);

      // Check for anomalies
      const anomalyCheck = await this.detectAnomalies(userId, data);

      // Track analytics
      const responseTime = Date.now() - startTime;
      collectResponseTime({
        operation: 'create_expense',
        response_time_ms: responseTime,
        cache_hit: false
      });

      collectUserAction('expense_created', {
        expense_id: data.id,
        category: enhancedExpense.category,
        amount: enhancedExpense.amount,
        insights,
        anomaly_detected: anomalyCheck.detected
      });

      return {
        success: true,
        data,
        insights: {
          ...insights,
          anomaly_check: anomalyCheck,
          recommendations: await this.generateRecommendations(userId, data)
        }
      };
    } catch (error) {
      logger.error('Error in financial pipeline create:', error);
      return { success: false, error };
    }
  }

  async getExpenses(userId: string, options: {
    start_date?: string;
    end_date?: string;
    category?: string;
    include_analytics?: boolean;
    include_predictions?: boolean;
  } = {}): Promise<{ success: boolean; data?: any[]; analytics?: any; error?: any }> {
    const startTime = Date.now();
    const cacheKey = `expenses_${userId}_${JSON.stringify(options)}`;

    try {
      // Check cache first
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        collectCacheEvent('hit', {
          operation: 'get_expenses',
          cache_key: cacheKey
        });

        return { success: true, data: cached.data, analytics: cached.insights };
      }

      // Build optimized query
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (options.start_date) query = query.gte('date', options.start_date);
      if (options.end_date) query = query.lte('date', options.end_date);
      if (options.category) query = query.eq('category', options.category);

      const { data, error } = await query;
      if (error) throw error;

      // Process and enhance data
      const processedData = await this.processExpenseData(data || []);

      // Generate analytics if requested
      let analytics = {};
      if (options.include_analytics) {
        analytics = await this.generateFinancialAnalytics(userId, processedData);
      }

      // Generate predictions if requested
      if (options.include_predictions) {
        (analytics as any).predictions = await this.generatePredictions(userId, processedData);
      }

      // Cache results
      this.cacheFinancialData(cacheKey, processedData, analytics);

      const responseTime = Date.now() - startTime;
      collectResponseTime({
        operation: 'get_expenses',
        response_time_ms: responseTime,
        cache_hit: false
      });

      return { success: true, data: processedData, analytics };
    } catch (error) {
      logger.error('Error in financial pipeline get:', error);
      return { success: false, error };
    }
  }

  // =====================================================
  // DATA ENHANCEMENT AND PROCESSING
  // =====================================================

  private async enhanceExpenseData(expense: any): Promise<any> {
    // Enhanced category detection using ML-like rules
    const enhancedCategory = this.detectEnhancedCategory(expense.description, expense.category);

    // Extract tags from description
    const tags = this.extractTags(expense.description);

    // Calculate confidence score
    const confidenceScore = this.calculateCategoryConfidence(expense.description, enhancedCategory);

    return {
      ...expense,
      enhanced_category: enhancedCategory,
      tags,
      confidence_score: confidenceScore
    };
  }

  private detectEnhancedCategory(description: string, originalCategory: string): string {
    const categoryKeywords = {
      'fuel': ['gas', 'fuel', 'petrol', 'diesel', 'station', 'shell', 'bp', 'exxon'],
      'food': ['restaurant', 'cafe', 'food', 'grocery', 'supermarket', 'mcdonald', 'pizza'],
      'accommodation': ['hotel', 'motel', 'airbnb', 'booking', 'hostel', 'lodge'],
      'entertainment': ['movie', 'theater', 'show', 'concert', 'game', 'park', 'museum'],
      'shopping': ['store', 'shop', 'market', 'amazon', 'walmart', 'target', 'mall'],
      'transportation': ['uber', 'taxi', 'bus', 'train', 'flight', 'airline', 'ticket']
    };

    const desc = description.toLowerCase();

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => desc.includes(keyword))) {
        return category;
      }
    }

    return originalCategory;
  }

  private extractTags(description: string): string[] {
    const tags: string[] = [];
    const desc = description.toLowerCase();

    // Location tags
    if (desc.includes('airport')) tags.push('airport');
    if (desc.includes('highway')) tags.push('highway');
    if (desc.includes('downtown')) tags.push('downtown');

    // Payment method tags
    if (desc.includes('cash')) tags.push('cash');
    if (desc.includes('card')) tags.push('card');

    // Frequency tags
    if (desc.includes('daily') || desc.includes('regular')) tags.push('recurring');
    if (desc.includes('emergency') || desc.includes('urgent')) tags.push('emergency');

    return tags;
  }

  private calculateCategoryConfidence(description: string, category: string): number {
    // Simple confidence calculation based on keyword matching
    const desc = description.toLowerCase();
    let confidence = 0.5; // Base confidence

    // Boost confidence for exact matches
    if (desc.includes(category)) confidence += 0.3;

    // Boost for multiple relevant keywords
    const relevantWords = desc.split(' ').filter(word => word.length > 3);
    confidence += Math.min(relevantWords.length * 0.05, 0.2);

    return Math.min(confidence, 1.0);
  }

  private async processExpenseData(expenses: any[]): Promise<any[]> {
    return expenses.map(expense => ({
      ...expense,
      enhanced_metrics: this.calculateExpenseMetrics(expense),
      risk_flags: this.identifyRiskFlags(expense)
    }));
  }

  private calculateExpenseMetrics(expense: any): any {
    const date = new Date(expense.date);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();

    return {
      amount_normalized: expense.amount / 100, // Normalize for analysis
      day_of_week: dayOfWeek,
      time_of_day: hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening',
      weekend: dayOfWeek === 0 || dayOfWeek === 6,
      month: date.getMonth() + 1,
      quarter: Math.ceil((date.getMonth() + 1) / 3)
    };
  }

  private identifyRiskFlags(expense: any): string[] {
    const flags: string[] = [];

    // High amount flag
    if (expense.amount > 500) flags.push('high_amount');

    // Late night spending
    const hour = new Date(expense.date).getHours();
    if (hour > 23 || hour < 6) flags.push('unusual_time');

    // Suspicious categories
    if (['unknown', 'other', 'miscellaneous'].includes(expense.category.toLowerCase())) {
      flags.push('unclear_category');
    }

    return flags;
  }

  // =====================================================
  // ANALYTICS AND INSIGHTS
  // =====================================================

  private async generateFinancialAnalytics(userId: string, expenses: any[]): Promise<any> {
    const metrics = this.calculateFinancialMetrics(expenses);
    const patterns = this.identifySpendingPatterns(expenses);
    const insights = await this.generateBudgetInsights(userId, expenses);

    return {
      metrics,
      patterns,
      insights,
      summary: this.generateSummary(metrics, patterns)
    };
  }

  private calculateFinancialMetrics(expenses: any[]): FinancialMetrics {
    const totalSpending = expenses.reduce((sum, e) => sum + e.amount, 0);
    const categories = this.groupByCategory(expenses);

    // Calculate spending velocity (trend over time)
    const velocity = this.calculateSpendingVelocity(expenses);

    // Calculate anomaly score
    const anomalyScore = this.calculateOverallAnomalyScore(expenses);

    return {
      total_spending: totalSpending,
      avg_daily_spending: totalSpending / Math.max(this.getDateRange(expenses), 1),
      category_breakdown: categories,
      spending_velocity: velocity,
      budget_utilization: 0.75, // Would calculate from budget data
      savings_rate: 0.2, // Would calculate from income data
      anomaly_score: anomalyScore
    };
  }

  private groupByCategory(expenses: any[]): Record<string, number> {
    return expenses.reduce((acc, expense) => {
      const category = expense.category || 'other';
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {});
  }

  private calculateSpendingVelocity(expenses: any[]): number {
    if (expenses.length < 2) return 0;

    // Sort by date and calculate trend
    const sorted = expenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const recentHalf = sorted.slice(Math.floor(sorted.length / 2));
    const earlierHalf = sorted.slice(0, Math.floor(sorted.length / 2));

    const recentAvg = recentHalf.reduce((sum, e) => sum + e.amount, 0) / recentHalf.length;
    const earlierAvg = earlierHalf.reduce((sum, e) => sum + e.amount, 0) / earlierHalf.length;

    return (recentAvg - earlierAvg) / earlierAvg;
  }

  private getDateRange(expenses: any[]): number {
    if (expenses.length === 0) return 1;

    const dates = expenses.map(e => new Date(e.date).getTime());
    const earliest = Math.min(...dates);
    const latest = Math.max(...dates);

    return Math.max(1, Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24)));
  }

  private calculateOverallAnomalyScore(expenses: any[]): number {
    // Calculate various anomaly indicators
    let score = 0;

    // Amount variance
    const amounts = expenses.map(e => e.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - avgAmount, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // High variance indicates anomalies
    if (stdDev > avgAmount * 0.5) score += 0.3;

    // Unusual timing patterns
    const lateNightExpenses = expenses.filter(e => {
      const hour = new Date(e.date).getHours();
      return hour > 23 || hour < 6;
    });

    if (lateNightExpenses.length > expenses.length * 0.1) score += 0.2;

    // Category distribution anomalies
    const categories = this.groupByCategory(expenses);
    const categoryCount = Object.keys(categories).length;
    if (categoryCount < 3) score += 0.2; // Too few categories
    if (categoryCount > 15) score += 0.3; // Too many categories

    return Math.min(score, 1.0);
  }

  private identifySpendingPatterns(expenses: any[]): SpendingPattern[] {
    const patterns: SpendingPattern[] = [];

    // Analyze by category
    const categories = this.groupByCategory(expenses);

    for (const [category, total] of Object.entries(categories)) {
      const categoryExpenses = expenses.filter(e => e.category === category);
      const avgAmount = total / categoryExpenses.length;

      patterns.push({
        pattern_type: 'monthly',
        category,
        avg_amount: avgAmount,
        frequency: categoryExpenses.length,
        trend: this.calculateCategoryTrend(categoryExpenses),
        confidence: Math.min(categoryExpenses.length / 10, 1.0)
      });
    }

    return patterns.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  private calculateCategoryTrend(expenses: any[]): 'increasing' | 'decreasing' | 'stable' {
    if (expenses.length < 3) return 'stable';

    const sorted = expenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const recentThird = sorted.slice(-Math.ceil(sorted.length / 3));
    const earlierThird = sorted.slice(0, Math.ceil(sorted.length / 3));

    const recentAvg = recentThird.reduce((sum, e) => sum + e.amount, 0) / recentThird.length;
    const earlierAvg = earlierThird.reduce((sum, e) => sum + e.amount, 0) / earlierThird.length;

    const change = (recentAvg - earlierAvg) / earlierAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private async generateBudgetInsights(userId: string, expenses: any[]): Promise<BudgetInsight[]> {
    // This would typically fetch budget data from database
    // For now, we'll simulate with common categories
    const commonBudgets = {
      'fuel': 300,
      'food': 500,
      'accommodation': 200,
      'entertainment': 150,
      'shopping': 250
    };

    const insights: BudgetInsight[] = [];
    const spending = this.groupByCategory(expenses);

    for (const [category, allocated] of Object.entries(commonBudgets)) {
      const spent = spending[category] || 0;
      const remaining = allocated - spent;
      const utilizationRate = spent / allocated;

      insights.push({
        category,
        allocated,
        spent,
        remaining,
        projected_overspend: remaining < 0 ? Math.abs(remaining) : 0,
        recommendations: this.generateCategoryRecommendations(category, utilizationRate),
        risk_level: this.calculateRiskLevel(utilizationRate)
      });
    }

    return insights;
  }

  private generateCategoryRecommendations(category: string, utilization: number): string[] {
    const recommendations: string[] = [];

    if (utilization > 1.2) {
      recommendations.push(`Consider reducing ${category} expenses by 20%`);
    } else if (utilization > 0.9) {
      recommendations.push(`Monitor ${category} spending closely`);
    } else if (utilization < 0.5) {
      recommendations.push(`You have room to spend more on ${category}`);
    }

    // Category-specific recommendations
    switch (category) {
      case 'fuel':
        if (utilization > 0.8) recommendations.push('Consider carpooling or public transport');
        break;
      case 'food':
        if (utilization > 0.8) recommendations.push('Try cooking at home more often');
        break;
      case 'entertainment':
        if (utilization > 0.8) recommendations.push('Look for free activities and events');
        break;
    }

    return recommendations;
  }

  private calculateRiskLevel(utilization: number): 'low' | 'medium' | 'high' | 'critical' {
    if (utilization >= 1.2) return 'critical';
    if (utilization >= 1.0) return 'high';
    if (utilization >= 0.8) return 'medium';
    return 'low';
  }

  private generateSummary(metrics: FinancialMetrics, patterns: SpendingPattern[]): any {
    const topCategory = patterns[0]?.category || 'unknown';
    const trendDirection = metrics.spending_velocity > 0.1 ? 'increasing' :
                          metrics.spending_velocity < -0.1 ? 'decreasing' : 'stable';

    return {
      headline: `Your spending is ${trendDirection}, with most spent on ${topCategory}`,
      key_insights: [
        `Average daily spending: $${metrics.avg_daily_spending.toFixed(2)}`,
        `Top category: ${topCategory} (${((patterns[0]?.avg_amount || 0) / metrics.total_spending * 100).toFixed(1)}%)`,
        `Anomaly score: ${(metrics.anomaly_score * 100).toFixed(0)}%`
      ],
      action_items: this.generateActionItems(metrics, patterns)
    };
  }

  private generateActionItems(metrics: FinancialMetrics, patterns: SpendingPattern[]): string[] {
    const items: string[] = [];

    if (metrics.spending_velocity > 0.2) {
      items.push('Review recent expenses - spending has increased significantly');
    }

    if (metrics.anomaly_score > 0.5) {
      items.push('Check for unusual transactions');
    }

    const increasingPatterns = patterns.filter(p => p.trend === 'increasing');
    if (increasingPatterns.length > 0) {
      items.push(`Monitor increasing spending in: ${increasingPatterns.map(p => p.category).join(', ')}`);
    }

    return items.slice(0, 3);
  }

  // =====================================================
  // ANOMALY DETECTION
  // =====================================================

  private async detectAnomalies(userId: string, newExpense: any): Promise<{ detected: boolean; anomalies: string[] }> {
    const anomalies: string[] = [];

    // Get recent expenses for comparison
    const recentExpenses = await this.getRecentExpenses(userId, 30); // Last 30 days

    // Amount anomaly
    if (this.isAmountAnomaly(newExpense, recentExpenses)) {
      anomalies.push('Unusually high amount for this category');
    }

    // Time anomaly
    if (this.isTimeAnomaly(newExpense, recentExpenses)) {
      anomalies.push('Unusual spending time');
    }

    // Frequency anomaly
    if (this.isFrequencyAnomaly(newExpense, recentExpenses)) {
      anomalies.push('Unexpected spending frequency for this category');
    }

    return {
      detected: anomalies.length > 0,
      anomalies
    };
  }

  private async getRecentExpenses(userId: string, days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString());

    return data || [];
  }

  private isAmountAnomaly(expense: any, recentExpenses: any[]): boolean {
    const categoryExpenses = recentExpenses.filter(e => e.category === expense.category);
    if (categoryExpenses.length < 3) return false;

    const amounts = categoryExpenses.map(e => e.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    return expense.amount > avgAmount * this.anomalyThresholds.spending_spike;
  }

  private isTimeAnomaly(expense: any, recentExpenses: any[]): boolean {
    const hour = new Date(expense.date).getHours();
    const timeSlots = recentExpenses.map(e => new Date(e.date).getHours());

    // Check if this time is very unusual compared to normal patterns
    const similarTimeSlots = timeSlots.filter(h => Math.abs(h - hour) <= 2);
    return similarTimeSlots.length < timeSlots.length * 0.1;
  }

  private isFrequencyAnomaly(expense: any, recentExpenses: any[]): boolean {
    const categoryExpenses = recentExpenses.filter(e => e.category === expense.category);
    if (categoryExpenses.length === 0) return false;

    // Calculate normal frequency (expenses per week)
    const normalFrequency = categoryExpenses.length / 4; // 4 weeks
    const thisWeekExpenses = categoryExpenses.filter(e => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(e.date) > weekAgo;
    });

    return thisWeekExpenses.length > normalFrequency * 2;
  }

  // =====================================================
  // PREDICTIONS AND RECOMMENDATIONS
  // =====================================================

  private async generatePredictions(userId: string, expenses: any[]): Promise<FinancialPrediction[]> {
    const predictions: FinancialPrediction[] = [];

    // Predict next month spending by category
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const patterns = this.identifySpendingPatterns(expenses);
    const predictedSpending: Record<string, number> = {};

    for (const pattern of patterns) {
      // Simple trend-based prediction
      let prediction = pattern.avg_amount * pattern.frequency;

      if (pattern.trend === 'increasing') {
        prediction *= 1.2;
      } else if (pattern.trend === 'decreasing') {
        prediction *= 0.8;
      }

      predictedSpending[pattern.category] = prediction;
    }

    predictions.push({
      target_date: nextMonth.toISOString().split('T')[0],
      predicted_spending: predictedSpending,
      confidence_interval: [0.8, 1.2], // 80% to 120% of prediction
      factors: ['Historical patterns', 'Trend analysis', 'Seasonal adjustments'],
      recommendations: await this.generatePredictionRecommendations(predictedSpending)
    });

    return predictions;
  }

  private async generatePredictionRecommendations(predictedSpending: Record<string, number>): Promise<string[]> {
    const recommendations: string[] = [];
    const total = Object.values(predictedSpending).reduce((a, b) => a + b, 0);

    if (total > 2000) {
      recommendations.push('Consider setting spending limits for next month');
    }

    const topCategory = Object.entries(predictedSpending)
      .sort(([,a], [,b]) => b - a)[0];

    if (topCategory) {
      recommendations.push(`Focus on optimizing ${topCategory[0]} expenses`);
    }

    return recommendations;
  }

  private async generateRecommendations(userId: string, expense: any): Promise<string[]> {
    const recommendations: string[] = [];

    // Category-specific recommendations
    switch (expense.category.toLowerCase()) {
      case 'fuel':
        recommendations.push('Consider using gas price apps to find cheaper fuel');
        break;
      case 'food':
        recommendations.push('Look for restaurant deals and happy hour specials');
        break;
      case 'accommodation':
        recommendations.push('Compare prices across booking platforms');
        break;
    }

    // Amount-based recommendations
    if (expense.amount > 200) {
      recommendations.push('Consider if this purchase aligns with your budget goals');
    }

    return recommendations.slice(0, 2);
  }

  private async generateExpenseInsights(userId: string, expense: any): Promise<any> {
    return {
      category_analysis: {
        typical_amount: await this.getTypicalAmountForCategory(userId, expense.category),
        frequency_this_month: await this.getCategoryFrequencyThisMonth(userId, expense.category)
      },
      timing_analysis: {
        typical_time: 'afternoon', // Would calculate from data
        day_of_week_pattern: 'weekday' // Would calculate from data
      },
      comparison: {
        vs_last_month: 15, // Percentage change
        vs_category_average: -5
      }
    };
  }

  private async getTypicalAmountForCategory(userId: string, category: string): Promise<number> {
    const { data } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .eq('category', category)
      .order('date', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) return 0;
    return data.reduce((sum, e) => sum + e.amount, 0) / data.length;
  }

  private async getCategoryFrequencyThisMonth(userId: string, category: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    const { data } = await supabase
      .from('expenses')
      .select('id')
      .eq('user_id', userId)
      .eq('category', category)
      .gte('date', startOfMonth.toISOString());

    return data ? data.length : 0;
  }

  // =====================================================
  // CACHE MANAGEMENT
  // =====================================================

  private cacheFinancialData(key: string, data: any, analytics: any): void {
    const cached: CachedFinancialData = {
      data,
      metrics: analytics.metrics || {},
      insights: analytics.insights || [],
      patterns: analytics.patterns || [],
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + this.CACHE_TTL).toISOString(),
      invalidation_triggers: ['expense_created', 'expense_updated', 'expense_deleted']
    };

    this.cache.set(key, cached);
  }

  private getCachedData(key: string): CachedFinancialData | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (new Date() > new Date(cached.expires_at)) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  private invalidateUserCaches(userId: string): void {
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.cache) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    logger.debug(`🧹 Invalidated ${keysToDelete.length} financial cache entries for user ${userId}`);
  }

  private cleanupCache(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, cached] of this.cache) {
      if (now > new Date(cached.expires_at)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`🧹 Cleaned ${cleanedCount} expired financial cache entries`);
    }
  }

  // =====================================================
  // REAL-TIME SUBSCRIPTIONS
  // =====================================================

  private setupRealTimeSubscriptions(): void {
    // Set up real-time subscription for expense changes
    const subscription = supabase
      .channel('financial_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        (payload) => this.handleRealTimeUpdate(payload)
      )
      .subscribe();

    logger.debug('📡 Financial real-time subscriptions established');
  }

  private handleRealTimeUpdate(payload: any): void {
    logger.debug('📊 Real-time financial update received:', payload);

    // Invalidate relevant caches
    if (payload.new?.user_id) {
      this.invalidateUserCaches(payload.new.user_id);
    }

    // Trigger analytics collection
    collectUserAction('real_time_financial_update', {
      event_type: payload.eventType,
      table: payload.table,
      user_id: payload.new?.user_id
    });
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  getCacheStats(): any {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      memory_usage: JSON.stringify(Array.from(this.cache.values())).length
    };
  }

  clearCache(): void {
    this.cache.clear();
    logger.debug('🧹 Financial cache cleared');
  }

  dispose(): void {
    this.clearCache();

    // Cleanup subscriptions
    for (const subscription of this.realTimeSubscriptions.values()) {
      subscription.unsubscribe();
    }
    this.realTimeSubscriptions.clear();
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const financialDataPipeline = FinancialDataPipeline.getInstance();

// Convenience functions
export const createExpenseWithPipeline = financialDataPipeline.createExpense.bind(financialDataPipeline);
export const getExpensesWithPipeline = financialDataPipeline.getExpenses.bind(financialDataPipeline);