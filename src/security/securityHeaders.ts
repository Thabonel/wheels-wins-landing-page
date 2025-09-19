/**
 * Security Headers Configuration for Production Deployment
 * Implements comprehensive security headers for web application protection
 */

export interface SecurityHeadersConfig {
  contentSecurityPolicy: string;
  strictTransportSecurity: string;
  xContentTypeOptions: string;
  xFrameOptions: string;
  xXSSProtection: string;
  referrerPolicy: string;
  permissionsPolicy: string;
}

/**
 * Generate Content Security Policy for different environments
 */
export const generateCSP = (environment: 'development' | 'staging' | 'production'): string => {
  const baseCSP = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      environment === 'development' ? "'unsafe-inline'" : '',
      environment === 'development' ? "'unsafe-eval'" : '',
      'https://api.mapbox.com',
      'https://js.sentry-cdn.com',
    ].filter(Boolean),
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind and component styles
      'https://fonts.googleapis.com',
      'https://api.mapbox.com',
    ],
    'img-src': [
      "'self'",
      'data:',
      'https:',
      '*.supabase.co',
      'https://api.mapbox.com',
      'https://upload.wikimedia.org', // For Wikipedia images
      'https://via.placeholder.com', // For placeholder images
    ],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'https://api.mapbox.com',
      'https://events.mapbox.com',
      'https://api.openweathermap.org',
      'https://en.wikipedia.org',
      environment === 'staging' ? 'https://wheels-wins-backend-staging.onrender.com' : '',
      environment === 'production' ? 'https://pam-backend.onrender.com' : '',
      environment === 'development' ? 'ws://localhost:*' : '',
      environment === 'development' ? 'http://localhost:*' : '',
    ].filter(Boolean),
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
    ],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': environment !== 'development' ? [''] : [],
  };

  return Object.entries(baseCSP)
    .filter(([, values]) => values.length > 0)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');
};

/**
 * Complete security headers configuration
 */
export const getSecurityHeaders = (environment: 'development' | 'staging' | 'production'): SecurityHeadersConfig => ({
  contentSecurityPolicy: generateCSP(environment),

  // HSTS - Force HTTPS for 1 year
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',

  // Prevent MIME type sniffing
  xContentTypeOptions: 'nosniff',

  // Prevent embedding in frames (clickjacking protection)
  xFrameOptions: 'DENY',

  // Enable XSS filtering
  xXSSProtection: '1; mode=block',

  // Control referrer information
  referrerPolicy: 'strict-origin-when-cross-origin',

  // Permissions Policy (formerly Feature Policy)
  permissionsPolicy: [
    'geolocation=(self)',
    'microphone=()',
    'camera=()',
    'magnetometer=()',
    'gyroscope=()',
    'speaker=(self)',
    'notifications=(self)',
    'push=(self)',
  ].join(', ')
});

/**
 * Convert security headers to HTTP header format
 */
export const formatHeadersForHTTP = (headers: SecurityHeadersConfig): Record<string, string> => ({
  'Content-Security-Policy': headers.contentSecurityPolicy,
  'Strict-Transport-Security': headers.strictTransportSecurity,
  'X-Content-Type-Options': headers.xContentTypeOptions,
  'X-Frame-Options': headers.xFrameOptions,
  'X-XSS-Protection': headers.xXSSProtection,
  'Referrer-Policy': headers.referrerPolicy,
  'Permissions-Policy': headers.permissionsPolicy,
});

/**
 * Netlify-specific headers configuration for _headers file
 */
export const generateNetlifyHeaders = (environment: 'staging' | 'production'): string => {
  const headers = getSecurityHeaders(environment);
  const httpHeaders = formatHeadersForHTTP(headers);

  const netlifyConfig = [
    '/*',
    ...Object.entries(httpHeaders).map(([key, value]) => `  ${key}: ${value}`),
    '  Cache-Control: public, max-age=0, must-revalidate',
    '  X-Robots-Tag: index, follow',
    '',
    '# API routes - no caching',
    '/api/*',
    '  Cache-Control: no-store, no-cache, must-revalidate',
    '',
    '# Static assets - long cache',
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '# Service worker',
    '/sw.js',
    '  Cache-Control: no-cache',
  ];

  return netlifyConfig.join('\n');
};

/**
 * Validate CSP by checking for common issues
 */
export const validateCSP = (csp: string): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];

  // Check for unsafe practices
  if (csp.includes("'unsafe-eval'")) {
    issues.push("CSP contains 'unsafe-eval' which can allow code injection");
  }

  if (csp.includes('*') && !csp.includes('*.supabase.co')) {
    issues.push("CSP contains wildcard (*) which reduces security");
  }

  // Check for required directives
  const requiredDirectives = ['default-src', 'script-src', 'style-src', 'img-src'];
  requiredDirectives.forEach(directive => {
    if (!csp.includes(directive)) {
      issues.push(`CSP missing required directive: ${directive}`);
    }
  });

  return {
    valid: issues.length === 0,
    issues
  };
};

/**
 * Runtime CSP injection for SPA applications
 */
export const injectCSPMeta = (environment: 'development' | 'staging' | 'production'): void => {
  if (typeof document === 'undefined') return;

  const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existingMeta) {
    existingMeta.remove();
  }

  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = generateCSP(environment);

  document.head.appendChild(meta);

  console.debug('CSP injected:', meta.content);
};

// Export default configuration
export default {
  getSecurityHeaders,
  generateCSP,
  formatHeadersForHTTP,
  generateNetlifyHeaders,
  validateCSP,
  injectCSPMeta
};