/**
 * Authentication Configuration - SaaS Best Practices
 * 
 * Allows switching between authentication methods based on environment
 * and JWT size optimization needs
 */

export interface AuthConfig {
  method: 'reference-token' | 'optimized-jwt' | 'standard-jwt';
  description: string;
  benefits: string[];
  headerSize: 'minimal' | 'small' | 'large';
}

export const AUTH_METHODS: Record<string, AuthConfig> = {
  'reference-token': {
    method: 'reference-token',
    description: 'Industry standard used by Stripe, GitHub, major SaaS platforms',
    benefits: [
      '32 character tokens (95% size reduction)',
      'Server-side session management',
      'Instant token revocation',
      'No header size limits'
    ],
    headerSize: 'minimal'
  },
  'optimized-jwt': {
    method: 'optimized-jwt', 
    description: 'Minimized JWT with essential claims only',
    benefits: [
      '~400 character tokens (40% size reduction)',
      'Self-contained authentication',
      'Works with all JWT libraries',
      'Stateless verification'
    ],
    headerSize: 'small'
  },
  'standard-jwt': {
    method: 'standard-jwt',
    description: 'Full Supabase JWT with all metadata',
    benefits: [
      'Complete user metadata in token',
      'No server-side session storage',
      'Default Supabase behavior'
    ],
    headerSize: 'large'
  }
};

export class AuthConfigManager {
  private static readonly STORAGE_KEY = 'auth_method';
  
  /**
   * Get current authentication method
   */
  static getCurrentMethod(): AuthConfig['method'] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored && stored in AUTH_METHODS) {
      return stored as AuthConfig['method'];
    }
    
    // Auto-detect optimal method
    return this.getOptimalMethod();
  }
  
  /**
   * Set authentication method
   */
  static setMethod(method: AuthConfig['method']): void {
    localStorage.setItem(this.STORAGE_KEY, method);
    console.log(`🔧 Auth method changed to: ${method}`);
    console.log(`📝 ${AUTH_METHODS[method].description}`);
  }
  
  /**
   * Auto-detect optimal authentication method based on environment
   */
  static getOptimalMethod(): AuthConfig['method'] {
    // Check if we're on Render.com or similar platforms with header limits
    const isRenderOrSimilar = window.location.hostname.includes('onrender.com') ||
                             navigator.userAgent.includes('render') ||
                             document.referrer.includes('render');
    
    // Check if we have database support for reference tokens
    const hasReferenceTokenSupport = localStorage.getItem('reference_token_supported') === 'true';
    
    if (hasReferenceTokenSupport) {
      return 'reference-token';
    } else if (isRenderOrSimilar) {
      return 'optimized-jwt';
    } else {
      return 'standard-jwt';
    }
  }
  
  /**
   * Enable reference tokens (after setting up database)
   */
  static enableReferenceTokens(): void {
    localStorage.setItem('reference_token_supported', 'true');
    this.setMethod('reference-token');
  }
  
  /**
   * Get current auth configuration
   */
  static getCurrentConfig(): AuthConfig {
    return AUTH_METHODS[this.getCurrentMethod()];
  }
  
  /**
   * Test current auth method and suggest optimizations
   */
  static async testAndSuggestOptimizations(): Promise<{
    current: AuthConfig;
    recommendation?: AuthConfig;
    reason?: string;
  }> {
    const current = this.getCurrentConfig();
    
    // Test JWT size if using JWT methods
    if (current.method.includes('jwt')) {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          const tokenSize = session.access_token.length + 7; // + "Bearer "
          
          if (tokenSize > 700 && current.method === 'standard-jwt') {
            return {
              current,
              recommendation: AUTH_METHODS['reference-token'],
              reason: `JWT size (${tokenSize} chars) may cause header limit issues`
            };
          } else if (tokenSize > 500 && current.method === 'standard-jwt') {
            return {
              current,
              recommendation: AUTH_METHODS['optimized-jwt'],
              reason: `JWT size (${tokenSize} chars) is larger than optimal`
            };
          }
        }
      } catch (error) {
        console.warn('Could not test JWT size:', error);
      }
    }
    
    return { current };
  }
}

/**
 * Initialize authentication method on app startup
 */
export function initializeAuthMethod(): void {
  const method = AuthConfigManager.getCurrentMethod();
  const config = AuthConfigManager.getCurrentConfig();
  
  console.log('🔧 Auth method initialized:', method);
  console.log('📝', config.description);
  console.log('✨ Benefits:', config.benefits.join(', '));
  
  // Set flags for backwards compatibility
  localStorage.setItem('use_reference_tokens', (method === 'reference-token').toString());
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  initializeAuthMethod();
}