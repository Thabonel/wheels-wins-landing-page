import { supabase } from '../../integrations/supabase/client';
import { addDays, subDays, startOfMonth, endOfMonth, differenceInDays, format } from 'date-fns';
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
    current_spent: number;
    days_remaining: number;
    projected_overspend: number;
  }[];
  insights: SmartBudgetInsight[];
  recommendations: BudgetRecommendation[];
  confidence_level: number;
}

interface SpendingAlert {
  alert_id: string;
  user_id: string;
  type: 'overspending' | 'unusual_pattern' | 'goal_at_risk' | 'saving_opportunity' | 'budget_variance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  category?: string;
  amount?: number;
  created_at: string;
  expires_at: string;
  actions: {
    label: string;
    action: string;
    data: any;
  }[];
  is_read: boolean;
  is_dismissed: boolean;
}

export class AIBudgetAssistant {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours
  private readonly INSIGHTS_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any, customTtl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: customTtl || this.CACHE_TTL
    });
  }

  async generatePersonalizedBudgetPlan(userId: string, options: {
    include_forecasting?: boolean;
    include_behavior_analysis?: boolean;
    planning_horizon_months?: number;
  } = {}): Promise<PersonalizedBudgetPlan | null> {
    const {
      include_forecasting = true,
      include_behavior_analysis = true,
      planning_horizon_months = 3
    } = options;

    const cacheKey = `budget_plan_${userId}_${planning_horizon_months}`;
    const cached = this.getCachedData<PersonalizedBudgetPlan>(cacheKey);
    if (cached) return cached;

    try {
      // Get user's financial data
      const financialData = await this.getUserFinancialData(userId);
      if (!financialData) return null;

      // Get spending patterns
      const spendingPatterns = await this.analyzeSpendingPatterns(userId);

      // Get behavior insights if requested
      const behaviorInsights = include_behavior_analysis
        ? await userBehaviorAnalytics.getUserEngagementMetrics(userId)
        : null;

      // Get financial forecast if requested
      const forecast = include_forecasting
        ? await financialForecastingEngine.generateForecast(userId, { period_type: 'month', periods_ahead: planning_horizon_months })
        : null;

      // Generate budget allocations
      const recommendedAllocations = this.generateBudgetAllocations(financialData, spendingPatterns, behaviorInsights);

      // Generate savings goals
      const savingsGoals = await this.generateSavingsGoals(userId, financialData, forecast);

      // Generate spending limits
      const spendingLimits = this.generateSpendingLimits(financialData, spendingPatterns, forecast);

      // Generate insights
      const insights = await this.generateBudgetInsights(userId, financialData, spendingPatterns, forecast);

      // Generate recommendations
      const recommendations = await this.generateBudgetRecommendations(userId, financialData, spendingPatterns, behaviorInsights);

      // Calculate confidence level
      const confidenceLevel = this.calculatePlanConfidence(financialData, spendingPatterns, behaviorInsights);

      const budgetPlan: PersonalizedBudgetPlan = {
        user_id: userId,
        plan_date: new Date().toISOString(),
        monthly_income: financialData.monthly_income,
        recommended_allocations: recommendedAllocations,
        savings_goals: savingsGoals,
        spending_limits: spendingLimits,
        insights: insights,
        recommendations: recommendations,
        confidence_level: confidenceLevel
      };

      this.setCachedData(cacheKey, budgetPlan);
      return budgetPlan;

    } catch (error) {
      console.error('Error generating personalized budget plan:', error);
      return null;
    }
  }

  private async getUserFinancialData(userId: string) {
    // Get current income
    const { data: incomeData } = await supabase
      .from('user_income')
      .select('amount, frequency')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    // Get recent expenses (last 3 months)
    const threeMonthsAgo = subDays(new Date(), 90);
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('date', threeMonthsAgo.toISOString())
      .order('date', { ascending: false });

    // Get current budgets
    const { data: budgetsData } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    // Calculate monthly income
    const monthlyIncome = incomeData
      ? this.normalizeToMonthlyAmount(incomeData.amount, incomeData.frequency)
      : 0;

    return {
      monthly_income: monthlyIncome,
      recent_expenses: expensesData || [],
      current_budgets: budgetsData || [],
      total_monthly_spending: this.calculateMonthlySpending(expensesData || [])
    };
  }

  private normalizeToMonthlyAmount(amount: number, frequency: string): number {
    switch (frequency) {
      case 'weekly': return amount * 4.33;
      case 'bi-weekly': return amount * 2.17;
      case 'monthly': return amount;
      case 'quarterly': return amount / 3;
      case 'yearly': return amount / 12;
      default: return amount;
    }
  }

  private calculateMonthlySpending(expenses: any[]): number {
    if (expenses.length === 0) return 0;

    // Group expenses by month and calculate average
    const monthlyTotals: Record<string, number> = {};

    expenses.forEach(expense => {
      const monthKey = format(new Date(expense.date), 'yyyy-MM');
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + expense.amount;
    });

    const totals = Object.values(monthlyTotals);
    return totals.reduce((sum, total) => sum + total, 0) / totals.length;
  }

  private async analyzeSpendingPatterns(userId: string) {
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('date', subDays(new Date(), 90).toISOString())
      .order('date', { ascending: false });

    if (!expenses || expenses.length === 0) {
      return { categoryBreakdown: {}, trends: {}, anomalies: [] };
    }

    // Calculate category breakdown
    const categoryBreakdown: Record<string, { total: number; count: number; average: number }> = {};
    expenses.forEach(expense => {
      const category = expense.category || 'Other';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { total: 0, count: 0, average: 0 };
      }
      categoryBreakdown[category].total += expense.amount;
      categoryBreakdown[category].count++;
    });

    // Calculate averages
    Object.keys(categoryBreakdown).forEach(category => {
      categoryBreakdown[category].average = categoryBreakdown[category].total / categoryBreakdown[category].count;
    });

    // Analyze trends (simplified)
    const trends = this.calculateSpendingTrends(expenses);

    // Detect anomalies
    const anomalies = this.detectSpendingAnomalies(expenses);

    return { categoryBreakdown, trends, anomalies };
  }

  private calculateSpendingTrends(expenses: any[]): Record<string, number> {
    // Group by category and calculate trend
    const categoryTrends: Record<string, number> = {};

    const categories = [...new Set(expenses.map(e => e.category || 'Other'))];

    categories.forEach(category => {
      const categoryExpenses = expenses.filter(e => (e.category || 'Other') === category);

      if (categoryExpenses.length >= 4) {
        // Calculate simple trend (recent vs older)
        const recent = categoryExpenses.slice(0, Math.floor(categoryExpenses.length / 2));
        const older = categoryExpenses.slice(Math.floor(categoryExpenses.length / 2));

        const recentAvg = recent.reduce((sum, e) => sum + e.amount, 0) / recent.length;
        const olderAvg = older.reduce((sum, e) => sum + e.amount, 0) / older.length;

        categoryTrends[category] = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
      }
    });

    return categoryTrends;
  }

  private detectSpendingAnomalies(expenses: any[]): any[] {
    const anomalies: any[] = [];

    // Group by category
    const categoryGroups: Record<string, any[]> = {};
    expenses.forEach(expense => {
      const category = expense.category || 'Other';
      if (!categoryGroups[category]) categoryGroups[category] = [];
      categoryGroups[category].push(expense);
    });

    // Detect anomalies in each category
    Object.entries(categoryGroups).forEach(([category, categoryExpenses]) => {
      if (categoryExpenses.length < 5) return; // Need enough data

      const amounts = categoryExpenses.map(e => e.amount);
      const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      const stdDev = Math.sqrt(amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length);

      categoryExpenses.forEach(expense => {
        const zScore = Math.abs((expense.amount - mean) / stdDev);
        if (zScore > 2) { // More than 2 standard deviations
          anomalies.push({
            expense_id: expense.id,
            category,
            amount: expense.amount,
            date: expense.date,
            z_score: zScore,
            type: expense.amount > mean ? 'high_spending' : 'low_spending'
          });
        }
      });
    });

    return anomalies.sort((a, b) => b.z_score - a.z_score).slice(0, 10); // Top 10 anomalies
  }

  private generateBudgetAllocations(financialData: any, spendingPatterns: any, behaviorInsights: any | null) {
    const income = financialData.monthly_income;
    const currentSpending = financialData.total_monthly_spending;

    // Base allocation percentages (50/30/20 rule adapted)
    const baseAllocations = [
      { category: 'Housing', percentage: 30, essential: true },
      { category: 'Transportation', percentage: 15, essential: true },
      { category: 'Food', percentage: 12, essential: true },
      { category: 'Utilities', percentage: 8, essential: true },
      { category: 'Insurance', percentage: 5, essential: true },
      { category: 'Savings', percentage: 20, essential: false },
      { category: 'Entertainment', percentage: 5, essential: false },
      { category: 'Shopping', percentage: 3, essential: false },
      { category: 'Other', percentage: 2, essential: false }
    ];

    // Adjust based on actual spending patterns
    const adjustedAllocations = baseAllocations.map(allocation => {
      const categoryData = spendingPatterns.categoryBreakdown[allocation.category];
      const actualPercentage = categoryData ? (categoryData.total / currentSpending) * 100 : 0;

      let adjustedPercentage = allocation.percentage;

      // If user consistently spends more in a category, adjust upward (but cap it)
      if (actualPercentage > allocation.percentage * 1.5 && allocation.essential) {
        adjustedPercentage = Math.min(allocation.percentage * 1.3, actualPercentage);
      }

      // Adjust based on behavior insights
      if (behaviorInsights && behaviorInsights.risk_level === 'high') {
        // More conservative allocations for high-risk users
        if (allocation.category === 'Savings') adjustedPercentage *= 1.2;
        if (!allocation.essential) adjustedPercentage *= 0.8;
      }

      return {
        category: allocation.category,
        percentage: Math.round(adjustedPercentage * 100) / 100,
        amount: Math.round((income * adjustedPercentage) / 100),
        reasoning: this.generateAllocationReasoning(allocation, actualPercentage, adjustedPercentage)
      };
    });

    // Ensure percentages add up to 100%
    const totalPercentage = adjustedAllocations.reduce((sum, alloc) => sum + alloc.percentage, 0);
    if (totalPercentage !== 100) {
      const adjustment = (100 - totalPercentage) / adjustedAllocations.length;
      adjustedAllocations.forEach(alloc => {
        alloc.percentage += adjustment;
        alloc.amount = Math.round((income * alloc.percentage) / 100);
      });
    }

    return adjustedAllocations;
  }

  private generateAllocationReasoning(allocation: any, actualPercentage: number, adjustedPercentage: number): string {
    if (Math.abs(allocation.percentage - adjustedPercentage) < 1) {
      return `Standard ${allocation.percentage}% allocation maintained based on typical spending patterns.`;
    }

    if (adjustedPercentage > allocation.percentage) {
      return `Increased to ${adjustedPercentage}% based on your consistent spending of ${actualPercentage.toFixed(1)}% in this category.`;
    }

    return `Reduced to ${adjustedPercentage}% to optimize your budget and increase savings potential.`;
  }

  private async generateSavingsGoals(userId: string, financialData: any, forecast: any) {
    // Get existing goals
    const { data: existingGoals } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    const income = financialData.monthly_income;
    const disposableIncome = income - financialData.total_monthly_spending;

    const goals = [];

    // Emergency fund goal
    if (!existingGoals?.some(g => g.type === 'emergency_fund')) {
      goals.push({
        name: 'Emergency Fund',
        target_amount: income * 6, // 6 months of income
        target_date: addDays(new Date(), 365).toISOString(), // 1 year
        monthly_contribution: Math.max(100, disposableIncome * 0.3),
        progress_percentage: 0
      });
    }

    // Add existing goals with updated progress
    if (existingGoals) {
      existingGoals.forEach(goal => {
        goals.push({
          name: goal.name,
          target_amount: goal.target_amount,
          target_date: goal.target_date,
          monthly_contribution: goal.monthly_contribution || Math.max(50, disposableIncome * 0.2),
          progress_percentage: Math.min(100, (goal.current_amount / goal.target_amount) * 100)
        });
      });
    }

    return goals;
  }

  private generateSpendingLimits(financialData: any, spendingPatterns: any, forecast: any) {
    const limits = [];
    const currentDate = new Date();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - currentDate.getDate();

    Object.entries(spendingPatterns.categoryBreakdown).forEach(([category, data]: [string, any]) => {
      // Calculate recommended limit (10% buffer on average spending)
      const recommendedLimit = data.average * 1.1;

      // Get current month spending
      const currentMonthStart = startOfMonth(currentDate);
      const currentSpent = data.total; // Simplified - would filter by current month

      // Project overspend based on current trajectory
      const dailyRate = currentSpent / (daysInMonth - daysRemaining);
      const projectedTotal = currentSpent + (dailyRate * daysRemaining);
      const projectedOverspend = Math.max(0, projectedTotal - recommendedLimit);

      limits.push({
        category,
        limit: Math.round(recommendedLimit),
        current_spent: Math.round(currentSpent),
        days_remaining: daysRemaining,
        projected_overspend: Math.round(projectedOverspend)
      });
    });

    return limits.sort((a, b) => b.projected_overspend - a.projected_overspend);
  }

  private async generateBudgetInsights(userId: string, financialData: any, spendingPatterns: any, forecast: any): Promise<SmartBudgetInsight[]> {
    const insights: SmartBudgetInsight[] = [];

    // Spending pattern insights
    Object.entries(spendingPatterns.trends).forEach(([category, trend]: [string, any]) => {
      if (Math.abs(trend) > 20) { // 20% change threshold
        insights.push({
          insight_type: 'spending_pattern',
          title: `${category} Spending ${trend > 0 ? 'Increase' : 'Decrease'}`,
          description: `Your ${category.toLowerCase()} spending has ${trend > 0 ? 'increased' : 'decreased'} by ${Math.abs(trend).toFixed(1)}% compared to previous periods.`,
          data_points: [{ category, trend_percentage: trend }],
          severity: Math.abs(trend) > 50 ? 'critical' : Math.abs(trend) > 30 ? 'warning' : 'info',
          actionable: true,
          related_recommendations: []
        });
      }
    });

    // Budget utilization insight
    const utilizationRate = (financialData.total_monthly_spending / financialData.monthly_income) * 100;
    if (utilizationRate > 80) {
      insights.push({
        insight_type: 'budget_risk',
        title: 'High Budget Utilization',
        description: `You're using ${utilizationRate.toFixed(1)}% of your monthly income. Consider optimizing spending to increase savings.`,
        data_points: [{ utilization_rate: utilizationRate }],
        severity: utilizationRate > 95 ? 'critical' : 'warning',
        actionable: true,
        related_recommendations: []
      });
    }

    // Savings opportunity insight
    const savingsRate = ((financialData.monthly_income - financialData.total_monthly_spending) / financialData.monthly_income) * 100;
    if (savingsRate < 20) {
      insights.push({
        insight_type: 'saving_opportunity',
        title: 'Low Savings Rate',
        description: `Your current savings rate is ${savingsRate.toFixed(1)}%. Financial experts recommend saving at least 20% of income.`,
        data_points: [{ savings_rate: savingsRate, recommended_rate: 20 }],
        severity: savingsRate < 10 ? 'critical' : 'warning',
        actionable: true,
        related_recommendations: []
      });
    }

    return insights;
  }

  private async generateBudgetRecommendations(userId: string, financialData: any, spendingPatterns: any, behaviorInsights: any | null): Promise<BudgetRecommendation[]> {
    const recommendations: BudgetRecommendation[] = [];

    // High spending category recommendation
    const highestSpendingCategory = Object.entries(spendingPatterns.categoryBreakdown)
      .sort(([,a], [,b]) => (b as any).total - (a as any).total)[0];

    if (highestSpendingCategory) {
      const [category, data] = highestSpendingCategory as [string, any];
      recommendations.push({
        id: `optimize_${category.toLowerCase()}`,
        type: 'category_optimization',
        priority: 'high',
        title: `Optimize ${category} Spending`,
        description: `${category} is your highest spending category at $${data.total.toFixed(2)}/month. Consider finding ways to reduce this by 10-15%.`,
        potential_savings: data.total * 0.125, // 12.5% potential savings
        implementation_difficulty: 'medium',
        timeframe: 'short_term',
        category: category,
        specific_actions: [
          `Review all ${category.toLowerCase()} expenses for necessary vs. optional items`,
          'Compare prices and look for alternatives',
          'Set a monthly spending limit for this category'
        ],
        confidence_score: 0.8,
        impact_score: 0.7
      });
    }

    // Emergency fund recommendation
    const emergencyFundRecommendation = await this.checkEmergencyFund(userId, financialData.monthly_income);
    if (emergencyFundRecommendation) {
      recommendations.push(emergencyFundRecommendation);
    }

    // Debt optimization (if applicable)
    const debtRecommendation = await this.analyzeDebtOptimization(userId);
    if (debtRecommendation) {
      recommendations.push(debtRecommendation);
    }

    // Behavioral recommendations based on churn risk
    if (behaviorInsights && behaviorInsights.risk_level === 'high') {
      recommendations.push({
        id: 'engagement_budget',
        type: 'goal_setting',
        priority: 'medium',
        title: 'Set Simple Budget Goals',
        description: 'Start with simple, achievable budget goals to build confidence and engagement with financial planning.',
        potential_savings: 0,
        implementation_difficulty: 'easy',
        timeframe: 'immediate',
        specific_actions: [
          'Set one small daily spending limit',
          'Track expenses for just one category',
          'Celebrate small wins'
        ],
        confidence_score: 0.9,
        impact_score: 0.5
      });
    }

    return recommendations.sort((a, b) => {
      // Sort by priority and impact
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.impact_score - a.impact_score;
    });
  }

  private async checkEmergencyFund(userId: string, monthlyIncome: number): Promise<BudgetRecommendation | null> {
    const { data: emergencyGoal } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'emergency_fund')
      .single();

    const targetAmount = monthlyIncome * 6; // 6 months of income
    const currentAmount = emergencyGoal?.current_amount || 0;

    if (currentAmount < targetAmount * 0.5) { // Less than 50% of target
      return {
        id: 'emergency_fund',
        type: 'goal_setting',
        priority: 'high',
        title: 'Build Emergency Fund',
        description: `You have $${currentAmount.toFixed(2)} in emergency savings. Experts recommend 6 months of income ($${targetAmount.toFixed(2)}).`,
        potential_savings: 0,
        implementation_difficulty: 'medium',
        timeframe: 'long_term',
        specific_actions: [
          'Automatically transfer 10% of income to emergency fund',
          'Use windfalls (tax refunds, bonuses) for emergency fund',
          'Start with a smaller goal of $1,000'
        ],
        confidence_score: 0.9,
        impact_score: 0.9
      };
    }

    return null;
  }

  private async analyzeDebtOptimization(userId: string): Promise<BudgetRecommendation | null> {
    // Get user debts (would integrate with debt tracking system)
    // Simplified implementation
    return null;
  }

  private calculatePlanConfidence(financialData: any, spendingPatterns: any, behaviorInsights: any | null): number {
    let confidence = 70; // Base confidence

    // Increase confidence with more data
    const dataPoints = Object.values(spendingPatterns.categoryBreakdown).reduce((sum: number, cat: any) => sum + cat.count, 0);
    if (dataPoints > 50) confidence += 15;
    else if (dataPoints > 20) confidence += 10;
    else if (dataPoints < 10) confidence -= 20;

    // Income stability
    if (financialData.monthly_income > 0) confidence += 10;
    else confidence -= 30;

    // Spending consistency
    const spendingVariability = Object.values(spendingPatterns.trends).reduce((sum: number, trend: any) => sum + Math.abs(trend), 0) / Object.keys(spendingPatterns.trends).length;
    if (spendingVariability < 20) confidence += 10;
    else if (spendingVariability > 50) confidence -= 15;

    // User engagement
    if (behaviorInsights) {
      if (behaviorInsights.risk_level === 'low') confidence += 10;
      else if (behaviorInsights.risk_level === 'high') confidence -= 10;
    }

    return Math.max(30, Math.min(95, confidence));
  }

  async generateSpendingAlerts(userId: string): Promise<SpendingAlert[]> {
    const alerts: SpendingAlert[] = [];

    try {
      // Get budget plan
      const budgetPlan = await this.generatePersonalizedBudgetPlan(userId);
      if (!budgetPlan) return alerts;

      // Check for overspending alerts
      budgetPlan.spending_limits.forEach(limit => {
        if (limit.projected_overspend > 0) {
          const severity = limit.projected_overspend > limit.limit * 0.5 ? 'critical' :
                          limit.projected_overspend > limit.limit * 0.25 ? 'high' :
                          limit.projected_overspend > limit.limit * 0.1 ? 'medium' : 'low';

          alerts.push({
            alert_id: `overspend_${limit.category}_${Date.now()}`,
            user_id: userId,
            type: 'overspending',
            severity: severity as any,
            title: `${limit.category} Budget Alert`,
            message: `You're projected to overspend by $${limit.projected_overspend.toFixed(2)} in ${limit.category} this month.`,
            category: limit.category,
            amount: limit.projected_overspend,
            created_at: new Date().toISOString(),
            expires_at: endOfMonth(new Date()).toISOString(),
            actions: [
              { label: 'Review Expenses', action: 'view_expenses', data: { category: limit.category } },
              { label: 'Adjust Budget', action: 'edit_budget', data: { category: limit.category } }
            ],
            is_read: false,
            is_dismissed: false
          });
        }
      });

      // Check goal progress alerts
      budgetPlan.savings_goals.forEach(goal => {
        const daysToTarget = differenceInDays(new Date(goal.target_date), new Date());
        const monthsToTarget = daysToTarget / 30;
        const requiredMonthlyContribution = (goal.target_amount * (1 - goal.progress_percentage / 100)) / monthsToTarget;

        if (requiredMonthlyContribution > goal.monthly_contribution * 1.5) {
          alerts.push({
            alert_id: `goal_risk_${goal.name}_${Date.now()}`,
            user_id: userId,
            type: 'goal_at_risk',
            severity: 'medium',
            title: `${goal.name} Goal at Risk`,
            message: `You need to increase contributions to $${requiredMonthlyContribution.toFixed(2)}/month to reach your ${goal.name} goal on time.`,
            amount: requiredMonthlyContribution,
            created_at: new Date().toISOString(),
            expires_at: addDays(new Date(), 30).toISOString(),
            actions: [
              { label: 'Adjust Goal', action: 'edit_goal', data: { goal_name: goal.name } },
              { label: 'Increase Contribution', action: 'increase_contribution', data: { goal_name: goal.name } }
            ],
            is_read: false,
            is_dismissed: false
          });
        }
      });

    } catch (error) {
      console.error('Error generating spending alerts:', error);
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  async getOptimizationSuggestions(userId: string): Promise<{
    quick_wins: BudgetRecommendation[];
    long_term_strategies: BudgetRecommendation[];
    behavioral_insights: string[];
  }> {
    try {
      const budgetPlan = await this.generatePersonalizedBudgetPlan(userId, { include_behavior_analysis: true });
      if (!budgetPlan) {
        return { quick_wins: [], long_term_strategies: [], behavioral_insights: [] };
      }

      // Separate recommendations by timeframe
      const quickWins = budgetPlan.recommendations.filter(rec =>
        rec.timeframe === 'immediate' && rec.implementation_difficulty === 'easy'
      );

      const longTermStrategies = budgetPlan.recommendations.filter(rec =>
        rec.timeframe === 'long_term' || rec.implementation_difficulty === 'hard'
      );

      // Generate behavioral insights
      const behaviorInsights = await userBehaviorAnalytics.getUserEngagementMetrics(userId);
      const behavioralInsightTexts = behaviorInsights ? ['User engagement metrics available'] : [];

      return {
        quick_wins: quickWins.slice(0, 3), // Top 3 quick wins
        long_term_strategies: longTermStrategies.slice(0, 5), // Top 5 strategies
        behavioral_insights: behavioralInsightTexts
      };

    } catch (error) {
      console.error('Error getting optimization suggestions:', error);
      return { quick_wins: [], long_term_strategies: [], behavioral_insights: [] };
    }
  }

  // Memory management
  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0.78 // Placeholder - would track actual hit rate
    };
  }
}

export const aiBudgetAssistant = new AIBudgetAssistant();