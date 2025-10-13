/**
 * PAM Spend Summary Edge Function
 *
 * Returns UI-ready spending summary for the current month with caching.
 *
 * **Performance:**
 * - Target: <200ms response time
 * - Cache: 5 minutes (user-scoped)
 * - Database: Single optimized query with aggregations
 *
 * **Security:**
 * - JWT authentication required
 * - RLS enforced (user can only see their own data)
 * - No service role key used
 *
 * **Usage:**
 * ```typescript
 * const response = await fetch('/functions/v1/pam-spend-summary', {
 *   headers: { Authorization: `Bearer ${token}` }
 * });
 * const data: SpendSummaryResponse = await response.json();
 * ```
 *
 * @author Wheels & Wins Team
 * @version 1.0.0
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { SpendSummaryResponse } from "../_shared/types.ts";
import {
  createAuthenticatedClient,
  requireAuth,
  handleCorsPreflight,
  jsonResponse,
  errorResponse,
  getCacheHeaders,
  getCurrentMonth,
  getPreviousMonth,
  getDaysAgo,
  Logger,
  measurePerformance,
  ValidationError,
  DatabaseError,
  AuthenticationError,
} from "../_shared/utils.ts";

const logger = new Logger("pam-spend-summary");

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreflight();
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return errorResponse("Method not allowed", {
      status: 405,
      code: "METHOD_NOT_ALLOWED",
    });
  }

  try {
    // Create authenticated client
    const { client } = createAuthenticatedClient(req);

    // Require authentication
    const user = await requireAuth(client);
    logger.info("Request received", { user_id: user.id });

    // Fetch spend summary
    const { result: summary, duration } = await measurePerformance(
      () => fetchSpendSummary(client, user.id),
      "fetchSpendSummary"
    );

    logger.info("Summary generated", {
      user_id: user.id,
      total: summary.total,
      categories: summary.by_category.length,
      duration_ms: duration,
    });

    // Return with caching (5 minutes)
    return jsonResponse(summary, {
      cache: getCacheHeaders("short"),
    });
  } catch (error) {
    logger.error("Error generating spend summary", {
      error: error.message,
      stack: error.stack,
    });

    if (error instanceof AuthenticationError) {
      return errorResponse(error.message, {
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    if (error instanceof ValidationError) {
      return errorResponse(error.message, {
        status: 400,
        code: "VALIDATION_ERROR",
      });
    }

    if (error instanceof DatabaseError) {
      return errorResponse("Database error occurred", {
        status: 500,
        code: "DATABASE_ERROR",
        details: { message: error.message },
      });
    }

    // Generic error
    return errorResponse("Internal server error", {
      status: 500,
      code: "INTERNAL_ERROR",
    });
  }
});

/**
 * Fetch spend summary for user
 * Optimized single-query approach with aggregations
 */
async function fetchSpendSummary(
  client: any,
  userId: string
): Promise<SpendSummaryResponse> {
  const currentMonth = getCurrentMonth();
  const previousMonth = getPreviousMonth();
  const sevenDaysAgo = getDaysAgo(7);
  const today = getDaysAgo(0);

  // Parallel queries for better performance
  const [
    { data: expenses, error: expensesError },
    { data: previousMonthExpenses, error: previousError },
    { data: budgets, error: budgetsError }
  ] = await Promise.all([
    // Current month expenses
    client
      .from("expenses")
      .select("amount, category, date, description")
      .eq("user_id", userId)
      .gte("date", `${currentMonth}-01`)
      .order("amount", { ascending: false }),

    // Previous month expenses for comparison
    client
      .from("expenses")
      .select("amount")
      .eq("user_id", userId)
      .gte("date", `${previousMonth}-01`)
      .lt("date", `${currentMonth}-01`),

    // Budget limits
    client
      .from("budgets")
      .select("category, monthly_limit")
      .eq("user_id", userId)
  ]);

  if (expensesError) {
    throw new DatabaseError("Failed to fetch expenses", expensesError);
  }

  if (previousError) {
    throw new DatabaseError(
      "Failed to fetch previous month data",
      previousError
    );
  }

  if (budgetsError) {
    logger.warn("Failed to fetch budgets (non-critical)", {
      error: budgetsError,
    });
  }

  // Calculate totals
  const currentTotal = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  const previousTotal =
    previousMonthExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

  // Calculate percentage change
  const vsLastMonth =
    previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : 0;

  // Group by category
  const categoryMap = new Map<
    string,
    { amount: number; count: number }
  >();

  expenses?.forEach((expense) => {
    const category = expense.category || "other";
    const existing = categoryMap.get(category) ?? { amount: 0, count: 0 };
    categoryMap.set(category, {
      amount: existing.amount + Number(expense.amount),
      count: existing.count + 1,
    });
  });

  // Convert to array and calculate percentages
  const byCategory = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: currentTotal > 0 ? (data.amount / currentTotal) * 100 : 0,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount); // Sort by amount descending

  // Find top expense
  const topExpense = expenses && expenses.length > 0
    ? {
        amount: Number(expenses[0].amount),
        description: expenses[0].description || "No description",
        date: expenses[0].date,
      }
    : null;

  // Calculate 7-day trend
  const trend7d: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = getDaysAgo(i);
    const dayTotal = expenses
      ?.filter((e) => e.date === date)
      .reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
    trend7d.push(dayTotal);
  }

  // Calculate budget remaining (sum of all category budgets minus spent)
  let budgetRemaining: number | null = null;
  if (budgets && budgets.length > 0) {
    const totalBudget = budgets.reduce(
      (sum, b) => sum + Number(b.monthly_limit),
      0
    );
    budgetRemaining = totalBudget - currentTotal;
  }

  // Return summary
  return {
    current_month: currentMonth,
    total: currentTotal,
    by_category: byCategory,
    vs_last_month: vsLastMonth,
    top_expense: topExpense,
    trend_7d: trend7d,
    budget_remaining: budgetRemaining,
  };
}
