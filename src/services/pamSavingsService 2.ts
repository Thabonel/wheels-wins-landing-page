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

export default pamSavingsApi;