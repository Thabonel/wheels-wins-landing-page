/**
 * Edge Functions Client
 *
 * Fast lane for PAM queries that don't need full Claude intelligence.
 * Routes specific queries to Supabase Edge Functions for 3-5x faster responses.
 *
 * Performance:
 * - Edge Functions: <300ms (cached database queries)
 * - Full PAM: ~1.7s (Claude Sonnet 4.5)
 *
 * Use Cases:
 * - Spending summaries ("How much did I spend this month?")
 * - Expense creation ("Add $50 gas expense")
 * - Fuel estimates ("How much for 450km trip?")
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Spending summary response from Edge Function
 */
export interface SpendSummaryResponse {
  current_month: string;
  total: number;
  by_category: Array<{
    category: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  vs_last_month: number;
  top_expense: {
    amount: number;
    description: string;
    date: string;
  } | null;
  trend_7d: number[];
  budget_remaining: number | null;
}

/**
 * Expense creation request
 */
export interface CreateExpenseRequest {
  amount: number;
  category: string;
  description?: string;
  date?: string; // YYYY-MM-DD format
}

/**
 * Expense creation response from Edge Function
 */
export interface CreateExpenseResponse {
  success: boolean;
  expense: {
    id: number;
    user_id: string;
    amount: number;
    category: string;
    date: string;
    description: string | null;
    created_at: string;
  };
  message: string;
  budget_status?: {
    category: string;
    spent: number;
    limit: number;
    remaining: number;
    percentage_used: number;
  };
}

/**
 * Fuel estimate request
 */
export interface FuelEstimateRequest {
  distance_km: number;
  fuel_efficiency_l_per_100km: number;
  fuel_price_per_liter: number;
}

/**
 * Fuel estimate response from Edge Function
 */
export interface FuelEstimateResponse {
  distance_km: number;
  fuel_needed_liters: number;
  estimated_cost: number;
  fuel_price_per_liter: number;
  fuel_efficiency: number;
  calculation: {
    formula: string;
    steps: string[];
  };
}

/**
 * Error response from Edge Functions
 */
export interface EdgeFunctionError {
  error: string;
  code?: string;
  details?: Record<string, any>;
}

/**
 * Get spending summary for current month
 *
 * Fast lane: Cached database query, <200ms response
 */
export async function getSpendingSummary(): Promise<SpendSummaryResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pam-spend-summary`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error: EdgeFunctionError = await response.json();
    throw new Error(error.error || 'Failed to fetch spending summary');
  }

  return response.json();
}

/**
 * Create a new expense
 *
 * Fast lane: Validated insert with budget checking, <300ms response
 */
export async function createExpense(
  request: CreateExpenseRequest
): Promise<CreateExpenseResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pam-expense-create`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error: EdgeFunctionError = await response.json();
    throw new Error(error.error || 'Failed to create expense');
  }

  return response.json();
}

/**
 * Estimate fuel cost for a trip
 *
 * Fast lane: Pure computation, <100ms response
 */
export async function estimateFuelCost(
  request: FuelEstimateRequest
): Promise<FuelEstimateResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pam-fuel-estimate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error: EdgeFunctionError = await response.json();
    throw new Error(error.error || 'Failed to estimate fuel cost');
  }

  return response.json();
}

/**
 * Helper: Check if a query should use Edge Functions (fast lane)
 *
 * Returns the appropriate Edge Function name if it should be routed,
 * otherwise returns null to indicate full PAM processing is needed.
 */
export function shouldUseEdgeFunction(userMessage: string): string | null {
  const message = userMessage.toLowerCase();

  // Spending summary patterns
  if (
    message.includes('how much') &&
    (message.includes('spent') || message.includes('spending'))
  ) {
    return 'pam-spend-summary';
  }

  if (
    message.includes('spending summary') ||
    message.includes('spending report') ||
    message.includes('expense summary')
  ) {
    return 'pam-spend-summary';
  }

  // Expense creation patterns
  if (
    (message.includes('add') || message.includes('log') || message.includes('record')) &&
    (message.includes('expense') || message.includes('spent') || message.includes('paid'))
  ) {
    return 'pam-expense-create';
  }

  // Fuel estimate patterns
  if (
    (message.includes('fuel cost') || message.includes('gas cost')) &&
    (message.includes('estimate') || message.includes('calculate'))
  ) {
    return 'pam-fuel-estimate';
  }

  if (message.includes('how much fuel') || message.includes('how much gas')) {
    return 'pam-fuel-estimate';
  }

  // Default: use full PAM processing
  return null;
}
