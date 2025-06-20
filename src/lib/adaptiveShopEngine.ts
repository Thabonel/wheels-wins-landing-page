
import { useShoppingBehavior, ShoppingBehaviorData } from '@/hooks/useShoppingBehavior';
import { useShoppingAnalytics } from '@/hooks/useShoppingAnalytics';
import { ShopProduct, DigitalProduct, AffiliateProduct } from '@/components/shop/types';
import { supabase } from '@/integrations/supabase';

// Helper function to safely get product category
const getProductCategory = (product: ShopProduct): string => {
  if ('category' in product) {
    return product.category;
  }
  // Fallback category assignment for affiliate products
  if ('externalLink' in product) {
    return 'travel-gear'; // Default category for affiliate products
  }
  return 'digital'; // Default category for digital products
};

// Helper function to safely get product tags
const getProductTags = (product: ShopProduct): string[] => {
  if ('tags' in product) {
    return product.tags || [];
  }
  return [];
};

// Helper function to safely get product price
const getProductPrice = (product: ShopProduct): number => {
  if ('price' in product) {
    return product.price;
  }
  return 0; // Affiliate products don't have direct price
};

export interface PersonalizationRule {
  id: string;
  condition: string;
  action: string;
  threshold: number;
  enabled: boolean;
}

export interface InventoryRotation {
  productId: string;
  action: 'promote' | 'demote' | 'remove';
  reason: string;
  confidence: number;
}

export interface AdaptiveLearningMetrics {
  userEngagement: number;
  conversionRate: number;
  averageSessionTime: number;
  preferenceAccuracy: number;
  inventoryTurnover: number;
}

export interface RecommendationWithConfidence {
  id: string;
  product: ShopProduct;
  confidence: number;
  reasoning: string;
  source: 'behavior' | 'trending' | 'seasonal' | 'collaborative';
}

export interface SeasonalAdjustment {
  category: string;
  multiplier: number;
  seasonStart: Date;
  seasonEnd: Date;
}

export interface TrendingItem {
  productId: string;
  trendScore: number;
  velocity: number;
  region?: string;
}

export class AdaptiveShopEngine {
  private behaviorData: ShoppingBehaviorData | null = null;
  private personalizationRules: PersonalizationRule[] = [];
  private analytics: ReturnType<typeof useShoppingAnalytics> | null = null;
  private learningEnabled: boolean = true;

  constructor() {
    this.initializePersonalizationRules();
  }

  // Initialize behavior tracking integration
  public initializeBehaviorTracking(behaviorHook: ReturnType<typeof useShoppingBehavior>) {
    this.behaviorData = behaviorHook.behaviorData;
    return this;
  }

  // Initialize analytics integration
  public initializeAnalytics(analyticsHook: ReturnType<typeof useShoppingAnalytics>) {
    this.analytics = analyticsHook;
    return this;
  }

  // Initialize default personalization rules
  private initializePersonalizationRules() {
    this.personalizationRules = [
      {
        id: 'outdoor-gear-preference',
        condition: 'category_view_percentage > 60',
        action: 'boost_category_outdoor',
        threshold: 0.6,
        enabled: true
      },
      {
        id: 'digital-product-preference',
        condition: 'digital_purchase_ratio > 70',
        action: 'boost_digital_products',
        threshold: 0.7,
        enabled: true
      },
      {
        id: 'price-sensitive',
        condition: 'avg_price_viewed < 50',
        action: 'boost_budget_items',
        threshold: 50,
        enabled: true
      }
    ];
  }

  // Real-time learning algorithm that updates inventory based on user patterns
  public async adaptInventory(products: ShopProduct[]): Promise<ShopProduct[]> {
    if (!this.behaviorData || !this.learningEnabled) {
      return products;
    }

    try {
      // Analyze user behavior patterns
      const preferences = this.analyzeUserPreferences();
      
      // Apply personalization rules
      const personalizedProducts = this.applyPersonalizationRules(products, preferences);
      
      // Apply seasonal adjustments
      const seasonallyAdjusted = this.applySeasonalAdjustments(personalizedProducts);
      
      // Apply trending item boost
      const trendingAdjusted = await this.applyTrendingBoosts(seasonallyAdjusted);
      
      // Sort by relevance score
      return this.sortByRelevance(trendingAdjusted, preferences);
    } catch (error) {
      console.error('Error in adaptive inventory:', error);
      return products; // Fallback to original products
    }
  }

  // Analyze user preferences from behavior data
  private analyzeUserPreferences() {
    if (!this.behaviorData) return {};

    const preferences: Record<string, any> = {};
    
    // Category preferences
    const categoryViews: Record<string, number> = {};
    this.behaviorData.productViews.forEach(view => {
      const category = view.category || 'unknown';
      categoryViews[category] = (categoryViews[category] || 0) + (view.viewCount || 1);
    });

    const totalViews = Object.values(categoryViews).reduce((sum, count) => sum + count, 0);
    preferences.categoryPercentages = Object.entries(categoryViews).reduce((acc, [cat, count]) => {
      acc[cat] = totalViews > 0 ? count / totalViews : 0;
      return acc;
    }, {} as Record<string, number>);

    // Price preferences
    const prices = this.behaviorData.productViews
      .map(view => view.price)
      .filter(price => price !== undefined && price > 0);
    
    preferences.averagePrice = prices.length > 0 
      ? prices.reduce((sum, price) => sum + price!, 0) / prices.length 
      : 0;

    // Purchase patterns
    preferences.digitalPurchaseRatio = this.calculateDigitalPurchaseRatio();
    
    return preferences;
  }

  // Apply personalization rules to products
  private applyPersonalizationRules(products: ShopProduct[], preferences: any): ShopProduct[] {
    return products.map(product => {
      let relevanceScore = 1.0;
      
      this.personalizationRules.forEach(rule => {
        if (!rule.enabled) return;

        switch (rule.action) {
          case 'boost_category_outdoor':
            if (getProductCategory(product).includes('outdoor') && 
                preferences.categoryPercentages?.outdoor > rule.threshold) {
              relevanceScore *= 1.5;
            }
            break;
          case 'boost_digital_products':
            if ('price' in product && preferences.digitalPurchaseRatio > rule.threshold) {
              relevanceScore *= 1.3;
            }
            break;
          case 'boost_budget_items':
            if (getProductPrice(product) < rule.threshold && 
                preferences.averagePrice < rule.threshold) {
              relevanceScore *= 1.4;
            }
            break;
        }
      });

      return { ...product, relevanceScore };
    });
  }

  // Apply seasonal adjustments
  private applySeasonalAdjustments(products: ShopProduct[]): ShopProduct[] {
    const currentDate = new Date();
    const seasonalAdjustments = this.getSeasonalAdjustments(currentDate);

    return products.map(product => {
      const category = getProductCategory(product);
      const adjustment = seasonalAdjustments.find(adj => adj.category === category);
      
      if (adjustment) {
        const currentScore = (product as any).relevanceScore || 1.0;
        return { ...product, relevanceScore: currentScore * adjustment.multiplier };
      }
      
      return product;
    });
  }

  // Apply trending item boosts
  private async applyTrendingBoosts(products: ShopProduct[]): Promise<ShopProduct[]> {
    try {
      const trendingItems = await this.getTrendingItems();
      
      return products.map(product => {
        const trending = trendingItems.find(item => item.productId === product.id);
        if (trending) {
          const currentScore = (product as any).relevanceScore || 1.0;
          const trendBoost = 1 + (trending.trendScore * 0.5);
          return { ...product, relevanceScore: currentScore * trendBoost };
        }
        return product;
      });
    } catch (error) {
      console.error('Error applying trending boosts:', error);
      return products;
    }
  }

  // Sort products by relevance score
  private sortByRelevance(products: ShopProduct[], preferences: any): ShopProduct[] {
    return products.sort((a, b) => {
      const scoreA = (a as any).relevanceScore || 1.0;
      const scoreB = (b as any).relevanceScore || 1.0;
      return scoreB - scoreA;
    });
  }

  // Generate recommendations with confidence scores
  public generateRecommendations(products: ShopProduct[], count: number = 6): RecommendationWithConfidence[] {
    if (!this.behaviorData) {
      return products.slice(0, count).map(product => ({
        id: product.id,
        product,
        confidence: 0.5,
        reasoning: 'Default recommendation',
        source: 'behavior' as const
      }));
    }

    const preferences = this.analyzeUserPreferences();
    const recommendations: RecommendationWithConfidence[] = [];

    products.forEach(product => {
      const confidence = this.calculateConfidenceScore(product, preferences);
      const reasoning = this.generateReasoning(product, preferences);
      
      if (confidence > 0.3) { // Only include recommendations with decent confidence
        recommendations.push({
          id: product.id,
          product,
          confidence,
          reasoning,
          source: this.determineSource(product, preferences)
        });
      }
    });

    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, count);
  }

  // Calculate confidence score for a product recommendation
  private calculateConfidenceScore(product: ShopProduct, preferences: any): number {
    let confidence = 0.5; // Base confidence

    const category = getProductCategory(product);
    const price = getProductPrice(product);

    // Category preference boost
    if (preferences.categoryPercentages?.[category]) {
      confidence += preferences.categoryPercentages[category] * 0.3;
    }

    // Price preference alignment
    if (preferences.averagePrice > 0) {
      const priceRatio = Math.min(price / preferences.averagePrice, 2);
      const priceScore = 1 - Math.abs(1 - priceRatio);
      confidence += priceScore * 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  // Generate reasoning for recommendation
  private generateReasoning(product: ShopProduct, preferences: any): string {
    const category = getProductCategory(product);
    const reasons: string[] = [];

    if (preferences.categoryPercentages?.[category] > 0.3) {
      reasons.push(`You frequently browse ${category} items`);
    }

    if (preferences.averagePrice > 0) {
      const price = getProductPrice(product);
      if (Math.abs(price - preferences.averagePrice) < preferences.averagePrice * 0.3) {
        reasons.push('Price matches your typical range');
      }
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Based on your browsing patterns';
  }

  // Determine recommendation source
  private determineSource(product: ShopProduct, preferences: any): 'behavior' | 'trending' | 'seasonal' | 'collaborative' {
    // This could be enhanced with more sophisticated logic
    return 'behavior';
  }

  // Automatic inventory rotation
  public async rotateInventory(): Promise<InventoryRotation[]> {
    try {
      const rotations: InventoryRotation[] = [];
      
      // Get performance metrics for products
      const { data: metrics } = await supabase
        .from('product_interactions')
        .select('product_id, interaction_type')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (metrics) {
        // Analyze performance and suggest rotations
        const productPerformance = this.analyzeProductPerformance(metrics);
        
        // Identify bottom 20% performers for rotation
        const sortedProducts = Object.entries(productPerformance)
          .sort(([,a], [,b]) => a.score - b.score);
        
        const bottomPerformers = sortedProducts.slice(0, Math.floor(sortedProducts.length * 0.2));
        
        bottomPerformers.forEach(([productId, performance]) => {
          rotations.push({
            productId,
            action: 'remove',
            reason: `Low engagement: ${performance.score.toFixed(2)} score`,
            confidence: 0.8
          });
        });
      }

      return rotations;
    } catch (error) {
      console.error('Error in inventory rotation:', error);
      return [];
    }
  }

  // Get learning metrics
  public async getLearningMetrics(): Promise<AdaptiveLearningMetrics> {
    try {
      // This would typically fetch from analytics tables
      return {
        userEngagement: 0.75,
        conversionRate: 0.12,
        averageSessionTime: 180,
        preferenceAccuracy: 0.68,
        inventoryTurnover: 0.85
      };
    } catch (error) {
      console.error('Error getting learning metrics:', error);
      return {
        userEngagement: 0,
        conversionRate: 0,
        averageSessionTime: 0,
        preferenceAccuracy: 0,
        inventoryTurnover: 0
      };
    }
  }

  // Helper methods
  private calculateDigitalPurchaseRatio(): number {
    // This would calculate from actual purchase data
    return 0.6; // Placeholder
  }

  private getSeasonalAdjustments(date: Date): SeasonalAdjustment[] {
    const month = date.getMonth();
    const adjustments: SeasonalAdjustment[] = [];

    // Summer adjustments (June-August)
    if (month >= 5 && month <= 7) {
      adjustments.push({
        category: 'outdoor',
        multiplier: 1.5,
        seasonStart: new Date(date.getFullYear(), 5, 1),
        seasonEnd: new Date(date.getFullYear(), 7, 31)
      });
    }

    return adjustments;
  }

  private async getTrendingItems(): Promise<TrendingItem[]> {
    // This would fetch from trending analysis
    return [];
  }

  private analyzeProductPerformance(metrics: any[]): Record<string, { score: number; views: number; interactions: number }> {
    const performance: Record<string, { score: number; views: number; interactions: number }> = {};

    metrics.forEach(metric => {
      if (!performance[metric.product_id]) {
        performance[metric.product_id] = { score: 0, views: 0, interactions: 0 };
      }

      if (metric.interaction_type === 'view') {
        performance[metric.product_id].views++;
      } else {
        performance[metric.product_id].interactions++;
      }
    });

    // Calculate scores
    Object.keys(performance).forEach(productId => {
      const data = performance[productId];
      data.score = data.views * 0.1 + data.interactions * 0.9;
    });

    return performance;
  }

  // Public API methods
  public async trackProductView(productId: string, behaviorHook: ReturnType<typeof useShoppingBehavior>) {
    if (this.analytics && behaviorHook) {
      behaviorHook.trackProductView(productId, 'digital'); // Default type
    }
  }

  public setLearningEnabled(enabled: boolean) {
    this.learningEnabled = enabled;
  }

  public addPersonalizationRule(rule: PersonalizationRule) {
    this.personalizationRules.push(rule);
  }

  public updatePersonalizationRule(ruleId: string, updates: Partial<PersonalizationRule>) {
    const index = this.personalizationRules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.personalizationRules[index] = { ...this.personalizationRules[index], ...updates };
    }
  }
}

// Export singleton instance
export const adaptiveShopEngine = new AdaptiveShopEngine();
