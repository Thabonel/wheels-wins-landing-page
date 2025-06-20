import { ShopProduct } from '@/components/shop/types';
import { usePersonalizedRecommendations } from '@/hooks/usePersonalizedRecommendations';
import { useShoppingBehavior } from '@/hooks/useShoppingBehavior';

// Core types for the adaptive engine
export interface AdaptiveShopConfig {
  learningRate: number;
  confidenceThreshold: number;
  inventoryRotationThreshold: number;
  seasonalWeight: number;
  trendingWeight: number;
  personalWeight: number;
}

export interface PersonalizationRule {
  id: string;
  condition: (behavior: ShoppingBehaviorData) => boolean;
  action: (products: ShopProduct[]) => ShopProduct[];
  weight: number;
  description: string;
}

export interface InventoryPerformance {
  productId: string;
  viewRate: number;
  conversionRate: number;
  revenueGenerated: number;
  trendScore: number;
  performanceScore: number;
  lastUpdated: Date;
}

// Fixed interface - directly define the structure instead of extending
export interface RecommendationWithConfidence {
  id: string;
  productId: string;
  recommendationType: 'general' | 'trending' | 'seasonal' | 'bundle' | 'pam_pick';
  confidenceScore: number;
  context: Record<string, any>;
  reasoning: string;
  product?: ShopProduct;
}

export interface ShoppingBehaviorData {
  productViews: Array<{
    productId: string;
    viewCount: number;
    lastViewed: Date;
    category: string;
    price?: number;
  }>;
  categoryBrowsing: Array<{
    category: string;
    browseTime: number;
    frequency: number;
  }>;
  pricePreferences: Array<{
    category: string;
    minPrice: number;
    maxPrice: number;
    avgPurchasePrice: number;
  }>;
  purchasePatterns: Array<{
    productId: string;
    purchaseDate: Date;
    price: number;
    category: string;
  }>;
  clickThroughRates: Array<{
    productType: 'digital' | 'affiliate';
    category: string;
    ctr: number;
  }>;
  seasonalPreferences: Array<{
    season: string;
    categoryWeights: Record<string, number>;
  }>;
  conversionMetrics: {
    viewToCartRate: number;
    cartToPurchaseRate: number;
    avgSessionDuration: number;
    bounceRate: number;
  };
}

export interface AdaptationMetrics {
  accuracyScore: number;
  userSatisfactionScore: number;
  conversionImpact: number;
  revenueImpact: number;
  learningProgress: number;
}

export class AdaptiveShopEngine {
  private config: AdaptiveShopConfig;
  private personalizationRules: PersonalizationRule[];
  private performanceData: Map<string, InventoryPerformance>;
  private adaptationHistory: Array<{
    timestamp: Date;
    action: string;
    reasoning: string;
    impact: number;
  }>;

  constructor(config: Partial<AdaptiveShopConfig> = {}) {
    this.config = {
      learningRate: 0.1,
      confidenceThreshold: 0.7,
      inventoryRotationThreshold: 0.2,
      seasonalWeight: 0.3,
      trendingWeight: 0.4,
      personalWeight: 0.5,
      ...config
    };

    this.personalizationRules = this.initializePersonalizationRules();
    this.performanceData = new Map();
    this.adaptationHistory = [];
  }

  private initializePersonalizationRules(): PersonalizationRule[] {
    return [
      {
        id: 'outdoor-enthusiast',
        condition: (behavior) => {
          const outdoorViews = behavior.categoryBrowsing
            .filter(cat => cat.category.includes('outdoor') || cat.category.includes('camping'))
            .reduce((sum, cat) => sum + cat.frequency, 0);
          const totalViews = behavior.categoryBrowsing.reduce((sum, cat) => sum + cat.frequency, 0);
          return totalViews > 0 && (outdoorViews / totalViews) > 0.6;
        },
        action: (products) => {
          const outdoorProducts = products.filter(p => 
            p.category?.toLowerCase().includes('outdoor') || 
            p.category?.toLowerCase().includes('camping') ||
            p.tags?.some(tag => ['outdoor', 'camping', 'hiking'].includes(tag.toLowerCase()))
          );
          const otherProducts = products.filter(p => !outdoorProducts.includes(p));
          return [...outdoorProducts, ...otherProducts.slice(0, Math.max(3, products.length - outdoorProducts.length))];
        },
        weight: 0.8,
        description: 'User shows strong preference for outdoor/camping products'
      },
      {
        id: 'budget-conscious',
        condition: (behavior) => {
          const avgPrice = behavior.pricePreferences.reduce((sum, pref) => sum + pref.avgPurchasePrice, 0) / 
                          Math.max(1, behavior.pricePreferences.length);
          return avgPrice < 100; // Budget threshold
        },
        action: (products) => {
          return products.sort((a, b) => {
            const priceA = 'price' in a ? a.price : 0;
            const priceB = 'price' in b ? b.price : 0;
            return priceA - priceB;
          });
        },
        weight: 0.6,
        description: 'User prefers budget-friendly options'
      },
      {
        id: 'premium-buyer',
        condition: (behavior) => {
          const avgPrice = behavior.pricePreferences.reduce((sum, pref) => sum + pref.avgPurchasePrice, 0) / 
                          Math.max(1, behavior.pricePreferences.length);
          return avgPrice > 500; // Premium threshold
        },
        action: (products) => {
          return products.sort((a, b) => {
            const priceA = 'price' in a ? a.price : 0;
            const priceB = 'price' in b ? b.price : 0;
            return priceB - priceA;
          });
        },
        weight: 0.7,
        description: 'User tends to purchase premium products'
      }
    ];
  }

  // Main adaptation method
  public async adaptInventory(
    currentProducts: ShopProduct[], 
    behaviorData: ShoppingBehaviorData,
    seasonalContext?: string
  ): Promise<{
    adaptedProducts: ShopProduct[];
    recommendations: RecommendationWithConfidence[];
    metrics: AdaptationMetrics;
    reasoning: string[];
  }> {
    const reasoning: string[] = [];
    
    // Apply personalization rules
    let adaptedProducts = [...currentProducts];
    const applicableRules = this.personalizationRules.filter(rule => rule.condition(behaviorData));
    
    for (const rule of applicableRules) {
      adaptedProducts = rule.action(adaptedProducts);
      reasoning.push(`Applied rule: ${rule.description}`);
    }

    // Generate recommendations with confidence scores
    const recommendations = this.generateRecommendations(adaptedProducts, behaviorData);
    
    // Calculate performance metrics
    const metrics = this.calculateAdaptationMetrics(behaviorData, recommendations);

    // Update performance data
    this.updatePerformanceData(adaptedProducts, behaviorData);

    // Check for inventory rotation needs
    const rotationNeeded = this.checkInventoryRotation();
    if (rotationNeeded.length > 0) {
      reasoning.push(`Recommended rotating ${rotationNeeded.length} underperforming products`);
    }

    // Log adaptation
    this.logAdaptation('inventory_adaptation', reasoning.join('; '), metrics.accuracyScore);

    return {
      adaptedProducts,
      recommendations,
      metrics,
      reasoning
    };
  }

  private generateRecommendations(
    products: ShopProduct[], 
    behaviorData: ShoppingBehaviorData
  ): RecommendationWithConfidence[] {
    const recommendations: RecommendationWithConfidence[] = [];

    // Generate trending recommendations
    const trendingProducts = this.identifyTrendingProducts(products, behaviorData);
    trendingProducts.forEach((product, index) => {
      recommendations.push({
        id: `trending-${product.id}`,
        productId: product.id,
        recommendationType: 'trending',
        confidenceScore: Math.max(0.6, 0.9 - (index * 0.1)),
        context: { trend_score: this.calculateTrendScore(product, behaviorData) },
        reasoning: 'Popular among users with similar preferences',
        product
      });
    });

    // Generate personalized recommendations
    const personalizedProducts = this.getPersonalizedProducts(products, behaviorData);
    personalizedProducts.forEach((product, index) => {
      recommendations.push({
        id: `personalized-${product.id}`,
        productId: product.id,
        recommendationType: 'pam_pick',
        confidenceScore: this.calculatePersonalizationConfidence(product, behaviorData),
        context: { personalization_factors: this.getPersonalizationFactors(product, behaviorData) },
        reasoning: this.generatePersonalizationReasoning(product, behaviorData),
        product
      });
    });

    // Sort by confidence score
    return recommendations.sort((a, b) => b.confidenceScore - a.confidenceScore).slice(0, 9);
  }

  private identifyTrendingProducts(products: ShopProduct[], behaviorData: ShoppingBehaviorData): ShopProduct[] {
    return products
      .map(product => ({
        product,
        trendScore: this.calculateTrendScore(product, behaviorData)
      }))
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, 3)
      .map(item => item.product);
  }

  private calculateTrendScore(product: ShopProduct, behaviorData: ShoppingBehaviorData): number {
    const categoryViews = behaviorData.categoryBrowsing.find(cat => 
      cat.category.toLowerCase() === product.category?.toLowerCase()
    );
    
    const viewFrequency = categoryViews?.frequency || 0;
    const recentViews = behaviorData.productViews.filter(view => 
      view.productId === product.id && 
      new Date(view.lastViewed).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000)
    ).length;

    return (viewFrequency * 0.6) + (recentViews * 0.4);
  }

  private getPersonalizedProducts(products: ShopProduct[], behaviorData: ShoppingBehaviorData): ShopProduct[] {
    const scoredProducts = products.map(product => ({
      product,
      personalScore: this.calculatePersonalizationScore(product, behaviorData)
    }));

    return scoredProducts
      .sort((a, b) => b.personalScore - a.personalScore)
      .slice(0, 6)
      .map(item => item.product);
  }

  private calculatePersonalizationScore(product: ShopProduct, behaviorData: ShoppingBehaviorData): number {
    let score = 0;

    // Category preference
    const categoryBrowsing = behaviorData.categoryBrowsing.find(cat => 
      cat.category.toLowerCase() === product.category?.toLowerCase()
    );
    if (categoryBrowsing) {
      score += categoryBrowsing.frequency * 0.4;
    }

    // Price preference
    const pricePreference = behaviorData.pricePreferences.find(pref => 
      pref.category.toLowerCase() === product.category?.toLowerCase()
    );
    if (pricePreference && 'price' in product) {
      const priceScore = 1 - Math.abs(product.price - pricePreference.avgPurchasePrice) / pricePreference.avgPurchasePrice;
      score += Math.max(0, priceScore) * 0.3;
    }

    // View history
    const viewHistory = behaviorData.productViews.find(view => view.productId === product.id);
    if (viewHistory) {
      score += Math.min(viewHistory.viewCount * 0.1, 0.3);
    }

    return score;
  }

  private calculatePersonalizationConfidence(product: ShopProduct, behaviorData: ShoppingBehaviorData): number {
    const baseScore = this.calculatePersonalizationScore(product, behaviorData);
    const dataRichness = this.calculateDataRichness(behaviorData);
    
    return Math.min(0.95, baseScore * dataRichness);
  }

  private calculateDataRichness(behaviorData: ShoppingBehaviorData): number {
    const factors = [
      behaviorData.productViews.length / 50, // Normalize view count
      behaviorData.categoryBrowsing.length / 10, // Category diversity
      behaviorData.purchasePatterns.length / 20, // Purchase history
      Math.min(1, behaviorData.conversionMetrics.avgSessionDuration / 300) // Session quality
    ];

    return factors.reduce((sum, factor) => sum + Math.min(1, factor), 0) / factors.length;
  }

  private getPersonalizationFactors(product: ShopProduct, behaviorData: ShoppingBehaviorData): Record<string, any> {
    return {
      category_affinity: this.getCategoryAffinity(product.category, behaviorData),
      price_match: this.getPriceMatch(product, behaviorData),
      view_history: this.getViewHistory(product.id, behaviorData),
      seasonal_relevance: this.getSeasonalRelevance(product, behaviorData)
    };
  }

  private getCategoryAffinity(category: string | undefined, behaviorData: ShoppingBehaviorData): number {
    if (!category) return 0;
    
    const categoryData = behaviorData.categoryBrowsing.find(cat => 
      cat.category.toLowerCase() === category.toLowerCase()
    );
    
    const totalBrowsing = behaviorData.categoryBrowsing.reduce((sum, cat) => sum + cat.frequency, 0);
    return totalBrowsing > 0 ? (categoryData?.frequency || 0) / totalBrowsing : 0;
  }

  private getPriceMatch(product: ShopProduct, behaviorData: ShoppingBehaviorData): number {
    if (!('price' in product) || !product.category) return 0;
    
    const pricePreference = behaviorData.pricePreferences.find(pref => 
      pref.category.toLowerCase() === product.category.toLowerCase()
    );
    
    if (!pricePreference) return 0;
    
    const deviation = Math.abs(product.price - pricePreference.avgPurchasePrice) / pricePreference.avgPurchasePrice;
    return Math.max(0, 1 - deviation);
  }

  private getViewHistory(productId: string, behaviorData: ShoppingBehaviorData): number {
    const viewData = behaviorData.productViews.find(view => view.productId === productId);
    return viewData ? Math.min(1, viewData.viewCount / 10) : 0;
  }

  private getSeasonalRelevance(product: ShopProduct, behaviorData: ShoppingBehaviorData): number {
    const currentSeason = this.getCurrentSeason();
    const seasonalData = behaviorData.seasonalPreferences.find(pref => pref.season === currentSeason);
    
    if (!seasonalData || !product.category) return 0;
    
    return seasonalData.categoryWeights[product.category.toLowerCase()] || 0;
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  private generatePersonalizationReasoning(product: ShopProduct, behaviorData: ShoppingBehaviorData): string {
    const factors: string[] = [];
    
    const categoryAffinity = this.getCategoryAffinity(product.category, behaviorData);
    if (categoryAffinity > 0.3) {
      factors.push(`you frequently browse ${product.category} products`);
    }
    
    const priceMatch = this.getPriceMatch(product, behaviorData);
    if (priceMatch > 0.7) {
      factors.push('it matches your price preferences');
    }
    
    const viewHistory = this.getViewHistory(product.id, behaviorData);
    if (viewHistory > 0) {
      factors.push('you previously viewed similar items');
    }
    
    return factors.length > 0 
      ? `Recommended because ${factors.join(' and ')}`
      : 'Recommended based on your overall preferences';
  }

  private calculateAdaptationMetrics(
    behaviorData: ShoppingBehaviorData,
    recommendations: RecommendationWithConfidence[]
  ): AdaptationMetrics {
    const avgConfidence = recommendations.reduce((sum, rec) => sum + rec.confidenceScore, 0) / 
                         Math.max(1, recommendations.length);
    
    const dataQuality = this.calculateDataRichness(behaviorData);
    const conversionPotential = this.estimateConversionPotential(recommendations, behaviorData);
    
    return {
      accuracyScore: avgConfidence,
      userSatisfactionScore: dataQuality * avgConfidence,
      conversionImpact: conversionPotential,
      revenueImpact: this.estimateRevenueImpact(recommendations),
      learningProgress: dataQuality
    };
  }

  private estimateConversionPotential(
    recommendations: RecommendationWithConfidence[],
    behaviorData: ShoppingBehaviorData
  ): number {
    const baseConversion = behaviorData.conversionMetrics.viewToCartRate;
    const recommendationBoost = recommendations.reduce((sum, rec) => sum + rec.confidenceScore, 0) / 
                               Math.max(1, recommendations.length);
    
    return Math.min(1, baseConversion * (1 + recommendationBoost));
  }

  private estimateRevenueImpact(recommendations: RecommendationWithConfidence[]): number {
    return recommendations.reduce((sum, rec) => {
      const product = rec.product;
      if (product && 'price' in product) {
        return sum + (product.price * rec.confidenceScore);
      }
      return sum;
    }, 0);
  }

  private updatePerformanceData(products: ShopProduct[], behaviorData: ShoppingBehaviorData): void {
    products.forEach(product => {
      const views = behaviorData.productViews.find(view => view.productId === product.id);
      const purchases = behaviorData.purchasePatterns.filter(purchase => purchase.productId === product.id);
      
      const viewCount = views?.viewCount || 0;
      const purchaseCount = purchases.length;
      const conversionRate = viewCount > 0 ? purchaseCount / viewCount : 0;
      const revenue = purchases.reduce((sum, purchase) => sum + purchase.price, 0);
      
      this.performanceData.set(product.id, {
        productId: product.id,
        viewRate: viewCount,
        conversionRate,
        revenueGenerated: revenue,
        trendScore: this.calculateTrendScore(product, behaviorData),
        performanceScore: (conversionRate * 0.6) + (revenue / 1000 * 0.4),
        lastUpdated: new Date()
      });
    });
  }

  private checkInventoryRotation(): string[] {
    const underperformingProducts: string[] = [];
    
    this.performanceData.forEach((performance, productId) => {
      if (performance.performanceScore < this.config.inventoryRotationThreshold) {
        underperformingProducts.push(productId);
      }
    });
    
    return underperformingProducts;
  }

  private logAdaptation(action: string, reasoning: string, impact: number): void {
    this.adaptationHistory.push({
      timestamp: new Date(),
      action,
      reasoning,
      impact
    });
    
    // Keep only last 100 entries
    if (this.adaptationHistory.length > 100) {
      this.adaptationHistory = this.adaptationHistory.slice(-100);
    }
  }

  // Public API methods
  public getPersonalizationRules(): PersonalizationRule[] {
    return [...this.personalizationRules];
  }

  public addPersonalizationRule(rule: PersonalizationRule): void {
    this.personalizationRules.push(rule);
  }

  public getPerformanceData(): Map<string, InventoryPerformance> {
    return new Map(this.performanceData);
  }

  public getAdaptationHistory(): Array<{
    timestamp: Date;
    action: string;
    reasoning: string;
    impact: number;
  }> {
    return [...this.adaptationHistory];
  }

  public updateConfig(newConfig: Partial<AdaptiveShopConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): AdaptiveShopConfig {
    return { ...this.config };
  }

  // Real-time adaptation API
  public async handleRealTimeEvent(event: {
    type: 'product_view' | 'product_purchase' | 'cart_add' | 'category_browse';
    productId?: string;
    category?: string;
    price?: number;
    userId: string;
  }): Promise<void> {
    // This would integrate with the shopping behavior hook to track real-time events
    console.log('Real-time event processed:', event);
    
    // Update internal metrics based on the event
    // This is a placeholder for real-time processing logic
  }
}

// Hook integration for React components
export function useAdaptiveShopEngine(config?: Partial<AdaptiveShopConfig>) {
  const engine = new AdaptiveShopEngine(config);
  const { personalizedProducts, recommendations, generateRecommendations } = usePersonalizedRecommendations();
  const behaviorHook = useShoppingBehavior();

  const adaptShop = async (products: ShopProduct[]) => {
    if (!behaviorHook.behaviorData) {
      return {
        adaptedProducts: products,
        recommendations: [],
        metrics: {
          accuracyScore: 0,
          userSatisfactionScore: 0,
          conversionImpact: 0,
          revenueImpact: 0,
          learningProgress: 0
        },
        reasoning: ['No behavior data available']
      };
    }

    return engine.adaptInventory(products, behaviorHook.behaviorData);
  };

  const trackRealTimeEvent = async (event: {
    type: 'product_view' | 'product_purchase' | 'cart_add' | 'category_browse';
    productId?: string;
    category?: string;
    price?: number;
    userId: string;
  }) => {
    await engine.handleRealTimeEvent(event);
    
    // Use the behavior hook's tracking methods
    if (event.type === 'product_view' && event.productId && event.category) {
      behaviorHook.trackProductView(
        event.productId, 
        'digital', // This would need to be determined from the product
        event.price, 
        event.category
      );
    }
  };

  return {
    adaptShop,
    trackRealTimeEvent,
    engine,
    behaviorData: behaviorHook.behaviorData,
    isLoading: behaviorHook.isLoading
  };
}
