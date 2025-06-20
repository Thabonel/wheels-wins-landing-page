import { useShoppingAnalytics } from "@/hooks/use-shopping-analytics";
import { useShoppingBehavior } from "@/hooks/use-shopping-behavior";
import { useShopWheelsIntegration } from "@/lib/shopWheelsIntegration";
import { ShopProduct } from "@/components/shop/types";

// Define types for learning metrics
export interface AdaptiveLearningMetrics {
  totalInteractions: number;
  learningAccuracy: number;
  adaptationRate: number;
  userSatisfactionScore: number;
  conversionImprovement: number;
}

// Define types for shopping behavior data
interface ShoppingBehaviorData {
  productViews: { productId: string; viewCount: number; lastViewed: Date; category: string; price?: number; }[];
  categoryBrowsing: { [category: string]: number };
  searchQueries: string[];
  timeSpentPerCategory: { [category: string]: number };
}

// Define types for personalization rules
interface PersonalizationRule {
  trigger: (behaviorData: ShoppingBehaviorData) => boolean;
  action: (products: ShopProduct[]) => ShopProduct[];
}

// Helper function to get product category
function getProductCategory(product: ShopProduct): string {
  if ('type' in product) {
    return product.type;
  }
  return 'general';
}

// Helper function to get product tags (placeholder)
function getProductTags(product: ShopProduct): string[] {
  // Since tags aren't in the current product types, return empty array
  return [];
}

export class AdaptiveShopEngine {
  private behaviorData: ShoppingBehaviorData | null = null;
  private personalizationRules: PersonalizationRule[] = [];
  private analytics: ReturnType<typeof useShoppingAnalytics> | null = null;
  private learningEnabled: boolean = true;
  private travelIntegration: any = null;

  constructor() {
    this.initializePersonalizationRules();
  }

  public setAnalytics(analytics: ReturnType<typeof useShoppingAnalytics>) {
    this.analytics = analytics;
  }

  public setTravelIntegration(integration: any) {
    this.travelIntegration = integration;
  }

  public disableLearning() {
    this.learningEnabled = false;
  }

  public enableLearning() {
    this.learningEnabled = true;
  }

  private initializePersonalizationRules() {
    // Example rule: Promote products frequently viewed
    this.personalizationRules.push({
      trigger: (behaviorData) => {
        if (!behaviorData?.productViews) return false;
        return behaviorData.productViews.length > 3;
      },
      action: (products) => {
        // Sort products by view count (most viewed first)
        return [...products].sort((a, b) => {
          const viewCountA = this.behaviorData?.productViews.find(v => v.productId === a.id)?.viewCount || 0;
          const viewCountB = this.behaviorData?.productViews.find(v => v.productId === b.id)?.viewCount || 0;
          return viewCountB - viewCountA;
        });
      },
    });

    // Add travel-based personalization rule
    this.personalizationRules.push({
      trigger: () => this.travelIntegration?.isIntegrationEnabled() || false,
      action: async (products) => {
        if (!this.travelIntegration) return products;
        
        try {
          const travelProducts = await this.travelIntegration.getSmartShoppingList();
          const travelProductIds = travelProducts.map((p: ShopProduct) => p.id);
          
          // Prioritize travel-recommended products
          const prioritized = products.sort((a, b) => {
            const aIsTravelRec = travelProductIds.includes(a.id);
            const bIsTravelRec = travelProductIds.includes(b.id);
            
            if (aIsTravelRec && !bIsTravelRec) return -1;
            if (!aIsTravelRec && bIsTravelRec) return 1;
            return 0;
          });
          
          return prioritized;
        } catch (error) {
          console.error('Error applying travel-based personalization:', error);
          return products;
        }
      },
    });
  }

  public async adaptProducts(products: ShopProduct[]): Promise<ShopProduct[]> {
    if (!this.behaviorData || !this.learningEnabled) {
      return products;
    }

    let adaptedProducts = [...products];
    for (const rule of this.personalizationRules) {
      if (rule.trigger(this.behaviorData)) {
        const result = rule.action(adaptedProducts);
        // Handle both sync and async rule actions
        adaptedProducts = result instanceof Promise ? await result : result;
      }
    }
    return adaptedProducts;
  }

  public async initializeBehaviorTracking(userId: string, behaviorHook: ReturnType<typeof useShoppingBehavior>) {
    if (!this.learningEnabled) return;

    try {
      const data = await behaviorHook.fetchUserShoppingBehavior(userId);
      if (data) {
        this.behaviorData = {
          productViews: data.productViews.map(pv => ({
            productId: pv.product_id,
            viewCount: pv.view_count,
            lastViewed: new Date(pv.last_viewed),
            category: pv.category,
            price: pv.price
          })),
          categoryBrowsing: data.categoryBrowsing,
          searchQueries: data.searchQueries,
          timeSpentPerCategory: data.timeSpentPerCategory
        };
      }
    } catch (error) {
      console.error('Error initializing behavior tracking:', error);
    }
  }

  public async adaptInventory(products: ShopProduct[], userPreferences: any): Promise<ShopProduct[]> {
    if (!this.learningEnabled) return products;

    // Simple adaptation logic based on user preferences
    return products.sort((a, b) => {
      const categoryA = getProductCategory(a);
      const categoryB = getProductCategory(b);
      
      // Prioritize categories user has shown interest in
      const preferenceA = userPreferences?.categories?.[categoryA] || 0;
      const preferenceB = userPreferences?.categories?.[categoryB] || 0;
      
      return preferenceB - preferenceA;
    });
  }

  public async rotateInventory(products: ShopProduct[]): Promise<ShopProduct[]> {
    if (!this.learningEnabled) return products;

    // Simple rotation: shuffle products to provide variety
    const shuffled = [...products];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  public getLearningMetrics(): AdaptiveLearningMetrics {
    // Return mock metrics for now
    return {
      totalInteractions: this.behaviorData?.productViews.length || 0,
      learningAccuracy: 0.85,
      adaptationRate: 0.72,
      userSatisfactionScore: 0.91,
      conversionImprovement: 0.15
    };
  }

  public async trackProductView(productId: string, behaviorHook: ReturnType<typeof useShoppingBehavior>) {
    if (this.analytics && behaviorHook) {
      await behaviorHook.trackProductView(productId, 'general', undefined, 'general');
    }
  }

  public async trackCategoryView(category: string, behaviorHook: ReturnType<typeof useShoppingBehavior>) {
     if (this.analytics && behaviorHook) {
      await behaviorHook.trackCategoryView(category, 'digital', undefined, 'general');
    }
  }

  public async trackAddToCart(productId: string, behaviorHook: ReturnType<typeof useShoppingBehavior>) {
    if (this.analytics && behaviorHook) {
      await behaviorHook.trackAddToCart(productId, 'general', undefined, 'general');
      
      // Track travel integration if enabled
      if (this.travelIntegration?.isIntegrationEnabled()) {
        console.log('Tracking cart addition for travel integration:', productId);
      }
    }
  }

  public async trackPurchase(productId: string, behaviorHook: ReturnType<typeof useShoppingBehavior>) {
    if (this.analytics && behaviorHook) {
      await behaviorHook.trackPurchase(productId, 'general', undefined, 'general');
      
      // Track travel integration if enabled
      if (this.travelIntegration?.isIntegrationEnabled()) {
        const products = await this.travelIntegration.getSmartShoppingList();
        const product = products.find((p: ShopProduct) => p.id === productId);
        if (product) {
          await this.travelIntegration.trackPurchaseIntegration(productId, product);
        }
      }
    }
  }

  public async updateBehaviorData(userId: string, behaviorHook: ReturnType<typeof useShoppingBehavior>) {
    if (!this.learningEnabled) return;

    const data = await behaviorHook.fetchUserShoppingBehavior(userId);
    if (data) {
      this.behaviorData = {
        productViews: data.productViews.map(pv => ({
          productId: pv.product_id,
          viewCount: pv.view_count,
          lastViewed: new Date(pv.last_viewed),
          category: pv.category,
          price: pv.price
        })),
        categoryBrowsing: data.categoryBrowsing,
        searchQueries: data.searchQueries,
        timeSpentPerCategory: data.timeSpentPerCategory
      };
    }
  }
}

// Export singleton instance
export const adaptiveShopEngine = new AdaptiveShopEngine();
