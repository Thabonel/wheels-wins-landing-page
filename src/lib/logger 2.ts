/**
 * Simple logger utility for consistent logging across the application
 */

interface Logger {
  error: (message: string, error?: any) => void;
  warn: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  debug: (message: string, data?: any) => void;
}

class SimpleLogger implements Logger {
  error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error || '');
  }

  warn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data || '');
  }

  info(message: string, data?: any): void {
    console.info(`[INFO] ${message}`, data || '');
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  }
}

export const logger = new SimpleLogger();