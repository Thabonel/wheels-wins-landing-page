import { addDays, subDays, startOfMonth, endOfMonth, differenceInDays, format } from 'date-fns';
import { BaseMLEngine } from './BaseMLEngine';
import { financialForecastingEngine } from './financialForecastingEngine';
import { userBehaviorAnalytics } from '../analytics/userBehaviorAnalytics';

interface BudgetRecommendation {
  id: string;
  type: 'saving' | 'spending_limit' | 'category_optimization' | 'goal_setting' | 'alert_setup';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  potential_savings: number;
  implementation_difficulty: 'easy' | 'medium' | 'hard';
  timeframe: 'immediate' | 'short_term' | 'long_term';
  category?: string;
  specific_actions: string[];
  confidence_score: number;
  impact_score: number;
}

interface SmartBudgetInsight {
  insight_type: 'spending_pattern' | 'saving_opportunity' | 'budget_risk' | 'goal_progress' | 'comparative_analysis';
  title: string;
  description: string;
  data_points: any[];
  severity: 'info' | 'warning' | 'critical';
  actionable: boolean;
  related_recommendations: string[];
}

interface PersonalizedBudgetPlan {
  user_id: string;
  plan_date: string;
  monthly_income: number;
  recommended_allocations: {
    category: string;
    percentage: number;
    amount: number;
    reasoning: string;
  }[];
  savings_goals: {
    name: string;
    target_amount: number;
    target_date: string;
    monthly_contribution: number;
    progress_percentage: number;
  }[];
  spending_limits: {
    category: string;
    limit: number;
    warning_threshold: number;
    reasoning: string;
  }[];
  emergency_fund: {
    current_amount: number;
    recommended_amount: number;
    monthly_contribution: number;
  };
  debt_payoff_strategy?: {
    debts: {
      name: string;
      balance: number;
      interest_rate: number;
      minimum_payment: number;
      recommended_payment: number;
    }[];
    total_payoff_time: number;
    total_interest_saved: number;
  };
}

interface BudgetOptimizationResult {
  current_efficiency_score: number;
  optimized_efficiency_score: number;
  potential_monthly_savings: number;
  recommendations: BudgetRecommendation[];
  insights: SmartBudgetInsight[];
  personalized_plan: PersonalizedBudgetPlan;
  risk_assessment: {
    financial_health_score: number;
    risk_factors: string[];
    mitigation_strategies: string[];
  };
}

/**
 * AI Budget Assistant - Refactored to extend BaseMLEngine
 *
 * Provides intelligent budget optimization and recommendations.
 * Now uses shared functionality from BaseMLEngine, eliminating duplicate code.
 */
export class AIBudgetAssistant extends BaseMLEngine {
  private readonly INSIGHTS_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

  constructor() {
    super({
      cacheTTL: 2 * 60 * 60 * 1000, // 2 hours for budget data
      enableLogging: true,
      maxRetries: 3
    });
  }

  getName(): string {
    return 'AI Budget Assistant';
  }

  getVersion(): string {
    return '2.0.0';
  }

  async generateBudgetRecommendations(
    userId: string,
    options: {
      includeGoals?: boolean;
      includeRiskAssessment?: boolean;
      timeframe?: 'monthly' | 'quarterly' | 'yearly';
    } = {}
  ): Promise<BudgetOptimizationResult> {
    this.validateUserId(userId);

    const cacheKey = this.getCacheKey(userId, 'budget_recommendations', options);
    const cached = this.getFromCache<BudgetOptimizationResult>(cacheKey);
    if (cached) return cached;

    return this.withErrorHandling(async () => {
      // Fetch all required data using base class methods
      const [expenses, budgets, profile, userSettings] = await Promise.all([
        this.fetchExpenses(userId, { limit: 1000 }),
        this.fetchBudgets(userId, { active: true }),
        this.fetchProfile(userId),
        this.fetchUserSettings(userId)
      ]);

      // Generate comprehensive budget analysis
      const result = await this.performBudgetOptimization(
        userId,
        expenses,
        budgets,
        profile,
        userSettings,
        options
      );

      this.setCache(cacheKey, result);
      return result;
    }, 'generateBudgetRecommendations');
  }

  async getSmartInsights(userId: string): Promise<SmartBudgetInsight[]> {
    this.validateUserId(userId);

    const cacheKey = this.getCacheKey(userId, 'smart_insights');
    const cached = this.getFromCache<SmartBudgetInsight[]>(cacheKey);
    if (cached) return cached;

    return this.withErrorHandling(async () => {
      const { startDate, endDate } = this.getDateRange(6); // 6 months
      const expenses = await this.fetchExpenses(userId, { startDate, endDate });

      const insights = this.analyzeSpendingPatterns(expenses, userId);
      this.setCache(cacheKey, insights, this.INSIGHTS_CACHE_TTL);

      return insights;
    }, 'getSmartInsights', []);
  }

  async optimizeBudgetCategories(userId: string): Promise<{
    current_allocations: Record<string, number>;
    recommended_allocations: Record<string, number>;
    savings_potential: number;
    reasoning: string[];
  }> {
    this.validateUserId(userId);

    const cacheKey = this.getCacheKey(userId, 'optimize_categories');
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    return this.withErrorHandling(async () => {
      const { startDate, endDate } = this.getDateRange(3); // 3 months
      const expenses = await this.fetchExpenses(userId, { startDate, endDate });

      const categorySpending = this.groupByCategory(expenses);
      const optimization = this.calculateOptimalAllocations(categorySpending);

      this.setCache(cacheKey, optimization);
      return optimization;
    }, 'optimizeBudgetCategories');
  }

  async generatePersonalizedPlan(
    userId: string,
    monthlyIncome: number,
    options: {
      riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
      primaryGoals?: string[];
    } = {}
  ): Promise<PersonalizedBudgetPlan> {
    this.validateUserId(userId);
    this.validateAmount(monthlyIncome);

    const cacheKey = this.getCacheKey(userId, 'personalized_plan', { monthlyIncome, ...options });
    const cached = this.getFromCache<PersonalizedBudgetPlan>(cacheKey);
    if (cached) return cached;

    return this.withErrorHandling(async () => {
      const { startDate, endDate } = this.getDateRange(6);
      const [expenses, profile, userSettings] = await Promise.all([
        this.fetchExpenses(userId, { startDate, endDate }),
        this.fetchProfile(userId),
        this.fetchUserSettings(userId)
      ]);

      const plan = this.createPersonalizedPlan(
        userId,
        monthlyIncome,
        expenses,
        profile,
        userSettings,
        options
      );

      this.setCache(cacheKey, plan);
      return plan;
    }, 'generatePersonalizedPlan');
  }

  // ============================================================================
  // PRIVATE ANALYSIS METHODS (Engine-specific logic)
  // ============================================================================

  private async performBudgetOptimization(
    userId: string,
    expenses: any[],
    budgets: any[],
    profile: any,
    userSettings: any,
    options: any
  ): Promise<BudgetOptimizationResult> {
    const categorySpending = this.groupByCategory(expenses);
    const monthlySpending = this.groupByTimePeriod(expenses, 'month');

    // Calculate efficiency scores
    const currentEfficiency = this.calculateEfficiencyScore(expenses, budgets);
    const recommendations = this.generateRecommendations(
      categorySpending,
      monthlySpending,
      profile,
      userSettings
    );

    // Estimate optimized efficiency
    const optimizedEfficiency = Math.min(100, currentEfficiency + 15);
    const potentialSavings = this.calculatePotentialSavings(recommendations);

    // Generate insights
    const insights = this.analyzeSpendingPatterns(expenses, userId);

    // Create personalized plan if income data available
    const monthlyIncome = profile?.monthly_income || this.estimateIncomeFromSpending(expenses);
    const personalizedPlan = this.createPersonalizedPlan(
      userId,
      monthlyIncome,
      expenses,
      profile,
      userSettings,
      options
    );

    // Risk assessment
    const riskAssessment = this.assessFinancialRisk(expenses, monthlyIncome, profile);

    return {
      current_efficiency_score: currentEfficiency,
      optimized_efficiency_score: optimizedEfficiency,
      potential_monthly_savings: potentialSavings,
      recommendations,
      insights,
      personalized_plan: personalizedPlan,
      risk_assessment: riskAssessment
    };
  }

  private calculateEfficiencyScore(expenses: any[], budgets: any[]): number {
    if (!expenses.length) return 50;

    const categoryTotals = this.groupByCategory(expenses);
    const totalSpending = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Score based on spending distribution and budget adherence
    let score = 70; // Base score

    // Check spending distribution
    const categories = Object.keys(categoryTotals);
    const averageSpending = totalSpending / categories.length;
    const variance = this.calculateStandardDeviation(
      Object.values(categoryTotals).map(arr => arr.reduce((sum: number, exp: any) => sum + exp.amount, 0))
    );

    // Lower variance = better distribution
    score += Math.max(-20, Math.min(20, 20 - (variance / averageSpending) * 10));

    // Budget adherence bonus
    if (budgets.length > 0) {
      const adherenceScore = this.calculateBudgetAdherence(categoryTotals, budgets);
      score += adherenceScore * 0.3;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateBudgetAdherence(categoryTotals: Record<string, any[]>, budgets: any[]): number {
    let totalAdherence = 0;
    let categoriesWithBudgets = 0;

    budgets.forEach(budget => {
      const categorySpending = categoryTotals[budget.category] || [];
      const totalSpent = categorySpending.reduce((sum, exp) => sum + exp.amount, 0);

      if (totalSpent <= budget.amount) {
        totalAdherence += 100;
      } else {
        const overspend = totalSpent - budget.amount;
        const adherencePercentage = Math.max(0, 100 - (overspend / budget.amount) * 100);
        totalAdherence += adherencePercentage;
      }

      categoriesWithBudgets++;
    });

    return categoriesWithBudgets > 0 ? totalAdherence / categoriesWithBudgets : 50;
  }

  private generateRecommendations(
    categorySpending: Record<string, any[]>,
    monthlySpending: Record<string, any[]>,
    profile: any,
    userSettings: any
  ): BudgetRecommendation[] {
    const recommendations: BudgetRecommendation[] = [];

    // Analyze each category for optimization opportunities
    Object.entries(categorySpending).forEach(([category, expenses]) => {
      const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const avgMonthly = totalSpent / 6; // 6 months of data

      if (avgMonthly > 500 && category !== 'housing' && category !== 'transportation') {
        recommendations.push({
          id: `optimize_${category}`,
          type: 'category_optimization',
          priority: avgMonthly > 1000 ? 'high' : 'medium',
          title: `Optimize ${category} spending`,
          description: `You're spending $${avgMonthly.toFixed(2)}/month on ${category}. Consider reviewing these expenses.`,
          potential_savings: avgMonthly * 0.15, // 15% potential savings
          implementation_difficulty: 'medium',
          timeframe: 'short_term',
          category,
          specific_actions: [
            `Review recent ${category} purchases`,
            'Look for subscription services to cancel',
            'Compare prices with alternatives',
            'Set a monthly limit for this category'
          ],
          confidence_score: this.calculateConfidence(expenses.length, 0.1),
          impact_score: Math.min(100, (avgMonthly / 100) * 10)
        });
      }
    });

    // Add savings recommendations based on spending patterns
    const trends = this.analyzeSpendingTrends(monthlySpending);
    if (trends.direction === 'up' && trends.strength > 0.1) {
      recommendations.push({
        id: 'spending_trend_alert',
        type: 'spending_limit',
        priority: 'high',
        title: 'Rising spending trend detected',
        description: `Your spending has increased by ${(trends.percentChange).toFixed(1)}% recently`,
        potential_savings: 200, // Estimated
        implementation_difficulty: 'easy',
        timeframe: 'immediate',
        specific_actions: [
          'Review recent purchases',
          'Set stricter weekly spending limits',
          'Use cash for discretionary spending',
          'Enable spending alerts'
        ],
        confidence_score: trends.strength,
        impact_score: Math.min(100, Math.abs(trends.percentChange))
      });
    }

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  private analyzeSpendingTrends(monthlySpending: Record<string, any[]>): {
    direction: 'up' | 'down' | 'stable';
    strength: number;
    percentChange: number;
  } {
    const monthlyTotals = Object.entries(monthlySpending)
      .map(([month, expenses]) => ({
        month,
        total: expenses.reduce((sum, exp) => sum + exp.amount, 0)
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(item => item.total);

    return this.calculateTrend(monthlyTotals);
  }

  private calculatePotentialSavings(recommendations: BudgetRecommendation[]): number {
    return recommendations.reduce((total, rec) => total + rec.potential_savings, 0);
  }

  private analyzeSpendingPatterns(expenses: any[], userId: string): SmartBudgetInsight[] {
    const insights: SmartBudgetInsight[] = [];
    const categoryTotals = this.groupByCategory(expenses);

    // Find highest spending categories
    const sortedCategories = Object.entries(categoryTotals)
      .map(([category, exps]) => ({
        category,
        total: exps.reduce((sum, exp) => sum + exp.amount, 0),
        count: exps.length
      }))
      .sort((a, b) => b.total - a.total);

    if (sortedCategories.length > 0) {
      const topCategory = sortedCategories[0];
      insights.push({
        insight_type: 'spending_pattern',
        title: `Highest spending: ${topCategory.category}`,
        description: `You've spent $${topCategory.total.toFixed(2)} on ${topCategory.category} recently (${topCategory.count} transactions)`,
        data_points: [{ category: topCategory.category, amount: topCategory.total, transactions: topCategory.count }],
        severity: topCategory.total > 1000 ? 'warning' : 'info',
        actionable: true,
        related_recommendations: [`optimize_${topCategory.category}`]
      });
    }

    return insights;
  }

  private calculateOptimalAllocations(categorySpending: Record<string, any[]>): {
    current_allocations: Record<string, number>;
    recommended_allocations: Record<string, number>;
    savings_potential: number;
    reasoning: string[];
  } {
    const currentAllocations: Record<string, number> = {};
    let totalSpending = 0;

    // Calculate current allocations
    Object.entries(categorySpending).forEach(([category, expenses]) => {
      const categoryTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      currentAllocations[category] = categoryTotal;
      totalSpending += categoryTotal;
    });

    // Convert to percentages
    const currentPercentages: Record<string, number> = {};
    Object.entries(currentAllocations).forEach(([category, amount]) => {
      currentPercentages[category] = (amount / totalSpending) * 100;
    });

    // Recommend optimal allocations based on financial best practices
    const recommendedAllocations = this.getOptimalCategoryAllocations(currentPercentages);

    // Calculate potential savings
    const savingsPotential = this.calculateAllocationSavings(
      currentAllocations,
      recommendedAllocations,
      totalSpending
    );

    return {
      current_allocations: currentPercentages,
      recommended_allocations: recommendedAllocations,
      savings_potential: savingsPotential,
      reasoning: this.generateAllocationReasoning(currentPercentages, recommendedAllocations)
    };
  }

  private getOptimalCategoryAllocations(current: Record<string, number>): Record<string, number> {
    // Based on 50/30/20 rule and financial best practices
    const optimal: Record<string, number> = {
      housing: 30,
      transportation: 15,
      food: 12,
      utilities: 8,
      entertainment: 8,
      shopping: 7,
      healthcare: 5,
      education: 5,
      savings: 10
    };

    // Adjust based on current categories
    const result: Record<string, number> = {};
    Object.keys(current).forEach(category => {
      result[category] = optimal[category] || optimal.shopping; // Default to shopping percentage
    });

    return result;
  }

  private calculateAllocationSavings(
    current: Record<string, number>,
    recommended: Record<string, number>,
    totalSpending: number
  ): number {
    let potentialSavings = 0;

    Object.entries(current).forEach(([category, currentAmount]) => {
      const recommendedPercentage = recommended[category] || 10;
      const recommendedAmount = (recommendedPercentage / 100) * totalSpending;

      if (currentAmount > recommendedAmount) {
        potentialSavings += currentAmount - recommendedAmount;
      }
    });

    return potentialSavings;
  }

  private generateAllocationReasoning(
    current: Record<string, number>,
    recommended: Record<string, number>
  ): string[] {
    const reasoning: string[] = [];

    Object.entries(current).forEach(([category, currentPerc]) => {
      const recommendedPerc = recommended[category];
      if (currentPerc > recommendedPerc + 5) {
        reasoning.push(
          `Consider reducing ${category} spending from ${currentPerc.toFixed(1)}% to ${recommendedPerc.toFixed(1)}%`
        );
      }
    });

    return reasoning;
  }

  private createPersonalizedPlan(
    userId: string,
    monthlyIncome: number,
    expenses: any[],
    profile: any,
    userSettings: any,
    options: any
  ): PersonalizedBudgetPlan {
    const categorySpending = this.groupByCategory(expenses);
    const riskTolerance = options.riskTolerance || profile?.risk_tolerance || 'moderate';

    // Calculate recommended allocations based on income
    const recommendedAllocations = this.calculateIncomeBasedAllocations(
      monthlyIncome,
      categorySpending,
      riskTolerance
    );

    // Generate savings goals
    const savingsGoals = this.generateSavingsGoals(monthlyIncome, profile, options);

    // Calculate spending limits
    const spendingLimits = this.calculateSpendingLimits(recommendedAllocations);

    // Emergency fund recommendation
    const emergencyFund = this.calculateEmergencyFund(monthlyIncome, expenses, riskTolerance);

    return {
      user_id: userId,
      plan_date: new Date().toISOString(),
      monthly_income: monthlyIncome,
      recommended_allocations: recommendedAllocations,
      savings_goals: savingsGoals,
      spending_limits: spendingLimits,
      emergency_fund: emergencyFund
    };
  }

  private calculateIncomeBasedAllocations(
    monthlyIncome: number,
    categorySpending: Record<string, any[]>,
    riskTolerance: string
  ) {
    const allocations = [];
    const baseAllocations = {
      housing: { percentage: 30, reasoning: 'Housing should be 25-30% of income' },
      transportation: { percentage: 15, reasoning: 'Transportation costs including car payments, gas, insurance' },
      food: { percentage: 12, reasoning: 'Groceries and dining out' },
      utilities: { percentage: 8, reasoning: 'Electricity, water, internet, phone' },
      entertainment: { percentage: 8, reasoning: 'Recreation and entertainment' },
      healthcare: { percentage: 5, reasoning: 'Medical expenses and insurance' },
      savings: { percentage: 20, reasoning: 'Emergency fund and long-term savings' },
      miscellaneous: { percentage: 2, reasoning: 'Other expenses' }
    };

    // Adjust based on risk tolerance
    if (riskTolerance === 'conservative') {
      baseAllocations.savings.percentage = 25;
      baseAllocations.entertainment.percentage = 5;
    } else if (riskTolerance === 'aggressive') {
      baseAllocations.savings.percentage = 15;
      baseAllocations.entertainment.percentage = 10;
    }

    Object.entries(baseAllocations).forEach(([category, config]) => {
      allocations.push({
        category,
        percentage: config.percentage,
        amount: (monthlyIncome * config.percentage) / 100,
        reasoning: config.reasoning
      });
    });

    return allocations;
  }

  private generateSavingsGoals(monthlyIncome: number, profile: any, options: any) {
    const goals = [];
    const savingsCapacity = monthlyIncome * 0.2; // 20% for savings

    // Emergency fund goal
    goals.push({
      name: 'Emergency Fund',
      target_amount: monthlyIncome * 6, // 6 months of expenses
      target_date: addDays(new Date(), 365).toISOString(), // 1 year
      monthly_contribution: savingsCapacity * 0.5,
      progress_percentage: 0
    });

    // Additional goals based on user preferences
    if (options.primaryGoals?.includes('vacation')) {
      goals.push({
        name: 'Vacation Fund',
        target_amount: 3000,
        target_date: addDays(new Date(), 180).toISOString(), // 6 months
        monthly_contribution: savingsCapacity * 0.3,
        progress_percentage: 0
      });
    }

    return goals;
  }

  private calculateSpendingLimits(recommendedAllocations: any[]) {
    return recommendedAllocations
      .filter(alloc => alloc.category !== 'savings')
      .map(alloc => ({
        category: alloc.category,
        limit: alloc.amount,
        warning_threshold: alloc.amount * 0.8, // 80% warning
        reasoning: `Based on recommended ${alloc.percentage}% allocation`
      }));
  }

  private calculateEmergencyFund(monthlyIncome: number, expenses: any[], riskTolerance: string) {
    const monthlyExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0) / 6; // Average monthly
    const recommendedMonths = riskTolerance === 'conservative' ? 8 : riskTolerance === 'aggressive' ? 4 : 6;

    return {
      current_amount: 0, // Would need to fetch from savings accounts
      recommended_amount: monthlyExpenses * recommendedMonths,
      monthly_contribution: monthlyIncome * 0.1 // 10% of income
    };
  }

  private assessFinancialRisk(expenses: any[], monthlyIncome: number, profile: any) {
    const monthlyExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0) / 6;
    const savingsRate = (monthlyIncome - monthlyExpenses) / monthlyIncome;

    let healthScore = 70; // Base score
    const riskFactors = [];
    const mitigationStrategies = [];

    // Analyze savings rate
    if (savingsRate < 0.1) {
      healthScore -= 20;
      riskFactors.push('Low savings rate (less than 10%)');
      mitigationStrategies.push('Increase monthly savings to at least 10% of income');
    }

    // Analyze spending volatility
    const monthlySpending = this.groupByTimePeriod(expenses, 'month');
    const spendingAmounts = Object.values(monthlySpending).map(
      expenses => expenses.reduce((sum, exp) => sum + exp.amount, 0)
    );
    const spendingVolatility = this.calculateStandardDeviation(spendingAmounts);

    if (spendingVolatility > monthlyExpenses * 0.3) {
      healthScore -= 15;
      riskFactors.push('High spending volatility');
      mitigationStrategies.push('Create a more consistent monthly budget');
    }

    return {
      financial_health_score: Math.max(0, Math.min(100, healthScore)),
      risk_factors: riskFactors,
      mitigation_strategies: mitigationStrategies
    };
  }

  private estimateIncomeFromSpending(expenses: any[]): number {
    const monthlySpending = expenses.reduce((sum, exp) => sum + exp.amount, 0) / 6;
    // Estimate income as spending / 0.8 (assuming 80% spending rate)
    return monthlySpending / 0.8;
  }
}

// Export singleton instance
export const aiBudgetAssistant = new AIBudgetAssistant();