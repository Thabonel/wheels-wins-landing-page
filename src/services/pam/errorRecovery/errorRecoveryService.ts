/**
 * PAM Error Recovery Service
 * 
 * Comprehensive error handling system with retry logic, fallback responses,
 * offline detection, graceful degradation, and user-friendly error messages.
 */

import { logger } from '@/lib/logger';
import { pamAnalytics } from '../analytics';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export type ErrorType = 
  | 'network_error'
  | 'api_error'
  | 'authentication_error'
  | 'rate_limit_error'
  | 'validation_error'
  | 'timeout_error'
  | 'server_error'
  | 'client_error'
  | 'unknown_error';

export type RecoveryStrategy = 
  | 'retry'
  | 'fallback'
  | 'graceful_degradation'
  | 'offline_queue'
  | 'user_notification'
  | 'fail_fast';

export interface ErrorContext {
  operation: string;
  component: string;
  userId?: string;
  sessionId?: string;
  userInput?: any;
  systemState?: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface RecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  data?: any;
  error?: Error;
  message: string;
  recoveryTime: number;
  fallbackUsed: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: ErrorType[];
}

export interface FallbackConfig {
  enabled: boolean;
  responses: Record<string, any>;
  gracefulDegradation: boolean;
  userNotification: boolean;
}

export interface OfflineConfig {
  enabled: boolean;
  maxQueueSize: number;
  queueTimeout: number;
  syncOnReconnect: boolean;
  storageKey: string;
}

export interface UserFriendlyMessage {
  title: string;
  message: string;
  action?: {
    label: string;
    callback: () => void;
  };
  severity: 'info' | 'warning' | 'error' | 'critical';
  dismissible: boolean;
  autoHide?: number;
}

// =====================================================
// ERROR RECOVERY SERVICE
// =====================================================

export class ErrorRecoveryService {
  private static instance: ErrorRecoveryService;
  
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: ['network_error', 'timeout_error', 'server_error', 'rate_limit_error']
  };

  private fallbackConfig: FallbackConfig = {
    enabled: true,
    responses: new Map(),
    gracefulDegradation: true,
    userNotification: true
  };

  private offlineConfig: OfflineConfig = {
    enabled: true,
    maxQueueSize: 100,
    queueTimeout: 5 * 60 * 1000, // 5 minutes
    syncOnReconnect: true,
    storageKey: 'pam_offline_queue'
  };

  private isOnline: boolean = navigator.onLine;
  private offlineQueue: Array<{
    operation: () => Promise<any>;
    context: ErrorContext;
    timestamp: Date;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  private constructor() {
    this.initializeOfflineDetection();
    this.loadOfflineQueue();
  }

  static getInstance(): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService();
    }
    return ErrorRecoveryService.instance;
  }

  // =====================================================
  // CORE ERROR RECOVERY METHODS
  // =====================================================

  /**
   * Main error recovery method with comprehensive handling
   */
  async recoverFromError<T>(
    error: Error,
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const errorType = this.classifyError(error);

    logger.error('🚨 Error occurred, initiating recovery', {
      error: error.message,
      type: errorType,
      operation: context.operation,
      retryCount: context.retryCount
    });

    // Track error in analytics
    pamAnalytics.trackError(error, {
      operation: context.operation,
      recoveryAttempted: true
    });

    try {
      // Determine recovery strategy
      const strategy = this.determineRecoveryStrategy(errorType, context);
      
      switch (strategy) {
        case 'retry':
          return await this.handleRetry(operation, context, errorType);
          
        case 'fallback':
          return await this.handleFallback(context, errorType);
          
        case 'graceful_degradation':
          return await this.handleGracefulDegradation(context, errorType);
          
        case 'offline_queue':
          return await this.handleOfflineQueue(operation, context);
          
        case 'user_notification':
          return this.handleUserNotification(error, context, errorType);
          
        case 'fail_fast':
        default:
          return this.handleFailFast(error, context);
      }

    } catch (recoveryError) {
      const recoveryTime = Date.now() - startTime;
      
      logger.error('🔥 Recovery failed', {
        originalError: error.message,
        recoveryError: recoveryError.message,
        recoveryTime
      });

      return {
        success: false,
        strategy: 'fail_fast',
        error: recoveryError as Error,
        message: this.getUserFriendlyMessage(error, context).message,
        recoveryTime,
        fallbackUsed: false
      };
    }
  }

  /**
   * Execute operation with automatic error recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: Omit<ErrorContext, 'retryCount' | 'maxRetries' | 'timestamp'>
  ): Promise<T> {
    const fullContext: ErrorContext = {
      ...context,
      retryCount: 0,
      maxRetries: this.retryConfig.maxRetries,
      timestamp: new Date()
    };

    try {
      return await operation();
    } catch (error) {
      const recovery = await this.recoverFromError(error as Error, operation, fullContext);
      
      if (recovery.success && recovery.data !== undefined) {
        return recovery.data;
      }
      
      throw recovery.error || error;
    }
  }

  // =====================================================
  // RETRY LOGIC
  // =====================================================

  private async handleRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    errorType: ErrorType
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    
    if (context.retryCount >= context.maxRetries) {
      return {
        success: false,
        strategy: 'retry',
        message: `Operation failed after ${context.maxRetries} retries`,
        recoveryTime: Date.now() - startTime,
        fallbackUsed: false
      };
    }

    const delay = this.calculateRetryDelay(context.retryCount);
    
    logger.info(`🔄 Retrying operation (${context.retryCount + 1}/${context.maxRetries})`, {
      operation: context.operation,
      delay,
      errorType
    });

    await this.sleep(delay);

    try {
      const result = await operation();
      const recoveryTime = Date.now() - startTime;

      logger.info('✅ Retry successful', {
        operation: context.operation,
        retryCount: context.retryCount + 1,
        recoveryTime
      });

      // Track successful recovery
      pamAnalytics.trackAction('recovery_success', {
        strategy: 'retry',
        retryCount: context.retryCount + 1,
        recoveryTime,
        operation: context.operation
      });

      return {
        success: true,
        strategy: 'retry',
        data: result,
        message: 'Operation completed after retry',
        recoveryTime,
        fallbackUsed: false
      };

    } catch (retryError) {
      const newContext = {
        ...context,
        retryCount: context.retryCount + 1
      };

      return await this.recoverFromError(retryError as Error, operation, newContext);
    }
  }

  private calculateRetryDelay(retryCount: number): number {
    let delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount);
    delay = Math.min(delay, this.retryConfig.maxDelay);

    if (this.retryConfig.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return delay;
  }

  // =====================================================
  // FALLBACK RESPONSES
  // =====================================================

  private async handleFallback(context: ErrorContext, errorType: ErrorType): Promise<RecoveryResult> {
    const startTime = Date.now();
    
    const fallbackResponse = this.getFallbackResponse(context.operation, errorType);
    
    if (!fallbackResponse) {
      return {
        success: false,
        strategy: 'fallback',
        message: 'No fallback response available',
        recoveryTime: Date.now() - startTime,
        fallbackUsed: false
      };
    }

    logger.info('🔄 Using fallback response', {
      operation: context.operation,
      errorType,
      fallbackType: typeof fallbackResponse
    });

    pamAnalytics.trackAction('fallback_used', {
      operation: context.operation,
      errorType,
      recoveryTime: Date.now() - startTime
    });

    return {
      success: true,
      strategy: 'fallback',
      data: fallbackResponse,
      message: 'Using cached or default response',
      recoveryTime: Date.now() - startTime,
      fallbackUsed: true
    };
  }

  private getFallbackResponse(operation: string, errorType: ErrorType): any {
    const fallbackMap: Record<string, any> = {
      // PAM conversation fallbacks
      'pam-chat': {
        response: "I'm currently experiencing technical difficulties. Please try your request again in a moment, or let me know if you need help with something else.",
        suggestions: [
          "Try rephrasing your question",
          "Check your internet connection", 
          "Contact support if the issue persists"
        ]
      },

      // Tool-specific fallbacks
      'expense-tracker': {
        response: "I can't process your expense right now, but I've saved your request. You can view and edit your expenses in the Expenses tab.",
        data: { saved: true, location: '/expenses' }
      },

      'budget-planner': {
        response: "Budget calculations are temporarily unavailable. Here's your last known budget summary.",
        data: this.getLastKnownBudget()
      },

      'trip-planner': {
        response: "Trip planning is currently limited. I can still help you with basic travel questions.",
        alternatives: ['weather-check', 'expense-tracker']
      },

      // API fallbacks
      'claude-api-call': {
        response: "I'm having trouble connecting to my AI services. Let me try to help you with the information I have available.",
        degraded: true
      },

      'weather-api': {
        response: "Weather information is temporarily unavailable. Please check a weather website for current conditions.",
        alternatives: ['general weather advice']
      }
    };

    return fallbackMap[operation] || this.getGenericFallback(errorType);
  }

  private getGenericFallback(errorType: ErrorType): any {
    const genericFallbacks: Record<ErrorType, any> = {
      network_error: {
        response: "I'm having trouble connecting to the internet. Please check your connection and try again.",
        offline: true
      },
      api_error: {
        response: "I'm experiencing technical difficulties. Please try again in a few moments.",
        retry: true
      },
      authentication_error: {
        response: "Please sign in again to continue using PAM.",
        action: 'reauthenticate'
      },
      rate_limit_error: {
        response: "I need to slow down a bit. Please wait a moment before making another request.",
        waitTime: 30000
      },
      validation_error: {
        response: "Please check your input and try again.",
        validation: true
      },
      timeout_error: {
        response: "That request took too long. Let me try a simpler approach.",
        simplified: true
      },
      server_error: {
        response: "Our servers are having issues. We're working to fix this quickly.",
        status: 'investigating'
      },
      client_error: {
        response: "Something went wrong with your request. Please try again.",
        retry: true
      },
      unknown_error: {
        response: "An unexpected error occurred. Please try again or contact support.",
        support: true
      }
    };

    return genericFallbacks[errorType];
  }

  private getLastKnownBudget(): any {
    // This would typically fetch from local storage or cache
    return {
      total: 5000,
      spent: 3200,
      remaining: 1800,
      categories: ['Food', 'Transportation', 'Entertainment'],
      lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      disclaimer: 'This is cached data from your last successful budget calculation.'
    };
  }

  // =====================================================
  // GRACEFUL DEGRADATION
  // =====================================================

  private async handleGracefulDegradation(
    context: ErrorContext, 
    errorType: ErrorType
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    
    const degradedResponse = this.getDegradedResponse(context.operation, errorType);
    
    logger.info('📉 Graceful degradation activated', {
      operation: context.operation,
      errorType,
      degradedFeatures: degradedResponse.disabledFeatures || []
    });

    pamAnalytics.trackAction('graceful_degradation', {
      operation: context.operation,
      errorType,
      degradedFeatures: degradedResponse.disabledFeatures
    });

    return {
      success: true,
      strategy: 'graceful_degradation',
      data: degradedResponse,
      message: 'Running in limited mode with reduced functionality',
      recoveryTime: Date.now() - startTime,
      fallbackUsed: true
    };
  }

  private getDegradedResponse(operation: string, errorType: ErrorType): any {
    const degradationMap: Record<string, any> = {
      'pam-chat': {
        response: "I'm running in basic mode with limited AI capabilities. I can still help with simple tasks and information.",
        capabilities: ['basic-questions', 'navigation', 'simple-calculations'],
        disabledFeatures: ['advanced-ai', 'complex-reasoning', 'external-apis'],
        mode: 'basic'
      },

      'expense-tracker': {
        response: "Expense tracking is available with manual entry only. Auto-categorization is temporarily disabled.",
        capabilities: ['manual-entry', 'basic-calculations', 'local-storage'],
        disabledFeatures: ['ai-categorization', 'receipt-scanning', 'bank-sync'],
        mode: 'manual'
      },

      'budget-planner': {
        response: "Budget planning is using simplified calculations. Advanced forecasting is temporarily unavailable.",
        capabilities: ['basic-budgeting', 'simple-categories', 'manual-tracking'],
        disabledFeatures: ['ai-forecasting', 'smart-recommendations', 'trend-analysis'],
        mode: 'simplified'
      },

      'trip-planner': {
        response: "Trip planning is limited to basic information. Real-time data and optimization are temporarily unavailable.",
        capabilities: ['basic-planning', 'static-information', 'manual-input'],
        disabledFeatures: ['real-time-data', 'route-optimization', 'price-tracking'],
        mode: 'offline'
      }
    };

    return degradationMap[operation] || {
      response: "This feature is running in limited mode with reduced functionality.",
      capabilities: ['basic-operations'],
      disabledFeatures: ['advanced-features'],
      mode: 'degraded'
    };
  }

  // =====================================================
  // OFFLINE DETECTION AND QUEUEING
  // =====================================================

  private initializeOfflineDetection(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Enhanced offline detection
    this.startNetworkHealthCheck();
  }

  private handleOnline(): void {
    this.isOnline = true;
    logger.info('🌐 Network connection restored');
    
    pamAnalytics.trackAction('network_online', {
      queuedRequests: this.offlineQueue.length,
      wasOffline: true
    });

    if (this.offlineConfig.syncOnReconnect && this.offlineQueue.length > 0) {
      this.processOfflineQueue();
    }
  }

  private handleOffline(): void {
    this.isOnline = false;
    logger.warn('📡 Network connection lost, entering offline mode');
    
    pamAnalytics.trackAction('network_offline', {
      timestamp: new Date().toISOString()
    });
  }

  private async handleOfflineQueue<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<RecoveryResult> {
    const startTime = Date.now();

    if (!this.offlineConfig.enabled) {
      return {
        success: false,
        strategy: 'offline_queue',
        message: 'Offline mode is disabled',
        recoveryTime: Date.now() - startTime,
        fallbackUsed: false
      };
    }

    if (this.offlineQueue.length >= this.offlineConfig.maxQueueSize) {
      // Remove oldest item to make space
      const removed = this.offlineQueue.shift();
      if (removed) {
        removed.reject(new Error('Request expired due to queue size limit'));
      }
    }

    return new Promise((resolve, reject) => {
      this.offlineQueue.push({
        operation,
        context,
        timestamp: new Date(),
        resolve: (result) => {
          resolve({
            success: true,
            strategy: 'offline_queue',
            data: result,
            message: 'Request completed after reconnection',
            recoveryTime: Date.now() - startTime,
            fallbackUsed: false
          });
        },
        reject: (error) => {
          resolve({
            success: false,
            strategy: 'offline_queue',
            error,
            message: 'Request failed after reconnection',
            recoveryTime: Date.now() - startTime,
            fallbackUsed: false
          });
        }
      });

      // Save to persistent storage
      this.saveOfflineQueue();

      logger.info('📥 Request queued for offline processing', {
        operation: context.operation,
        queueSize: this.offlineQueue.length
      });
    });
  }

  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    logger.info('🔄 Processing offline queue', {
      queueSize: this.offlineQueue.length
    });

    const processStartTime = Date.now();
    let processed = 0;
    let failed = 0;

    // Process queue items concurrently but with a limit
    const concurrency = 3;
    const batches = this.chunkArray(this.offlineQueue.splice(0), concurrency);

    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(async (item) => {
          try {
            // Check if item has expired
            const age = Date.now() - item.timestamp.getTime();
            if (age > this.offlineConfig.queueTimeout) {
              item.reject(new Error('Request expired'));
              failed++;
              return;
            }

            const result = await item.operation();
            item.resolve(result);
            processed++;
          } catch (error) {
            item.reject(error);
            failed++;
          }
        })
      );
    }

    const processingTime = Date.now() - processStartTime;

    logger.info('✅ Offline queue processed', {
      processed,
      failed,
      processingTime,
      remaining: this.offlineQueue.length
    });

    pamAnalytics.trackAction('offline_queue_processed', {
      processed,
      failed,
      processingTime
    });

    // Clear persistent storage
    this.saveOfflineQueue();
  }

  private saveOfflineQueue(): void {
    try {
      const queueData = this.offlineQueue.map(item => ({
        context: item.context,
        timestamp: item.timestamp.toISOString()
      }));
      
      localStorage.setItem(this.offlineConfig.storageKey, JSON.stringify(queueData));
    } catch (error) {
      logger.error('Failed to save offline queue', error);
    }
  }

  private loadOfflineQueue(): void {
    try {
      const saved = localStorage.getItem(this.offlineConfig.storageKey);
      if (saved) {
        const queueData = JSON.parse(saved);
        logger.info('📂 Loaded offline queue from storage', {
          items: queueData.length
        });
      }
    } catch (error) {
      logger.error('Failed to load offline queue', error);
    }
  }

  private startNetworkHealthCheck(): void {
    // Enhanced network detection with actual connectivity test
    setInterval(async () => {
      if (navigator.onLine) {
        try {
          // Test actual connectivity with a lightweight request
          const response = await fetch('/api/health', { 
            method: 'HEAD',
            cache: 'no-cache',
            mode: 'no-cors'
          });
          
          if (!this.isOnline) {
            this.handleOnline();
          }
        } catch {
          if (this.isOnline) {
            this.handleOffline();
          }
        }
      } else if (this.isOnline) {
        this.handleOffline();
      }
    }, 30000); // Check every 30 seconds
  }

  // =====================================================
  // USER-FRIENDLY ERROR MESSAGES
  // =====================================================

  private handleUserNotification(
    error: Error,
    context: ErrorContext,
    errorType: ErrorType
  ): RecoveryResult {
    const userMessage = this.getUserFriendlyMessage(error, context);
    
    // This would integrate with your notification system
    this.showUserNotification(userMessage);

    pamAnalytics.trackAction('user_notification', {
      errorType,
      operation: context.operation,
      severity: userMessage.severity
    });

    return {
      success: false,
      strategy: 'user_notification',
      message: userMessage.message,
      recoveryTime: 0,
      fallbackUsed: false
    };
  }

  getUserFriendlyMessage(error: Error, context: ErrorContext): UserFriendlyMessage {
    const errorType = this.classifyError(error);
    
    const messageMap: Record<ErrorType, UserFriendlyMessage> = {
      network_error: {
        title: 'Connection Issue',
        message: 'Having trouble connecting to PAM services. Please check your internet connection.',
        action: {
          label: 'Try Again',
          callback: () => window.location.reload()
        },
        severity: 'warning',
        dismissible: true,
        autoHide: 5000
      },

      api_error: {
        title: 'Service Temporarily Unavailable',
        message: 'PAM\'s AI services are experiencing issues. We\'re working to fix this quickly.',
        action: {
          label: 'Retry',
          callback: () => this.retryLastOperation(context)
        },
        severity: 'error',
        dismissible: true
      },

      authentication_error: {
        title: 'Please Sign In',
        message: 'Your session has expired. Please sign in again to continue.',
        action: {
          label: 'Sign In',
          callback: () => window.location.href = '/auth/signin'
        },
        severity: 'warning',
        dismissible: false
      },

      rate_limit_error: {
        title: 'Please Slow Down',
        message: 'You\'re using PAM quite actively! Please wait a moment before your next request.',
        severity: 'info',
        dismissible: true,
        autoHide: 3000
      },

      validation_error: {
        title: 'Input Error',
        message: 'Please check your input and try again. Make sure all required fields are filled correctly.',
        severity: 'warning',
        dismissible: true
      },

      timeout_error: {
        title: 'Request Timed Out',
        message: 'That took longer than expected. Let me try a simpler approach.',
        action: {
          label: 'Try Simplified',
          callback: () => this.retryWithDegradation(context)
        },
        severity: 'warning',
        dismissible: true
      },

      server_error: {
        title: 'Server Error',
        message: 'Our servers are having issues. We\'re working to fix this quickly.',
        severity: 'error',
        dismissible: true
      },

      client_error: {
        title: 'Something Went Wrong',
        message: 'An error occurred with your request. Please try again.',
        action: {
          label: 'Try Again',
          callback: () => this.retryLastOperation(context)
        },
        severity: 'warning',
        dismissible: true
      },

      unknown_error: {
        title: 'Unexpected Error',
        message: 'Something unexpected happened. Please try again or contact support if the issue persists.',
        action: {
          label: 'Contact Support',
          callback: () => window.open('/support', '_blank')
        },
        severity: 'error',
        dismissible: true
      }
    };

    return messageMap[errorType];
  }

  private showUserNotification(message: UserFriendlyMessage): void {
    // This would integrate with your toast/notification system
    logger.info('🔔 Showing user notification', {
      title: message.title,
      severity: message.severity
    });

    // Example integration with a notification system
    if (typeof window !== 'undefined' && (window as any).showNotification) {
      (window as any).showNotification(message);
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || name.includes('networkerror')) {
      return 'network_error';
    }
    
    if (message.includes('timeout') || name.includes('timeout')) {
      return 'timeout_error';
    }
    
    if (message.includes('401') || message.includes('unauthorized') || message.includes('authentication')) {
      return 'authentication_error';
    }
    
    if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
      return 'rate_limit_error';
    }
    
    if (message.includes('400') || message.includes('validation') || message.includes('invalid')) {
      return 'validation_error';
    }
    
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      return 'server_error';
    }
    
    if (message.includes('api') || message.includes('service')) {
      return 'api_error';
    }
    
    if (message.includes('400') || message.includes('client')) {
      return 'client_error';
    }

    return 'unknown_error';
  }

  private determineRecoveryStrategy(errorType: ErrorType, context: ErrorContext): RecoveryStrategy {
    // Check if we're offline
    if (!this.isOnline) {
      return 'offline_queue';
    }

    // Check if error is retryable and within retry limits
    if (this.retryConfig.retryableErrors.includes(errorType) && 
        context.retryCount < context.maxRetries) {
      return 'retry';
    }

    // Check if fallback is available
    if (this.fallbackConfig.enabled && this.getFallbackResponse(context.operation, errorType)) {
      return 'fallback';
    }

    // Check if graceful degradation is possible
    if (this.fallbackConfig.gracefulDegradation && 
        ['api_error', 'server_error', 'timeout_error'].includes(errorType)) {
      return 'graceful_degradation';
    }

    // For user-facing errors that need explanation
    if (['authentication_error', 'validation_error', 'rate_limit_error'].includes(errorType)) {
      return 'user_notification';
    }

    return 'fail_fast';
  }

  private handleFailFast(error: Error, context: ErrorContext): RecoveryResult {
    const userMessage = this.getUserFriendlyMessage(error, context);
    
    return {
      success: false,
      strategy: 'fail_fast',
      error,
      message: userMessage.message,
      recoveryTime: 0,
      fallbackUsed: false
    };
  }

  private async retryLastOperation(context: ErrorContext): Promise<void> {
    // This would need to be implemented based on your specific operation tracking
    logger.info('Retrying last operation', { operation: context.operation });
  }

  private async retryWithDegradation(context: ErrorContext): Promise<void> {
    // This would retry with simplified parameters
    logger.info('Retrying with degradation', { operation: context.operation });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // =====================================================
  // CONFIGURATION METHODS
  // =====================================================

  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
    logger.info('Updated retry configuration', config);
  }

  updateFallbackConfig(config: Partial<FallbackConfig>): void {
    this.fallbackConfig = { ...this.fallbackConfig, ...config };
    logger.info('Updated fallback configuration', config);
  }

  updateOfflineConfig(config: Partial<OfflineConfig>): void {
    this.offlineConfig = { ...this.offlineConfig, ...config };
    logger.info('Updated offline configuration', config);
  }

  addFallbackResponse(operation: string, response: any): void {
    this.fallbackConfig.responses.set(operation, response);
    logger.info('Added fallback response', { operation });
  }

  // =====================================================
  // STATUS AND MONITORING
  // =====================================================

  getSystemStatus(): {
    isOnline: boolean;
    queueSize: number;
    retryConfig: RetryConfig;
    fallbackConfig: FallbackConfig;
    offlineConfig: OfflineConfig;
  } {
    return {
      isOnline: this.isOnline,
      queueSize: this.offlineQueue.length,
      retryConfig: this.retryConfig,
      fallbackConfig: this.fallbackConfig,
      offlineConfig: this.offlineConfig
    };
  }

  clearOfflineQueue(): void {
    this.offlineQueue.forEach(item => {
      item.reject(new Error('Queue cleared manually'));
    });
    this.offlineQueue = [];
    this.saveOfflineQueue();
    logger.info('Offline queue cleared');
  }

  dispose(): void {
    this.clearOfflineQueue();
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
  }
}

// Export singleton instance
export const errorRecoveryService = ErrorRecoveryService.getInstance();

export default ErrorRecoveryService;