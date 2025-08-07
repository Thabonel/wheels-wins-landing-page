import React from 'react';
import * as Sentry from "@sentry/react";

// Sentry configuration for error monitoring, performance tracking, and session replay
export function initializeSentry() {
  // Only initialize Sentry if DSN is provided and we're not in development mode
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development';
  
  // Debug environment variable loading
  if (import.meta.env.DEV) {
    console.log('🐛 Sentry Environment Check:', {
      dsn: dsn ? '✅ Present' : '❌ Missing',
      environment,
      mode: import.meta.env.MODE,
      allEnvVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
    });
  }
  
  if (!dsn) {
    console.warn('Sentry DSN not provided - error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    
    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    
    // Session replay - capture user sessions for debugging
    replaysSessionSampleRate: environment === 'production' ? 0.01 : 0.1, // 1% in prod, 10% in dev
    replaysOnErrorSampleRate: 1.0, // Always capture replays on errors
    
    // Privacy settings
    sendDefaultPii: false, // Don't send personally identifiable information
    
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || `wheels-and-wins@${import.meta.env.MODE}`,
    
    // Enhanced error reporting
    beforeSend(event, hint) {
      // Filter out certain errors or add additional context
      const error = hint.originalException;
      
      // Don't send network errors in development
      if (environment === 'development' && error instanceof TypeError && error.message.includes('fetch')) {
        return null;
      }
      
      // Add user context (without PII)
      if (event.user) {
        event.user = {
          id: event.user.id, // Keep user ID for tracking
          // Remove email, username, and other PII
        };
      }
      
      return event;
    },
    
    // Integration configurations
    integrations: [
      // React Router integration for better transaction names
      Sentry.browserTracingIntegration(),
      
      // Session replay integration
      Sentry.replayIntegration(),
    ],
    
    // Tag all events with the application name
    initialScope: {
      tags: {
        component: 'wheels-and-wins-frontend',
      },
    },
  });
  
  console.log(`Sentry initialized for environment: ${environment}`);
}

// Sentry error boundary is not used - using custom error boundary instead

// Manual error reporting utilities
export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
export const addBreadcrumb = Sentry.addBreadcrumb;
export const setUser = Sentry.setUser;
export const setTag = Sentry.setTag;
export const setContext = Sentry.setContext;

// Performance monitoring utilities  
export const startSpan = Sentry.startSpan;
export const getActiveSpan = Sentry.getActiveSpan;

// PAM-specific metrics tracking for migration baseline
export const trackPAMMetrics = {
  websocketConnection: (success: boolean, latency?: number, attempt?: number) => {
    addBreadcrumb({
      category: 'pam.websocket',
      message: `WebSocket connection ${success ? 'successful' : 'failed'}${attempt ? ` (attempt ${attempt})` : ''}`,
      level: success ? 'info' : 'error',
      data: { success, latency, attempt },
    });
    
    if (!success) {
      captureException(new Error(`PAM WebSocket connection failed${attempt ? ` on attempt ${attempt}` : ''}`));
    }

    // Track connection success rate
    setTag('pam.websocket.last_result', success ? 'success' : 'failure');
  },

  messageResponse: (responseTime: number, success: boolean, messageType: 'text' | 'voice' = 'text', error?: string) => {
    addBreadcrumb({
      category: 'pam.message',
      message: `PAM message response: ${responseTime}ms (${messageType})`,
      level: success ? 'info' : 'error',
      data: { responseTime, success, messageType, error },
    });

    // Track performance metrics for baseline
    setTag('pam.response.type', messageType);
    setTag('pam.response.success', success);
    setTag('pam.response.time_range', responseTime < 1000 ? 'fast' : responseTime < 3000 ? 'medium' : 'slow');
    
    if (!success && error) {
      captureException(new Error(`PAM message failed: ${error}`));
    }
  },

  voiceProcessing: (stage: 'stt' | 'processing' | 'tts', duration: number, success: boolean, error?: string) => {
    addBreadcrumb({
      category: 'pam.voice',
      message: `Voice ${stage}: ${duration}ms`,
      level: success ? 'info' : 'error',
      data: { stage, duration, success, error },
    });

    setTag(`pam.voice.${stage}.success`, success);
    setTag(`pam.voice.${stage}.duration`, duration < 2000 ? 'fast' : duration < 5000 ? 'medium' : 'slow');
    
    if (!success && error) {
      captureException(new Error(`Voice ${stage} failed: ${error}`));
    }
  },

  error: (error: Error, context: Record<string, any> = {}) => {
    Sentry.withScope((scope) => {
      scope.setTag('component', 'pam');
      Object.keys(context).forEach(key => {
        scope.setContext(key, context[key]);
      });
      captureException(error);
    });
  },

  // Track current baseline metrics
  baseline: {
    dailyMessageCount: 0,
    connectionFailures: 0,
    averageResponseTime: 0,
    voiceFailures: 0,
    
    record: (metric: 'message' | 'connection_failure' | 'voice_failure', value?: number) => {
      const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      setTag('pam.baseline.date', now);
      
      switch (metric) {
        case 'message':
          trackPAMMetrics.baseline.dailyMessageCount++;
          setTag('pam.baseline.daily_messages', trackPAMMetrics.baseline.dailyMessageCount);
          break;
        case 'connection_failure':
          trackPAMMetrics.baseline.connectionFailures++;
          setTag('pam.baseline.connection_failures', trackPAMMetrics.baseline.connectionFailures);
          break;
        case 'voice_failure':
          trackPAMMetrics.baseline.voiceFailures++;
          setTag('pam.baseline.voice_failures', trackPAMMetrics.baseline.voiceFailures);
          break;
      }
    }
  }
};