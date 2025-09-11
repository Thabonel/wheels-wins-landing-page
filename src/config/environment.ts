// Environment configuration and utilities

export const ENV = {
  NODE_ENV: import.meta.env.NODE_ENV,
  ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT || 'development',
  
  // API Configuration  
  API_BASE_URL: import.meta.env.VITE_API_URL || 
                import.meta.env.VITE_BACKEND_URL || 
                (import.meta.env.VITE_ENVIRONMENT === 'staging' 
                  ? 'https://pam-backend.onrender.com'  // Staging backend
                  : 'https://pam-backend.onrender.com'),
  
  // Supabase Configuration
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  
  // External APIs
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN || '',
  
  // Feature Flags
  ENABLE_BETA_FEATURES: import.meta.env.VITE_ENABLE_BETA_FEATURES === 'true',
  ENABLE_DEBUG_TOOLS: import.meta.env.VITE_ENABLE_DEBUG_TOOLS === 'true',
  ENABLE_PERFORMANCE_MONITORING: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
  
  // Environment-specific flags
  SHOW_STAGING_BANNER: import.meta.env.VITE_SHOW_STAGING_BANNER === 'true',
  ENABLE_TEST_DATA: import.meta.env.VITE_ENABLE_TEST_DATA === 'true',
  SKIP_EMAIL_VERIFICATION: import.meta.env.VITE_SKIP_EMAIL_VERIFICATION === 'true',
  
  // Analytics
  GOOGLE_ANALYTICS_ID: import.meta.env.VITE_GOOGLE_ANALYTICS_ID || '',
  HOTJAR_ID: import.meta.env.VITE_HOTJAR_ID || '',
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || '',
  
  // Payment
  STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  
  // Digistore24
  DIGISTORE24_VENDOR_ID: import.meta.env.VITE_DIGISTORE24_VENDOR_ID || 'Thabonel',
  DIGISTORE24_THANK_YOU_PAGE_KEY: import.meta.env.VITE_DIGISTORE24_THANK_YOU_PAGE_KEY || '',
} as const;

export const isDevelopment = ENV.ENVIRONMENT === 'development';
export const isStaging = ENV.ENVIRONMENT === 'staging';
export const isProduction = ENV.ENVIRONMENT === 'production';

// Environment-specific configurations
export const getEnvironmentConfig = () => {
  const baseConfig = {
    apiRetries: 3,
    requestTimeout: 10000,
    cacheTimeout: 300000, // 5 minutes
  };

  switch (ENV.ENVIRONMENT) {
    case 'development':
      return {
        ...baseConfig,
        apiRetries: 1,
        requestTimeout: 30000,
        enableLogging: true,
        enableDebugTools: true,
      };
    
    case 'staging':
      return {
        ...baseConfig,
        apiRetries: 2,
        requestTimeout: 15000,
        enableLogging: true,
        enableDebugTools: ENV.ENABLE_DEBUG_TOOLS,
      };
    
    case 'production':
      return {
        ...baseConfig,
        enableLogging: false,
        enableDebugTools: false,
      };
    
    default:
      return baseConfig;
  }
};

// Validation function to ensure required environment variables are set
export const validateEnvironment = () => {
  const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    if (isProduction) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }
  
  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
};

// Debug helper for development
export const logEnvironmentInfo = () => {
  if (isDevelopment || isStaging) {
    console.log('🌍 Environment Info:', {
      environment: ENV.ENVIRONMENT,
      nodeEnv: ENV.NODE_ENV,
      apiBaseUrl: ENV.API_BASE_URL,
      supabaseUrl: ENV.SUPABASE_URL ? '✅ Set' : '❌ Missing',
      features: {
        betaFeatures: ENV.ENABLE_BETA_FEATURES,
        debugTools: ENV.ENABLE_DEBUG_TOOLS,
        performanceMonitoring: ENV.ENABLE_PERFORMANCE_MONITORING,
      },
    });
  }
};