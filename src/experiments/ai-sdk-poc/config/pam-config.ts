/**
 * PAM AI SDK Configuration
 * Central configuration for the AI SDK implementation
 */

export const pamConfig = {
  // Model configurations
  models: {
    primary: 'gpt-4-turbo-preview',
    fallback: 'claude-3-sonnet-20240229',
    emergency: 'gpt-3.5-turbo',
  },

  // API quotas and limits
  quotas: {
    maxTokensPerRequest: 4096,
    maxRequestsPerMinute: 100,
    maxRequestsPerDay: 5000,
    maxCostPerDay: 50.00, // USD
    maxCostPerMonth: 1000.00, // USD
  },

  // Default parameters
  defaults: {
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
  },

  // Feature flags
  features: {
    enableTools: true,
    enableStreaming: true,
    enableVoice: true,
    enableCostTracking: true,
    enableMetrics: true,
    enableFallback: true,
  },

  // Circuit breaker configuration
  circuitBreaker: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000, // 30 seconds
    resetTimeout: 60000, // 1 minute
  },

  // Voice configuration
  voice: {
    transcriptionModel: 'whisper-1',
    ttsModel: 'tts-1',
    ttsVoice: 'nova',
    enablePartialResponses: true,
    chunkSize: 100, // characters for partial TTS
  },

  // Monitoring and alerting
  monitoring: {
    trackTokenUsage: true,
    trackCosts: true,
    trackLatency: true,
    trackErrors: true,
    alertOnQuotaExceed: true,
    alertOnHighCost: true,
    alertOnHighLatency: true,
    alertThresholds: {
      costPerHour: 5.00,
      latencyP95: 5000, // ms
      errorRate: 0.05, // 5%
    },
  },

  // Retry configuration
  retry: {
    maxRetries: 3,
    initialDelay: 1000, // ms
    maxDelay: 10000, // ms
    backoffMultiplier: 2,
  },

  // Cache configuration
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes
    maxSize: 100, // entries
    cacheableTools: ['weather', 'searchNearby', 'getUserContext'],
  },

  // Security
  security: {
    sanitizeInput: true,
    validateTools: true,
    maxInputLength: 10000,
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:8080',
      'https://wheelsandwins.com',
      'https://*.wheelsandwins.com',
      'https://*.netlify.app',
    ],
  },
};

/**
 * Get environment-specific config overrides
 */
export const getEnvironmentConfig = () => {
  const env = import.meta.env.VITE_ENVIRONMENT || 'development';
  
  switch (env) {
    case 'production':
      return {
        ...pamConfig,
        quotas: {
          ...pamConfig.quotas,
          maxCostPerDay: 100.00,
          maxCostPerMonth: 2000.00,
        },
        monitoring: {
          ...pamConfig.monitoring,
          alertThresholds: {
            costPerHour: 10.00,
            latencyP95: 3000,
            errorRate: 0.01,
          },
        },
      };
    
    case 'staging':
      return {
        ...pamConfig,
        quotas: {
          ...pamConfig.quotas,
          maxCostPerDay: 25.00,
          maxCostPerMonth: 500.00,
        },
      };
    
    default:
      return pamConfig;
  }
};

export default getEnvironmentConfig();