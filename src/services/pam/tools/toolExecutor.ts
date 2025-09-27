/**
 * PAM Tool Execution Engine
 * Handles routing, validation, execution, and formatting of tool calls from Claude
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';
import { 
  getToolByName, 
  validateToolDefinition,
  type ToolDefinition,
  type ToolInputSchema 
} from './toolRegistry';

// Import tool implementations
import profileTools, { type ToolResponse as ProfileToolResponse } from './profileTools';
import tripTools, { type ToolResponse as TripToolResponse } from './tripTools';
import webSearchTools from './webSearchTools';

// ===================
// WEATHER RESPONSE FUNCTIONS
// ===================

/**
 * Provide weather responses - PAM can answer weather questions like Claude
 */
async function provideWeatherResponse(
  location: string = 'your location',
  type: 'current' | 'forecast' = 'current',
  units: string = 'metric',
  days?: number
): Promise<any> {
  try {
    const targetLocation = location || 'your location';

    if (type === 'current') {
      return {
        success: true,
        data: null,
        formattedResponse: `I don't have access to real-time weather data for ${targetLocation} right now, but I can still help with weather-related questions! Here's what I can provide:

• **General weather guidance**: I can discuss typical weather patterns, seasonal considerations, and climate information for different regions
• **Travel weather advice**: Help you plan trips around seasonal weather, discuss what to pack, or suggest the best times to visit destinations
• **Weather preparedness**: Advice on handling different weather conditions while traveling or at home

For current conditions and specific forecasts, I'd recommend checking weather.com, your weather app, or asking me about general weather patterns for your area.

What specific weather information can I help you with?`
      };
    } else {
      const forecastDays = days || 5;
      return {
        success: true,
        data: null,
        formattedResponse: `I don't have access to real-time ${forecastDays}-day weather forecasts for ${targetLocation}, but here's what I can help you with:

• **For accurate forecasts**: Check weather.com, your phone's weather app, or search "${forecastDays} day weather forecast ${targetLocation}"
• **For trip planning**: I can help you plan routes, estimate costs, and suggest good times to travel
• **For seasonal guidance**: I can provide general seasonal weather patterns for different regions
• **For RV considerations**: I can discuss weather-related travel tips and seasonal campground availability

What aspects of your travel planning can I assist you with today?`
      };
    }
  } catch (error) {
    return {
      success: true,
      data: null,
      formattedResponse: `I'm having trouble accessing weather information right now, but I'm here to help with your travel planning, expense tracking, and other questions. What else can I help you with today?`
    };
  }
}

// ===================
// FINANCIAL TOOL IMPLEMENTATIONS
// ===================

const DEFAULT_EXPENSE_LIMIT = 50;
const MAX_EXPENSE_LIMIT = 1000;

type ExpenseRow = Database['public']['Tables']['expenses']['Row'];
type BudgetRow = Database['public']['Tables']['budgets']['Row'];
type IncomeEntryRow = Database['public']['Tables']['income_entries']['Row'];

async function getUserExpenses(
  userId: string,
  options: {
    start_date?: string;
    end_date?: string;
    category?: string;
    min_amount?: number;
    max_amount?: number;
    limit?: number;
  } = {}
): Promise<FinancialToolResponse<ExpenseToolData>> {
  try {
    logger.debug('Fetching user expenses', { userId, options });

    const appliedLimit = clampNumber(options.limit, 1, MAX_EXPENSE_LIMIT, DEFAULT_EXPENSE_LIMIT);

    let query = supabase
      .from('expenses')
      .select('id, amount, category, date, description, created_at')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (options.start_date) {
      query = query.gte('date', options.start_date);
    }

    if (options.end_date) {
      query = query.lte('date', options.end_date);
    }

    if (options.category) {
      query = query.eq('category', options.category);
    }

    if (typeof options.min_amount === 'number') {
      query = query.gte('amount', options.min_amount);
    }

    if (typeof options.max_amount === 'number') {
      query = query.lte('amount', options.max_amount);
    }

    query = query.limit(appliedLimit);

    const { data, error } = await query;

    if (error) {
      logger.error('Error retrieving expenses from Supabase', error);
      return {
        success: false,
        error: 'Failed to fetch expenses',
        message: 'We were unable to retrieve your expense data. Please try again shortly.'
      };
    }

    const expenseRows = (Array.isArray(data) ? data : []) as ExpenseRow[];

    const expenses: ExpenseRecord[] = expenseRows.map(expense => ({
      id: expense.id,
      amount: Number(expense.amount) || 0,
      category: expense.category || 'uncategorized',
      date: expense.date,
      description: expense.description,
      created_at: expense.created_at
    }));

    const baseResponse: ExpenseToolData = {
      expenses,
      summary: {
        total_amount: 0,
        average_amount: 0,
        transaction_count: 0,
        categories: [],
        date_range: buildDateRangeMetadata(options.start_date, options.end_date)
      },
      metadata: {
        filters: {
          start_date: options.start_date,
          end_date: options.end_date,
          category: options.category,
          min_amount: options.min_amount,
          max_amount: options.max_amount,
          limit: appliedLimit,
          include_default_limit: options.limit === undefined
        },
        expense_count: expenses.length
      }
    };

    if (expenses.length === 0) {
      return {
        success: true,
        data: baseResponse,
        message: 'No expenses found for the specified filters.'
      };
    }

    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const categoryMap = new Map<string, { total: number; count: number }>();

    expenses.forEach(expense => {
      const categoryKey = expense.category || 'uncategorized';
      const entry = categoryMap.get(categoryKey) || { total: 0, count: 0 };
      entry.total += expense.amount;
      entry.count += 1;
      categoryMap.set(categoryKey, entry);
    });

    const categories: ExpenseCategorySummary[] = Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        category,
        total_amount: stats.total,
        transaction_count: stats.count,
        percentage: totalAmount > 0 ? (stats.total / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.total_amount - a.total_amount);

    const derivedStart = options.start_date ?? findDateBoundary(expenses.map(expense => expense.date), 'min');
    const derivedEnd = options.end_date ?? findDateBoundary(expenses.map(expense => expense.date), 'max');

    const highestExpense = expenses.reduce<ExpenseSummary['highest_expense'] | undefined>((current, expense) => {
      if (!current || expense.amount > current.amount) {
        return {
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
          description: expense.description
        };
      }
      return current;
    }, undefined);

    baseResponse.summary = {
      total_amount: totalAmount,
      average_amount: expenses.length > 0 ? totalAmount / expenses.length : 0,
      transaction_count: expenses.length,
      categories,
      date_range: buildDateRangeMetadata(derivedStart, derivedEnd),
      highest_expense: highestExpense
    };

    return {
      success: true,
      data: baseResponse
    };
  } catch (error) {
    logger.error('Unexpected error in getUserExpenses', error);
    return {
      success: false,
      error: 'Unexpected error',
      message: 'Something went wrong while retrieving expenses. Please try again later.'
    };
  }
}

async function getUserBudgets(
  userId: string,
  options: {
    category?: string;
    include_summary?: boolean;
    include_history?: boolean;
  } = {}
): Promise<FinancialToolResponse<BudgetToolData>> {
  try {
    logger.debug('Fetching user budgets', { userId, options });

    const includeHistory = options.include_history ?? false;
    const includeSummary = options.include_summary ?? true;

    let query = supabase
      .from('budgets')
      .select('id, category, name, start_date, end_date, budgeted_amount')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (options.category) {
      query = query.eq('category', options.category);
    }

    if (!includeHistory) {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('end_date', today);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching budgets from Supabase', error);
      return {
        success: false,
        error: 'Failed to fetch budgets',
        message: 'We were unable to retrieve your budgets. Please try again shortly.'
      };
    }

    const budgetRows = (Array.isArray(data) ? data : []) as BudgetRow[];

    const budgets: BudgetRecord[] = budgetRows.map(budget => ({
      id: String(budget.id),
      category: budget.category,
      name: budget.name,
      start_date: budget.start_date,
      end_date: budget.end_date,
      budgeted_amount: Number(budget.budgeted_amount) || 0,
      spent_amount: 0,
      remaining_amount: 0,
      utilization: 0,
      status: 'under_budget'
    }));

    const response: BudgetToolData = {
      budgets,
      metadata: {
        filters: {
          category: options.category,
          include_history: includeHistory,
          include_summary: includeSummary
        }
      }
    };

    if (budgets.length === 0) {
      return {
        success: true,
        data: response,
        message: 'No budgets found for the selected filters.'
      };
    }

    const earliestStart = findDateBoundary(budgets.map(budget => budget.start_date), 'min');
    const latestEnd = findDateBoundary(budgets.map(budget => budget.end_date), 'max');

    let relatedExpenses: ExpenseRecord[] = [];
    try {
      let expenseQuery = supabase
        .from('expenses')
        .select('id, amount, category, date, description')
        .eq('user_id', userId);

      if (earliestStart) {
        expenseQuery = expenseQuery.gte('date', earliestStart);
      }

      if (latestEnd) {
        expenseQuery = expenseQuery.lte('date', latestEnd);
      }

      const { data: expenseData, error: expenseError } = await expenseQuery;

      if (!expenseError && expenseData) {
        const expenseRows = (Array.isArray(expenseData) ? expenseData : []) as ExpenseRow[];

        relatedExpenses = expenseRows.map(expense => ({
          id: expense.id || `${expense.category}-${expense.date}`,
          amount: Number(expense.amount) || 0,
          category: expense.category || 'uncategorized',
          date: expense.date,
          description: expense.description
        }));
      } else if (expenseError) {
        logger.warn('Unable to fetch related expenses for budgets', expenseError);
      }
    } catch (expenseFetchError) {
      logger.warn('Unexpected error loading expenses for budget summaries', expenseFetchError);
    }

    budgets.forEach(budget => {
      const relevantExpenses = relatedExpenses.filter(expense => {
        if (budget.category && expense.category !== budget.category) {
          return false;
        }

        if (budget.start_date && expense.date < budget.start_date) {
          return false;
        }

        if (budget.end_date && expense.date > budget.end_date) {
          return false;
        }

        return true;
      });

      const spentAmount = relevantExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const remainingAmount = budget.budgeted_amount - spentAmount;
      const utilization = budget.budgeted_amount > 0 ? (spentAmount / budget.budgeted_amount) * 100 : 0;

      let status: BudgetRecord['status'] = 'under_budget';
      if (utilization >= 100.5) {
        status = 'over_budget';
      } else if (utilization >= 85) {
        status = 'near_limit';
      }

      budget.spent_amount = spentAmount;
      budget.remaining_amount = remainingAmount;
      budget.utilization = utilization;
      budget.status = status;
    });

    if (includeSummary) {
      const totalBudgeted = budgets.reduce((sum, budget) => sum + budget.budgeted_amount, 0);
      const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent_amount, 0);
      const today = new Date().toISOString().split('T')[0];

      response.summary = {
        total_budgeted: totalBudgeted,
        total_spent: totalSpent,
        total_remaining: totalBudgeted - totalSpent,
        average_utilization: budgets.length > 0
          ? budgets.reduce((sum, budget) => sum + budget.utilization, 0) / budgets.length
          : 0,
        over_budget_categories: budgets
          .filter(budget => budget.status === 'over_budget')
          .map(budget => budget.category),
        active_budget_count: budgets.filter(budget => !budget.end_date || budget.end_date >= today).length
      };
    }

    return {
      success: true,
      data: response
    };
  } catch (error) {
    logger.error('Unexpected error in getUserBudgets', error);
    return {
      success: false,
      error: 'Unexpected error',
      message: 'Something went wrong while retrieving budgets. Please try again later.'
    };
  }
}

async function getIncomeData(
  userId: string,
  options: {
    start_date?: string;
    end_date?: string;
    income_type?: string;
    include_projections?: boolean;
  } = {}
): Promise<FinancialToolResponse<IncomeToolData>> {
  try {
    logger.debug('Fetching user income data', { userId, options });

    let query = supabase
      .from('income_entries')
      .select('id, amount, source, date, type, description')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (options.start_date) {
      query = query.gte('date', options.start_date);
    }

    if (options.end_date) {
      query = query.lte('date', options.end_date);
    }

    if (options.income_type && options.income_type !== 'all') {
      query = query.eq('type', options.income_type);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching income entries from Supabase', error);
      return {
        success: false,
        error: 'Failed to fetch income data',
        message: 'We were unable to retrieve your income records. Please try again shortly.'
      };
    }

    const incomeRows = (Array.isArray(data) ? data : []) as IncomeEntryRow[];

    const entries: IncomeEntryRecord[] = incomeRows.map(entry => ({
      id: entry.id,
      amount: Number(entry.amount) || 0,
      source: entry.source || 'Income',
      date: entry.date,
      type: entry.type || 'other',
      description: entry.description
    }));

    const response: IncomeToolData = {
      entries,
      summary: {
        total_amount: 0,
        average_amount: 0,
        entry_count: 0,
        by_type: [],
        date_range: buildDateRangeMetadata(options.start_date, options.end_date)
      },
      metadata: {
        filters: {
          start_date: options.start_date,
          end_date: options.end_date,
          income_type: options.income_type,
          include_projections: !!options.include_projections
        }
      }
    };

    if (entries.length === 0) {
      return {
        success: true,
        data: response,
        message: 'No income records found for the selected filters.'
      };
    }

    const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const typeMap = new Map<string, { total: number; count: number }>();

    entries.forEach(entry => {
      const typeKey = entry.type || 'other';
      const stats = typeMap.get(typeKey) || { total: 0, count: 0 };
      stats.total += entry.amount;
      stats.count += 1;
      typeMap.set(typeKey, stats);
    });

    const byType: IncomeTypeSummary[] = Array.from(typeMap.entries())
      .map(([type, stats]) => ({
        type,
        total_amount: stats.total,
        entry_count: stats.count,
        percentage: totalAmount > 0 ? (stats.total / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.total_amount - a.total_amount);

    const derivedStart = options.start_date ?? findDateBoundary(entries.map(entry => entry.date), 'min');
    const derivedEnd = options.end_date ?? findDateBoundary(entries.map(entry => entry.date), 'max');

    response.summary = {
      total_amount: totalAmount,
      average_amount: entries.length > 0 ? totalAmount / entries.length : 0,
      entry_count: entries.length,
      by_type: byType,
      date_range: buildDateRangeMetadata(derivedStart, derivedEnd)
    };

    if (options.include_projections) {
      const rangeDays = response.summary.date_range?.days && response.summary.date_range.days > 0
        ? response.summary.date_range.days
        : 30;

      const averageDaily = rangeDays > 0 ? totalAmount / rangeDays : totalAmount;

      response.projections = {
        average_daily: averageDaily,
        projected_next_30_days: averageDaily * 30,
        projected_next_90_days: averageDaily * 90
      };
    }

    return {
      success: true,
      data: response
    };
  } catch (error) {
    logger.error('Unexpected error in getIncomeData', error);
    return {
      success: false,
      error: 'Unexpected error',
      message: 'Something went wrong while retrieving income data. Please try again later.'
    };
  }
}

// ===================
// TYPE DEFINITIONS
// ===================

export interface ToolExecutionRequest {
  toolName: string;
  parameters: Record<string, any>;
  userId: string;
  requestId?: string;
}

export interface ToolExecutionResult {
  success: boolean;
  toolName: string;
  data?: any;
  formattedResponse?: string;
  error?: string;
  message?: string;
  executionTime?: number;
  userId: string;
  requestId?: string;
}

export interface ToolValidationError {
  parameter: string;
  expected: string;
  received: string;
  message: string;
}

export interface ToolUsageAnalytics {
  toolName: string;
  userId: string;
  timestamp: Date;
  executionTime: number;
  success: boolean;
  parameterCount: number;
  dataSize?: number;
  error?: string;
}

type FinancialToolResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

interface ExpenseRecord {
  id: number | string;
  amount: number;
  category: string;
  date: string;
  description?: string | null;
  created_at?: string | null;
}

interface ExpenseCategorySummary {
  category: string;
  total_amount: number;
  transaction_count: number;
  percentage: number;
}

interface ExpenseSummary {
  total_amount: number;
  average_amount: number;
  transaction_count: number;
  categories: ExpenseCategorySummary[];
  date_range?: {
    start_date: string | null;
    end_date: string | null;
    days: number | null;
  };
  highest_expense?: {
    amount: number;
    category: string;
    date: string;
    description?: string | null;
  };
}

interface ExpenseToolData {
  expenses: ExpenseRecord[];
  summary: ExpenseSummary;
  metadata: {
    filters: {
      start_date?: string;
      end_date?: string;
      category?: string;
      min_amount?: number;
      max_amount?: number;
      limit: number;
      include_default_limit: boolean;
    };
    expense_count: number;
  };
}

interface BudgetRecord {
  id: string;
  category: string;
  name?: string | null;
  start_date: string | null;
  end_date: string | null;
  budgeted_amount: number;
  spent_amount: number;
  remaining_amount: number;
  utilization: number;
  status: 'under_budget' | 'near_limit' | 'over_budget';
}

interface BudgetSummary {
  total_budgeted: number;
  total_spent: number;
  total_remaining: number;
  average_utilization: number;
  over_budget_categories: string[];
  active_budget_count: number;
}

interface BudgetToolData {
  budgets: BudgetRecord[];
  summary?: BudgetSummary;
  metadata: {
    filters: {
      category?: string;
      include_history: boolean;
      include_summary: boolean;
    };
  };
}

interface IncomeEntryRecord {
  id: string;
  amount: number;
  source: string;
  date: string;
  type: string;
  description?: string | null;
}

interface IncomeTypeSummary {
  type: string;
  total_amount: number;
  entry_count: number;
  percentage: number;
}

interface IncomeSummary {
  total_amount: number;
  average_amount: number;
  entry_count: number;
  date_range?: {
    start_date: string | null;
    end_date: string | null;
    days: number | null;
  };
  by_type: IncomeTypeSummary[];
}

interface IncomeProjections {
  average_daily: number;
  projected_next_30_days: number;
  projected_next_90_days: number;
}

interface IncomeToolData {
  entries: IncomeEntryRecord[];
  summary: IncomeSummary;
  projections?: IncomeProjections;
  metadata: {
    filters: {
      start_date?: string;
      end_date?: string;
      income_type?: string;
      include_projections: boolean;
    };
  };
}

// ===================
// TOOL EXECUTION ROUTER
// ===================

/**
 * Execute a tool call from Claude with full error handling and logging
 */
export async function executeToolCall(
  toolName: string,
  parameters: Record<string, any>,
  userId: string,
  requestId?: string
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const executionRequest: ToolExecutionRequest = {
    toolName,
    parameters,
    userId,
    requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };

  logger.debug('Executing tool call', {
    toolName,
    userId,
    requestId: executionRequest.requestId,
    paramCount: Object.keys(parameters).length
  });

  try {
    // Step 1: Validate tool exists
    const toolDefinition = getToolByName(toolName);
    if (!toolDefinition) {
      const error = `Tool '${toolName}' not found in registry`;
      logger.error('Tool execution failed - tool not found', { toolName, userId });
      
      await logToolUsage({
        toolName,
        userId,
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
        success: false,
        parameterCount: Object.keys(parameters).length,
        error
      });

      return {
        success: false,
        toolName,
        error,
        message: `The tool '${toolName}' is not available. Please check the tool name and try again.`,
        executionTime: Date.now() - startTime,
        userId,
        requestId: executionRequest.requestId
      };
    }

    // Step 2: Validate parameters
    const validationResult = validateToolParams(toolName, parameters);
    if (!validationResult.valid) {
      const error = `Parameter validation failed: ${validationResult.errors?.map(e => e.message).join(', ')}`;
      logger.error('Tool execution failed - parameter validation', {
        toolName,
        userId,
        errors: validationResult.errors
      });

      await logToolUsage({
        toolName,
        userId,
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
        success: false,
        parameterCount: Object.keys(parameters).length,
        error
      });

      return {
        success: false,
        toolName,
        error,
        message: `Invalid parameters: ${validationResult.errors?.map(e => `${e.parameter} - ${e.message}`).join('; ')}`,
        executionTime: Date.now() - startTime,
        userId,
        requestId: executionRequest.requestId
      };
    }

    // Step 3: Route to appropriate tool function
    const toolResult = await routeToolCall(toolDefinition, parameters, userId);

    // Step 4: Format response for Claude
    const formattedResponse = formatToolResponse(toolName, toolResult.data);

    const executionTime = Date.now() - startTime;

    // Step 5: Log successful execution
    await logToolUsage({
      toolName,
      userId,
      timestamp: new Date(),
      executionTime,
      success: toolResult.success,
      parameterCount: Object.keys(parameters).length,
      dataSize: toolResult.data ? JSON.stringify(toolResult.data).length : 0,
      error: toolResult.error
    });

    logger.debug('Tool execution completed', {
      toolName,
      userId,
      requestId: executionRequest.requestId,
      success: toolResult.success,
      executionTime
    });

    return {
      success: toolResult.success,
      toolName,
      data: toolResult.data,
      formattedResponse,
      error: toolResult.error,
      message: toolResult.message,
      executionTime,
      userId,
      requestId: executionRequest.requestId
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
    
    logger.error('Unexpected error in tool execution', {
      toolName,
      userId,
      requestId: executionRequest.requestId,
      error: errorMessage,
      executionTime
    });

    await logToolUsage({
      toolName,
      userId,
      timestamp: new Date(),
      executionTime,
      success: false,
      parameterCount: Object.keys(parameters).length,
      error: errorMessage
    });

    return {
      success: false,
      toolName,
      error: 'Tool execution failed',
      message: 'An unexpected error occurred while executing the tool. Please try again or contact support.',
      executionTime,
      userId,
      requestId: executionRequest.requestId
    };
  }
}

// ===================
// TOOL ROUTING
// ===================

/**
 * Route tool call to the appropriate implementation function
 */
async function routeToolCall(
  toolDefinition: ToolDefinition,
  parameters: Record<string, any>,
  userId: string
): Promise<ProfileToolResponse<any> | TripToolResponse<any> | FinancialToolResponse<any>> {
  
  switch (toolDefinition.name) {
    // Profile tools
    case 'getUserProfile':
      return await profileTools.getUserProfile(userId, {
        include_financial_goals: parameters.include_financial_goals,
        include_preferences: parameters.include_preferences,
        include_statistics: parameters.include_statistics
      });

    case 'getUserSettings':
      return await profileTools.getUserSettings(userId, parameters.category);

    case 'getUserPreferences':
      return await profileTools.getUserPreferences(userId, {
        include_defaults: parameters.include_defaults
      });

    // Trip tools
    case 'getTripHistory':
      return await tripTools.getTripHistory(userId, {
        start_date: parameters.start_date,
        end_date: parameters.end_date,
        trip_type: parameters.trip_type,
        include_costs: parameters.include_costs,
        include_fuel_data: parameters.include_fuel_data,
        limit: parameters.limit
      });

    case 'getVehicleData':
      return await tripTools.getVehicleData(userId, {
        vehicle_id: parameters.vehicle_id,
        include_maintenance: parameters.include_maintenance,
        include_insurance: parameters.include_insurance,
        include_performance: parameters.include_performance
      });

    case 'getFuelData':
      return await tripTools.getFuelData(userId, {
        dateRange: parameters.start_date && parameters.end_date ? {
          start_date: parameters.start_date,
          end_date: parameters.end_date
        } : undefined,
        vehicle_id: parameters.vehicle_id,
        include_stations: parameters.include_stations,
        include_efficiency: parameters.include_efficiency,
        analysis_type: parameters.analysis_type
      });

    case 'getTripPlans':
      return await tripTools.getTripPlans(userId, {
        limit: parameters.limit,
        include_estimates: parameters.include_estimates
      });

    // Financial tools (placeholder - to be implemented)
    case 'getUserExpenses':
      return await getUserExpenses(userId, {
        start_date: parameters.start_date,
        end_date: parameters.end_date,
        category: parameters.category,
        min_amount: parameters.min_amount,
        max_amount: parameters.max_amount,
        limit: parameters.limit
      });

    case 'getUserBudgets':
      return await getUserBudgets(userId, {
        category: parameters.category,
        include_summary: parameters.include_summary,
        include_history: parameters.include_history
      });

    case 'getIncomeData':
      return await getIncomeData(userId, {
        start_date: parameters.start_date,
        end_date: parameters.end_date,
        income_type: parameters.income_type,
        include_projections: parameters.include_projections
      });

    case 'calculateSavings':
      return {
        success: false,
        error: 'Tool not yet implemented',
        message: 'Savings calculation tools are coming in the next implementation phase.'
      };

    // Calendar tools (placeholder - to be implemented)
    case 'getUpcomingEvents':
      return {
        success: false,
        error: 'Tool not yet implemented',
        message: 'Calendar tools are coming in the next implementation phase.'
      };

    // Weather tools - PAM can answer weather questions like Claude
    case 'getCurrentWeather':
      return await provideWeatherResponse(
        parameters.location,
        'current',
        parameters.units || 'metric'
      );

    case 'getWeatherForecast':
      return await provideWeatherResponse(
        parameters.location,
        'forecast',
        parameters.units || 'metric',
        parameters.days || 5
      );

    // Web Search tools
    case 'performWebSearch':
      return await webSearchTools.performWebSearch(
        parameters.query,
        parameters.num_results || 5,
        parameters.search_type,
        userId
      );

    case 'searchCurrentWeather':
      return await webSearchTools.searchCurrentWeather(
        parameters.location,
        userId
      );

    case 'searchNews':
      return await webSearchTools.searchNews(
        parameters.topic,
        userId
      );

    default:
      return {
        success: false,
        error: 'Tool routing not implemented',
        message: `Tool '${toolDefinition.name}' exists in registry but routing is not implemented.`
      };
  }
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, min), max);
}

function buildDateRangeMetadata(start?: string | null, end?: string | null) {
  const hasStart = typeof start === 'string' && isValidDateString(start);
  const hasEnd = typeof end === 'string' && isValidDateString(end);

  if (!hasStart && !hasEnd) {
    return undefined;
  }

  const normalizedStart = hasStart ? start! : hasEnd ? end! : null;
  const normalizedEnd = hasEnd ? end! : hasStart ? start! : null;
  const days = calculateDateSpan(normalizedStart, normalizedEnd);

  return {
    start_date: normalizedStart,
    end_date: normalizedEnd,
    days
  };
}

function findDateBoundary(dates: (string | null | undefined)[], type: 'min' | 'max'): string | null {
  const validDates = dates
    .filter((date): date is string => typeof date === 'string' && isValidDateString(date));

  if (validDates.length === 0) {
    return null;
  }

  const sorted = [...validDates].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return type === 'min' ? sorted[0] : sorted[sorted.length - 1];
}

function calculateDateSpan(start?: string | null, end?: string | null): number | null {
  const validStart = start && isValidDateString(start) ? start : null;
  const validEnd = end && isValidDateString(end) ? end : null;

  if (!validStart && !validEnd) {
    return null;
  }

  const startDate = validStart ? new Date(validStart) : new Date(validEnd!);
  const endDate = validEnd ? new Date(validEnd) : new Date(validStart!);

  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return null;
  }

  const minMs = Math.min(startMs, endMs);
  const maxMs = Math.max(startMs, endMs);
  const diffDays = Math.floor((maxMs - minMs) / (1000 * 60 * 60 * 24));

  return diffDays + 1;
}

// ===================
// PARAMETER VALIDATION
// ===================

export interface ValidationResult {
  valid: boolean;
  errors?: ToolValidationError[];
}

/**
 * Validate tool parameters against JSON schema
 */
export function validateToolParams(
  toolName: string,
  parameters: Record<string, any>
): ValidationResult {
  const toolDefinition = getToolByName(toolName);
  
  if (!toolDefinition) {
    return {
      valid: false,
      errors: [{
        parameter: 'toolName',
        expected: 'valid tool name',
        received: toolName,
        message: `Tool '${toolName}' not found in registry`
      }]
    };
  }

  const errors: ToolValidationError[] = [];
  const schema = toolDefinition.input_schema;

  // Check required parameters
  if (schema.required) {
    for (const requiredParam of schema.required) {
      if (!(requiredParam in parameters) || parameters[requiredParam] === undefined) {
        errors.push({
          parameter: requiredParam,
          expected: `required parameter`,
          received: 'undefined',
          message: `Required parameter '${requiredParam}' is missing`
        });
      }
    }
  }

  // Validate each provided parameter
  for (const [paramName, paramValue] of Object.entries(parameters)) {
    const paramSchema = schema.properties[paramName];
    
    if (!paramSchema) {
      // Allow extra parameters for flexibility, but log them
      logger.debug('Extra parameter provided', { toolName, parameter: paramName, value: paramValue });
      continue;
    }

    // Type validation
    const validationError = validateParameterType(paramName, paramValue, paramSchema);
    if (validationError) {
      errors.push(validationError);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate individual parameter type and constraints
 */
function validateParameterType(
  paramName: string,
  paramValue: any,
  schema: any
): ToolValidationError | null {
  
  // Skip validation for undefined optional parameters
  if (paramValue === undefined || paramValue === null) {
    return null;
  }

  // Type checking
  switch (schema.type) {
    case 'string':
      if (typeof paramValue !== 'string') {
        return {
          parameter: paramName,
          expected: 'string',
          received: typeof paramValue,
          message: `Parameter '${paramName}' must be a string`
        };
      }

      // Enum validation
      if (schema.enum && !schema.enum.includes(paramValue)) {
        return {
          parameter: paramName,
          expected: `one of: ${schema.enum.join(', ')}`,
          received: paramValue,
          message: `Parameter '${paramName}' must be one of: ${schema.enum.join(', ')}`
        };
      }

      // Format validation
      if (schema.format === 'date' && !isValidDateString(paramValue)) {
        return {
          parameter: paramName,
          expected: 'valid date string (YYYY-MM-DD)',
          received: paramValue,
          message: `Parameter '${paramName}' must be a valid date string (YYYY-MM-DD format)`
        };
      }
      break;

    case 'number':
      if (typeof paramValue !== 'number' || isNaN(paramValue)) {
        return {
          parameter: paramName,
          expected: 'number',
          received: typeof paramValue,
          message: `Parameter '${paramName}' must be a number`
        };
      }

      // Range validation
      if (schema.minimum !== undefined && paramValue < schema.minimum) {
        return {
          parameter: paramName,
          expected: `>= ${schema.minimum}`,
          received: paramValue.toString(),
          message: `Parameter '${paramName}' must be >= ${schema.minimum}`
        };
      }

      if (schema.maximum !== undefined && paramValue > schema.maximum) {
        return {
          parameter: paramName,
          expected: `<= ${schema.maximum}`,
          received: paramValue.toString(),
          message: `Parameter '${paramName}' must be <= ${schema.maximum}`
        };
      }
      break;

    case 'boolean':
      if (typeof paramValue !== 'boolean') {
        return {
          parameter: paramName,
          expected: 'boolean',
          received: typeof paramValue,
          message: `Parameter '${paramName}' must be a boolean (true or false)`
        };
      }
      break;

    case 'array':
      if (!Array.isArray(paramValue)) {
        return {
          parameter: paramName,
          expected: 'array',
          received: typeof paramValue,
          message: `Parameter '${paramName}' must be an array`
        };
      }
      break;

    case 'object':
      if (typeof paramValue !== 'object' || Array.isArray(paramValue)) {
        return {
          parameter: paramName,
          expected: 'object',
          received: Array.isArray(paramValue) ? 'array' : typeof paramValue,
          message: `Parameter '${paramName}' must be an object`
        };
      }
      break;
  }

  return null;
}

/**
 * Validate date string format (YYYY-MM-DD)
 */
function isValidDateString(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
}

// ===================
// RESPONSE FORMATTING
// ===================

/**
 * Format tool response for Claude consumption
 */
export function formatToolResponse(toolName: string, data: any): string {
  if (!data) {
    return formatEmptyResponse(toolName);
  }

  try {
    switch (toolName) {
      case 'getUserExpenses':
        return formatExpensesResponse(data);

      case 'getUserBudgets':
        return formatBudgetsResponse(data);

      case 'getIncomeData':
        return formatIncomeResponse(data);

      case 'getUserProfile':
        return formatProfileResponse(data);

      case 'getUserSettings':
        return formatSettingsResponse(data);
      
      case 'getUserPreferences':
        return formatPreferencesResponse(data);
      
      case 'getTripHistory':
        return formatTripHistoryResponse(data);
      
      case 'getVehicleData':
        return formatVehicleResponse(data);
      
      case 'getFuelData':
        return formatFuelDataResponse(data);
      
      case 'getTripPlans':
        return formatTripPlansResponse(data);
      
      default:
        return formatGenericResponse(toolName, data);
    }
  } catch (error) {
    logger.error('Error formatting tool response', { toolName, error });
    return `Retrieved data for ${toolName} but encountered formatting issues. Raw data available for analysis.`;
  }
}

/**
 * Format empty/null response
 */
function formatEmptyResponse(toolName: string): string {
  const responseMap: Record<string, string> = {
    getUserExpenses: 'No expense records found for the selected timeframe.',
    getUserBudgets: 'No budgets configured for this user.',
    getIncomeData: 'No income entries found for the selected timeframe.',
    getUserProfile: "No profile information found for this user.",
    getUserSettings: "No custom settings found - using default settings.",
    getUserPreferences: "No custom preferences found - using default preferences.",
    getTripHistory: "No trips found for the specified criteria.",
    getVehicleData: "No vehicles found for this user.",
    getFuelData: "No fuel records found for the specified criteria.",
    getTripPlans: "No upcoming trip plans found."
  };

  return responseMap[toolName] || `No data found for ${toolName}.`;
}

/**
 * Format expenses response for Claude
 */
function formatExpensesResponse(expenseData: ExpenseToolData): string {
  const summary = expenseData.summary;

  if (!summary || summary.transaction_count === 0) {
    return 'No expense records found for the selected timeframe.';
  }

  const parts = ['Expense Overview:'];

  parts.push(`• Total Spent: $${formatCurrency(summary.total_amount)}`);
  parts.push(`• Transactions: ${summary.transaction_count}`);

  if (summary.average_amount > 0) {
    parts.push(`• Average Amount: $${formatCurrency(summary.average_amount)}`);
  }

  if (summary.date_range?.start_date && summary.date_range.end_date) {
    parts.push(`• Date Range: ${formatDisplayDate(summary.date_range.start_date)} → ${formatDisplayDate(summary.date_range.end_date)}`);
  }

  if (summary.categories.length > 0) {
    parts.push('• Top Categories:');
    summary.categories.slice(0, 3).forEach(category => {
      parts.push(
        `  - ${formatCategoryName(category.category)}: $${formatCurrency(category.total_amount)} (${category.percentage.toFixed(1)}%)`
      );
    });
  }

  if (summary.highest_expense) {
    const { amount, category, date, description } = summary.highest_expense;
    const detail = description ? ` – ${description}` : '';
    parts.push(
      `• Largest Expense: $${formatCurrency(amount)} on ${formatDisplayDate(date)} (${formatCategoryName(category)})${detail}`
    );
  }

  if (expenseData.expenses.length > 0) {
    parts.push('• Recent Transactions:');
    expenseData.expenses.slice(0, 3).forEach(expense => {
      const details = expense.description ? ` – ${expense.description}` : '';
      parts.push(
        `  - ${formatDisplayDate(expense.date)}: $${formatCurrency(expense.amount)} on ${formatCategoryName(expense.category)}${details}`
      );
    });

    if (expenseData.expenses.length > 3) {
      parts.push(`  - …and ${expenseData.expenses.length - 3} more transactions`);
    }
  }

  return parts.join('\n');
}

/**
 * Format budgets response for Claude
 */
function formatBudgetsResponse(budgetData: BudgetToolData): string {
  if (!budgetData.budgets || budgetData.budgets.length === 0) {
    return 'No budgets configured for this user.';
  }

  const parts = ['Budget Overview:'];

  if (budgetData.summary) {
    parts.push(`• Total Budgeted: $${formatCurrency(budgetData.summary.total_budgeted)}`);
    parts.push(`• Total Spent: $${formatCurrency(budgetData.summary.total_spent)}`);
    parts.push(`• Remaining: $${formatCurrency(budgetData.summary.total_remaining)}`);
    parts.push(`• Average Utilization: ${budgetData.summary.average_utilization.toFixed(1)}%`);

    if (budgetData.summary.over_budget_categories.length > 0) {
      parts.push(
        `• Over Budget: ${budgetData.summary.over_budget_categories.map(formatCategoryName).join(', ')}`
      );
    }
  }

  parts.push('• Budget Details:');

  budgetData.budgets.slice(0, 5).forEach(budget => {
    const statusLabel =
      budget.status === 'over_budget'
        ? 'Over budget'
        : budget.status === 'near_limit'
          ? 'Near limit'
          : 'On track';

    parts.push(
      `  - ${budget.name || formatCategoryName(budget.category)}: $${formatCurrency(budget.spent_amount)} of $${formatCurrency(budget.budgeted_amount)} used (${budget.utilization.toFixed(1)}% – ${statusLabel})`
    );

    if (budget.start_date || budget.end_date) {
      parts.push(
        `     Period: ${formatDisplayDate(budget.start_date)} → ${formatDisplayDate(budget.end_date)}`
      );
    }
  });

  if (budgetData.budgets.length > 5) {
    parts.push(`  - …and ${budgetData.budgets.length - 5} more budgets`);
  }

  return parts.join('\n');
}

/**
 * Format income response for Claude
 */
function formatIncomeResponse(incomeData: IncomeToolData): string {
  const summary = incomeData.summary;

  if (!summary || summary.entry_count === 0) {
    return 'No income entries found for the selected timeframe.';
  }

  const parts = ['Income Overview:'];

  parts.push(`• Total Income: $${formatCurrency(summary.total_amount)}`);
  parts.push(`• Entries: ${summary.entry_count}`);

  if (summary.average_amount > 0) {
    parts.push(`• Average Amount: $${formatCurrency(summary.average_amount)}`);
  }

  if (summary.date_range?.start_date && summary.date_range.end_date) {
    parts.push(`• Date Range: ${formatDisplayDate(summary.date_range.start_date)} → ${formatDisplayDate(summary.date_range.end_date)}`);
  }

  if (summary.by_type.length > 0) {
    parts.push('• Income by Type:');
    summary.by_type.slice(0, 3).forEach(typeSummary => {
      parts.push(
        `  - ${formatCategoryName(typeSummary.type)}: $${formatCurrency(typeSummary.total_amount)} (${typeSummary.percentage.toFixed(1)}%)`
      );
    });
  }

  if (incomeData.projections) {
    parts.push('• Projections:');
    parts.push(
      `  - Average Daily: $${formatCurrency(incomeData.projections.average_daily)}`
    );
    parts.push(
      `  - Next 30 Days: $${formatCurrency(incomeData.projections.projected_next_30_days)}`
    );
    parts.push(
      `  - Next 90 Days: $${formatCurrency(incomeData.projections.projected_next_90_days)}`
    );
  }

  if (incomeData.entries.length > 0) {
    parts.push('• Recent Income:');
    incomeData.entries.slice(0, 3).forEach(entry => {
      const details = entry.description ? ` – ${entry.description}` : '';
      parts.push(
        `  - ${formatDisplayDate(entry.date)}: $${formatCurrency(entry.amount)} from ${entry.source}${details}`
      );
    });

    if (incomeData.entries.length > 3) {
      parts.push(`  - …and ${incomeData.entries.length - 3} more entries`);
    }
  }

  return parts.join('\n');
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDisplayDate(date?: string | null): string {
  if (!date) {
    return 'N/A';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString();
}

function formatCategoryName(category?: string | null): string {
  if (!category) {
    return 'Uncategorized';
  }

  return category
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Format profile response for Claude
 */
function formatProfileResponse(profile: any): string {
  const parts = [`User Profile for ${profile.full_name || profile.email || 'User'}:`];
  
  if (profile.personal_info?.occupation) {
    parts.push(`• Occupation: ${profile.personal_info.occupation}`);
  }
  
  if (profile.financial_goals) {
    parts.push('• Financial Goals:');
    if (profile.financial_goals.emergency_fund_target) {
      parts.push(`  - Emergency Fund Target: $${profile.financial_goals.emergency_fund_target.toLocaleString()}`);
    }
    if (profile.financial_goals.monthly_savings_goal) {
      parts.push(`  - Monthly Savings Goal: $${profile.financial_goals.monthly_savings_goal.toLocaleString()}`);
    }
  }
  
  if (profile.statistics) {
    parts.push('• Account Statistics:');
    parts.push(`  - Total Expenses: $${profile.statistics.total_expenses.toLocaleString()}`);
    parts.push(`  - Total Income: $${profile.statistics.total_income.toLocaleString()}`);
    parts.push(`  - Total Trips: ${profile.statistics.total_trips}`);
    parts.push(`  - Account Age: ${profile.statistics.account_age_days} days`);
  }

  return parts.join('\n');
}

/**
 * Format settings response for Claude
 */
function formatSettingsResponse(settings: any): string {
  const parts = ['User Settings:'];
  
  if (settings.notifications) {
    parts.push('• Notifications:');
    parts.push(`  - Email: ${settings.notifications.email_enabled ? 'Enabled' : 'Disabled'}`);
    parts.push(`  - Push: ${settings.notifications.push_enabled ? 'Enabled' : 'Disabled'}`);
    parts.push(`  - Budget Alerts: ${settings.notifications.budget_alerts ? 'Enabled' : 'Disabled'}`);
  }
  
  if (settings.display) {
    parts.push('• Display:');
    parts.push(`  - Theme: ${settings.display.theme}`);
    parts.push(`  - Currency: ${settings.display.currency}`);
    parts.push(`  - Language: ${settings.display.language}`);
  }

  return parts.join('\n');
}

/**
 * Format trip history response for Claude
 */
function formatTripHistoryResponse(trips: any[]): string {
  if (!trips || trips.length === 0) {
    return "No trips found for the specified criteria.";
  }

  const parts = [`Found ${trips.length} trip(s):`];
  
  trips.slice(0, 5).forEach((trip, index) => {
    parts.push(`\n${index + 1}. ${trip.title}`);
    parts.push(`   • Type: ${trip.trip_type}`);
    parts.push(`   • Distance: ${trip.distance_miles} miles`);
    parts.push(`   • Date: ${new Date(trip.start_time).toLocaleDateString()}`);
    if (trip.cost_breakdown?.total > 0) {
      parts.push(`   • Total Cost: $${trip.cost_breakdown.total.toFixed(2)}`);
    }
  });

  if (trips.length > 5) {
    parts.push(`\n... and ${trips.length - 5} more trips`);
  }

  return parts.join('\n');
}

/**
 * Format vehicle response for Claude  
 */
function formatVehicleResponse(vehicles: any): string {
  const vehicleArray = Array.isArray(vehicles) ? vehicles : [vehicles];
  
  if (vehicleArray.length === 0) {
    return "No vehicles found.";
  }

  const parts = [`Found ${vehicleArray.length} vehicle(s):`];
  
  vehicleArray.forEach((vehicle, index) => {
    parts.push(`\n${index + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
    if (vehicle.color) parts.push(`   • Color: ${vehicle.color}`);
    if (vehicle.avg_mpg) parts.push(`   • Average MPG: ${vehicle.avg_mpg}`);
    if (vehicle.maintenance?.next_service_due) {
      parts.push(`   • Next Service: ${new Date(vehicle.maintenance.next_service_due).toLocaleDateString()}`);
    }
    if (vehicle.is_primary) parts.push(`   • Primary Vehicle`);
  });

  return parts.join('\n');
}

/**
 * Format fuel data response for Claude
 */
function formatFuelDataResponse(fuelData: any): string {
  const { records, summary, efficiency, stations } = fuelData;
  
  const parts = [`Fuel Data Summary:`];
  
  if (summary) {
    parts.push(`• Total Records: ${summary.records_count}`);
    parts.push(`• Total Cost: $${summary.total_cost.toFixed(2)}`);
    parts.push(`• Total Gallons: ${summary.total_gallons.toFixed(1)}`);
    parts.push(`• Average Price/Gallon: $${summary.average_price_per_gallon.toFixed(2)}`);
  }
  
  if (efficiency) {
    parts.push(`• Fuel Efficiency:`);
    parts.push(`  - Average MPG: ${efficiency.avg_mpg}`);
    parts.push(`  - Best MPG: ${efficiency.best_mpg}`);
    parts.push(`  - Worst MPG: ${efficiency.worst_mpg}`);
  }
  
  if (stations && stations.length > 0) {
    parts.push(`• Top Fuel Stations:`);
    stations.slice(0, 3).forEach(station => {
      parts.push(`  - ${station.name}: ${station.visit_count} visits, avg $${station.avg_price}/gal`);
    });
  }

  return parts.join('\n');
}

/**
 * Format trip plans response for Claude
 */
function formatTripPlansResponse(plans: any[]): string {
  if (!plans || plans.length === 0) {
    return "No upcoming trip plans found.";
  }

  const parts = [`Found ${plans.length} upcoming trip plan(s):`];
  
  plans.forEach((plan, index) => {
    parts.push(`\n${index + 1}. ${plan.title}`);
    parts.push(`   • Planned Date: ${new Date(plan.planned_date).toLocaleDateString()}`);
    parts.push(`   • Status: ${plan.status}`);
    if (plan.estimated_distance > 0) {
      parts.push(`   • Distance: ${plan.estimated_distance} miles`);
    }
    if (plan.estimated_cost?.total > 0) {
      parts.push(`   • Estimated Cost: $${plan.estimated_cost.total.toFixed(2)}`);
    }
  });

  return parts.join('\n');
}

/**
 * Generic response formatter
 */
function formatGenericResponse(toolName: string, data: any): string {
  if (Array.isArray(data)) {
    return `Retrieved ${data.length} items from ${toolName}.`;
  } else if (typeof data === 'object') {
    const keys = Object.keys(data);
    return `Retrieved ${toolName} data with ${keys.length} properties.`;
  } else {
    return `Retrieved data from ${toolName}.`;
  }
}

/**
 * Format preferences response for Claude
 */
function formatPreferencesResponse(preferences: any): string {
  const parts = ['User Preferences:'];
  
  if (preferences.financial?.default_budget_categories) {
    parts.push(`• Budget Categories: ${preferences.financial.default_budget_categories.join(', ')}`);
  }
  
  if (preferences.travel?.preferred_fuel_stations) {
    parts.push(`• Preferred Gas Stations: ${preferences.travel.preferred_fuel_stations.join(', ')}`);
  }
  
  if (preferences.interface?.dashboard_widgets) {
    parts.push(`• Dashboard Widgets: ${preferences.interface.dashboard_widgets.join(', ')}`);
  }

  return parts.join('\n');
}

// ===================
// ANALYTICS & LOGGING
// ===================

/**
 * Log tool usage for analytics (placeholder - integrate with your analytics system)
 */
async function logToolUsage(analytics: ToolUsageAnalytics): Promise<void> {
  try {
    // Log to console for development
    logger.info('Tool usage analytics', analytics);
    
    // TODO: Send to analytics service (e.g., Mixpanel, PostHog, custom endpoint)
    // await analyticsService.track('tool_execution', analytics);
    
    // TODO: Store in database for usage patterns
    // await supabase.from('tool_usage_logs').insert(analytics);
    
  } catch (error) {
    logger.error('Failed to log tool usage', { error, analytics });
  }
}

export default {
  executeToolCall,
  formatToolResponse,
  validateToolParams
};