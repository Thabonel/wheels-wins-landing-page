/**
 * Error Tracking and Monitoring System
 * Comprehensive error tracking that avoids trip planner interference
 */

import { performanceMonitor } from './performanceMonitor';
import { cacheManager } from './cacheManager';

interface ErrorContext {
  userId?: string;
  route: string;
  userAgent: string;
  timestamp: number;
  sessionId: string;
  buildVersion: string;
}

interface ErrorDetails {
  id: string;
  message: string;
  stack?: string;
  type: 'javascript' | 'network' | 'websocket' | 'performance' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: ErrorContext;
  metadata?: Record<string, any>;
  resolved: boolean;
  occurrenceCount: number;
}

interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  errorsByRoute: Record<string, number>;
  averageErrorsPerSession: number;
  topErrors: Array<{ message: string; count: number }>;
}

class SafeErrorTracker {
  private errors: Map<string, ErrorDetails> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private sessionId: string;
  private buildVersion: string;

  // Safe routes for error tracking (avoid trip planner routes)
  private readonly SAFE_ROUTES = [
    '/admin',
    '/profile',
    '/financial',
    '/social',
    '/pam',
    '/settings',
    '/auth',
    '/analytics'
  ];

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.buildVersion = process.env.VITE_BUILD_VERSION || 'dev';
    this.initializeGlobalHandlers();
  }

  private initializeGlobalHandlers() {
    // Global JavaScript error handler
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        type: 'javascript',
        severity: this.classifyErrorSeverity(event.error),
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        type: 'javascript',
        severity: 'high',
        metadata: {
          reason: event.reason,
          promise: 'unhandled_rejection'
        }
      });
    });

    // Network error detection
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        if (!response.ok) {
          this.captureError({
            message: `Network Error: ${response.status} ${response.statusText}`,
            type: 'network',
            severity: response.status >= 500 ? 'high' : 'medium',
            metadata: {
              url: args[0]?.toString(),
              status: response.status,
              statusText: response.statusText
            }
          });
        }

        return response;
      } catch (error) {
        this.captureError({
          message: `Fetch Error: ${error}`,
          stack: error instanceof Error ? error.stack : undefined,
          type: 'network',
          severity: 'high',
          metadata: {
            url: args[0]?.toString(),
            fetchError: true
          }
        });
        throw error;
      }
    };
  }

  private isSafeRoute(route: string): boolean {
    // Don't track errors from trip planner routes
    const tripPlannerRoutes = ['/wheels', '/trip', '/map', '/navigation', '/route'];

    if (tripPlannerRoutes.some(tripRoute => route.startsWith(tripRoute))) {
      console.warn(`🚫 Error tracking blocked for trip planner route: ${route}`);
      return false;
    }

    return this.SAFE_ROUTES.some(safeRoute => route.startsWith(safeRoute)) || route === '/';
  }

  public classifyErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    if (!error) return 'low';

    const message = error.message?.toLowerCase() || '';

    // Critical errors
    if (message.includes('security') ||
        message.includes('unauthorized') ||
        message.includes('authentication failed')) {
      return 'critical';
    }

    // High priority errors
    if (message.includes('network') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('websocket')) {
      return 'high';
    }

    // Medium priority errors
    if (message.includes('validation') ||
        message.includes('permission') ||
        message.includes('not found')) {
      return 'medium';
    }

    return 'low';
  }

  private getContext(): ErrorContext {
    return {
      userId: this.getCurrentUserId(),
      route: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      buildVersion: this.buildVersion
    };
  }

  private getCurrentUserId(): string | undefined {
    // Safely get user ID from various sources
    try {
      // Check localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return user.id;
      }

      // Check Supabase auth
      const supabaseAuth = localStorage.getItem('sb-' + process.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
      if (supabaseAuth) {
        const auth = JSON.parse(supabaseAuth);
        return auth.user?.id;
      }
    } catch {
      // Silently fail
    }

    return undefined;
  }

  public captureError(error: {
    message: string;
    stack?: string;
    type: 'javascript' | 'network' | 'websocket' | 'performance' | 'security';
    severity: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
  }): string | null {
    const context = this.getContext();

    // Only track errors from safe routes
    if (!this.isSafeRoute(context.route)) {
      return null;
    }

    // Create error fingerprint for deduplication
    const fingerprint = this.createErrorFingerprint(error.message, error.stack, context.route);

    // Check if we've seen this error before
    const existingError = this.errors.get(fingerprint);
    if (existingError) {
      existingError.occurrenceCount++;
      existingError.context.timestamp = Date.now();
      console.log(`🔄 Duplicate error tracked: ${fingerprint} (count: ${existingError.occurrenceCount})`);
      return fingerprint;
    }

    // Create new error entry
    const errorDetails: ErrorDetails = {
      id: fingerprint,
      message: error.message,
      stack: error.stack,
      type: error.type,
      severity: error.severity,
      context,
      metadata: error.metadata,
      resolved: false,
      occurrenceCount: 1
    };

    this.errors.set(fingerprint, errorDetails);
    this.updateErrorCounts(fingerprint);

    // Log error based on severity
    const logLevel = error.severity === 'critical' ? 'error' :
                    error.severity === 'high' ? 'error' :
                    error.severity === 'medium' ? 'warn' : 'log';

    console[logLevel](`🚨 Error tracked [${error.severity}]:`, {
      id: fingerprint,
      message: error.message,
      type: error.type,
      route: context.route,
      metadata: error.metadata
    });

    // Cache error for performance analysis
    cacheManager.set(`error_${fingerprint}`, errorDetails, 24 * 60 * 60 * 1000); // 24 hours

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendErrorToMonitoring(errorDetails);
    }

    // Record performance impact
    performanceMonitor.recordUserInteraction(`error_${error.type}_${error.severity}`);

    return fingerprint;
  }

  private createErrorFingerprint(message: string, stack?: string, route?: string): string {
    // Create a unique fingerprint for error deduplication
    const key = `${message}_${route}_${stack?.split('\n')[0] || 'no_stack'}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
  }

  private updateErrorCounts(fingerprint: string) {
    const count = this.errorCounts.get(fingerprint) || 0;
    this.errorCounts.set(fingerprint, count + 1);
  }

  private async sendErrorToMonitoring(error: ErrorDetails) {
    try {
      await fetch('/api/error-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      });
    } catch (sendError) {
      console.error('Failed to send error to monitoring:', sendError);
    }
  }

  // Public methods
  public captureWebSocketError(error: string, metadata?: Record<string, any>): string | null {
    return this.captureError({
      message: `WebSocket Error: ${error}`,
      type: 'websocket',
      severity: 'high',
      metadata
    });
  }

  public capturePerformanceError(metric: string, value: number, threshold: number): string | null {
    return this.captureError({
      message: `Performance Issue: ${metric} (${value}ms > ${threshold}ms)`,
      type: 'performance',
      severity: value > threshold * 2 ? 'high' : 'medium',
      metadata: { metric, value, threshold }
    });
  }

  public captureSecurityError(error: string, metadata?: Record<string, any>): string | null {
    return this.captureError({
      message: `Security Error: ${error}`,
      type: 'security',
      severity: 'critical',
      metadata
    });
  }

  public markErrorResolved(errorId: string): boolean {
    const error = this.errors.get(errorId);
    if (error) {
      error.resolved = true;
      console.log(`✅ Error resolved: ${errorId}`);
      return true;
    }
    return false;
  }

  public getErrorMetrics(): ErrorMetrics {
    const errors = Array.from(this.errors.values());

    const errorsByType = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + error.occurrenceCount;
      return acc;
    }, {} as Record<string, number>);

    const errorsBySeverity = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + error.occurrenceCount;
      return acc;
    }, {} as Record<string, number>);

    const errorsByRoute = errors.reduce((acc, error) => {
      acc[error.context.route] = (acc[error.context.route] || 0) + error.occurrenceCount;
      return acc;
    }, {} as Record<string, number>);

    const topErrors = errors
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
      .slice(0, 10)
      .map(error => ({
        message: error.message,
        count: error.occurrenceCount
      }));

    return {
      totalErrors: errors.reduce((sum, error) => sum + error.occurrenceCount, 0),
      errorsByType,
      errorsBySeverity,
      errorsByRoute,
      averageErrorsPerSession: errors.length > 0 ? errors.reduce((sum, error) => sum + error.occurrenceCount, 0) / new Set(errors.map(e => e.context.sessionId)).size : 0,
      topErrors
    };
  }

  public generateErrorReport(): string {
    const metrics = this.getErrorMetrics();
    const criticalErrors = Array.from(this.errors.values()).filter(e => e.severity === 'critical' && !e.resolved);

    return `
🚨 Error Tracking Report
========================
Total Errors: ${metrics.totalErrors}
Session ID: ${this.sessionId}
Build Version: ${this.buildVersion}

📊 Error Breakdown:
${Object.entries(metrics.errorsByType).map(([type, count]) => `• ${type}: ${count}`).join('\n')}

🔥 By Severity:
${Object.entries(metrics.errorsBySeverity).map(([severity, count]) => `• ${severity}: ${count}`).join('\n')}

🚨 Unresolved Critical Errors: ${criticalErrors.length}
${criticalErrors.slice(0, 3).map(error => `• ${error.message}`).join('\n')}

🏆 Top Error Routes:
${Object.entries(metrics.errorsByRoute).slice(0, 5).map(([route, count]) => `• ${route}: ${count}`).join('\n')}
    `.trim();
  }

  public cleanup() {
    // Clear old errors (keep only last 24 hours)
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);

    for (const [id, error] of this.errors.entries()) {
      if (error.context.timestamp < cutoff) {
        this.errors.delete(id);
        this.errorCounts.delete(id);
      }
    }
  }
}

// Global error tracker instance
export const errorTracker = new SafeErrorTracker();

// React hook for component-level error tracking
export const useErrorTracking = (componentName: string) => {
  return {
    captureError: (error: Error, metadata?: Record<string, any>) => {
      return errorTracker.captureError({
        message: `${componentName}: ${error.message}`,
        stack: error.stack,
        type: 'javascript',
        severity: errorTracker.classifyErrorSeverity ? errorTracker.classifyErrorSeverity(error) : 'medium',
        metadata: { component: componentName, ...metadata }
      });
    },
    captureNetworkError: (url: string, status?: number) => {
      return errorTracker.captureError({
        message: `${componentName}: Network error for ${url}`,
        type: 'network',
        severity: (status && status >= 500) ? 'high' : 'medium',
        metadata: { component: componentName, url, status }
      });
    }
  };
};