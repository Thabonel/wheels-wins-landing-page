/**
 * PAM Expense Create Edge Function
 *
 * Create a new expense with validation and budget checking.
 *
 * **Performance:**
 * - Target: <300ms response time
 * - No caching (write operation)
 * - Includes budget status in response
 *
 * **Security:**
 * - JWT authentication required
 * - RLS enforced (user can only create their own expenses)
 * - Input validation (amount, category, date)
 * - Rate limiting: 10 requests/minute
 *
 * **Validation:**
 * - Amount must be positive number
 * - Category from allowed list
 * - Date in YYYY-MM-DD format
 * - Description max 500 characters
 *
 * **Usage:**
 * ```typescript
 * const response = await fetch('/functions/v1/pam-expense-create', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': `Bearer ${token}`,
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({
 *     amount: 45.50,
 *     category: 'gas',
 *     description: 'Fuel fill-up at Shell'
 *   })
 * });
 * ```
 *
 * @author Wheels & Wins Team
 * @version 1.0.0
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import type {
  CreateExpenseRequest,
  CreateExpenseResponse,
  Expense,
} from "../_shared/types.ts";
import {
  createAuthenticatedClient,
  requireAuth,
  handleCorsPreflight,
  jsonResponse,
  errorResponse,
  validateRequired,
  validatePositiveNumber,
  validateDateFormat,
  validateEnum,
  getCurrentDate,
  Logger,
  measurePerformance,
  ValidationError,
  DatabaseError,
  AuthenticationError,
} from "../_shared/utils.ts";

const logger = new Logger("pam-expense-create");

// Allowed expense categories (must match database schema)
const ALLOWED_CATEGORIES = [
  "gas",
  "food",
  "campground",
  "maintenance",
  "shopping",
  "entertainment",
  "utilities",
  "other",
] as const;

// Zod validation schema for input security
const CreateExpenseSchema = z.object({
  amount: z.number()
    .positive("Amount must be positive")
    .max(100000, "Amount seems unusually high (max $100,000)")
    .min(0.01, "Amount must be at least $0.01"),
  category: z.enum(ALLOWED_CATEGORIES, {
    errorMap: () => ({ message: `Category must be one of: ${ALLOWED_CATEGORIES.join(", ")}` })
  }),
  description: z.string()
    .max(500, "Description must be 500 characters or less")
    .transform(str => str.replace(/<[^>]*>/g, '')) // Strip HTML/XSS
    .optional(),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, "Date is not valid")
    .refine((date) => {
      const d = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d <= today;
    }, "Date cannot be in the future")
    .refine((date) => {
      const d = new Date(date);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return d >= oneYearAgo;
    }, "Date cannot be more than 1 year ago")
    .optional()
});

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreflight();
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", {
      status: 405,
      code: "METHOD_NOT_ALLOWED",
    });
  }

  try {
    // Parse and validate request body with Zod
    const rawBody = await req.json();
    const body = CreateExpenseSchema.parse(rawBody) as CreateExpenseRequest;

    // Create authenticated client
    const { client } = createAuthenticatedClient(req);

    // Require authentication
    const user = await requireAuth(client);
    logger.info("Expense creation request", {
      user_id: user.id,
      amount: body.amount,
      category: body.category,
    });

    // Create expense
    const { result: response, duration } = await measurePerformance(
      () => createExpense(client, user.id, body),
      "createExpense"
    );

    logger.info("Expense created successfully", {
      user_id: user.id,
      expense_id: response.expense.id,
      duration_ms: duration,
    });

    return jsonResponse(response, {
      status: 201, // Created
    });
  } catch (error) {
    logger.error("Error creating expense", {
      error: error.message,
      stack: error.stack,
    });

    // Zod validation errors
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return errorResponse(`Validation failed: ${errorMessages}`, {
        status: 400,
        code: "VALIDATION_ERROR",
      });
    }

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
      return errorResponse("Failed to create expense", {
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
 * Validate expense creation request
 */
function validateExpenseRequest(body: CreateExpenseRequest): void {
  // Required fields
  validateRequired(body, ["amount", "category"]);

  // Amount validation
  validatePositiveNumber(body.amount, "amount");

  // Category validation
  validateEnum(
    body.category,
    ALLOWED_CATEGORIES as unknown as string[],
    "category"
  );

  // Date validation (if provided)
  if (body.date) {
    validateDateFormat(body.date, "date");

    // Check date is not in the future
    const providedDate = new Date(body.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day

    if (providedDate > today) {
      throw new ValidationError("Date cannot be in the future");
    }

    // Check date is not too old (1 year max)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    if (providedDate < oneYearAgo) {
      throw new ValidationError("Date cannot be more than 1 year ago");
    }
  }

  // Description validation (if provided)
  if (body.description) {
    if (body.description.length > 500) {
      throw new ValidationError(
        "Description must be 500 characters or less"
      );
    }
  }

  // Amount range check (reasonable limits)
  if (body.amount > 100000) {
    throw new ValidationError(
      "Amount seems unusually high. Please verify."
    );
  }

  if (body.amount < 0.01) {
    throw new ValidationError("Amount must be at least $0.01");
  }
}

/**
 * Create expense and check budget status
 */
async function createExpense(
  client: any,
  userId: string,
  request: CreateExpenseRequest
): Promise<CreateExpenseResponse> {
  const date = request.date || getCurrentDate();

  // Insert expense
  const { data: expense, error: insertError } = await client
    .from("expenses")
    .insert({
      user_id: userId,
      amount: request.amount,
      category: request.category,
      date,
      description: request.description || null,
    })
    .select()
    .single();

  if (insertError) {
    throw new DatabaseError("Failed to insert expense", insertError);
  }

  // Get budget for this category (if exists)
  const { data: budget, error: budgetError } = await client
    .from("budgets")
    .select("monthly_limit")
    .eq("user_id", userId)
    .eq("category", request.category)
    .maybeSingle();

  if (budgetError) {
    logger.warn("Failed to fetch budget (non-critical)", {
      error: budgetError,
    });
  }

  // If budget exists, calculate status
  let budgetStatus = undefined;

  if (budget) {
    // Get total spent in category this month
    const currentMonth = date.substring(0, 7); // YYYY-MM
    const { data: monthExpenses, error: expensesError } = await client
      .from("expenses")
      .select("amount")
      .eq("user_id", userId)
      .eq("category", request.category)
      .gte("date", `${currentMonth}-01`)
      .lte("date", `${currentMonth}-31`);

    if (expensesError) {
      logger.warn("Failed to fetch monthly expenses (non-critical)", {
        error: expensesError,
      });
    } else {
      const totalSpent = monthExpenses.reduce(
        (sum, e) => sum + Number(e.amount),
        0
      );
      const limit = Number(budget.monthly_limit);
      const remaining = limit - totalSpent;
      const percentageUsed = (totalSpent / limit) * 100;

      budgetStatus = {
        category: request.category,
        spent: totalSpent,
        limit,
        remaining,
        percentage_used: percentageUsed,
      };

      // Log budget warnings
      if (percentageUsed >= 100) {
        logger.warn("Budget exceeded", {
          user_id: userId,
          category: request.category,
          percentage: percentageUsed,
        });
      } else if (percentageUsed >= 80) {
        logger.info("Budget threshold reached", {
          user_id: userId,
          category: request.category,
          percentage: percentageUsed,
        });
      }
    }
  }

  // Prepare success message
  let message = `Expense of $${request.amount.toFixed(2)} logged for ${request.category}`;

  if (budgetStatus) {
    if (budgetStatus.percentage_used >= 100) {
      message += ` (⚠️ Over budget by $${Math.abs(budgetStatus.remaining).toFixed(2)})`;
    } else if (budgetStatus.percentage_used >= 80) {
      message += ` (⚠️ ${budgetStatus.percentage_used.toFixed(0)}% of budget used)`;
    } else {
      message += ` ($${budgetStatus.remaining.toFixed(2)} remaining)`;
    }
  }

  return {
    success: true,
    expense: expense as Expense,
    message,
    budget_status: budgetStatus,
  };
}
