/**
 * Supabase Error Monitoring & Alerting System
 *
 * PURPOSE: Track recurring issues and provide early warning
 * - Log error patterns to identify root causes
 * - Alert when error rates spike
 * - Provide actionable insights for debugging
 */

import { analyzeSupabaseError, type SupabaseErrorInfo } from './supabaseErrorHandler';

interface ErrorMetrics {
  timestamp: number;
  errorType: string;
  operation: string;
  userAgent: string;
  url: string;
  userId?: string;
}

class SupabaseMonitor {
  private errorLog: ErrorMetrics[] = [];
  private readonly maxLogSize = 100;
  private readonly alertThreshold = 5; // Alert if 5+ errors in 5 minutes

  logError(error: any, operation: string, userId?: string) {
    const errorInfo = analyzeSupabaseError(error);

    const metrics: ErrorMetrics = {
      timestamp: Date.now(),
      errorType: errorInfo.type,
      operation,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId
    };

    this.errorLog.push(metrics);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Check for alert conditions
    this.checkAlertConditions(errorInfo, operation);

    // Log to console with context
    console.error('🚨 Supabase Error Logged:', {
      type: errorInfo.type,
      operation,
      message: errorInfo.message,
      isRetryable: errorInfo.isRetryable,
      recentErrors: this.getRecentErrorCount()
    });
  }

  private checkAlertConditions(_errorInfo: SupabaseErrorInfo, _operation: string) {
    const recentErrors = this.getRecentErrors(5 * 60 * 1000); // Last 5 minutes
    const htmlResponseErrors = recentErrors.filter(e => e.errorType === 'html_response');

    // Alert conditions
    if (htmlResponseErrors.length >= this.alertThreshold) {
      this.alertRecurringHTMLResponses(htmlResponseErrors);
    }

    if (recentErrors.length >= this.alertThreshold * 2) {
      this.alertHighErrorRate(recentErrors);
    }
  }

  private alertRecurringHTMLResponses(errors: ErrorMetrics[]) {
    const operations = [...new Set(errors.map(e => e.operation))];

    console.error('🚨🚨🚨 RECURRING HTML RESPONSE ALERT 🚨🚨🚨');
    console.error('Multiple HTML response errors detected!');
    console.error('Affected operations:', operations);
    console.error('Possible causes:');
    console.error('• Supabase proxy/CDN issues');
    console.error('• Network connectivity problems');
    console.error('• Authentication token issues');
    console.error('• Rate limiting or quota exceeded');
    console.error('Check Supabase dashboard for service status');

    // Show user-friendly alert
    if (typeof window !== 'undefined') {
      const toast = require('sonner').toast;
      toast.error('Network issues detected. Operations may be slower than usual.', {
        duration: 10000,
        action: {
          label: 'Retry',
          onClick: () => window.location.reload()
        }
      });
    }
  }

  private alertHighErrorRate(errors: ErrorMetrics[]) {
    const errorTypes = this.groupBy(errors, 'errorType');

    console.warn('⚠️ HIGH ERROR RATE ALERT');
    console.warn(`${errors.length} errors in last 5 minutes`);
    console.warn('Error breakdown:', Object.keys(errorTypes).map(type =>
      `${type}: ${errorTypes[type].length}`
    ));
  }

  getRecentErrors(timeWindowMs: number = 5 * 60 * 1000): ErrorMetrics[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.errorLog.filter(error => error.timestamp > cutoff);
  }

  getRecentErrorCount(): number {
    return this.getRecentErrors().length;
  }

  getErrorSummary(): {
    total: number;
    byType: Record<string, number>;
    byOperation: Record<string, number>;
    recentTrend: 'increasing' | 'stable' | 'decreasing';
  } {
    const recent = this.getRecentErrors();
    const older = this.getRecentErrors(10 * 60 * 1000).slice(0, -recent.length);

    return {
      total: this.errorLog.length,
      byType: this.groupByCount(recent, 'errorType'),
      byOperation: this.groupByCount(recent, 'operation'),
      recentTrend: recent.length > older.length ? 'increasing' :
                   recent.length < older.length ? 'decreasing' : 'stable'
    };
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      groups[groupKey] = groups[groupKey] || [];
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private groupByCount<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((counts, item) => {
      const groupKey = String(item[key]);
      counts[groupKey] = (counts[groupKey] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  // Export logs for debugging
  exportErrorLog(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      errorLog: this.errorLog,
      summary: this.getErrorSummary(),
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now()
      }
    }, null, 2);
  }

  // Clear logs (for testing/reset)
  clearLog() {
    this.errorLog = [];
    console.log('🧹 Supabase error log cleared');
  }
}

// Global monitor instance
export const supabaseMonitor = new SupabaseMonitor();

// Helper function to easily log errors from anywhere
export function logSupabaseError(error: any, operation: string, userId?: string) {
  supabaseMonitor.logError(error, operation, userId);
}

// Debug function for console access
if (typeof window !== 'undefined') {
  (window as any).supabaseMonitor = supabaseMonitor;
  console.log('🔍 Supabase Monitor available at: window.supabaseMonitor');
}