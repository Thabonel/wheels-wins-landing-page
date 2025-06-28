
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Interfaces for shopping behavior tracking
export interface ProductView {
  productId: string;
  viewStartTime: Date;
  viewEndTime?: Date;
  viewDuration?: number; // in seconds
  productType: 'digital' | 'affiliate';
  price?: number;
  category: string;
}

export interface CategoryBrowsing {
  category: string;
  timeSpent: number; // in seconds
  productsViewedCount: number;
  timestamp: Date;
}

export interface PricePreference {
  minPrice: number;
  maxPrice: number;
  averageViewedPrice: number;
  priceRangeFrequency: Record<string, number>; // e.g., "0-25": 5, "25-50": 3
  timestamp: Date;
}

export interface PurchasePattern {
  productId: string;
  purchaseAmount: number;
  category: string;
  timeOfPurchase: Date;
  dayOfWeek: number;
  seasonalCategory: 'spring' | 'summer' | 'autumn' | 'winter';
}

export interface ClickThroughData {
  productType: 'digital' | 'affiliate';
  clicks: number;
  impressions: number;
  rate: number;
  category: string;
  timestamp: Date;
}

export interface SeasonalPreference {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  preferredCategories: string[];
  averageSpending: number;
  productInteractions: number;
  timestamp: Date;
}

export interface ConversionMetrics {
  totalViews: number;
  totalPurchases: number;
  conversionRate: number;
  averageViewsBeforePurchase: number;
  lastUpdated: Date;
}

export interface ShoppingBehaviorData {
  id: string;
  userId: string;
  productViews: ProductView[];
  categoryBrowsing: CategoryBrowsing[];
  pricePreferences: PricePreference[];
  purchasePatterns: PurchasePattern[];
  clickThroughRates: ClickThroughData[];
  seasonalPreferences: SeasonalPreference[];
  conversionMetrics: ConversionMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export function useShoppingBehavior() {
  const { user } = useAuth();
  const [behaviorData, setBehaviorData] = useState<ShoppingBehaviorData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentProductView, setCurrentProductView] = useState<ProductView | null>(null);

  // Load existing behavior data
  const loadBehaviorData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_shopping_behavior')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading behavior data:', error);
        return;
      }

      if (data) {
        const behaviorData: ShoppingBehaviorData = {
          id: data.id,
          userId: data.user_id,
          productViews: (data.product_views as unknown as ProductView[]) || [],
          categoryBrowsing: (data.category_browsing as unknown as CategoryBrowsing[]) || [],
          pricePreferences: (data.price_preferences as unknown as PricePreference[]) || [],
          purchasePatterns: (data.purchase_patterns as unknown as PurchasePattern[]) || [],
          clickThroughRates: (data.click_through_rates as unknown as ClickThroughData[]) || [],
          seasonalPreferences: (data.seasonal_preferences as unknown as SeasonalPreference[]) || [],
          conversionMetrics: (data.conversion_metrics as unknown as ConversionMetrics) || {
            totalViews: 0,
            totalPurchases: 0,
            conversionRate: 0,
            averageViewsBeforePurchase: 0,
            lastUpdated: new Date()
          },
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        };
        setBehaviorData(behaviorData);
      }
    } catch (error) {
      console.error('Error loading behavior data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Save behavior data to database
  const saveBehaviorData = useCallback(async (data: Partial<ShoppingBehaviorData>) => {
    if (!user || !data) return;

    try {
      const updateData = {
        user_id: user.id,
        product_views: data.productViews || [],
        category_browsing: data.categoryBrowsing || [],
        price_preferences: data.pricePreferences || [],
        purchase_patterns: data.purchasePatterns || [],
        click_through_rates: data.clickThroughRates || [],
        seasonal_preferences: data.seasonalPreferences || [],
        conversion_metrics: data.conversionMetrics || {},
        updated_at: new Date().toISOString()
      };

      // Table doesn't exist yet, mock the save
      console.log('Shopping behavior saved:', updateData);
    } catch (error) {
      console.error('Error saving behavior data:', error);
    }
  }, [user]);

  // Track product view start
  const trackProductView = useCallback((productId: string, productType: 'digital' | 'affiliate', price?: number, category?: string) => {
    if (!user) return;

    const newView: ProductView = {
      productId,
      viewStartTime: new Date(),
      productType,
      price,
      category: category || 'unknown'
    };

    setCurrentProductView(newView);
  }, [user]);

  // Track product view end
  const trackProductViewEnd = useCallback(() => {
    if (!currentProductView || !behaviorData) return;

    const viewEndTime = new Date();
    const viewDuration = Math.round((viewEndTime.getTime() - currentProductView.viewStartTime.getTime()) / 1000);

    const completedView: ProductView = {
      ...currentProductView,
      viewEndTime,
      viewDuration
    };

    const updatedData = {
      ...behaviorData,
      productViews: [...behaviorData.productViews, completedView]
    };

    setBehaviorData(updatedData);
    saveBehaviorData(updatedData);
    setCurrentProductView(null);
  }, [currentProductView, behaviorData, saveBehaviorData]);

  // Track category browsing
  const trackCategoryBrowsing = useCallback((category: string, timeSpent: number, productsViewedCount: number) => {
    if (!behaviorData) return;

    const newBrowsing: CategoryBrowsing = {
      category,
      timeSpent,
      productsViewedCount,
      timestamp: new Date()
    };

    const updatedData = {
      ...behaviorData,
      categoryBrowsing: [...behaviorData.categoryBrowsing, newBrowsing]
    };

    setBehaviorData(updatedData);
    saveBehaviorData(updatedData);
  }, [behaviorData, saveBehaviorData]);

  // Track purchase
  const trackPurchase = useCallback((productId: string, amount: number, category: string) => {
    if (!behaviorData) return;

    const currentDate = new Date();
    const season = getSeason(currentDate);

    const newPurchase: PurchasePattern = {
      productId,
      purchaseAmount: amount,
      category,
      timeOfPurchase: currentDate,
      dayOfWeek: currentDate.getDay(),
      seasonalCategory: season
    };

    const updatedData = {
      ...behaviorData,
      purchasePatterns: [...behaviorData.purchasePatterns, newPurchase]
    };

    setBehaviorData(updatedData);
    saveBehaviorData(updatedData);
  }, [behaviorData, saveBehaviorData]);

  // Track click-through
  const trackClickThrough = useCallback((productType: 'digital' | 'affiliate', category: string) => {
    if (!behaviorData) return;

    const existingCTR = behaviorData.clickThroughRates.find(
      ctr => ctr.productType === productType && ctr.category === category
    );

    let updatedCTRs: ClickThroughData[];

    if (existingCTR) {
      updatedCTRs = behaviorData.clickThroughRates.map(ctr => {
        if (ctr.productType === productType && ctr.category === category) {
          const newClicks = ctr.clicks + 1;
          return {
            ...ctr,
            clicks: newClicks,
            rate: newClicks / ctr.impressions,
            timestamp: new Date()
          };
        }
        return ctr;
      });
    } else {
      const newCTR: ClickThroughData = {
        productType,
        clicks: 1,
        impressions: 1,
        rate: 1,
        category,
        timestamp: new Date()
      };
      updatedCTRs = [...behaviorData.clickThroughRates, newCTR];
    }

    const updatedData = {
      ...behaviorData,
      clickThroughRates: updatedCTRs
    };

    setBehaviorData(updatedData);
    saveBehaviorData(updatedData);
  }, [behaviorData, saveBehaviorData]);

  // Calculate analytics
  const getAnalytics = useCallback(() => {
    if (!behaviorData) return null;

    const totalViews = behaviorData.productViews.length;
    const totalPurchases = behaviorData.purchasePatterns.length;
    const conversionRate = totalViews > 0 ? (totalPurchases / totalViews) * 100 : 0;

    // Price preferences analysis
    const viewedPrices = behaviorData.productViews
      .filter(view => view.price !== undefined)
      .map(view => view.price!);
    
    const averageViewedPrice = viewedPrices.length > 0 
      ? viewedPrices.reduce((sum, price) => sum + price, 0) / viewedPrices.length 
      : 0;

    // Category preferences
    const categoryFrequency: Record<string, number> = {};
    behaviorData.productViews.forEach(view => {
      categoryFrequency[view.category] = (categoryFrequency[view.category] || 0) + 1;
    });

    const topCategories = Object.entries(categoryFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    // Time-based patterns
    const hourlyActivity: Record<number, number> = {};
    behaviorData.productViews.forEach(view => {
      const hour = view.viewStartTime.getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourlyActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, activity]) => ({ hour: parseInt(hour), activity }));

    return {
      totalViews,
      totalPurchases,
      conversionRate,
      averageViewedPrice,
      topCategories,
      peakHours,
      averageViewDuration: behaviorData.productViews
        .filter(view => view.viewDuration)
        .reduce((sum, view) => sum + (view.viewDuration || 0), 0) / 
        (behaviorData.productViews.filter(view => view.viewDuration).length || 1)
    };
  }, [behaviorData]);

  // Helper function to determine season
  const getSeason = (date: Date): 'spring' | 'summer' | 'autumn' | 'winter' => {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  };

  // Load behavior data on mount
  useEffect(() => {
    loadBehaviorData();
  }, [loadBehaviorData]);

  // Clean up current view on unmount
  useEffect(() => {
    return () => {
      if (currentProductView) {
        trackProductViewEnd();
      }
    };
  }, [currentProductView, trackProductViewEnd]);

  return {
    behaviorData,
    isLoading,
    trackProductView,
    trackProductViewEnd,
    trackCategoryBrowsing,
    trackPurchase,
    trackClickThrough,
    getAnalytics,
    loadBehaviorData
  };
}
