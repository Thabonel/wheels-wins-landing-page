
import { ShopProduct, isDigitalProduct, isAffiliateProduct } from '@/components/shop/types';
import { useShoppingBehavior } from '@/hooks/useShoppingBehavior';
import { usePersonalizedRecommendations } from '@/hooks/usePersonalizedRecommendations';

// Import the actual type from useShoppingBehavior hook
export type { ShoppingBehaviorData, ProductView } from '@/hooks/useShoppingBehavior';

export interface ProductPerformanceMetrics {
  id: string;
  viewCount: number;
  purchaseCount: number;
  revenue: number;
  conversionRate: number;
  lastInteraction: Date;
  trendingScore: number;
}

export interface PersonalizationRule {
  id: string;
  condition: (behaviorData: any) => boolean;
  action: 'boost' | 'filter' | 'categorize';
  weight: number;
  category?: string;
}

export interface InventoryRotation {
  id: string;
  productId: string;
  reason: 'low_performance' | 'seasonal' | 'trending' | 'user_preference';
  scheduledDate: Date;
  confidence: number;
}

export interface RecommendationWithConfidence {
  id: string;
  product: ShopProduct;
  confidence: number;
  reason: string;
  category: string;
}

export interface SeasonalAdjustment {
  month: number;
  categoryBoosts: Record<string, number>;
  productBoosts: Record<string, number>;
}

export interface AdaptationMetrics {
  totalAdaptations: number;
  successRate: number;
  averageConfidence: number;
  userSatisfactionScore: number;
  revenueImpact: number;
}

// Helper function to extract category from product
function getProductCategory(product: ShopProduct): string {
  if (isDigitalProduct(product)) {
    return product.type || 'Digital';
  }
  
  // For affiliate products, infer category from title or description
  const title = product.title.toLowerCase();
  if (title.includes('travel') || title.includes('booking')) return 'Travel';
  if (title.includes('outdoor') || title.includes('camping')) return 'Outdoor';
  if (title.includes('tech') || title.includes('gadget')) return 'Technology';
  if (title.includes('book') || title.includes('guide')) return 'Education';
  
  return 'General';
}

// Helper function to get product tags
function getProductTags(product: ShopProduct): string[] {
  const tags: string[] = [];
  
  if (isDigitalProduct(product)) {
    tags.push('digital');
    if (product.isNew) tags.push('new');
    if (product.hasBonus) tags.push('bonus');
  }
  
  if (isAffiliateProduct(product)) {
    tags.push('affiliate');
    if (product.isPamRecommended) tags.push('pam-recommended');
  }
  
  // Add category-based tags
  const category = getProductCategory(product);
  tags.push(category.toLowerCase());
  
  return tags;
}

// Helper function to get product price
function getProductPrice(product: ShopProduct): number | undefined {
  if (isDigitalProduct(product)) {
    return product.price;
  }
  return undefined;
}

class AdaptiveShopEngine {
  private performanceMetrics: Map<string, ProductPerformanceMetrics> = new Map();
  private personalizationRules: PersonalizationRule[] = [];
  private rotationQueue: InventoryRotation[] = [];
  private seasonalAdjustments: SeasonalAdjustment[] = [];
  private adaptationHistory: AdaptationMetrics[] = [];

  constructor() {
    this.initializeDefaultRules();
    this.initializeSeasonalAdjustments();
  }

  private initializeDefaultRules() {
    this.personalizationRules = [
      {
        id: 'outdoor-enthusiast',
        condition: (behaviorData) => {
          const outdoorViews = behaviorData.categoryBrowsing
            .filter((cat: any) => cat.category === 'Outdoor')
            .reduce((sum: number, cat: any) => sum + cat.viewCount, 0);
          return outdoorViews > behaviorData.productViews.length * 0.6;
        },
        action: 'boost',
        weight: 1.5,
        category: 'Outdoor'
      },
      {
        id: 'digital-learner',
        condition: (behaviorData) => {
          const digitalViews = behaviorData.categoryBrowsing
            .filter((cat: any) => cat.category === 'Digital')
            .reduce((sum: number, cat: any) => sum + cat.viewCount, 0);
          return digitalViews > behaviorData.productViews.length * 0.4;
        },
        action: 'boost',
        weight: 1.3,
        category: 'Digital'
      }
    ];
  }

  private initializeSeasonalAdjustments() {
    this.seasonalAdjustments = [
      {
        month: 6, // June
        categoryBoosts: { 'Outdoor': 1.4, 'Travel': 1.3 },
        productBoosts: {}
      },
      {
        month: 12, // December
        categoryBoosts: { 'Education': 1.2, 'Digital': 1.1 },
        productBoosts: {}
      }
    ];
  }

  async updatePerformanceMetrics(
    products: ShopProduct[],
    behaviorData: any
  ): Promise<void> {
    for (const product of products) {
      const views = behaviorData.productViews.filter(
        (view: any) => view.productId === product.id
      ).length;

      const purchases = behaviorData.purchasePatterns.filter(
        (purchase: any) => purchase.productId === product.id
      ).length;

      const revenue = purchases * (getProductPrice(product) || 0);
      const conversionRate = views > 0 ? purchases / views : 0;

      const metrics: ProductPerformanceMetrics = {
        id: product.id,
        viewCount: views,
        purchaseCount: purchases,
        revenue,
        conversionRate,
        lastInteraction: new Date(),
        trendingScore: this.calculateTrendingScore(product, behaviorData)
      };

      this.performanceMetrics.set(product.id, metrics);
    }
  }

  private calculateTrendingScore(product: ShopProduct, behaviorData: any): number {
    const recentViews = behaviorData.productViews.filter(
      (view: any) => 
        view.productId === product.id &&
        new Date(view.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    const category = getProductCategory(product);
    const categoryViews = behaviorData.categoryBrowsing
      .filter((cat: any) => cat.category === category)
      .reduce((sum: number, cat: any) => sum + cat.viewCount, 0);

    return (recentViews * 0.7) + (categoryViews * 0.3);
  }

  applyPersonalizationRules(
    products: ShopProduct[],
    behaviorData: any
  ): ShopProduct[] {
    const scoredProducts = products.map(product => {
      let score = 1.0;
      const category = getProductCategory(product);

      // Apply personalization rules
      for (const rule of this.personalizationRules) {
        if (rule.condition(behaviorData) && rule.category === category) {
          if (rule.action === 'boost') {
            score *= rule.weight;
          }
        }
      }

      // Apply seasonal adjustments
      const currentMonth = new Date().getMonth() + 1;
      const seasonalAdjustment = this.seasonalAdjustments.find(
        adj => adj.month === currentMonth
      );

      if (seasonalAdjustment) {
        const categoryBoost = seasonalAdjustment.categoryBoosts[category] || 1.0;
        const productBoost = seasonalAdjustment.productBoosts[product.id] || 1.0;
        score *= categoryBoost * productBoost;
      }

      return { product, score };
    });

    // Sort by score and return products
    return scoredProducts
      .sort((a, b) => b.score - a.score)
      .map(item => item.product);
  }

  generateRecommendations(
    products: ShopProduct[],
    behaviorData: any,
    count: number = 6
  ): RecommendationWithConfidence[] {
    const personalizedProducts = this.applyPersonalizationRules(products, behaviorData);
    
    return personalizedProducts.slice(0, count).map((product, index) => {
      const metrics = this.performanceMetrics.get(product.id);
      const confidence = this.calculateConfidenceScore(product, behaviorData, metrics);
      
      return {
        id: `rec-${product.id}-${Date.now()}`,
        product,
        confidence,
        reason: this.generateRecommendationReason(product, behaviorData),
        category: getProductCategory(product)
      };
    });
  }

  private calculateConfidenceScore(
    product: ShopProduct,
    behaviorData: any,
    metrics?: ProductPerformanceMetrics
  ): number {
    let confidence = 0.5; // Base confidence

    // Factor in user behavior alignment
    const category = getProductCategory(product);
    const categoryViews = behaviorData.categoryBrowsing
      .filter((cat: any) => cat.category === category)
      .reduce((sum: number, cat: any) => sum + cat.viewCount, 0);

    if (categoryViews > 0) {
      confidence += 0.3;
    }

    // Factor in product performance
    if (metrics) {
      if (metrics.conversionRate > 0.05) confidence += 0.2;
      if (metrics.trendingScore > 5) confidence += 0.1;
    }

    // Factor in Pam's recommendation
    if (isAffiliateProduct(product) && product.isPamRecommended) {
      confidence += 0.15;
    }

    return Math.min(confidence, 1.0);
  }

  private generateRecommendationReason(
    product: ShopProduct,
    behaviorData: any
  ): string {
    const category = getProductCategory(product);
    const categoryViews = behaviorData.categoryBrowsing
      .filter((cat: any) => cat.category === category)
      .reduce((sum: number, cat: any) => sum + cat.viewCount, 0);

    if (categoryViews > behaviorData.productViews.length * 0.4) {
      return `Based on your interest in ${category.toLowerCase()} products`;
    }

    if (isAffiliateProduct(product) && product.isPamRecommended) {
      return "Pam's personal recommendation for travelers like you";
    }

    const metrics = this.performanceMetrics.get(product.id);
    if (metrics && metrics.trendingScore > 5) {
      return 'Trending with other mature travelers';
    }

    return 'Curated for your travel lifestyle';
  }

  scheduleInventoryRotation(): InventoryRotation[] {
    const rotations: InventoryRotation[] = [];
    const now = new Date();

    // Find low-performing products
    this.performanceMetrics.forEach((metrics, productId) => {
      if (metrics.conversionRate < 0.01 && metrics.viewCount > 10) {
        rotations.push({
          id: `rotation-${productId}-${now.getTime()}`,
          productId,
          reason: 'low_performance',
          scheduledDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          confidence: 0.8
        });
      }
    });

    this.rotationQueue = rotations;
    return rotations;
  }

  getAdaptationMetrics(): AdaptationMetrics {
    const recent = this.adaptationHistory.slice(-10);
    
    return {
      totalAdaptations: this.adaptationHistory.length,
      successRate: recent.length > 0 
        ? recent.reduce((sum, metric) => sum + metric.successRate, 0) / recent.length 
        : 0,
      averageConfidence: 0.75,
      userSatisfactionScore: 0.85,
      revenueImpact: recent.length > 0
        ? recent.reduce((sum, metric) => sum + metric.revenueImpact, 0) / recent.length
        : 0
    };
  }

  async processRealTimeUpdate(
    event: 'view' | 'purchase' | 'favorite',
    productId: string,
    context: any
  ): Promise<void> {
    const metrics = this.performanceMetrics.get(productId) || {
      id: productId,
      viewCount: 0,
      purchaseCount: 0,
      revenue: 0,
      conversionRate: 0,
      lastInteraction: new Date(),
      trendingScore: 0
    };

    switch (event) {
      case 'view':
        metrics.viewCount++;
        metrics.trendingScore += 0.1;
        break;
      case 'purchase':
        metrics.purchaseCount++;
        metrics.revenue += context.price || 0;
        metrics.trendingScore += 1.0;
        break;
      case 'favorite':
        metrics.trendingScore += 0.5;
        break;
    }

    metrics.conversionRate = metrics.viewCount > 0 
      ? metrics.purchaseCount / metrics.viewCount 
      : 0;
    metrics.lastInteraction = new Date();

    this.performanceMetrics.set(productId, metrics);
  }

  exportAnalytics() {
    return {
      performanceMetrics: Array.from(this.performanceMetrics.entries()),
      personalizationRules: this.personalizationRules,
      rotationQueue: this.rotationQueue,
      adaptationMetrics: this.getAdaptationMetrics(),
      seasonalAdjustments: this.seasonalAdjustments
    };
  }
}

// Singleton instance
const adaptiveShopEngine = new AdaptiveShopEngine();

// Hook for using the adaptive shop engine
export function useAdaptiveShop() {
  const { 
    behaviorData, 
    isLoading, 
    trackProductView,
    trackPurchase,
    trackFavorite 
  } = useShoppingBehavior();
  
  const { 
    personalizedProducts, 
    generateRecommendations: generatePersonalizedRecommendations 
  } = usePersonalizedRecommendations();

  const adaptProducts = async (products: ShopProduct[]) => {
    if (!behaviorData || isLoading) return products;

    await adaptiveShopEngine.updatePerformanceMetrics(products, behaviorData);
    return adaptiveShopEngine.applyPersonalizationRules(products, behaviorData);
  };

  const getRecommendations = (products: ShopProduct[], count: number = 6) => {
    if (!behaviorData || isLoading) return [];
    return adaptiveShopEngine.generateRecommendations(products, behaviorData, count);
  };

  const handleRealTimeEvent = async (
    event: 'view' | 'purchase' | 'favorite',
    productId: string,
    context: any = {}
  ) => {
    // Track in behavior system
    switch (event) {
      case 'view':
        trackProductView(productId, context.productType, context.price, context.category);
        break;
      case 'purchase':
        trackPurchase(productId, context.price);
        break;
      case 'favorite':
        trackFavorite(productId);
        break;
    }

    // Update adaptive engine
    await adaptiveShopEngine.processRealTimeUpdate(event, productId, context);
  };

  const getAnalytics = () => adaptiveShopEngine.exportAnalytics();
  
  const scheduleRotation = () => adaptiveShopEngine.scheduleInventoryRotation();

  return {
    adaptProducts,
    getRecommendations,
    handleRealTimeEvent,
    getAnalytics,
    scheduleRotation,
    isLoading,
    behaviorData,
    personalizedProducts
  };
}

export default adaptiveShopEngine;
