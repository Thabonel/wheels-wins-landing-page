/**
 * Feature Validation for PAM AI SDK Migration
 * Phase 4: Feature Parity and Security
 */

import { z } from 'zod';
import * as Sentry from '@sentry/react';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Feature parity checklist
 */
export const featureParityChecklist = {
  core: {
    textChat: { implemented: true, tested: false },
    voiceInput: { implemented: true, tested: false },
    voiceOutput: { implemented: true, tested: false },
    streaming: { implemented: true, tested: false },
    contextAwareness: { implemented: true, tested: false },
  },
  tools: {
    weather: { implemented: true, tested: false },
    searchNearby: { implemented: true, tested: false },
    trackExpense: { implemented: true, tested: false },
    planTrip: { implemented: true, tested: false },
    getUserContext: { implemented: true, tested: false },
    searchWeb: { implemented: true, tested: false },
    emergencyAssistance: { implemented: true, tested: false },
  },
  integrations: {
    tripPlanner: { implemented: true, tested: false },
    expenseTracking: { implemented: true, tested: false },
    mapIntegration: { implemented: true, tested: false },
    supabaseSync: { implemented: true, tested: false },
  },
  performance: {
    responseTime: { target: '< 2s', current: null },
    streamingLatency: { target: '< 500ms', current: null },
    voiceRecognition: { target: '> 95%', current: null },
    errorRate: { target: '< 5%', current: null },
  },
  security: {
    inputValidation: { implemented: true, tested: false },
    rateLimit: { implemented: false, tested: false },
    authentication: { implemented: true, tested: false },
    dataEncryption: { implemented: true, tested: false },
  },
};

/**
 * Input validation schemas
 */
export const messageSchema = z.object({
  content: z.string().min(1).max(10000),
  role: z.enum(['user', 'assistant', 'system']),
  timestamp: z.string().datetime().optional(),
});

export const toolCallSchema = z.object({
  name: z.string(),
  parameters: z.record(z.any()),
});

/**
 * Security utilities
 */
export class SecurityValidator {
  /**
   * Sanitize user input to prevent XSS
   */
  static sanitizeInput(input: string): string {
    // Remove any HTML tags and scripts
    const sanitized = DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
    
    // Additional validation for common injection patterns
    const dangerous = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /eval\(/i,
      /expression\(/i,
    ];
    
    for (const pattern of dangerous) {
      if (pattern.test(sanitized)) {
        Sentry.captureMessage('Potential XSS attempt blocked', 'warning');
        return '';
      }
    }
    
    return sanitized;
  }

  /**
   * Validate API responses
   */
  static validateResponse(response: any): boolean {
    try {
      // Check for required fields
      if (!response || typeof response !== 'object') {
        return false;
      }
      
      // Validate message structure if present
      if (response.message) {
        messageSchema.parse(response.message);
      }
      
      // Validate tool calls if present
      if (response.toolCalls) {
        z.array(toolCallSchema).parse(response.toolCalls);
      }
      
      return true;
    } catch (error) {
      Sentry.captureException(error);
      return false;
    }
  }

  /**
   * Rate limiting check
   */
  static checkRateLimit(
    userId: string,
    limits: { perMinute: number; perHour: number }
  ): boolean {
    const now = Date.now();
    const userLimits = this.rateLimitStore.get(userId) || {
      minuteCount: 0,
      minuteReset: now + 60000,
      hourCount: 0,
      hourReset: now + 3600000,
    };

    // Reset counters if needed
    if (now > userLimits.minuteReset) {
      userLimits.minuteCount = 0;
      userLimits.minuteReset = now + 60000;
    }
    if (now > userLimits.hourReset) {
      userLimits.hourCount = 0;
      userLimits.hourReset = now + 3600000;
    }

    // Check limits
    if (userLimits.minuteCount >= limits.perMinute ||
        userLimits.hourCount >= limits.perHour) {
      return false;
    }

    // Increment counters
    userLimits.minuteCount++;
    userLimits.hourCount++;
    this.rateLimitStore.set(userId, userLimits);

    return true;
  }

  private static rateLimitStore = new Map<string, any>();
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();

  /**
   * Track a performance metric
   */
  static track(metric: string, value: number): void {
    const values = this.metrics.get(metric) || [];
    values.push(value);
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
    
    this.metrics.set(metric, values);

    // Report to Sentry if threshold exceeded
    if (metric === 'responseTime' && value > 2000) {
      Sentry.addBreadcrumb({
        message: 'Slow response detected',
        data: { responseTime: value },
        level: 'warning',
      });
    }
  }

  /**
   * Get metric statistics
   */
  static getStats(metric: string): {
    avg: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const values = this.metrics.get(metric);
    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const p95Index = Math.floor(sorted.length * 0.95);

    return {
      avg: sum / sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[p95Index],
    };
  }

  /**
   * Clear metrics
   */
  static clear(): void {
    this.metrics.clear();
  }
}

/**
 * Feature validation runner
 */
export async function validateFeatures(): Promise<{
  passed: string[];
  failed: string[];
  warnings: string[];
}> {
  const results = {
    passed: [] as string[],
    failed: [] as string[],
    warnings: [] as string[],
  };

  // Check core features
  for (const [feature, status] of Object.entries(featureParityChecklist.core)) {
    if (status.implemented && status.tested) {
      results.passed.push(`Core: ${feature}`);
    } else if (status.implemented && !status.tested) {
      results.warnings.push(`Core: ${feature} (not tested)`);
    } else {
      results.failed.push(`Core: ${feature}`);
    }
  }

  // Check tools
  for (const [tool, status] of Object.entries(featureParityChecklist.tools)) {
    if (status.implemented && status.tested) {
      results.passed.push(`Tool: ${tool}`);
    } else if (status.implemented && !status.tested) {
      results.warnings.push(`Tool: ${tool} (not tested)`);
    } else {
      results.failed.push(`Tool: ${tool}`);
    }
  }

  // Check security
  for (const [security, status] of Object.entries(featureParityChecklist.security)) {
    if (status.implemented && status.tested) {
      results.passed.push(`Security: ${security}`);
    } else if (status.implemented && !status.tested) {
      results.warnings.push(`Security: ${security} (not tested)`);
    } else {
      results.failed.push(`Security: ${security}`);
    }
  }

  // Log results to Sentry
  Sentry.addBreadcrumb({
    message: 'Feature validation completed',
    data: results,
    level: 'info',
  });

  return results;
}

/**
 * Migration readiness check
 */
export async function checkMigrationReadiness(): Promise<{
  ready: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Run feature validation
  const validation = await validateFeatures();
  
  if (validation.failed.length > 0) {
    issues.push(...validation.failed.map(f => `Missing: ${f}`));
  }
  
  if (validation.warnings.length > 0) {
    recommendations.push(...validation.warnings.map(w => `Test: ${w}`));
  }

  // Check performance metrics
  const responseStats = PerformanceMonitor.getStats('responseTime');
  if (responseStats && responseStats.p95 > 2000) {
    issues.push(`Response time P95: ${responseStats.p95}ms (target: < 2000ms)`);
  }

  // Check security
  if (!featureParityChecklist.security.rateLimit.implemented) {
    recommendations.push('Implement rate limiting for production');
  }

  // Database migration check
  recommendations.push('Ensure database migrations are prepared');
  recommendations.push('Create rollback plan for WebSocket implementation');
  recommendations.push('Prepare monitoring and alerting');

  const ready = issues.length === 0;

  return {
    ready,
    issues,
    recommendations,
  };
}