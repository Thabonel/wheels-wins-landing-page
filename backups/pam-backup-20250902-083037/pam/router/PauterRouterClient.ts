/**
 * PauterRouter Client
 * Connects to backend PauterRouter for intent classification
 * Uses LangChain for NLP-based routing decisions
 */

import { ConversationContext, Intent, RouterClassification } from '../architectureTypes';
import { apiClient } from '@/services/api';

export class PauterRouterClient {
  private endpoint: string;
  private initialized: boolean = false;
  private routingCache: Map<string, RouterClassification> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Use the PAM backend endpoint
    this.endpoint = '/api/v1/pam/classify';
  }

  /**
   * Initialize the router client
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Test connection to backend
      const response = await apiClient('/api/v1/pam/health');
      if (!response.ok) {
        throw new Error('PauterRouter backend not available');
      }

      this.initialized = true;
      console.log('✅ PauterRouter client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize PauterRouter:', error);
      // Continue anyway - we'll use fallback classification
      this.initialized = true;
    }
  }

  /**
   * Classify user intent using PauterRouter
   */
  async classify(message: string, context: ConversationContext): Promise<Intent> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check cache first
    const cacheKey = this.getCacheKey(message);
    const cached = this.routingCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      console.log('📦 Using cached classification');
      return cached.intent;
    }

    try {
      // Call backend PauterRouter
      const response = await apiClient(this.endpoint, {
        method: 'POST',
        body: JSON.stringify({
          message,
          context: {
            userId: context.userId,
            sessionId: context.sessionId,
            previousMessages: context.messages.slice(-3), // Last 3 messages for context
            userProfile: context.userProfile,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Classification request failed');
      }

      const data = await response.json();
      const classification: RouterClassification = {
        intent: data.intent || this.fallbackClassification(message),
        confidence: data.confidence || 0.5,
        alternativeIntents: data.alternatives,
        reasoning: data.reasoning,
      };

      // Cache the result
      this.cacheClassification(cacheKey, classification);

      return classification.intent;
    } catch (error) {
      console.error('❌ PauterRouter classification error:', error);
      // Use fallback classification
      return this.fallbackClassification(message);
    }
  }

  /**
   * Fallback classification when backend is unavailable
   */
  private fallbackClassification(message: string): Intent {
    const lowerMessage = message.toLowerCase();
    
    // Trip planning patterns
    if (/trip|route|drive|travel|destination|visit|go to|plan/i.test(message)) {
      return {
        category: 'trip_planning',
        confidence: 0.7,
        entities: this.extractEntities(message),
      };
    }

    // Financial patterns
    if (/expense|spent|cost|budget|save|money|paid|bill/i.test(message)) {
      return {
        category: 'financial_tracking',
        confidence: 0.7,
        entities: this.extractEntities(message),
      };
    }

    // Weather patterns
    if (/weather|forecast|rain|sun|temperature|storm|wind/i.test(message)) {
      return {
        category: 'weather_check',
        confidence: 0.8,
        entities: this.extractEntities(message),
      };
    }

    // Campground patterns
    if (/campground|rv park|camp|park|stay|overnight/i.test(message)) {
      return {
        category: 'campground_search',
        confidence: 0.75,
        entities: this.extractEntities(message),
      };
    }

    // Social patterns
    if (/meet|connect|group|event|community|friend|traveler/i.test(message)) {
      return {
        category: 'community_interaction',
        confidence: 0.65,
        entities: this.extractEntities(message),
      };
    }

    // Preference/profile patterns
    if (/prefer|like|my usual|remember|always|never|profile/i.test(message)) {
      return {
        category: 'preference_setting',
        confidence: 0.7,
        entities: this.extractEntities(message),
      };
    }

    // Default to general conversation
    return {
      category: 'general_conversation',
      confidence: 0.5,
      entities: {},
    };
  }

  /**
   * Extract entities from message
   */
  private extractEntities(message: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract locations (simple pattern matching)
    const locationPattern = /(?:to|from|in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    const locations = Array.from(message.matchAll(locationPattern), m => m[1]);
    if (locations.length > 0) {
      entities.locations = locations;
    }

    // Extract dates
    const datePatterns = [
      /tomorrow/i,
      /today/i,
      /next\s+(?:week|month|year)/i,
      /\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/,
    ];
    const dates = datePatterns.filter(p => p.test(message));
    if (dates.length > 0) {
      entities.hasDates = true;
    }

    // Extract amounts
    const amountPattern = /\$?(\d+(?:\.\d{2})?)/;
    const amountMatch = message.match(amountPattern);
    if (amountMatch) {
      entities.amount = parseFloat(amountMatch[1]);
    }

    // Extract common keywords
    if (/urgent|asap|immediately|now/i.test(message)) {
      entities.priority = 'high';
    }

    return entities;
  }

  /**
   * Generate cache key for classification
   */
  private getCacheKey(message: string): string {
    // Normalize message for caching
    return message.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }

  /**
   * Cache classification result
   */
  private cacheClassification(key: string, classification: RouterClassification): void {
    this.routingCache.set(key, {
      ...classification,
      intent: {
        ...classification.intent,
        cached: true,
        cachedAt: Date.now(),
      } as Intent,
    });

    // Clean old cache entries
    if (this.routingCache.size > 100) {
      const oldestKey = this.routingCache.keys().next().value;
      if (oldestKey) this.routingCache.delete(oldestKey);
    }
  }

  /**
   * Check if cached classification is still valid
   */
  private isCacheValid(classification: RouterClassification): boolean {
    const cachedAt = (classification.intent as any).cachedAt;
    if (!cachedAt) return false;
    return Date.now() - cachedAt < this.cacheTimeout;
  }

  /**
   * Get classification statistics
   */
  getStats(): any {
    return {
      cacheSize: this.routingCache.size,
      initialized: this.initialized,
      endpoint: this.endpoint,
    };
  }

  /**
   * Clear classification cache
   */
  clearCache(): void {
    this.routingCache.clear();
  }
}