
import { ShopProduct } from '@/components/shop/types';
import { getDigitalProducts, getAffiliateProducts } from '@/components/shop/ProductsData';
import { Region } from '@/context/RegionContext';

interface ShopBehavior {
  categoryPreferences: { [category: string]: number };
  priceSensitivity: number;
  brandLoyalty: number;
  featureImportance: { [feature: string]: number };
}

class PersonalizationEngine {
  personalizeProducts(products: ShopProduct[], behavior: ShopBehavior): ShopProduct[] {
    // Apply category preferences
    const categoryBoost = (product: ShopProduct) => {
      let boost = 1;
      if (product.categories) {
        for (const category in behavior.categoryPreferences) {
          if (product.categories.includes(category)) {
            boost += behavior.categoryPreferences[category];
          }
        }
      }
      return boost;
    };

    // Apply price sensitivity
    const priceScore = (product: ShopProduct) => {
      const price = 'price' in product ? product.price : 50;
      return behavior.priceSensitivity > 0 ? (1 - behavior.priceSensitivity) + (price / 100) * behavior.priceSensitivity : 1;
    };

    // Apply brand loyalty
    const brandBoost = (product: ShopProduct) => {
      return product.brand === 'PreferredBrand' ? 1 + behavior.brandLoyalty : 1;
    };

    // Apply feature importance
    const featureScore = (product: ShopProduct) => {
      let score = 1;
      if (product.features) {
        for (const feature in behavior.featureImportance) {
          if (product.features.includes(feature)) {
            score += behavior.featureImportance[feature];
          }
        }
      }
      return score;
    };

    // Combine all factors
    const scoredProducts = products.map(product => ({
      ...product,
      personalizationScore: categoryBoost(product) * priceScore(product) * brandBoost(product) * featureScore(product)
    }));

    // Sort by personalization score
    scoredProducts.sort((a, b) => (b.personalizationScore || 0) - (a.personalizationScore || 0));

    return scoredProducts;
  }
}

export class AdaptiveShopEngine {
  private personalizationEngine: PersonalizationEngine;
  private travelIntegrationEnabled: boolean = false;
  private travelData: any = null;

  constructor() {
    this.personalizationEngine = new PersonalizationEngine();
  }

  enableTravelIntegration(travelData: any) {
    this.travelIntegrationEnabled = true;
    this.travelData = travelData;
  }

  disableTravelIntegration() {
    this.travelIntegrationEnabled = false;
    this.travelData = null;
  }

  async getPersonalizedProducts(
    behavior: ShopBehavior,
    region: Region = 'US' as Region,
    limit: number = 12
  ): Promise<ShopProduct[]> {
    // Get base products
    const [digitalProducts, affiliateProducts] = await Promise.all([
      getDigitalProducts(region),
      getAffiliateProducts()
    ]);

    let allProducts = [...digitalProducts, ...affiliateProducts];

    // Apply personalization
    let personalizedProducts = this.personalizationEngine.personalizeProducts(
      allProducts,
      behavior
    );

    // Apply travel-based personalization if enabled
    if (this.travelIntegrationEnabled && this.travelData) {
      personalizedProducts = this.applyTravelBasedPersonalization(
        personalizedProducts,
        this.travelData
      );
    }

    return personalizedProducts.slice(0, limit);
  }

  private applyTravelBasedPersonalization(
    products: ShopProduct[],
    travelData: any
  ): ShopProduct[] {
    if (!travelData) return products;

    // Create travel-enhanced products with boosted relevance scores
    const enhancedProducts = products.map(product => {
      let relevanceBoost = 0;
      const title = product.title.toLowerCase();
      const description = product.description.toLowerCase();

      // Destination-based recommendations
      if (travelData.currentTrip?.destination) {
        const destination = travelData.currentTrip.destination.toLowerCase();
        
        if (destination.includes('beach') && (title.includes('sun') || title.includes('water') || title.includes('beach'))) {
          relevanceBoost += 0.3;
        }
        
        if (destination.includes('mountain') && (title.includes('hiking') || title.includes('mountain') || title.includes('outdoor'))) {
          relevanceBoost += 0.3;
        }
      }

      // Seasonal recommendations
      const currentSeason = this.getCurrentSeason();
      if (title.includes(currentSeason) || description.includes(currentSeason)) {
        relevanceBoost += 0.2;
      }

      // Maintenance-based recommendations
      if (travelData.maintenanceAlerts?.length > 0) {
        const hasMaintenanceNeeds = travelData.maintenanceAlerts.some((alert: any) => 
          title.includes(alert.task.toLowerCase()) || description.includes(alert.task.toLowerCase())
        );
        if (hasMaintenanceNeeds) {
          relevanceBoost += 0.4;
        }
      }

      // Safety-based recommendations
      if (travelData.safetyRequirements?.length > 0) {
        const hasSafetyNeeds = travelData.safetyRequirements.some((req: any) => 
          !req.inStorage && (title.includes(req.item.toLowerCase()) || description.includes(req.item.toLowerCase()))
        );
        if (hasSafetyNeeds) {
          relevanceBoost += 0.5;
        }
      }

      return {
        ...product,
        travelRelevanceScore: relevanceBoost
      };
    });

    // Sort by travel relevance first, then by original order
    return enhancedProducts.sort((a, b) => {
      const aScore = (a as any).travelRelevanceScore || 0;
      const bScore = (b as any).travelRelevanceScore || 0;
      return bScore - aScore;
    });
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  updateBehavior(userId: string, behaviorUpdate: Partial<ShopBehavior>): void {
    // In a real application, this would update the user's behavior profile in a database.
    console.log(`Updating behavior for user ${userId} with:`, behaviorUpdate);
  }

  generateInsights(productsViewed: ShopProduct[], cartSize: number, purchaseHistory: ShopProduct[]): string[] {
    const insights: string[] = [];

    if (productsViewed.length > 5) {
      const categories = new Set(productsViewed.flatMap(p => p.categories || []));
      insights.push(`User is exploring multiple categories: ${Array.from(categories).join(', ')}`);
    }

    if (cartSize > 3) {
      insights.push("User is adding multiple items to the cart, indicating high purchase intent.");
    }

    if (purchaseHistory.length > 0) {
      const totalSpent = purchaseHistory.reduce((sum, product) => {
        return sum + ('price' in product ? product.price : 0);
      }, 0);
      insights.push(`Loyal customer with a total spending of $${totalSpent.toFixed(2)}.`);
    }

    return insights;
  }
}
