/**
 * PAM Savings Service
 * Handles all API interactions for the PAM Savings Guarantee system
 */

import { supabase } from '@/integrations/supabase/client';

// Types for savings tracking
export interface PamSavingsEvent {
  id: string;
  user_id: string;
  recommendation_id?: string;
  savings_type: string;
  predicted_savings: number;
  actual_savings: number;
  baseline_cost: number;
  optimized_cost: number;
  savings_description: string;
  verification_method: string;
  confidence_score: number;
  location?: [number, number];
  category: string;
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
}

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

export interface SaveSavingsEventData {
  savings_type: string;
  predicted_savings: number;
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

// Get auth token from Supabase session
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No authentication token available');
  }
  return session.access_token;
}

// PAM Savings API service
export const pamSavingsApi = {
  /**
   * Record a savings event when PAM helps save money
   */
  async recordSavingsEvent(savingsData: SaveSavingsEventData): Promise<{ success: boolean; event_id: string }> {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/v1/pam/savings/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(savingsData)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to record savings event: ${error}`);
      }
      
      const data = await response.json();
      return {
        success: data.success,
        event_id: data.data?.event_id
      };
    } catch (error) {
      console.error('Error recording savings event:', error);
      throw error;
    }
  },

  /**
   * Get monthly savings summary for the current user
   */
  async getMonthlySavingsSummary(month?: string): Promise<MonthlySavingsSummary | null> {
    try {
      const token = await getAuthToken();
      const params = month ? `?month=${month}` : '';
      const response = await fetch(`/api/v1/pam/savings/monthly-summary${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get monthly savings summary: ${error}`);
      }
      
      const data = await response.json();
      return data.summary;
    } catch (error) {
      console.error('Error getting monthly savings summary:', error);
      return null;
    }
  },

  /**
   * Get savings guarantee status for the current billing period
   */
  async getGuaranteeStatus(month?: string): Promise<GuaranteeStatus | null> {
    try {
      const token = await getAuthToken();
      const params = month ? `?month=${month}` : '';
      const response = await fetch(`/api/v1/pam/savings/guarantee-status${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get guarantee status: ${error}`);
      }
      
      const data = await response.json();
      return data.guarantee_status;
    } catch (error) {
      console.error('Error getting guarantee status:', error);
      return null;
    }
  },

  /**
   * Create a PAM recommendation with savings prediction
   */
  async createRecommendationWithSavings(recommendationData: CreateRecommendationData): Promise<{ 
    success: boolean; 
    recommendation_id: string; 
    predicted_savings: number 
  }> {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/v1/pam/recommendations/with-savings-prediction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(recommendationData)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create recommendation: ${error}`);
      }
      
      const data = await response.json();
      return {
        success: data.success,
        recommendation_id: data.data?.recommendation_id,
        predicted_savings: data.data?.predicted_savings
      };
    } catch (error) {
      console.error('Error creating recommendation:', error);
      throw error;
    }
  },

  /**
   * Automatically detect savings from an expense
   */
  async detectSavings(detectData: DetectSavingsData): Promise<{
    savings_detected: boolean;
    savings_event?: {
      event_id: string;
      actual_savings: number;
      baseline_cost: number;
      optimized_cost: number;
      description: string;
      confidence_score: number;
    };
  }> {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/v1/pam/savings/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(detectData)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to detect savings: ${error}`);
      }
      
      const data = await response.json();
      return {
        savings_detected: data.savings_detected,
        savings_event: data.savings_event
      };
    } catch (error) {
      console.error('Error detecting savings:', error);
      return { savings_detected: false };
    }
  },

  /**
   * Get recent savings events for the user
   */
  async getRecentSavingsEvents(limit: number = 10): Promise<PamSavingsEvent[]> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/v1/pam/savings/recent?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get recent savings events: ${error}`);
      }
      
      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('Error getting recent savings events:', error);
      return [];
    }
  },

  /**
   * Get recent savings events directly from Supabase
   * (Fallback method if API is unavailable)
   */
  async getRecentSavingsEventsDirect(limit: number = 10): Promise<PamSavingsEvent[]> {
    try {
      const { data, error } = await supabase
        .from('pam_savings_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        throw new Error(`Failed to get savings events: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting savings events from Supabase:', error);
      return [];
    }
  },

  /**
   * Get monthly summary directly from Supabase
   * (Fallback method if API is unavailable)
   */
  async getMonthlySummarySummaryDirect(month?: string): Promise<MonthlySavingsSummary | null> {
    try {
      const targetMonth = month || new Date().toISOString().substring(0, 7) + '-01';
      
      const { data, error } = await supabase
        .from('monthly_savings_summary')
        .select('*')
        .eq('billing_period_start', targetMonth)
        .single();
      
      if (error) {
        console.error('Error getting monthly summary from Supabase:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting monthly summary:', error);
      return null;
    }
  }
};

// Export convenience functions for common operations
export const recordPamSavings = pamSavingsApi.recordSavingsEvent;
export const getMonthlyGuaranteeStatus = pamSavingsApi.getGuaranteeStatus;
export const detectExpenseSavings = pamSavingsApi.detectSavings;