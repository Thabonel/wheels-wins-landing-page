/**
 * Shared utility functions for Supabase Edge Functions
 *
 * Best practices from Deno + Supabase documentation
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { AuthUser, ErrorResponse, CacheHeaders } from "./types.ts";

// ============================================
// CORS Configuration
// ============================================

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400", // 24 hours
};

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// ============================================
// Supabase Client
// ============================================

/**
 * Create authenticated Supabase client from request
 */
export function createAuthenticatedClient(req: Request): {
  client: SupabaseClient;
  user: AuthUser | null;
} {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return {
      client: createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      ),
      user: null,
    };
  }

  // Extract JWT from "Bearer <token>"
  const token = authHeader.replace("Bearer ", "");

  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: authHeader },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  return { client, user: null }; // User will be fetched via client.auth.getUser()
}

/**
 * Create service role client (bypasses RLS)
 * Use with caution - only for admin operations
 */
export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

// ============================================
// Authentication
// ============================================

/**
 * Get authenticated user from request
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(
  client: SupabaseClient
): Promise<AuthUser | null> {
  try {
    const {
      data: { user },
      error,
    } = await client.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  } catch {
    return null;
  }
}

/**
 * Require authenticated user or throw 401
 */
export async function requireAuth(
  client: SupabaseClient
): Promise<AuthUser> {
  const user = await getAuthenticatedUser(client);

  if (!user) {
    throw new AuthenticationError("Authentication required");
  }

  return user;
}

// ============================================
// Response Helpers
// ============================================

/**
 * Create JSON success response
 */
export function jsonResponse<T>(
  data: T,
  options?: {
    status?: number;
    cache?: CacheHeaders | string;
    headers?: Record<string, string>;
  }
): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": "application/json",
    ...options?.headers,
  };

  // Add cache headers
  if (options?.cache) {
    if (typeof options.cache === "string") {
      headers["Cache-Control"] = options.cache;
    } else {
      Object.assign(headers, options.cache);
    }
  }

  return new Response(JSON.stringify(data), {
    status: options?.status ?? 200,
    headers,
  });
}

/**
 * Create error response
 */
export function errorResponse(
  error: string | Error,
  options?: {
    status?: number;
    code?: string;
    details?: Record<string, any>;
  }
): Response {
  const errorMessage = error instanceof Error ? error.message : error;

  const body: ErrorResponse = {
    error: errorMessage,
    code: options?.code,
    details: options?.details,
  };

  return new Response(JSON.stringify(body), {
    status: options?.status ?? 400,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate required fields in request body
 */
export function validateRequired<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missing = requiredFields.filter(
    (field) =>
      data[field] === undefined || data[field] === null || data[field] === ""
  );

  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(", ")}`
    );
  }
}

/**
 * Validate number is positive
 */
export function validatePositiveNumber(
  value: number,
  fieldName: string
): void {
  if (typeof value !== "number" || isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }

  if (value <= 0) {
    throw new ValidationError(`${fieldName} must be positive`);
  }
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDateFormat(date: string, fieldName: string): void {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(date)) {
    throw new ValidationError(
      `${fieldName} must be in YYYY-MM-DD format`
    );
  }

  // Check if valid date
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    throw new ValidationError(`${fieldName} is not a valid date`);
  }
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: T,
  allowedValues: T[],
  fieldName: string
): void {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(", ")}`
    );
  }
}

// ============================================
// Cache Utilities
// ============================================

/**
 * Generate cache headers for different strategies
 */
export function getCacheHeaders(strategy: "short" | "medium" | "long" | "no-cache"): CacheHeaders {
  switch (strategy) {
    case "short":
      // 5 minutes, stale-while-revalidate for 1 hour
      return {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      };
    case "medium":
      // 30 minutes, stale-while-revalidate for 1 day
      return {
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
      };
    case "long":
      // 24 hours, stale-while-revalidate for 7 days
      return {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      };
    case "no-cache":
      return {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
  }
}

// ============================================
// Date Utilities
// ============================================

/**
 * Get current date in YYYY-MM-DD format
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get date N days ago in YYYY-MM-DD format
 */
export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Get previous month in YYYY-MM format
 */
export function getPreviousMonth(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// ============================================
// Error Classes
// ============================================

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = "DatabaseError";
  }
}

// ============================================
// Logging Utilities
// ============================================

/**
 * Structured logging for Edge Functions
 */
export class Logger {
  private functionName: string;

  constructor(functionName: string) {
    this.functionName = functionName;
  }

  private log(level: string, message: string, meta?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      function: this.functionName,
      message,
      ...meta,
    };
    console.log(JSON.stringify(logEntry));
  }

  info(message: string, meta?: Record<string, any>) {
    this.log("INFO", message, meta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log("WARN", message, meta);
  }

  error(message: string, meta?: Record<string, any>) {
    this.log("ERROR", message, meta);
  }

  debug(message: string, meta?: Record<string, any>) {
    this.log("DEBUG", message, meta);
  }
}

// ============================================
// Performance Utilities
// ============================================

/**
 * Measure function execution time
 */
export async function measurePerformance<T>(
  fn: () => Promise<T>,
  operationName: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  console.log(`[Performance] ${operationName}: ${duration.toFixed(2)}ms`);

  return { result, duration };
}
