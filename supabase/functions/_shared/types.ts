/**
 * Shared TypeScript types for Supabase Edge Functions
 *
 * These types ensure type safety across all PAM Edge Functions
 * and match the database schema exactly.
 */

// ============================================
// Database Types (match Supabase schema)
// ============================================

export interface Expense {
  id: number;
  user_id: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  description: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: number;
  user_id: string;
  category: string;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
}

export interface SavingsLog {
  id: number;
  user_id: string;
  amount: number;
  description: string;
  category: string | null;
  created_at: string;
}

export interface PamConversation {
  id: string;
  user_id: string;
  session_id: string;
  user_message: string;
  ai_response: string;
  context_data: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface SpendSummaryResponse {
  current_month: string; // YYYY-MM
  total: number;
  by_category: Array<{
    category: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  vs_last_month: number; // % change
  top_expense: {
    amount: number;
    description: string;
    date: string;
  } | null;
  trend_7d: number[]; // Daily totals for last 7 days
  budget_remaining: number | null;
}

export interface CreateExpenseRequest {
  amount: number;
  category: string;
  date?: string; // Optional, defaults to today
  description?: string;
}

export interface CreateExpenseResponse {
  success: boolean;
  expense: Expense;
  message: string;
  budget_status?: {
    category: string;
    spent: number;
    limit: number;
    remaining: number;
    percentage_used: number;
  };
}

export interface FuelEstimateRequest {
  distance_km: number;
  fuel_efficiency_l_per_100km: number;
  fuel_price_per_liter: number;
}

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

// ============================================
// Error Types
// ============================================

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// ============================================
// Auth Types
// ============================================

export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

// ============================================
// Utility Types
// ============================================

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface DateRangeParams {
  start_date?: string;
  end_date?: string;
}

export interface CacheHeaders {
  "Cache-Control": string;
  "CDN-Cache-Control"?: string;
  "Cloudflare-CDN-Cache-Control"?: string;
}
