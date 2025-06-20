import { useShoppingAnalytics } from "@/hooks/use-shopping-analytics";
import { useShoppingBehavior } from "@/hooks/use-shopping-behavior";
import { ShopProduct } from "@/components/shop/types";

// Define types for shopping behavior data
interface ShoppingBehaviorData {
  productViews: { [productId: string]: number };
  categoryBrowsing: { [category: string]: number };
  // Add more behavior data as needed
}

// Define types for personalization rules
interface PersonalizationRule {
  trigger: (behaviorData: ShoppingBehaviorData) => boolean;
  action: (products: ShopProduct[]) => ShopProduct[];
}

export class AdaptiveShopEngine {
  private behaviorData: ShoppingBehaviorData | null = null;
  private personalizationRules: PersonalizationRule[] = [];
  private analytics: ReturnType<typeof useShoppingAnalytics> | null = null;
  private learningEnabled: boolean = true;

  constructor() {
    this.initializePersonalizationRules();
  }

  public setAnalytics(analytics: ReturnType<typeof useShoppingAnalytics>) {
    this.analytics = analytics;
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
        return Object.keys(behaviorData.productViews).length > 3;
      },
      action: (products) => {
        // Sort products by view count (most viewed first)
        return [...products].sort((a, b) => {
          const viewCountA = this.behaviorData?.productViews[a.id] || 0;
          const viewCountB = this.behaviorData?.productViews[b.id] || 0;
          return viewCountB - viewCountA;
        });
      },
    });

    // Add more rules as needed based on different behaviors
  }

  public adaptProducts(products: ShopProduct[]): ShopProduct[] {
    if (!this.behaviorData) {
      return products;
    }

    let adaptedProducts = [...products];
    for (const rule of this.personalizationRules) {
      if (rule.trigger(this.behaviorData)) {
        adaptedProducts = rule.action(adaptedProducts);
      }
    }
    return adaptedProducts;
  }

  public async trackProductView(productId: string, behaviorHook: ReturnType<typeof useShoppingBehavior>) {
    if (this.analytics && behaviorHook) {
      behaviorHook.trackProductView(productId, 'digital', undefined, 'general'); // Fixed: added all required parameters
    }
  }

  public async trackCategoryView(category: string, behaviorHook: ReturnType<typeof useShoppingBehavior>) {
     if (this.analytics && behaviorHook) {
      behaviorHook.trackCategoryView(category, 'digital', undefined, 'general');
    }
  }

  public async trackAddToCart(productId: string, behaviorHook: ReturnType<typeof useShoppingBehavior>) {
    if (this.analytics && behaviorHook) {
      behaviorHook.trackAddToCart(productId, 'digital', undefined, 'general');
    }
  }

  public async trackPurchase(productId: string, behaviorHook: ReturnType<typeof useShoppingBehavior>) {
    if (this.analytics && behaviorHook) {
      behaviorHook.trackPurchase(productId, 'digital', undefined, 'general');
    }
  }

  public async updateBehaviorData(userId: string) {
    if (!this.learningEnabled) return;

    const behaviorHook = useShoppingBehavior();
    const data = await behaviorHook.fetchUserShoppingBehavior(userId);
    if (data) {
      this.behaviorData = {
        productViews: data.product_views || {},
        categoryBrowsing: data.category_browsing || {},
        // Map other relevant fields from the database
      };
    }
  }
}

// Export singleton instance
export const adaptiveShopEngine = new AdaptiveShopEngine();
