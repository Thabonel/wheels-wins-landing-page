/**
 * PAM Error Messages - User-friendly error messaging system
 * Day 2 Hour 2: Create user-friendly error messages and logging
 */

export interface PAMError {
  code: string;
  message: string;
  userMessage: string;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'authentication' | 'websocket' | 'dns' | 'timeout' | 'unknown';
  recoverable: boolean;
}

export const PAM_ERROR_CODES = {
  // Network Errors
  NETWORK_UNAVAILABLE: 'NETWORK_UNAVAILABLE',
  DNS_RESOLUTION_FAILED: 'DNS_RESOLUTION_FAILED',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',

  // Authentication Errors
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_SUPABASE_UNAVAILABLE: 'AUTH_SUPABASE_UNAVAILABLE',
  AUTH_PERMISSION_DENIED: 'AUTH_PERMISSION_DENIED',

  // WebSocket Errors
  WEBSOCKET_CONNECTION_FAILED: 'WEBSOCKET_CONNECTION_FAILED',
  WEBSOCKET_DISCONNECTED: 'WEBSOCKET_DISCONNECTED',
  WEBSOCKET_MESSAGE_FAILED: 'WEBSOCKET_MESSAGE_FAILED',
  WEBSOCKET_PROTOCOL_ERROR: 'WEBSOCKET_PROTOCOL_ERROR',

  // Timeout Errors
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  RESPONSE_TIMEOUT: 'RESPONSE_TIMEOUT',
  HANDSHAKE_TIMEOUT: 'HANDSHAKE_TIMEOUT',

  // General Errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  BROWSER_NOT_SUPPORTED: 'BROWSER_NOT_SUPPORTED'
} as const;

export const PAM_ERROR_DEFINITIONS: Record<string, PAMError> = {
  [PAM_ERROR_CODES.DNS_RESOLUTION_FAILED]: {
    code: PAM_ERROR_CODES.DNS_RESOLUTION_FAILED,
    message: 'DNS resolution failed for Supabase hostname',
    userMessage: 'PAM is having trouble connecting due to DNS issues. This is usually a temporary network problem.',
    suggestions: [
      'Try using the Mock Development Mode for local testing',
      'Check your DNS settings or try different DNS servers (8.8.8.8, 1.1.1.1)',
      'Wait a few minutes and try again',
      'Contact your network administrator if this persists',
      'Check if you\'re behind a corporate firewall'
    ],
    severity: 'high',
    category: 'dns',
    recoverable: true
  },

  [PAM_ERROR_CODES.NETWORK_UNAVAILABLE]: {
    code: PAM_ERROR_CODES.NETWORK_UNAVAILABLE,
    message: 'Network connection is not available',
    userMessage: 'Your internet connection appears to be offline. PAM needs an internet connection to work.',
    suggestions: [
      'Check your internet connection',
      'Try connecting to a different network',
      'Restart your router or modem',
      'Contact your internet service provider'
    ],
    severity: 'critical',
    category: 'network',
    recoverable: true
  },

  [PAM_ERROR_CODES.AUTH_TOKEN_EXPIRED]: {
    code: PAM_ERROR_CODES.AUTH_TOKEN_EXPIRED,
    message: 'Authentication token has expired',
    userMessage: 'Your session has expired. You need to log in again to use PAM.',
    suggestions: [
      'Log out and log back in',
      'Clear your browser cache and cookies',
      'Try refreshing the page',
      'Check if your session timeout settings are too short'
    ],
    severity: 'medium',
    category: 'authentication',
    recoverable: true
  },

  [PAM_ERROR_CODES.AUTH_SUPABASE_UNAVAILABLE]: {
    code: PAM_ERROR_CODES.AUTH_SUPABASE_UNAVAILABLE,
    message: 'Supabase authentication service is unavailable',
    userMessage: 'The authentication service is temporarily unavailable. This affects login and PAM functionality.',
    suggestions: [
      'Wait a few minutes and try again',
      'Check Supabase status page for service outages',
      'Try using the Mock Development Mode for testing',
      'Contact support if the issue persists'
    ],
    severity: 'high',
    category: 'authentication',
    recoverable: true
  },

  [PAM_ERROR_CODES.WEBSOCKET_CONNECTION_FAILED]: {
    code: PAM_ERROR_CODES.WEBSOCKET_CONNECTION_FAILED,
    message: 'WebSocket connection to PAM backend failed',
    userMessage: 'PAM couldn\'t establish a real-time connection. Some features might be limited.',
    suggestions: [
      'The system will automatically try to reconnect',
      'Check if your firewall allows WebSocket connections',
      'Try refreshing the page',
      'Use the Mock Development Mode if this persists'
    ],
    severity: 'medium',
    category: 'websocket',
    recoverable: true
  },

  [PAM_ERROR_CODES.CONNECTION_TIMEOUT]: {
    code: PAM_ERROR_CODES.CONNECTION_TIMEOUT,
    message: 'Connection attempt timed out',
    userMessage: 'PAM is taking too long to connect. This might be due to network issues or server load.',
    suggestions: [
      'Check your internet connection speed',
      'Try again in a few minutes',
      'Use the Mock Development Mode for testing',
      'Contact support if timeouts persist'
    ],
    severity: 'medium',
    category: 'timeout',
    recoverable: true
  },

  [PAM_ERROR_CODES.BROWSER_NOT_SUPPORTED]: {
    code: PAM_ERROR_CODES.BROWSER_NOT_SUPPORTED,
    message: 'Browser does not support required features',
    userMessage: 'Your browser doesn\'t support all the features PAM needs. Please update your browser.',
    suggestions: [
      'Update your browser to the latest version',
      'Try using Chrome, Firefox, Safari, or Edge',
      'Enable JavaScript if it\'s disabled',
      'Check if WebSocket support is available'
    ],
    severity: 'critical',
    category: 'unknown',
    recoverable: false
  },

  [PAM_ERROR_CODES.UNKNOWN_ERROR]: {
    code: PAM_ERROR_CODES.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
    userMessage: 'Something unexpected happened with PAM. We\'re working to fix this.',
    suggestions: [
      'Try refreshing the page',
      'Clear your browser cache',
      'Try again in a few minutes',
      'Contact support with the error details'
    ],
    severity: 'medium',
    category: 'unknown',
    recoverable: true
  }
};

/**
 * Classify an error based on its message and context
 */
export function classifyPAMError(error: Error | string, context?: Record<string, any>): PAMError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  // DNS Resolution Errors
  if (lowerMessage.includes('name_not_resolved') ||
      lowerMessage.includes('dns') ||
      (lowerMessage.includes('failed to fetch') && context?.url?.includes('supabase'))) {
    return PAM_ERROR_DEFINITIONS[PAM_ERROR_CODES.DNS_RESOLUTION_FAILED];
  }

  // Network Errors
  if (lowerMessage.includes('network error') ||
      lowerMessage.includes('no internet') ||
      lowerMessage.includes('offline')) {
    return PAM_ERROR_DEFINITIONS[PAM_ERROR_CODES.NETWORK_UNAVAILABLE];
  }

  // Authentication Errors
  if (lowerMessage.includes('token') && lowerMessage.includes('expired')) {
    return PAM_ERROR_DEFINITIONS[PAM_ERROR_CODES.AUTH_TOKEN_EXPIRED];
  }

  if (lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('auth') ||
      lowerMessage.includes('permission denied')) {
    return PAM_ERROR_DEFINITIONS[PAM_ERROR_CODES.AUTH_TOKEN_INVALID];
  }

  // WebSocket Errors
  if (lowerMessage.includes('websocket') ||
      (error instanceof Error && error.name === 'WebSocketError')) {
    return PAM_ERROR_DEFINITIONS[PAM_ERROR_CODES.WEBSOCKET_CONNECTION_FAILED];
  }

  // Timeout Errors
  if (lowerMessage.includes('timeout') ||
      lowerMessage.includes('timed out')) {
    return PAM_ERROR_DEFINITIONS[PAM_ERROR_CODES.CONNECTION_TIMEOUT];
  }

  // Browser Compatibility
  if (lowerMessage.includes('not supported') ||
      (context?.browserFeatures && !context.browserFeatures.websocket)) {
    return PAM_ERROR_DEFINITIONS[PAM_ERROR_CODES.BROWSER_NOT_SUPPORTED];
  }

  // Default to unknown error
  return {
    ...PAM_ERROR_DEFINITIONS[PAM_ERROR_CODES.UNKNOWN_ERROR],
    message: errorMessage
  };
}

/**
 * Log PAM errors with context for debugging
 */
export function logPAMError(error: PAMError, originalError?: Error, context?: Record<string, any>) {
  const logData = {
    code: error.code,
    message: error.message,
    userMessage: error.userMessage,
    severity: error.severity,
    category: error.category,
    timestamp: new Date().toISOString(),
    context: {
      userAgent: navigator.userAgent,
      url: window.location.href,
      browserFeatures: {
        websocket: 'WebSocket' in window,
        mediaDevices: 'mediaDevices' in navigator,
        speechRecognition: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
        geolocation: 'geolocation' in navigator
      },
      ...context
    },
    originalError: originalError ? {
      name: originalError.name,
      message: originalError.message,
      stack: originalError.stack
    } : null
  };

  // Log based on severity
  switch (error.severity) {
    case 'critical':
      console.error('PAM Critical Error:', logData);
      break;
    case 'high':
      console.error('PAM High Severity Error:', logData);
      break;
    case 'medium':
      console.warn('PAM Warning:', logData);
      break;
    case 'low':
      console.info('PAM Info:', logData);
      break;
  }

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production' && error.severity !== 'low') {
    // Send to external error tracking service (Sentry, LogRocket, etc.)
    // This would be implemented based on your error tracking setup
    console.log('Would send to error tracking service:', logData);
  }

  return logData;
}

/**
 * Get suggestions based on error category and context
 */
export function getPAMErrorSuggestions(error: PAMError, context?: Record<string, any>): string[] {
  const baseSuggestions = [...error.suggestions];

  // Add contextual suggestions
  if (error.category === 'dns' || error.category === 'network') {
    baseSuggestions.unshift('Try using Mock Development Mode: /pam-dev-test');
  }

  if (error.category === 'authentication' && context?.isDevelopment) {
    baseSuggestions.push('Check your .env.local file for correct Supabase credentials');
  }

  if (error.category === 'websocket' && context?.retryCount > 0) {
    baseSuggestions.unshift(`System has retried ${context.retryCount} times automatically`);
  }

  return baseSuggestions;
}

export default {
  PAM_ERROR_CODES,
  PAM_ERROR_DEFINITIONS,
  classifyPAMError,
  logPAMError,
  getPAMErrorSuggestions
};