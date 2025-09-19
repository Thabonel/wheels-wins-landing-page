/**
 * Security Monitoring System
 * Detects and logs security events for production monitoring
 */

interface SecurityEvent {
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  userId?: string;
  userAgent?: string;
  ip?: string;
  details: Record<string, any>;
  fingerprint?: string;
}

enum SecurityEventType {
  AUTHENTICATION_FAILURE = 'auth_failure',
  AUTHENTICATION_SUCCESS = 'auth_success',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  XSS_ATTEMPT = 'xss_attempt',
  CSRF_ATTEMPT = 'csrf_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  ACCOUNT_TAKEOVER_ATTEMPT = 'account_takeover_attempt',
  BRUTE_FORCE_ATTACK = 'brute_force_attack',
  SECURITY_HEADER_VIOLATION = 'security_header_violation'
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private maxEvents: number = 1000;
  private alertThresholds: Map<SecurityEventType, { count: number; windowMs: number }> = new Map();

  constructor() {
    this.setupAlertThresholds();
    this.initializeMonitoring();
  }

  /**
   * Log a security event
   */
  logEvent(
    type: SecurityEventType,
    severity: SecurityEvent['severity'],
    details: Record<string, any>,
    userId?: string
  ): void {
    const event: SecurityEvent = {
      type,
      severity,
      timestamp: Date.now(),
      userId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      ip: this.getClientIP(),
      details,
      fingerprint: this.generateFingerprint(type, details)
    };

    // Add to events array
    this.events.push(event);

    // Maintain max events limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Check for alert conditions
    this.checkAlertConditions(event);

    // Log to console in development
    if (import.meta.env.MODE === 'development') {
      console.warn('🔒 Security Event:', event);
    }

    // Send to external monitoring (Sentry, custom endpoint, etc.)
    this.sendToMonitoring(event);
  }

  /**
   * Get recent security events
   */
  getRecentEvents(
    timeWindowMs: number = 24 * 60 * 60 * 1000,
    type?: SecurityEventType
  ): SecurityEvent[] {
    const cutoff = Date.now() - timeWindowMs;

    return this.events.filter(event => {
      const inTimeWindow = event.timestamp >= cutoff;
      const matchesType = !type || event.type === type;
      return inTimeWindow && matchesType;
    });
  }

  /**
   * Get security statistics
   */
  getSecurityStats(timeWindowMs: number = 24 * 60 * 60 * 1000): Record<string, any> {
    const recentEvents = this.getRecentEvents(timeWindowMs);

    const stats = {
      totalEvents: recentEvents.length,
      eventsBySeverity: this.groupBy(recentEvents, 'severity'),
      eventsByType: this.groupBy(recentEvents, 'type'),
      uniqueUsers: new Set(recentEvents.map(e => e.userId).filter(Boolean)).size,
      topUserAgents: this.getTopValues(recentEvents, 'userAgent', 5),
      topIPs: this.getTopValues(recentEvents, 'ip', 5),
      timeWindow: timeWindowMs,
      generatedAt: Date.now()
    };

    return stats;
  }

  /**
   * Check if user behavior is suspicious
   */
  analyzeSuspiciousBehavior(userId: string): {
    riskScore: number;
    reasons: string[];
    recommendations: string[];
  } {
    const userEvents = this.events.filter(e => e.userId === userId);
    const recentEvents = userEvents.filter(e => e.timestamp >= Date.now() - 24 * 60 * 60 * 1000);

    let riskScore = 0;
    const reasons: string[] = [];
    const recommendations: string[] = [];

    // Multiple failed login attempts
    const authFailures = recentEvents.filter(e => e.type === SecurityEventType.AUTHENTICATION_FAILURE);
    if (authFailures.length >= 3) {
      riskScore += 30;
      reasons.push(`${authFailures.length} failed login attempts in 24h`);
      recommendations.push('Consider requiring MFA');
    }

    // Rate limiting violations
    const rateLimitViolations = recentEvents.filter(e => e.type === SecurityEventType.RATE_LIMIT_EXCEEDED);
    if (rateLimitViolations.length >= 5) {
      riskScore += 25;
      reasons.push('Multiple rate limit violations');
      recommendations.push('Implement progressive delays');
    }

    // Multiple user agents (possible bot)
    const userAgents = new Set(recentEvents.map(e => e.userAgent).filter(Boolean));
    if (userAgents.size >= 3) {
      riskScore += 20;
      reasons.push('Multiple user agents detected');
      recommendations.push('Verify device authenticity');
    }

    // High-severity events
    const highSeverityEvents = recentEvents.filter(e => e.severity === 'high' || e.severity === 'critical');
    if (highSeverityEvents.length > 0) {
      riskScore += 40;
      reasons.push(`${highSeverityEvents.length} high-severity security events`);
      recommendations.push('Manual security review required');
    }

    return {
      riskScore: Math.min(100, riskScore),
      reasons,
      recommendations
    };
  }

  /**
   * Clear old events to prevent memory buildup
   */
  cleanup(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    const originalLength = this.events.length;

    this.events = this.events.filter(event => event.timestamp >= cutoff);

    const removed = originalLength - this.events.length;
    if (removed > 0) {
      console.debug(`Security monitor cleaned up ${removed} old events`);
    }
  }

  // Private methods

  private setupAlertThresholds(): void {
    // Configure alert thresholds for different event types
    this.alertThresholds.set(SecurityEventType.AUTHENTICATION_FAILURE, {
      count: 5,
      windowMs: 15 * 60 * 1000 // 5 failures in 15 minutes
    });

    this.alertThresholds.set(SecurityEventType.RATE_LIMIT_EXCEEDED, {
      count: 10,
      windowMs: 60 * 1000 // 10 violations in 1 minute
    });

    this.alertThresholds.set(SecurityEventType.XSS_ATTEMPT, {
      count: 1,
      windowMs: 60 * 1000 // Any XSS attempt triggers alert
    });

    this.alertThresholds.set(SecurityEventType.SQL_INJECTION_ATTEMPT, {
      count: 1,
      windowMs: 60 * 1000 // Any SQL injection attempt triggers alert
    });
  }

  private initializeMonitoring(): void {
    // Monitor for CSP violations
    if (typeof document !== 'undefined') {
      document.addEventListener('securitypolicyviolation', (event) => {
        this.logEvent(
          SecurityEventType.SECURITY_HEADER_VIOLATION,
          'medium',
          {
            violatedDirective: event.violatedDirective,
            blockedURI: event.blockedURI,
            originalPolicy: event.originalPolicy,
            sourceFile: event.sourceFile,
            lineNumber: event.lineNumber,
            columnNumber: event.columnNumber
          }
        );
      });
    }

    // Monitor for unhandled errors that might indicate attacks
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        // Check for suspicious error patterns
        const message = event.message.toLowerCase();
        if (message.includes('script') || message.includes('eval') || message.includes('function')) {
          this.logEvent(
            SecurityEventType.SUSPICIOUS_ACTIVITY,
            'low',
            {
              message: event.message,
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno,
              type: 'javascript_error'
            }
          );
        }
      });
    }

    // Cleanup old events every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  private checkAlertConditions(event: SecurityEvent): void {
    const threshold = this.alertThresholds.get(event.type);
    if (!threshold) return;

    const recentEvents = this.getRecentEvents(threshold.windowMs, event.type);

    if (recentEvents.length >= threshold.count) {
      this.triggerAlert(event.type, recentEvents);
    }
  }

  private triggerAlert(type: SecurityEventType, events: SecurityEvent[]): void {
    const alert = {
      type: 'security_alert',
      eventType: type,
      count: events.length,
      timeWindow: this.alertThresholds.get(type)?.windowMs,
      timestamp: Date.now(),
      events: events.slice(-5) // Include last 5 events
    };

    console.error('🚨 SECURITY ALERT:', alert);

    // Send to monitoring service
    this.sendToMonitoring(alert);
  }

  private sendToMonitoring(data: any): void {
    // Send to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureEvent({
        message: 'Security Event',
        level: data.severity || 'warning',
        tags: {
          type: data.type,
          security: true
        },
        extra: data
      });
    }

    // Send to custom monitoring endpoint
    if (import.meta.env.MODE === 'production') {
      fetch('/api/v1/security/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(error => {
        console.warn('Failed to send security event to monitoring:', error);
      });
    }
  }

  private generateFingerprint(type: SecurityEventType, details: Record<string, any>): string {
    // Generate a hash-based fingerprint for deduplication
    const data = JSON.stringify({ type, ...details });
    let hash = 0;

    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  private getClientIP(): string | undefined {
    // This is limited on the client side, but we can try to get some info
    if (typeof window !== 'undefined' && (window as any).RTCPeerConnection) {
      // WebRTC IP detection (limited by browser security)
      return 'client'; // Placeholder - actual IP detection requires server-side
    }
    return undefined;
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = String(item[key] || 'unknown');
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getTopValues(events: SecurityEvent[], key: keyof SecurityEvent, limit: number): Array<{ value: string; count: number }> {
    const counts = this.groupBy(events, key);

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([value, count]) => ({ value, count }));
  }
}

// Create singleton instance
const securityMonitor = new SecurityMonitor();

// Export convenience functions
export const logSecurityEvent = (
  type: SecurityEventType,
  severity: SecurityEvent['severity'],
  details: Record<string, any>,
  userId?: string
) => securityMonitor.logEvent(type, severity, details, userId);

export const getSecurityStats = (timeWindowMs?: number) =>
  securityMonitor.getSecurityStats(timeWindowMs);

export const analyzeSuspiciousBehavior = (userId: string) =>
  securityMonitor.analyzeSuspiciousBehavior(userId);

export const getRecentSecurityEvents = (timeWindowMs?: number, type?: SecurityEventType) =>
  securityMonitor.getRecentEvents(timeWindowMs, type);

// Export types and enums
export { SecurityEventType, type SecurityEvent };

// Export the monitor instance
export default securityMonitor;