import { z } from 'zod';

// Environment configuration schema
export const ConfigSchema = z.object({
  SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key required'),
  PORT: z.string().default('3001').transform(Number),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  QUERY_TIMEOUT_MS: z.string().default('15000').transform(Number),
  MAX_REQUESTS_PER_MINUTE: z.string().default('60').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  MCP_SERVER_NAME: z.string().default('pam-supabase-mcp'),
  MCP_SERVER_VERSION: z.string().default('1.0.0'),
});

export type Config = z.infer<typeof ConfigSchema>;

// Tool parameter schemas
export const GetExpensesSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  since: z.string().optional().describe('Start date (YYYY-MM-DD format)'),
  until: z.string().optional().describe('End date (YYYY-MM-DD format)'),
  limit: z.number().int().positive().max(500).default(100).describe('Maximum number of records'),
  category: z.string().optional().describe('Filter by expense category'),
});

export const GetBudgetsSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  active_only: z.boolean().default(true).describe('Return only active budgets'),
});

export const GetIncomeSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  since: z.string().optional().describe('Start date (YYYY-MM-DD format)'),
  until: z.string().optional().describe('End date (YYYY-MM-DD format)'),
  limit: z.number().int().positive().max(500).default(100).describe('Maximum number of records'),
});

export const RunNamedQuerySchema = z.object({
  name: z.string().min(1, 'Query name required'),
  params_json: z.string().describe('JSON string of query parameters'),
});

// Rate limiting
export interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export interface RateLimiter {
  isAllowed(identifier: string): boolean;
}

// Query validation
export const ALLOWED_QUERY_NAMES = [
  'top_spend_categories',
  'monthly_burn_rate', 
  'fuel_cost_trend'
] as const;

export type AllowedQueryName = typeof ALLOWED_QUERY_NAMES[number];