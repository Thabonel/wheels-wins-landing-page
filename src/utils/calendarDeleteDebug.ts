/**
 * Calendar Delete Debug Utility
 *
 * Diagnostic instrumentation to identify where calendar deletion fails
 * on iPad vs MacBook
 */

import { diagnosePWAAuth } from './pwaAuthDebug';

export interface CalendarDeleteDiagnostics {
  step: 'start' | 'auth_check' | 'user_validation' | 'db_operation' | 'success' | 'error';
  timestamp: string;
  device: {
    userAgent: string;
    isIOS: boolean;
    isPWA: boolean;
    hasStorageIsolation: boolean;
  };
  auth: {
    hasUser: boolean;
    userId?: string;
    userEmail?: string;
    authTokenFound: boolean;
    authError?: string;
  };
  request: {
    eventId: string;
    supabaseClientType: string;
  };
  error?: {
    message: string;
    code?: string;
    type: string;
  };
}

export class CalendarDeleteLogger {
  private static logs: CalendarDeleteDiagnostics[] = [];
  private static currentOperation: Partial<CalendarDeleteDiagnostics> = {};

  static startDelete(eventId: string, supabaseClient: any): void {
    const pwaAuth = diagnosePWAAuth();

    this.currentOperation = {
      step: 'start',
      timestamp: new Date().toISOString(),
      device: {
        userAgent: navigator.userAgent.substring(0, 50) + '...',
        isIOS: pwaAuth.isIOSDevice,
        isPWA: pwaAuth.isPWAStandalone,
        hasStorageIsolation: pwaAuth.hasStorageIsolation
      },
      auth: {
        hasUser: false,
        authTokenFound: pwaAuth.localStorage.supaseAuthKeys.length > 0
      },
      request: {
        eventId,
        supabaseClientType: supabaseClient?.constructor?.name || 'unknown'
      }
    };

    console.log('🗑️ Calendar Delete - START:', {
      eventId,
      device: this.currentOperation.device,
      authTokensFound: this.currentOperation.auth!.authTokenFound
    });

    this.logStep('start');
  }

  static logAuthCheck(user: any, userError: any): void {
    this.currentOperation.step = 'auth_check';
    this.currentOperation.auth = {
      ...this.currentOperation.auth!,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: userError?.message
    };

    console.log('🔐 Calendar Delete - AUTH CHECK:', {
      hasUser: !!user,
      userId: user?.id?.substring(0, 8) + '...',
      userEmail: user?.email,
      error: userError?.message
    });

    this.logStep('auth_check');
  }

  static logUserValidation(isValid: boolean): void {
    this.currentOperation.step = 'user_validation';

    console.log('✅ Calendar Delete - USER VALIDATION:', { isValid });

    this.logStep('user_validation');
  }

  static logDbOperation(): void {
    this.currentOperation.step = 'db_operation';

    console.log('🗄️ Calendar Delete - DATABASE OPERATION START');

    this.logStep('db_operation');
  }

  static logSuccess(): void {
    this.currentOperation.step = 'success';

    console.log('✅ Calendar Delete - SUCCESS');

    this.logStep('success');
    this.finishOperation();
  }

  static logError(error: any, step?: string): void {
    this.currentOperation.step = 'error';
    this.currentOperation.error = {
      message: error?.message || error?.toString() || 'Unknown error',
      code: error?.code,
      type: error?.constructor?.name || 'Unknown'
    };

    console.error('❌ Calendar Delete - ERROR:', {
      step: step || this.currentOperation.step,
      error: this.currentOperation.error,
      device: this.currentOperation.device
    });

    this.logStep('error');
    this.finishOperation();
  }

  private static logStep(step: CalendarDeleteDiagnostics['step']): void {
    const log: CalendarDeleteDiagnostics = {
      ...this.currentOperation as CalendarDeleteDiagnostics,
      step,
      timestamp: new Date().toISOString()
    };

    this.logs.push(log);
  }

  private static finishOperation(): void {
    // Print complete operation summary
    console.group('📊 Calendar Delete Operation Summary');
    console.log('Device:', this.currentOperation.device);
    console.log('Auth:', this.currentOperation.auth);
    console.log('Request:', this.currentOperation.request);
    if (this.currentOperation.error) {
      console.log('Error:', this.currentOperation.error);
    }
    console.groupEnd();

    // Reset for next operation
    this.currentOperation = {};
  }

  static getAllLogs(): CalendarDeleteDiagnostics[] {
    return [...this.logs];
  }

  static getLastOperation(): CalendarDeleteDiagnostics[] {
    // Get all logs from the last operation (since the last 'start' step)
    const lastStartIndex = this.logs.map(l => l.step).lastIndexOf('start');
    if (lastStartIndex === -1) return [];

    return this.logs.slice(lastStartIndex);
  }

  static clearLogs(): void {
    this.logs = [];
    this.currentOperation = {};
  }
}

// Make logger available globally for debugging
(window as any).calendarDeleteLogger = CalendarDeleteLogger;