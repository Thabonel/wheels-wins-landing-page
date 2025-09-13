/**
 * Feature Flag Service
 * 
 * Manages feature rollouts and A/B testing for PAM features.
 * Supports gradual rollout based on user percentage, user ID, or user groups.
 */

interface FeatureFlag {
  enabled: boolean;
  rolloutPercentage: number;
  userGroups?: string[];
  environments?: ('development' | 'staging' | 'production')[];
  startDate?: Date;
  endDate?: Date;
  description: string;
}

interface FeatureFlags {
  // PAM Features
  PAM_ENHANCED_UI: FeatureFlag;
  PAM_VOICE_FEATURES: FeatureFlag;
  PAM_ACCESSIBILITY_SUITE: FeatureFlag;
  PAM_PERFORMANCE_OPTIMIZATIONS: FeatureFlag;
  PAM_CONTEXT_MANAGEMENT: FeatureFlag;
  PAM_RESPONSE_CACHING: FeatureFlag;
  PAM_ANALYTICS_INTEGRATION: FeatureFlag;
  PAM_ERROR_RECOVERY: FeatureFlag;
  
  // Advanced Features
  PAM_VIRTUAL_SCROLLING: FeatureFlag;
  PAM_KEYBOARD_SHORTCUTS: FeatureFlag;
  PAM_SCREEN_READER_OPTIMIZATION: FeatureFlag;
  PAM_MOBILE_OPTIMIZATION: FeatureFlag;
  
  // Experimental Features
  PAM_AI_SUGGESTIONS: FeatureFlag;
  PAM_PROACTIVE_ASSISTANCE: FeatureFlag;
  PAM_MULTI_LANGUAGE: FeatureFlag;
}

// Feature flag configuration
const FEATURE_FLAGS: FeatureFlags = {
  // Core PAM Features - Gradual rollout
  PAM_ENHANCED_UI: {
    enabled: true,
    rolloutPercentage: 100, // Start with 10%, increase to 100%
    environments: ['development', 'staging', 'production'],
    description: 'Enhanced PAM UI with improved accessibility and performance'
  },
  
  PAM_VOICE_FEATURES: {
    enabled: true,
    rolloutPercentage: 100, // Start with 25%, increase to 100%
    environments: ['development', 'staging', 'production'],
    description: 'Voice input and output capabilities for PAM'
  },
  
  PAM_ACCESSIBILITY_SUITE: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'WCAG 2.1 AA accessibility features and screen reader support'
  },
  
  PAM_PERFORMANCE_OPTIMIZATIONS: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'Performance optimizations including virtual scrolling and caching'
  },
  
  // Advanced PAM Features
  PAM_CONTEXT_MANAGEMENT: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'Advanced context management with sliding window and summarization'
  },
  
  PAM_RESPONSE_CACHING: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'Intelligent response caching with LRU eviction'
  },
  
  PAM_ANALYTICS_INTEGRATION: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'Usage analytics and performance monitoring'
  },
  
  PAM_ERROR_RECOVERY: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'Robust error handling and recovery mechanisms'
  },
  
  // UI/UX Enhancements
  PAM_VIRTUAL_SCROLLING: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'Virtual scrolling for handling large conversation histories'
  },
  
  PAM_KEYBOARD_SHORTCUTS: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'Keyboard shortcuts for power users and accessibility'
  },
  
  PAM_SCREEN_READER_OPTIMIZATION: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'Screen reader optimizations and ARIA enhancements'
  },
  
  PAM_MOBILE_OPTIMIZATION: {
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    description: 'Mobile-specific optimizations and touch accessibility'
  },
  
  // Experimental Features - Limited rollout
  PAM_AI_SUGGESTIONS: {
    enabled: false,
    rolloutPercentage: 0, // Not ready for production
    environments: ['development'],
    description: 'AI-powered proactive suggestions (experimental)'
  },
  
  PAM_PROACTIVE_ASSISTANCE: {
    enabled: false,
    rolloutPercentage: 0, // Not ready for production
    environments: ['development'],
    description: 'Proactive assistance based on user patterns (experimental)'
  },
  
  PAM_MULTI_LANGUAGE: {
    enabled: false,
    rolloutPercentage: 0, // Planned for future release
    environments: ['development'],
    description: 'Multi-language support for voice and text (planned)'
  }
};

/**
 * Feature Flag Service Class
 */
export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private userId: string | null = null;
  private userGroups: string[] = [];
  private environment: string = 'development';

  private constructor() {
    this.environment = this.detectEnvironment();
  }

  public static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  /**
   * Initialize with user context
   */
  public initialize(userId: string, userGroups: string[] = []) {
    this.userId = userId;
    this.userGroups = userGroups;
  }

  /**
   * Check if a feature is enabled for the current user
   */
  public isEnabled(flagName: keyof FeatureFlags): boolean {
    const flag = FEATURE_FLAGS[flagName];
    
    if (!flag) {
      console.warn(`Feature flag ${flagName} not found`);
      return false;
    }

    // Check if feature is globally disabled
    if (!flag.enabled) {
      return false;
    }

    // Check environment
    if (flag.environments && !flag.environments.includes(this.environment as any)) {
      return false;
    }

    // Check date range
    if (flag.startDate && new Date() < flag.startDate) {
      return false;
    }
    
    if (flag.endDate && new Date() > flag.endDate) {
      return false;
    }

    // Check user groups
    if (flag.userGroups && flag.userGroups.length > 0) {
      const hasRequiredGroup = flag.userGroups.some(group => 
        this.userGroups.includes(group)
      );
      if (!hasRequiredGroup) {
        return false;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage >= 100) {
      return true;
    }

    // Use user ID for consistent rollout
    if (this.userId) {
      const hash = this.hashUserId(this.userId);
      const userPercentile = hash % 100;
      return userPercentile < flag.rolloutPercentage;
    }

    // Fallback to random for anonymous users (not recommended for production)
    return Math.random() * 100 < flag.rolloutPercentage;
  }

  /**
   * Get feature flag details
   */
  public getFlag(flagName: keyof FeatureFlags): FeatureFlag | null {
    return FEATURE_FLAGS[flagName] || null;
  }

  /**
   * Get all enabled features for current user
   */
  public getEnabledFeatures(): (keyof FeatureFlags)[] {
    return Object.keys(FEATURE_FLAGS).filter(
      flagName => this.isEnabled(flagName as keyof FeatureFlags)
    ) as (keyof FeatureFlags)[];
  }

  /**
   * Update rollout percentage (for gradual rollout)
   */
  public updateRolloutPercentage(flagName: keyof FeatureFlags, percentage: number) {
    if (FEATURE_FLAGS[flagName]) {
      FEATURE_FLAGS[flagName].rolloutPercentage = Math.max(0, Math.min(100, percentage));
    }
  }

  /**
   * Get rollout status for all PAM features
   */
  public getPAMRolloutStatus(): Record<string, { enabled: boolean; percentage: number }> {
    const pamFlags = Object.keys(FEATURE_FLAGS).filter(key => key.startsWith('PAM_'));
    const status: Record<string, { enabled: boolean; percentage: number }> = {};

    pamFlags.forEach(flagName => {
      const flag = FEATURE_FLAGS[flagName as keyof FeatureFlags];
      status[flagName] = {
        enabled: flag.enabled,
        percentage: flag.rolloutPercentage
      };
    });

    return status;
  }

  /**
   * Detect current environment
   */
  private detectEnvironment(): string {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        return 'development';
      }
      if (hostname.includes('staging') || hostname.includes('netlify')) {
        return 'staging';
      }
      return 'production';
    }
    return process.env.NODE_ENV || 'development';
  }

  /**
   * Hash user ID for consistent rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Export singleton instance
export const featureFlags = FeatureFlagService.getInstance();

// React hook for feature flags
export const useFeatureFlag = (flagName: keyof FeatureFlags): boolean => {
  return featureFlags.isEnabled(flagName);
};

// React hook for multiple feature flags
export const useFeatureFlags = (flagNames: (keyof FeatureFlags)[]): Record<string, boolean> => {
  const flags: Record<string, boolean> = {};
  flagNames.forEach(flagName => {
    flags[flagName] = featureFlags.isEnabled(flagName);
  });
  return flags;
};

// Gradual rollout plan for PAM features
export const PAM_ROLLOUT_SCHEDULE = {
  week1: {
    PAM_ENHANCED_UI: 10,
    PAM_ACCESSIBILITY_SUITE: 100, // Critical for compliance
    PAM_PERFORMANCE_OPTIMIZATIONS: 25
  },
  week2: {
    PAM_ENHANCED_UI: 50,
    PAM_VOICE_FEATURES: 25,
    PAM_PERFORMANCE_OPTIMIZATIONS: 75
  },
  week3: {
    PAM_ENHANCED_UI: 100,
    PAM_VOICE_FEATURES: 75,
    PAM_CONTEXT_MANAGEMENT: 50
  },
  week4: {
    PAM_VOICE_FEATURES: 100,
    PAM_CONTEXT_MANAGEMENT: 100,
    PAM_RESPONSE_CACHING: 100
  }
};

export default featureFlags;