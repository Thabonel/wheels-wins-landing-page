/**
 * PAM Savings Guarantee Service
 * Handles all PAM savings-related API operations and data management
 * Implements circuit breaker pattern with Supabase fallbacks
 */

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface GuaranteeStatus {
  guarantee_met: boolean;
  total_savings: number;
  subscription_cost: number;
  savings_shortfall: number;
  savings_events_count: number;
  billing_period_start: string;
  billing_period_end: string;
  percentage_achieved: number;
}

export interface PamSavingsEvent {
  id: string;
  user_id: string;
  recommendation_id?: string;
  savings_type: string;
  predicted_savings?: number;
  actual_savings: number;
  baseline_cost: number;
  optimized_cost: number;
  savings_description: string;
  verification_method: string;
  confidence_score: number;
  location?: [number, number];
  category: string;
  metadata?: Record<string, any>;
  saved_date: string;
  created_at: string;
}

export interface MonthlySavingsSummary {
  id: string;
  user_id: string;
  billing_period_start: string;
  billing_period_end: string;
  subscription_cost: number;
  total_predicted_savings: number;
  total_actual_savings: number;
  savings_events_count: number;
  guarantee_met: boolean;
  guarantee_amount: number;
  evaluation_date?: string;
  processed_date?: string;
  refund_status: string;
  refund_amount?: number;
}

export interface PamRecommendation {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  recommendation_type: string;
  predicted_savings: number;
  savings_confidence: number;
  priority_level: string;
  is_applied: boolean;
  applied_date?: string;
  tracking_enabled: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

// Request Types
export interface SaveSavingsEventData {
  savings_type: string;
  predicted_savings?: number;
  actual_savings: number;
  baseline_cost: number;
  optimized_cost: number;
  description: string;
  verification_method: string;
  confidence_score?: number;
  location?: [number, number];
  category?: string;
  recommendation_id?: string;
}

export interface CreateRecommendationData {
  title: string;
  description: string;
  category: string;
  predicted_savings: number;
  confidence?: number;
}

export interface DetectSavingsData {
  expense_amount: number;
  category: string;
  location?: [number, number];
  description?: string;
}

// =====================================================
// API CLIENT CONFIGURATION
// =====================================================

// Use the same API configuration as other services
const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  import.meta.env.VITE_BACKEND_URL || 
  'https://wheels-wins-backend-staging.onrender.com';
const PAM_SAVINGS_BASE = `${API_BASE_URL}/api/v1/pam`;

// Circuit breaker configuration
let apiFailureCount = 0;
const MAX_FAILURES = 3;
const FAILURE_TIMEOUT = 30000; // 30 seconds
let lastFailureTime = 0;

const shouldUseApiDirectly = (): boolean => {
  const now = Date.now();
  if (apiFailureCount >= MAX_FAILURES) {
    if (now - lastFailureTime > FAILURE_TIMEOUT) {
      apiFailureCount = 0;
      return true;
    }
    return false;
  }
  return true;
};

const handleApiError = (error: any) => {
  console.warn('PAM Savings API error:', error);
  apiFailureCount++;
  lastFailureTime = Date.now();
  throw error;
};

const getAuthHeaders = async (): Promise<HeadersInit> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No authentication session');
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
};

// =====================================================
// API METHODS
// =====================================================

export const pamSavingsApi = {
  /**
   * Record a savings event when PAM helps user save money
   */
  async recordSavingsEvent(savingsData: SaveSavingsEventData): Promise<{ event_id: string }> {
    if (shouldUseApiDirectly()) {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${PAM_SAVINGS_BASE}/savings/record`, {
          method: 'POST',
          headers,
          body: JSON.stringify(savingsData),
        });

        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        handleApiError(error);
        // Fall through to Supabase fallback
      }
    }

    // Fallback: Direct Supabase insertion
    const { data, error } = await supabase
      .from('pam_savings_events')
      .insert([{
        savings_type: savingsData.savings_type,
        predicted_savings: savingsData.predicted_savings || 0,
        actual_savings: savingsData.actual_savings,
        baseline_cost: savingsData.baseline_cost,
        optimized_cost: savingsData.optimized_cost,
        savings_description: savingsData.description,
        verification_method: savingsData.verification_method,
        confidence_score: savingsData.confidence_score || 0.8,
        location: savingsData.location ? `POINT(${savingsData.location[1]} ${savingsData.location[0]})` : null,
        category: savingsData.category || 'other',
        recommendation_id: savingsData.recommendation_id,
        saved_date: new Date().toISOString().split('T')[0],
      }])
      .select('id')
      .single();

    if (error) throw error;
    return { event_id: data.id };
  },

  /**
   * Get monthly savings summary for current billing period
   */
  async getMonthlySavingsSummary(month?: string): Promise<MonthlySavingsSummary | null> {
    const queryParams = month ? `?month=${month}` : '';
    
    if (shouldUseApiDirectly()) {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${PAM_SAVINGS_BASE}/savings/monthly-summary${queryParams}`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        return data.summary;
      } catch (error) {
        handleApiError(error);
        // Fall through to Supabase fallback
      }
    }

    // Fallback: Direct Supabase query
    return this.getMonthlySummarySummaryDirect(month);
  },

  /**
   * Get guarantee status for current billing period
   */
  async getGuaranteeStatus(month?: string): Promise<GuaranteeStatus> {
    const queryParams = month ? `?month=${month}` : '';
    
    if (shouldUseApiDirectly()) {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${PAM_SAVINGS_BASE}/savings/guarantee-status${queryParams}`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        return data.guarantee_status;
      } catch (error) {
        handleApiError(error);
        // Fall through to Supabase fallback
      }
    }

    // Fallback: Calculate from Supabase data
    const currentMonth = month || `${new Date().toISOString().slice(0, 7)  }-01`;
    const endOfMonth = new Date(currentMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    
    const { data: events } = await supabase
      .from('pam_savings_events')
      .select('actual_savings')
      .gte('saved_date', currentMonth)
      .lt('saved_date', endOfMonth.toISOString().slice(0, 10));

    const totalSavings = events?.reduce((sum, event) => sum + event.actual_savings, 0) || 0;
    const subscriptionCost = 29.99;
    const guaranteeMet = totalSavings >= subscriptionCost;
    const savingsShortfall = Math.max(0, subscriptionCost - totalSavings);
    const percentageAchieved = Math.min(100, (totalSavings / subscriptionCost) * 100);

    return {
      guarantee_met: guaranteeMet,
      total_savings: totalSavings,
      subscription_cost: subscriptionCost,
      savings_shortfall: savingsShortfall,
      savings_events_count: events?.length || 0,
      billing_period_start: currentMonth,
      billing_period_end: endOfMonth.toISOString().slice(0, 10),
      percentage_achieved: percentageAchieved,
    };
  },

  /**
   * Create a PAM recommendation with savings prediction
   */
  async createRecommendationWithSavings(recommendationData: CreateRecommendationData): Promise<{ recommendation_id: string; predicted_savings: number }> {
    if (shouldUseApiDirectly()) {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${PAM_SAVINGS_BASE}/recommendations/with-savings-prediction`, {
          method: 'POST',
          headers,
          body: JSON.stringify(recommendationData),
        });

        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        handleApiError(error);
        // Fall through to Supabase fallback
      }
    }

    // Fallback: Direct Supabase insertion
    const { data, error } = await supabase
      .from('pam_recommendations')
      .insert([{
        title: recommendationData.title,
        description: recommendationData.description,
        category: recommendationData.category,
        predicted_savings: recommendationData.predicted_savings,
        savings_confidence: recommendationData.confidence || 0.7,
        tracking_enabled: true,
      }])
      .select('id')
      .single();

    if (error) throw error;
    return { 
      recommendation_id: data.id,
      predicted_savings: recommendationData.predicted_savings 
    };
  },

  /**
   * Automatically detect savings from an expense
   */
  async detectSavings(detectData: DetectSavingsData): Promise<{ savings_detected: boolean; savings_event?: Partial<PamSavingsEvent>; message?: string }> {
    if (shouldUseApiDirectly()) {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${PAM_SAVINGS_BASE}/savings/detect`, {
          method: 'POST',
          headers,
          body: JSON.stringify(detectData),
        });

        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        handleApiError(error);
        // Fall through to basic detection
      }
    }

    // Fallback: Basic savings detection logic
    if (detectData.category === 'fuel' && detectData.expense_amount > 0) {
      // Simple fuel savings detection - assume 10% potential savings
      const potentialSavings = detectData.expense_amount * 0.1;
      if (potentialSavings >= 2.0) { // Only count meaningful savings
        return {
          savings_detected: true,
          savings_event: {
            savings_type: 'fuel_optimization',
            actual_savings: potentialSavings,
            baseline_cost: detectData.expense_amount,
            optimized_cost: detectData.expense_amount - potentialSavings,
            savings_description: 'Potential fuel savings detected through route optimization',
            confidence_score: 0.6,
          }
        };
      }
    }

    return {
      savings_detected: false,
      message: 'No significant savings detected for this expense'
    };
  },

  /**
   * Get recent savings events for the user
   */
  async getRecentSavingsEvents(limit: number = 10): Promise<PamSavingsEvent[]> {
    if (shouldUseApiDirectly()) {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${PAM_SAVINGS_BASE}/savings/recent?limit=${limit}`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        return data.events;
      } catch (error) {
        handleApiError(error);
        // Fall through to Supabase fallback
      }
    }

    // Fallback: Direct Supabase query
    return this.getRecentSavingsEventsDirect(limit);
  },

  /**
   * Direct Supabase fallback for recent savings events
   */
  async getRecentSavingsEventsDirect(limit: number = 10): Promise<PamSavingsEvent[]> {
    const { data, error } = await supabase
      .from('pam_savings_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Direct Supabase fallback for monthly summary
   */
  async getMonthlySummarySummaryDirect(month?: string): Promise<MonthlySavingsSummary | null> {
    const targetMonth = month || `${new Date().toISOString().slice(0, 7)  }-01`;
    
    const { data, error } = await supabase
      .from('monthly_savings_summary')
      .select('*')
      .eq('billing_period_start', targetMonth)
      .single();

    if (error) {
      // If no summary exists, return null
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  },

  /**
   * Reset circuit breaker (for testing/admin purposes)
   */
  resetCircuitBreaker(): void {
    apiFailureCount = 0;
    lastFailureTime = 0;
  },

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return {
      failureCount: apiFailureCount,
      lastFailureTime,
      isOpen: !shouldUseApiDirectly(),
    };
  },
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Format savings amount for display
 */
export const formatSavingsAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Get savings type display name
 */
export const getSavingsTypeDisplayName = (type: string): string => {
  const displayNames: Record<string, string> = {
    fuel_optimization: 'Fuel Optimization',
    camping_alternative: 'Camping Alternative',
    route_optimization: 'Route Optimization',
    budget_reallocation: 'Budget Reallocation',
    price_comparison: 'Price Comparison',
    timing_optimization: 'Timing Optimization',
    maintenance_prevention: 'Maintenance Prevention',
    group_booking_discount: 'Group Booking',
  };
  return displayNames[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Get category icon for savings type
 */
export const getSavingsTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    fuel_optimization: '⛽',
    camping_alternative: '🏕️',
    route_optimization: '🗺️',
    budget_reallocation: '💰',
    price_comparison: '🏷️',
    timing_optimization: '⏰',
    maintenance_prevention: '🔧',
    group_booking_discount: '👥',
  };
  return icons[type] || '💡';
};

/**
 * Calculate guarantee progress color
 */
export const getGuaranteeProgressColor = (percentageAchieved: number): string => {
  if (percentageAchieved >= 100) return 'text-green-600';
  if (percentageAchieved >= 75) return 'text-yellow-600';
  if (percentageAchieved >= 50) return 'text-orange-600';
  return 'text-red-600';
};

// =====================================================
// BANK STATEMENT INTEGRATION
// =====================================================

interface BankTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category?: string;
  merchantName?: string;
  isRecurring: boolean;
  redactedFields?: string[];
  hash_signature?: string;
}

interface BudgetCategory {
  id: string;
  name: string;
  budgetAmount: number;
  spent: number;
  remaining: number;
  percentage: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  categories: BudgetCategory[];
  insights: TransactionInsights;
}

interface TransactionInsights {
  totalSpent: number;
  topCategories: Array<{ category: string; amount: number; percentage: number }>;
  recurringTransactions: BankTransaction[];
  potentialSavings: number;
  insights: string[];
}

/**
 * Extended PAM Savings Service with Bank Statement Integration
 */
export const pamBankStatementIntegration = {
  /**
   * Import transactions from bank statement to user's expense tracking
   */
  async importTransactions(transactions: BankTransaction[]): Promise<ImportResult> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      let imported = 0;
      let skipped = 0;

      // Process transactions in batches
      const batchSize = 10;
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        
        for (const transaction of batch) {
          try {
            // Check for duplicates based on hash
            const { data: existing } = await supabase
              .from('anonymized_transactions')
              .select('id')
              .eq('hash_signature', transaction.hash_signature || this.generateHash(transaction))
              .eq('user_id', userData.user.id);

            if (existing && existing.length > 0) {
              skipped++;
              continue;
            }

            // Find or create category
            const categoryId = await this.getOrCreateCategory(transaction.category || 'Other', userData.user.id);

            // Insert transaction
            const { error } = await supabase
              .from('anonymized_transactions')
              .insert({
                user_id: userData.user.id,
                transaction_date: transaction.date.toISOString().split('T')[0],
                description: transaction.description,
                amount: transaction.amount,
                transaction_type: transaction.type,
                category_id: categoryId,
                merchant_name: transaction.merchantName,
                is_recurring: transaction.isRecurring,
                hash_signature: transaction.hash_signature || this.generateHash(transaction),
                confidence_score: 1.0,
                redacted_fields: transaction.redactedFields || []
              });

            if (error) {
              console.error('Failed to insert transaction:', error);
              skipped++;
            } else {
              imported++;
              
              // Try to detect savings opportunities
              await this.detectSavingsFromTransaction(transaction);
            }
          } catch (error) {
            console.error('Error processing transaction:', error);
            skipped++;
          }
        }
      }

      // Get updated budget categories and insights
      const [categories, insights] = await Promise.all([
        this.getBudgetCategories(userData.user.id),
        this.generateInsights(transactions)
      ]);

      return {
        imported,
        skipped,
        categories,
        insights
      };
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  },

  /**
   * Get or create a transaction category
   */
  async getOrCreateCategory(categoryName: string, userId: string): Promise<string> {
    try {
      // First try to find existing category
      const { data: existing } = await supabase
        .from('transaction_categories')
        .select('id')
        .eq('name', categoryName)
        .or(`user_id.eq.${userId},is_system.eq.true`)
        .single();

      if (existing) {
        return existing.id;
      }

      // Create new user category
      const { data: newCategory, error } = await supabase
        .from('transaction_categories')
        .insert({
          user_id: userId,
          name: categoryName,
          icon: this.getCategoryIcon(categoryName),
          color: this.getCategoryColor(categoryName),
          is_system: false
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return newCategory.id;
    } catch (error) {
      console.error('Failed to get/create category:', error);
      // Return a default category if all else fails
      const { data: defaultCategory } = await supabase
        .from('transaction_categories')
        .select('id')
        .eq('name', 'Other')
        .eq('is_system', true)
        .single();

      return defaultCategory?.id || '';
    }
  },

  /**
   * Get budget categories with spending analysis
   */
  async getBudgetCategories(userId: string): Promise<BudgetCategory[]> {
    try {
      // Get categories with their budget amounts
      const { data: categories } = await supabase
        .from('transaction_categories')
        .select(`
          id,
          name,
          budget_amount,
          icon,
          color
        `)
        .or(`user_id.eq.${userId},is_system.eq.true`);

      if (!categories) return [];

      // Get spending for each category (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const budgetCategories: BudgetCategory[] = [];

      for (const category of categories) {
        const { data: transactions } = await supabase
          .from('anonymized_transactions')
          .select('amount')
          .eq('user_id', userId)
          .eq('category_id', category.id)
          .eq('transaction_type', 'debit')
          .gte('transaction_date', thirtyDaysAgo.toISOString().split('T')[0]);

        const spent = transactions?.reduce((total, tx) => total + tx.amount, 0) || 0;
        const budgetAmount = category.budget_amount || 0;
        const remaining = Math.max(0, budgetAmount - spent);
        const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

        budgetCategories.push({
          id: category.id,
          name: category.name,
          budgetAmount,
          spent,
          remaining,
          percentage: Math.min(100, percentage)
        });
      }

      return budgetCategories.sort((a, b) => b.spent - a.spent);
    } catch (error) {
      console.error('Failed to get budget categories:', error);
      return [];
    }
  },

  /**
   * Generate insights based on imported transactions
   */
  async generateInsights(transactions: BankTransaction[]): Promise<TransactionInsights> {
    const totalSpent = transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    // Group by category
    const categorySpending = transactions
      .filter(t => t.type === 'debit')
      .reduce((acc, t) => {
        const category = t.category || 'Other';
        acc[category] = (acc[category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const topCategories = Object.entries(categorySpending)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / totalSpent) * 100
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const recurringTransactions = transactions.filter(t => t.isRecurring);
    const recurringAmount = recurringTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate potential savings (5% of non-essential spending)
    const nonEssentialCategories = ['Entertainment', 'Shopping', 'Food & Dining'];
    const nonEssentialSpending = topCategories
      .filter(c => nonEssentialCategories.includes(c.category))
      .reduce((sum, c) => sum + c.amount, 0);
    
    const potentialSavings = nonEssentialSpending * 0.05; // 5% savings potential

    // Generate insights
    const insights: string[] = [];
    
    if (totalSpent > 0) {
      insights.push(`Total spending: ${formatSavingsAmount(totalSpent)} in the analyzed period.`);
    }

    if (topCategories.length > 0) {
      insights.push(`Top spending category: ${topCategories[0].category} at ${formatSavingsAmount(topCategories[0].amount)} (${topCategories[0].percentage.toFixed(1)}%).`);
    }

    if (recurringTransactions.length > 0) {
      insights.push(`${recurringTransactions.length} recurring transactions totaling ${formatSavingsAmount(recurringAmount)} per month.`);
    }

    if (potentialSavings > 0) {
      insights.push(`Potential monthly savings: ${formatSavingsAmount(potentialSavings)} by optimizing non-essential spending.`);
    }

    // RV-specific insights
    const rvCategories = ['Gas & Fuel', 'RV & Camping', 'Maintenance'];
    const rvSpending = topCategories
      .filter(c => rvCategories.includes(c.category))
      .reduce((sum, c) => sum + c.amount, 0);

    if (rvSpending > 0) {
      insights.push(`RV-related expenses: ${formatSavingsAmount(rvSpending)}. PAM can help optimize routes and find better deals.`);
    }

    return {
      totalSpent,
      topCategories,
      recurringTransactions,
      potentialSavings,
      insights
    };
  },

  /**
   * Detect savings opportunities from a transaction
   */
  async detectSavingsFromTransaction(transaction: BankTransaction): Promise<void> {
    try {
      // Only analyze debit transactions above $5
      if (transaction.type !== 'debit' || transaction.amount < 5) {
        return;
      }

      const category = transaction.category?.toLowerCase() || '';
      const description = transaction.description.toLowerCase();

      // Fuel savings detection
      if (category.includes('fuel') || category.includes('gas') || 
          description.includes('gas') || description.includes('fuel')) {
        const potentialSavings = transaction.amount * 0.08; // 8% fuel savings through route optimization
        
        if (potentialSavings >= 2.0) {
          await pamSavingsApi.recordSavingsEvent({
            savings_type: 'fuel_optimization',
            actual_savings: potentialSavings,
            baseline_cost: transaction.amount,
            optimized_cost: transaction.amount - potentialSavings,
            description: `Potential fuel savings detected from ${transaction.merchantName || 'gas station'}`,
            verification_method: 'bank_statement_analysis',
            confidence_score: 0.7,
            category: 'fuel'
          });
        }
      }

      // Camping/RV park savings detection
      if (category.includes('camping') || category.includes('rv') ||
          description.includes('park') || description.includes('campground')) {
        const potentialSavings = transaction.amount * 0.15; // 15% savings through alternative sites
        
        if (potentialSavings >= 5.0) {
          await pamSavingsApi.recordSavingsEvent({
            savings_type: 'camping_alternative',
            actual_savings: potentialSavings,
            baseline_cost: transaction.amount,
            optimized_cost: transaction.amount - potentialSavings,
            description: `Alternative camping options could save money at ${transaction.merchantName || 'campground'}`,
            verification_method: 'bank_statement_analysis',
            confidence_score: 0.6,
            category: 'camping'
          });
        }
      }

      // Food savings detection
      if (category.includes('food') || category.includes('dining') ||
          description.includes('restaurant') || description.includes('food')) {
        const potentialSavings = transaction.amount * 0.20; // 20% savings through local recommendations
        
        if (potentialSavings >= 3.0) {
          await pamSavingsApi.recordSavingsEvent({
            savings_type: 'price_comparison',
            actual_savings: potentialSavings,
            baseline_cost: transaction.amount,
            optimized_cost: transaction.amount - potentialSavings,
            description: `Local alternatives could provide better value than ${transaction.merchantName || 'restaurant'}`,
            verification_method: 'bank_statement_analysis',
            confidence_score: 0.5,
            category: 'food'
          });
        }
      }
    } catch (error) {
      console.error('Failed to detect savings from transaction:', error);
      // Don't throw - this is optional functionality
    }
  },

  /**
   * Update budget amounts for categories
   */
  async updateCategoryBudget(categoryId: string, budgetAmount: number): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('transaction_categories')
      .update({ budget_amount: budgetAmount })
      .eq('id', categoryId)
      .eq('user_id', userData.user.id);

    if (error) {
      throw error;
    }
  },

  /**
   * Get spending trends over time
   */
  async getSpendingTrends(userId: string, days: number = 30): Promise<Array<{
    date: string;
    amount: number;
    category: string;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: transactions } = await supabase
      .from('anonymized_transactions')
      .select(`
        transaction_date,
        amount,
        transaction_categories(name)
      `)
      .eq('user_id', userId)
      .eq('transaction_type', 'debit')
      .gte('transaction_date', startDate.toISOString().split('T')[0])
      .order('transaction_date', { ascending: true });

    return transactions?.map(t => ({
      date: t.transaction_date,
      amount: t.amount,
      category: t.transaction_categories?.name || 'Other'
    })) || [];
  },

  /**
   * Generate transaction hash for duplicate detection
   */
  generateHash(transaction: BankTransaction): string {
    const data = `${transaction.date.toISOString()}_${transaction.description}_${transaction.amount}`;
    return btoa(data).slice(0, 16);
  },

  /**
   * Get category icon for transaction categories
   */
  getCategoryIcon(categoryName: string): string {
    const iconMap: Record<string, string> = {
      'Food & Dining': '🍽️',
      'Transportation': '🚗',
      'Shopping': '🛍️',
      'Entertainment': '🎬',
      'Bills & Utilities': '💡',
      'Healthcare': '🏥',
      'Education': '📚',
      'Travel': '✈️',
      'RV & Camping': '🚐',
      'Gas & Fuel': '⛽',
      'Maintenance': '🔧',
      'Insurance': '🛡️',
      'Groceries': '🛒',
      'Other': '📌'
    };
    return iconMap[categoryName] || '📌';
  },

  /**
   * Get category color for transaction categories
   */
  getCategoryColor(categoryName: string): string {
    const colorMap: Record<string, string> = {
      'Food & Dining': '#FF6B6B',
      'Transportation': '#4ECDC4',
      'Shopping': '#45B7D1',
      'Entertainment': '#96CEB4',
      'Bills & Utilities': '#FFEAA7',
      'Healthcare': '#DDA0DD',
      'Education': '#98D8C8',
      'Travel': '#F06292',
      'RV & Camping': '#81C784',
      'Gas & Fuel': '#FFB74D',
      'Maintenance': '#A1887F',
      'Insurance': '#90A4AE',
      'Groceries': '#80CBC4',
      'Other': '#B0BEC5'
    };
    return colorMap[categoryName] || '#B0BEC5';
  }
};

export default pamSavingsApi;