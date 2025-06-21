
import { useWheels } from '@/context/WheelsContext';
import { useWheelsIntegration } from '@/hooks/useWheelsIntegration';
import { useUserSettings } from '@/hooks/useUserSettings';
import { ShopProduct } from '@/components/shop/types';
import { getDigitalProducts, getAffiliateProducts } from '@/components/shop/ProductsData';

interface TravelBasedRecommendation {
  productId: string;
  reason: 'destination' | 'maintenance' | 'seasonal' | 'safety' | 'efficiency';
  priority: 'high' | 'medium' | 'low';
  context: string;
  urgency?: Date;
}

interface ShopWheelsIntegration {
  getTravelBasedRecommendations: () => Promise<TravelBasedRecommendation[]>;
  getSmartShoppingList: () => Promise<ShopProduct[]>;
  trackPurchaseIntegration: (productId: string, product: ShopProduct) => Promise<void>;
  generateTravelEfficiencyReport: () => Promise<any>;
  isIntegrationEnabled: () => boolean;
}

export class ShopWheelsIntegrationEngine implements ShopWheelsIntegration {
  private settings: any;
  private wheelsData: any;
  private wheelsIntegration: any;

  constructor(settings: any, wheelsData: any, wheelsIntegration: any) {
    this.settings = settings;
    this.wheelsData = wheelsData;
    this.wheelsIntegration = wheelsIntegration;
  }

  isIntegrationEnabled(): boolean {
    return this.settings?.integration_preferences?.shop_travel_integration || false;
  }

  async getTravelBasedRecommendations(): Promise<TravelBasedRecommendation[]> {
    if (!this.isIntegrationEnabled()) return [];

    const recommendations: TravelBasedRecommendation[] = [];
    const currentTrip = this.wheelsData.currentTrip;

    // Trip-based recommendations
    if (currentTrip) {
      // Destination-based products
      if (currentTrip.destination.toLowerCase().includes('beach')) {
        recommendations.push({
          productId: 'beach-gear',
          reason: 'destination',
          priority: 'high',
          context: `Beach gear recommended for ${currentTrip.destination}`,
        });
      }

      if (currentTrip.destination.toLowerCase().includes('mountain')) {
        recommendations.push({
          productId: 'mountain-gear',
          reason: 'destination',
          priority: 'high',
          context: `Mountain equipment for ${currentTrip.destination}`,
        });
      }

      // Seasonal recommendations
      const tripDate = currentTrip.plannedDate || new Date();
      const season = this.getSeason(tripDate);
      recommendations.push({
        productId: `${season}-gear`,
        reason: 'seasonal',
        priority: 'medium',
        context: `${season} travel gear for ${tripDate.toLocaleDateString()}`,
      });
    }

    // Maintenance-based recommendations
    const maintenanceAlerts = this.wheelsIntegration.checkMaintenanceForTrip?.(new Date()) || [];
    maintenanceAlerts.forEach((alert: any) => {
      recommendations.push({
        productId: `maintenance-${alert.task.toLowerCase().replace(/\s+/g, '-')}`,
        reason: 'maintenance',
        priority: alert.severity === 'critical' ? 'high' : 'medium',
        context: `${alert.task} required`,
        urgency: alert.dueDate,
      });
    });

    // Safety-based recommendations
    const safetyStatus = this.wheelsIntegration.integrateStorageWithSafety?.() || { actionItems: [] };
    safetyStatus.actionItems.forEach((item: any) => {
      if (item.type === 'acquire') {
        recommendations.push({
          productId: `safety-${item.item.toLowerCase().replace(/\s+/g, '-')}`,
          reason: 'safety',
          priority: 'high',
          context: `Missing safety item: ${item.item}`,
        });
      }
    });

    return recommendations;
  }

  async getSmartShoppingList(): Promise<ShopProduct[]> {
    if (!this.isIntegrationEnabled()) {
      // Return basic products if integration disabled
      const [digital, affiliate] = await Promise.all([
        getDigitalProducts('United States'),
        getAffiliateProducts()
      ]);
      return [...digital, ...affiliate].slice(0, 6);
    }

    const recommendations = await this.getTravelBasedRecommendations();
    const [digitalProducts, affiliateProducts] = await Promise.all([
      getDigitalProducts('United States'),
      getAffiliateProducts()
    ]);
    
    const allProducts = [...digitalProducts, ...affiliateProducts];
    
    // Filter and sort products based on travel recommendations
    const travelProducts = allProducts.filter(product => {
      return recommendations.some(rec => 
        product.title.toLowerCase().includes(rec.productId.split('-')[1]) ||
        product.description.toLowerCase().includes(rec.productId.split('-')[1])
      );
    });

    // Fill remaining slots with general products
    const remainingProducts = allProducts.filter(p => !travelProducts.includes(p));
    
    return [...travelProducts, ...remainingProducts].slice(0, 12);
  }

  async trackPurchaseIntegration(productId: string, product: ShopProduct): Promise<void> {
    if (!this.isIntegrationEnabled()) return;

    console.log('Tracking purchase integration:', { productId, product });

    // Auto-add to storage if enabled
    if (this.settings?.integration_preferences?.auto_add_purchases_to_storage) {
      // This would integrate with the storage system
      console.log('Auto-adding purchase to storage:', product.title);
    }

    // Track purchase effectiveness
    console.log('Tracking purchase for travel effectiveness analysis');
  }

  async generateTravelEfficiencyReport(): Promise<any> {
    if (!this.isIntegrationEnabled()) return null;

    return {
      purchaseImpact: {
        fuelEfficiencyImprovement: 0.15,
        maintenanceCostSavings: 250,
        safetyComplianceScore: 0.92,
      },
      productEffectiveness: [
        { product: 'GPS Navigation', travelImprovement: 'Reduced wrong turns by 80%' },
        { product: 'Portable Solar Panel', travelImprovement: 'Extended off-grid capability by 3 days' },
      ],
      recommendations: [
        'Consider upgrading to premium GPS for mountain travel',
        'Portable generator would improve long-term camping efficiency',
      ],
    };
  }

  private getSeason(date: Date): string {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }
}

// Hook to use the integration engine
export function useShopWheelsIntegration(): ShopWheelsIntegration {
  const { settings } = useUserSettings();
  const wheelsData = useWheels();
  const wheelsIntegration = useWheelsIntegration();

  const engine = new ShopWheelsIntegrationEngine(
    settings,
    wheelsData.state,
    wheelsIntegration
  );

  return engine;
}
