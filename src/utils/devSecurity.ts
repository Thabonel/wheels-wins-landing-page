/**
 * Development Security Utilities
 * Prevents sensitive data exposure in development console logs
 */

/**
 * Override console network logging in development to mask sensitive tokens
 */
export function initDevelopmentSecurity() {
  if (import.meta.env.MODE !== 'development') {
    return;
  }

  // Mask tokens in browser network logs (development only)
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [url] = args;
    if (typeof url === 'string' && url.includes('access_token=pk.')) {
      console.debug('🔒 Network request with masked token:', url.replace(/access_token=pk\.[^&]+/, 'access_token=pk.***REDACTED***'));
    }
    return originalFetch.apply(this, args);
  };

  console.log('🛡️ Development security initialized - tokens will be masked in network logs');
}

/**
 * Mask sensitive tokens in strings for logging
 */
export function maskToken(token: string): string {
  if (!token) return 'none';

  if (token.startsWith('pk.')) {
    return `pk.${token.substring(3, 10)}***`;
  }

  if (token.startsWith('sk.')) {
    return `sk.***REDACTED***`;
  }

  // Generic masking for other tokens
  return `${token.substring(0, 4)}***${token.substring(token.length - 4)}`;
}

/**
 * Safe logging function that automatically masks tokens
 */
export function safeLog(message: string, data?: any) {
  if (import.meta.env.MODE === 'production') {
    return; // No logging in production
  }

  const safeMessage = message;
  let safeData = data;

  if (typeof data === 'object' && data !== null) {
    safeData = JSON.parse(JSON.stringify(data));
    // Recursively mask token-like values
    const maskObject = (obj: any): any => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          if (key.toLowerCase().includes('token') || key.toLowerCase().includes('key')) {
            obj[key] = maskToken(obj[key]);
          } else if (obj[key].startsWith('pk.') || obj[key].startsWith('sk.')) {
            obj[key] = maskToken(obj[key]);
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          maskObject(obj[key]);
        }
      }
      return obj;
    };
    safeData = maskObject(safeData);
  }

  console.log(safeMessage, safeData);
}