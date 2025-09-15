/**
 * Production Monitoring Service
 * 
 * Comprehensive monitoring and alerting for PAM in production.
 * Tracks performance, errors, user experience, and system health.
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface ErrorReport {
  id: string;
  error: Error;
  context: {
    userId?: string;
    feature: string;
    userAgent: string;
    url: string;
    timestamp: Date;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

interface AlertConfig {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  duration: number; // minutes
  severity: 'info' | 'warning' | 'error' | 'critical';
  recipients: string[];
  enabled: boolean;
}

interface UserExperienceMetric {
  userId: string;
  sessionId: string;
  feature: string;
  action: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Production Monitoring Service
 */
export class ProductionMonitoringService {
  private static instance: ProductionMonitoringService;
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorReport[] = [];
  private userMetrics: UserExperienceMetric[] = [];
  private isProduction: boolean;
  
  // Alert configurations
  private alerts: AlertConfig[] = [
    {
      metric: 'pam_response_time',
      threshold: 2000, // 2 seconds
      operator: 'gt',
      duration: 5,
      severity: 'warning',
      recipients: ['dev-team@wheelsandwins.com'],
      enabled: true
    },
    {
      metric: 'pam_error_rate',
      threshold: 5, // 5%
      operator: 'gt',
      duration: 10,
      severity: 'error',
      recipients: ['dev-team@wheelsandwins.com', 'support@wheelsandwins.com'],
      enabled: true
    },
    {
      metric: 'pam_memory_usage',
      threshold: 150, // 150MB
      operator: 'gt',
      duration: 15,
      severity: 'warning',
      recipients: ['dev-team@wheelsandwins.com'],
      enabled: true
    },
    {
      metric: 'pam_api_failures',
      threshold: 10, // 10 failures per minute
      operator: 'gt',
      duration: 5,
      severity: 'critical',
      recipients: ['dev-team@wheelsandwins.com', 'ops@wheelsandwins.com'],
      enabled: true
    }
  ];

  private constructor() {
    this.isProduction = this.detectEnvironment() === 'production';
    this.setupGlobalErrorHandling();
    this.setupPerformanceObserver();
    this.startMetricsCollection();
  }

  public static getInstance(): ProductionMonitoringService {
    if (!ProductionMonitoringService.instance) {
      ProductionMonitoringService.instance = new ProductionMonitoringService();
    }
    return ProductionMonitoringService.instance;
  }

  /**
   * Track PAM performance metrics
   */
  public trackPerformance(name: string, value: number, unit: string = 'ms', tags?: Record<string, string>) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    };

    this.metrics.push(metric);
    
    // Send to external monitoring service in production
    if (this.isProduction) {
      this.sendToMonitoringService(metric);
    }

    // Check for alerts
    this.checkAlerts(name, value);
    
    // Clean up old metrics (keep last 1000)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Track PAM errors
   */
  public trackError(error: Error, context: Partial<ErrorReport['context']> = {}, severity: ErrorReport['severity'] = 'medium') {
    const errorReport: ErrorReport = {
      id: this.generateId(),
      error,
      context: {
        feature: 'pam',
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date(),
        ...context
      },
      severity,
      resolved: false
    };

    this.errors.push(errorReport);
    
    // Send to external error tracking in production
    if (this.isProduction) {
      this.sendErrorToTrackingService(errorReport);
    }

    // Trigger immediate alert for critical errors
    if (severity === 'critical') {
      this.sendAlert(`Critical PAM Error: ${error.message}`, 'critical');
    }

    // Clean up old errors (keep last 500)
    if (this.errors.length > 500) {
      this.errors = this.errors.slice(-500);
    }
  }

  /**
   * Track user experience metrics
   */
  public trackUserExperience(
    feature: string,
    action: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ) {
    const metric: UserExperienceMetric = {
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      feature,
      action,
      duration,
      success,
      timestamp: new Date(),
      metadata
    };

    this.userMetrics.push(metric);
    
    // Send to analytics in production
    if (this.isProduction) {
      this.sendToAnalyticsService(metric);
    }

    // Track as performance metric
    this.trackPerformance(`${feature}_${action}_duration`, duration, 'ms', {
      success: success.toString(),
      feature,
      action
    });

    // Clean up old user metrics (keep last 2000)
    if (this.userMetrics.length > 2000) {
      this.userMetrics = this.userMetrics.slice(-2000);
    }
  }

  /**
   * Get performance dashboard data
   */
  public getPerformanceDashboard(): {
    metrics: PerformanceMetric[];
    errors: ErrorReport[];
    userMetrics: UserExperienceMetric[];
    summary: {
      avgResponseTime: number;
      errorRate: number;
      successRate: number;
      totalUsers: number;
    };
  } {
    const recentMetrics = this.metrics.filter(m => 
      m.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    );

    const recentErrors = this.errors.filter(e => 
      e.context.timestamp > new Date(Date.now() - 60 * 60 * 1000)
    );

    const recentUserMetrics = this.userMetrics.filter(m => 
      m.timestamp > new Date(Date.now() - 60 * 60 * 1000)
    );

    const responseTimeMetrics = recentMetrics.filter(m => m.name.includes('response_time'));
    const avgResponseTime = responseTimeMetrics.length > 0 
      ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
      : 0;

    const totalActions = recentUserMetrics.length;
    const successfulActions = recentUserMetrics.filter(m => m.success).length;
    const successRate = totalActions > 0 ? (successfulActions / totalActions) * 100 : 100;
    const errorRate = 100 - successRate;

    const uniqueUsers = new Set(recentUserMetrics.map(m => m.userId)).size;

    return {
      metrics: recentMetrics,
      errors: recentErrors,
      userMetrics: recentUserMetrics,
      summary: {
        avgResponseTime,
        errorRate,
        successRate,
        totalUsers: uniqueUsers
      }
    };
  }

  /**
   * Get system health status
   */
  public getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'down';
    checks: Record<string, boolean>;
    lastUpdate: Date;
  } {
    const checks = {
      pamResponseTime: this.checkResponseTime(),
      errorRate: this.checkErrorRate(),
      memoryUsage: this.checkMemoryUsage(),
      apiConnectivity: this.checkAPIConnectivity()
    };

    const failedChecks = Object.values(checks).filter(check => !check).length;
    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    
    if (failedChecks === 0) {
      status = 'healthy';
    } else if (failedChecks <= 2) {
      status = 'degraded';
    } else {
      status = 'down';
    }

    return {
      status,
      checks,
      lastUpdate: new Date()
    };
  }

  /**
   * Manual health check endpoint
   */
  public async runHealthCheck(): Promise<{
    status: string;
    timestamp: Date;
    services: Record<string, { status: string; responseTime?: number }>;
  }> {
    const startTime = performance.now();
    
    const services: Record<string, { status: string; responseTime?: number }> = {};
    
    // Check PAM core functionality
    try {
      const pamStart = performance.now();
      // Simulate PAM health check
      await new Promise(resolve => setTimeout(resolve, 100));
      services.pam = {
        status: 'healthy',
        responseTime: performance.now() - pamStart
      };
    } catch (error) {
      services.pam = { status: 'unhealthy' };
    }

    // Check Claude API connectivity
    try {
      const claudeStart = performance.now();
      // In production, this would be a real API call
      await new Promise(resolve => setTimeout(resolve, 200));
      services.claude = {
        status: 'healthy',
        responseTime: performance.now() - claudeStart
      };
    } catch (error) {
      services.claude = { status: 'unhealthy' };
    }

    // Check Supabase connectivity
    try {
      const supabaseStart = performance.now();
      // In production, this would be a real database query
      await new Promise(resolve => setTimeout(resolve, 150));
      services.supabase = {
        status: 'healthy',
        responseTime: performance.now() - supabaseStart
      };
    } catch (error) {
      services.supabase = { status: 'unhealthy' };
    }

    const allHealthy = Object.values(services).every(service => service.status === 'healthy');
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date(),
      services
    };
  }

  /**
   * Setup global error handling
   */
  private setupGlobalErrorHandling() {
    // Catch unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError(new Error(event.message), {
        feature: 'global',
        url: event.filename,
        userId: this.getCurrentUserId()
      }, 'high');
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(event.reason), {
        feature: 'promise',
        userId: this.getCurrentUserId()
      }, 'high');
    });
  }

  /**
   * Setup performance observer
   */
  private setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      // Monitor navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.trackPerformance('page_load_time', navEntry.loadEventEnd - navEntry.navigationStart, 'ms');
            this.trackPerformance('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.navigationStart, 'ms');
          }
        }
      });

      navObserver.observe({ entryTypes: ['navigation'] });

      // Monitor resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('claude') || entry.name.includes('api')) {
            this.trackPerformance('api_request_time', entry.duration, 'ms', {
              resource: entry.name
            });
          }
        }
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection() {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics() {
    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.trackPerformance('memory_used', memory.usedJSHeapSize / 1024 / 1024, 'MB');
      this.trackPerformance('memory_total', memory.totalJSHeapSize / 1024 / 1024, 'MB');
    }

    // Connection info
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.trackPerformance('network_speed', connection.downlink, 'Mbps');
    }
  }

  /**
   * Check alerts
   */
  private checkAlerts(metricName: string, value: number) {
    const relevantAlerts = this.alerts.filter(alert => 
      alert.enabled && alert.metric === metricName
    );

    for (const alert of relevantAlerts) {
      let shouldAlert = false;
      
      switch (alert.operator) {
        case 'gt':
          shouldAlert = value > alert.threshold;
          break;
        case 'lt':
          shouldAlert = value < alert.threshold;
          break;
        case 'eq':
          shouldAlert = value === alert.threshold;
          break;
      }

      if (shouldAlert) {
        this.sendAlert(
          `Alert: ${metricName} is ${value} (threshold: ${alert.threshold})`,
          alert.severity
        );
      }
    }
  }

  /**
   * Send alert
   */
  private sendAlert(message: string, severity: string) {
    if (this.isProduction) {
      // In production, send to actual alerting service
      console.error(`[PRODUCTION ALERT] ${severity.toUpperCase()}: ${message}`);
      
      // Send to external alerting service (Slack, email, etc.)
      this.sendToAlertingService(message, severity);
    } else {
      console.warn(`[ALERT] ${severity.toUpperCase()}: ${message}`);
    }
  }

  /**
   * Health check methods
   */
  private checkResponseTime(): boolean {
    const recentResponseTimes = this.metrics
      .filter(m => m.name.includes('response_time') && 
               m.timestamp > new Date(Date.now() - 5 * 60 * 1000))
      .map(m => m.value);
    
    if (recentResponseTimes.length === 0) return true;
    
    const avgResponseTime = recentResponseTimes.reduce((sum, time) => sum + time, 0) / recentResponseTimes.length;
    return avgResponseTime < 2000; // 2 seconds
  }

  private checkErrorRate(): boolean {
    const recentErrors = this.errors.filter(e => 
      e.context.timestamp > new Date(Date.now() - 10 * 60 * 1000)
    );
    
    const recentActions = this.userMetrics.filter(m => 
      m.timestamp > new Date(Date.now() - 10 * 60 * 1000)
    );
    
    if (recentActions.length === 0) return true;
    
    const errorRate = (recentErrors.length / recentActions.length) * 100;
    return errorRate < 5; // 5%
  }

  private checkMemoryUsage(): boolean {
    const recentMemoryMetrics = this.metrics
      .filter(m => m.name === 'memory_used' && 
               m.timestamp > new Date(Date.now() - 5 * 60 * 1000));
    
    if (recentMemoryMetrics.length === 0) return true;
    
    const latestMemory = recentMemoryMetrics[recentMemoryMetrics.length - 1];
    return latestMemory.value < 150; // 150MB
  }

  private checkAPIConnectivity(): boolean {
    // Simple check - in production this would test actual API endpoints
    return navigator.onLine;
  }

  /**
   * External service integration methods (stubbed for example)
   */
  private sendToMonitoringService(metric: PerformanceMetric) {
    // In production: send to DataDog, New Relic, etc.
    console.log('Sending metric to monitoring service:', metric);
  }

  private sendErrorToTrackingService(error: ErrorReport) {
    // In production: send to Sentry, Rollbar, etc.
    console.log('Sending error to tracking service:', error);
  }

  private sendToAnalyticsService(metric: UserExperienceMetric) {
    // In production: send to Google Analytics, Mixpanel, etc.
    console.log('Sending user metric to analytics service:', metric);
  }

  private sendToAlertingService(message: string, severity: string) {
    // In production: send to PagerDuty, Slack, email, etc.
    console.log('Sending alert:', { message, severity });
  }

  /**
   * Utility methods
   */
  private detectEnvironment(): string {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('localhost')) return 'development';
      if (hostname.includes('staging')) return 'staging';
      return 'production';
    }
    return process.env.NODE_ENV || 'development';
  }

  private getCurrentUserId(): string {
    // In production, get from auth context
    return 'user_' + Math.random().toString(36).substr(2, 9);
  }

  private getSessionId(): string {
    // Get or create session ID
    let sessionId = sessionStorage.getItem('pam_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('pam_session_id', sessionId);
    }
    return sessionId;
  }

  private generateId(): string {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// Export singleton instance
export const productionMonitoring = ProductionMonitoringService.getInstance();

// React hooks for monitoring
export const usePerformanceTracking = () => {
  return {
    trackPerformance: productionMonitoring.trackPerformance.bind(productionMonitoring),
    trackError: productionMonitoring.trackError.bind(productionMonitoring),
    trackUserExperience: productionMonitoring.trackUserExperience.bind(productionMonitoring)
  };
};

export default productionMonitoring;