/**
 * Input sanitization utilities for PAM Visual Control
 */

/**
 * Sanitize text content to prevent XSS attacks
 */
export function sanitizeText(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanitize CSS selector to prevent injection
 */
export function sanitizeSelector(selector: string): string {
  // Remove potentially dangerous characters
  return selector.replace(/[<>"'`]/g, '');
}

/**
 * Validate and sanitize route paths
 */
export function sanitizeRoute(route: string): string {
  // Ensure route starts with / and contains only valid characters
  if (!route.startsWith('/')) {
    route = `/${  route}`;
  }
  // Remove query params and hash for safety
  return route.split('?')[0].split('#')[0];
}

/**
 * Sanitize form field names
 */
export function sanitizeFieldName(fieldName: string): string {
  // Allow only alphanumeric, dash, underscore
  return fieldName.replace(/[^a-zA-Z0-9\-_]/g, '');
}

/**
 * Validate and sanitize form values
 */
export function sanitizeFormValue(value: unknown): string {
  if (typeof value === 'string') {
    return sanitizeText(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

/**
 * Create CSP-compliant inline styles
 */
export function createSafeStyles(styles: Record<string, string>): string {
  const allowedProperties = [
    'position', 'top', 'bottom', 'left', 'right',
    'background', 'background-color', 'color',
    'padding', 'margin', 'border', 'border-radius',
    'font-size', 'font-weight', 'z-index',
    'animation', 'transition', 'transform',
    'width', 'height', 'display', 'opacity'
  ];
  
  return Object.entries(styles)
    .filter(([prop]) => allowedProperties.includes(prop))
    .map(([prop, value]) => `${prop}: ${value}`)
    .join('; ');
}