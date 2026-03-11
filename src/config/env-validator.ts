/**
 * Environment Variable Validator
 * Helps diagnose deployment issues with missing environment variables
 */

interface EnvironmentConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_MAPBOX_TOKEN?: string;
  VITE_MAPBOX_PUBLIC_TOKEN?: string;
  VITE_SENTRY_DSN?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: Partial<EnvironmentConfig>;
}

export function validateEnvironment(): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    config: {}
  };

  // Required environment variables
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];

  // Optional environment variables
  const optionalEnvVars = [
    'VITE_MAPBOX_TOKEN',
    'VITE_MAPBOX_PUBLIC_TOKEN', 
    'VITE_SENTRY_DSN'
  ];

  // Check required variables
  for (const envVar of requiredEnvVars) {
    const value = import.meta.env[envVar];
    if (!value) {
      result.errors.push(`Missing required environment variable: ${envVar}`);
      result.isValid = false;
    } else {
      // Validate URL format for URL variables
      if (envVar.includes('URL')) {
        try {
          new URL(value);
          result.config[envVar as keyof EnvironmentConfig] = value;
        } catch (error) {
          result.errors.push(`Invalid URL format for ${envVar}: ${value}`);
          result.isValid = false;
        }
      } else {
        result.config[envVar as keyof EnvironmentConfig] = value;
      }
    }
  }

  // Check optional variables (only warn in production or if features require them)
  for (const envVar of optionalEnvVars) {
    const value = import.meta.env[envVar];
    if (!value) {
      // Only warn about missing optional variables in production
      // In development, these are truly optional
      if (import.meta.env.PROD) {
        result.warnings.push(`Optional environment variable not set: ${envVar}`);
      }
    } else {
      result.config[envVar as keyof EnvironmentConfig] = value;
    }
  }

  return result;
}

export function logEnvironmentStatus(): void {
  const validation = validateEnvironment();
  
  console.group('🔧 Environment Configuration Status');
  console.log('Mode:', import.meta.env.MODE);
  console.log('Build:', import.meta.env.PROD ? 'Production' : 'Development');
  
  if (validation.isValid) {
    console.log('✅ All required environment variables are configured');
  } else {
    console.error('❌ Environment configuration issues detected');
    validation.errors.forEach(error => console.error('  -', error));
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Warnings:');
    validation.warnings.forEach(warning => console.warn('  -', warning));
  }
  
  console.groupEnd();
}

// Auto-log environment status in development
if (import.meta.env.DEV) {
  logEnvironmentStatus();
}