
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase';
import { useShoppingBehavior } from '@/hooks/useShoppingBehavior';
import { useAuth } from '@/context/AuthContext';
import { ShopProduct } from '@/components/shop/types';

export interface PersonalizationRule {
  id: string;
  condition: string;
  action: string;
  threshold: number;
  priority: number;
  category: string;
  isActive: boolean;
}

export interface InventoryRotationSuggestion {
  productId: string;
  action: 'remove' | 'add' | 'promote' | 'demote';
  reason: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  seasonalFactor: boolean;
}

export interface AdaptationMetrics {
  learningProgress: number;
  adaptationAccuracy: number;
  userSatisfactionScore: number;
  conversionImprovement: number;
  revenueImpact: number;
}

export interface RecommendationWithConfidence extends ShopProduct {
  confidence: number;
  reason: string;
  adaptationSource: 'behavior' | 'seasonal' | 'trending' | 'collaborative';
}

class AdaptiveShopEngine {
  private behaviorData: any = null;
  private personalizationRules: PersonalizationRule[] = [];
  private adaptationMetrics: AdaptationMetrics = {
    learningProgress: 0,
    adaptationAccuracy: 0,
    userSatisfactionScore: 0,
    conversionImprovement: 0,
    revenueImpact: 0
  };

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules() {
    this.personalizationRules = [
      {
        id: 'outdoor-gear-preference',
        condition: 'outdoor_gear_views_percentage > 60',
        action: 'increase_outdoor_products',
        threshold: 0.6,
        priority: 1,
        category: 'outdoor',
        isActive: true
      },
      {
        id: 'budget-conscious',
        condition: 'average_price_range < 50',
        action: 'promote_budget_items',
        threshold: 50,
        priority: 2,
        category: 'price',
        isActive: true
      },
      {
        id: 'premium-buyer',
        condition: 'average_price_range > 200',
        action: 'promote_premium_items',
        threshold: 200,
        priority: 2,
        category: 'price',
        isActive: true
      },
      {
        id: 'tech-enthusiast',
        condition: 'electronics_engagement > 70',
        action: 'increase_tech_products',
        threshold: 0.7,
        priority: 1,
        category: 'electronics',
        isActive: true
      },
      {
        id: 'frequent-buyer',
        condition: 'purchase_frequency > 3_per_month',
        action: 'show_exclusive_deals',
        threshold: 3,
        priority: 3,
        category: 'loyalty',
        isActive: true
      }
    ];
  }

  setBehaviorData(data: any) {
    this.behaviorData = data;
    this.updateAdaptationMetrics();
  }

  private updateAdaptationMetrics() {
    if (!this.behaviorData) return;

    // Calculate learning progress based on data richness
    const dataPoints = [
      this.behaviorData.product_views?.length || 0,
      this.behaviorData.category_browsing?.length || 0,
      this.behaviorData.purchase_patterns?.length || 0,
      this.behaviorData.price_preferences?.length || 0
    ];
    
    const totalDataPoints = dataPoints.reduce((sum, count) => sum + count, 0);
    this.adaptationMetrics.learningProgress = Math.min(totalDataPoints / 100, 1);

    // Calculate adaptation accuracy based on user interactions
    const conversionRate = this.calculateConversionRate();
    this.adaptationMetrics.adaptationAccuracy = conversionRate;

    // Estimate user satisfaction based on engagement patterns
    this.adaptationMetrics.userSatisfactionScore = this.calculateEngagementScore();
  }

  private calculateConversionRate(): number {
    if (!this.behaviorData?.conversion_metrics) return 0;
    
    const metrics = this.behaviorData.conversion_metrics;
    const views = metrics.total_views || 1;
    const purchases = metrics.total_purchases || 0;
    
    return purchases / views;
  }

  private calculateEngagementScore(): number {
    if (!this.behaviorData) return 0;

    const avgViewTime = this.behaviorData.conversion_metrics?.avg_view_time || 0;
    const returnVisits = this.behaviorData.conversion_metrics?.return_visits || 0;
    const clickThroughRate = this.behaviorData.conversion_metrics?.click_through_rate || 0;

    // Normalize and combine metrics (0-1 scale)
    const timeScore = Math.min(avgViewTime / 120, 1); // 2 minutes = good engagement
    const returnScore = Math.min(returnVisits / 10, 1); // 10+ returns = loyal user
    const ctrScore = Math.min(clickThroughRate / 0.1, 1); // 10% CTR = excellent

    return (timeScore + returnScore + ctrScore) / 3;
  }

  generatePersonalizedRecommendations(products: ShopProduct[]): RecommendationWithConfidence[] {
    if (!this.behaviorData) {
      return products.slice(0, 6).map(product => ({
        ...product,
        confidence: 0.5,
        reason: 'Default recommendation - learning in progress',
        adaptationSource: 'behavior' as const
      }));
    }

    const recommendations: RecommendationWithConfidence[] = [];
    const appliedRules = this.getApplicableRules();

    // Apply personalization rules
    for (const rule of appliedRules) {
      const ruleProducts = this.applyRule(rule, products);
      recommendations.push(...ruleProducts);
    }

    // Add seasonal recommendations
    const seasonalProducts = this.getSeasonalRecommendations(products);
    recommendations.push(...seasonalProducts);

    // Add trending items
    const trendingProducts = this.getTrendingRecommendations(products);
    recommendations.push(...trendingProducts);

    // Remove duplicates and sort by confidence
    const uniqueRecommendations = this.removeDuplicates(recommendations);
    return uniqueRecommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 12);
  }

  private getApplicableRules(): PersonalizationRule[] {
    return this.personalizationRules.filter(rule => {
      if (!rule.isActive) return false;
      return this.evaluateRuleCondition(rule);
    });
  }

  private evaluateRuleCondition(rule: PersonalizationRule): boolean {
    if (!this.behaviorData) return false;

    switch (rule.id) {
      case 'outdoor-gear-preference':
        const outdoorViews = this.behaviorData.category_browsing?.filter(
          (item: any) => item.category === 'outdoor'
        )?.length || 0;
        const totalViews = this.behaviorData.product_views?.length || 1;
        return (outdoorViews / totalViews) > rule.threshold;

      case 'budget-conscious':
        const avgPrice = this.calculateAveragePrice();
        return avgPrice < rule.threshold;

      case 'premium-buyer':
        const premiumPrice = this.calculateAveragePrice();
        return premiumPrice > rule.threshold;

      case 'tech-enthusiast':
        const techEngagement = this.calculateCategoryEngagement('electronics');
        return techEngagement > rule.threshold;

      case 'frequent-buyer':
        const monthlyPurchases = this.calculateMonthlyPurchaseFrequency();
        return monthlyPurchases > rule.threshold;

      default:
        return false;
    }
  }

  private calculateAveragePrice(): number {
    if (!this.behaviorData?.price_preferences?.length) return 0;
    
    const prices = this.behaviorData.price_preferences.map((item: any) => item.price || 0);
    return prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length;
  }

  private calculateCategoryEngagement(category: string): number {
    if (!this.behaviorData?.category_browsing?.length) return 0;
    
    const categoryViews = this.behaviorData.category_browsing.filter(
      (item: any) => item.category === category
    ).length;
    const totalViews = this.behaviorData.category_browsing.length;
    
    return categoryViews / totalViews;
  }

  private calculateMonthlyPurchaseFrequency(): number {
    if (!this.behaviorData?.purchase_patterns?.length) return 0;
    
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return this.behaviorData.purchase_patterns.filter((purchase: any) => {
      const purchaseDate = new Date(purchase.date);
      return purchaseDate >= monthAgo;
    }).length;
  }

  private applyRule(rule: PersonalizationRule, products: ShopProduct[]): RecommendationWithConfidence[] {
    let filteredProducts: ShopProduct[] = [];
    let reason = '';
    
    switch (rule.action) {
      case 'increase_outdoor_products':
        filteredProducts = products.filter(p => 
          p.title.toLowerCase().includes('outdoor') || 
          p.description.toLowerCase().includes('outdoor')
        );
        reason = 'You frequently browse outdoor gear';
        break;
        
      case 'promote_budget_items':
        filteredProducts = products.filter(p => 
          'price' in p && p.price < 100
        );
        reason = 'Based on your budget preferences';
        break;
        
      case 'promote_premium_items':
        filteredProducts = products.filter(p => 
          'price' in p && p.price > 200
        );
        reason = 'Premium quality items for you';
        break;
        
      case 'increase_tech_products':
        filteredProducts = products.filter(p => 
          p.title.toLowerCase().includes('tech') || 
          p.title.toLowerCase().includes('electronic') ||
          p.description.toLowerCase().includes('smart')
        );
        reason = 'You love technology products';
        break;
        
      case 'show_exclusive_deals':
        filteredProducts = products.slice(0, 3); // Show top products as exclusive
        reason = 'Exclusive deals for frequent buyers';
        break;
        
      default:
        filteredProducts = [];
    }

    return filteredProducts.slice(0, 4).map(product => ({
      ...product,
      confidence: 0.8 + (rule.priority * 0.05),
      reason,
      adaptationSource: 'behavior' as const
    }));
  }

  private getSeasonalRecommendations(products: ShopProduct[]): RecommendationWithConfidence[] {
    const currentMonth = new Date().getMonth() + 1;
    let seasonalKeywords: string[] = [];
    let reason = '';

    // Determine seasonal preferences
    if (currentMonth >= 12 || currentMonth <= 2) {
      seasonalKeywords = ['winter', 'warm', 'heater', 'insulation'];
      reason = 'Perfect for winter travel';
    } else if (currentMonth >= 3 && currentMonth <= 5) {
      seasonalKeywords = ['spring', 'mild', 'versatile', 'transition'];
      reason = 'Great for spring adventures';
    } else if (currentMonth >= 6 && currentMonth <= 8) {
      seasonalKeywords = ['summer', 'cool', 'fan', 'air', 'shade'];
      reason = 'Essential for summer comfort';
    } else {
      seasonalKeywords = ['autumn', 'fall', 'weather', 'layers'];
      reason = 'Perfect for autumn travel';
    }

    const seasonalProducts = products.filter(product => 
      seasonalKeywords.some(keyword => 
        product.title.toLowerCase().includes(keyword) ||
        product.description.toLowerCase().includes(keyword)
      )
    );

    return seasonalProducts.slice(0, 2).map(product => ({
      ...product,
      confidence: 0.7,
      reason,
      adaptationSource: 'seasonal' as const
    }));
  }

  private getTrendingRecommendations(products: ShopProduct[]): RecommendationWithConfidence[] {
    // For now, simulate trending by picking newer products or those with certain keywords
    const trendingKeywords = ['new', 'innovative', 'smart', 'portable', 'wireless'];
    
    const trendingProducts = products.filter(product => 
      trendingKeywords.some(keyword => 
        product.title.toLowerCase().includes(keyword) ||
        product.description.toLowerCase().includes(keyword)
      )
    );

    return trendingProducts.slice(0, 2).map(product => ({
      ...product,
      confidence: 0.65,
      reason: 'Trending with RV travelers',
      adaptationSource: 'trending' as const
    }));
  }

  private removeDuplicates(recommendations: RecommendationWithConfidence[]): RecommendationWithConfidence[] {
    const seen = new Set();
    return recommendations.filter(rec => {
      if (seen.has(rec.id)) return false;
      seen.add(rec.id);
      return true;
    });
  }

  generateInventoryRotationSuggestions(products: ShopProduct[]): InventoryRotationSuggestion[] {
    const suggestions: InventoryRotationSuggestion[] = [];
    
    // Analyze product performance
    products.forEach(product => {
      const performance = this.analyzeProductPerformance(product);
      
      if (performance.score < 0.3) {
        suggestions.push({
          productId: product.id,
          action: 'remove',
          reason: `Low engagement (${Math.round(performance.score * 100)}% score)`,
          confidence: 0.8,
          impact: 'medium',
          seasonalFactor: performance.seasonalMismatch
        });
      } else if (performance.score > 0.8) {
        suggestions.push({
          productId: product.id,
          action: 'promote',
          reason: `High performance (${Math.round(performance.score * 100)}% score)`,
          confidence: 0.9,
          impact: 'high',
          seasonalFactor: false
        });
      }
    });

    // Add suggestions for new categories based on user behavior
    if (this.behaviorData) {
      const missingCategories = this.identifyMissingCategories(products);
      missingCategories.forEach(category => {
        suggestions.push({
          productId: `new-${category}`,
          action: 'add',
          reason: `User shows interest in ${category} but limited options available`,
          confidence: 0.7,
          impact: 'medium',
          seasonalFactor: false
        });
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private analyzeProductPerformance(product: ShopProduct): { score: number; seasonalMismatch: boolean } {
    // Simulate performance analysis
    // In a real implementation, this would analyze actual metrics
    
    let score = Math.random(); // Base score
    let seasonalMismatch = false;

    // Adjust score based on seasonal relevance
    const currentMonth = new Date().getMonth() + 1;
    const isWinter = currentMonth >= 12 || currentMonth <= 2;
    const isSummer = currentMonth >= 6 && currentMonth <= 8;

    if (isWinter && product.title.toLowerCase().includes('fan')) {
      score *= 0.3;
      seasonalMismatch = true;
    } else if (isSummer && product.title.toLowerCase().includes('heater')) {
      score *= 0.3;
      seasonalMismatch = true;
    }

    // Boost score for products matching user behavior
    if (this.behaviorData) {
      const categoryInterest = this.calculateCategoryEngagement(this.getProductCategory(product));
      score = (score + categoryInterest) / 2;
    }

    return { score: Math.max(0, Math.min(1, score)), seasonalMismatch };
  }

  private getProductCategory(product: ShopProduct): string {
    const title = product.title.toLowerCase();
    if (title.includes('electronic') || title.includes('tech') || title.includes('smart')) return 'electronics';
    if (title.includes('outdoor') || title.includes('camping')) return 'outdoor';
    if (title.includes('kitchen') || title.includes('cooking')) return 'kitchen';
    if (title.includes('power') || title.includes('solar') || title.includes('battery')) return 'power';
    return 'general';
  }

  private identifyMissingCategories(products: ShopProduct[]): string[] {
    if (!this.behaviorData?.category_browsing) return [];

    const userInterests = this.behaviorData.category_browsing.map((item: any) => item.category);
    const availableCategories = products.map(p => this.getProductCategory(p));
    
    return userInterests.filter((interest: string) => 
      !availableCategories.includes(interest) && 
      this.calculateCategoryEngagement(interest) > 0.4
    );
  }

  getAdaptationMetrics(): AdaptationMetrics {
    return this.adaptationMetrics;
  }

  getConfidenceScore(productId: string): number {
    if (!this.behaviorData) return 0.5;
    
    // Calculate confidence based on how well we know user preferences
    const dataRichness = this.adaptationMetrics.learningProgress;
    const engagementScore = this.adaptationMetrics.userSatisfactionScore;
    
    return (dataRichness + engagementScore) / 2;
  }

  // Real-time adaptation API
  async adaptInventoryInRealTime(userAction: {
    type: 'view' | 'click' | 'purchase' | 'add_to_cart';
    productId: string;
    category: string;
    timestamp: number;
  }): Promise<void> {
    // Update behavior data immediately
    if (this.behaviorData) {
      this.behaviorData.product_views = this.behaviorData.product_views || [];
      this.behaviorData.product_views.push({
        product_id: userAction.productId,
        category: userAction.category,
        timestamp: userAction.timestamp,
        action: userAction.type
      });

      // Recalculate metrics
      this.updateAdaptationMetrics();
    }

    // Trigger real-time recommendations update
    this.triggerRealtimeUpdate();
  }

  private triggerRealtimeUpdate(): void {
    // In a real implementation, this would trigger UI updates
    // For now, we'll emit a custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shopAdaptationUpdate', {
        detail: { metrics: this.adaptationMetrics }
      }));
    }
  }

  // Weekly automated rotation
  async performWeeklyRotation(products: ShopProduct[]): Promise<{
    removed: string[];
    added: string[];
    promoted: string[];
    metrics: AdaptationMetrics;
  }> {
    const suggestions = this.generateInventoryRotationSuggestions(products);
    
    const removed = suggestions
      .filter(s => s.action === 'remove' && s.confidence > 0.7)
      .map(s => s.productId);
    
    const promoted = suggestions
      .filter(s => s.action === 'promote' && s.confidence > 0.8)
      .map(s => s.productId);
    
    const toAdd = suggestions
      .filter(s => s.action === 'add' && s.confidence > 0.6)
      .map(s => s.productId);

    return {
      removed,
      added: toAdd,
      promoted,
      metrics: this.adaptationMetrics
    };
  }
}

// Hook to use the adaptive shop engine
export function useAdaptiveShopEngine() {
  const { user } = useAuth();
  const { behaviorData, trackInteraction } = useShoppingBehavior();
  const [engine] = useState(() => new AdaptiveShopEngine());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (behaviorData) {
      engine.setBehaviorData(behaviorData);
      setIsInitialized(true);
    }
  }, [behaviorData, engine]);

  const adaptInventory = useCallback(async (userAction: {
    type: 'view' | 'click' | 'purchase' | 'add_to_cart';
    productId: string;
    category: string;
  }) => {
    await engine.adaptInventoryInRealTime({
      ...userAction,
      timestamp: Date.now()
    });

    // Also track with the behavior hook
    await trackInteraction({
      productId: userAction.productId,
      interactionType: userAction.type as any,
      contextData: { category: userAction.category }
    });
  }, [engine, trackInteraction]);

  const getPersonalizedRecommendations = useCallback((products: ShopProduct[]) => {
    return engine.generatePersonalizedRecommendations(products);
  }, [engine]);

  const getInventoryRotationSuggestions = useCallback((products: ShopProduct[]) => {
    return engine.generateInventoryRotationSuggestions(products);
  }, [engine]);

  const getAdaptationMetrics = useCallback(() => {
    return engine.getAdaptationMetrics();
  }, [engine]);

  const performWeeklyRotation = useCallback(async (products: ShopProduct[]) => {
    return await engine.performWeeklyRotation(products);
  }, [engine]);

  return {
    isInitialized,
    adaptInventory,
    getPersonalizedRecommendations,
    getInventoryRotationSuggestions,
    getAdaptationMetrics,
    performWeeklyRotation,
    engine
  };
}

export default AdaptiveShopEngine;
