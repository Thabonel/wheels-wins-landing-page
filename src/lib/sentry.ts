import React from 'react';
import * as Sentry from "@sentry/react";

// Sentry configuration for error monitoring, performance tracking, and session replay
export function initializeSentry() {
  // Only initialize Sentry if DSN is provided and we're not in development mode
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development';
  
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

// Create a Sentry-wrapped error boundary for React components
export const SentryErrorBoundary = Sentry.withErrorBoundary;

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