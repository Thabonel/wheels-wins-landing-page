/**
 * Feature Flags Configuration
 * Enables gradual rollout of PAM AI SDK migration
 */

interface FeatureFlags {
  // PAM AI SDK Migration Flags
  useAiSdkPam: boolean;
  aiSdkRolloutPercentage: number;
  aiSdkPocMode: boolean;
  
  // Individual tool migration flags
  aiSdkWeatherTool: boolean;
  aiSdkSearchTool: boolean;
  aiSdkExpenseTool: boolean;
  aiSdkTripPlanningTool: boolean;
  
  // Performance and monitoring flags
  enableAiSdkMetrics: boolean;
  enableStreamingResponses: boolean;
  enableVoiceIntegration: boolean;
  
  // Safety and fallback flags
  enableWebSocketFallback: boolean;
  enableCostLimits: boolean;
  maxDailyCost: number;
}

const getEnvBoolean = (key: string, defaultValue: boolean = false): boolean => {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
};

const getEnvNumber = (key: string, defaultValue: number = 0): number => {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

export const flags: FeatureFlags = {
  // PAM AI SDK Migration - Start with 0% rollout in staging
  useAiSdkPam: getEnvBoolean('VITE_USE_AI_SDK_PAM', false),
  aiSdkRolloutPercentage: getEnvNumber('VITE_AI_SDK_ROLLOUT_PERCENTAGE', 0),
  aiSdkPocMode: getEnvBoolean('VITE_AI_SDK_POC_MODE', true), // Enable POC mode in staging
  
  // Individual tool flags - enables granular migration
  aiSdkWeatherTool: getEnvBoolean('VITE_AI_SDK_WEATHER_TOOL', true),
  aiSdkSearchTool: getEnvBoolean('VITE_AI_SDK_SEARCH_TOOL', true),
  aiSdkExpenseTool: getEnvBoolean('VITE_AI_SDK_EXPENSE_TOOL', false),
  aiSdkTripPlanningTool: getEnvBoolean('VITE_AI_SDK_TRIP_PLANNING_TOOL', false),
  
  // Performance and monitoring
  enableAiSdkMetrics: getEnvBoolean('VITE_ENABLE_AI_SDK_METRICS', true),
  enableStreamingResponses: getEnvBoolean('VITE_ENABLE_STREAMING_RESPONSES', true),
  enableVoiceIntegration: getEnvBoolean('VITE_ENABLE_VOICE_INTEGRATION', false), // Temporarily disabled for Phase 1
  
  // Safety measures
  enableWebSocketFallback: getEnvBoolean('VITE_ENABLE_WEBSOCKET_FALLBACK', true),
  enableCostLimits: getEnvBoolean('VITE_ENABLE_COST_LIMITS', true),
  maxDailyCost: getEnvNumber('VITE_MAX_DAILY_COST', 50),
};

/**
 * Determines if a user should see the AI SDK version based on rollout percentage
 */
export const getUserVariant = (userId: string): 'ai-sdk' | 'legacy' => {
  // Always use legacy in production until rollout
  if (import.meta.env.VITE_ENVIRONMENT === 'production' && flags.aiSdkRolloutPercentage === 0) {
    return 'legacy';
  }
  
  // POC mode always returns ai-sdk for testing
  if (flags.aiSdkPocMode) {
    return 'ai-sdk';
  }
  
  // If AI SDK is disabled, always use legacy
  if (!flags.useAiSdkPam) {
    return 'legacy';
  }
  
  // Calculate hash from userId for consistent assignment
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and get percentage
  const percentage = Math.abs(hash % 100);
  
  return percentage < flags.aiSdkRolloutPercentage ? 'ai-sdk' : 'legacy';
};

/**
 * Check if a specific tool should use AI SDK
 */
export const shouldUseAiSdkForTool = (toolName: keyof Pick<FeatureFlags, 'aiSdkWeatherTool' | 'aiSdkSearchTool' | 'aiSdkExpenseTool' | 'aiSdkTripPlanningTool'>): boolean => {
  return flags.useAiSdkPam && flags[toolName];
};

/**
 * Development helper to log current flag state
 */
export const logFeatureFlags = () => {
  if (import.meta.env.DEV) {
    console.group('🚩 Feature Flags Status');
    console.log('Environment:', import.meta.env.VITE_ENVIRONMENT);
    console.log('AI SDK PAM Enabled:', flags.useAiSdkPam);
    console.log('Rollout Percentage:', `${flags.aiSdkRolloutPercentage  }%`);
    console.log('POC Mode:', flags.aiSdkPocMode);
    console.log('WebSocket Fallback:', flags.enableWebSocketFallback);
    console.log('Cost Limits:', flags.enableCostLimits, `($${flags.maxDailyCost}/day)`);
    console.groupEnd();
  }
};

// Log flags in development
if (import.meta.env.DEV) {
  logFeatureFlags();
}